const { supabase } = require('../config/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const { getCloudinaryFolder } = require('../utils/imageUtils');
const { checkDailyImageLimit, isUserOnFreePlan, checkFreeDailyGenerations, FREE_DAILY_GENERATIONS } = require('./planService');
const WatermarkService = require('./watermarkService');
const { getUserCredits, deductCredits } = require('./creditService');
const { addWatermark } = require('./watermarkService');
const { cloudinary, uploadImage } = require('../config/cloudinaryConfig');
const { generateImage } = require('./stabilityAIService');
const { RESOLUTIONS, GENERATION_TYPES } = require('./stabilityAIService');
const { ApiError } = require('../middlewares/errorMiddleware');

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
 * @param {number} options.numberOfImages - Number of images to generate
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
  numberOfImages = 1,
  userId
}) => {
  let creditCost;
  
  try {
    // Check if user has reached their daily image generation limit
    const limitCheck = await checkDailyImageLimit(userId);
    if (limitCheck.hasReachedLimit) {
      throw new ApiError(`Daily image generation limit reached (${limitCheck.count}/${limitCheck.limit}). Please try again tomorrow or upgrade your plan.`, 429);
    }
    
    // Check if user is on a free plan
    const isFreePlan = await isUserOnFreePlan(userId);
    
    // Determine the actual resolution to use based on user's plan
    let actualResolution = resolution || (GENERATION_TYPES[generationType]?.defaultResolution) || 'NORMAL';
    
    // For free users, enforce NORMAL resolution (512x512)
    if (isFreePlan) {
      console.log(`User ${userId} is on free plan, enforcing NORMAL resolution (512x512)`);
      actualResolution = 'NORMAL';
    } else if (!resolution && generationType) {
      // For paid users, use HD resolution by default if not specified
      console.log(`User ${userId} is on paid plan, using HD resolution if not specified`);
      actualResolution = (GENERATION_TYPES[generationType]?.defaultResolution) || 'HD';
    }
    
    // Log the resolution being used
    console.log(`Using resolution ${actualResolution} for generation type ${generationType}`);
    
    // Log prompt to debug
    console.log(`Original prompt received: "${prompt}"`);
    
    // Validate prompt - ensure it's not null or empty
    if (!prompt || prompt.trim() === '') {
      throw new ApiError('Prompt is required for image generation', 400);
    }
    
    // Calculate credit cost (base cost per image)
    const baseCreditCost = await getCreditCost(generationType, actualResolution, userId);
    
    // Total cost is base cost multiplied by number of images
    // For free generations, keep the cost at 0
    creditCost = baseCreditCost === 0 ? 0 : baseCreditCost * numberOfImages;
    
    // Deduct credits before generating the image
    await deductCredits(userId, creditCost, 'image_generation');
    
    // Generate the image using Stability AI
    const generationResult = await generateImage({
      prompt,
      negativePrompt,
      generationType,
      modelId,
      resolution: actualResolution, // Use the resolved resolution to ensure consistency
      cfgScale,
      steps,
      // If style contains multiple comma-separated values, use the first valid one
      style: style ? style.split(',')[0].trim() : null,
      numberOfImages
    });
    
    // For each generated image
    const storedImages = await Promise.all(generationResult.images.map(async (image) => {
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
      
      // Process image based on user's plan
      let processedImageUrl = cloudinaryResult.secure_url;
      let processedWidth = cloudinaryResult.width;
      let processedHeight = cloudinaryResult.height;
      
      // For free users, add watermark and enforce 512x512 resolution
      if (isFreePlan) {
        console.log(`Adding watermark and enforcing 512x512 resolution for free user ${userId}`);
        
        // Resize to 512x512
        processedImageUrl = WatermarkService.resizeImage(processedImageUrl, 512, 512);
        processedWidth = 512;
        processedHeight = 512;
        
        // Add watermark
        processedImageUrl = WatermarkService.addWatermark(processedImageUrl, {
          text: 'ORINCORE AI STUDIO',
          fontSize: 30,
          opacity: 70,
          color: 'white',
          gravity: 'center'
        });
      }
      
      // Extract parameters from the generation result
      const params = generationResult.parameters || {};
      
      // Store image metadata in Supabase
      const { data: storedImage, error } = await supabase
        .from('images')
        .insert({
          id: imageId,
          user_id: userId,
          prompt: params.prompt || prompt, // Use the enhanced prompt or fall back to original
          original_prompt: prompt, // Always store the original prompt
          negative_prompt: params.negativePrompt || negativePrompt,
          generation_type: generationType,
          model_id: params.model || modelId,
          resolution: actualResolution,
          width: processedWidth || params.width || RESOLUTIONS[actualResolution].width,
          height: processedHeight || params.height || RESOLUTIONS[actualResolution].height,
          cfg_scale: params.cfgScale || cfgScale,
          steps: params.steps || steps,
          style: params.style || style,
          seed: image.seed,
          finish_reason: image.finishReason,
          cloudinary_url: processedImageUrl, // Use processed URL with watermark for free users
          cloudinary_original_url: cloudinaryResult.secure_url, // Always store the original URL
          cloudinary_public_id: cloudinaryResult.public_id,
          credit_cost: baseCreditCost, // Credit cost per image
          has_watermark: isFreePlan, // Flag if image has watermark
          is_free_user: isFreePlan, // Flag if generated by free user
          is_free_generation: isFreePlan && generationType === 'text-to-image'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error storing image metadata:', error);
        throw new ApiError(`Failed to store image metadata: ${error.message}`, 500);
      }
      
      return storedImage;
    }));
    
    // Return the first image or all images based on the request
    return numberOfImages === 1 ? storedImages[0] : storedImages;
    
  } catch (error) {
    console.error('Error generating image:', error);
    
    // If credits were deducted but generation failed, refund the credits
    if (creditCost > 0) {
      try {
        // Import the addCredits function
        const { addCredits } = require('./creditService');
        
        // Refund credits to the user
        await addCredits(userId, creditCost, 'refund_failed_generation', 'generation_failed');
        console.log(`Refunded ${creditCost} credits to user ${userId} due to failed generation`);
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError);
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
      .select(`
        *,
        has_watermark,
        is_free_user,
        cloudinary_url,
        cloudinary_original_url
      `, { count: 'exact' })
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
    
    // Check if user is on a free plan
    const isFreePlan = await isUserOnFreePlan(userId);
    
    // Add plan information to the response
    const images = data.map(image => ({
      ...image,
      // For free users viewing their own images, include information about upgrading
      can_upgrade: isFreePlan && image.has_watermark
    }));
    
    return {
      images,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      },
      user_plan: {
        is_free_user: isFreePlan,
        can_upgrade: isFreePlan
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

/**
 * Calculate credit cost for image generation based on parameters
 * @param {object} imageParams - Parameters for image generation
 * @returns {number} - Credit cost
 */
const calculateCreditCost = (imageParams) => {
  // Base cost for standard image generation
  let cost = 1;
  
  // Additional cost for larger resolutions
  if (imageParams.width && imageParams.height) {
    const area = imageParams.width * imageParams.height;
    if (area > 1024 * 1024) {
      // Higher resolution images cost more
      cost += 1;
    }
  }
  
  // Additional cost for more steps
  if (imageParams.steps && imageParams.steps > 30) {
    cost += 1;
  }
  
  return cost;
};

/**
 * Generate an image based on user prompt
 * @param {string} userId - The user ID
 * @param {object} imageParams - Parameters for image generation
 * @returns {Promise<object>} - Generated image data or error
 */
const createImage = async (userId, imageParams) => {
  try {
    // Check if user has credits
    const credits = await getUserCredits(userId);
    const hasCredits = credits > 0;
    
    // Check if user is on free plan
    const isFreePlan = await isUserOnFreePlan(userId);
    
    // Calculate credit cost based on parameters
    const creditCost = calculateCreditCost(imageParams);
    
    // Check if user has reached daily limit (for paid plans)
    if (!isFreePlan) {
      const { hasReachedLimit, used, limit } = await checkDailyImageLimit(userId);
      if (hasReachedLimit) {
        return {
          error: `You've reached your daily limit of ${limit} images. Your plan allows ${limit} images per day.`,
          code: 'DAILY_LIMIT_REACHED'
        };
      }
    }
    
    // Determine if this should be a free generation
    let isFreeGeneration = false;
    let useCredits = true;
    
    // If user has no credits, check if they have free daily generations
    if (!hasCredits) {
      const { hasRemaining, used, limit } = await checkFreeDailyGenerations(userId);
      if (hasRemaining) {
        isFreeGeneration = true;
        useCredits = false;
      } else {
        return {
          error: `You've used all ${limit} of your free daily generations and have no credits. Please purchase credits to continue.`,
          code: 'NO_CREDITS_NO_FREE_GENERATIONS'
        };
      }
    }
    
    // Set parameters based on user status - always request 1024x1024 from the API
    let finalParams = { 
      ...imageParams,
      width: 1024,
      height: 1024
    };
    
    // Determine if we should watermark and resize the result
    let shouldWatermark = false;
    let shouldResize = false;
    let finalWidth = 1024;
    let finalHeight = 1024;
    
    // Apply restrictions based on plan and credits
    if (isFreePlan && !isFreeGeneration && hasCredits) {
      // Free plan users using credits get HD images without watermark
      shouldWatermark = false;
      shouldResize = false;
    } else if (isFreePlan && isFreeGeneration) {
      // Free plan users using free generations get low quality images with watermark (5 per day)
      shouldWatermark = true;
      shouldResize = true;
      finalWidth = 512;
      finalHeight = 512;
    } else {
      // Paid plan users get full resolution without watermark
      shouldWatermark = false;
      shouldResize = false;
    }
    
    // Generate the image at 1024x1024
    const generatedImage = await generateImage(finalParams);
    
    if (generatedImage.error) {
      console.error('Error from Stability AI:', generatedImage.error);
      return { error: generatedImage.error };
    }
    
    // Upload to Cloudinary
    let imageUrl = generatedImage.imageUrl;
    let cloudinaryPublicId = null;
    let cloudinaryOriginalUrl = null;
    
    if (imageUrl) {
      try {
        // Upload the original image to Cloudinary
        const uploadResult = await uploadImage(imageUrl, 'ai-generated');
        
        if (!uploadResult || !uploadResult.secure_url) {
          console.error('Invalid Cloudinary upload result:', uploadResult);
          return { error: 'Error uploading image to Cloudinary' };
        }
        
        cloudinaryPublicId = uploadResult.public_id;
        cloudinaryOriginalUrl = uploadResult.secure_url;
        imageUrl = cloudinaryOriginalUrl; // Set default URL
        
        // Apply transformations (resize and/or watermark)
        if (shouldResize && shouldWatermark) {
          // Resize and add watermark
          const watermarkedUrl = addWatermark(cloudinaryPublicId, finalWidth, finalHeight);
          if (watermarkedUrl) {
            imageUrl = watermarkedUrl;
          }
        } else if (shouldResize) {
          // Only resize
          imageUrl = cloudinary.url(cloudinaryPublicId, {
            width: finalWidth,
            height: finalHeight,
            crop: 'scale'
          });
        } else if (shouldWatermark) {
          // Only add watermark
          const watermarkedUrl = addWatermark(cloudinaryPublicId);
          if (watermarkedUrl) {
            imageUrl = watermarkedUrl;
          }
        }
        
        // Ensure we have a valid URL
        if (!imageUrl) {
          imageUrl = cloudinaryOriginalUrl;
        }
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return { error: 'Error processing image' };
      }
    } else {
      return { error: 'No image URL received from generation API' };
    }
    
    // Deduct credits if needed
    if (useCredits) {
      await deductCredits(userId, creditCost, 'image_generation');
    }
    
    // Save the image record
    const { data: savedImage, error: saveError } = await supabase
      .from('images')
      .insert({
        id: uuidv4(),
        user_id: userId,
        prompt: imageParams.prompt,
        original_prompt: imageParams.prompt,
        negative_prompt: imageParams.negative_prompt || null,
        generation_type: 'text-to-image',
        model_id: imageParams.model_id || 'stable-diffusion-v1-6',
        resolution: `${finalWidth}x${finalHeight}`,
        width: finalWidth,
        height: finalHeight,
        cfg_scale: imageParams.cfg_scale || 7,
        steps: imageParams.steps || 30,
        style: imageParams.style || null,
        seed: generatedImage.seed || null,
        finish_reason: generatedImage.finish_reason || null,
        cloudinary_url: imageUrl,
        cloudinary_original_url: cloudinaryOriginalUrl,
        cloudinary_public_id: cloudinaryPublicId,
        credit_cost: useCredits ? creditCost : 0,
        has_watermark: shouldWatermark,
        is_free_user: isFreePlan,
        is_free_generation: isFreeGeneration
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('Error saving image:', saveError);
      return { error: 'Error saving image' };
    }
    
    // Get updated credit balance
    const updatedCredits = await getUserCredits(userId);
    
    // Return the image data with additional context
    return { 
      image: savedImage,
      meta: {
        credits_remaining: updatedCredits,
        free_generations: isFreeGeneration ? {
          used: (await checkFreeDailyGenerations(userId)).used,
          limit: FREE_DAILY_GENERATIONS
        } : null,
        quality_info: isFreeGeneration ? 
          "This is a free generation with limited quality (512x512) and watermark. Purchase credits for high-quality images." : 
          "High-quality image generated using credits or as part of your plan."
      }
    };
  } catch (error) {
    console.error('Error in createImage:', error);
    return { error: 'Failed to generate image' };
  }
};

module.exports = {
  generateAndStoreImage,
  getUserImages,
  getImageById,
  deleteImage,
  createImage
}; 