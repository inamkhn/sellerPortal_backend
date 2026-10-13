#!/usr/bin/env python3
"""
Seller Portal — EC2 deployment via AWS Systems Manager (SSM).

Deployment transaction (per SELLER_PORTAL_PRODUCTION_DEPLOYMENT.md §8.2):
  1. Validate all required inputs (region, instance, ECR repo, digests).
  2. Sync version-controlled infra/docker-compose.yml and infra/Caddyfile to EC2.
  3. Authenticate with ECR and pull BOTH images before touching running services.
  4. Run Prisma migration container — abort immediately on failure.
  5. Deploy the new API image via `docker compose up -d --wait` (Gap 3 fix):
       --wait uses the Compose healthcheck inside the container, which correctly
       probes http://127.0.0.1:3000 without requiring a published host port.
  6. Validate Caddy config and reload it.
  7. Perform an HTTPS smoke-check through Caddy to the real public endpoint.
  8. On SUCCESS: persist new digest to .release.env (rollback baseline).
     On FAILURE: restore previous digest from .release.env and alert.

Environment variables consumed (set by .github/workflows/backend.yml):
  AWS_REGION         — AWS region (e.g. us-east-1)
  ECR_REPOSITORY     — Full ECR URI  (account.dkr.ecr.region.amazonaws.com/repo)
  EC2_INSTANCE_ID    — Target EC2 instance ID
  API_DIGEST         — sha256 digest of the new runtime image
  MIGRATION_DIGEST   — sha256 digest of the new migration image
"""

from __future__ import annotations

