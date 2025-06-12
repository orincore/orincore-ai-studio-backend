/**
 * Utility functions for AI poster generation
 */

const POSTER_TYPE_STYLES = {
  'business': {
    promptPrefix: 'Professional business poster with clean corporate design, ',
    promptSuffix: ' Organized layout with clear hierarchy, professional typography and balanced composition.',
    negativePrompt: 'unprofessional, messy, childish, cluttered, low quality graphics, comic sans',
    colorSchemes: ['blue/white/gray', 'navy/gold', 'black/silver', 'teal/white'],
    textStyle: 'professional, authoritative, precise'
  },
  'event': {
    promptPrefix: 'Eye-catching event poster with dynamic composition, ',
    promptSuffix: ' Exciting layout that conveys event energy, date and time prominently displayed, venue information clearly visible.',
    negativePrompt: 'boring, static, unclear information, missing details, low energy, unprofessional',
    colorSchemes: ['vibrant contrasts', 'theme-specific', 'bold accent colors', 'event-appropriate palette'],
    textStyle: 'engaging, energetic, clear'
  },
  'sale': {
    promptPrefix: 'Attention-grabbing sale poster with bold promotional design, ',
    promptSuffix: ' Eye-catching price displays, clear offer presentation, persuasive composition with call-to-action.',
    negativePrompt: 'subtle, understated, confusing offer, unclear pricing, low visibility, low impact',
    colorSchemes: ['red/yellow/black', 'high contrast', 'bright promotional', 'sale-oriented colors'],
    textStyle: 'bold, promotional, high-impact'
  },
  'product-launch': {
    promptPrefix: 'Sleek product launch poster with premium presentation, ',
    promptSuffix: ' Sophisticated product showcase with modern aesthetic, innovation-focused design highlighting key features.',
    negativePrompt: 'outdated design, cluttered, low-quality product image, generic, unprofessional',
    colorSchemes: ['product brand colors', 'premium neutrals', 'sleek monochrome', 'high-end palette'],
    textStyle: 'modern, premium, innovative'
  },
  'webinar': {
    promptPrefix: 'Professional webinar poster with digital-themed design, ',
    promptSuffix: ' Clean information hierarchy showing speakers, date/time, and registration details. Online event aesthetic.',
    negativePrompt: 'physical event feel, cluttered information, missing registration details, unprofessional',
    colorSchemes: ['tech blue', 'digital gradients', 'clean white/accent', 'professional online'],
    textStyle: 'digital, clean, informative'
  },
  'personal-branding': {
    promptPrefix: 'Distinctive personal branding poster with individual-focused design, ',
    promptSuffix: ' Personality-showcasing layout with professional yet approachable feel. Brand-consistent visual identity.',
    negativePrompt: 'generic, corporate feel, impersonal, stock photo look, inconsistent branding',
    colorSchemes: ['personal brand colors', 'portrait-complementing', 'personality-reflecting', 'unique signature palette'],
    textStyle: 'personal, distinctive, authentic'
  }
};

const STYLE_PREFERENCES = {
  'modern': 'with contemporary minimalist design, clean lines, current design trends, and forward-thinking aesthetic',
  'minimal': 'with essential elements only, generous white space, uncluttered composition, and refined simplicity',
  'vintage': 'with retro aesthetic, classic design elements, nostalgic feel, and time-honored visual approach',
  'bold': 'with high-impact visuals, strong contrasting elements, attention-commanding presence, and dramatic composition',
  'corporate': 'with professional business aesthetic, structured layout, conventional design elements, and trustworthy appearance'
};

const ASPECT_RATIOS = {
  'portrait-a4': { width: 2480, height: 3508, name: 'A4 Portrait' }, // A4 portrait at 300dpi
  'portrait-a3': { width: 3508, height: 4961, name: 'A3 Portrait' }, // A3 portrait at 300dpi
  'square': { width: 3000, height: 3000, name: 'Square' },            // Square
  'custom': { width: null, height: null, name: 'Custom' }             // Custom (needs to be specified)
};

/**
 * Generate optimized prompt for poster creation
 * 
 * @param {Object} params - Poster generation parameters
 * @param {string} params.title - Poster title
 * @param {string} params.slogan - Optional slogan or tagline
 * @param {string} params.additionalText - Additional text content
 * @param {string} params.websiteUrl - Website URL
 * @param {string} params.posterType - Type of poster
 * @param {string} params.stylePreference - Style preference
 * @param {Array<string>} params.colorPalette - Color palette preferences
 * @param {boolean} params.hasLogo - Whether a logo was uploaded
 * @param {boolean} params.hasProductImage - Whether a product image was uploaded
 * @return {Object} Enhanced prompt data
 */
