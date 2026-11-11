
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "collections": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"project_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collections_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_plan_entries": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"plan_date": string,"project_id": string,"recipe_id": string,"servings": number,"slot": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"plan_date": string,"project_id": string,"recipe_id": string,"servings": number,"slot": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"plan_date"?: string,"project_id"?: string,"recipe_id"?: string,"servings"?: number,"slot"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_plan_entries_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_plan_entries_recipe_id_project_id_fkey"
      columns: ["recipe_id","project_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id","project_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "display_name": string | null,"email": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name"?: string | null,"email": string,"id": string
                  }
                  Update: {
                    "display_name"?: string | null,"email"?: string,"id"?: string
                  }
                  Relationships: [

                  ]
                },"project_members": {
                  Row: {
                    "joined_at": string,"project_id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"project_id": string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"project_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"invite_code": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"invite_code"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"invite_code"?: string,"name"?: string
                  }
                  Relationships: [

                  ]
                },"recipe_ingredients": {
                  Row: {
                    "id": string,"name": string,"position": number,"quantity": number | null,"recipe_id": string,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"position"?: number,"quantity"?: number | null,"recipe_id": string,"unit"?: string | null
                  }
                  Update: {
                    "id"?: string,"name"?: string,"position"?: number,"quantity"?: number | null,"recipe_id"?: string,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_ingredients_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "collection_id": string,"created_at": string,"created_by": string | null,"id": string,"instructions": string,"project_id": string,"servings": number,"source_type": string,"source_url": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collection_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"instructions"?: string,"project_id": string,"servings"?: number,"source_type"?: string,"source_url"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "collection_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"instructions"?: string,"project_id"?: string,"servings"?: number,"source_type"?: string,"source_url"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipes_collection_id_project_id_fkey"
      columns: ["collection_id","project_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id","project_id"]
    },{
      foreignKeyName: "recipes_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_project":
{ Args: { "p_name": string }; Returns: {
              "created_at": string,
"created_by": string,
"id": string,
"invite_code": string,
"name": string
            }
                          SetofOptions: {
        from: "*"
        to: "projects"
        isOneToOne: true
        isSetofReturn: false
      } },
"is_project_member":
{ Args: { "p_project_id": string }; Returns: boolean
                           },
"join_project":
{ Args: { "p_invite_code": string }; Returns: {
              "created_at": string,
"created_by": string,
"id": string,
"invite_code": string,
"name": string
            }
                          SetofOptions: {
        from: "*"
        to: "projects"
        isOneToOne: true
        isSetofReturn: false
      } },
"save_recipe":
{ Args: { "p_collection_id": string,"p_ingredients": Json,"p_instructions": string,"p_project_id": string,"p_recipe_id": string,"p_servings": number,"p_source_type": string,"p_source_url": string,"p_title": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
