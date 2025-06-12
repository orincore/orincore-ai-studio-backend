const { ApiError } = require('../middlewares/errorMiddleware');
const StabilityAIService = require('./stabilityAIService');
const CloudinaryService = require('./cloudinaryService');
const CreditService = require('./creditService');
const AssetProcessingService = require('./assetProcessingService');
const { 
  generatePosterPrompt, 
  getPosterResolution, 
  calculatePosterTextLayout,
  ASPECT_RATIOS
} = require('../utils/posterUtils');
const { v4: uuidv4 } = require('uuid');

/**
 * Service for AI poster generation
 */
class PosterService {
  /**
   * Generate a professional poster
   * 
   * @param {string} userId - User ID
   * @param {Object} params - Generation parameters
   * @param {string} params.title - Poster title
   * @param {string} params.slogan - Optional slogan or tagline
   * @param {string} params.additionalText - Additional text content
   * @param {string} params.websiteUrl - Website URL
   * @param {string} params.posterType - Type of poster
   * @param {string} params.stylePreference - Style preference
   * @param {Array<string>} params.colorPalette - Color palette preferences
   * @param {string} params.aspectRatio - Aspect ratio selection
   * @param {Object} params.customDimensions - Custom dimensions if aspectRatio is 'custom'
   * @param {Object} params.logoAsset - Optional logo upload
   * @param {Object} params.productImage - Optional product image upload
   * @return {Promise<Object>} Generated poster data
   */
  static async generatePoster(userId, params) {
    try {
      const {
        title,
        slogan,
        additionalText,
        websiteUrl,
        posterType = 'business',
        stylePreference = 'modern',
        colorPalette = [],
        aspectRatio = 'portrait-a4',
        customDimensions,
        logoAsset,
        productImage
      } = params;
      
      // 1. Process user assets if provided
      let processedLogo = null;
      let processedProductImage = null;
      
      if (logoAsset) {
        processedLogo = await AssetProcessingService.processUserImage(
          logoAsset.buffer,
          logoAsset.originalname,
          userId,
          {
            maxWidth: 800, 
            maxHeight: 800,
            assetType: 'poster-logos'
          }
        );
      }
      
      if (productImage) {
        processedProductImage = await AssetProcessingService.processUserImage(
          productImage.buffer,
          productImage.originalname,
          userId,
          {
            maxWidth: 1200,
            maxHeight: 1200,
            assetType: 'poster-images'
          }
        );
      }
      
      // 2. Calculate text layout
      const textLayout = calculatePosterTextLayout({
        title,
        slogan,
        additionalText,
        websiteUrl,
        posterType
      });
      
      // 3. Generate the enhanced prompt
      const enhancedPrompt = generatePosterPrompt({
        title,
        slogan,
        additionalText,
        websiteUrl,
        posterType,
        stylePreference,
        colorPalette,
        hasLogo: !!processedLogo,
        hasProductImage: !!processedProductImage
      });
      
      // 4. Get optimal resolution based on aspect ratio
      const resolution = getPosterResolution(aspectRatio, customDimensions);
      
      // 5. Calculate credit cost - fixed cost for posters
      const creditCost = 50; // Fixed cost for posters
      
      // 6. Check and deduct user credits
      await CreditService.checkAndDeductCredits(userId, creditCost);
      
      // 7. Generate the image using Stability AI
      const generationResult = await StabilityAIService.generateImage({
        prompt: enhancedPrompt.prompt,
        negativePrompt: enhancedPrompt.negativePrompt,
        width: resolution.width,
        height: resolution.height,
        numberOfImages: 1,
        // Use high-quality model for posters
        model: 'stable-diffusion-xl-1024-v1-0'
      });
      
      if (!generationResult || !generationResult.images || generationResult.images.length === 0) {
        throw new ApiError('Failed to generate poster image', 500);
      }
      
      // 8. Process the generated image
      const generatedImage = generationResult.images[0];
      
      // 9. Upload to Cloudinary in the posters folder
      const posterId = uuidv4();
      const cloudinaryFolder = `orincore-ai-studio/${userId}/posters`;
      
      const uploadResult = await CloudinaryService.uploadBase64Image(
        generatedImage.base64,
        cloudinaryFolder,
        posterId
      );
      
      // 10. Save record in database and return result
      const posterData = {
        id: posterId,
        userId,
        title,
        slogan,
        additionalText,
        websiteUrl,
        posterType,
        stylePreference,
        colorPalette,
        aspectRatio: resolution.aspectRatio,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: resolution.width,
        height: resolution.height,
        textLayout,
        creditCost,
        createdAt: new Date(),
        // Include asset info if used
        logoAssetId: processedLogo ? processedLogo.id : null,
        productImageId: processedProductImage ? processedProductImage.id : null
      };
      
      // Return the result
      return {
        success: true,
        message: 'Poster generated successfully',
        data: posterData
      };
    } catch (error) {
      console.error('Error generating poster:', error);
      
      // Refund credits if the generation failed after deduction
      if (error.message !== 'Insufficient credits' && error.message !== 'Failed to check or deduct credits') {
        try {
          // Attempt to refund credits
          await CreditService.refundCredits(userId, 50); // Refund the full cost
        } catch (refundError) {
          console.error('Error refunding credits:', refundError);
        }
      }
      
      throw new ApiError(
        error.message || 'Failed to generate poster', 
        error.statusCode || 500
      );
    }
  }
  
  /**
   * List posters generated by a user
   * 
   * @param {string} userId - User ID
   * @param {Object} filters - Filter parameters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @return {Promise<Object>} Paginated posters
   */
  static async listPosters(userId, filters = {}, page = 1, limit = 20) {
    try {
      // This would be implemented with a database query
      // For now, this is a placeholder
      return {
        posters: [],
        page,
        limit,
        totalPages: 0,
        total: 0
      };
    } catch (error) {
      console.error('Error listing posters:', error);
      throw new ApiError(
        error.message || 'Failed to list posters',
        error.statusCode || 500
      );
    }
  }
  
  /**
   * Get a specific poster by ID
   * 
   * @param {string} posterId - Poster ID
   * @param {string} userId - User ID (for authorization)
   * @return {Promise<Object>} Poster data
   */
  static async getPoster(posterId, userId) {
    try {
      // This would be implemented with a database query
      // For now, this is a placeholder
      throw new ApiError('Poster not found', 404);
    } catch (error) {
      console.error('Error getting poster:', error);
      throw new ApiError(
        error.message || 'Failed to get poster',
        error.statusCode || 500
      );
    }
  }
  
  /**
   * Delete a poster
   * 
   * @param {string} posterId - Poster ID
   * @param {string} userId - User ID (for authorization)
   * @return {Promise<Object>} Deletion result
   */
  static async deletePoster(posterId, userId) {
    try {
      // This would be implemented with a database query and Cloudinary deletion
      // For now, this is a placeholder
      throw new ApiError('Poster deletion not implemented', 501);
    } catch (error) {
      console.error('Error deleting poster:', error);
      throw new ApiError(
        error.message || 'Failed to delete poster',
        error.statusCode || 500
      );
    }
  }
  
  /**
   * Get available poster aspect ratios
   * 
   * @return {Object} Available aspect ratios
   */
  static getAvailableAspectRatios() {
    // Return formatted aspect ratio information
    return Object.entries(ASPECT_RATIOS).map(([key, value]) => ({
      id: key,
      name: value.name,
      width: value.width,
      height: value.height,
      aspectRatio: value.width && value.height ? `${value.width}:${value.height}` : 'custom'
    }));
  }
}

module.exports = PosterService; 