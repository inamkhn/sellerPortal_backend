/**
 * Utility functions for OTP generation and validation
 */

/**
 * Generate a random OTP of specified length
 * @param length - Length of the OTP (default: 6)
 * @returns string - Generated OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  return otp;
}

/**
 * Generate OTP expiry time
 * @param minutes - Minutes from now (default: 15)
 * @returns Date - Expiry date
 */
export function generateOTPExpiry(minutes: number = 15): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check if OTP is expired
 * @param expiry - Expiry date
 * @returns boolean - True if expired
 */
export function isOTPExpired(expiry: Date): boolean {
  return new Date() > expiry;
}

/**
 * Validate OTP format
 * @param otp - OTP to validate
 * @param length - Expected length (default: 6)
 * @returns boolean - True if valid format
 */
export function isValidOTPFormat(otp: string, length: number = 6): boolean {
  const otpRegex = new RegExp(`^\\d{${length}}$`);
  return otpRegex.test(otp);
}
