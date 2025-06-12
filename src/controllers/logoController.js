const asyncHandler = require('express-async-handler');
const logoService = require('../services/logoService');
const { ApiError } = require('../middlewares/errorMiddleware');
const { deductCredits, getCreditCost } = require('../services/creditService');

/**
 * @desc    Generate a logo with enhanced text and color handling
 * @route   POST /api/logos/generate
 * @access  Private
 */
const generateLogo = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    colorTheme,
    style,
    industry
  } = req.body;
  
  // Validate required fields
  if (!name) {
    throw new ApiError('Brand name is required', 400);
  }
  
  // Log the request for debugging
  console.log(`Generating logo for brand: "${name}"`);
  console.log(`Style: ${style || 'minimalist'}, Colors: ${colorTheme || 'not specified'}`);
  
  try {
    // Calculate credit cost
    const creditCost = await getCreditCost('LOGO', null, req.user.id);
    
    // Deduct credits
    await deductCredits(req.user.id, creditCost, 'logo_generation');
    
    // Generate the logo
    const result = await logoService.generateLogo({
      name,
      description,
      colorTheme,
      style,
      industry,
      userId: req.user.id
    });
    
    // Return the result
    res.status(201).json({
      success: true,
      message: 'Logo generated successfully',
      data: result,
      creditCost
    });
  } catch (error) {
    // If credits were deducted but generation failed, refund them
    if (error.message !== 'Insufficient credits') {
      try {
        await deductCredits(req.user.id, -creditCost, 'refund_failed_generation');
      } catch (refundError) {
        console.error('Error refunding credits:', refundError);
      }
    }
    
    throw error;
  }
});

/**
 * @desc    Get logo style options
 * @route   GET /api/logos/styles
 * @access  Private
 */
const getLogoStyles = asyncHandler(async (req, res) => {
  // Define available logo styles
  const styles = [
    { id: 'minimalist', name: 'Minimalist', description: 'Clean, simple designs with minimal elements' },
    { id: 'modern', name: 'Modern', description: 'Contemporary designs with current trends' },
    { id: 'vintage', name: 'Vintage', description: 'Retro-inspired designs with classic elements' },
    { id: '3d', name: '3D', description: 'Three-dimensional designs with depth and shadows' },
    { id: 'flat', name: 'Flat', description: 'Two-dimensional designs with solid colors' },
    { id: 'geometric', name: 'Geometric', description: 'Designs based on geometric shapes and patterns' },
    { id: 'corporate', name: 'Corporate', description: 'Professional designs for business use' },
    { id: 'playful', name: 'Playful', description: 'Fun, creative designs with vibrant elements' },
    { id: 'luxury', name: 'Luxury', description: 'Elegant, high-end designs with premium feel' }
  ];
  
  res.status(200).json({
    success: true,
    data: styles
  });
});

/**
 * @desc    Get logo color theme suggestions
 * @route   GET /api/logos/color-themes
 * @access  Private
 */
const getColorThemes = asyncHandler(async (req, res) => {
  // Define popular color themes for logos
  const colorThemes = [
    { id: 'blue', name: 'Blue', description: 'Professional, trustworthy, calming' },
    { id: 'red', name: 'Red', description: 'Bold, energetic, passionate' },
    { id: 'green', name: 'Green', description: 'Growth, health, environmental' },
    { id: 'black-white', name: 'Black & White', description: 'Classic, elegant, timeless' },
    { id: 'purple', name: 'Purple', description: 'Creative, luxurious, wise' },
    { id: 'orange', name: 'Orange', description: 'Friendly, cheerful, confident' },
    { id: 'blue-gold', name: 'Blue & Gold', description: 'Premium, professional, established' },
    { id: 'green-blue', name: 'Green & Blue', description: 'Environmental, peaceful, balanced' },
    { id: 'red-black', name: 'Red & Black', description: 'Powerful, bold, modern' },
    { id: 'pastel', name: 'Pastel Colors', description: 'Soft, approachable, friendly' }
  ];
  
  res.status(200).json({
    success: true,
    data: colorThemes
  });
});

module.exports = {
  generateLogo,
  getLogoStyles,
  getColorThemes
}; 