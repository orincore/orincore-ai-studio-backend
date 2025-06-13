const asyncHandler = require('express-async-handler');
const { 
  generateAndStoreImage, 
  getUserImages, 
  getImageById, 
  deleteImage,
  createImage
} = require('../services/imageService');
const { 
  MODELS, 
  RESOLUTIONS, 
  STYLES,
  GENERATION_TYPES, 
  getGenerationTypes,
  getStylePresets,
  getSuggestedStyles,
  enhancePromptForAccuracy,
  enhanceNegativePrompt
} = require('../services/stabilityAIService');
const logoService = require('../services/logoService');
const { ApiError } = require('../middlewares/errorMiddleware');
const { isUserOnFreePlan } = require('../services/planService');

/**
 * @desc    Generate a new image
 * @route   POST /api/images/generate
 * @access  Private
 */
const generateImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const imageParams = req.body;
    
    // Validate required parameters
    if (!imageParams.prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Use the new createImage function
    const result = await createImage(userId, imageParams);
    
    if (result.error) {
      // Handle specific error codes
      if (result.code === 'DAILY_LIMIT_REACHED' || result.code === 'NO_CREDITS_NO_FREE_GENERATIONS') {
        return res.status(403).json({ error: result.error, code: result.code });
      }
      return res.status(400).json({ error: result.error });
    }
    
    // Add a message about quality restrictions for free generations
    if (result.meta && result.meta.free_generations) {
      result.message = "This is a free generation with limited quality (512x512) and watermark. Purchase credits for high-quality images.";
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error in generateImage controller:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

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
  // Helper function to calculate GCD for aspect ratio
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  
  // Helper function to format aspect ratio from dimensions
  const formatAspectRatio = (width, height) => {
    const divisor = gcd(width, height);
    return `${width/divisor}:${height/divisor}`;
  };
  
  res.status(200).json({
    models: Object.entries(MODELS).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    })),
    resolutions: Object.entries(RESOLUTIONS).map(([key, value]) => ({
      id: key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      width: value.width,
      height: value.height,
      aspectRatio: formatAspectRatio(value.width, value.height)
    })),
    styles: getStylePresets(),
    generationTypes: getGenerationTypes()
  });
});

/**
 * @desc    Get style suggestions based on a prompt
 * @route   POST /api/images/suggest-styles
 * @access  Private
 */
const suggestStyles = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    throw new ApiError('Prompt is required', 400);
  }
  
  const suggestedStyles = getSuggestedStyles(prompt);
  
  // Get the full style details from getStylePresets for each suggested style
  const allStylePresets = getStylePresets();
  const styleDetails = suggestedStyles.map(styleId => {
    return allStylePresets.find(style => style.id === styleId) || null;
  }).filter(Boolean);
  
  res.status(200).json({
    suggestedStyles: styleDetails
  });
});

/**
 * @desc    Analyze a prompt and provide guidance on improving accuracy
 * @route   POST /api/images/analyze-prompt
 * @access  Private
 */
const analyzePrompt = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    throw new ApiError('Prompt is required', 400);
  }
  
  // Get potential subjects from the prompt
  const originalPrompt = prompt.trim();
  
  // Check if the prompt has specific details that help with accuracy
  const hasCompositionTerms = /composition|framing|centered|angle|perspective|view|shot|background|foreground|scene/i.test(originalPrompt);
  const hasDetailTerms = /detailed|high[ -]quality|sharp|clear|crisp|precise|fine details|intricate/i.test(originalPrompt);
  const hasLightingTerms = /lighting|light|shadow|illuminated|dark|bright|sunlight|moonlight|dramatic|ambient/i.test(originalPrompt);
  const hasColorTerms = /color|vibrant|bright|dark|pale|red|blue|green|yellow|purple|orange|black|white|colorful|monochrome|grayscale/i.test(originalPrompt);
  
  // Generate the enhanced prompt
  const enhancedPrompt = enhancePromptForAccuracy(originalPrompt, null, 'GENERAL');
  
  // Generate suggested improvements
  const suggestions = [];
  
  if (!hasCompositionTerms) {
    suggestions.push({
      category: 'Composition',
      suggestion: 'Add details about composition, framing, or perspective',
      examples: ['centered', 'close-up', 'wide angle view', 'from above', 'dramatic angle']
    });
  }
  
  if (!hasDetailTerms) {
    suggestions.push({
      category: 'Detail',
      suggestion: 'Specify the level of detail you want',
      examples: ['highly detailed', 'intricate details', 'fine details', 'photorealistic', 'crisp']
    });
  }
  
  if (!hasLightingTerms) {
    suggestions.push({
      category: 'Lighting',
      suggestion: 'Include lighting information',
      examples: ['natural lighting', 'dramatic lighting', 'golden hour', 'soft lighting', 'studio lighting']
    });
  }
  
  if (!hasColorTerms) {
    suggestions.push({
      category: 'Color',
      suggestion: 'Mention color palette or specific colors',
      examples: ['vibrant colors', 'pastel colors', 'blue tones', 'colorful', 'black and white']
    });
  }
  
  if (originalPrompt.split(' ').length < 5) {
    suggestions.push({
      category: 'Length',
      suggestion: 'Your prompt is very short. Add more details for better results',
      examples: ['Describe the subject more thoroughly', 'Add context about the environment', 'Specify style or mood']
    });
  }
  
  res.status(200).json({
    originalPrompt,
    enhancedPrompt,
    suggestions,
    styleRecommendations: getSuggestedStyles(originalPrompt)
  });
});

module.exports = {
  generateImage,
  getImages,
  getImage,
  removeImage,
  getImageOptions,
  suggestStyles,
  analyzePrompt
}; 