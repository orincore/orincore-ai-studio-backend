# Orincore AI Studio Backend

Backend API for Orincore AI Studio, providing specialized AI image generation features including YouTube thumbnail generation, poster creation, and more.

## Authentication Flow

Orincore AI Studio uses a secure email verification flow with 6-digit OTP codes:

1. User registers with email/password
2. System sends a 6-digit OTP code to the user's email
3. User must verify their email with the OTP code
4. Only after verification can the user log in
5. Password reset also uses 6-digit OTP codes for security

## API Endpoints

### Authentication

| Method | Endpoint                | Description                                           | Access      | Notes                                      |
|--------|-------------------------|-------------------------------------------------------|-------------|------------------------------------------- |
| POST   | `/api/auth/register`    | Register a new user                                   | Public      | Sends verification OTP to email            |
| POST   | `/api/auth/verify-email`| Verify email with OTP code                            | Public      | **Required before login is allowed**       |
| POST   | `/api/auth/resend-verification` | Resend verification OTP                       | Public      | If original OTP expires or is lost         |
| POST   | `/api/auth/login`       | Log in with email and password                        | Public      | Only works after email verification        |
| POST   | `/api/auth/refresh-token` | Refresh the access token                           | Public      | Uses refresh token                         |
| POST   | `/api/auth/forgot-password` | Request password reset (sends OTP)               | Public      | Sends 6-digit OTP to email                 |
| POST   | `/api/auth/reset-password` | Reset password with OTP code                      | Public      | Requires email, OTP, and new password      |
| POST   | `/api/auth/logout`      | Log out user                                          | Protected   | Invalidates tokens                         |

### User Management

| Method | Endpoint                | Description                                           | Access      |
|--------|-------------------------|-------------------------------------------------------|-------------|
| GET    | `/api/users/me`         | Get current user profile                              | Protected   |
| PUT    | `/api/users/me`         | Update user profile                                   | Protected   |
| GET    | `/api/users/me/credits` | Get user credit balance                               | Protected   |
| GET    | `/api/users/me/credits/history` | Get user credit transaction history           | Protected   |
| GET    | `/api/users`            | Get all users                                         | Admin only  |
| GET    | `/api/users/:id`        | Get user by ID                                        | Admin only  |
| PATCH  | `/api/users/:id/role`   | Update user role                                      | Admin only  |

### Image Generation

| Method | Endpoint                      | Description                                        | Access      | Credit Cost |
|--------|-------------------------------|----------------------------------------------------|-------------|------------|
| POST   | `/api/images/generate`        | Generate custom image (Text-to-Image)              | Protected   | 10 credits (free for first generation) |
| POST   | `/api/images/suggest-styles`  | Get style suggestions based on a prompt            | Protected   | No cost    |
| GET    | `/api/images/options`         | Get available models, resolutions, and styles      | Protected   | No cost    |
| GET    | `/api/images`                 | Get user's generated images                        | Protected   | No cost    |
| GET    | `/api/images/:id`             | Get image by ID                                    | Protected   | No cost    |
| DELETE | `/api/images/:id`             | Delete image by ID                                 | Protected   | No cost    |

### Thumbnail Generation

| Method | Endpoint                      | Description                                        | Access      | Credit Cost |
|--------|-------------------------------|----------------------------------------------------|-------------|------------|
| POST   | `/api/thumbnails/generate`    | Generate YouTube thumbnail                         | Protected   | 50 credits (free for first generation) |
| GET    | `/api/thumbnails`             | Get user's generated thumbnails                    | Protected   | No cost    |
| GET    | `/api/thumbnails/:id`         | Get thumbnail by ID                                | Protected   | No cost    |
| DELETE | `/api/thumbnails/:id`         | Delete thumbnail by ID                             | Protected   | No cost    |

### Poster Generation

| Method | Endpoint                      | Description                                        | Access      | Credit Cost |
|--------|-------------------------------|----------------------------------------------------|-------------|------------|
| POST   | `/api/posters/generate`       | Generate poster                                    | Protected   | 50 credits (free for first generation) |
| GET    | `/api/posters`                | Get user's generated posters                       | Protected   | No cost    |
| GET    | `/api/posters/:id`            | Get poster by ID                                   | Protected   | No cost    |
| DELETE | `/api/posters/:id`            | Delete poster by ID                                | Protected   | No cost    |

### Logo Generation

| Method | Endpoint                      | Description                                        | Access      | Credit Cost |
|--------|-------------------------------|----------------------------------------------------|-------------|------------|
| POST   | `/api/images/generate`        | Generate logo with generationType=LOGO             | Protected   | 25 credits (free for first generation) |

### Wallpaper Generation

