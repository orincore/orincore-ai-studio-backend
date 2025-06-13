-- Images table for storing generated images
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  negative_prompt TEXT,
  generation_type TEXT NOT NULL,
  model_id TEXT,
  resolution TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  cfg_scale NUMERIC(4, 1) NOT NULL,
  steps INTEGER NOT NULL,
  style TEXT,
  seed BIGINT,
  finish_reason TEXT,
  cloudinary_url TEXT NOT NULL,
  cloudinary_original_url TEXT,
  cloudinary_public_id TEXT NOT NULL,
  credit_cost INTEGER NOT NULL DEFAULT 0,
  has_watermark BOOLEAN DEFAULT FALSE,
  is_free_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_free_generation BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own images"
  ON images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all images"
  ON images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS images_user_id_idx ON images(user_id);
CREATE INDEX IF NOT EXISTS images_created_at_idx ON images(created_at);
CREATE INDEX IF NOT EXISTS images_generation_type_idx ON images(generation_type); 