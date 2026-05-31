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
      animus_orders: {
        Row: {
          add_name_to_back: boolean
          amount: number | null
          archived_at: string | null
          audio_url: string
          billing_address1: string | null
          billing_address2: string | null
          billing_city: string | null
          billing_country_code: string | null
          billing_name: string | null
          billing_same_as_shipping: boolean
          billing_state: string | null
          billing_zip: string | null
          cloudinary_folder_url: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          design_image_url: string | null
          exported_at: string | null
          fulfillment_status: string
          icount_docnum: string | null
          icount_docnum_auto_detected: boolean
          icount_webhook_payload: Json | null
          id: string
          pet_name: string
          pet_photo_url: string | null
          print_image_url: string | null
          right_side_engraving: string | null
          shipping_address1: string | null
          shipping_address2: string | null
          shipping_city: string | null
          shipping_country_code: string | null
          shipping_state: string | null
          shipping_zip: string | null
          shineon_sku: string | null
          soul_page_url: string
          soul_video_url: string | null
          status: string
          svg_content: string
          text_message: string | null
          tracking_number: string | null
          tracking_updated_at: string | null
          updated_at: string
          waveform_data: Json | null
          workflow_status: string
        }
        Insert: {
          add_name_to_back?: boolean
          amount?: number | null
          archived_at?: string | null
          audio_url: string
          billing_address1?: string | null
          billing_address2?: string | null
          billing_city?: string | null
          billing_country_code?: string | null
          billing_name?: string | null
          billing_same_as_shipping?: boolean
          billing_state?: string | null
          billing_zip?: string | null
          cloudinary_folder_url?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          design_image_url?: string | null
          exported_at?: string | null
          fulfillment_status?: string
          icount_docnum?: string | null
          icount_docnum_auto_detected?: boolean
          icount_webhook_payload?: Json | null
          id?: string
          pet_name: string
          pet_photo_url?: string | null
          print_image_url?: string | null
          right_side_engraving?: string | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_country_code?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          shineon_sku?: string | null
          soul_page_url: string
          soul_video_url?: string | null
          status?: string
          svg_content: string
          text_message?: string | null
          tracking_number?: string | null
          tracking_updated_at?: string | null
          updated_at?: string
          waveform_data?: Json | null
          workflow_status?: string
        }
        Update: {
          add_name_to_back?: boolean
          amount?: number | null
          archived_at?: string | null
          audio_url?: string
          billing_address1?: string | null
          billing_address2?: string | null
          billing_city?: string | null
          billing_country_code?: string | null
          billing_name?: string | null
          billing_same_as_shipping?: boolean
          billing_state?: string | null
          billing_zip?: string | null
          cloudinary_folder_url?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          design_image_url?: string | null
          exported_at?: string | null
          fulfillment_status?: string
          icount_docnum?: string | null
          icount_docnum_auto_detected?: boolean
          icount_webhook_payload?: Json | null
          id?: string
          pet_name?: string
          pet_photo_url?: string | null
          print_image_url?: string | null
          right_side_engraving?: string | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_country_code?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          shineon_sku?: string | null
          soul_page_url?: string
          soul_video_url?: string | null
          status?: string
          svg_content?: string
          text_message?: string | null
          tracking_number?: string | null
          tracking_updated_at?: string | null
          updated_at?: string
          waveform_data?: Json | null
          workflow_status?: string
        }
        Relationships: []
      }
      campaign_email_content: {
        Row: {
          fields: Json
          id: string
          subject: string
          updated_at: string
        }
        Insert: {
          fields?: Json
          id: string
          subject: string
          updated_at?: string
        }
        Update: {
          fields?: Json
          id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_sends: {
        Row: {
          campaign_name: string
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          recipient_email: string
          resend_id: string | null
          status: string
        }
        Insert: {
          campaign_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email: string
          resend_id?: string | null
          status: string
        }
        Update: {
          campaign_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_email?: string
          resend_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "waitlist_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_settings: {
        Row: {
          currency: string
          id: number
          monthly_ad_spend: number
          shineon_unit_cost: number
          transaction_fee_fixed: number
          transaction_fee_percent: number
          updated_at: string
        }
        Insert: {
          currency?: string
          id?: number
          monthly_ad_spend?: number
          shineon_unit_cost?: number
          transaction_fee_fixed?: number
          transaction_fee_percent?: number
          updated_at?: string
        }
        Update: {
          currency?: string
          id?: number
          monthly_ad_spend?: number
          shineon_unit_cost?: number
          transaction_fee_fixed?: number
          transaction_fee_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          lead_id: string | null
          used_at: string | null
          used_by_order: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_percent: number
          id?: string
          lead_id?: string | null
          used_at?: string | null
          used_by_order?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          lead_id?: string | null
          used_at?: string | null
          used_by_order?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "waitlist_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_used_by_order_fkey"
            columns: ["used_by_order"]
            isOneToOne: false
            referencedRelation: "animus_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      waitlist_leads: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string
          extra_discount_percent: number
          id: string
          referral_code: string | null
          referral_count: number
          referred_by: string | null
          status: string
          status_updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email: string
          extra_discount_percent?: number
          id?: string
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          status?: string
          status_updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string
          extra_discount_percent?: number
          id?: string
          referral_code?: string | null
          referral_count?: number
          referred_by?: string | null
          status?: string
          status_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_leads_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "waitlist_leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_referrer: { Args: { _code: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_discount_code: {
        Args: { _code: string }
        Returns: {
          already_used: boolean
          discount_percent: number
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
