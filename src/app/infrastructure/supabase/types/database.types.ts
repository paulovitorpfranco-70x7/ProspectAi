export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      lead_outreach_events: {
        Row: {
          id: string
          lead_id: string
          rendered_message: string
          sent_at: string
          stage: string
          variant: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          rendered_message: string
          sent_at?: string
          stage: string
          variant?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          rendered_message?: string
          sent_at?: string
          stage?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_outreach_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ab_variant: string | null
          address: string | null
          bairro: string | null
          business_name: string
          city: string
          city_normalized: string
          contact_count: number
          created_at: string
          created_by: string | null
          current_stage: string | null
          email: string | null
          google_place_id: string | null
          has_website: boolean
          id: string
          instagram_handle: string | null
          last_contact_at: string | null
          lead_score: number
          next_followup_at: string | null
          notes: string
          opening_hours: Json | null
          phone_digits: string | null
          preview_last_viewed_at: string | null
          preview_url: string | null
          preview_views: number
          rating: number | null
          review_count: number | null
          sector: string
          stage_sent_at: string | null
          status: string
          top_reviews: Json | null
          updated_at: string
          updated_by: string | null
          website_quality: string | null
        }
        Insert: {
          ab_variant?: string | null
          address?: string | null
          bairro?: string | null
          business_name: string
          city: string
          city_normalized?: string
          contact_count?: number
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          email?: string | null
          google_place_id?: string | null
          has_website?: boolean
          id: string
          instagram_handle?: string | null
          last_contact_at?: string | null
          lead_score?: number
          next_followup_at?: string | null
          notes?: string
          opening_hours?: Json | null
          phone_digits?: string | null
          preview_last_viewed_at?: string | null
          preview_url?: string | null
          preview_views?: number
          rating?: number | null
          review_count?: number | null
          sector: string
          stage_sent_at?: string | null
          status?: string
          top_reviews?: Json | null
          updated_at?: string
          updated_by?: string | null
          website_quality?: string | null
        }
        Update: {
          ab_variant?: string | null
          address?: string | null
          bairro?: string | null
          business_name?: string
          city?: string
          city_normalized?: string
          contact_count?: number
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          email?: string | null
          google_place_id?: string | null
          has_website?: boolean
          id?: string
          instagram_handle?: string | null
          last_contact_at?: string | null
          lead_score?: number
          next_followup_at?: string | null
          notes?: string
          opening_hours?: Json | null
          phone_digits?: string | null
          preview_last_viewed_at?: string | null
          preview_url?: string | null
          preview_views?: number
          rating?: number | null
          review_count?: number | null
          sector?: string
          stage_sent_at?: string | null
          status?: string
          top_reviews?: Json | null
          updated_at?: string
          updated_by?: string | null
          website_quality?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_envio_outreach: {
        Args: {
          p_lead_id: string
          p_mensagem: string
          p_next_followup: string
          p_stage: string
          p_variant: string
        }
        Returns: {
          id: string
          lead_id: string
          rendered_message: string
          sent_at: string
          stage: string
          variant: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lead_outreach_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      lead_status: "novo" | "contatado" | "proposta" | "fechado" | "descartado"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      lead_status: ["novo", "contatado", "proposta", "fechado", "descartado"],
    },
  },
} as const
