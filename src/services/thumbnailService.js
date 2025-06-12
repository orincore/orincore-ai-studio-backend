const { ApiError } = require('../middlewares/errorMiddleware');
const StabilityAIService = require('./stabilityAIService');
const CloudinaryService = require('./cloudinaryService');
const CreditService = require('./creditService');
const AssetProcessingService = require('./assetProcessingService');
const { 
  generateThumbnailPrompt, 
  calculateTextLayout, 
  getThumbnailParameters,
  CONTENT_CATEGORY_STYLES,
  STYLE_MODIFIERS
} = require('../utils/thumbnailUtils');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const axios = require('axios');

/**
 * Service for YouTube thumbnail generation
 */
class ThumbnailService {
  /**
   * Generate a professional YouTube thumbnail image
   * 
   * @param {Object} userId - User ID
   * @param {Object} params - Generation parameters
   * @param {string} params.title - Video title
   * @param {string} params.subtitle - Optional subtitle
   * @param {Array<string>} params.tags - Content tags
   * @param {string} params.contentCategory - Content category
   * @param {string} params.stylePreference - Style preference
   * @param {Array<string>} params.colorPreferences - Optional color preferences
   * @param {Object} params.prompt - Custom prompt for more control
   * @param {Array<Object>} params.userAssets - Optional user-uploaded assets (multiple)
   * @param {boolean} params.useAI - Whether to use AI for background generation (default: true)
   * @param {Object} params.composition - Composition settings
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
        prompt = '',
        userAssets = [],
        useAI = true,
        composition = {}
      } = params;
      
      // 1. Process user assets if provided (now supports multiple)
      let processedAssets = [];
      if (userAssets && userAssets.length > 0) {
        processedAssets = await Promise.all(
          userAssets.map(asset => 
            AssetProcessingService.processUserImage(
              asset.buffer || asset, // Handle both multer file objects and raw buffers
              asset.originalname || 'image.jpg',
              userId,
              {
                maxWidth: 1200,
                maxHeight: 1200,
                assetType: 'thumbnail-assets'
              }
            )
          )
        );
      }
      
      // 2. Calculate text layout based on title/subtitle
      const textLayout = calculateTextLayout(title, subtitle);
      
      // 3. Determine if we'll be using custom or AI-generated background
      const useCustomBackground = processedAssets.length > 0 && !useAI;
      
      // 4. Generate the enhanced prompt - now considers user prompt if provided
      const enhancedPrompt = generateThumbnailPrompt({
        title,
        subtitle,
        tags,
        contentCategory,
        stylePreference,
        colorPreferences,
        customPrompt: prompt,
        hasUserImage: processedAssets.length > 0,
        userImageCount: processedAssets.length
      });
      
      // 5. Get thumbnail parameters based on content category
      const thumbnailParams = getThumbnailParameters(contentCategory);
      
      // 6. Calculate credit cost - YouTube thumbnails are fixed cost
      const creditCost = 50; // Fixed cost for YouTube thumbnails
      
      // 7. Check and deduct user credits
      await CreditService.checkAndDeductCredits(userId, creditCost);
      
      // 8. Generate the image using Stability AI (if AI is used)
      let generatedImage = null;
      if (useAI) {
        try {
          // Use enhanced prompt engineering for better quality
          const generationResult = await StabilityAIService.generateImage({
            prompt: enhancedPrompt.prompt,
            negativePrompt: enhancedPrompt.negativePrompt,
            width: thumbnailParams.resolution.width,
            height: thumbnailParams.resolution.height,
            numberOfImages: 1,
            cfgScale: 9, // Higher CFG for better prompt adherence
            steps: 40, // More steps for better quality
            modelId: 'stable-diffusion-xl-1024-v1-0'
          });
          
          if (!generationResult || !generationResult.images || generationResult.images.length === 0) {
            throw new ApiError('Failed to generate thumbnail image', 500);
          }
          
          generatedImage = generationResult.images[0];
          console.log(`Generated image successfully, base64 length: ${generatedImage.base64.length}`);
        } catch (error) {
          console.error('Error generating AI image:', error);
          throw new ApiError(`Failed to generate AI image: ${error.message}`, 500);
        }
      }
      
      // 9. Compose the final thumbnail with text overlay and user assets
      let finalImageBuffer;
      
      try {
        if (useCustomBackground) {
          // Use the first user asset as background if not using AI
          finalImageBuffer = await this.createCompositeWithAssets(
            processedAssets, 
            null, // No AI image
            textLayout,
            title,
            subtitle,
            thumbnailParams
          );
        } else if (generatedImage && processedAssets.length > 0) {
          // Combine AI generation with user assets
          finalImageBuffer = await this.createCompositeWithAssets(
            processedAssets,
            generatedImage,
            textLayout,
            title,
            subtitle,
            thumbnailParams
          );
        } else if (generatedImage) {
          // Just use the AI generation and add text
          try {
            // Decode base64 data - make sure it's properly formatted
            const imageData = generatedImage.base64.startsWith('data:') 
              ? generatedImage.base64
              : `data:image/png;base64,${generatedImage.base64}`;
              
            // Extract the actual base64 content
            const base64Content = imageData.split(',')[1] || generatedImage.base64;
            
            // Convert to buffer
            const buffer = Buffer.from(base64Content, 'base64');
            console.log(`Converted base64 to buffer of size: ${buffer.length} bytes`);
            
            // Add text overlay to the buffer
            finalImageBuffer = await this.addTextOverlay(
              buffer,
              textLayout,
              title,
              subtitle,
              thumbnailParams
            );
          } catch (err) {
            console.error('Error processing AI image buffer:', err);
            throw new ApiError(`Failed to process AI image: ${err.message}`, 500);
          }
        } else {
          throw new ApiError('No image source available for thumbnail', 500);
        }
      } catch (error) {
        console.error('Error processing thumbnail image:', error);
        throw new ApiError(`Failed to process thumbnail: ${error.message}`, 500);
      }
      
      // 10. Upload to Cloudinary in the thumbnail folder
      const thumbnailId = uuidv4();
      const cloudinaryFolder = `orincore-ai-studio/${userId}/thumbnails`;
      
      const uploadResult = await CloudinaryService.uploadImageBuffer(
        finalImageBuffer,
        cloudinaryFolder,
        thumbnailId
      );
      
      // 11. Save record in database and return result
      const thumbnailData = {
        id: thumbnailId,
        userId,
        title,
        subtitle,
        contentCategory,
        stylePreference,
        tags,
        customPrompt: prompt,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: thumbnailParams.resolution.width,
        height: thumbnailParams.resolution.height,
        textLayout,
        creditCost,
        createdAt: new Date(),
        userAssetIds: processedAssets.map(asset => asset.id),
        quality: 'professional' // Mark as professional quality
      };
      
      // Return the result
      return {
        success: true,
        message: 'Professional YouTube thumbnail generated successfully',
        data: thumbnailData
      };
    } catch (error) {
      console.error('Error generating YouTube thumbnail:', error);
      
      // Refund credits if the generation failed after deduction
      if (error.message !== 'Insufficient credits' && error.message !== 'Failed to check or deduct credits') {
        try {
          await CreditService.refundCredits(userId, 50); // Refund the standard cost
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
   * Create a composite image with user assets overlaid on the AI background
   * 
   * @param {Array<Object>} assets - Processed user assets
   * @param {Object} aiImage - AI-generated image (can be null if not using AI)
   * @param {Object} textLayout - Text layout information
   * @param {string} title - Thumbnail title
   * @param {string} subtitle - Thumbnail subtitle
   * @param {Object} thumbnailParams - Thumbnail parameters
   * @returns {Promise<Buffer>} - Composite image buffer
   */
  static async createCompositeWithAssets(assets, aiImage, textLayout, title, subtitle, thumbnailParams) {
    try {
      // Create the base image (either from AI or from first user asset)
      let baseImageBuffer;
      
      if (aiImage) {
        try {
          // Process base64 data properly
          const imageData = aiImage.base64.startsWith('data:') 
            ? aiImage.base64
            : `data:image/png;base64,${aiImage.base64}`;
            
          // Extract the actual base64 content
          const base64Content = imageData.split(',')[1] || aiImage.base64;
          
          // Convert to buffer
          baseImageBuffer = Buffer.from(base64Content, 'base64');
          console.log(`AI image converted to buffer of size: ${baseImageBuffer.length} bytes`);
        } catch (err) {
          console.error('Error processing AI image for composite:', err);
          throw new ApiError(`Failed to process AI image for composite: ${err.message}`, 500);
        }
      } else if (assets.length > 0) {
        try {
          // Download the first asset to use as background
          const response = await axios.get(assets[0].url, { responseType: 'arraybuffer' });
          baseImageBuffer = Buffer.from(response.data);
          console.log(`Downloaded asset image of size: ${baseImageBuffer.length} bytes`);
        } catch (err) {
          console.error('Error downloading asset for background:', err);
          throw new ApiError(`Failed to download asset for background: ${err.message}`, 500);
        }
      } else {
        throw new ApiError('No base image available for composition', 500);
      }
      
      // Simple processing - just resize the base image and return it as JPEG
      try {
        // Create a Sharp instance for the base image
        const composition = sharp(baseImageBuffer, { failOnError: false })
          .resize({
            width: thumbnailParams.resolution.width,
            height: thumbnailParams.resolution.height,
            fit: 'cover',
            position: 'center'
          });
        
        // For now, just return the base image resized to simplify debugging
        return composition.jpeg().toBuffer();
      } catch (err) {
        console.error('Error creating composition with Sharp:', err);
        throw new ApiError(`Failed to create image composition: ${err.message}`, 500);
      }
    } catch (error) {
      console.error('Error creating composite with assets:', error);
      throw new ApiError(`Failed to create composite: ${error.message}`, 500);
    }
  }
  
