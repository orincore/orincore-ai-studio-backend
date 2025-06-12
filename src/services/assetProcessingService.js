const { ApiError } = require('../middlewares/errorMiddleware');
const { uploadImage } = require('../config/cloudinaryConfig');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

/**
 * Process and prepare user-uploaded assets for use in generations
 */
class AssetProcessingService {
  /**
   * Process a user-uploaded image for use in generation
   * @param {Buffer|Object} imageBuffer - The image buffer or Multer file object
   * @param {string} originalFilename - Original filename
   * @param {string} userId - User ID
   * @param {Object} options - Processing options
   * @param {number} options.maxWidth - Maximum width
   * @param {number} options.maxHeight - Maximum height
   * @param {boolean} options.removeBackground - Whether to remove background
   * @param {string} options.assetType - Type of asset (logo, product, etc.)
   * @returns {Promise<Object>} - Processed image data
   */
  static async processUserImage(
    imageBuffer, 
    originalFilename, 
    userId, 
    { 
      maxWidth = 1024, 
      maxHeight = 1024, 
      removeBackground = false,
      assetType = 'general'
    } = {}
  ) {
    try {
      // Handle case where input might be a multer file object
      const buffer = imageBuffer.buffer ? imageBuffer.buffer : imageBuffer;
      
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Create image processor
      let processor = sharp(buffer);
      
      // Resize if needed while maintaining aspect ratio
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        processor = processor.resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // If background removal is requested (would need additional library integration)
      if (removeBackground) {
        // This is a placeholder - actual implementation would use rembg or similar
        // processor = processor.removeBackground();
        console.log('Background removal requested but not implemented');
      }
      
      // Process the image
      const processedBuffer = await processor.toBuffer();
      
      // Generate asset ID
      const assetId = uuidv4();
      
      // Upload to Cloudinary
      const cloudinaryFolder = `orincore-ai-studio/${userId}/assets/${assetType}`;
      const fileExtension = path.extname(originalFilename).toLowerCase() || '.jpg';
      
      const cloudinaryResult = await uploadImage(
        processedBuffer,
        cloudinaryFolder,
        `${assetId}${fileExtension}`
      );
      
      // Return processed image data
      return {
        id: assetId,
        originalFilename,
        width: metadata.width,
        height: metadata.height,
        processedWidth: cloudinaryResult.width,
        processedHeight: cloudinaryResult.height,
        format: metadata.format,
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        assetType
      };
    } catch (error) {
      console.error('Error processing user image:', error);
      throw new ApiError(`Failed to process image: ${error.message}`, 500);
    }
  }
  
  /**
   * Extract dominant colors from an image
   * @param {Buffer} imageBuffer - The image buffer
   * @param {number} colorCount - Number of colors to extract
   * @returns {Promise<Array>} - Array of dominant colors in hex format
   */
  static async extractColors(imageBuffer, colorCount = 5) {
    try {
      // Placeholder for color extraction
      // In a real implementation, you would use a library like node-vibrant
      // or integrate with a color extraction API
      
      // Mock return with default colors
      return [
        '#ff5722', '#4caf50', '#2196f3', '#9c27b0', '#ffc107'
      ].slice(0, colorCount);
    } catch (error) {
      console.error('Error extracting colors:', error);
      throw new ApiError(`Failed to extract colors: ${error.message}`, 500);
    }
  }
  
  /**
   * Create a composite image from multiple assets
   * @param {Array<Object>} assets - Array of asset objects with URLs
   * @param {Object} layout - Layout configuration
   * @returns {Promise<Buffer>} - Composite image buffer
   */
  static async createComposite(assets, layout) {
    try {
      // This would be implemented with Sharp's composite function
      // Placeholder for now
      throw new ApiError('Composite creation not yet implemented', 501);
    } catch (error) {
      console.error('Error creating composite:', error);
      throw new ApiError(`Failed to create composite: ${error.message}`, 500);
    }
  }
}

module.exports = AssetProcessingService; 