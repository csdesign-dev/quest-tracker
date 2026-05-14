-- ============================================
-- Quest Tracker — Family System Schema (Phase 2)
-- ============================================

-- 3. Family tasks table (Tasks assigned by one member to another)
CREATE TABLE public.family_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  task_name TEXT NOT NULL,
  task_data JSONB NOT NULL DEFAULT '{}',
  parental_control BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Family approvals table (Tracking completions of family tasks)
CREATE TABLE public.family_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_task_id UUID NOT NULL REFERENCES public.family_tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completion_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_task_id, date)
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.family_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_approvals ENABLE ROW LEVEL SECURITY;

-- Family Tasks: Members can view tasks in their families
CREATE POLICY "Members can view family tasks"
  ON public.family_tasks FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- Family Tasks: Members can create tasks in their families
CREATE POLICY "Members can create family tasks"
  ON public.family_tasks FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Family Tasks: Creator or parent can delete tasks
CREATE POLICY "Creator or parent can delete tasks"
  ON public.family_tasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role = 'parent'
    )
  );

-- Family Approvals: Members can view approvals in their families
CREATE POLICY "Members can view family approvals"
  ON public.family_approvals FOR SELECT
  USING (
    family_task_id IN (
      SELECT id FROM public.family_tasks WHERE family_id IN (
        SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
      )
    )
  );

-- Family Approvals: Assignee can create/update their own approvals (to submit for review)
CREATE POLICY "Assignee can submit approvals"
  ON public.family_approvals FOR INSERT
  WITH CHECK (
    family_task_id IN (
      SELECT id FROM public.family_tasks WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Assignee can update their approvals"
  ON public.family_approvals FOR UPDATE
  USING (
    family_task_id IN (
      SELECT id FROM public.family_tasks WHERE assigned_to = auth.uid()
    )
  );

-- Family Approvals: Parents can update approvals (to approve/reject)
CREATE POLICY "Parents can review approvals"
  ON public.family_approvals FOR UPDATE
  USING (
    family_task_id IN (
      SELECT id FROM public.family_tasks WHERE family_id IN (
        SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role = 'parent'
      )
    )
  );

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_family_tasks_family_id ON public.family_tasks(family_id);
CREATE INDEX idx_family_tasks_assigned_to ON public.family_tasks(assigned_to);
CREATE INDEX idx_family_approvals_task_id ON public.family_approvals(family_task_id);
CREATE INDEX idx_family_approvals_date ON public.family_approvals(date);
CREATE INDEX idx_family_approvals_status ON public.family_approvals(status);
