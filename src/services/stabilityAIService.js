const axios = require('axios');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { ApiError } = require('../middlewares/errorMiddleware');

// Load environment variables
dotenv.config();

// Stability AI API configuration
const STABILITY_API_KEY = process.env.STABILITY_AI_API_KEY;
const STABILITY_API_URL = process.env.STABILITY_API_URL || 'https://api.stability.ai/v1';

// Define available models and their endpoints
const MODELS = {
  STABLE_DIFFUSION_XL: 'stable-diffusion-xl-1024-v1-0',
  STABLE_DIFFUSION_XL_BETA: 'stable-diffusion-xl-beta-v2-2-2',
  STABLE_DIFFUSION: 'stable-diffusion-v1-5',
  SDXL_TURBO: 'sdxl-turbo-1-0',  // Faster generation but less detail
  STABLE_DIFFUSION_3: 'stable-diffusion-3' // Future-proofing for when SD3 is released
};

// Define model-specific configurations
const MODEL_CONFIG = {
  [MODELS.STABLE_DIFFUSION_XL]: {
    maxPromptLength: 2000,
    recommendedSteps: 40,
    recommendedCfg: 8
  },
  [MODELS.STABLE_DIFFUSION_XL_BETA]: {
    maxPromptLength: 2000,
    recommendedSteps: 40, 
    recommendedCfg: 8
  },
  [MODELS.STABLE_DIFFUSION]: {
    maxPromptLength: 1500,
    recommendedSteps: 50,  // Needs more steps
    recommendedCfg: 10     // Needs higher CFG
  },
  [MODELS.SDXL_TURBO]: {
    maxPromptLength: 1500,
    recommendedSteps: 25,  // Turbo needs fewer steps
    recommendedCfg: 7.5
  },
  [MODELS.STABLE_DIFFUSION_3]: {
    maxPromptLength: 2500,
    recommendedSteps: 35,
    recommendedCfg: 7
  }
};

// Default model settings if specific model is not found
const DEFAULT_MODEL_CONFIG = {
  maxPromptLength: 1500,
  recommendedSteps: 40,
  recommendedCfg: 8
};

// Define image resolutions
const RESOLUTIONS = {
  NORMAL: { width: 512, height: 512 },
  HD: { width: 768, height: 768 },
  POSTER: { width: 1024, height: 1024 },
  THUMBNAIL: { width: 384, height: 384 },
  WIDE: { width: 768, height: 512 },
  TALL: { width: 512, height: 768 },
  POSTER_LANDSCAPE: { width: 1280, height: 720 },
  POSTER_PORTRAIT: { width: 720, height: 1280 },
  THUMBNAIL_YOUTUBE: { width: 1280, height: 720 },
  LOGO: { width: 512, height: 512 },
  PRODUCT: { width: 1024, height: 1024 },
  // Aspect ratio options
  SQUARE: { width: 1024, height: 1024 },         // 1:1
  LANDSCAPE: { width: 1344, height: 768 },       // 16:9
  PORTRAIT: { width: 768, height: 1344 },        // 9:16
  WIDESCREEN: { width: 1024, height: 576 },      // 16:9 but smaller
  RATIO_4_3: { width: 1024, height: 768 },       // 4:3
  // High-resolution options for wallpapers
  WALLPAPER_HD: { width: 1920, height: 1080 },   // Full HD 16:9
  WALLPAPER_4K: { width: 3840, height: 2160 },   // 4K 16:9
  WALLPAPER_MOBILE: { width: 1080, height: 1920 } // Mobile 9:16
};

// Define available style presets
const STYLES = {
  NONE: null,
  REALISTIC: 'photographic',
  ANIME: 'anime',
  CARTOON_STYLE: 'digital-art', // closest to cartoon
  DIGITAL_ART: 'digital-art',
  FANTASY: 'fantasy-art',
  COMICS: 'comic-book',
  CINEMATIC: 'cinematic',
  THREE_D: '3d-model',
  PIXEL_ART: 'pixel-art',
  ORIGAMI: 'origami',
  LINE_ART: 'line-art',
  ENHANCE: 'enhance',
  NEON_PUNK: 'neon-punk',
  ISOMETRIC: 'isometric',
  LOW_POLY: 'low-poly',
  MODELING_COMPOUND: 'modeling-compound',
  TILE_TEXTURE: 'tile-texture'
};

