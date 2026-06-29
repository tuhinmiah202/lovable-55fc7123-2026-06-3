-- Create writer_applications table
CREATE TABLE public.writer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  mobile_number text NOT NULL DEFAULT '',
  hometown text NOT NULL DEFAULT '',
  village text NOT NULL DEFAULT '',
  facebook_page text DEFAULT '',
  facebook_id text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hometown text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS village text DEFAULT '';

-- Enable RLS
ALTER TABLE public.writer_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for writer_applications
CREATE POLICY "Users can read own application" ON public.writer_applications
  AS PERMISSIVE FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all applications" ON public.writer_applications
  AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own application" ON public.writer_applications
  AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending application" ON public.writer_applications
  AS PERMISSIVE FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update applications" ON public.writer_applications
  AS PERMISSIVE FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own pending application" ON public.writer_applications
  AS PERMISSIVE FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can delete applications" ON public.writer_applications
  AS PERMISSIVE FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_writer_applications_updated_at
  BEFORE UPDATE ON public.writer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();