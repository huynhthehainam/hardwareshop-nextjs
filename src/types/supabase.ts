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
      customer: {
        Row: {
          debt: number | null
          id: string
          is_frequent_customer: boolean
          name: string
          phone: string | null
        }
        Insert: {
          debt?: number | null
          id?: string
          is_frequent_customer?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          debt?: number | null
          id?: string
          is_frequent_customer?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      customer_debt_history: {
        Row: {
          change_amount: number
          created_at: string
          customer_id: string
          id: string
          reason_key: string
          reason_params: Json
        }
        Insert: {
          change_amount: number
          created_at?: string
          customer_id: string
          id?: string
          reason_key: string
          reason_params?: Json
        }
        Update: {
          change_amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          reason_key?: string
          reason_params?: Json
        }
        Relationships: [
          {
            foreignKeyName: "customer_debt_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      order: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          debt_after_order: number | null
          deleted_at: string | null
          deleted_by: string | null
          deposit: number | null
          id: string
          shop_id: string | null
          total_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          debt_after_order?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit?: number | null
          id?: string
          shop_id?: string | null
          total_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          debt_after_order?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit?: number | null
          id?: string
          shop_id?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_detail: {
        Row: {
          id: string
          note: string | null
          order_id: string | null
          price: number
          product_id: string | null
          quantity: number
          unit_id: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          order_id?: string | null
          price: number
          product_id?: string | null
          quantity: number
          unit_id?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          order_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_detail_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_detail_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_detail_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
        ]
      }
      product: {
        Row: {
          default_price: number
          default_unit_id: string | null
          deleted_at: string | null
          frequent_customer_sale_off: number | null
          id: string
          image_url: string | null
          mass: number | null
          mass_price: number | null
          name: string
          price_for_frequent_customer: number | null
          shop_id: string
        }
        Insert: {
          default_price?: number
          default_unit_id?: string | null
          deleted_at?: string | null
          frequent_customer_sale_off?: number | null
          id?: string
          image_url?: string | null
          mass?: number | null
          mass_price?: number | null
          name: string
          price_for_frequent_customer?: number | null
          shop_id: string
        }
        Update: {
          default_price?: number
          default_unit_id?: string | null
          deleted_at?: string | null
          frequent_customer_sale_off?: number | null
          id?: string
          image_url?: string | null
          mass?: number | null
          mass_price?: number | null
          name?: string
          price_for_frequent_customer?: number | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_default_unit_id_fkey"
            columns: ["default_unit_id"]
            isOneToOne: false
            referencedRelation: "unit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          shop_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          shop_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag_assignment: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_assignment_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_assignment_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "product_tag"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          qr_code_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          qr_code_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          qr_code_url?: string | null
        }
        Relationships: []
      }
      unit: {
        Row: {
          conversion_rate: number | null
          id: string
          is_main: boolean | null
          name: string
          type: string | null
        }
        Insert: {
          conversion_rate?: number | null
          id?: string
          is_main?: boolean | null
          name: string
          type?: string | null
        }
        Update: {
          conversion_rate?: number | null
          id?: string
          is_main?: boolean | null
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      user_shops: {
        Row: {
          role: string | null
          shop_id: string
          user_id: string
        }
        Insert: {
          role?: string | null
          shop_id: string
          user_id: string
        }
        Update: {
          role?: string | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shops_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_created_by: string
          p_customer_id: string
          p_deposit: number
          p_items: Json
          p_shop_id: string
          p_total_cost: number
        }
        Returns: Json
      }
      get_table_names: {
        Args: never
        Returns: {
          table_name: string
          table_schema: string
        }[]
      }
      is_system_admin: { Args: never; Returns: boolean }
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