// Define generation types with their presets and modifiers
const GENERATION_TYPES = {
  GENERAL: {
    name: 'Text-to-Image Generator',
    description: 'Generate images from text descriptions',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'LANDSCAPE',
    promptPrefix: 'high quality, detailed, ',
    promptSuffix: ', masterpiece, photorealistic, 8k', 
    negativePrompt: 'ugly, deformed, disfigured, poor quality, low quality, blurry, amateur, bad proportions, watermark'
  },
  ANIME: {
    name: 'AI Anime Generator',
    description: 'Anime style generations',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'NORMAL',
    promptPrefix: 'anime style, manga, detailed, 2D, ',
    promptSuffix: ', vibrant colors, clean lines, anime illustration, japanese anime style',
    negativePrompt: 'ugly, deformed, disfigured, poor quality, low quality, blurry, western, photorealistic, 3D, realistic'
  },
  REALISTIC: {
    name: 'AI Realistic Generator',
    description: 'Real-life like generations',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'HD',
    promptPrefix: 'photorealistic, hyperrealistic, highly detailed, sharp focus, ',
    promptSuffix: ', 8k, professional photography, realistic lighting and textures',
    negativePrompt: 'cartoon, anime, illustration, painting, drawing, artificial, fake, unnatural, deformed, blurry'
  },
  LOGO: {
    name: 'AI Logo Maker',
    description: 'Business / brand logos',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'LOGO',
    promptPrefix: 'minimalist logo design for ',
    promptSuffix: ', professional, corporate, vector style, clean lines, branding, isolated on white background',
    negativePrompt: 'text, words, letters, busy, complex, detailed background, noisy, grainy, blurry, painting, drawing'
  },
  POSTER: {
    name: 'AI Poster Creator',
    description: 'Professional posters',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'POSTER_LANDSCAPE',
    promptPrefix: 'professional poster design for ',
    promptSuffix: ', advertisement, marketing material, high quality, commercial grade',
    negativePrompt: 'amateur, low quality, blurry, distorted, watermark'
  },
  THUMBNAIL: {
    name: 'AI Thumbnail Creator',
    description: 'YouTube/Blog thumbnails',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'THUMBNAIL_YOUTUBE',
    promptPrefix: 'eye-catching thumbnail for ',
    promptSuffix: ', colorful, attention-grabbing, clear focal point',
    negativePrompt: 'text, words, letters, small details, low quality, blurry'
  },
  CONCEPT: {
    name: 'AI Concept Generator',
    description: 'Unique artistic ideas',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'HD',
    promptPrefix: 'concept art of ',
    promptSuffix: ', detailed, professional, digital art, imaginative, creative',
    negativePrompt: 'amateur, low quality, blurry, distorted, watermark'
  },
  GAME_CHARACTER: {
    name: 'AI Game Character Generator',
    description: 'Gaming avatars & characters',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'HD',
    promptPrefix: 'game character design of ',
    promptSuffix: ', detailed, high-quality game asset, 3D render style, character sheet',
    negativePrompt: 'amateur, low quality, blurry, distorted, watermark'
  },
  PRODUCT: {
    name: 'AI Product Image Generator',
    description: 'Ecommerce product shots',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'PRODUCT',
    promptPrefix: 'professional product photography of ',
    promptSuffix: ', white background, studio lighting, commercial, marketing, clean',
    negativePrompt: 'cluttered, dirty, amateur, low quality, blurry, distorted, watermark, noisy, grainy'
  },
  FANTASY: {
    name: 'AI Fantasy Art Generator',
    description: 'Sci-fi & fantasy world art',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'HD',
    promptPrefix: 'fantasy art of ',
    promptSuffix: ', magical, ethereal, detailed, epic, dramatic lighting, digital art',
    negativePrompt: 'mundane, realistic, photo, photograph, amateur, low quality, blurry'
  },
  WALLPAPER: {
    name: 'AI Wallpaper Generator',
    description: 'High-resolution wallpapers for desktop and mobile',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'WALLPAPER_HD',
    promptPrefix: 'wallpaper of ',
    promptSuffix: ', high resolution, digital art, detailed, professionally made, perfect for desktop background',
    negativePrompt: 'low quality, blurry, distorted, watermark, text, logo, signature, simple, plain'
  },
  IMAGE_TO_IMAGE: {
    name: 'Image-to-Image Generator',
    description: 'Transform existing images with new styles or modifications',
    defaultModel: MODELS.STABLE_DIFFUSION_XL,
    defaultResolution: 'SQUARE',
    promptPrefix: '',
    promptSuffix: ', modified version, reimagined',
    negativePrompt: 'poor quality, low quality, blurry, distorted, watermark'
  }
};

