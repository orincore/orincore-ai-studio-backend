# Professional Thumbnail Generator Implementation Guide

This guide provides instructions for implementing the enhanced Professional Thumbnail Generator in your frontend application.

## Overview

The updated thumbnail generator allows users to create high-quality, professional thumbnails by:

1. Entering a title, subtitle, and category
2. Uploading multiple images to incorporate in the thumbnail
3. Adding a custom prompt for more control
4. Choosing to use AI-generated backgrounds or just user images

## API Endpoints

### 1. Generate Thumbnail

**Endpoint:** `POST /api/thumbnails/generate`

**Request Format:**
```json
{
  "title": "Your Video Title",
  "subtitle": "Optional Subtitle",
  "tags": ["keyword1", "keyword2"],
  "contentCategory": "tech",
  "stylePreference": "bold",
  "colorPreferences": ["blue", "white"],
  "prompt": "Optional custom prompt to guide the AI",
  "useAI": true
}
```

**File Upload:**
- Multiple files can be uploaded with the field name `userAssets`
- The files should be sent as `multipart/form-data`

**Response:**
```json
{
  "success": true,
  "message": "Professional YouTube thumbnail generated successfully",
  "data": {
    "id": "uuid-here",
    "userId": "user-id",
    "title": "Your Video Title",
    "subtitle": "Optional Subtitle",
    "contentCategory": "tech",
    "stylePreference": "bold",
    "tags": ["keyword1", "keyword2"],
    "customPrompt": "Optional custom prompt",
    "imageUrl": "https://cloudinary-url/image.jpg",
    "publicId": "cloudinary-public-id",
    "width": 1280,
    "height": 720,
    "textLayout": {
      "fontSize": "large",
      "layout": "centered",
      "recommendedLines": 1,
      "textEffects": ["drop-shadow", "outline"],
      "textPosition": "center"
    },
    "creditCost": 50,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "userAssetIds": ["asset-id-1", "asset-id-2"],
    "quality": "professional"
  }
}
```

### 2. Get Content Categories

**Endpoint:** `GET /api/thumbnails/categories`

**Response:**
```json
{
  "success": true,
  "message": "Content categories retrieved successfully",
  "data": [
    { "id": "gaming", "name": "Gaming" },
    { "id": "vlog", "name": "Vlog & Lifestyle" },
    { "id": "education", "name": "Education" },
    { "id": "tech", "name": "Technology & Reviews" },
    { "id": "beauty", "name": "Beauty & Fashion" },
    { "id": "fitness", "name": "Fitness & Health" },
    { "id": "food", "name": "Food & Cooking" },
    { "id": "diy", "name": "DIY & Crafts" },
    { "id": "music", "name": "Music & Entertainment" },
    { "id": "business", "name": "Business & Finance" }
  ]
}
```

### 3. Get Style Preferences

**Endpoint:** `GET /api/thumbnails/styles`

**Response:**
```json
{
  "success": true,
  "message": "Style preferences retrieved successfully",
  "data": [
    { "id": "bold", "name": "Bold & Impactful" },
    { "id": "minimal", "name": "Minimal & Clean" },
    { "id": "neon", "name": "Neon & Vibrant" },
    { "id": "clean", "name": "Clean & Professional" },
    { "id": "vibrant", "name": "Vibrant & Colorful" }
  ]
}
```

## Frontend Implementation

