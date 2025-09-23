export interface FacebookConfig {
  chromeUserDataDir: string;
  chromeProfile: string;
  seleniumTimeout: number;
  tempFilesDir: string;
  pythonScriptPath: string;
  maxRetryAttempts: number;
  cleanupTempFiles: boolean;
  pythonExecutable: string;
}
