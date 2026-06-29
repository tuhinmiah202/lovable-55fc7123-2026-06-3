// Types only - no demo data
export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  price: number;
  category: string;
  category_id: string | null;
  description: string;
  content: string;
  featured: boolean;
  is_new: boolean;
  pages: number;
  rating: number;
  uploader_id: string | null;
  ads_disabled?: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface BookUpload {
  id: string;
  user_id: string;
  title: string;
  author_name: string;
  description: string;
  content: string;
  file_url: string | null;
  cover_url: string | null;
  category_id: string | null;
  price: number;
  status: string;
  created_at: string;
}
