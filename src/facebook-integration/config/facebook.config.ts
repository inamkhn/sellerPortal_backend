import { registerAs } from '@nestjs/config';
import { FacebookConfig } from '../interfaces/facebook-config.interface';

export default registerAs(
  'facebook',
  (): FacebookConfig => ({
    chromeUserDataDir:
      process.env.FACEBOOK_CHROME_USER_DATA_DIR ||
      'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\User Data',
    chromeProfile: process.env.FACEBOOK_CHROME_PROFILE || 'Default',
    seleniumTimeout: parseInt(
      process.env.FACEBOOK_SELENIUM_TIMEOUT || '60',
      10,
    ),
    tempFilesDir: process.env.FACEBOOK_TEMP_FILES_DIR || './temp/facebook',
    pythonScriptPath:
      process.env.FACEBOOK_PYTHON_SCRIPT_PATH ||
      './scripts/facebook_automation.py',
    maxRetryAttempts: parseInt(
      process.env.FACEBOOK_MAX_RETRY_ATTEMPTS || '3',
      10,
    ),
    cleanupTempFiles: process.env.FACEBOOK_CLEANUP_TEMP_FILES === 'true',
    pythonExecutable: process.env.FACEBOOK_PYTHON_EXECUTABLE || 'python',
  }),
);
