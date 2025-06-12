/**
 * Utility functions for OTP generation and validation
 */

/**
 * Generate a random 6-digit OTP
 * @returns {string} A 6-digit OTP code
 */
const generateOTP = () => {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

/**
 * Check if an OTP has expired
 * @param {Date} createdAt - When the OTP was created
 * @param {number} expiryMinutes - OTP validity duration in minutes
 * @returns {boolean} True if OTP has expired, false otherwise
 */
const isOTPExpired = (createdAt, expiryMinutes = 10) => {
  const expiryTime = new Date(createdAt.getTime() + expiryMinutes * 60000);
  return new Date() > expiryTime;
};

/**
 * Validate if the provided OTP matches the stored OTP and is not expired
 * @param {string} providedOTP - The OTP provided by the user
 * @param {string} storedOTP - The OTP stored in the database
 * @param {Date} createdAt - When the OTP was created
 * @param {number} expiryMinutes - OTP validity duration in minutes
 * @returns {boolean} True if OTP is valid, false otherwise
 */
const validateOTP = (providedOTP, storedOTP, createdAt, expiryMinutes = 10) => {
  if (!providedOTP || !storedOTP) {
    return false;
  }
  
  // Check if OTP has expired
  if (isOTPExpired(createdAt, expiryMinutes)) {
    return false;
  }
  
  // Check if OTPs match
  return providedOTP === storedOTP;
};

module.exports = {
  generateOTP,
  isOTPExpired,
  validateOTP
}; 