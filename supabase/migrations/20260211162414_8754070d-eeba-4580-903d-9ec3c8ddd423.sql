
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE

-- community_posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.community_posts;
DROP POLICY IF EXISTS "Auth users can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;

CREATE POLICY "Anyone can view posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Auth users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);

-- community_replies
DROP POLICY IF EXISTS "Anyone can view replies" ON public.community_replies;
DROP POLICY IF EXISTS "Auth users can create replies" ON public.community_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON public.community_replies;

CREATE POLICY "Anyone can view replies" ON public.community_replies FOR SELECT USING (true);
CREATE POLICY "Auth users can create replies" ON public.community_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.community_replies FOR DELETE USING (auth.uid() = user_id);

-- chapter_comments
DROP POLICY IF EXISTS "Anyone can view chapter comments" ON public.chapter_comments;
DROP POLICY IF EXISTS "Auth users can insert comments" ON public.chapter_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.chapter_comments;

CREATE POLICY "Anyone can view chapter comments" ON public.chapter_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert comments" ON public.chapter_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.chapter_comments FOR DELETE USING (auth.uid() = user_id);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Add view_count to manhwas for trending/most read
ALTER TABLE public.manhwas ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
