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
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Test text-only thumbnail generation
    console.log('\nTesting text-only thumbnail generation...');
    const thumbnailData = {
      title: "How to Become a Tech Expert",
      contentCategory: "tech",
      stylePreference: "bold",
      tags: ["technology", "tutorial", "expert"],
      prompt: "clean minimalist tech product thumbnail with blue accents",
      useAI: true
    };
    
    console.log('Sending request with data:', JSON.stringify(thumbnailData, null, 2));
    
    const response = await axios.post(
      `${baseUrl}/thumbnails/generate`,
      thumbnailData,
      { headers }
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
testThumbnailGeneration(); 