import type { SavedPlan } from "@/plans/schema";

// Reviewed public contracts through optional_open_library; old mutation outcomes may omit catalog metadata.
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
  catalog_metadata?: Json | null;
  isbn10: string | null;
  isbn13: string | null;
  goodreads_book_id: string | null;
  imported_shelves: string[];
  goodreads_date_added: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  version: number;
  created_at: string;
};

export type ReaderProfileRow = {
  user_id: string;
  preferences: string;
  pages_per_hour: number | null;
  daily_reading_minutes: number | null;
  timezone: string | null;
  version: number;
  updated_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type BookMetadata =
  | "catalog_metadata"
  | "isbn10"
  | "isbn13"
  | "goodreads_book_id"
  | "imported_shelves"
  | "goodreads_date_added"
  | "started_at"
  | "finished_at"
  | "updated_at";

export type Database = {
  public: {
    Tables: {
      reading_plans: {
        Row: SavedPlan & { user_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      reader_profiles: {
        Row: ReaderProfileRow;
        // Profile writes are available only through the versioned RPC.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      library_books: {
        Row: LibraryBookRow;
        Insert: Omit<LibraryBookRow, "version" | "created_at" | BookMetadata> &
          Partial<Pick<LibraryBookRow, BookMetadata>> & {
            version?: number;
            created_at?: string;
          };
        Update: Partial<
          Pick<
            LibraryBookRow,
            | "status"
            | "rating"
            | "owned"
            | "notes"
            | "page_count"
            | "started_at"
            | "finished_at"
          >
        >;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      preview_library_update: { Args: { p_input: Json }; Returns: Json };
      apply_library_update: {
        Args: { p_preview_id: string; p_operation_id: string };
        Returns: Json;
      };
      add_catalog_book: {
        Args: { p_input: Json; p_candidate: Json };
        Returns: Json;
      };
      save_reading_plan: { Args: { p_input: Json }; Returns: Json };
      list_reading_plans: {
        Args: {
          p_book_id?: string;
          p_status?: string;
          p_limit?: number;
          p_before_created_at?: string;
          p_before_id?: string;
        };
        Returns: Json;
      };
      get_reader_profile: { Args: Record<string, never>; Returns: Json };
      update_reader_profile: {
        Args: {
          p_expected_version: number;
          p_operation_id: string;
          p_patch: Json;
        };
        Returns: Json;
      };
      create_chat_conversation: { Args: { p_id: string }; Returns: Json };
      list_chat_conversations: {
        Args: { p_as_of?: string; p_before_at?: string; p_before_id?: string };
        Returns: Json;
      };
      chat_snapshot: {
        Args: {
          p_conversation_id: string;
          p_before_at?: string;
          p_before_id?: string;
        };
        Returns: Json;
      };
      agent_history: { Args: { p_conversation_id: string }; Returns: Json };
      start_agent_run: {
        Args: {
          p_conversation_id: string;
          p_id: string;
          p_input: string;
          p_model: string;
          p_key: string;
        };
        Returns: Json;
      };
      record_agent_activity: {
        Args: { p_id: string; p_activity: Json; p_key: string };
        Returns: boolean;
      };
      finish_agent_run: {
        Args: {
          p_id: string;
          p_status: string;
          p_answer: string | null;
          p_cards: Json;
          p_history: Json;
          p_error: string | null;
          p_usage: Json;
          p_key: string;
          p_plans?: Json;
        };
        Returns: boolean;
      };
      update_library_book: {
        Args: {
          p_id: string;
          p_expected_version: number;
          p_operation_id: string;
          p_patch: Json;
        };
        Returns: Json;
      };
      import_library_batch: {
        Args: { p_rows: Json; p_confirm: boolean };
        Returns: Json;
      };
      search_library_books: {
        Args: {
          p_query?: string;
          p_status?: string;
          p_owned?: boolean;
          p_limit?: number;
          p_offset?: number;
          p_before_created_at?: string;
          p_before_id?: string;
        };
        Returns: LibraryBookRow[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
