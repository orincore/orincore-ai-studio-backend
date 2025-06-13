const { ApiError } = require('../middlewares/errorMiddleware');
const { cloudinary } = require('../config/cloudinaryConfig');

/**
 * Service for adding watermarks to images
 */
class WatermarkService {
  /**
   * Add a watermark to an image
   * @param {string} imageUrl - The URL of the image to watermark
   * @param {Object} options - Watermark options
   * @returns {Promise<string>} - URL of the watermarked image
   */
  static addWatermark(imageUrl, options = {}) {
    try {
      const {
        text = 'ORINCORE AI STUDIO',
        fontSize = 50,
        opacity = 50,
        color = 'white',
        gravity = 'center' // Options: north_west, north, north_east, west, center, east, south_west, south, south_east
      } = options;
      
      // Create a transformation for adding text watermark
      const transformation = [
        { opacity: opacity },
        { color: color, overlay: { font_family: 'Arial', font_size: fontSize, font_weight: 'bold', text: encodeURIComponent(text) } },
        { gravity: gravity, x: 10, y: 10 }
      ];
      
      // Get the public ID from the URL
      const publicId = this.extractPublicIdFromUrl(imageUrl);
      
      if (!publicId) {
        throw new ApiError('Invalid Cloudinary URL', 400);
      }
      
      // Generate a URL for the watermarked image
      const watermarkedUrl = cloudinary.url(publicId, {
        transformation: transformation,
        secure: true
      });
      
      return watermarkedUrl;
    } catch (error) {
      console.error('Error adding watermark:', error);
      throw new ApiError(`Failed to add watermark: ${error.message}`, 500);
    }
  }
  
  /**
   * Extract public ID from Cloudinary URL
   * @param {string} url - Cloudinary URL
   * @returns {string|null} - Public ID or null if not found
   */
  static extractPublicIdFromUrl(url) {
    try {
      // Parse the URL to extract the public ID
      // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/image-id.jpg
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Remove the first empty string, "image", "upload", and version
      const relevantParts = pathParts.slice(4);
      
      // Join the remaining parts to get the public ID
      const publicId = relevantParts.join('/');
      
      // Remove file extension if present
      return publicId.replace(/\.[^/.]+$/, '');
    } catch (error) {
      console.error('Error extracting public ID from URL:', error);
      return null;
    }
  }
  
  /**
   * Resize an image to a specific width and height
   * @param {string} imageUrl - The URL of the image to resize
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {string} - URL of the resized image
   */
  static resizeImage(imageUrl, width, height) {
    try {
      // Get the public ID from the URL
      const publicId = this.extractPublicIdFromUrl(imageUrl);
      
      if (!publicId) {
        throw new ApiError('Invalid Cloudinary URL', 400);
      }
      
      // Generate a URL for the resized image
      const resizedUrl = cloudinary.url(publicId, {
        transformation: [
          { width: width, height: height, crop: 'fill' }
        ],
        secure: true
      });
      
      return resizedUrl;
    } catch (error) {
      console.error('Error resizing image:', error);
      throw new ApiError(`Failed to resize image: ${error.message}`, 500);
    }
  }
}

/**
 * Add watermark to an image using Cloudinary
 * @param {string} publicId - Cloudinary public ID of the image
 * @param {number} width - Optional width to resize the image
 * @param {number} height - Optional height to resize the image
 * @returns {string} - URL of the watermarked image
 */
const addWatermark = (publicId, width = null, height = null) => {
  try {
    // Define watermark transformation
    const watermarkTransformation = {
      overlay: {
        font_family: "Arial",
        font_size: 30,
        text: "ORINCORE AI"
      },
      gravity: "south_east",
      x: 20,
      y: 20,
      color: "#FFFFFF",
      opacity: 70
    };
    
    // Build transformation array
    const transformations = [];
    
    // Add resize transformation if width and height are provided
    if (width && height) {
      transformations.push({
        width: width,
        height: height,
        crop: 'scale'
      });
    }
    
    // Add watermark transformation
    transformations.push(watermarkTransformation);
    
    // Get URL with transformations
    const watermarkedUrl = cloudinary.url(publicId, {
      transformation: transformations,
      secure: true
    });
    
    return watermarkedUrl;
  } catch (error) {
    console.error('Error adding watermark:', error);
    return null;
  }
};

module.exports = WatermarkService;
module.exports.addWatermark = addWatermark; 