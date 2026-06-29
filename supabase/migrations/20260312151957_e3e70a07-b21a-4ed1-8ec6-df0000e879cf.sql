
-- Create book_parts table for storing individual parts (পর্ব) of a book
CREATE TABLE public.book_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  part_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'approved',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(book_id, part_number)
);

-- Enable RLS
ALTER TABLE public.book_parts ENABLE ROW LEVEL SECURITY;

-- Parts are publicly readable (same as books)
CREATE POLICY "Book parts are public" ON public.book_parts
  AS PERMISSIVE FOR SELECT USING (true);

-- Admins can manage parts
CREATE POLICY "Admins can manage book parts" ON public.book_parts
  AS PERMISSIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Writers can insert parts for their own books (pending approval)
CREATE POLICY "Writers can insert parts" ON public.book_parts
  AS PERMISSIVE FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND uploader_id = auth.uid())
  );

-- Updated_at trigger
CREATE TRIGGER update_book_parts_updated_at
  BEFORE UPDATE ON public.book_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add columns to book_uploads for part-based uploads and adding parts to existing books
ALTER TABLE public.book_uploads ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE CASCADE DEFAULT NULL;
ALTER TABLE public.book_uploads ADD COLUMN IF NOT EXISTS part_number integer DEFAULT NULL;
ALTER TABLE public.book_uploads ADD COLUMN IF NOT EXISTS is_new_part boolean DEFAULT false;
ALTER TABLE public.book_uploads ADD COLUMN IF NOT EXISTS uploader_profile_id uuid REFERENCES public.profiles(id) DEFAULT NULL;
