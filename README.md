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

### AI Image Generation

| Method | Endpoint                | Description                                           | Access      |
|--------|-------------------------|-------------------------------------------------------|-------------|
| POST   | `/api/ai/thumbnails`    | Generate YouTube thumbnail                            | Protected   |
| POST   | `/api/ai/posters`       | Generate poster                                       | Protected   |
| POST   | `/api/ai/images`        | Generate custom image                                 | Protected   |
| GET    | `/api/ai/history`       | Get generation history                                | Protected   |

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

| Type | Description | Default Resolution |
|------|-------------|-------------------|
| 🎨 AI Art Generator | Text-to-Image generation (Stable Diffusion) | Normal (512x512) |
| 🔥 AI Anime Generator | Anime style generations | Normal (512x512) |
| 🏞 AI Realistic Generator | Real-life like generations | HD (768x768) |
| 🐾 AI Logo Maker | Business / brand logos | Logo (512x512) |
| 📊 AI Poster Creator | Professional posters | Poster Landscape (1280x720) |
| 🎯 AI Thumbnail Creator | YouTube/Blog thumbnails | Thumbnail YouTube (1280x720) |
| 💡 AI Concept Generator | Unique artistic ideas | HD (768x768) |
| 🎮 AI Game Character Generator | Gaming avatars & characters | HD (768x768) |
| 📸 AI Product Image Generator | Ecommerce product shots | Product (1024x1024) |
| 🌌 AI Fantasy Art Generator | Sci-fi & fantasy world art | HD (768x768) |

Each generation type has specialized prompts and settings to produce optimal results for that category.

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
   - **Build Command**: `