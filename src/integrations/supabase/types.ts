export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_unlocks: {
        Row: {
          book_id: string
          created_at: string
          id: string
          part_number: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          part_number: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          part_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_unlocks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      app_installs: {
        Row: {
          anon_id: string | null
          created_at: string
          id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      book_orders: {
        Row: {
          amount: number
          book_id: string | null
          buyer_msisdn: string | null
          created_at: string
          id: string
          mobile_number: string | null
          payer_phone: string | null
          provider: string | null
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          book_id?: string | null
          buyer_msisdn?: string | null
          created_at?: string
          id?: string
          mobile_number?: string | null
          payer_phone?: string | null
          provider?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          book_id?: string | null
          buyer_msisdn?: string | null
          created_at?: string
          id?: string
          mobile_number?: string | null
          payer_phone?: string | null
          provider?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_part_view_log: {
        Row: {
          created_at: string
          id: string
          part_id: string
          viewed_on: string
          viewer_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          part_id: string
          viewed_on?: string
          viewer_key: string
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string
          viewed_on?: string
          viewer_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_part_view_log_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "book_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_part_view_log_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "book_parts_meta"
            referencedColumns: ["id"]
          },
        ]
      }
      book_parts: {
        Row: {
          book_id: string
          content: string | null
          created_at: string
          id: string
          part_number: number
          status: string
          title: string | null
          views: number
        }
        Insert: {
          book_id: string
          content?: string | null
          created_at?: string
          id?: string
          part_number: number
          status?: string
          title?: string | null
          views?: number
        }
        Update: {
          book_id?: string
          content?: string | null
          created_at?: string
          id?: string
          part_number?: number
          status?: string
          title?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_parts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_ratings: {
        Row: {
          book_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_ratings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_uploads: {
        Row: {
          author_name: string | null
          book_id: string | null
          category_id: string | null
          content: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_new_part: boolean
          part_number: number | null
          price: number
          status: string
          title: string | null
          uploader_profile_id: string | null
          user_id: string
        }
        Insert: {
          author_name?: string | null
          book_id?: string | null
          category_id?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_new_part?: boolean
          part_number?: number | null
          price?: number
          status?: string
          title?: string | null
          uploader_profile_id?: string | null
          user_id: string
        }
        Update: {
          author_name?: string | null
          book_id?: string | null
          category_id?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_new_part?: boolean
          part_number?: number | null
          price?: number
          status?: string
          title?: string | null
          uploader_profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_uploads_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_uploads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          ads_disabled: boolean
          author: string | null
          blocked: boolean
          category_id: string | null
          content: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          is_new: boolean
          pages: number | null
          price: number
          rating: number | null
          title: string
          updated_at: string
          uploader_id: string | null
        }
        Insert: {
          ads_disabled?: boolean
          author?: string | null
          blocked?: boolean
          category_id?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_new?: boolean
          pages?: number | null
          price?: number
          rating?: number | null
          title: string
          updated_at?: string
          uploader_id?: string | null
        }
        Update: {
          ads_disabled?: boolean
          author?: string | null
          blocked?: boolean
          category_id?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_new?: boolean
          pages?: number | null
          price?: number
          rating?: number | null
          title?: string
          updated_at?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          id: string
          matched: boolean
          note: string | null
          order_id: string | null
          parsed_amount: number | null
          parsed_reference: string | null
          parsed_sender: string | null
          parsed_txid: string | null
          provider: string | null
          raw_sms: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          matched?: boolean
          note?: string | null
          order_id?: string | null
          parsed_amount?: number | null
          parsed_reference?: string | null
          parsed_sender?: string | null
          parsed_txid?: string | null
          provider?: string | null
          raw_sms?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          matched?: boolean
          note?: string | null
          order_id?: string | null
          parsed_amount?: number | null
          parsed_reference?: string | null
          parsed_sender?: string | null
          parsed_txid?: string | null
          provider?: string | null
          raw_sms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "book_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          bkash_number: string
          bkash_qr_url: string | null
          created_at: string
          id: string
          is_active: boolean
          provider: string | null
        }
        Insert: {
          bkash_number: string
          bkash_qr_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string | null
        }
        Update: {
          bkash_number?: string
          bkash_qr_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bkash_number: string | null
          created_at: string
          email: string | null
          facebook_id: string | null
          facebook_page: string | null
          hometown: string | null
          id: string
          is_blocked: boolean
          is_writer: boolean
          mobile_number: string | null
          name: string | null
          updated_at: string
          village: string | null
          writer_blocked: boolean
        }
        Insert: {
          avatar_url?: string | null
          bkash_number?: string | null
          created_at?: string
          email?: string | null
          facebook_id?: string | null
          facebook_page?: string | null
          hometown?: string | null
          id: string
          is_blocked?: boolean
          is_writer?: boolean
          mobile_number?: string | null
          name?: string | null
          updated_at?: string
          village?: string | null
          writer_blocked?: boolean
        }
        Update: {
          avatar_url?: string | null
          bkash_number?: string | null
          created_at?: string
          email?: string | null
          facebook_id?: string | null
          facebook_page?: string | null
          hometown?: string | null
          id?: string
          is_blocked?: boolean
          is_writer?: boolean
          mobile_number?: string | null
          name?: string | null
          updated_at?: string
          village?: string | null
          writer_blocked?: boolean
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          book_id: string
          id: string
          last_part: number
          last_read_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          id?: string
          last_part?: number
          last_read_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          id?: string
          last_part?: number
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          note: string | null
          payout_number: string | null
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          payout_number?: string | null
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          payout_number?: string | null
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      writer_applications: {
        Row: {
          created_at: string
          facebook_id: string | null
          facebook_page: string | null
          hometown: string | null
          id: string
          mobile_number: string | null
          name: string | null
          status: string
          user_id: string
          village: string | null
        }
        Insert: {
          created_at?: string
          facebook_id?: string | null
          facebook_page?: string | null
          hometown?: string | null
          id?: string
          mobile_number?: string | null
          name?: string | null
          status?: string
          user_id: string
          village?: string | null
        }
        Update: {
          created_at?: string
          facebook_id?: string | null
          facebook_page?: string | null
          hometown?: string | null
          id?: string
          mobile_number?: string | null
          name?: string | null
          status?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      book_parts_meta: {
        Row: {
          book_id: string | null
          id: string | null
          part_number: number | null
          title: string | null
          views: number | null
        }
        Insert: {
          book_id?: string | null
          id?: string | null
          part_number?: number | null
          title?: string | null
          views?: number | null
        }
        Update: {
          book_id?: string | null
          id?: string | null
          part_number?: number | null
          title?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "book_parts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      public_writer_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          is_writer: boolean | null
          name: string | null
          writer_blocked: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          is_writer?: boolean | null
          name?: string | null
          writer_blocked?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          is_writer?: boolean | null
          name?: string | null
          writer_blocked?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_part_view: {
        Args: { p_part_id: string; p_viewer_key: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
