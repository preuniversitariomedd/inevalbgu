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
      app_branding: {
        Row: {
          hero_url: string | null
          id: boolean
          logo_url: string | null
          subtitulo: string | null
          titulo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          hero_url?: string | null
          id?: boolean
          logo_url?: string | null
          subtitulo?: string | null
          titulo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          hero_url?: string | null
          id?: boolean
          logo_url?: string | null
          subtitulo?: string | null
          titulo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          resumen: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resumen?: string | null
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resumen?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grupo_estudiantes: {
        Row: {
          created_at: string
          grupo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grupo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          grupo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_estudiantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bloqueado: boolean
          cedula: string
          created_at: string
          fecha_nacimiento: string
          genero: Database["public"]["Enums"]["genero_tipo"] | null
          id: string
          institucion: string
          nombres: string
          primera_vez: boolean
          updated_at: string
        }
        Insert: {
          bloqueado?: boolean
          cedula: string
          created_at?: string
          fecha_nacimiento: string
          genero?: Database["public"]["Enums"]["genero_tipo"] | null
          id: string
          institucion: string
          nombres: string
          primera_vez?: boolean
          updated_at?: string
        }
        Update: {
          bloqueado?: boolean
          cedula?: string
          created_at?: string
          fecha_nacimiento?: string
          genero?: Database["public"]["Enums"]["genero_tipo"] | null
          id?: string
          institucion?: string
          nombres?: string
          primera_vez?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      respuestas: {
        Row: {
          area: string
          correcta: boolean
          id: string
          nivel: string
          pregunta_id: string
          respondida_en: string
          sesion_id: string | null
          subtema: string
          user_id: string
        }
        Insert: {
          area: string
          correcta: boolean
          id?: string
          nivel: string
          pregunta_id: string
          respondida_en?: string
          sesion_id?: string | null
          subtema: string
          user_id: string
        }
        Update: {
          area?: string
          correcta?: boolean
          id?: string
          nivel?: string
          pregunta_id?: string
          respondida_en?: string
          sesion_id?: string | null
          subtema?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones_practica"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_conexion: {
        Row: {
          dispositivo: string | null
          finalizada: boolean
          finalizada_en: string | null
          id: string
          iniciada_en: string
          ip: string | null
          segundos_interaccion: number
          segundos_oculto: number
          segundos_visible: number
          ultima_interaccion: string
          ultimo_heartbeat: string
          user_agent: string | null
          user_id: string
          visible: boolean
        }
        Insert: {
          dispositivo?: string | null
          finalizada?: boolean
          finalizada_en?: string | null
          id?: string
          iniciada_en?: string
          ip?: string | null
          segundos_interaccion?: number
          segundos_oculto?: number
          segundos_visible?: number
          ultima_interaccion?: string
          ultimo_heartbeat?: string
          user_agent?: string | null
          user_id: string
          visible?: boolean
        }
        Update: {
          dispositivo?: string | null
          finalizada?: boolean
          finalizada_en?: string | null
          id?: string
          iniciada_en?: string
          ip?: string | null
          segundos_interaccion?: number
          segundos_oculto?: number
          segundos_visible?: number
          ultima_interaccion?: string
          ultimo_heartbeat?: string
          user_agent?: string | null
          user_id?: string
          visible?: boolean
        }
        Relationships: []
      }
      sesiones_practica: {
        Row: {
          area: string | null
          correctas: number
          finalizada_en: string | null
          id: string
          iniciada_en: string
          nivel_logro: string | null
          puntaje_ineval: number | null
          tipo: string
          total_preguntas: number
          user_id: string
        }
        Insert: {
          area?: string | null
          correctas?: number
          finalizada_en?: string | null
          id?: string
          iniciada_en?: string
          nivel_logro?: string | null
          puntaje_ineval?: number | null
          tipo: string
          total_preguntas?: number
          user_id: string
        }
        Update: {
          area?: string | null
          correctas?: number
          finalizada_en?: string | null
          id?: string
          iniciada_en?: string
          nivel_logro?: string | null
          puntaje_ineval?: number | null
          tipo?: string
          total_preguntas?: number
          user_id?: string
        }
        Relationships: []
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "estudiante" | "administrador" | "docente"
      genero_tipo: "masculino" | "femenino" | "otro"
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
      app_role: ["estudiante", "administrador", "docente"],
      genero_tipo: ["masculino", "femenino", "otro"],
    },
  },
} as const