| Method | Endpoint                      | Description                                        | Access      | Credit Cost |
|--------|-------------------------------|----------------------------------------------------|-------------|------------|
| POST   | `/api/images/generate`        | Generate wallpaper with generationType=WALLPAPER   | Protected   | 50 credits (free for first generation) |

### Image-to-Image Generation

| Method | Endpoint                      | Description                                        | Access      | Credit Cost |
|--------|-------------------------------|----------------------------------------------------|-------------|------------|
| POST   | `/api/images/generate`        | Generate with generationType=IMAGE_TO_IMAGE        | Protected   | 10 credits (free for first generation) |

### Admin Endpoints

| Method | Endpoint                      | Description                                        | Access      |
|--------|-------------------------------|----------------------------------------------------|-------------|
| GET    | `/api/admin/stats/users`      | Get user statistics                                | Admin only  |
| GET    | `/api/admin/stats/images`     | Get image generation statistics                    | Admin only  |
| GET    | `/api/admin/stats/credits`    | Get credit usage statistics                        | Admin only  |

### Webhooks

| Method | Endpoint                      | Description                                        | Access      |
|--------|-------------------------------|----------------------------------------------------|-------------|
| POST   | `/api/webhooks/lemonsqueezy`  | LemonSqueezy payment webhook                       | Public      |
| POST   | `/api/webhooks/supabase`      | Supabase auth webhook                              | Public      |

## Authentication Request/Response Examples

### Register a New User

**Request:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  },
  "message": "Registration successful. Please check your email for OTP verification code."
}
```

### Verify Email with OTP

**Request:**
```json
POST /api/auth/verify-email
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Resend Verification OTP

**Request:**
```json
POST /api/auth/resend-verification
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification OTP sent successfully"
}
```

### Login (After Email Verification)

**Request:**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  },
  "tokens": {
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token"
  }
}
```

**Error Response (If Email Not Verified):**
```json
{
  "error": "Email not verified. Please verify your email before logging in",
  "status": 403
}
```

### Request Password Reset OTP

**Request:**
```json
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If your email is registered, you will receive a password reset OTP"
}
```

### Reset Password with OTP

**Request:**
```json
POST /api/auth/reset-password
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Important Notes

1. **Email Verification Required**: Users cannot log in until they verify their email with the 6-digit OTP code sent during registration.

2. **OTP Expiration**: All OTP codes expire after 10 minutes for security. Users can request new OTPs using the resend endpoint.

3. **Rate Limiting**: API endpoints have rate limiting to prevent abuse. Excessive requests will result in temporary blocks.

4. **Authentication**: Protected endpoints require a valid JWT token in the Authorization header: `Bearer <token>`.

5. **Credits System**: Image generation operations consume credits from the user's account.

## Credit System

The platform uses a credit-based system for generating images:

### Credit Costs

- **Text-to-Image Generation**: 10 credits
- **Logo Generation**: 25 credits
- **Poster Generation**: 50 credits
- **Thumbnail Generation**: 50 credits
- **Wallpaper Generation**: 50 credits
- **Image-to-Image Generation**: 10 credits

### Free Generation

Each user gets ONE free generation of any type. This means:

- New users can try any generation type once without consuming credits
- After the first generation, credits will be deducted according to the costs above
- The free generation applies across all generation types (e.g., if a user has already used their free generation for a thumbnail, they will not get another free generation for a poster)

### Credit Purchase

Users can purchase credits through the platform's subscription plans or one-time purchases.

## Security Considerations

- All passwords are securely hashed
- Email verification is mandatory
- OTP-based password reset provides enhanced security
- Brevo SMTP service used for reliable and secure email delivery

## Tech Stack

- **Node.js & Express.js**: Fast, unopinionated web framework
- **Supabase**: Auth and Database (PostgreSQL)
- **Stability AI**: Image generation
- **Cloudinary**: Image storage
- **LemonSqueezy**: Payment processing

## Features

- Authentication with Supabase Auth (email/password, social login)
- User management with profiles and credit system
- AI image generation via Stability AI
- Payment processing with LemonSqueezy
- Admin dashboard with analytics and user management
- Webhook handling for payment events
- Specialized generation types with category-specific optimizations
- Asset processing for user-uploaded images
- Dynamic prompt enhancement based on generation type

## Image Generation Types

The platform supports multiple specialized image generation types:

