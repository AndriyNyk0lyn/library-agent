// Initial migration contract. Regenerate with the Supabase CLI after applying schema changes.
export type LibraryBookRow = {
  id: string;
  user_id: string;
  title: string;
  authors: string[];
  status: "want_to_read" | "reading" | "finished" | "dropped";
  rating: number | null;
  owned: boolean | null;
  notes: string;
  page_count: number | null;
  version: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      library_books: {
        Row: LibraryBookRow;
        Insert: Omit<LibraryBookRow, "version" | "created_at"> & {
          version?: number;
          created_at?: string;
        };
        Update: Partial<LibraryBookRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
