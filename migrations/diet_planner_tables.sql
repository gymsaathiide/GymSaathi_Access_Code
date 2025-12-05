-- Diet Planner Tables Migration
-- Run this in your Supabase SQL Editor

-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- Body Composition Reports
-- ============================================
CREATE TABLE IF NOT EXISTS public.body_composition_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_date TIMESTAMP WITH TIME ZONE,
  
  weight DECIMAL(5,2),
  bmi DECIMAL(4,2),
  body_fat_percentage DECIMAL(4,2),
  
  fat_mass DECIMAL(5,2),
  fat_free_body_weight DECIMAL(5,2),
  muscle_mass DECIMAL(5,2),
  muscle_rate DECIMAL(4,2),
  skeletal_muscle DECIMAL(5,2),
  bone_mass DECIMAL(5,2),
  protein_mass DECIMAL(5,2),
  protein DECIMAL(5,2),
  water_weight DECIMAL(5,2),
  body_water DECIMAL(4,2),
  subcutaneous_fat DECIMAL(5,2),
  visceral_fat DECIMAL(5,2),
  bmr INTEGER,
  body_age INTEGER,
  ideal_body_weight DECIMAL(5,2),
  
  weight_status TEXT,
  bmi_status TEXT,
  body_fat_status TEXT,
  fat_mass_status TEXT,
  fat_free_body_weight_status TEXT,
  muscle_mass_status TEXT,
  muscle_rate_status TEXT,
  skeletal_muscle_status TEXT,
  bone_mass_status TEXT,
  protein_mass_status TEXT,
  protein_status TEXT,
  water_weight_status TEXT,
  body_water_status TEXT,
  subcutaneous_fat_status TEXT,
  visceral_fat_status TEXT,
  bmr_status TEXT,
  body_age_status TEXT,
  ideal_body_weight_status TEXT,
  
  user_name TEXT,
  raw_text TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_composition_user ON public.body_composition_reports(user_id);

-- ============================================
-- Diet Plans
-- ============================================
CREATE TABLE IF NOT EXISTS public.diet_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('7-day', '30-day')),
  goal TEXT NOT NULL,
  total_calories INTEGER,
  total_protein DECIMAL(6,2),
  total_carbs DECIMAL(6,2),
  total_fats DECIMAL(6,2),
  source_type TEXT DEFAULT 'ai' CHECK (source_type IN ('ai', 'catalog', 'catalog_fallback')),
  ai_model TEXT,
  prompt_version TEXT DEFAULT 'v1',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diet_plans_user ON public.diet_plans(user_id);

-- ============================================
-- Meals (individual meals in diet plans)
-- ============================================
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diet_plan_id UUID NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name TEXT NOT NULL,
  name_hindi TEXT,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  calories INTEGER NOT NULL,
  protein DECIMAL(5,2) NOT NULL,
  carbs DECIMAL(5,2) NOT NULL,
  fats DECIMAL(5,2) NOT NULL,
  vitamins TEXT,
  portion_size TEXT,
  meal_timing TEXT,
  recipe_instructions TEXT[],
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  difficulty_level TEXT,
  servings INTEGER DEFAULT 1,
  substitutes JSONB DEFAULT '[]'::jsonb,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_fasting_friendly BOOLEAN DEFAULT false,
  no_onion_garlic BOOLEAN DEFAULT false,
  cuisine TEXT DEFAULT 'indian',
  region TEXT,
  festival_tags TEXT[],
  source_type TEXT DEFAULT 'ai' CHECK (source_type IN ('ai', 'catalog')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meals_diet_plan ON public.meals(diet_plan_id);

-- ============================================
-- Nutrition Preferences
-- ============================================
CREATE TABLE IF NOT EXISTS public.nutrition_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal TEXT CHECK (goal IN ('gain-mass', 'fat-loss')),
  diet_type TEXT DEFAULT 'non-veg',
  selected_categories TEXT[] DEFAULT '{}',
  selected_varieties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_preferences_user ON public.nutrition_preferences(user_id);

-- ============================================
-- Workout Plans
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'moderate', 'stronger')),
  equipment TEXT[] NOT NULL DEFAULT '{}',
  goal TEXT,
  duration_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON public.workout_plans(user_id);

-- ============================================
-- Workout Exercises
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('warm-up', 'strength', 'hiit', 'cardio', 'core', 'mobility', 'stretching')),
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps TEXT,
  duration_minutes INTEGER,
  rest_seconds INTEGER,
  muscles_targeted TEXT[] NOT NULL DEFAULT '{}',
  form_instructions TEXT,
  mistakes_to_avoid TEXT[] NOT NULL DEFAULT '{}',
  tips TEXT[] NOT NULL DEFAULT '{}',
  illustration_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_plan ON public.workout_exercises(workout_plan_id);

