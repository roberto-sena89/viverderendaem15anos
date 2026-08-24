export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      aportes: {
        Row: {
          categoria: string;
          corretora: string;
          created_at: string;
          data: string;
          id: string;
          observacoes: string | null;
          preco: number;
          quantidade: number;
          taxas: number;
          ticker: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          categoria: string;
          corretora?: string;
          created_at?: string;
          data?: string;
          id?: string;
          observacoes?: string | null;
          preco?: number;
          quantidade?: number;
          taxas?: number;
          ticker: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          categoria?: string;
          corretora?: string;
          created_at?: string;
          data?: string;
          id?: string;
          observacoes?: string | null;
          preco?: number;
          quantidade?: number;
          taxas?: number;
          ticker?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ativos: {
        Row: {
          categoria: string;
          created_at: string;
          dy: number;
          id: string;
          nome: string;
          preco_atual: number;
          preco_medio: number;
          quantidade: number;
          ticker: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          categoria: string;
          created_at?: string;
          dy?: number;
          id?: string;
          nome: string;
          preco_atual?: number;
          preco_medio?: number;
          quantidade?: number;
          ticker: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          categoria?: string;
          created_at?: string;
          dy?: number;
          id?: string;
          nome?: string;
          preco_atual?: number;
          preco_medio?: number;
          quantidade?: number;
          ticker?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_mensagens: {
        Row: {
          created_at: string;
          id: string;
          parts: Json;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          parts?: Json;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          parts?: Json;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cotacoes_cache: {
        Row: {
          atualizado_em: string;
          categoria: string;
          created_at: string;
          parcial: boolean;
          payload: Json;
        };
        Insert: {
          atualizado_em?: string;
          categoria: string;
          created_at?: string;
          parcial?: boolean;
          payload: Json;
        };
        Update: {
          atualizado_em?: string;
          categoria?: string;
          created_at?: string;
          parcial?: boolean;
          payload?: Json;
        };
        Relationships: [];
      };
      dividendos: {
        Row: {
          created_at: string;
          data: string;
          id: string;
          ticker: string;
          tipo: string;
          updated_at: string;
          user_id: string;
          valor: number;
        };
        Insert: {
          created_at?: string;
          data?: string;
          id?: string;
          ticker: string;
          tipo?: string;
          updated_at?: string;
          user_id?: string;
          valor?: number;
        };
        Update: {
          created_at?: string;
          data?: string;
          id?: string;
          ticker?: string;
          tipo?: string;
          updated_at?: string;
          user_id?: string;
          valor?: number;
        };
        Relationships: [];
      };
      historico_precos: {
        Row: {
          classe: string;
          created_at: string;
          data: string;
          fonte: string;
          id: string;
          preco: number;
          ticker: string;
          updated_at: string;
        };
        Insert: {
          classe?: string;
          created_at?: string;
          data?: string;
          fonte?: string;
          id?: string;
          preco: number;
          ticker: string;
          updated_at?: string;
        };
        Update: {
          classe?: string;
          created_at?: string;
          data?: string;
          fonte?: string;
          id?: string;
          preco?: number;
          ticker?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ia_habilidades: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          id: string;
          instrucao: string;
          nome: string;
          titulo: string;
          user_id: string;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          instrucao: string;
          nome: string;
          titulo: string;
          user_id?: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          instrucao?: string;
          nome?: string;
          titulo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      metas: {
        Row: {
          alvo: number;
          created_at: string;
          id: string;
          nome: string;
          ordem: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          alvo?: number;
          created_at?: string;
          id?: string;
          nome: string;
          ordem?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          alvo?: number;
          created_at?: string;
          id?: string;
          nome?: string;
          ordem?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      newsletter: {
        Row: {
          criado_em: string;
          email: string;
          fonte: string | null;
          id: number;
        };
        Insert: {
          criado_em?: string;
          email: string;
          fonte?: string | null;
          id?: number;
        };
        Update: {
          criado_em?: string;
          email?: string;
          fonte?: string | null;
          id?: number;
        };
        Relationships: [];
      };
      plano_config: {
        Row: {
          aporte_mensal: number;
          aumento_anual: number;
          created_at: string;
          idade_aposentadoria: number;
          idade_atual: number;
          inflacao_anual: number;
          rentabilidade_anual: number;
          taxa_retirada: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          aporte_mensal?: number;
          aumento_anual?: number;
          created_at?: string;
          idade_aposentadoria?: number;
          idade_atual?: number;
          inflacao_anual?: number;
          rentabilidade_anual?: number;
          taxa_retirada?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          aporte_mensal?: number;
          aumento_anual?: number;
          created_at?: string;
          idade_aposentadoria?: number;
          idade_atual?: number;
          inflacao_anual?: number;
          rentabilidade_anual?: number;
          taxa_retirada?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      precos_ultimos: {
        Row: {
          ao_vivo: boolean;
          atualizado_em: string;
          created_at: string;
          fonte: string;
          preco: number;
          ticker: string;
          updated_at: string;
          variacao_percent: number | null;
        };
        Insert: {
          ao_vivo?: boolean;
          atualizado_em?: string;
          created_at?: string;
          fonte?: string;
          preco: number;
          ticker: string;
          updated_at?: string;
          variacao_percent?: number | null;
        };
        Update: {
          ao_vivo?: boolean;
          atualizado_em?: string;
          created_at?: string;
          fonte?: string;
          preco?: number;
          ticker?: string;
          updated_at?: string;
          variacao_percent?: number | null;
        };
        Relationships: [];
      };
      preferencias_mercado: {
        Row: {
          created_at: string;
          favoritos: string[];
          filtro_favoritos: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          favoritos?: string[];
          filtro_favoritos?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          favoritos?: string[];
          filtro_favoritos?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      radar_analises: {
        Row: {
          cenario_base: string | null;
          cenario_otimista: string | null;
          cenario_pessimista: string | null;
          conviccao: string | null;
          created_at: string;
          fatores_externos: Json;
          gatilhos: string | null;
          gerada_em: string;
          horizonte: string | null;
          id: string;
          monitorar: string | null;
          riscos: string | null;
          tese: string | null;
          ticker: string;
          veredito: string;
        };
        Insert: {
          cenario_base?: string | null;
          cenario_otimista?: string | null;
          cenario_pessimista?: string | null;
          conviccao?: string | null;
          created_at?: string;
          fatores_externos?: Json;
          gatilhos?: string | null;
          gerada_em?: string;
          horizonte?: string | null;
          id?: string;
          monitorar?: string | null;
          riscos?: string | null;
          tese?: string | null;
          ticker: string;
          veredito: string;
        };
        Update: {
          cenario_base?: string | null;
          cenario_otimista?: string | null;
          cenario_pessimista?: string | null;
          conviccao?: string | null;
          created_at?: string;
          fatores_externos?: Json;
          gatilhos?: string | null;
          gerada_em?: string;
          horizonte?: string | null;
          id?: string;
          monitorar?: string | null;
          riscos?: string | null;
          tese?: string | null;
          ticker?: string;
          veredito?: string;
        };
        Relationships: [];
      };
      relatorios: {
        Row: {
          created_at: string;
          id: string;
          patrimonio_total: number | null;
          perfil: string | null;
          resumo: Json | null;
          score_diversificacao: number | null;
          tipo: string;
          titulo: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          patrimonio_total?: number | null;
          perfil?: string | null;
          resumo?: Json | null;
          score_diversificacao?: number | null;
          tipo: string;
          titulo: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          patrimonio_total?: number | null;
          perfil?: string | null;
          resumo?: Json | null;
          score_diversificacao?: number | null;
          tipo?: string;
          titulo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sincronizacoes: {
        Row: {
          atualizados: number;
          created_at: string;
          dentro_do_pregao: boolean;
          duracao_ms: number;
          erro: string | null;
          escopo: string;
          falhas: string[];
          fonte: string;
          historico_gravado: number;
          id: string;
          status: string;
          total_tickers: number;
        };
        Insert: {
          atualizados?: number;
          created_at?: string;
          dentro_do_pregao?: boolean;
          duracao_ms?: number;
          erro?: string | null;
          escopo: string;
          falhas?: string[];
          fonte: string;
          historico_gravado?: number;
          id?: string;
          status?: string;
          total_tickers?: number;
        };
        Update: {
          atualizados?: number;
          created_at?: string;
          dentro_do_pregao?: boolean;
          duracao_ms?: number;
          erro?: string | null;
          escopo?: string;
          falhas?: string[];
          fonte?: string;
          historico_gravado?: number;
          id?: string;
          status?: string;
          total_tickers?: number;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          created_at: string;
          endpoint: string;
          keys: Json;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          keys?: Json;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          keys?: Json;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      alertas_preco: {
        Row: {
          ativo: boolean;
          criado_em: string;
          disparado_em: string | null;
          id: string;
          ticker: string;
          tipo: string;
          user_id: string;
          valor_alvo: number;
        };
        Insert: {
          ativo?: boolean;
          criado_em?: string;
          disparado_em?: string | null;
          id?: string;
          ticker: string;
          tipo: string;
          user_id: string;
          valor_alvo: number;
        };
        Update: {
          ativo?: boolean;
          criado_em?: string;
          disparado_em?: string | null;
          id?: string;
          ticker?: string;
          tipo?: string;
          user_id?: string;
          valor_alvo?: number;
        };
        Relationships: [
          {
            foreignKeyName: "alertas_preco_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      carteiras_compartilhadas: {
        Row: {
          ativos: Json;
          criado_em: string;
          dividend_yield: number | null;
          expira_em: string | null;
          id: string;
          incluir_valores: boolean;
          nome: string;
          renda_mensal_estimada: number | null;
          token: string;
          total_patrimonio: number;
          user_id: string;
        };
        Insert: {
          ativos?: Json;
          criado_em?: string;
          dividend_yield?: number | null;
          expira_em?: string | null;
          id?: string;
          incluir_valores?: boolean;
          nome?: string;
          renda_mensal_estimada?: number | null;
          token: string;
          total_patrimonio?: number;
          user_id: string;
        };
        Update: {
          ativos?: Json;
          criado_em?: string;
          dividend_yield?: number | null;
          expira_em?: string | null;
          id?: string;
          incluir_valores?: boolean;
          nome?: string;
          renda_mensal_estimada?: number | null;
          token?: string;
          total_patrimonio?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carteiras_compartilhadas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      recalcular_ativo: {
        Args: { _ticker: string; _user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
