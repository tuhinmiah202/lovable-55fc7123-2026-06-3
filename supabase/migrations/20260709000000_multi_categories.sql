
-- Add support for multiple categories to books and book_uploads
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category_ids UUID[] DEFAULT '{}';
ALTER TABLE public.book_uploads ADD COLUMN IF NOT EXISTS category_ids UUID[] DEFAULT '{}';

-- Migration: Copy existing category_id to the new category_ids array
UPDATE public.books SET category_ids = ARRAY[category_id] WHERE category_id IS NOT NULL AND (category_ids IS NULL OR cardinality(category_ids) = 0);
UPDATE public.book_uploads SET category_ids = ARRAY[category_id] WHERE category_id IS NOT NULL AND (category_ids IS NULL OR cardinality(category_ids) = 0);

-- Update RLS or other logic if necessary (usually standard for new columns)