-- ============================================
-- Daily Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  eaten_meals JSONB DEFAULT '[]'::jsonb,
  manual_calories INTEGER DEFAULT 0,
  manual_protein NUMERIC DEFAULT 0,
  manual_carbs NUMERIC DEFAULT 0,
  manual_fats NUMERIC DEFAULT 0,
  completed_exercises JSONB DEFAULT '[]'::jsonb,
  water_glasses INTEGER DEFAULT 0,
  steps INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tracking_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date ON public.daily_tracking(user_id, tracking_date);

-- ============================================
-- Food Sources
-- ============================================
CREATE TABLE IF NOT EXISTS public.food_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.food_sources (source_name, description) VALUES
  ('fatsecret', 'Foods from FatSecret API'),
  ('transform_curated', 'Curated meals from Transform database'),
  ('manual', 'User manually entered foods')
ON CONFLICT (source_name) DO NOTHING;

-- ============================================
-- User Foods
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.food_sources(id),
  fatsecret_food_id TEXT,
  serving_id TEXT,
  name TEXT NOT NULL,
  name_hindi TEXT,
  brand TEXT,
  serving_description TEXT,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  sodium NUMERIC DEFAULT 0,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_custom BOOLEAN DEFAULT false,
  image_url TEXT,
  raw_source JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_foods_user_id ON public.user_foods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_foods_fatsecret_id ON public.user_foods(fatsecret_food_id);

-- ============================================
-- Meal Logs
-- ============================================
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  user_food_id UUID REFERENCES public.user_foods(id),
  quantity NUMERIC DEFAULT 1,
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_logs_meal_type ON public.meal_logs(meal_type);

-- ============================================
-- Daily Recommendations
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recommendations JSONB NOT NULL DEFAULT '[]',
  diet_goal TEXT,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_recommendations_user_date ON public.daily_recommendations(user_id, date);

-- ============================================
-- Strength Records
-- ============================================
CREATE TABLE IF NOT EXISTS public.strength_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  one_rep_max NUMERIC NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strength_records_user_exercise ON public.strength_records(user_id, exercise_name, recorded_at DESC);

-- ============================================
-- Exercise Library
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_name TEXT NOT NULL,
  equipment TEXT NOT NULL CHECK (equipment IN ('dumbbells', 'barbell', 'machines', 'kettlebell', 'resistance-bands', 'bodyweight')),
  level TEXT NOT NULL CHECK (level IN ('beginner', 'moderate', 'stronger')),
  session_type TEXT NOT NULL CHECK (session_type IN ('warm-up', 'strength', 'hiit', 'cardio', 'core', 'mobility', 'stretching')),
  muscles_targeted TEXT[] NOT NULL DEFAULT '{}',
  sets INTEGER,
  reps TEXT,
  duration_minutes INTEGER,
  rest_seconds INTEGER,
  form_instructions TEXT NOT NULL,
  mistakes_to_avoid TEXT[] NOT NULL DEFAULT '{}',
  tips TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_equipment ON exercise_library(equipment);
CREATE INDEX IF NOT EXISTS idx_exercise_library_level ON exercise_library(level);
CREATE INDEX IF NOT EXISTS idx_exercise_library_session_type ON exercise_library(session_type);
CREATE INDEX IF NOT EXISTS idx_exercise_library_equipment_level ON exercise_library(equipment, level);

-- ============================================
-- Update Triggers
-- ============================================
DROP TRIGGER IF EXISTS update_body_composition_reports_updated_at ON public.body_composition_reports;
CREATE TRIGGER update_body_composition_reports_updated_at
BEFORE UPDATE ON public.body_composition_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_diet_plans_updated_at ON public.diet_plans;
CREATE TRIGGER update_diet_plans_updated_at
BEFORE UPDATE ON public.diet_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nutrition_preferences_updated_at ON public.nutrition_preferences;
CREATE TRIGGER update_nutrition_preferences_updated_at
BEFORE UPDATE ON public.nutrition_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_plans_updated_at ON public.workout_plans;
CREATE TRIGGER update_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_tracking_updated_at ON public.daily_tracking;
CREATE TRIGGER update_daily_tracking_updated_at
BEFORE UPDATE ON public.daily_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_recommendations_updated_at ON public.daily_recommendations;
CREATE TRIGGER update_daily_recommendations_updated_at
BEFORE UPDATE ON public.daily_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
