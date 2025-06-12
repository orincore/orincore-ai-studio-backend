// Test script for the Stability AI service
const {
  getStylePresets,
  getSuggestedStyles,
  enhancePromptForAccuracy,
  STYLES
} = require('./src/services/stabilityAIService');

console.log('Testing Stability AI Service functions...');

// Test getStylePresets function
console.log('\nTesting getStylePresets:');
const stylePresets = getStylePresets();
console.log(`Found ${stylePresets.length} style presets`);
console.log('First few style presets:');
stylePresets.slice(0, 3).forEach(style => {
  console.log(` - ${style.name}: ${style.description}`);
});

// Test getSuggestedStyles function
console.log('\nTesting getSuggestedStyles:');
const testPrompts = [
  'A beautiful anime character with cherry blossoms',
  'A realistic portrait photograph of a woman in natural lighting',
  'A fantasy landscape with dragons and castles'
];

testPrompts.forEach(prompt => {
  const suggestions = getSuggestedStyles(prompt);
  console.log(`\nPrompt: "${prompt}"`);
  console.log('Suggested styles:');
  suggestions.forEach(style => {
    const styleInfo = stylePresets.find(s => s.id === style);
    console.log(` - ${styleInfo ? styleInfo.name : style}`);
  });
});

// Test enhancePromptForAccuracy function
console.log('\nTesting enhancePromptForAccuracy:');
const enhancedPrompt = enhancePromptForAccuracy('a cute dog', STYLES.REALISTIC, 'GENERAL');
console.log(`Original: "a cute dog"`);
console.log(`Enhanced: "${enhancedPrompt}"`);

console.log('\nAll tests completed successfully!'); 