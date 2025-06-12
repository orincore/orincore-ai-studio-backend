const asyncHandler = require('express-async-handler');
const { 
  generateAndStoreImage, 
  getUserImages, 
  getImageById, 
  deleteImage 
} = require('../services/imageService');
const { MODELS, RESOLUTIONS, GENERATION_TYPES, getGenerationTypes } = require('../services/stabilityAIService');
const { ApiError } = require('../middlewares/errorMiddleware');

/**
 * @desc    Generate a new image
 * @route   POST /api/images/generate
 * @access  Private
 */
const generateImage = asyncHandler(async (req, res) => {
  const { 
    prompt, 
    negativePrompt, 
    generationType = 'GENERAL',
    modelId, 
    resolution, 
    cfgScale, 
    steps, 
    style 
  } = req.body;
  
  // Validate prompt
  if (!prompt) {
    throw new ApiError('Prompt is required', 400);
  }
  
  // Validate generation type
  if (generationType && !GENERATION_TYPES[generationType]) {
    throw new ApiError(`Invalid generation type. Valid options are: ${Object.keys(GENERATION_TYPES).join(', ')}`, 400);
  }
  
  // Validate model ID if provided
  if (modelId) {
    const validModels = Object.values(MODELS);
    if (!validModels.includes(modelId)) {
      throw new ApiError(`Invalid model ID. Valid options are: ${validModels.join(', ')}`, 400);
    }
  }
  
  // Validate resolution if provided
  if (resolution) {
    const validResolutions = Object.keys(RESOLUTIONS);
    if (!validResolutions.includes(resolution)) {
      throw new ApiError(`Invalid resolution. Valid options are: ${validResolutions.join(', ')}`, 400);
    }
  }
  
  // Generate the image
  const result = await generateAndStoreImage({
    prompt,
    negativePrompt,
    generationType,
    modelId,
    resolution,
    cfgScale,
    steps,
    style,
    userId: req.user.id
  });
  
  res.status(201).json(result);
});

/**
 * @desc    Get user's generated images
 * @route   GET /api/images
 * @access  Private
 */
const getImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  const images = await getUserImages(req.user.id, { page, limit });
  
  res.status(200).json(images);
});

/**
 * @desc    Get image by ID
 * @route   GET /api/images/:id
 * @access  Private
 */
const getImage = asyncHandler(async (req, res) => {
  const image = await getImageById(req.params.id, req.user.id);
  
  res.status(200).json(image);
});

/**
 * @desc    Delete image by ID
 * @route   DELETE /api/images/:id
 * @access  Private
 */
const removeImage = asyncHandler(async (req, res) => {
  await deleteImage(req.params.id, req.user.id);
  
  res.status(200).json({ message: 'Image deleted successfully' });
});

/**
 * @desc    Get available models, resolutions, and generation types
 * @route   GET /api/images/options
 * @access  Private
 */
const getImageOptions = asyncHandler(async (req, res) => {
  res.status(200).json({
    models: Object.entries(MODELS).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    })),
    resolutions: Object.entries(RESOLUTIONS).map(([key, value]) => ({
      id: key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      width: value.width,
      height: value.height
    })),
    generationTypes: getGenerationTypes()
  });
});

module.exports = {
  generateImage,
  getImages,
  getImage,
  removeImage,
  getImageOptions
}; 