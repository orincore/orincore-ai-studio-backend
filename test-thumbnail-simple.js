const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config();

// Use an existing image from the public directory if available
const testImagePath = path.join(__dirname, 'public', 'sample-image.jpg');

const baseUrl = 'http://localhost:3000/api';

// Simple test function for direct thumbnail endpoint testing
async function testThumbnail() {
  try {
    console.log('Starting thumbnail generation test...');
    
    // Create form data
    const formData = new FormData();
    
    // Add text data
    formData.append('title', 'How to Master Technology Skills');
    formData.append('contentCategory', 'education');
    formData.append('stylePreference', 'bold');
    formData.append('tags', JSON.stringify(['technology', 'education', 'skills']));
    formData.append('prompt', 'professional education thumbnail with minimalist design and blue accent colors');
    formData.append('useAI', 'true');
    
    // Check if test image exists
    if (fs.existsSync(testImagePath)) {
      console.log(`Adding test image from: ${testImagePath}`);
      formData.append('userImages', fs.createReadStream(testImagePath));
    } else {
      console.log('No test image found, proceeding with AI-only generation');
    }
    
    console.log('Sending thumbnail generation request...');
    
    // Use the test endpoint that doesn't require authentication
    const response = await axios.post(
      `${baseUrl}/test-thumbnail`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('Response received:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error during test:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testThumbnail(); 