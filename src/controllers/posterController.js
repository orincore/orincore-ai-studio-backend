const PosterService = require('../services/posterService');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * Controller for AI poster generation
 */
class PosterController {
  /**
   * Generate a professional poster
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async generatePoster(req, res, next) {
    try {
      const userId = req.user.id;
      
      // Extract generation parameters from request body
      const {
        title,
        slogan,
        additionalText,
        websiteUrl,
        posterType,
        stylePreference,
        colorPalette,
        aspectRatio,
        customDimensions
      } = req.body;
      
      // Validation
      if (!title) {
        throw new ApiError('Title is required', 400);
      }
      
      // Check for user uploads
      let logoAsset = null;
      let productImage = null;
      
      if (req.files) {
        if (req.files.logo) {
          logoAsset = req.files.logo[0];
        }
        
        if (req.files.productImage) {
          productImage = req.files.productImage[0];
        }
      }
      
      // Generate poster
      const result = await PosterService.generatePoster(userId, {
        title,
        slogan,
        additionalText,
        websiteUrl,
        posterType,
        stylePreference,
        colorPalette: Array.isArray(colorPalette) ? colorPalette : (colorPalette ? [colorPalette] : []),
        aspectRatio,
        customDimensions: aspectRatio === 'custom' ? customDimensions : undefined,
        logoAsset,
        productImage
      });
      
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get posters list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getPosters(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, posterType, stylePreference } = req.query;
      
      // Build filters
      const filters = {};
      if (posterType) filters.posterType = posterType;
      if (stylePreference) filters.stylePreference = stylePreference;
      
      // Get posters
      const posters = await PosterService.listPosters(
        userId,
        filters,
        parseInt(page, 10),
        parseInt(limit, 10)
      );
      
      res.status(200).json({
        success: true,
        message: 'Posters retrieved successfully',
        data: posters
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a specific poster
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getPoster(req, res, next) {
    try {
      const userId = req.user.id;
      const { posterId } = req.params;
      
      // Get poster
      const poster = await PosterService.getPoster(posterId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Poster retrieved successfully',
        data: poster
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a poster
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async deletePoster(req, res, next) {
    try {
      const userId = req.user.id;
      const { posterId } = req.params;
      
      // Delete poster
      await PosterService.deletePoster(posterId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Poster deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get poster types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getPosterTypes(req, res, next) {
    try {
      // This could be dynamically loaded from a database
      // For now, returning the hardcoded list
      const posterTypes = [
        { id: 'business', name: 'Business' },
        { id: 'event', name: 'Event' },
        { id: 'sale', name: 'Sale & Promotion' },
        { id: 'product-launch', name: 'Product Launch' },
        { id: 'webinar', name: 'Webinar & Online Event' },
        { id: 'personal-branding', name: 'Personal Branding' }
      ];
      
      res.status(200).json({
        success: true,
        message: 'Poster types retrieved successfully',
        data: posterTypes
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
        { id: 'modern', name: 'Modern' },
        { id: 'minimal', name: 'Minimal' },
        { id: 'vintage', name: 'Vintage' },
        { id: 'bold', name: 'Bold' },
        { id: 'corporate', name: 'Corporate' }
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
  
  /**
   * Get available aspect ratios
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getAspectRatios(req, res, next) {
    try {
      const aspectRatios = PosterService.getAvailableAspectRatios();
      
      res.status(200).json({
        success: true,
        message: 'Aspect ratios retrieved successfully',
        data: aspectRatios
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PosterController; 