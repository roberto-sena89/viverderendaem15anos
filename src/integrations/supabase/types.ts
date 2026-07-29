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
      aportes: {
        Row: {
          categoria: string
          corretora: string
          created_at: string
          data: string
          id: string
          observacoes: string | null
          preco: number
          quantidade: number
          taxas: number
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          corretora?: string
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          preco?: number
          quantidade?: number
          taxas?: number
          ticker: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          categoria?: string
          corretora?: string
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          preco?: number
          quantidade?: number
          taxas?: number
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ativos: {
        Row: {
          categoria: string
          created_at: string
          dy: number
          id: string
          nome: string
          preco_atual: number
          preco_medio: number
          quantidade: number
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          dy?: number
          id?: string
          nome: string
          preco_atual?: number
          preco_medio?: number
          quantidade?: number
          ticker: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          dy?: number
          id?: string
          nome?: string
          preco_atual?: number
          preco_medio?: number
          quantidade?: number
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_mensagens: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      dividendos: {
        Row: {
          created_at: string
          data: string
          id: string
          ticker: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          ticker: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          ticker?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      historico_precos: {
        Row: {
          classe: string
          created_at: string
          data: string
          fonte: string
          id: string
          preco: number
          ticker: string
          updated_at: string
        }
        Insert: {
          classe?: string
          created_at?: string
          data?: string
          fonte?: string
          id?: string
          preco: number
          ticker: string
          updated_at?: string
        }
        Update: {
          classe?: string
          created_at?: string
          data?: string
          fonte?: string
          id?: string
          preco?: number
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          alvo: number
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alvo?: number
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          alvo?: number
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plano_config: {
        Row: {
          aporte_mensal: number
          aumento_anual: number
          created_at: string
          idade_aposentadoria: number
          idade_atual: number
          inflacao_anual: number
          rentabilidade_anual: number
          taxa_retirada: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aporte_mensal?: number
          aumento_anual?: number
          created_at?: string
          idade_aposentadoria?: number
          idade_atual?: number
          inflacao_anual?: number
          rentabilidade_anual?: number
          taxa_retirada?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          aporte_mensal?: number
          aumento_anual?: number
          created_at?: string
          idade_aposentadoria?: number
          idade_atual?: number
          inflacao_anual?: number
          rentabilidade_anual?: number
          taxa_retirada?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