| Type | Description | Default Resolution | Credit Cost |
|------|-------------|-------------------|-------------|
| 🎨 Text-to-Image Generator | Generate images from text descriptions | Square (1024x1024) | 10 credits |
| 🔥 AI Anime Generator | Anime style generations | Normal (512x512) | 10 credits |
| 🏞 AI Realistic Generator | Real-life like generations | HD (768x768) | 10 credits |
| 🐾 AI Logo Maker | Business / brand logos | Logo (512x512) | 25 credits |
| 📊 AI Poster Creator | Professional posters | Poster Landscape (1280x720) | 50 credits |
| 🎯 AI Thumbnail Creator | YouTube/Blog thumbnails | Thumbnail YouTube (1280x720) | 50 credits |
| 💡 AI Concept Generator | Unique artistic ideas | HD (768x768) | 10 credits |
| 🎮 AI Game Character Generator | Gaming avatars & characters | HD (768x768) | 10 credits |
| 📸 AI Product Image Generator | Ecommerce product shots | Product (1024x1024) | 10 credits |
| 🌌 AI Fantasy Art Generator | Sci-fi & fantasy world art | HD (768x768) | 10 credits |
| 🖼️ AI Wallpaper Generator | High-resolution wallpapers | Wallpaper HD (1920x1080) | 50 credits |
| 🔄 Image-to-Image Generator | Transform existing images | Square (1024x1024) | 10 credits |

Each generation type has specialized prompts and settings to produce optimal results for that category.

**Note**: Your first generation of any type is FREE! After that, credits will be consumed according to the costs listed above.

### Available Style Presets

The API provides various style presets to enhance image generation:

| Style | Description |
|-------|-------------|
| Realistic | Photorealistic images with natural lighting and textures |
| Anime | Japanese animation style with clean lines and vibrant colors |
| Cartoon Style | Stylized and simplified with bold outlines and bright colors |
| Digital Art | Digital illustration with defined brushstrokes and vibrant colors |
| Fantasy | Magical and ethereal fantasy art style |
| Comics | Comic book style with bold lines and action-oriented composition |
| Cinematic | Movie-like quality with dramatic lighting and composition |
| 3D | 3D rendered look with depth and realistic textures |
| Pixel Art | Retro-style pixelated graphics |
| Origami | Paper-folded look with clean lines and geometric shapes |
| Line Art | Simple line drawings with minimal details |
| Enhance | Enhanced details and quality boost |
| Neon Punk | Cyberpunk aesthetic with neon colors and futuristic elements |

### Available Aspect Ratios

Choose from multiple aspect ratios for your generated images:

| Aspect Ratio | Dimensions | Description |
|--------------|------------|-------------|
| Square | 1024x1024 | Perfect for social media posts |
| Landscape | 1344x768 | Widescreen 16:9 format |
| Portrait | 768x1344 | Vertical 9:16 format (ideal for mobile) |
| Widescreen | 1024x576 | Standard 16:9 format |
| Wallpaper HD | 1920x1080 | Full HD desktop wallpaper |
| Wallpaper 4K | 3840x2160 | Ultra HD desktop wallpaper |
| Mobile Wallpaper | 1080x1920 | High-resolution mobile wallpaper |

### Advanced Thumbnail Generator Features
The YouTube Thumbnail Generator offers:
- Content category optimization (Gaming, Vlog, Education, Tech, Beauty, Fitness, etc.)
- Style preferences (Bold, Minimal, Neon, Clean, Vibrant)
- Custom color schemes
- Dynamic text layout based on title length
- User-uploaded image integration
- High-contrast, engaging designs optimized for CTR
- Category-specific design optimizations (e.g., red/black for gaming, pastels for beauty)

### Advanced Poster Generator Features
The Poster Creator offers:
- Poster type optimization (Business, Event, Sale, Product Launch, Webinar, Personal Branding)
- Style preferences (Modern, Minimal, Vintage, Bold, Corporate)
- Multiple aspect ratios (A4, A3, Square, Custom)
- Logo and product image integration
- Professional text hierarchy and layout
- Category-specific color schemes and design elements
- Print-ready high-resolution output

## Getting Started

### Prerequisites

- Node.js (v18+)
- Supabase account
- Stability AI API key
- Cloudinary account
- LemonSqueezy account

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys and credentials
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`

### Supabase Setup

Create the following tables in your Supabase project:

#### profiles
```sql
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  country text,
  country_code text,
  currency text,
  timezone text,
  language text,
  role text not null default 'user',
  credit_balance integer not null default 0,
  lemonsqueezy_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Create admin function for RLS bypass
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Admin policies
create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

create policy "Admins can update all profiles"
  on profiles for update
  using (is_admin());
