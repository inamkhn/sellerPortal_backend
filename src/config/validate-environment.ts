export function validateEnvironment(config: Record<string, unknown>) {
  if (config.NODE_ENV !== 'production') return config;
  for (const key of [
    'DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'REDIS_HOST',
    'REDIS_PASSWORD', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
    'RESEND_API_KEY', 'EMAIL_FROM',
  ]) {
    if (typeof config[key] !== 'string' || !(config[key] as string).trim()) {
      throw new Error(`Missing production configuration: ${key}`);
    }
  }
  if ((config.JWT_SECRET as string).length < 32 || config.JWT_SECRET === 'your-super-secret-jwt-key') {
    throw new Error('Production JWT_SECRET must be a strong secret of at least 32 characters');
  }
  if (new URL(config.FRONTEND_URL as string).protocol !== 'https:') {
    throw new Error('Production FRONTEND_URL must use HTTPS');
  }
  return config;
}
