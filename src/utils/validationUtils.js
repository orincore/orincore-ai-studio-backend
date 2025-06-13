/**
 * Phone number validation functions
 */

/**
 * Validates a phone number format
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  // International format: optional '+' followed by 10-15 digits
  return /^\+?[1-9]\d{9,14}$/.test(phone);
};

/**
 * Formats error message for invalid phone number
 * @returns {string} - The error message
 */
const getPhoneValidationErrorMessage = () => {
  return 'Please provide a valid phone number in international format (e.g., +1234567890)';
};

module.exports = {
  isValidPhoneNumber,
  getPhoneValidationErrorMessage
};
