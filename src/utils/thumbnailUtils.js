/**
 * Utility functions for YouTube thumbnail generation
 */

const CONTENT_CATEGORY_STYLES = {
  'gaming': {
    promptPrefix: 'Professional YouTube gaming thumbnail with high contrast, intense colors, ',
    promptSuffix: ' Include eye-catching visual elements, action-oriented design with bold text. High energy, vibrant, visually striking.',
    negativePrompt: 'boring, low contrast, blurry text, low quality graphics, unprofessional, amateurish',
    colorSchemes: ['red/black', 'neon/dark', 'vibrant blue/orange', 'green/black'],
    textStyle: 'bold, large, outlined'
  },
  'vlog': {
    promptPrefix: 'Lifestyle YouTube vlog thumbnail with natural lighting, authentic feel, ',
    promptSuffix: ' Personal, inviting composition with human-centered focus. Clean, modern aesthetic that feels approachable and genuine.',
    negativePrompt: 'cartoon, animated, artificial-looking, overly staged, corporate, cold colors',
    colorSchemes: ['warm neutrals', 'soft pastels', 'light blue/yellow', 'warm whites/greens'],
    textStyle: 'casual, medium-sized, sans-serif'
  },
  'education': {
    promptPrefix: 'Educational YouTube thumbnail with clean, organized layout, ',
    promptSuffix: ' Clear information hierarchy, trustworthy appearance, professional composition that suggests expertise.',
    negativePrompt: 'chaotic, messy, unprofessional, juvenile, flashy, distracting elements',
    colorSchemes: ['blue/white', 'green/white', 'neutral with accent', 'academic colors'],
    textStyle: 'clear, professional, balanced'
  },
  'tech': {
    promptPrefix: 'Tech review YouTube thumbnail with sleek, modern design, ',
    promptSuffix: ' Clean composition featuring tech product with polished lighting. Futuristic, professional aesthetic with sharp details.',
    negativePrompt: 'outdated, low-quality, blurry, unprofessional, cluttered, messy background',
    colorSchemes: ['blue/black', 'white/black', 'minimalist', 'tech blue/white'],
    textStyle: 'modern, technical, precise'
  },
  'beauty': {
    promptPrefix: 'Beauty/makeup YouTube thumbnail with flattering lighting, ',
    promptSuffix: ' Polished, glamorous feel with soft details. Appealing colors that highlight beauty products or results.',
    negativePrompt: 'harsh lighting, unflattering angles, messy composition, dull colors, unprofessional',
    colorSchemes: ['pastels', 'pinks/neutrals', 'rose gold', 'soft glamour'],
    textStyle: 'elegant, stylish, feminine'
  },
  'fitness': {
    promptPrefix: 'Fitness YouTube thumbnail with dynamic, energetic composition, ',
    promptSuffix: ' Strong, motivational aesthetic showing physical activity or results. Powerful visuals that convey strength and health.',
    negativePrompt: 'weak composition, inactive, boring, unmotivational, low energy',
    colorSchemes: ['blue/white', 'green/black', 'red/black', 'high-contrast'],
    textStyle: 'strong, bold, motivational'
  },
  'food': {
    promptPrefix: 'Culinary YouTube thumbnail with appetizing food photography, ',
    promptSuffix: ' Mouthwatering presentation, rich colors, and perfect lighting that highlights textures and details of the dish.',
    negativePrompt: 'unappetizing, poor lighting, messy presentation, bland colors, artificial-looking food',
    colorSchemes: ['warm food tones', 'rustic', 'bright whites', 'contrasting food colors'],
    textStyle: 'appetizing, clean, food-focused'
  },
  'diy': {
    promptPrefix: 'DIY/Craft YouTube thumbnail with creative, inspiring presentation, ',
    promptSuffix: ' Before-and-after elements or process visualization. Crafty, artistic aesthetic that showcases handmade quality.',
    negativePrompt: 'mass-produced look, boring composition, unclear subject, unprofessional, messy',
    colorSchemes: ['crafty pastels', 'rustic neutrals', 'bright creative colors', 'workshop tones'],
    textStyle: 'handcrafted, creative, clear'
  },
  'music': {
    promptPrefix: 'Music YouTube thumbnail with dynamic, emotional composition, ',
    promptSuffix: ' Vibrant energy that captures musical feeling. Visually rhythmic with strong artistic elements and audio references.',
    negativePrompt: 'static, boring, quiet feeling, visually flat, uninspiring, low energy',
    colorSchemes: ['dark with neon', 'dramatic contrasts', 'emotional tones', 'vibrant stage colors'],
    textStyle: 'lyrical, emotional, expressive'
  },
  'business': {
    promptPrefix: 'Professional business YouTube thumbnail with polished, authoritative presentation, ',
    promptSuffix: ' Clean, trustworthy composition with professional elements. Organized layout that conveys expertise and confidence.',
    negativePrompt: 'unprofessional, messy, childish, overly casual, disorganized, low quality',
    colorSchemes: ['corporate blue', 'professional neutrals', 'clean whites', 'subtle gradients'],
    textStyle: 'professional, authoritative, precise'
  }
};

const STYLE_MODIFIERS = {
  'bold': 'with bold, high-contrast design elements, strong colors, and impactful composition',
  'minimal': 'with minimalist design, clean white space, essential elements only, and subtle details',
  'neon': 'with vibrant neon colors, glowing elements, high energy, and nightlife aesthetic',
  'clean': 'with organized layout, crisp lines, balanced composition, and professional polish',
  'vibrant': 'with rich, saturated colors, dynamic energy, and eye-catching visual elements'
};

