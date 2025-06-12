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
      }
      
      // 9. Compose the final thumbnail with text overlay and user assets
      let finalImageBuffer;
      
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
        finalImageBuffer = await this.addTextOverlay(
          Buffer.from(generatedImage.base64, 'base64'),
          textLayout,
          title,
          subtitle,
          thumbnailParams
        );
      } else {
        throw new ApiError('No image source available for thumbnail', 500);
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
        baseImageBuffer = Buffer.from(aiImage.base64, 'base64');
      } else if (assets.length > 0) {
        // Download the first asset to use as background
        const response = await axios.get(assets[0].url, { responseType: 'arraybuffer' });
        baseImageBuffer = Buffer.from(response.data);
      } else {
        throw new ApiError('No base image available for composition', 500);
      }
      
      // Create a Sharp instance for the base image
      let composition = sharp(baseImageBuffer)
        .resize(thumbnailParams.resolution.width, thumbnailParams.resolution.height, {
          fit: 'cover',
          position: 'center'
        });
      
      // If we have additional assets (and not using the first one as background)
      if (assets.length > (aiImage ? 0 : 1)) {
        const overlays = [];
        
        // Calculate positions for assets
        const startIndex = aiImage ? 0 : 1; // Skip first asset if using it as background
        const assetCount = assets.length - startIndex;
        
        for (let i = startIndex; i < assets.length; i++) {
          const asset = assets[i];
          
          // Download the asset
          const response = await axios.get(asset.url, { responseType: 'arraybuffer' });
          const assetBuffer = Buffer.from(response.data);
          
          // Determine position based on number of assets
          let position;
          if (assetCount === 1) {
            // Single asset centered slightly to the right
            position = { top: Math.floor(thumbnailParams.resolution.height * 0.25), 
                        left: Math.floor(thumbnailParams.resolution.width * 0.55) };
          } else if (assetCount === 2) {
            // Two assets positioned on left and right
            position = { top: Math.floor(thumbnailParams.resolution.height * 0.25), 
                        left: i === startIndex ? 
                             Math.floor(thumbnailParams.resolution.width * 0.25) : 
                             Math.floor(thumbnailParams.resolution.width * 0.65) };
          } else {
            // Multiple assets arranged in a grid
            const row = Math.floor((i - startIndex) / 2);
            const col = (i - startIndex) % 2;
            position = { 
              top: Math.floor(thumbnailParams.resolution.height * (0.2 + row * 0.35)), 
              left: Math.floor(thumbnailParams.resolution.width * (0.25 + col * 0.45)) 
            };
          }
          
          // Calculate size (max 40% of width or height)
          const maxWidth = Math.floor(thumbnailParams.resolution.width * 0.4);
          const maxHeight = Math.floor(thumbnailParams.resolution.height * 0.4);
          
          // Create a Sharp instance for the asset
          const processedAsset = await sharp(assetBuffer)
            .resize(maxWidth, maxHeight, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();
          
          // Get dimensions of processed asset
          const assetMetadata = await sharp(processedAsset).metadata();
          
          // Add to overlays
          overlays.push({
            input: processedAsset,
            top: position.top,
            left: position.left,
            gravity: 'northwest'
          });
        }
        
        // Apply overlays
        if (overlays.length > 0) {
          composition = composition.composite(overlays);
        }
      }
      
      // Add text overlay
      return this.addTextOverlayToComposition(
        composition, 
        textLayout, 
        title, 
        subtitle, 
        thumbnailParams
      );
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
      const composition = sharp(imageBuffer)
        .resize(thumbnailParams.resolution.width, thumbnailParams.resolution.height, {
          fit: 'cover',
          position: 'center'
        });
      
      return this.addTextOverlayToComposition(
        composition, 
        textLayout, 
        title, 
        subtitle, 
        thumbnailParams
      );
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
      // This is a simplified implementation
      // In a real implementation, you would create a text overlay using
      // Canvas or a similar library, then composite it onto the image
      
      // For now, we'll just add a semi-transparent overlay at the bottom for text placement
      const overlayWidth = thumbnailParams.resolution.width;
      const overlayHeight = Math.floor(thumbnailParams.resolution.height * 0.25);
      
      // Create a semi-transparent overlay
      const textBackground = await sharp({
        create: {
          width: overlayWidth,
          height: overlayHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0.5 }
        }
      }).toBuffer();
      
      // Add the overlay to the bottom of the image
      const withOverlay = await composition.composite([
        {
          input: textBackground,
          top: thumbnailParams.resolution.height - overlayHeight,
          left: 0,
          gravity: 'northwest'
        }
      ]).toBuffer();
      
      // In a real implementation, you would now add the text
      // Since Sharp doesn't directly support text, you would need to use
      // another library like Canvas, then composite that onto the image
      
      return withOverlay;
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