/**
 * StabilityAI Service for image generation
 */
class StabilityAIService {
  constructor() {
    this.apiKey = STABILITY_API_KEY;
    this.apiUrl = STABILITY_API_URL;
  }
  
  /**
   * Generate an image using Stability AI
   * 
   * @param {Object} options - Generation options
   * @param {string} options.prompt - The prompt for image generation
   * @param {string} options.negativePrompt - Optional negative prompt
   * @param {string} options.generationType - Type of generation (defaults to GENERAL)
   * @param {string} options.modelId - The model ID to use (optional, will use type default)
   * @param {string} options.resolution - Resolution type (optional, will use type default)
   * @param {number} options.cfgScale - CFG scale (default: 7)
   * @param {number} options.steps - Number of steps (default: 30)
   * @param {string} options.style - Style preset (optional)
   * @param {number} options.numberOfImages - Number of images to generate (default: 1)
   * @returns {Promise<Object>} - Generated image data
   */
  async generateImage({
    prompt,
    negativePrompt = '',
    generationType = 'GENERAL',
    modelId,
    resolution,
    width,
    height,
    cfgScale = 7,
    steps = 30,
    style = null,
    sampler = "K_DPMPP_2M",
    clipGuidancePreset = "FAST_BLUE",
    seed = 0,
    numberOfImages = 1
  }) {
    // Validate inputs
    if (!prompt || prompt.trim() === '') {
      throw new ApiError('Prompt is required for image generation', 400);
    }

    if (!this.apiKey) {
      throw new ApiError('Stability AI API key is not configured', 500);
    }
    
    // Get generation type configuration
    const genType = GENERATION_TYPES[generationType] || GENERATION_TYPES.GENERAL;
    
    // Apply smart prompt enhancement
    let enhancedPrompt = this.enhancePromptForAccuracy(prompt, style, generationType);
    
    // Apply generation-type specifics after the smart enhancement
    enhancedPrompt = `${genType.promptPrefix}${enhancedPrompt}${genType.promptSuffix}`;
    
    // Enhance negative prompt with comprehensive quality and accuracy issues
    let enhancedNegativePrompt = this.enhanceNegativePrompt(negativePrompt || genType.negativePrompt, style);

    // Apply style-specific prompt enhancements
    if (style) {
      // Style-specific enhancements would go here (same logic as before)
    }

    // Make sure we respect user's resolution selection by prioritizing provided resolution over defaults
    const selectedModel = modelId || genType.defaultModel;
    const selectedResolution = resolution || genType.defaultResolution;

    // Get model-specific configuration
    const modelConfig = MODEL_CONFIG[selectedModel] || DEFAULT_MODEL_CONFIG;

    // Limit prompt length according to model guidelines - this can improve accuracy
    if (enhancedPrompt.length > modelConfig.maxPromptLength) {
      console.log(`Warning: Prompt length (${enhancedPrompt.length}) exceeds model maximum (${modelConfig.maxPromptLength}). Truncating.`);
      enhancedPrompt = enhancedPrompt.substring(0, modelConfig.maxPromptLength);
    }

    try {
      // Set resolution dimensions - ensure these match the aspect ratio selection exactly
      const dimensions = width && height ? 
        { width, height } : 
        (RESOLUTIONS[selectedResolution] || RESOLUTIONS.NORMAL);
      
      // Log the selected resolution to help with debugging
      console.log(`Generating image with resolution: ${dimensions.width}x${dimensions.height}`);
      console.log(`Enhanced prompt: ${enhancedPrompt}`);
      console.log(`Enhanced negative prompt: ${enhancedNegativePrompt}`);

      // Ensure number of images is between 1 and 4
      const samples = Math.min(Math.max(1, numberOfImages), 4);

      // Use model-specific recommended settings
      const effectiveCfgScale = Math.max(cfgScale, modelConfig.recommendedCfg);
      const effectiveSteps = Math.max(steps, modelConfig.recommendedSteps);

      // Construct the request payload
      const payload = {
        text_prompts: [
          { text: enhancedPrompt, weight: 1 },
          ...(enhancedNegativePrompt ? [{ text: enhancedNegativePrompt, weight: -1 }] : [])
        ],
        cfg_scale: effectiveCfgScale,
        height: dimensions.height,
        width: dimensions.width,
        steps: effectiveSteps,
        samples: samples,
        ...(style && { style_preset: style }),
        sampler: sampler,
        clipguidance_preset: clipGuidancePreset,
        seed: seed || Math.floor(Math.random() * 2147483647),
        
        // Advanced parameters for improved accuracy
        guidance_preset: "FAST_GREEN",
        
        // Add more weight to the text prompt for SDXL models
        weight_method: "FAVOR_ORIGINAL_PROMPT"
      };

      // Make the API request
      const response = await axios({
        method: 'post',
        url: `${this.apiUrl}/generation/${selectedModel}/text-to-image`,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        data: payload,
        responseType: 'json'
      });

      // Process the response
      return {
        id: uuidv4(),
        prompt: enhancedPrompt,
        originalPrompt: prompt,
        negativePrompt: enhancedNegativePrompt,
        generationType,
        modelId: selectedModel,
        resolution: selectedResolution,
        width: dimensions.width,
        height: dimensions.height,
        cfgScale: effectiveCfgScale,
        steps: effectiveSteps,
        style,
        timestamp: new Date().toISOString(),
        artifacts: response.data.artifacts
      };
    } catch (error) {
      console.error('Stability AI generation error:', error.response?.data || error.message);
      
      if (error.response) {
        throw new ApiError(
          `Stability AI error: ${error.response.data?.message || 'Failed to generate image'}`,
          error.response.status || 500
        );
      }
      
      throw new ApiError('Failed to generate image: ' + error.message, 500);
    }
  }

