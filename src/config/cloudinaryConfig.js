const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload an image to Cloudinary
 * @param {string} imagePath - The path or base64 string of the image
 * @param {string} folder - The folder to upload to in Cloudinary
 * @param {string} publicId - Optional public ID for the image
 * @returns {Promise<Object>} - Cloudinary upload response
 */
const uploadImage = async (imagePath, folder = 'orincore-ai-studio', publicId = null) => {
  const options = {
    folder,
    resource_type: 'image',
    ...(publicId && { public_id: publicId }),
    overwrite: true,
    quality: 'auto',
    fetch_format: 'auto'
  };

  try {
    return await cloudinary.uploader.upload(imagePath, options);
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} - Cloudinary delete response
 */
const deleteImage = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage
}; 