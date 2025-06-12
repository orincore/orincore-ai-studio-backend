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
const generateImage = async ({
  prompt,
  negativePrompt = '',
  generationType = 'GENERAL',
  modelId,
  resolution,
  cfgScale = 7,
  steps = 30,
  style = null,
  numberOfImages = 1
}) => {
  // Validate inputs
  if (!prompt || prompt.trim() === '') {
    throw new ApiError('Prompt is required for image generation', 400);
  }

  if (!STABILITY_API_KEY) {
    throw new ApiError('Stability AI API key is not configured', 500);
  }
  
  // Get generation type configuration
  const genType = GENERATION_TYPES[generationType] || GENERATION_TYPES.GENERAL;
  
  // Apply smart prompt enhancement
  let enhancedPrompt = enhancePromptForAccuracy(prompt, style, generationType);
  
  // Apply generation-type specifics after the smart enhancement
  enhancedPrompt = `${genType.promptPrefix}${enhancedPrompt}${genType.promptSuffix}`;
  
  // Enhance negative prompt with comprehensive quality and accuracy issues
  let enhancedNegativePrompt = enhanceNegativePrompt(negativePrompt || genType.negativePrompt, style);

  // Apply style-specific prompt enhancements
  if (style) {
    // For specific styles, enhance the prompt further
    switch (style) {
      case STYLES.REALISTIC:
        enhancedPrompt = `${enhancedPrompt}, photorealistic, highly detailed, sharp focus, realistic lighting and textures, professional photography, masterpiece, 8k, hyperrealistic, lifelike, perfect composition`;
        enhancedNegativePrompt = `${enhancedNegativePrompt}, cartoon, anime, illustration, drawing, painting, digital art, sketchy, blurry, low quality, deformed, disfigured, mutated, unnatural pose, bad anatomy, wrong proportions`;
        break;
      case STYLES.ANIME:
        enhancedPrompt = `${enhancedPrompt}, anime style, manga, detailed, 2D, vibrant colors, clean lines, anime illustration, japanese anime style, high quality anime, professional anime artwork, studio ghibli, anime key visual`;
        enhancedNegativePrompt = `${enhancedNegativePrompt}, western, photorealistic, 3D, realistic, bad anatomy, bad hands, text, error, missing fingers, extra digits, fewer digits, blurry, mutated, extra limbs, poorly drawn face, bad proportions`;
        break;
      case STYLES.CARTOON_STYLE:
        enhancedPrompt = `${enhancedPrompt}, cartoon style, stylized, bright colors, simple shapes, bold outlines, cheerful, animated, clean linework, detailed, high quality, professional animation, pixar style, disney style`;
        enhancedNegativePrompt = `${enhancedNegativePrompt}, realistic, photorealistic, detailed, complex, dark, gloomy, noisy, blurry, low quality, grainy, messy linework, inconsistent style`;
        break;
      case STYLES.DIGITAL_ART:
        enhancedPrompt = `${enhancedPrompt}, digital art, vibrant colors, detailed, fantasy, sci-fi, conceptual, polished, masterpiece, trending on artstation, 8k, professional digital painting, highly detailed, intricate details, concept art, sharp focus`;
        enhancedNegativePrompt = `${enhancedNegativePrompt}, realistic, photorealistic, sketch, rough, physical media, blurry, low quality, amateurish, inconsistent lighting, bad composition, poor perspective`;
        break;
      case STYLES.FANTASY:
        enhancedPrompt = `${enhancedPrompt}, fantasy art, magical, ethereal, dreamy, mystical, epic, dramatic lighting, fantasy landscape, detailed, masterpiece, intricate details, surreal, otherworldly, magical atmosphere`;
        enhancedNegativePrompt = `${enhancedNegativePrompt}, mundane, realistic, photo, photograph, everyday, blurry, low quality, simple, plain, ordinary, grainy`;
        break;
    }
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
    const dimensions = RESOLUTIONS[selectedResolution] || RESOLUTIONS.NORMAL;
    
    // Log the selected resolution to help with debugging
    console.log(`Generating image with resolution: ${selectedResolution} (${dimensions.width}x${dimensions.height})`);
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
      sampler: "K_DPMPP_2M",  // Use a high-quality sampler
      clipguidance_preset: "FAST_BLUE", // More refined output
      seed: 0, // Random seed each time for variety
      
      // Advanced parameters for improved accuracy
      guidance_preset: "FAST_GREEN", // Better subject accuracy
      
      // Add more weight to the text prompt for SDXL models
      weight_method: "FAVOR_ORIGINAL_PROMPT"
    };

    // Make the API request
    const response = await axios({
      method: 'post',
      url: `${STABILITY_API_URL}/generation/${selectedModel}/text-to-image`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${STABILITY_API_KEY}`
      },
      data: payload,
      responseType: 'json'
    });

    // Process the response
    const generatedImages = response.data.artifacts.map(artifact => ({
      base64: artifact.base64,
      seed: artifact.seed,
      finishReason: artifact.finish_reason
    }));

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
      images: generatedImages
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
};

/**
 * Enhance a prompt to improve accuracy and detail
 * 
 * @param {string} prompt - The original prompt
 * @param {string} style - The style being used
 * @param {string} generationType - The type of generation
 * @returns {string} - Enhanced prompt
 */
const enhancePromptForAccuracy = (prompt, style, generationType) => {
  // Clean and normalize the prompt
  const cleanPrompt = prompt.trim();
  
  // Identify key subject(s) in the prompt
  const subjects = extractSubjects(cleanPrompt);
  
  // Start with the original prompt
  let enhancedPrompt = cleanPrompt;
  
  // Check if we have explicit descriptors for composition and detail
  const hasCompositionTerms = /composition|framing|centered|angle|perspective|view|shot|background|foreground|scene/i.test(cleanPrompt);
  const hasDetailTerms = /detailed|high[ -]quality|sharp|clear|crisp|precise|fine details|intricate/i.test(cleanPrompt);
  const hasLightingTerms = /lighting|light|shadow|illuminated|dark|bright|sunlight|moonlight|dramatic|ambient/i.test(cleanPrompt);
  const hasColorTerms = /color|vibrant|bright|dark|pale|red|blue|green|yellow|purple|orange|black|white|colorful|monochrome|grayscale/i.test(cleanPrompt);
  
  // Add descriptors if they're missing and not a style conflict
  if (!hasCompositionTerms && !style) {
    enhancedPrompt += ", perfect composition, centered";
  }
  
  if (!hasDetailTerms) {
    enhancedPrompt += ", highly detailed, intricate details";
  }
  
  if (!hasLightingTerms && !style) {
    enhancedPrompt += ", perfect lighting";
  }
  
  if (!hasColorTerms && !style) {
    enhancedPrompt += ", vibrant colors";
  }
  
  // Special subject handling
  const isPersonPhoto = /person|man|woman|girl|boy|people|portrait|face|human/i.test(cleanPrompt);
  const isLandscape = /landscape|nature|mountain|forest|beach|ocean|sky|sunset|outdoor|scenery/i.test(cleanPrompt);
  const isProduct = /product|item|device|gadget|merchandise|packaging/i.test(cleanPrompt);
  const isFood = /food|meal|dish|cuisine|dessert|cake|restaurant/i.test(cleanPrompt);
  const isAnimal = /animal|pet|dog|cat|bird|wildlife/i.test(cleanPrompt);
  
  // Apply specialized enhancements based on subject type
  if (isPersonPhoto && generationType !== 'ANIME') {
    enhancedPrompt += ", professional portrait photography, perfect face, detailed facial features, photorealistic, studio lighting";
  }
  
  if (isLandscape) {
    enhancedPrompt += ", wide angle lens, panoramic view, stunning view, professional landscape photography, nature photography";
  }
  
  if (isProduct) {
    enhancedPrompt += ", commercial product photography, studio lighting, professional photography, clean background, high-end advertising, product showcase";
  }
  
  if (isFood) {
    enhancedPrompt += ", food photography, appetizing, culinary photography, studio lighting, commercial, professional food styling";
  }
  
  if (isAnimal) {
    enhancedPrompt += ", detailed fur/feathers, wildlife photography, perfect pose, natural habitat, telephoto lens";
  }
  
  // Add emphasis to main subjects for better focus
  if (subjects.length > 0) {
    subjects.forEach(subject => {
      // Don't duplicate subjects that are already part of descriptive phrases
      if (!new RegExp(`detailed ${subject}|${subject} with details|${subject} detailed`, 'i').test(enhancedPrompt)) {
        enhancedPrompt += `, detailed ${subject}`;
      }
    });
  }
  
  // Special handling for certain generation types
  if (generationType === 'LOGO') {
    enhancedPrompt += ", perfect logo design, professional branding, minimalist, scalable, vector style";
  } else if (generationType === 'POSTER') {
    enhancedPrompt += ", professional design, eye-catching, balanced composition, advertising quality";
  } else if (generationType === 'THUMBNAIL') {
    enhancedPrompt += ", attention-grabbing, clear focus, vibrant, professional thumbnail design";
  }
  
  return enhancedPrompt;
};

/**
 * Extract potential subjects from a prompt
 * 
 * @param {string} prompt - The prompt to analyze
 * @returns {string[]} - Array of potential subjects
 */
const extractSubjects = (prompt) => {
  // Simple extraction logic for common subjects
  const subjects = [];
  
  // Common subject patterns
  const patterns = [
    /(?:a|an|the)\s+([a-z]+\s+[a-z]+)/gi,  // "a red car", "the tall building"
    /(?:of|with)\s+(?:a|an|the)?\s+([a-z]+)/gi, // "picture of mountains", "man with hat"
    /([a-z]+)\s+(?:in|on|at)\s+/gi,  // "woman in dress", "book on table"
  ];
  
  // Extract potential subjects using patterns
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      if (match[1] && match[1].length > 3) { // Avoid very short words
        subjects.push(match[1].trim());
      }
    }
  });
  
  // Check for single nouns that might be subjects
  const words = prompt.split(/\s+/);
  words.forEach(word => {
    if (word.length > 4 && !subjects.includes(word)) {
      subjects.push(word);
    }
  });
  
  return [...new Set(subjects)].slice(0, 3); // Deduplicate and limit to top 3
};

/**
 * Enhance negative prompts to avoid common issues
 * 
 * @param {string} negativePrompt - The original negative prompt
 * @param {string} style - The style being used
 * @returns {string} - Enhanced negative prompt
 */
const enhanceNegativePrompt = (negativePrompt, style) => {
  // Common quality issues to avoid
  const qualityIssues = "ugly, deformed, disfigured, poor quality, low quality, blurry, pixelated, grainy, noisy, jpeg artifacts, compression artifacts, amateur, distorted";
  
  // Anatomy issues (for human subjects)
  const anatomyIssues = "bad anatomy, wrong anatomy, extra limbs, missing limbs, fused fingers, too many fingers, missing fingers, extra digits, fewer digits, mutated hands, poorly drawn hands, poorly drawn face, mutation, mutated";
  
  // Composition issues
  const compositionIssues = "cut off, cropped, frame cut, out of frame, poorly framed, bad composition, malformed, unnatural pose, uneven composition";
  
  // Initialize with the original negative prompt
  let enhanced = negativePrompt;
  
  // Add quality issues if not already present
  if (!qualityIssues.split(', ').some(issue => enhanced.includes(issue))) {
    enhanced += `, ${qualityIssues}`;
  }
  
  // For realistic styles, include anatomy issues
  if (style === STYLES.REALISTIC) {
    if (!anatomyIssues.split(', ').some(issue => enhanced.includes(issue))) {
      enhanced += `, ${anatomyIssues}`;
    }
  }
  
  // Add composition issues
  if (!compositionIssues.split(', ').some(issue => enhanced.includes(issue))) {
    enhanced += `, ${compositionIssues}`;
  }
  
  // Add text and watermark avoidance
  if (!enhanced.includes("text") && !enhanced.includes("watermark")) {
    enhanced += ", text, watermark, signature, copyright";
  }
  
  return enhanced;
};

/**
 * Get available generation types for frontend use
 * @returns {Array} - Array of generation type objects with their settings
 */
const getGenerationTypes = () => {
  return Object.entries(GENERATION_TYPES).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description
  }));
};

/**
 * Get available style presets for frontend use
 * @returns {Array} - Array of style preset objects
 */
const getStylePresets = () => {
  const styleDescriptions = {
    NONE: "No specific style",
    REALISTIC: "Photorealistic images with natural lighting and textures",
    ANIME: "Japanese animation style with clean lines and vibrant colors",
    CARTOON_STYLE: "Stylized and simplified with bold outlines and bright colors",
    DIGITAL_ART: "Digital illustration with defined brushstrokes and vibrant colors",
    FANTASY: "Magical and ethereal fantasy art style",
    COMICS: "Comic book style with bold lines and action-oriented composition",
    CINEMATIC: "Movie-like quality with dramatic lighting and composition",
    THREE_D: "3D rendered look with depth and realistic textures",
    PIXEL_ART: "Retro-style pixelated graphics",
    ORIGAMI: "Paper-folded look with clean lines and geometric shapes",
    LINE_ART: "Simple line drawings with minimal details",
    ENHANCE: "Enhanced details and quality boost",
    NEON_PUNK: "Cyberpunk aesthetic with neon colors and futuristic elements",
    ISOMETRIC: "Isometric style with flat, two-dimensional appearance",
    LOW_POLY: "Low-poly style with simplified geometric shapes",
    MODELING_COMPOUND: "Modeling compound style with detailed and realistic textures",
    TILE_TEXTURE: "Tile texture style with repeated patterns and geometric shapes"
  };

  return Object.entries(STYLES).map(([key, value]) => ({
    id: value,
    name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    description: styleDescriptions[key] || ""
  }));
};

/**
 * Get style suggestions based on the prompt content
 * @param {string} prompt - The user's prompt
 * @returns {Array} - Array of suggested style presets
 */
const getSuggestedStyles = (prompt) => {
  const promptLower = prompt.toLowerCase();
  const suggestions = [];

  // Detect content types in the prompt
  const contentPatterns = {
    portrait: ['portrait', 'person', 'face', 'man', 'woman', 'girl', 'boy', 'child', 'people'],
    landscape: ['landscape', 'mountains', 'forest', 'beach', 'nature', 'sky', 'outdoor', 'scenery'],
    fantasy: ['fantasy', 'dragon', 'magical', 'fairy', 'elf', 'wizard', 'magic', 'mythical'],
    scifi: ['sci-fi', 'robot', 'futuristic', 'space', 'alien', 'cyberpunk', 'technology'],
    cartoon: ['cartoon', 'animation', 'character', 'cute', 'colorful', 'stylized'],
    anime: ['anime', 'manga', 'japanese', 'character', 'kawaii'],
    product: ['product', 'commercial', 'advertisement', 'merchandise', 'brand']
  };

  // Match content types and suggest appropriate styles
  for (const [type, keywords] of Object.entries(contentPatterns)) {
    if (keywords.some(keyword => promptLower.includes(keyword))) {
      switch (type) {
        case 'portrait':
          suggestions.push(STYLES.REALISTIC, STYLES.DIGITAL_ART);
          break;
        case 'landscape':
          suggestions.push(STYLES.REALISTIC, STYLES.FANTASY);
          break;
        case 'fantasy':
          suggestions.push(STYLES.FANTASY, STYLES.DIGITAL_ART);
          break;
        case 'scifi':
          suggestions.push(STYLES.DIGITAL_ART, STYLES.NEON_PUNK);
          break;
        case 'cartoon':
          suggestions.push(STYLES.CARTOON_STYLE, STYLES.DIGITAL_ART);
          break;
        case 'anime':
          suggestions.push(STYLES.ANIME);
          break;
        case 'product':
          suggestions.push(STYLES.REALISTIC, STYLES.THREE_D);
          break;
      }
    }
  }

  // Return unique suggestions, or default to digital art if none found
  return [...new Set(suggestions)].length > 0 
    ? [...new Set(suggestions)] 
    : [STYLES.DIGITAL_ART];
};

module.exports = {
  generateImage,
  MODELS,
  RESOLUTIONS,
  STYLES,
  GENERATION_TYPES,
  MODEL_CONFIG,
  getGenerationTypes,
  getStylePresets,
  getSuggestedStyles,
  enhancePromptForAccuracy,
  enhanceNegativePrompt
}; 