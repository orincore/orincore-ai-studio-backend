const { ApiError } = require('../middlewares/errorMiddleware');
const StabilityAIService = require('./stabilityAIService');
const CloudinaryService = require('./cloudinaryService');
const CreditService = require('./creditService');
const AssetProcessingService = require('./assetProcessingService');
const { 
  generateThumbnailPrompt, 
  calculateTextLayout, 
  getThumbnailParameters 
} = require('../utils/thumbnailUtils');
const { v4: uuidv4 } = require('uuid');

/**
 * Service for YouTube thumbnail generation
 */
class ThumbnailService {
  /**
   * Generate a YouTube thumbnail image
   * 
   * @param {Object} userId - User ID
   * @param {Object} params - Generation parameters
   * @param {string} params.title - Video title
   * @param {string} params.subtitle - Optional subtitle
   * @param {Array<string>} params.tags - Content tags
   * @param {string} params.contentCategory - Content category
   * @param {string} params.stylePreference - Style preference
   * @param {Array<string>} params.colorPreferences - Optional color preferences
   * @param {Object} params.userAsset - Optional user-uploaded asset
   * @return {Promise<Object>} Generated thumbnail data
   */
  static async generateThumbnail(userId, params) {
    try {
      const {
        title,
        subtitle,
        tags,
        contentCategory = 'tech',
        stylePreference = 'bold',
        colorPreferences = [],
        userAsset
      } = params;
      
      // 1. Process user assets if provided
      let processedAsset = null;
      if (userAsset) {
        processedAsset = await AssetProcessingService.processUserImage(
          userAsset.buffer,
          userAsset.originalname,
          userId,
          {
            maxWidth: 800,
            maxHeight: 800,
            assetType: 'thumbnail-assets'
          }
        );
      }
      
      // 2. Calculate text layout
      const textLayout = calculateTextLayout(title, subtitle);
      
      // 3. Generate the enhanced prompt
      const enhancedPrompt = generateThumbnailPrompt({
        title,
        subtitle,
        tags,
        contentCategory,
        stylePreference,
        colorPreferences,
        hasUserImage: !!processedAsset
      });
      
      // 4. Get thumbnail parameters
      const thumbnailParams = getThumbnailParameters(contentCategory);
      
      // 5. Calculate credit cost - YouTube thumbnails are standard resolution
      const creditCost = 3; // Fixed cost for YouTube thumbnails
      
      // 6. Check and deduct user credits
      await CreditService.checkAndDeductCredits(userId, creditCost);
      
      // 7. Generate the image using Stability AI
      const generationResult = await StabilityAIService.generateImage({
        prompt: enhancedPrompt.prompt,
        negativePrompt: enhancedPrompt.negativePrompt,
        width: thumbnailParams.resolution.width,
        height: thumbnailParams.resolution.height,
        numberOfImages: 1,
        // Use standard model
        model: 'stable-diffusion-xl-1024-v1-0'
      });
      
      if (!generationResult || !generationResult.images || generationResult.images.length === 0) {
        throw new ApiError('Failed to generate thumbnail image', 500);
      }
      
      // 8. Process the generated image for YouTube (Add text overlay if requested)
      const generatedImage = generationResult.images[0];
      
      // 9. Upload to Cloudinary in the thumbnail folder
      const thumbnailId = uuidv4();
      const cloudinaryFolder = `orincore-ai-studio/${userId}/thumbnails`;
      
      const uploadResult = await CloudinaryService.uploadBase64Image(
        generatedImage.base64,
        cloudinaryFolder,
        thumbnailId
      );
      
      // 10. Save record in database and return result
      const thumbnailData = {
        id: thumbnailId,
        userId,
        title,
        subtitle,
        contentCategory,
        stylePreference,
        tags,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: thumbnailParams.resolution.width,
        height: thumbnailParams.resolution.height,
        textLayout,
        creditCost,
        createdAt: new Date(),
        // Include user asset info if used
        userAssetId: processedAsset ? processedAsset.id : null
      };
      
      // Return the result
      return {
        success: true,
        message: 'YouTube thumbnail generated successfully',
        data: thumbnailData
      };
    } catch (error) {
      console.error('Error generating YouTube thumbnail:', error);
      
      // Refund credits if the generation failed after deduction
      if (error.message !== 'Insufficient credits' && error.message !== 'Failed to check or deduct credits') {
        try {
          await CreditService.refundCredits(userId, 3); // Refund the standard cost
        } catch (refundError) {
          console.error('Error refunding credits:', refundError);
        }
      }
      
      throw new ApiError(
        error.message || 'Failed to generate YouTube thumbnail', 
        error.statusCode || 500
      );
    }
  }
  
  /**
   * List thumbnails generated by a user
   * 
   * @param {string} userId - User ID
   * @param {Object} filters - Filter parameters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @return {Promise<Object>} Paginated thumbnails
   */
  static async listThumbnails(userId, filters = {}, page = 1, limit = 20) {
    try {
      // This would be implemented with a database query
      // For now, this is a placeholder
      return {
        thumbnails: [],
        page,
        limit,
        totalPages: 0,
        total: 0
      };
    } catch (error) {
      console.error('Error listing thumbnails:', error);
      throw new ApiError(
        error.message || 'Failed to list thumbnails',
        error.statusCode || 500
      );
    }
  }
  
  /**
   * Get a specific thumbnail by ID
   * 
   * @param {string} thumbnailId - Thumbnail ID
   * @param {string} userId - User ID (for authorization)
   * @return {Promise<Object>} Thumbnail data
   */
  static async getThumbnail(thumbnailId, userId) {
    try {
      // This would be implemented with a database query
      // For now, this is a placeholder
      throw new ApiError('Thumbnail not found', 404);
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      throw new ApiError(
        error.message || 'Failed to get thumbnail',
        error.statusCode || 500
      );
    }
  }
  
  /**
   * Delete a thumbnail
   * 
   * @param {string} thumbnailId - Thumbnail ID
   * @param {string} userId - User ID (for authorization)
   * @return {Promise<Object>} Deletion result
   */
  static async deleteThumbnail(thumbnailId, userId) {
    try {
      // This would be implemented with a database query and Cloudinary deletion
      // For now, this is a placeholder
      throw new ApiError('Thumbnail deletion not implemented', 501);
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
      throw new ApiError(
        error.message || 'Failed to delete thumbnail',
        error.statusCode || 500
      );
    }
  }
}

module.exports = ThumbnailService; 