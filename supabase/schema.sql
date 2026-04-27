-- ============================================
-- Quest Tracker — Supabase Database Schema
-- ============================================

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#7c3aed',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'admin')),
  promo_code_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'daily' CHECK (type IN ('daily', 'weekly', 'monthly', 'deadline', 'bonus', 'limit')),
  icon TEXT NOT NULL DEFAULT 'Star',
  category TEXT NOT NULL DEFAULT 'Інше',
  enabled BOOLEAN NOT NULL DEFAULT true,
  target INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER NOT NULL DEFAULT 1,
  penalty_points INTEGER NOT NULL DEFAULT 0,
  bonus_tiers JSONB NOT NULL DEFAULT '[]',
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Completions table (separate for efficient queries)
CREATE TABLE public.completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, date)
);

-- 4. Promo codes table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'suggestion' CHECK (type IN ('suggestion', 'bug', 'complaint', 'other')),
  message TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS)
-- Each user can only access their own data
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Tasks: users can CRUD their own tasks
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Completions: users can CRUD their own completions
CREATE POLICY "Users can view own completions"
  ON public.completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own completions"
  ON public.completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON public.completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON public.completions FOR DELETE
  USING (auth.uid() = user_id);

-- Feedback: anyone can insert, only admins can read all
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Promo codes: readable by all authenticated users
CREATE POLICY "Authenticated users can read promo codes"
  ON public.promo_codes FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    '#7c3aed'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_completions_task_id ON public.completions(task_id);
CREATE INDEX idx_completions_user_date ON public.completions(user_id, date);
CREATE INDEX idx_completions_date ON public.completions(date);
CREATE INDEX idx_feedback_created ON public.feedback(created_at DESC);

-- ============================================
-- Insert default promo code for testing
-- ============================================
INSERT INTO public.promo_codes (code, is_free, max_uses)
VALUES ('QUEST2026', true, 1000);

-- ============================================
-- Cloud Sync Table (Local-First Architecture)
-- ============================================
CREATE TABLE public.cloud_sync (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  tasks_data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, profile_id)
);

ALTER TABLE public.cloud_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync data"
  ON public.cloud_sync
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

