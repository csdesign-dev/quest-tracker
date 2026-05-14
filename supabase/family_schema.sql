-- ============================================
-- Quest Tracker — Family System Schema (Phase 1)
-- ============================================

-- 1. Families table
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Моя сім''я',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Family members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('parent', 'child', 'member')),
  nickname TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Families: members can view their own families
CREATE POLICY "Members can view their families"
  ON public.families FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Families: only authenticated users can create
CREATE POLICY "Users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Families: only creator can update
CREATE POLICY "Creator can update family"
  ON public.families FOR UPDATE
  USING (auth.uid() = created_by);

-- Families: only creator can delete
CREATE POLICY "Creator can delete family"
  ON public.families FOR DELETE
  USING (auth.uid() = created_by);

-- Family Members: members can view other members in their families
CREATE POLICY "Members can view family members"
  ON public.family_members FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members AS fm WHERE fm.user_id = auth.uid()
    )
  );

-- Family Members: anyone can join (insert themselves) via invite code
CREATE POLICY "Users can join families"
  ON public.family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Family Members: parents can update roles of members in their family
CREATE POLICY "Parents can update members"
  ON public.family_members FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members AS fm
      WHERE fm.user_id = auth.uid() AND fm.role = 'parent'
    )
  );

-- Family Members: parents can remove members, members can leave
CREATE POLICY "Parents can remove or self-leave"
  ON public.family_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR family_id IN (
      SELECT family_id FROM public.family_members AS fm
      WHERE fm.user_id = auth.uid() AND fm.role = 'parent'
    )
  );

-- ============================================
-- Allow family members to read each other's cloud_sync data
-- ============================================
CREATE POLICY "Family members can view each other sync data"
  ON public.cloud_sync FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT fm2.user_id FROM public.family_members AS fm1
      JOIN public.family_members AS fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id != auth.uid()
    )
  );

-- ============================================
-- Allow family members to read each other's profiles
-- ============================================
CREATE POLICY "Family members can view each other profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR id IN (
      SELECT fm2.user_id FROM public.family_members AS fm1
      JOIN public.family_members AS fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() AND fm2.user_id != auth.uid()
    )
  );

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_families_created_by ON public.families(created_by);
CREATE INDEX idx_families_invite_code ON public.families(invite_code);
CREATE INDEX idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
