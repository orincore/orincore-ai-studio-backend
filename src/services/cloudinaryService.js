const { cloudinary, uploadImage, deleteImage } = require('../config/cloudinaryConfig');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * Enhanced Cloudinary service with additional methods
 */
class CloudinaryService {
  /**
   * Upload a base64 image to Cloudinary
   * 
   * @param {string} base64Image - Base64 encoded image string
   * @param {string} folder - Cloudinary folder path
   * @param {string} publicId - Public ID for the image (optional)
   * @returns {Promise<Object>} - Cloudinary upload result
   */
  static async uploadBase64Image(base64Image, folder, publicId = null) {
    try {
      // Format base64 for Cloudinary if it doesn't have the data URI prefix
      const formattedBase64 = base64Image.startsWith('data:')
        ? base64Image
        : `data:image/png;base64,${base64Image}`;
      
      return await uploadImage(formattedBase64, folder, publicId);
    } catch (error) {
      console.error('Error uploading base64 image to Cloudinary:', error);
      throw new ApiError('Failed to upload image to cloud storage', 500);
    }
  }
  
  /**
   * Upload an image buffer to Cloudinary
   * 
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} folder - Cloudinary folder path
   * @param {string} publicId - Public ID for the image (optional)
   * @returns {Promise<Object>} - Cloudinary upload result
   */
  static async uploadImageBuffer(imageBuffer, folder, publicId = null) {
    try {
      // Handle case where imageBuffer is a multer file object
      const buffer = imageBuffer.buffer ? imageBuffer.buffer : imageBuffer;
      
      // Create a promise to handle the upload
      return new Promise((resolve, reject) => {
        // Set up the stream
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            ...(publicId && { public_id: publicId }),
            overwrite: true,
            quality: 'auto',
            fetch_format: 'auto'
          },
          (error, result) => {
            if (error) {
              console.error('Error in upload stream:', error);
              return reject(new ApiError('Failed to upload image buffer', 500));
            }
            return resolve(result);
          }
        );
        
        // Write the buffer to the stream
        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error('Error uploading image buffer to Cloudinary:', error);
      throw new ApiError('Failed to upload image buffer to cloud storage', 500);
    }
  }
  
  /**
   * Delete an image from Cloudinary
   * 
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} - Deletion result
   */
  static async deleteCloudinaryImage(publicId) {
    try {
      return await deleteImage(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw new ApiError('Failed to delete image from cloud storage', 500);
    }
  }
  
  /**
   * Create a text overlay image in Cloudinary
   * 
   * @param {string} text - Text to overlay
   * @param {Object} options - Text options
   * @returns {Promise<string>} - URL of the generated text image
   */
  static async createTextOverlay(text, options = {}) {
    try {
      const {
        fontSize = 60,
        fontFamily = 'Arial',
        fontWeight = 'bold',
        textColor = 'white',
        backgroundColor = 'rgba(0,0,0,0)',
        width = 800,
        padding = 20
      } = options;
      
      // Create a text overlay using Cloudinary's text effect
      const transformation = [
        { width: width, crop: 'scale' },
        { color: textColor, overlay: { font_family: fontFamily, font_size: fontSize, font_weight: fontWeight, text: encodeURIComponent(text) } },
        { background: backgroundColor, padding: padding }
      ];
      
      // Generate a URL for the text overlay
      const url = cloudinary.url('blank', { transformation });
      
      return url;
    } catch (error) {
      console.error('Error creating text overlay:', error);
      throw new ApiError('Failed to create text overlay', 500);
    }
  }
}

module.exports = CloudinaryService; 