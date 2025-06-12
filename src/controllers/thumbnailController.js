const ThumbnailService = require('../services/thumbnailService');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * Controller for YouTube thumbnail generation
 */
class ThumbnailController {
  /**
   * Generate a YouTube thumbnail
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async generateThumbnail(req, res, next) {
    try {
      const userId = req.user.id;
      
      // Log the incoming request structure
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Request files structure:', req.files ? JSON.stringify(Object.keys(req.files)) : 'no files');
      console.log('Content-Type:', req.get('Content-Type'));
      
      // Extract generation parameters from request body
      const {
        title,
        subtitle,
        tags,
        contentCategory,
        stylePreference,
        colorPreferences,
        prompt,
        useAI = true,
        composition = {}
      } = req.body;
      
      // Validation
      if (!title) {
        throw new ApiError('Title is required', 400);
      }
      
      // Check for user assets (multiple image uploads)
      let userImages = [];
      
      try {
        if (req.files) {
          console.log('File upload fields found:', Object.keys(req.files));
          
          // Check for the new userImages field
          if (req.files.userImages) {
            console.log('userImages field found with:', 
              Array.isArray(req.files.userImages) ? 
              `${req.files.userImages.length} files` : 
              'single file');
              
            userImages = Array.isArray(req.files.userImages) 
              ? req.files.userImages 
              : [req.files.userImages];
          }
          
          // For backward compatibility, also check for userAssets
          if (req.files.userAssets && userImages.length === 0) {
            console.log('userAssets field found with:', 
              Array.isArray(req.files.userAssets) ? 
              `${req.files.userAssets.length} files` : 
              'single file');
            
            userImages = Array.isArray(req.files.userAssets) 
              ? req.files.userAssets 
              : [req.files.userAssets];
          }
          
          // For backward compatibility, also check for single userAsset
          if (req.files.userAsset && userImages.length === 0) {
            console.log('userAsset field found with:', 
              Array.isArray(req.files.userAsset) ? 
              `${req.files.userAsset.length} files` : 
              'single file');
              
            userImages = Array.isArray(req.files.userAsset) 
              ? req.files.userAsset 
              : [req.files.userAsset];
          }
        } else if (req.file) {
          // Handle single file upload
          console.log('Single file upload found:', req.file.originalname);
          userImages = [req.file];
        } else {
          console.log('No files found in request');
        }
      } catch (error) {
        console.error('Error processing file uploads:', error);
        // Continue without user assets if there's an error
      }
      
      console.log(`Generating professional thumbnail with ${userImages.length} user images and useAI=${useAI}`);
      
      if (userImages.length > 0) {
        console.log(`First image details: name=${userImages[0].originalname}, type=${userImages[0].mimetype}, size=${userImages[0].size} bytes`);
      }
      
      // Create a new instance of ThumbnailService
      const thumbnailService = new ThumbnailService();
      
      // Initialize service dependencies
      const StabilityAIServiceModule = require('../services/stabilityAIService');
      thumbnailService.stabilityAIService = new StabilityAIServiceModule.StabilityAIService();
      thumbnailService.cloudinaryService = require('../services/cloudinaryService');
      
      // Prepare options for the thumbnail generation
      const options = {
        title,
        subtitle,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        category: contentCategory,
        stylePreference,
        colors: Array.isArray(colorPreferences) ? colorPreferences : [],
        prompt,
        userImages,
        useAI: useAI === false ? false : true,
        composition
      };
      
      // Generate thumbnail
      const result = await thumbnailService.generateThumbnail(options);
      
      res.status(201).json({
        success: true,
        message: 'YouTube thumbnail generated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get thumbnails list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getThumbnails(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, contentCategory, stylePreference } = req.query;
      
      // Build filters
      const filters = {};
      if (contentCategory) filters.contentCategory = contentCategory;
      if (stylePreference) filters.stylePreference = stylePreference;
      
      // Get thumbnails
      const thumbnails = await ThumbnailService.listThumbnails(
        userId,
        filters,
        parseInt(page, 10),
        parseInt(limit, 10)
      );
      
      res.status(200).json({
        success: true,
        message: 'Thumbnails retrieved successfully',
        data: thumbnails
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a specific thumbnail
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getThumbnail(req, res, next) {
    try {
      const userId = req.user.id;
      const { thumbnailId } = req.params;
      
      // Get thumbnail
      const thumbnail = await ThumbnailService.getThumbnail(thumbnailId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Thumbnail retrieved successfully',
        data: thumbnail
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a thumbnail
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deleteThumbnail(req, res, next) {
    try {
      const userId = req.user.id;
      const { thumbnailId } = req.params;
      
      // Delete thumbnail
      await ThumbnailService.deleteThumbnail(thumbnailId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Thumbnail deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get content categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getContentCategories(req, res, next) {
    try {
      // This could be dynamically loaded from a database
      // For now, returning the hardcoded list
      const categories = [
        { id: 'gaming', name: 'Gaming' },
        { id: 'vlog', name: 'Vlog & Lifestyle' },
        { id: 'education', name: 'Education' },
        { id: 'tech', name: 'Technology & Reviews' },
        { id: 'beauty', name: 'Beauty & Fashion' },
        { id: 'fitness', name: 'Fitness & Health' },
        { id: 'food', name: 'Food & Cooking' },
        { id: 'diy', name: 'DIY & Crafts' },
        { id: 'music', name: 'Music & Entertainment' },
        { id: 'business', name: 'Business & Finance' }
      ];
      
      res.status(200).json({
        success: true,
        message: 'Content categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get style preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getStylePreferences(req, res, next) {
    try {
      // This could be dynamically loaded from a database
      // For now, returning the hardcoded list
      const styles = [
        { id: 'bold', name: 'Bold & Impactful' },
        { id: 'minimal', name: 'Minimal & Clean' },
        { id: 'neon', name: 'Neon & Vibrant' },
        { id: 'clean', name: 'Clean & Professional' },
        { id: 'vibrant', name: 'Vibrant & Colorful' }
      ];
      
      res.status(200).json({
        success: true,
        message: 'Style preferences retrieved successfully',
        data: styles
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ThumbnailController; 