### 1. Form Component

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ThumbnailGenerator = () => {
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tags, setTags] = useState([]);
  const [contentCategory, setContentCategory] = useState('tech');
  const [stylePreference, setStylePreference] = useState('bold');
  const [colorPreferences, setColorPreferences] = useState([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [useAI, setUseAI] = useState(true);
  
  // Upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filesPreviews, setFilesPreviews] = useState([]);
  
  // Categories and styles
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  
  // Results
  const [thumbnail, setThumbnail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch categories and styles on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, stylesRes] = await Promise.all([
          axios.get('/api/thumbnails/categories'),
          axios.get('/api/thumbnails/styles')
        ]);
        
        setCategories(categoriesRes.data.data);
        setStyles(stylesRes.data.data);
      } catch (err) {
        setError('Failed to load categories and styles');
        console.error(err);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 4 files
    if (files.length > 4) {
      alert('You can only upload up to 4 images');
      return;
    }
    
    setSelectedFiles(files);
    
    // Generate previews
    const previews = files.map(file => URL.createObjectURL(file));
    setFilesPreviews(previews);
  };
  
  // Handle tag input
  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newTag = e.target.value.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
        e.target.value = '';
      }
    }
  };
  
  // Remove tag
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validate form
    if (!title) {
      setError('Title is required');
      setIsLoading(false);
      return;
    }
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subtitle', subtitle);
      tags.forEach(tag => formData.append('tags', tag));
      formData.append('contentCategory', contentCategory);
      formData.append('stylePreference', stylePreference);
      colorPreferences.forEach(color => formData.append('colorPreferences', color));
      formData.append('prompt', customPrompt);
      formData.append('useAI', useAI);
      
      // Append files
      selectedFiles.forEach(file => {
        formData.append('userAssets', file);
      });
      
      // Send request
      const response = await axios.post('/api/thumbnails/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setThumbnail(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate thumbnail');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="thumbnail-generator">
      <h1>Professional Thumbnail Generator</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title (required)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-control"
            placeholder="Enter your video title"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Subtitle (optional)</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="form-control"
            placeholder="Enter a subtitle"
          />
        </div>
        
        <div className="form-group">
          <label>Tags (press Enter to add)</label>
          <input
            type="text"
            onKeyDown={handleTagInput}
            className="form-control"
            placeholder="Enter keywords and press Enter"
          />
          <div className="tags-container">
            {tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>&times;</button>
              </span>
            ))}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group col-md-6">
            <label>Content Category</label>
            <select
              value={contentCategory}
              onChange={(e) => setContentCategory(e.target.value)}
              className="form-control"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group col-md-6">
            <label>Style Preference</label>
            <select
              value={stylePreference}
              onChange={(e) => setStylePreference(e.target.value)}
              className="form-control"
            >
              {styles.map(style => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Custom Prompt (optional)</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="form-control"
            placeholder="Enter additional details to guide the AI"
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label>Upload Images (up to 4)</label>
          <input
            type="file"
            onChange={handleFileChange}
            className="form-control-file"
            multiple
            accept="image/*"
          />
          
          <div className="file-previews">
            {filesPreviews.map((preview, index) => (
              <div key={index} className="file-preview">
                <img src={preview} alt={`Preview ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-group">
          <div className="form-check">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="form-check-input"
              id="useAI"
            />
            <label className="form-check-label" htmlFor="useAI">
              Use AI to enhance thumbnail (recommended)
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Thumbnail'}
        </button>
      </form>
      
      {error && (
        <div className="alert alert-danger mt-3">
          {error}
        </div>
      )}
      
      {thumbnail && (
        <div className="thumbnail-result mt-4">
          <h2>Your Professional Thumbnail</h2>
          <div className="thumbnail-preview">
            <img
              src={thumbnail.imageUrl}
              alt="Generated Thumbnail"
              className="img-fluid"
            />
          </div>
          <div className="thumbnail-details mt-3">
            <h3>Thumbnail Details</h3>
            <p><strong>Title:</strong> {thumbnail.title}</p>
            {thumbnail.subtitle && (
              <p><strong>Subtitle:</strong> {thumbnail.subtitle}</p>
            )}
            <p><strong>Category:</strong> {thumbnail.contentCategory}</p>
            <p><strong>Style:</strong> {thumbnail.stylePreference}</p>
            <p><strong>Resolution:</strong> {thumbnail.width}x{thumbnail.height}</p>
            <p><strong>Credit Cost:</strong> {thumbnail.creditCost}</p>
            
            <button
              className="btn btn-success mt-3"
              onClick={() => window.open(thumbnail.imageUrl, '_blank')}
            >
              Download Thumbnail
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThumbnailGenerator;
```

### 2. CSS Styling

```css
/* Thumbnail Generator Styles */

.thumbnail-generator {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tag {
  background-color: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tag button {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}

.file-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.file-preview {
  width: 120px;
  height: 120px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-result {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
}

.thumbnail-preview {
  text-align: center;
  margin: 1rem 0;
}

.thumbnail-preview img {
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.thumbnail-details {
  background-color: white;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #eee;
}
```

## Implementation Tips

1. **Image Uploads**:
   - Validate image size and type on the client side
   - Show previews of uploaded images
   - Allow users to remove images before submission

2. **Custom Prompt**:
   - Provide examples of effective prompts
   - Suggest prompts based on the category selected
   - Show a character count to avoid extremely long prompts

3. **User Experience**:
   - Show loading states during generation
   - Display clear error messages if generation fails
   - Allow users to save or download their thumbnails directly

4. **Credits System**:
   - Display the user's available credits before generation
   - Show credit cost before submission
   - Provide feedback if the user has insufficient credits

## Best Practices for Thumbnails

Share these tips with your users:

1. **Keep text concise**: Short, impactful titles work best
2. **Use contrasting colors**: Makes text more readable
3. **Focus on a single subject**: Avoid cluttered compositions
4. **Use high-quality images**: Upload clear, high-resolution photos
5. **Convey emotion**: Use imagery that evokes curiosity or excitement
6. **Be consistent**: Maintain a consistent style across your channel
7. **Test different styles**: Try various categories and styles to see what performs best

## Common Issues and Solutions

1. **Problem**: Thumbnail generation fails
   **Solution**: Check image sizes and formats, ensure you have sufficient credits

2. **Problem**: Text is difficult to read
   **Solution**: Use contrasting colors, keep text concise, use larger font sizes

3. **Problem**: Uploaded images don't appear in the result
   **Solution**: Ensure images are properly uploaded, try different file formats

4. **Problem**: AI-generated background doesn't match the theme
   **Solution**: Provide a more specific custom prompt or try a different category

For any other issues, contact support at support@orincore.com. 