```

#### images
```sql
create table images (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  prompt text not null,
  original_prompt text not null,
  negative_prompt text,
  generation_type text not null default 'GENERAL',
  model_id text not null,
  resolution text not null,
  width integer not null,
  height integer not null,
  cfg_scale numeric,
  steps integer,
  style text,
  seed bigint,
  finish_reason text,
  cloudinary_url text not null,
  cloudinary_public_id text not null,
  credit_cost integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table images enable row level security;

-- Create policies
create policy "Users can view their own images"
  on images for select
  using (auth.uid() = user_id);

create policy "Users can delete their own images"
  on images for delete
  using (auth.uid() = user_id);

create policy "Users can insert their own images"
  on images for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all images"
  on images for select
  using (is_admin());
```

#### thumbnails
```sql
create table thumbnails (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  subtitle text,
  content_category text not null,
  style_preference text not null,
  tags text[],
  image_url text not null,
  public_id text not null,
  width integer not null,
  height integer not null,
  credit_cost integer not null,
  user_asset_id uuid,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table thumbnails enable row level security;

-- Create policies
create policy "Users can view their own thumbnails"
  on thumbnails for select
  using (auth.uid() = user_id);

create policy "Users can delete their own thumbnails"
  on thumbnails for delete
  using (auth.uid() = user_id);

create policy "Admins can view all thumbnails"
  on thumbnails for select
  using (is_admin());
```

#### posters
```sql
create table posters (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  slogan text,
  additional_text text,
  website_url text,
  poster_type text not null,
  style_preference text not null,
  color_palette text[],
  aspect_ratio text not null,
  image_url text not null,
  public_id text not null,
  width integer not null,
  height integer not null,
  credit_cost integer not null,
  logo_asset_id uuid,
  product_image_id uuid,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table posters enable row level security;

-- Create policies
create policy "Users can view their own posters"
  on posters for select
  using (auth.uid() = user_id);

create policy "Users can delete their own posters"
  on posters for delete
  using (auth.uid() = user_id);

create policy "Admins can view all posters"
  on posters for select
  using (is_admin());
```

#### user_assets
```sql
create table user_assets (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  original_filename text not null,
  asset_type text not null,
  width integer not null,
  height integer not null,
  format text not null,
  url text not null,
  public_id text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table user_assets enable row level security;

-- Create policies
create policy "Users can view their own assets"
  on user_assets for select
  using (auth.uid() = user_id);

create policy "Admins can view all assets"
  on user_assets for select
  using (is_admin());
```

#### credit_transactions
```sql
create table credit_transactions (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  amount integer not null,
  type text not null,
  source text not null,
  reference_id text,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table credit_transactions enable row level security;

-- Create policies
create policy "Users can view their own transactions"
  on credit_transactions for select
  using (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on credit_transactions for select
  using (is_admin());
```

#### subscriptions
```sql
create table subscriptions (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  lemonsqueezy_customer_id text not null,
  lemonsqueezy_variant_id text not null,
  status text not null,
  credits_per_cycle integer not null,
  renewed_count integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table subscriptions enable row level security;

-- Create policies
create policy "Users can view their own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Admins can view all subscriptions"
  on subscriptions for select
  using (is_admin());
```

### Deployment

The API is designed to be deployed on Render.com:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Auto Deploy**: Yes

## API Examples

### Image Generation Examples

#### Generate a Text-to-Image

```bash
curl -X POST https://api.orincore-ai-studio.com/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "A beautiful mountain landscape with a lake at sunrise",
    "negativePrompt": "ugly, blurry, low quality",
    "generationType": "GENERAL",
    "resolution": "LANDSCAPE",
    "cfgScale": 7,
    "steps": 30,
    "style": "photographic",
    "numberOfImages": 1
  }'
```

#### Generate a Logo

```bash
curl -X POST https://api.orincore-ai-studio.com/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Modern logo for a tech company called Quantum",
    "negativePrompt": "text, words, letters, complex, busy",
    "generationType": "LOGO",
    "resolution": "SQUARE",
    "cfgScale": 7,
    "steps": 30,
    "style": "digital-art",
    "numberOfImages": 1
  }'
```

#### Generate a Wallpaper

```bash
curl -X POST https://api.orincore-ai-studio.com/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Futuristic city skyline at night with neon lights",
    "negativePrompt": "ugly, blurry, low quality",
    "generationType": "WALLPAPER",
    "resolution": "WALLPAPER_HD",
    "cfgScale": 7,
    "steps": 30,
    "style": "neon-punk",
    "numberOfImages": 1
  }'
```

#### Get Style Suggestions

```bash
curl -X POST https://api.orincore-ai-studio.com/api/images/suggest-styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "A portrait of a young woman in a garden"
  }'
```

#### Get Available Options

```bash
curl -X GET https://api.orincore-ai-studio.com/api/images/options \
  -H "Authorization: Bearer YOUR_TOKEN"
```