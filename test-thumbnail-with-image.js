const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config();

// User credentials
const credentials = {
  email: 'suradkaradarsh@gmail.com',
  password: 'Prasenjeet@1'
};

const baseUrl = 'http://localhost:3000/api';

// Path to test images
const testImagesDir = path.join(__dirname, 'test-images');

// Create test images directory if it doesn't exist
if (!fs.existsSync(testImagesDir)) {
  fs.mkdirSync(testImagesDir, { recursive: true });
}

// Download a sample image if we don't have one
async function ensureTestImage() {
  const testImagePath = path.join(testImagesDir, 'test-image.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.log('Downloading a sample image for testing...');
    try {
      const response = await axios({
        method: 'get',
        url: 'https://source.unsplash.com/random/800x600/?tech',
        responseType: 'stream'
      });
      
      const writer = fs.createWriteStream(testImagePath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      }).then(() => {
        console.log(`Test image downloaded to ${testImagePath}`);
        return testImagePath;
      });
    } catch (error) {
      console.error('Error downloading test image:', error);
      throw error;
    }
  }
  
  return testImagePath;
}

async function testThumbnailGeneration() {
  try {
    console.log('Starting thumbnail generation test...');
    
    // Step 1: Login to get token
    console.log('Attempting to login with provided credentials...');
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, credentials);
    
    if (!loginResponse.data || !loginResponse.data.tokens || !loginResponse.data.tokens.access_token) {
      console.error('Login failed or token not found:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.tokens.access_token;
    console.log('Login successful, received token');
    
    // Configure headers with token
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // Ensure we have a test image
    const testImagePath = await ensureTestImage();
    
    // Step 2: Test thumbnail generation with image upload
    console.log('\nTesting thumbnail generation with image upload...');
    
    const formData = new FormData();
    formData.append('title', 'How to Master Tech Skills Quickly');
    formData.append('contentCategory', 'education');
    formData.append('stylePreference', 'bold');
    formData.append('tags', JSON.stringify(['technology', 'education', 'skills']));
    formData.append('prompt', 'professional education thumbnail with minimalist design and blue accent colors');
    formData.append('useAI', 'true');
    formData.append('userImages', fs.createReadStream(testImagePath));
    
    console.log('Sending request with image and data...');
    
    const response = await axios.post(
      `${baseUrl}/thumbnails/generate`,
      formData,
      { 
        headers: {
          ...headers,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('Response received:', JSON.stringify(response.data, null, 2));
    
    // Test without image - AI only
    console.log('\nTesting AI-only thumbnail generation...');
    const aiOnlyData = {
      title: "AI Generated Tech Tutorial",
      contentCategory: "tech",
      stylePreference: "minimal",
      tags: ["AI", "tutorial", "technology"],
      prompt: "futuristic minimalist tech thumbnail with sleek design and soft blue glow",
      useAI: true
    };
    
    console.log('Sending AI-only request...');
    
    const aiResponse = await axios.post(
      `${baseUrl}/thumbnails/generate`,
      aiOnlyData,
      { 
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('AI-only response received:', JSON.stringify(aiResponse.data, null, 2));
    
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
testThumbnailGeneration(); 