function generatePosterPrompt(params) {
  const {
    title,
    slogan = '',
    additionalText = '',
    websiteUrl = '',
    posterType = 'business',
    stylePreference = 'modern',
    colorPalette = [],
    hasLogo = false,
    hasProductImage = false
  } = params;
  
  // Get poster type style or default to business
  const typeStyle = POSTER_TYPE_STYLES[posterType.toLowerCase().replace(/\s+/g, '-')] || 
                   POSTER_TYPE_STYLES['business'];
  
  // Get style preference or default to modern
  const styleModifier = STYLE_PREFERENCES[stylePreference.toLowerCase()] || 
                       STYLE_PREFERENCES['modern'];
  
  // Build the content description
  let contentDescription = title;
  if (slogan) {
    contentDescription += ` with tagline "${slogan}"`;
  }
  
  // Build color palette text
  let colorText = '';
  if (colorPalette && colorPalette.length > 0) {
    colorText = `using color palette of ${colorPalette.join(', ')}, `;
  }
  
  // Build the complete prompt
  let prompt = `${typeStyle.promptPrefix}${styleModifier}, ${colorText}featuring "${contentDescription}"`;
  
  // Add additional text if available
  if (additionalText) {
    prompt += ` with supporting text "${additionalText}"`;
  }
  
  // Add website if available
  if (websiteUrl) {
    prompt += ` including website URL "${websiteUrl}"`;
  }
  
  // Add suffix
  prompt += typeStyle.promptSuffix;
  
  // Add asset integration instructions
  if (hasLogo && hasProductImage) {
    prompt += ' Seamlessly integrate the provided logo and product image in a professional layout.';
  } else if (hasLogo) {
    prompt += ' Prominently incorporate the provided logo in an appropriate location.';
  } else if (hasProductImage) {
    prompt += ' Showcase the provided product image as a central visual element.';
  }
  
  // Add professional poster specifics
  prompt += ' High quality, print-ready poster design with professional typography and visual hierarchy.';
  
  return {
    prompt,
    negativePrompt: typeStyle.negativePrompt,
    textStyle: typeStyle.textStyle,
    colorScheme: typeStyle.colorSchemes[0]
  };
}

/**
 * Get optimal resolution based on poster aspect ratio
 * 
 * @param {string} aspectRatio - Aspect ratio identifier
 * @param {Object} customDimensions - Custom dimensions if aspect ratio is 'custom'
 * @return {Object} Resolution data
 */
function getPosterResolution(aspectRatio = 'portrait-a4', customDimensions = null) {
  // Get standard dimensions or use custom
  if (aspectRatio === 'custom' && customDimensions) {
    return {
      width: customDimensions.width || 2480,
      height: customDimensions.height || 3508,
      name: 'Custom',
      aspectRatio: `${customDimensions.width}:${customDimensions.height}`
    };
  }
  
  const dimensions = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['portrait-a4'];
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    name: dimensions.name,
    aspectRatio: `${dimensions.width}:${dimensions.height}`
  };
}

/**
 * Calculate optimal text hierarchy and layout for a poster
 * 
 * @param {Object} params - Text parameters
 * @param {string} params.title - Main title
 * @param {string} params.slogan - Slogan or tagline
 * @param {string} params.additionalText - Additional text
 * @param {string} params.websiteUrl - Website URL
 * @param {string} params.posterType - Type of poster
 * @return {Object} Text layout configuration
 */
function calculatePosterTextLayout(params) {
  const {
    title,
    slogan = '',
    additionalText = '',
    websiteUrl = '',
    posterType = 'business'
  } = params;
  
  // Determine title prominence based on poster type
  let titleScale;
  switch (posterType.toLowerCase().replace(/\s+/g, '-')) {
    case 'sale':
    case 'event':
      titleScale = 'very-large'; // 1/4 of poster height
      break;
    case 'product-launch':
    case 'webinar':
      titleScale = 'large'; // 1/6 of poster height
      break;
    default:
      titleScale = 'medium'; // 1/8 of poster height
  }
  
  // Determine layout based on content amount
  let layout;
  const hasMultipleElements = [title, slogan, additionalText, websiteUrl].filter(Boolean).length > 2;
  
  if (posterType === 'product-launch' && hasMultipleElements) {
    layout = 'product-centered';
  } else if (posterType === 'personal-branding') {
    layout = 'person-centered';
  } else if (hasMultipleElements) {
    layout = 'hierarchical';
  } else {
    layout = 'centered';
  }
  
  return {
    titleScale,
    layout,
    hierarchy: [
      { element: 'title', size: titleScale },
      { element: 'slogan', size: 'medium' },
      { element: 'additionalText', size: 'small' },
      { element: 'websiteUrl', size: 'small' }
    ],
    textEffects: posterType === 'sale' ? ['shadow', 'bold', 'highlight'] : ['shadow', 'spacing']
  };
}

module.exports = {
  generatePosterPrompt,
  getPosterResolution,
  calculatePosterTextLayout,
  POSTER_TYPE_STYLES,
  STYLE_PREFERENCES,
  ASPECT_RATIOS
}; 