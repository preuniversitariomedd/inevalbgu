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
      alertas_presencia: {
        Row: {
          created_at: string
          detalle: string | null
          disparada_en: string
          id: string
          resuelta_en: string | null
          sesion_id: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detalle?: string | null
          disparada_en?: string
          id?: string
          resuelta_en?: string | null
          sesion_id?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          detalle?: string | null
          disparada_en?: string
          id?: string
          resuelta_en?: string | null
          sesion_id?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_presencia_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones_conexion"
            referencedColumns: ["id"]
          },
        ]
      }
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
      biblioteca_archivos: {
        Row: {
          created_at: string
          id: string
          mime: string
          nombre: string
          path: string
          recurso_id: string
          tamano: number
        }
        Insert: {
          created_at?: string
          id?: string
          mime: string
          nombre: string
          path: string
          recurso_id: string
          tamano?: number
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string
          nombre?: string
          path?: string
          recurso_id?: string
          tamano?: number
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_archivos_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_recursos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_categorias: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          icono: string
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          icono?: string
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          icono?: string
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      biblioteca_favoritos: {
        Row: {
          created_at: string
          recurso_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recurso_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          recurso_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_favoritos_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_recursos"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_recursos: {
        Row: {
          categoria_id: string | null
          creador_id: string
          creador_rol: string
          created_at: string
          descarga_url: string | null
          descripcion: string | null
          destacado: boolean
          enlace_url: string | null
          etiquetas: string[]
          id: string
          notas_html: string | null
          portada_path: string | null
          publicado: boolean
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          creador_id: string
          creador_rol?: string
          created_at?: string
          descarga_url?: string | null
          descripcion?: string | null
          destacado?: boolean
          enlace_url?: string | null
          etiquetas?: string[]
          id?: string
          notas_html?: string | null
          portada_path?: string | null
          publicado?: boolean
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          creador_id?: string
          creador_rol?: string
          created_at?: string
          descarga_url?: string | null
          descripcion?: string | null
          destacado?: boolean
          enlace_url?: string | null
          etiquetas?: string[]
          id?: string
          notas_html?: string | null
          portada_path?: string | null
          publicado?: boolean
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_recursos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_vistas: {
        Row: {
          id: string
          recurso_id: string
          user_id: string
          visto_at: string
        }
        Insert: {
          id?: string
          recurso_id: string
          user_id: string
          visto_at?: string
        }
        Update: {
          id?: string
          recurso_id?: string
          user_id?: string
          visto_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_vistas_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_recursos"
            referencedColumns: ["id"]
          },
        ]
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
      competencia_alertas: {
        Row: {
          competencia_id: string
          created_at: string
          detalle: string | null
          id: string
          nombre: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          competencia_id: string
          created_at?: string
          detalle?: string | null
          id?: string
          nombre?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          competencia_id?: string
          created_at?: string
          detalle?: string | null
          id?: string
          nombre?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencia_alertas_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      competencia_participantes: {
        Row: {
          acepto_reglas: boolean
          aciertos: number
          alertas: number
          cincuenta_idx: number
          competencia_id: string
          congelar_idx: number
          doble_idx: number
          escudo: boolean
          joined_at: string
          leves: number
          mejor_racha: number
          nombre: string
          potenciadores_usados: string[]
          puntaje: number
          racha: number
          user_id: string
          virus_de: string | null
          virus_hasta: number
        }
        Insert: {
          acepto_reglas?: boolean
          aciertos?: number
          alertas?: number
          cincuenta_idx?: number
          competencia_id: string
          congelar_idx?: number
          doble_idx?: number
          escudo?: boolean
          joined_at?: string
          leves?: number
          mejor_racha?: number
          nombre?: string
          potenciadores_usados?: string[]
          puntaje?: number
          racha?: number
          user_id: string
          virus_de?: string | null
          virus_hasta?: number
        }
        Update: {
          acepto_reglas?: boolean
          aciertos?: number
          alertas?: number
          cincuenta_idx?: number
          competencia_id?: string
          congelar_idx?: number
          doble_idx?: number
          escudo?: boolean
          joined_at?: string
          leves?: number
          mejor_racha?: number
          nombre?: string
          potenciadores_usados?: string[]
          puntaje?: number
          racha?: number
          user_id?: string
          virus_de?: string | null
          virus_hasta?: number
        }
        Relationships: [
          {
            foreignKeyName: "competencia_participantes_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      competencia_preguntas: {
        Row: {
          area: string | null
          casi_correcta: number | null
          competencia_id: string
          correcta: number
          created_at: string
          enunciado: string
          explicacion: string | null
          id: string
          imagen_url: string | null
          nivel: string
          opciones: Json
          orden: number
          tiempo_seg: number
        }
        Insert: {
          area?: string | null
          casi_correcta?: number | null
          competencia_id: string
          correcta: number
          created_at?: string
          enunciado: string
          explicacion?: string | null
          id?: string
          imagen_url?: string | null
          nivel?: string
          opciones: Json
          orden?: number
          tiempo_seg?: number
        }
        Update: {
          area?: string | null
          casi_correcta?: number | null
          competencia_id?: string
          correcta?: number
          created_at?: string
          enunciado?: string
          explicacion?: string | null
          id?: string
          imagen_url?: string | null
          nivel?: string
          opciones?: Json
          orden?: number
          tiempo_seg?: number
        }
        Relationships: [
          {
            foreignKeyName: "competencia_preguntas_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      competencia_respuestas: {
        Row: {
          competencia_id: string
          created_at: string
          fraccion: number
          id: string
          ms: number
          opcion: number | null
          pregunta_idx: number
          puntos: number
          user_id: string
        }
        Insert: {
          competencia_id: string
          created_at?: string
          fraccion?: number
          id?: string
          ms?: number
          opcion?: number | null
          pregunta_idx: number
          puntos?: number
          user_id: string
        }
        Update: {
          competencia_id?: string
          created_at?: string
          fraccion?: number
          id?: string
          ms?: number
          opcion?: number | null
          pregunta_idx?: number
          puntos?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencia_respuestas_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      competencias: {
        Row: {
          admin_potenciadores_usados: string[]
          codigo: string
          creador_id: string
          created_at: string
          duracion_min: number
          efectos: Json
          estado: string
          fin_at: string | null
          grupo_ids: string[]
          id: string
          inicio_at: string | null
          pausa_restante_ms: number | null
          pregunta_actual: number
          pregunta_duracion_ms: number
          pregunta_inicio: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          admin_potenciadores_usados?: string[]
          codigo: string
          creador_id: string
          created_at?: string
          duracion_min?: number
          efectos?: Json
          estado?: string
          fin_at?: string | null
          grupo_ids?: string[]
          id?: string
          inicio_at?: string | null
          pausa_restante_ms?: number | null
          pregunta_actual?: number
          pregunta_duracion_ms?: number
          pregunta_inicio?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          admin_potenciadores_usados?: string[]
          codigo?: string
          creador_id?: string
          created_at?: string
          duracion_min?: number
          efectos?: Json
          estado?: string
          fin_at?: string | null
          grupo_ids?: string[]
          id?: string
          inicio_at?: string | null
          pausa_restante_ms?: number | null
          pregunta_actual?: number
          pregunta_duracion_ms?: number
          pregunta_inicio?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversacion_participantes: {
        Row: {
          conversacion_id: string
          joined_at: string
          no_leidos: number
          ultima_lectura_at: string | null
          user_id: string
        }
        Insert: {
          conversacion_id: string
          joined_at?: string
          no_leidos?: number
          ultima_lectura_at?: string | null
          user_id: string
        }
        Update: {
          conversacion_id?: string
          joined_at?: string
          no_leidos?: number
          ultima_lectura_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversacion_participantes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      conversaciones: {
        Row: {
          created_at: string
          created_by: string
          id: string
          ultimo_mensaje_at: string
          ultimo_mensaje_preview: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          ultimo_mensaje_at?: string
          ultimo_mensaje_preview?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          ultimo_mensaje_at?: string
          ultimo_mensaje_preview?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      docente_grupos_permitidos: {
        Row: {
          created_at: string
          docente_id: string
          grupo_id: string
        }
        Insert: {
          created_at?: string
          docente_id: string
          grupo_id: string
        }
        Update: {
          created_at?: string
          docente_id?: string
          grupo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "docente_grupos_permitidos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      encuesta_progreso: {
        Row: {
          bloque: string
          completado_en: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bloque: string
          completado_en?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bloque?: string
          completado_en?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      encuesta_respuestas: {
        Row: {
          bloque: string
          created_at: string
          id: string
          pregunta_id: string
          updated_at: string
          user_id: string
          valor: string
        }
        Insert: {
          bloque: string
          created_at?: string
          id?: string
          pregunta_id: string
          updated_at?: string
          user_id: string
          valor: string
        }
        Update: {
          bloque?: string
          created_at?: string
          id?: string
          pregunta_id?: string
          updated_at?: string
          user_id?: string
          valor?: string
        }
        Relationships: []
      }
      envio_masivo_destinatarios: {
        Row: {
          conversacion_id: string | null
          created_at: string
          envio_id: string
          mensaje_id: string | null
          user_id: string
        }
        Insert: {
          conversacion_id?: string | null
          created_at?: string
          envio_id: string
          mensaje_id?: string | null
          user_id: string
        }
        Update: {
          conversacion_id?: string | null
          created_at?: string
          envio_id?: string
          mensaje_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "envio_masivo_destinatarios_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envios_masivos"
            referencedColumns: ["id"]
          },
        ]
      }
      envios_masivos: {
        Row: {
          audiencia: string
          contenido: string
          created_at: string
          id: string
          sender_id: string
          total_destinatarios: number
        }
        Insert: {
          audiencia?: string
          contenido: string
          created_at?: string
          id?: string
          sender_id: string
          total_destinatarios?: number
        }
        Update: {
          audiencia?: string
          contenido?: string
          created_at?: string
          id?: string
          sender_id?: string
          total_destinatarios?: number
        }
        Relationships: []
      }
      fisica_preguntas: {
        Row: {
          activa: boolean
          creador_id: string
          created_at: string
          enunciado: string
          explicacion: string | null
          id: string
          imagen_path: string | null
          nivel: string
          opciones: Json
          respuesta_correcta: number
          subtema: string
          tema: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          creador_id: string
          created_at?: string
          enunciado: string
          explicacion?: string | null
          id?: string
          imagen_path?: string | null
          nivel?: string
          opciones: Json
          respuesta_correcta?: number
          subtema?: string
          tema: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          creador_id?: string
          created_at?: string
          enunciado?: string
          explicacion?: string | null
          id?: string
          imagen_path?: string | null
          nivel?: string
          opciones?: Json
          respuesta_correcta?: number
          subtema?: string
          tema?: string
          updated_at?: string
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
      mensajes: {
        Row: {
          attachment_path: string | null
          attachment_tipo: string | null
          contenido: string | null
          conversacion_id: string
          created_at: string
          es_admin_intervencion: boolean
          id: string
          responde_a: string | null
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          attachment_tipo?: string | null
          contenido?: string | null
          conversacion_id: string
          created_at?: string
          es_admin_intervencion?: boolean
          id?: string
          responde_a?: string | null
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          attachment_tipo?: string | null
          contenido?: string | null
          conversacion_id?: string
          created_at?: string
          es_admin_intervencion?: boolean
          id?: string
          responde_a?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_responde_a_fkey"
            columns: ["responde_a"]
            isOneToOne: false
            referencedRelation: "mensajes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bloqueado: boolean
          cedula: string
          creado_por: string | null
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
          avatar_url?: string | null
          bloqueado?: boolean
          cedula: string
          creado_por?: string | null
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
          avatar_url?: string | null
          bloqueado?: boolean
          cedula?: string
          creado_por?: string | null
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
      razonamiento_progreso: {
        Row: {
          aciertos: Json
          created_at: string
          fallos: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          aciertos?: Json
          created_at?: string
          fallos?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          aciertos?: Json
          created_at?: string
          fallos?: Json
          updated_at?: string
          user_id?: string
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
          tiempo_segundos: number
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
          tiempo_segundos?: number
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
          tiempo_segundos?: number
          tipo?: string
          total_preguntas?: number
          user_id?: string
        }
        Relationships: []
      }
      tarea_adjuntos: {
        Row: {
          created_at: string
          id: string
          mime: string
          nombre: string
          path: string
          tamano: number
          tarea_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime: string
          nombre: string
          path: string
          tamano?: number
          tarea_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string
          nombre?: string
          path?: string
          tamano?: number
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_adjuntos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_grupos: {
        Row: {
          grupo_id: string
          tarea_id: string
        }
        Insert: {
          grupo_id: string
          tarea_id: string
        }
        Update: {
          grupo_id?: string
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_grupos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_vistas: {
        Row: {
          tarea_id: string
          user_id: string
          visto_at: string
        }
        Insert: {
          tarea_id: string
          user_id: string
          visto_at?: string
        }
        Update: {
          tarea_id?: string
          user_id?: string
          visto_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_vistas_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          categoria: string | null
          creador_id: string
          creador_rol: string
          created_at: string
          descripcion: string | null
          descripcion_html: string | null
          id: string
          programada_para: string | null
          titulo: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          categoria?: string | null
          creador_id: string
          creador_rol: string
          created_at?: string
          descripcion?: string | null
          descripcion_html?: string | null
          id?: string
          programada_para?: string | null
          titulo: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          categoria?: string | null
          creador_id?: string
          creador_rol?: string
          created_at?: string
          descripcion?: string | null
          descripcion_html?: string | null
          id?: string
          programada_para?: string | null
          titulo?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      user_pins: {
        Row: {
          bloqueado_hasta: string | null
          intentos: number
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bloqueado_hasta?: string | null
          intentos?: number
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bloqueado_hasta?: string | null
          intentos?: number
          pin_hash?: string
          updated_at?: string
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
      es_participante: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      es_participante_comp: {
        Args: { _comp: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      puede_ver_tarea: {
        Args: { _tarea_id: string; _user_id: string }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
