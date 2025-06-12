const { uploadImage, deleteImage, cloudinary } = require('../config/cloudinaryConfig');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * Service for Cloudinary operations
 */
class CloudinaryService {
  /**
   * Upload a base64 image to Cloudinary
   * 
   * @param {string} base64Image - Base64 encoded image
   * @param {string} folder - Folder path in Cloudinary
   * @param {string} publicId - Public ID for the image
   * @return {Promise<Object>} Upload result from Cloudinary
   */
  static async uploadBase64Image(base64Image, folder, publicId) {
    try {
      // If the base64 string doesn't include the data URI prefix, add it
      const formattedBase64 = base64Image.startsWith('data:')
        ? base64Image
        : `data:image/png;base64,${base64Image}`;
      
      // Upload to Cloudinary
      return await uploadImage(formattedBase64, folder, publicId);
    } catch (error) {
      console.error('Error uploading base64 image to Cloudinary:', error);
      throw new ApiError(`Failed to upload image: ${error.message}`, 500);
    }
  }
  
  /**
   * Upload a buffer to Cloudinary
   * 
   * @param {Buffer} buffer - Image buffer
   * @param {string} folder - Folder path in Cloudinary
   * @param {string} publicId - Public ID for the image
   * @return {Promise<Object>} Upload result from Cloudinary
   */
  static async uploadBuffer(buffer, folder, publicId) {
    try {
      return await uploadImage(buffer, folder, publicId);
    } catch (error) {
      console.error('Error uploading buffer to Cloudinary:', error);
      throw new ApiError(`Failed to upload image: ${error.message}`, 500);
    }
  }
  
  /**
   * Delete an image from Cloudinary
   * 
   * @param {string} publicId - Public ID of the image to delete
   * @return {Promise<Object>} Deletion result
   */
  static async deleteImage(publicId) {
    try {
      return await deleteImage(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw new ApiError(`Failed to delete image: ${error.message}`, 500);
    }
  }
  
  /**
   * Generate a Cloudinary URL with transformations
   * 
   * @param {string} publicId - Public ID of the image
   * @param {Object} transformations - Transformations to apply
   * @return {string} Transformed image URL
   */
  static getTransformedUrl(publicId, transformations = {}) {
    try {
      return cloudinary.url(publicId, transformations);
    } catch (error) {
      console.error('Error generating transformed URL:', error);
      throw new ApiError(`Failed to generate transformed URL: ${error.message}`, 500);
    }
  }
}

module.exports = CloudinaryService; 