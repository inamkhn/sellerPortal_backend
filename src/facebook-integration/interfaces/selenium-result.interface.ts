export interface SeleniumResult {
  success: boolean;
  listingUrl?: string;
  error?: string;
  screenshot?: string;
  executionTime?: number;
}