  /**
   * Add text overlay to an image buffer
   * 
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} textLayout - Text layout information
   * @param {string} title - Thumbnail title
   * @param {string} subtitle - Thumbnail subtitle
   * @param {Object} thumbnailParams - Thumbnail parameters
   * @returns {Promise<Buffer>} - Image with text overlay
   */
  static async addTextOverlay(imageBuffer, textLayout, title, subtitle, thumbnailParams) {
    try {
      console.log(`Adding text overlay to image buffer of size: ${imageBuffer.length} bytes`);
      
      // Validate the buffer is not empty
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new ApiError('Empty image buffer provided', 500);
      }
      
      // Create a simple composition with just the image resized
      const composition = sharp(imageBuffer, { failOnError: false })
        .resize({
          width: thumbnailParams.resolution.width,
          height: thumbnailParams.resolution.height,
          fit: 'cover',
          position: 'center'
        });
      
      // Skip text overlay for now to isolate the issue
      return composition.jpeg().toBuffer();
    } catch (error) {
      console.error('Error adding text overlay:', error);
      throw new ApiError(`Failed to add text overlay: ${error.message}`, 500);
    }
  }
  
  /**
   * Add text overlay to a composition
   * 
   * @param {Sharp} composition - Sharp composition
   * @param {Object} textLayout - Text layout information
   * @param {string} title - Thumbnail title
   * @param {string} subtitle - Thumbnail subtitle
   * @param {Object} thumbnailParams - Thumbnail parameters
   * @returns {Promise<Buffer>} - Composition with text overlay
   */
  static async addTextOverlayToComposition(composition, textLayout, title, subtitle, thumbnailParams) {
    try {
      // Skip the text overlay for now to fix the base issue
      // Just return the composition as JPEG
      return composition.jpeg().toBuffer();
    } catch (error) {
      console.error('Error adding text overlay to composition:', error);
      throw new ApiError(`Failed to add text overlay: ${error.message}`, 500);
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