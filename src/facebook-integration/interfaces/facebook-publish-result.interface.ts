// Temporary enum definition until Prisma client is regenerated
export enum FacebookPostingStatus {
  NOT_POSTED = 'NOT_POSTED',
  POSTING = 'POSTING',
  POSTED = 'POSTED',
  FAILED = 'FAILED',
  NEEDS_UPDATE = 'NEEDS_UPDATE',
}

export interface FacebookPublishResult {
  success: boolean;
  status: FacebookPostingStatus;
  listingUrl?: string;
  error?: string;
  retryCount?: number;
}
