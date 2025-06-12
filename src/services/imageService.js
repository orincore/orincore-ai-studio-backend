const { supabase } = require('../config/supabaseClient');
const { generateImage, RESOLUTIONS, GENERATION_TYPES } = require('./stabilityAIService');
const { uploadImage } = require('../config/cloudinaryConfig');
const { deductCredits, getCreditCost } = require('./creditService');
const { ApiError } = require('../middlewares/errorMiddleware');
const { v4: uuidv4 } = require('uuid');
const { getCloudinaryFolder } = require('../utils/imageUtils');

/**
 * Generate an image and store it in Cloudinary and Supabase
 * 
 * @param {Object} options - Generation options
 * @param {string} options.prompt - The prompt for image generation
 * @param {string} options.negativePrompt - Optional negative prompt
 * @param {string} options.generationType - Type of generation (defaults to GENERAL)
 * @param {string} options.modelId - The model ID to use
 * @param {string} options.resolution - Resolution type
 * @param {number} options.cfgScale - CFG scale
 * @param {number} options.steps - Number of steps
 * @param {string} options.style - Style preset
 * @param {string} options.userId - The user ID
 * @returns {Promise<Object>} - Generated image data
 */
const generateAndStoreImage = async ({
  prompt,
  negativePrompt = '',
  generationType = 'GENERAL',
  modelId,
  resolution,
  cfgScale = 7,
  steps = 30,
  style = null,
  userId
}) => {
  let creditCost;
  
  try {
    // Determine the actual resolution to use (either provided or default for generation type)
    const actualResolution = resolution || (GENERATION_TYPES[generationType]?.defaultResolution) || 'NORMAL';
    
    // Calculate credit cost
    creditCost = getCreditCost(generationType, actualResolution);
    
    // Deduct credits before generating the image
    await deductCredits(userId, creditCost, 'image_generation');
    
    // Generate the image using Stability AI
    const generationResult = await generateImage({
      prompt,
      negativePrompt,
      generationType,
      modelId,
      resolution,
      cfgScale,
      steps,
      style
    });
    
    // For each generated image (typically just one)
    const storedImages = await Promise.all(generationResult.images.map(async (image, index) => {
      // Generate a unique ID for this image
      const imageId = uuidv4();
      
      // Get folder path for cloudinary
      const folderPath = getCloudinaryFolder(userId, generationType);
      
      // Upload the base64 image to Cloudinary
      const cloudinaryResult = await uploadImage(
        `data:image/png;base64,${image.base64}`,
        folderPath,
        imageId
      );
      
      // Store image metadata in Supabase
      const { data: storedImage, error } = await supabase
        .from('images')
        .insert({
          id: imageId,
          user_id: userId,
          prompt: generationResult.prompt,
          original_prompt: generationResult.originalPrompt,
          negative_prompt: generationResult.negativePrompt,
          generation_type: generationResult.generationType,
          model_id: generationResult.modelId,
          resolution: generationResult.resolution,
          width: generationResult.width,
          height: generationResult.height,
          cfg_scale: generationResult.cfgScale,
          steps: generationResult.steps,
          style,
          seed: image.seed,
          finish_reason: image.finishReason,
          cloudinary_url: cloudinaryResult.secure_url,
          cloudinary_public_id: cloudinaryResult.public_id,
          credit_cost: creditCost
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error storing image metadata:', error);
        throw new ApiError(`Failed to store image metadata: ${error.message}`, 500);
      }
      
      return storedImage;
    }));
    
    return {
      images: storedImages,
      creditCost
    };
  } catch (error) {
    console.error('Error generating and storing image:', error);
    // If we fail after deducting credits, we should refund them
    if (error.message !== 'Insufficient credits' && creditCost) {
      try {
        await deductCredits(userId, -creditCost, 'refund_failed_generation');
      } catch (refundError) {
        console.error('Error refunding credits:', refundError);
      }
    }
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to generate image: ${error.message}`, 500);
  }
};

/**
 * Get a user's image history
 * 
 * @param {string} userId - The user ID
 * @param {Object} options - Options for pagination and filtering
 * @param {number} options.page - The page number (default: 1)
 * @param {number} options.limit - The number of results per page (default: 20)
 * @param {string} options.generationType - Filter by generation type (optional)
 * @returns {Promise<Object>} - User's image history
 */
const getUserImages = async (userId, { page = 1, limit = 20, generationType = null } = {}) => {
  try {
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Build the query
    let query = supabase
      .from('images')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Add generation type filter if provided
    if (generationType) {
      query = query.eq('generation_type', generationType);
    }
    
    // Add pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      throw new ApiError(`Failed to get user images: ${error.message}`, 500);
    }
    
    return {
      images: data,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user images:', error);
    throw new ApiError(`Failed to get user images: ${error.message}`, 500);
  }
};

/**
 * Get an image by ID
 * 
 * @param {string} imageId - The image ID
 * @param {string} userId - Optional user ID for permission check
 * @returns {Promise<Object>} - Image data
 */
const getImageById = async (imageId, userId = null) => {
  try {
    let query = supabase
      .from('images')
      .select('*')
      .eq('id', imageId);
    
    // If user ID is provided, ensure the image belongs to that user
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      throw new ApiError(`Failed to get image: ${error.message}`, 404);
    }
    
    return data;
  } catch (error) {
    console.error('Error getting image by ID:', error);
    throw new ApiError(`Failed to get image: ${error.message}`, error.statusCode || 500);
  }
};

/**
 * Delete an image by ID
 * 
 * @param {string} imageId - The image ID
 * @param {string} userId - The user ID (for permission check)
 * @returns {Promise<boolean>} - Success status
 */
const deleteImage = async (imageId, userId) => {
  try {
    // First, get the image to ensure it belongs to the user
    const image = await getImageById(imageId, userId);
    
    // Then delete it from Supabase
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId);
    
    if (error) {
      throw new ApiError(`Failed to delete image: ${error.message}`, 500);
    }
    
    // Optionally delete from Cloudinary as well
    // We may want to keep these for some time for recovery purposes
    // await deleteImage(image.cloudinary_public_id);
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error instanceof ApiError 
      ? error 
      : new ApiError(`Failed to delete image: ${error.message}`, 500);
  }
};

module.exports = {
  generateAndStoreImage,
  getUserImages,
  getImageById,
  deleteImage
}; 