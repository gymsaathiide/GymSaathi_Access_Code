
-- Create meals_breakfast table in Supabase
CREATE TABLE IF NOT EXISTS meals_breakfast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT,
  protein DECIMAL(6,2) NOT NULL,
  carbs DECIMAL(6,2) NOT NULL,
  fats DECIMAL(6,2) NOT NULL,
  calories DECIMAL(6,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('veg', 'eggetarian', 'non-veg')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_meals_breakfast_category ON meals_breakfast(category);

-- Enable RLS (Row Level Security)
ALTER TABLE meals_breakfast ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read
CREATE POLICY "Allow all authenticated users to read breakfast meals"
  ON meals_breakfast
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow admins to modify
CREATE POLICY "Allow admins to modify breakfast meals"
  ON meals_breakfast
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
