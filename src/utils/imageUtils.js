/**
 * Utility functions for image generation and processing
 */

const { GENERATION_TYPES } = require('../services/stabilityAIService');

/**
 * Get credit cost multiplier based on image type and size
 * @param {string} generationType - The type of generation
 * @param {string} resolution - The resolution of the image
 * @returns {number} - The credit cost multiplier
 */
const getGenerationCostMultiplier = (generationType, resolution) => {
  // Base costs for different generation types
  const typeCosts = {
    GENERAL: 1.0,
    ANIME: 1.0,
    REALISTIC: 1.2,
    LOGO: 1.2,
    POSTER: 1.5,
    THUMBNAIL: 0.8,
    CONCEPT: 1.3,
    GAME_CHARACTER: 1.3,
    PRODUCT: 1.2,
    FANTASY: 1.3
  };

  // Resolution multipliers
  const resolutionMultipliers = {
    NORMAL: 1.0,
    HD: 1.5,
    POSTER: 2.0,
    THUMBNAIL: 0.5,
    WIDE: 1.2,
    TALL: 1.2,
    POSTER_LANDSCAPE: 2.0,
    POSTER_PORTRAIT: 2.0,
    THUMBNAIL_YOUTUBE: 1.0,
    LOGO: 0.8,
    PRODUCT: 1.5,
    // Aspect ratio options
    SQUARE: 2.0,       // High resolution 1:1
    LANDSCAPE: 2.0,    // High resolution 16:9
    PORTRAIT: 2.0,     // High resolution 9:16
    WIDESCREEN: 1.2,   // Standard resolution 16:9
    // Wallpaper options
    WALLPAPER_HD: 3.0,      // Full HD 16:9
    WALLPAPER_4K: 5.0,      // 4K 16:9
    WALLPAPER_MOBILE: 3.0   // Mobile 9:16
  };

  const typeMultiplier = typeCosts[generationType] || 1.0;
  const sizeMultiplier = resolutionMultipliers[resolution] || 1.0;

  return typeMultiplier * sizeMultiplier;
};

/**
 * Enhance a prompt with AI-specific improvements
 * @param {string} prompt - The user's original prompt
 * @param {string} generationType - The type of generation
 * @returns {string} - The enhanced prompt
 */
const enhancePrompt = (prompt, generationType) => {
  if (!prompt) return '';
  
  const genType = GENERATION_TYPES[generationType] || GENERATION_TYPES.GENERAL;
  return `${genType.promptPrefix}${prompt}${genType.promptSuffix}`;
};

/**
 * Get suggested negative prompts based on generation type
 * @param {string} generationType - The type of generation
 * @returns {string} - Suggested negative prompts
 */
const getSuggestedNegativePrompt = (generationType) => {
  const genType = GENERATION_TYPES[generationType] || GENERATION_TYPES.GENERAL;
  return genType.negativePrompt || '';
};

/**
 * Get appropriate file extension based on image type
 * @param {string} mimeType - The MIME type of the image
 * @returns {string} - The file extension
 */
const getFileExtension = (mimeType) => {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'png'; // Default to PNG
  }
};

/**
 * Format cloudinary folder path based on user and generation type
 * @param {string} userId - The user ID
 * @param {string} generationType - The type of generation
 * @returns {string} - Formatted folder path
 */
const getCloudinaryFolder = (userId, generationType) => {
  return `orincore-ai-studio/${userId}/${generationType.toLowerCase()}`;
};

/**
 * Calculate image aspect ratio
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} - Formatted aspect ratio (e.g., "16:9")
 */
const calculateAspectRatio = (width, height) => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

module.exports = {
  getGenerationCostMultiplier,
  enhancePrompt,
  getSuggestedNegativePrompt,
  getFileExtension,
  getCloudinaryFolder,
  calculateAspectRatio
}; 