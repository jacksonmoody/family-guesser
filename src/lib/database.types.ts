export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      people: {
        Row: {
          id: string;
          name: string;
          gender: "female" | "male" | "other";
          attending: boolean;
          photo_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          gender?: "female" | "male" | "other";
          attending?: boolean;
          photo_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          gender?: "female" | "male" | "other";
          attending?: boolean;
          photo_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      parent_links: {
        Row: {
          parent_id: string;
          child_id: string;
        };
        Insert: {
          parent_id: string;
          child_id: string;
        };
        Update: {
          parent_id?: string;
          child_id?: string;
        };
        Relationships: [];
      };
      spouses: {
        Row: {
          person1_id: string;
          person2_id: string;
        };
        Insert: {
          person1_id: string;
          person2_id: string;
        };
        Update: {
          person1_id?: string;
          person2_id?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          person1_id: string;
          person2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          person1_id: string;
          person2_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          person1_id?: string;
          person2_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          id: string;
          team_id: string;
          hard_mode: boolean;
          started_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          hard_mode?: boolean;
          started_at?: string;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          hard_mode?: boolean;
          started_at?: string;
          ends_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "runs_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          run_id: string;
          tier: "easy" | "medium" | "hard";
          person_a: string;
          person_b: string;
          expected_label_ab: string;
          expected_label_ba: string;
          distance: number;
          answer_text: string | null;
          canonical_answer: string | null;
          matched_via: "exact" | "synonym" | "llm" | null;
          verdict: "correct" | "incorrect" | "skipped" | null;
          points: number;
          created_at: string;
          answered_at: string | null;
        };
        Insert: {
          id?: string;
          run_id: string;
          tier: "easy" | "medium" | "hard";
          person_a: string;
          person_b: string;
          expected_label_ab: string;
          expected_label_ba: string;
          distance: number;
          answer_text?: string | null;
          canonical_answer?: string | null;
          matched_via?: "exact" | "synonym" | "llm" | null;
          verdict?: "correct" | "incorrect" | "skipped" | null;
          points?: number;
          created_at?: string;
          answered_at?: string | null;
        };
        Update: {
          id?: string;
          run_id?: string;
          tier?: "easy" | "medium" | "hard";
          person_a?: string;
          person_b?: string;
          expected_label_ab?: string;
          expected_label_ba?: string;
          distance?: number;
          answer_text?: string | null;
          canonical_answer?: string | null;
          matched_via?: "exact" | "synonym" | "llm" | null;
          verdict?: "correct" | "incorrect" | "skipped" | null;
          points?: number;
          created_at?: string;
          answered_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_person_a_fkey";
            columns: ["person_a"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_person_b_fkey";
            columns: ["person_b"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          id: string;
          name: string;
          person1_id: string;
          person2_id: string;
          score: number | null;
          correct_count: number | null;
          hard_mode: boolean | null;
          last_answered_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
