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
    promptPrefix: 'high quality, professional logo design for a brand named "',
    promptSuffix: '", vector style, clean lines, minimalist, modern branding, isolated on white background, sharp details, perfect for business card and website, no text elements, emblematic design only',
    negativePrompt: "text, letters, words, fonts, typography, wordmark, busy, complex, detailed background, noisy, grainy, blurry, distorted, low resolution, pixelated, jpeg artifacts, watermark, signature"
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
 * Service for interacting with Stability AI API
 */
class StabilityAIService {
  constructor() {
    this.apiKey = STABILITY_API_KEY;
    this.apiUrl = STABILITY_API_URL;
  }
  
  /**
   * Generate an image using Stability AI API
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
    try {
      // Validate prompt
      if (!prompt || prompt.trim() === '') {
        throw new ApiError('Prompt is required for image generation', 400);
      }
      
      // Initialize API headers
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };
      
      // Select model based on parameters or defaults
      const selectedModel = modelId || GENERATION_TYPES[generationType]?.defaultModel || MODELS.STABLE_DIFFUSION_XL;
      
      // Determine the resolution dimensions
      let dimensions = {};
      
      if (width && height) {
        // If width and height are directly specified, use those
        dimensions = { width, height };
        console.log(`Using directly specified dimensions: ${width}x${height}`);
      } else if (resolution && RESOLUTIONS[resolution]) {
        // If a named resolution is specified, use its dimensions
        dimensions = { 
          width: RESOLUTIONS[resolution].width, 
          height: RESOLUTIONS[resolution].height 
        };
        console.log(`Using resolution ${resolution}: ${dimensions.width}x${dimensions.height}`);
      } else {
        // Fall back to the default resolution for the generation type
        const defaultResolution = GENERATION_TYPES[generationType]?.defaultResolution || 'NORMAL';
        dimensions = { 
          width: RESOLUTIONS[defaultResolution].width, 
          height: RESOLUTIONS[defaultResolution].height 
        };
        console.log(`Using default resolution ${defaultResolution}: ${dimensions.width}x${dimensions.height}`);
      }
      
      // Enhance the prompt with additional details
      let enhancedPrompt = enhancePromptForAccuracy(prompt, style, generationType);
      
      // Enhance the negative prompt
      let enhancedNegativePrompt = enhanceNegativePrompt(negativePrompt, style);
      
      // Special handling for SDXL Turbo model which requires fewer steps
      if (selectedModel === MODELS.SDXL_TURBO) {
        steps = Math.min(steps, 30); // Cap at 30 steps for Turbo
        console.log(`Using SDXL Turbo model - steps adjusted to ${steps}`);
      }
      
      // Get model-specific configuration
      const modelConfig = MODEL_CONFIG[selectedModel] || DEFAULT_MODEL_CONFIG;
      
      // Create the request payload
      const payload = {
        text_prompts: [
          {
            text: enhancedPrompt,
            weight: 1
          },
          {
            text: enhancedNegativePrompt,
            weight: -1
          }
        ],
        cfg_scale: cfgScale,
        height: dimensions.height,
        width: dimensions.width,
        samples: numberOfImages,
        steps: steps
      };
      
      // Add engine (model) ID
      let endpointUrl = `${this.apiUrl}/generation/${selectedModel}/text-to-image`;
      
      // Add style preset if specified
      if (style && style !== 'null' && style !== STYLES.NONE) {
        payload.style_preset = style;
        console.log(`Using style preset: ${style}`);
      }
      
      // Add seed if non-zero (for reproducibility)
      if (seed !== 0) {
        payload.seed = seed;
      }
      
      // Log the API request for debugging
      console.log(`Stability AI request to ${endpointUrl}:`);
      console.log(`Using model: ${selectedModel}`);
      console.log(`Dimensions: ${dimensions.width}x${dimensions.height}`);
      console.log(`Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);
      console.log(`Enhanced negative prompt: ${enhancedNegativePrompt.substring(0, 100)}...`);
      
      // Make the API request
      const response = await axios.post(
        endpointUrl,
        payload,
        { headers }
      );
      
      // Check for successful response
      if (response.status !== 200) {
        console.error('Stability AI error:', response.data);
        throw new ApiError(`Stability AI error: ${response.data.message || 'Unknown error'}`, response.status);
      }
      
      // Extract the generated images
      const generatedImages = response.data.artifacts.map(artifact => ({
        base64: artifact.base64,
        seed: artifact.seed,
        finishReason: artifact.finishReason
      }));
      
      return {
        success: true,
        images: generatedImages,
        parameters: {
          prompt: enhancedPrompt,
          negativePrompt: enhancedNegativePrompt,
          model: selectedModel,
          width: dimensions.width,
          height: dimensions.height,
          steps,
          cfgScale,
          style
        }
      };
      
    } catch (error) {
      console.error('Stability AI generation error:', error.response?.data || error.message);
      
      // Format errors from the Stability API
      if (error.response?.data) {
        throw new ApiError(`Stability AI error: ${error.response.data.message || JSON.stringify(error.response.data)}`, error.response.status || 500);
      }
      
      throw new ApiError(`Error generating image: ${error.message}`, 500);
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
  // Validate prompt is present
  if (!options.prompt || options.prompt.trim() === '') {
    throw new ApiError('Prompt is required for image generation', 400);
  }
  
  return service.generateImage(options);
};

// Move these functions before the module exports
const getSuggestedStyles = (prompt) => {
  // Implementation of style suggestions based on prompt content
  const promptLower = prompt.toLowerCase();
  
  // Style suggestion logic
  const suggestions = [];
  
  // Check for anime/manga keywords
  if (/anime|manga|japanese animation|otaku|kawaii/i.test(promptLower)) {
    suggestions.push(STYLES.ANIME);
  }
  
  // Check for realistic/photo keywords
  if (/realistic|photo|portrait|photograph|camera|dslr|photoshoot/i.test(promptLower)) {
    suggestions.push(STYLES.REALISTIC);
  }
  
  // Check for digital art keywords
  if (/digital art|digital painting|concept art|illustration|digital illustration/i.test(promptLower)) {
    suggestions.push(STYLES.DIGITAL_ART);
  }
  
  // Check for fantasy keywords
  if (/fantasy|magical|dragon|wizard|sorceress|elf|dwarf|orc|mythical|mystical/i.test(promptLower)) {
    suggestions.push(STYLES.FANTASY);
  }
  
  // Check for comic book keywords
  if (/comic|superhero|marvel|dc|panel|graphic novel|superhero/i.test(promptLower)) {
    suggestions.push(STYLES.COMICS);
  }
  
  // Check for 3D model keywords
  if (/3d|3d model|3d render|blender|maya|cinema 4d|3d printed|3d sculpture/i.test(promptLower)) {
    suggestions.push(STYLES.THREE_D);
  }
  
  // Check for pixel art keywords
  if (/pixel|8-bit|16-bit|retro game|gameboy|nes|snes|arcade/i.test(promptLower)) {
    suggestions.push(STYLES.PIXEL_ART);
  }
  
  // Check for cinematic keywords
  if (/cinematic|movie|film|hollywood|widescreen|trailer|scene from|blockbuster/i.test(promptLower)) {
    suggestions.push(STYLES.CINEMATIC);
  }
  
  // Check for origami keywords
  if (/origami|paper|folded|paper art|paper craft|folding/i.test(promptLower)) {
    suggestions.push(STYLES.ORIGAMI);
  }
  
  // Check for line art keywords
  if (/line art|sketch|drawing|contour|outline|pen and ink|minimal lines/i.test(promptLower)) {
    suggestions.push(STYLES.LINE_ART);
  }
  
  // Always add "enhance" as a safe fallback option
  if (!suggestions.includes(STYLES.ENHANCE)) {
    suggestions.push(STYLES.ENHANCE);
  }
  
  // Limit to a reasonable number of suggestions
  return suggestions.slice(0, 5);
};

// Helper function to enhance prompt based on generation type
const enhancePromptForAccuracy = (prompt, style, generationType = 'GENERAL') => {
  // Get generation type config
  const genType = GENERATION_TYPES[generationType] || GENERATION_TYPES.GENERAL;
  
  // Start with the generation type's prefix
  let enhancedPrompt = genType.promptPrefix || '';
  
  // Add the user's prompt
  enhancedPrompt += prompt;
  
  // Add generation type's suffix
  if (genType.promptSuffix) {
    enhancedPrompt += genType.promptSuffix;
  }
  
  return enhancedPrompt.trim();
};

// Helper function to enhance negative prompt
const enhanceNegativePrompt = (negativePrompt, style) => {
  // Start with user's negative prompt if provided
  let enhancedNegativePrompt = negativePrompt ? negativePrompt + ', ' : '';
  
  // Add common negative terms that apply to most generations
  enhancedNegativePrompt += 'ugly, deformed, disfigured, poor quality, low quality, blurry';
  
  // Add style-specific negative terms if applicable
  if (style === STYLES.REALISTIC) {
    enhancedNegativePrompt += ', cartoon, anime, illustration, drawing, painting, artificial';
  } else if (style === STYLES.ANIME) {
    enhancedNegativePrompt += ', photorealistic, photograph, western style, 3d render';
  }
  
  return enhancedNegativePrompt;
};

// Helper function to get all style presets with their details
const getStylePresets = () => {
  return [
    { id: STYLES.NONE, name: 'None (Default)', description: 'No specific style applied' },
    { id: STYLES.REALISTIC, name: 'Photographic', description: 'Realistic photo-like images' },
    { id: STYLES.ANIME, name: 'Anime', description: 'Japanese anime style illustrations' },
    { id: STYLES.CARTOON_STYLE, name: 'Cartoon', description: 'Cartoon style digital art' },
    { id: STYLES.DIGITAL_ART, name: 'Digital Art', description: 'Computer-generated artwork' },
    { id: STYLES.FANTASY, name: 'Fantasy Art', description: 'Magical and fantastical scenes' },
    { id: STYLES.COMICS, name: 'Comic Book', description: 'Comic book style illustrations' },
    { id: STYLES.CINEMATIC, name: 'Cinematic', description: 'Movie-like visuals with dramatic lighting' },
    { id: STYLES.THREE_D, name: '3D Model', description: '3D rendered objects and scenes' },
    { id: STYLES.PIXEL_ART, name: 'Pixel Art', description: 'Retro pixel-based artwork' },
    { id: STYLES.ORIGAMI, name: 'Origami', description: 'Paper folding art style' },
    { id: STYLES.LINE_ART, name: 'Line Art', description: 'Simple line-based illustrations' },
    { id: STYLES.ENHANCE, name: 'Enhanced', description: 'Improved detail and quality' },
    { id: STYLES.NEON_PUNK, name: 'Neon Punk', description: 'Cyberpunk style with neon elements' },
    { id: STYLES.ISOMETRIC, name: 'Isometric', description: 'Geometric perspective graphics' },
    { id: STYLES.LOW_POLY, name: 'Low Poly', description: 'Simplified geometric 3D style' },
    { id: STYLES.MODELING_COMPOUND, name: 'Clay/Modeling Compound', description: 'Clay-like textures and shapes' },
    { id: STYLES.TILE_TEXTURE, name: 'Tile Texture', description: 'Repeating pattern designs' }
  ].filter(style => style.id !== undefined); // Filter out any undefined styles
};

// Helper function to get generation types
const getGenerationTypes = () => {
  return Object.entries(GENERATION_TYPES).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description
  }));
};

// Create module exports with all required functions and constants
module.exports = {
  MODELS,
  RESOLUTIONS,
  STYLES,
  GENERATION_TYPES,
  MODEL_CONFIG,
  StabilityAIService,
  generateImage,
  getGenerationTypes,
  getStylePresets,
  getSuggestedStyles,
  enhancePromptForAccuracy,
  enhanceNegativePrompt
}; 