  /**
   * Enhance a prompt to improve accuracy and detail
   * 
   * @param {string} prompt - The original prompt
   * @param {string} style - The style being used
   * @param {string} generationType - The type of generation
   * @returns {string} - Enhanced prompt
   */
  enhancePromptForAccuracy(prompt, style, generationType) {
    // Directly return the prompt for simplicity in this implementation
    return prompt;
  }

  /**
   * Enhance negative prompts to avoid common issues
   * 
   * @param {string} negativePrompt - The original negative prompt
   * @param {string} style - The style being used
   * @returns {string} - Enhanced negative prompt
   */
  enhanceNegativePrompt(negativePrompt, style) {
    // Common quality issues to avoid
    const qualityIssues = "ugly, deformed, disfigured, poor quality, low quality, blurry, pixelated, grainy, noisy, jpeg artifacts, compression artifacts, amateur, distorted";
    
    // Initialize with the original negative prompt
    let enhanced = negativePrompt;
    
    // Add quality issues if not already present
    if (!qualityIssues.split(', ').some(issue => enhanced.includes(issue))) {
      enhanced += `, ${qualityIssues}`;
    }
    
    // Add text and watermark avoidance
    if (!enhanced.includes("text") && !enhanced.includes("watermark")) {
      enhanced += ", text, watermark, signature, copyright";
    }
    
    return enhanced;
  }
}

// Create a backwards-compatible module export that works with both old static calls and new instance methods
const service = new StabilityAIService();

// Static method that uses the instance method
const generateImage = async (options) => {
  return service.generateImage(options);
};

// Export both the class and static methods to maintain backward compatibility
const exportedModule = {
  generateImage,
  MODELS,
  RESOLUTIONS,
  STYLES,
  GENERATION_TYPES,
  MODEL_CONFIG,
  StabilityAIService
};

// Allow the module to be used as both a class and an object with static methods
module.exports = Object.assign(exportedModule, { default: StabilityAIService }); 