/**
 * Generate optimized prompt for YouTube thumbnail creation
 * 
 * @param {Object} params - Thumbnail generation parameters
 * @param {string} params.title - Video title
 * @param {string} params.subtitle - Optional subtitle
 * @param {Array<string>} params.tags - Content tags
 * @param {string} params.contentCategory - Content category
 * @param {string} params.stylePreference - Style preference
 * @param {Array<string>} params.colorPreferences - Optional color preferences
 * @param {string} params.customPrompt - Optional custom prompt
 * @param {boolean} params.hasUserImage - Whether user uploaded custom image
 * @param {number} params.userImageCount - Number of user images provided
 * @return {Object} Enhanced prompt data
 */
function generateThumbnailPrompt(params) {
  const {
    title,
    subtitle,
    tags = [],
    contentCategory = 'tech',
    stylePreference = 'bold',
    colorPreferences = [],
    customPrompt = '',
    hasUserImage = false,
    userImageCount = 0
  } = params;
  
  // Get category style or default to tech
  const categoryStyle = CONTENT_CATEGORY_STYLES[contentCategory.toLowerCase()] || 
                       CONTENT_CATEGORY_STYLES['tech'];
  
  // Get style modifier or default to bold
  const styleModifier = STYLE_MODIFIERS[stylePreference.toLowerCase()] || 
                       STYLE_MODIFIERS['bold'];
  
  // Build the content description
  let contentDescription = title;
  if (subtitle) {
    contentDescription += ` | ${subtitle}`;
  }
  
  // Include tags if provided
  const tagText = tags.length > 0 ? tags.join(', ') : '';
  
  // Build color preferences text
  let colorText = '';
  if (colorPreferences && colorPreferences.length > 0) {
    colorText = `with color scheme featuring ${colorPreferences.join(', ')}, `;
  }
  
  // Start with custom prompt if provided
  let prompt = customPrompt ? `${customPrompt}, ` : '';
  
  // Add professional quality indicators
  prompt += 'professional high-quality YouTube thumbnail, ';
  
  // Build the complete prompt
  prompt += `${categoryStyle.promptPrefix}${styleModifier}, ${colorText}featuring "${contentDescription}"`;
  
  // Add tag text if available
  if (tagText) {
    prompt += ` related to ${tagText}`;
  }
  
  // Add suffix
  prompt += categoryStyle.promptSuffix;
  
  // If using user image, add instruction to integrate it properly
  if (hasUserImage) {
    if (userImageCount === 1) {
      prompt += ' Integrate the provided image as a prominent featured element with professional composition.';
    } else {
      prompt += ` Composition designed to incorporate ${userImageCount} user-provided images with clean layout and balance.`;
    }
  }
  
  // Add quality-enhancing terms
  prompt += ' Professional grade, captivating design, high click-through rate, attention-grabbing.';
  
  // Add technical specifications
  prompt += ' Optimized as a YouTube thumbnail with 1280x720px resolution, high production value, marketable quality.';
  
  // Enhance negative prompt for professional results
  let negativePrompt = categoryStyle.negativePrompt;
  negativePrompt += ', amateur-looking, poorly designed, cluttered, confusing, hard to read, generic stock photo look, pixelated, low resolution, poor composition, unbalanced layout';
  
  return {
    prompt,
    negativePrompt,
    textStyle: categoryStyle.textStyle,
    colorScheme: categoryStyle.colorSchemes[0]
  };
}

/**
 * Calculate the optimal text layout for a thumbnail
 * 
 * @param {string} title - The title text
 * @param {string} subtitle - Optional subtitle
 * @return {Object} Text layout configuration
 */
function calculateTextLayout(title, subtitle = '') {
  // Determine text size based on length
  const titleLength = title.length;
  let fontSize, layout;
  
  if (titleLength <= 20) {
    fontSize = 'large';
    layout = 'centered';
  } else if (titleLength <= 40) {
    fontSize = 'medium';
    layout = 'bottom-aligned';
  } else {
    fontSize = 'small';
    layout = 'side-aligned';
  }
  
  // Adjust if subtitle is present
  if (subtitle && subtitle.length > 0) {
    if (layout === 'centered') {
      layout = 'stacked-center';
    } else if (layout === 'bottom-aligned') {
      layout = 'stacked-bottom';
    }
  }
  
  return {
    fontSize,
    layout,
    recommendedLines: titleLength > 40 ? 2 : 1,
    textEffects: ['drop-shadow', 'outline'],
    textPosition: layout.includes('bottom') ? 'bottom' : (layout.includes('side') ? 'right' : 'center')
  };
}

/**
 * Get thumbnail generation parameters based on content category
 * 
 * @param {string} contentCategory - Content category
 * @return {Object} Thumbnail parameters
 */
function getThumbnailParameters(contentCategory = 'tech') {
  const category = contentCategory.toLowerCase();
  const params = {
    resolution: { width: 1280, height: 720 },
    aspectRatio: '16:9',
    format: 'jpg',
    quality: 90
  };
  
  // Add category-specific parameters
  if (CONTENT_CATEGORY_STYLES[category]) {
    params.colorScheme = CONTENT_CATEGORY_STYLES[category].colorSchemes[0];
    params.textStyle = CONTENT_CATEGORY_STYLES[category].textStyle;
  }
  
  return params;
}

module.exports = {
  generateThumbnailPrompt,
  calculateTextLayout,
  getThumbnailParameters,
  CONTENT_CATEGORY_STYLES,
  STYLE_MODIFIERS
}; 