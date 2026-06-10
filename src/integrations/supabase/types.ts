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
      auditoria: {
        Row: {
          acao: string
          data_hora: string
          entidade: string
          id: string
          obra_id: string | null
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          acao: string
          data_hora?: string
          entidade?: string
          id?: string
          obra_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
        }
        Update: {
          acao?: string
          data_hora?: string
          entidade?: string
          id?: string
          obra_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_fiscal: {
        Row: {
          created_at: string
          data_inspecao: string
          documentos: Json
          fiscal_id: string
          fotos: Json
          id: string
          obra_id: string
          observacao_geral: string
          resultado: Json
        }
        Insert: {
          created_at?: string
          data_inspecao?: string
          documentos?: Json
          fiscal_id: string
          fotos?: Json
          id?: string
          obra_id: string
          observacao_geral?: string
          resultado?: Json
        }
        Update: {
          created_at?: string
          data_inspecao?: string
          documentos?: Json
          fiscal_id?: string
          fotos?: Json
          id?: string
          obra_id?: string
          observacao_geral?: string
          resultado?: Json
        }
        Relationships: [
          {
            foreignKeyName: "checklist_fiscal_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          comentario: string
          data_comentario: string
          id: string
          obra_id: string
          usuario_id: string
        }
        Insert: {
          comentario: string
          data_comentario?: string
          id?: string
          obra_id: string
          usuario_id: string
        }
        Update: {
          comentario?: string
          data_comentario?: string
          id?: string
          obra_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          data_publicacao: string
          id: string
          mensagem: string
          obra_id: string
          usuario_id: string
        }
        Insert: {
          data_publicacao?: string
          id?: string
          mensagem: string
          obra_id: string
          usuario_id: string
        }
        Update: {
          data_publicacao?: string
          id?: string
          mensagem?: string
          obra_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_etapas: {
        Row: {
          concluida: boolean
          data_prevista_fim: string | null
          data_prevista_inicio: string | null
          data_real_fim: string | null
          data_real_inicio: string | null
          etapa: string
          id: string
          obra_id: string
          ordem: number
        }
        Insert: {
          concluida?: boolean
          data_prevista_fim?: string | null
          data_prevista_inicio?: string | null
          data_real_fim?: string | null
          data_real_inicio?: string | null
          etapa: string
          id?: string
          obra_id: string
          ordem?: number
        }
        Update: {
          concluida?: boolean
          data_prevista_fim?: string | null
          data_prevista_inicio?: string | null
          data_real_fim?: string | null
          data_real_inicio?: string | null
          etapa?: string
          id?: string
          obra_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_etapas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_financeiro: {
        Row: {
          id: string
          mes: string
          obra_id: string
          ordem: number
          valor_previsto: number
          valor_realizado: number
        }
        Insert: {
          id?: string
          mes: string
          obra_id: string
          ordem?: number
          valor_previsto?: number
          valor_realizado?: number
        }
        Update: {
          id?: string
          mes?: string
          obra_id?: string
          ordem?: number
          valor_previsto?: number
          valor_realizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_financeiro_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_fotos: {
        Row: {
          data_upload: string
          id: string
          legenda: string
          obra_id: string
          tipo: string
          url: string
        }
        Insert: {
          data_upload?: string
          id?: string
          legenda?: string
          obra_id: string
          tipo?: string
          url: string
        }
        Update: {
          data_upload?: string
          id?: string
          legenda?: string
          obra_id?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_orcamento: {
        Row: {
          categoria: string
          id: string
          obra_id: string
          valor: number
        }
        Insert: {
          categoria: string
          id?: string
          obra_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          id?: string
          obra_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_orcamento_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_progresso: {
        Row: {
          data: string
          id: string
          obra_id: string
          percentual_executado: number
          percentual_planejado: number
        }
        Insert: {
          data: string
          id?: string
          obra_id: string
          percentual_executado?: number
          percentual_planejado?: number
        }
        Update: {
          data?: string
          id?: string
          obra_id?: string
          percentual_executado?: number
          percentual_planejado?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_progresso_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          bairro: string
          cep: string
          created_at: string
          data_atualizada: string | null
          data_inicio: string | null
          data_inicio_prevista: string | null
          data_inicio_real: string | null
          data_prevista: string | null
          data_termino_estimada: string | null
          data_termino_prevista: string | null
          data_termino_real: string | null
          descricao: string
          empreiteira: string
          endereco: string
          fiscal_id: string | null
          foto_principal: string | null
          gestor_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          orgao_responsavel: string
          percentual_concluido: number
          percentual_planejado: number
          status: Database["public"]["Enums"]["obra_status"]
          updated_at: string
          valor_executado: number
          valor_previsto: number
        }
        Insert: {
          bairro?: string
          cep?: string
          created_at?: string
          data_atualizada?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          data_prevista?: string | null
          data_termino_estimada?: string | null
          data_termino_prevista?: string | null
          data_termino_real?: string | null
          descricao?: string
          empreiteira?: string
          endereco?: string
          fiscal_id?: string | null
          foto_principal?: string | null
          gestor_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          orgao_responsavel?: string
          percentual_concluido?: number
          percentual_planejado?: number
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
          valor_executado?: number
          valor_previsto?: number
        }
        Update: {
          bairro?: string
          cep?: string
          created_at?: string
          data_atualizada?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          data_prevista?: string | null
          data_termino_estimada?: string | null
          data_termino_prevista?: string | null
          data_termino_real?: string | null
          descricao?: string
          empreiteira?: string
          endereco?: string
          fiscal_id?: string | null
          foto_principal?: string | null
          gestor_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          orgao_responsavel?: string
          percentual_concluido?: number
          percentual_planejado?: number
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
          valor_executado?: number
          valor_previsto?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id: string
          nome?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_secure: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "fiscal" | "gestor" | "agente" | "admin" | "prefeitura"
      obra_status:
        | "planejamento"
        | "em_andamento"
        | "atrasada"
        | "paralisada"
        | "concluida"
        | "licitacao"
        | "cancelada"
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
      app_role: ["fiscal", "gestor", "agente", "admin", "prefeitura"],
      obra_status: [
        "planejamento",
        "em_andamento",
        "atrasada",
        "paralisada",
        "concluida",
        "licitacao",
        "cancelada",
      ],
    },
  },
} as const
