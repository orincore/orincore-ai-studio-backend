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
      let userAssets = [];
      if (req.files && req.files.userAssets) {
        // Handle array of files
        userAssets = Array.isArray(req.files.userAssets) 
          ? req.files.userAssets 
          : [req.files.userAssets];
      }
      
      // For backward compatibility, also check for single userAsset
      if (req.files && req.files.userAsset && userAssets.length === 0) {
        userAssets = [req.files.userAsset[0]];
      }
      
      console.log(`Generating professional thumbnail with ${userAssets.length} user images and useAI=${useAI}`);
      
      // Generate thumbnail
      const result = await ThumbnailService.generateThumbnail(userId, {
        title,
        subtitle,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        contentCategory,
        stylePreference,
        colorPreferences: Array.isArray(colorPreferences) ? colorPreferences : [],
        prompt,
        userAssets,
        useAI: useAI === false ? false : true,
        composition
      });
      
      res.status(201).json(result);
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