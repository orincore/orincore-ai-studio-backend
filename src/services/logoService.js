const { generateImage, STYLES, MODELS } = require('./stabilityAIService');
const { uploadImage } = require('../config/cloudinaryConfig');
const { ApiError } = require('../middlewares/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const { getCloudinaryFolder } = require('../utils/imageUtils');

/**
 * Enhanced Logo Generation Service
 * Specialized handling for logo generation with better text and color accuracy
 */
class LogoService {
  /**
   * Generate a logo with enhanced text handling
   * 
   * @param {Object} options - Logo generation options
   * @param {string} options.name - Brand name to display in the logo
   * @param {string} options.description - Description of the business/brand
   * @param {string} options.colorTheme - Color theme to use (e.g., "blue and gold", "red and black")
   * @param {string} options.style - Logo style (e.g., "minimalist", "modern", "vintage")
   * @param {string} options.industry - Industry category
   * @param {string} options.userId - User ID
   * @returns {Promise<Object>} - Generated logo data
   */
  async generateLogo({
    name,
    description = '',
    colorTheme = '',
    style = 'minimalist',
    industry = '',
    userId
  }) {
    try {
      // Validate inputs
      if (!name) {
        throw new ApiError('Brand name is required for logo generation', 400);
      }
      
      // Format name to ensure proper handling
      const formattedName = name.trim();
      
      // Build a specialized prompt for logo generation
      let prompt = this.buildLogoPrompt({
        name: formattedName,
        description,
        colorTheme,
        style,
        industry
      });
      
      // Build specialized negative prompt to avoid text rendering
      const negativePrompt = this.buildLogoNegativePrompt();
      
      // Determine the best style preset based on the requested style
      const stylePreset = this.getStylePresetForLogo(style);
      
      // Generate the logo using higher quality settings
      const generationResult = await generateImage({
        prompt,
        negativePrompt,
        generationType: 'LOGO',
        modelId: MODELS.STABLE_DIFFUSION_XL,
        cfgScale: 9, // Higher guidance scale for more accurate results
        steps: 50,   // More steps for higher quality
        style: stylePreset,
        numberOfImages: 1
      });
      
      // Upload to Cloudinary
      const logoImage = generationResult.images[0];
      const logoId = uuidv4();
      const folderPath = getCloudinaryFolder(userId, 'LOGO');
      
      const cloudinaryResult = await uploadImage(
        `data:image/png;base64,${logoImage.base64}`,
        folderPath,
        logoId
      );
      
      // Return the logo data
      return {
        id: logoId,
        prompt,
        name: formattedName,
        style,
        colorTheme,
        industry,
        imageUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id
      };
    } catch (error) {
      console.error('Error generating logo:', error);
      throw error instanceof ApiError 
        ? error 
        : new ApiError(`Failed to generate logo: ${error.message}`, 500);
    }
  }
  
  /**
   * Build a specialized prompt for logo generation
   */
  buildLogoPrompt({ name, description, colorTheme, style, industry }) {
    // Start with a base prompt template
    let prompt = `professional logo design for a brand named "${name}"`;
    
    // Add style information
    if (style) {
      prompt += `, ${style} style`;
    }
    
    // Add color theme if specified
    if (colorTheme) {
      prompt += `, color scheme: ${colorTheme}`;
    }
    
    // Add industry context if provided
    if (industry) {
      prompt += `, for ${industry} industry`;
    }
    
    // Add description details if provided
    if (description) {
      prompt += `, ${description}`;
    }
    
    // Add quality enhancers
    prompt += `, high quality, vector style, clean lines, modern branding, isolated on white background, emblematic design, no text elements, sharp details, professional`;
    
    return prompt;
  }
  
  /**
   * Build a specialized negative prompt for logos
   */
  buildLogoNegativePrompt() {
    return "text, letters, words, fonts, typography, wordmark, busy, complex, detailed background, noisy, grainy, blurry, distorted, low resolution, pixelated, jpeg artifacts, watermark, signature, amateur, unprofessional, childish, ugly, deformed";
  }
  
  /**
   * Get the appropriate style preset based on requested logo style
   */
  getStylePresetForLogo(style) {
    // Map common logo style terms to appropriate style presets
    const styleMapping = {
      'minimalist': STYLES.NONE,
      'modern': STYLES.DIGITAL_ART,
      'realistic': STYLES.REALISTIC,
      'vintage': STYLES.ENHANCE,
      '3d': STYLES.THREE_D,
      'flat': STYLES.DIGITAL_ART,
      'geometric': STYLES.ISOMETRIC,
      'corporate': STYLES.NONE,
      'playful': STYLES.DIGITAL_ART,
      'luxury': STYLES.ENHANCE
    };
    
    return styleMapping[style.toLowerCase()] || STYLES.NONE;
  }
}

module.exports = new LogoService(); 