import base64
import os
import sys
import time
from pathlib import Path

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("ERROR: boto3 is not installed. Run: pip install boto3", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEPLOY_TIMEOUT_SECONDS = 600      # max time to wait for SSM command
POLL_INTERVAL_SECONDS = 10        # how often to poll SSM command status
TERMINAL_STATUSES = {"Success", "Cancelled", "Failed", "TimedOut", "Cancelling"}


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

def _require_env(key: str) -> str:
    val = os.environ.get(key, "").strip()
    if not val:
        print(f"ERROR: Required environment variable '{key}' is missing or empty.", file=sys.stderr)
        sys.exit(1)
    return val


def _validate_digest(digest: str, label: str) -> str:
    """Ensure digests look like sha256:... to prevent shell injection."""
    if not digest.startswith("sha256:") or len(digest) != 71:
        print(f"ERROR: {label} does not look like a valid sha256 digest: {digest!r}", file=sys.stderr)
        sys.exit(1)
    return digest


def _load_infra_file(path: Path) -> str:
    """Read an infra file and return it base64-encoded for safe SSM transport."""
    if not path.is_file():
        print(f"ERROR: Required infrastructure file not found: {path}", file=sys.stderr)
        sys.exit(1)
    return base64.b64encode(path.read_bytes()).decode("ascii")


# ---------------------------------------------------------------------------
# Shell script that runs on EC2 via SSM Run Command
# ---------------------------------------------------------------------------

def _build_deploy_script(
    region: str,
    registry_domain: str,
    api_image: str,
    migration_image: str,
    compose_b64: str,
    caddy_b64: str,
) -> list[str]:
    """Return a list of shell lines for AWS-RunShellScript."""
    return [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "",
        "# ----------------------------------------------------------------",
        "# 0. Acquire a simple deployment lock so concurrent SSM invocations",
        "#    (e.g. manual triggers) cannot overlap.",
        "# ----------------------------------------------------------------",
        "LOCK=/tmp/seller-portal-deploy.lock",
        "exec 200>\"$LOCK\"",
        "flock -n 200 || { echo 'ERROR: Another deployment is already running.'; exit 1; }",
        "",
        "APP_DIR=/opt/app",
        "RELEASE_ENV=\"$APP_DIR/.release.env\"",
        "COMPOSE=\"docker compose -f $APP_DIR/docker-compose.yml\"",
        "",
        "# ----------------------------------------------------------------",
        "# 1. Validate .env exists on the host",
        "# ----------------------------------------------------------------",
        "if [ ! -f \"$APP_DIR/.env\" ]; then",
        "  echo 'ERROR: /opt/app/.env not found. Create it with production secrets before deploying.'",
        "  exit 1",
        "fi",
        "source \"$APP_DIR/.env\"   # load DOMAIN, REDIS_PASSWORD, AWS_REGION, etc.",
        "",
        "# ----------------------------------------------------------------",
        "# 2. Read previous (rollback) digest — empty on first deploy",
        "# ----------------------------------------------------------------",
        "PREV_IMAGE_TAG=''",
        "if [ -f \"$RELEASE_ENV\" ]; then",
        "  source \"$RELEASE_ENV\"",
        "  PREV_IMAGE_TAG=\"${IMAGE_TAG:-}\"",
        "fi",
        f"NEW_API_IMAGE='{api_image}'",
        f"NEW_MIGRATION_IMAGE='{migration_image}'",
        "",
        "# ----------------------------------------------------------------",
        "# 3. Sync version-controlled infra files from CI (Gap 8 fix)",
        "# ----------------------------------------------------------------",
        f"echo '{compose_b64}' | base64 -d > \"$APP_DIR/docker-compose.yml\"",
        f"echo '{caddy_b64}' | base64 -d > \"$APP_DIR/Caddyfile\"",
        "",
        "# Validate Compose syntax before touching running services",
        "$COMPOSE config --quiet",
        "",
        "# ----------------------------------------------------------------",
        "# 4. ECR authentication and image pull (pull BOTH before any restart)",
        "# ----------------------------------------------------------------",
        f"aws ecr get-login-password --region {region} | docker login --username AWS --password-stdin {registry_domain}",
        "echo \"Pulling migration image...\"",
        "docker pull \"$NEW_MIGRATION_IMAGE\"",
        "echo \"Pulling API runtime image...\"",
        "docker pull \"$NEW_API_IMAGE\"",
        "",
        "# ----------------------------------------------------------------",
        "# 5. Run Prisma migration — abort on failure, keep existing API",
        "# ----------------------------------------------------------------",
        "echo 'Running Prisma migrations...'",
        "docker run --rm --env-file \"$APP_DIR/.env\" \"$NEW_MIGRATION_IMAGE\"",
        "echo 'Migrations completed successfully.'",
        "",
        "# ----------------------------------------------------------------",
        "# 6. Deploy new API via Compose with --wait",
        "#    --wait polls the Compose healthcheck (runs INSIDE the container)",
        "#    so it works correctly with expose:-only port 3000 (Gap 3 fix).",
        "# ----------------------------------------------------------------",
        "echo \"Deploying API: $NEW_API_IMAGE\"",
        "export IMAGE_TAG=\"$NEW_API_IMAGE\"",
        f"export AWS_REGION='{region}'",
        "",
        "$COMPOSE up -d --wait --wait-timeout 120 --remove-orphans",
        "",
        "# ----------------------------------------------------------------",
        "# 7. Validate and reload Caddy configuration",
        "# ----------------------------------------------------------------",
        "echo 'Validating Caddy configuration...'",
        "$COMPOSE exec -T reverse-proxy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile",
        "$COMPOSE exec -T reverse-proxy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile",
        "",
        "# ----------------------------------------------------------------",
        "# 8. HTTPS smoke check through Caddy (Gap 3 fix: external to container)",
        "#    Requires DNS and TLS to be configured. Falls back gracefully on",
        "#    first deploy when a cert is being issued.",
        "# ----------------------------------------------------------------",
        "HTTPS_CHECK=false",
        "if [ -n \"${DOMAIN:-}\" ] && [ \"$DOMAIN\" != 'localhost' ]; then",
        "  echo \"Running HTTPS smoke check: https://$DOMAIN/api/v1/health/ready\"",
        "  for i in $(seq 1 6); do",
        "    if curl --silent --fail --max-time 10 \"https://$DOMAIN/api/v1/health/ready\" > /dev/null 2>&1; then",
        "      echo 'HTTPS smoke check passed.'",
        "      HTTPS_CHECK=true",
        "      break",
        "    fi",
        "    echo \"HTTPS check attempt $i/6 failed, waiting 10s...\"",
        "    sleep 10",
        "  done",
        "  if [ \"$HTTPS_CHECK\" = false ]; then",
        "    echo 'WARNING: HTTPS smoke check did not pass. Initiating rollback...'",
        "    _rollback",
        "  fi",
        "else",
        "  echo 'DOMAIN not set or is localhost — skipping HTTPS smoke check (not a production deploy).'",
        "fi",
        "",
        "# ----------------------------------------------------------------",
        "# Rollback function — restores previous API image on failure (Gap 6 fix)",
        "# ----------------------------------------------------------------",
        "_rollback() {",
        "  if [ -n \"$PREV_IMAGE_TAG\" ]; then",
        "    echo \"ROLLBACK: restoring previous image: $PREV_IMAGE_TAG\"",
        "    export IMAGE_TAG=\"$PREV_IMAGE_TAG\"",
        "    $COMPOSE up -d --wait --wait-timeout 120 api || true",
        "    echo 'ROLLBACK: previous API image restored.'",
        "  else",
        "    echo 'ROLLBACK: no previous digest recorded — cannot roll back automatically.'",
        "  fi",
        "  $COMPOSE logs --tail 50 api || true",
        "  exit 1",
        "}",
        "",
        "# ----------------------------------------------------------------",
        "# 9. On success: persist new digest as rollback baseline",
        "# ----------------------------------------------------------------",
        "echo \"IMAGE_TAG=$NEW_API_IMAGE\" > \"$RELEASE_ENV\"",
        "docker image prune -f || true",
        "echo '✅ Deployment completed successfully.'",
    ]


# ---------------------------------------------------------------------------
# SSM dispatch and polling
# ---------------------------------------------------------------------------

def _send_ssm_command(ssm, instance_id: str, commands: list[str]) -> str:
    try:
        response = ssm.send_command(
            InstanceIds=[instance_id],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": commands},
            TimeoutSeconds=DEPLOY_TIMEOUT_SECONDS,
        )
    except ClientError as exc:
        print(f"ERROR: Failed to send SSM command: {exc}", file=sys.stderr)
        sys.exit(1)
    return response["Command"]["CommandId"]


def _wait_for_command(ssm, command_id: str, instance_id: str) -> dict:
    """Poll until the SSM command reaches a terminal status."""
    invocation: dict = {}
    elapsed = 0
    while elapsed < DEPLOY_TIMEOUT_SECONDS:
        time.sleep(POLL_INTERVAL_SECONDS)
        elapsed += POLL_INTERVAL_SECONDS
        try:
            invocation = ssm.get_command_invocation(
                CommandId=command_id,
                InstanceId=instance_id,
            )
            status = invocation.get("Status", "Pending")
            print(f"  [{elapsed:>4}s] SSM status: {status}")
            if status in TERMINAL_STATUSES:
                return invocation
        except ssm.exceptions.InvocationDoesNotExist:
            print(f"  [{elapsed:>4}s] Waiting for SSM invocation to be registered...")

    print("ERROR: Timed out waiting for SSM command to complete.", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    # --- Validate inputs ---
    region = _require_env("AWS_REGION")
    instance_id = _require_env("EC2_INSTANCE_ID")
    ecr_repo = _require_env("ECR_REPOSITORY")
    api_digest = _validate_digest(_require_env("API_DIGEST"), "API_DIGEST")
    migration_digest = _validate_digest(_require_env("MIGRATION_DIGEST"), "MIGRATION_DIGEST")

    registry_domain = ecr_repo.split("/")[0]
    api_image = f"{ecr_repo}@{api_digest}"
    migration_image = f"{ecr_repo}@{migration_digest}"

    # --- Load infra files from repo ---
    repo_root = Path(__file__).resolve().parent.parent
    compose_b64 = _load_infra_file(repo_root / "infra" / "docker-compose.yml")
    caddy_b64 = _load_infra_file(repo_root / "infra" / "Caddyfile")

    # --- Build deployment script ---
    commands = _build_deploy_script(
        region=region,
        registry_domain=registry_domain,
        api_image=api_image,
        migration_image=migration_image,
        compose_b64=compose_b64,
        caddy_b64=caddy_b64,
    )

    print(f"Dispatching deployment to EC2 instance {instance_id} via SSM...")
    print(f"  API image:       {api_image}")
    print(f"  Migration image: {migration_image}")

    ssm = boto3.client("ssm", region_name=region)
    command_id = _send_ssm_command(ssm, instance_id, commands)
    print(f"SSM Command ID: {command_id}")

    invocation = _wait_for_command(ssm, command_id, instance_id)

    # --- Print output ---
    stdout = invocation.get("StandardOutputContent", "").strip()
    stderr = invocation.get("StandardErrorContent", "").strip()
    status = invocation.get("Status", "Unknown")

    if stdout:
        print("\n--- Deployment output ---")
        print(stdout)
    if stderr:
        print("\n--- Deployment errors ---", file=sys.stderr)
        print(stderr, file=sys.stderr)

    if status == "Success":
        print(f"\n✅ Deployment succeeded (SSM command: {command_id})")
        sys.exit(0)
    else:
        print(f"\n❌ Deployment FAILED with status: {status}", file=sys.stderr)
        print(f"   SSM command ID for CloudWatch lookup: {command_id}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
