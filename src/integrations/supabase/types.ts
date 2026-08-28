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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          city: string | null
          created_at: string
          expires_at: string
          id: string
          interests: string[]
          is_active: boolean
          location_lat: number | null
          location_lng: number | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          expires_at: string
          id?: string
          interests?: string[]
          is_active?: boolean
          location_lat?: number | null
          location_lng?: number | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          interests?: string[]
          is_active?: boolean
          location_lat?: number | null
          location_lng?: number | null
          user_id?: string
        }
        Relationships: []
      }
      business_verifications: {
        Row: {
          cnpj: string
          company_document_url: string
          company_name: string
          created_at: string
          id: string
          owner_document_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          trade_name: string | null
          user_id: string
        }
        Insert: {
          cnpj: string
          company_document_url: string
          company_name: string
          created_at?: string
          id?: string
          owner_document_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          trade_name?: string | null
          user_id: string
        }
        Update: {
          cnpj?: string
          company_document_url?: string
          company_name?: string
          created_at?: string
          id?: string
          owner_document_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          trade_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          avatar_url: string | null
          category: string
          city: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_public: boolean
          member_count: number
          name: string
          rules: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category: string
          city?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name: string
          rules?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string
          city?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name?: string
          rules?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_member_role"]
          status: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_member_role"]
          status?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_member_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          community_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_message_reads: {
        Row: {
          event_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_message_reads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_message_reads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      event_messages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          joined_at: string
          safety_acknowledged: boolean
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          safety_acknowledged?: boolean
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          safety_acknowledged?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          city: string | null
          created_at: string
          created_by: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_private: boolean | null
          is_recurring: boolean | null
          location: string
          max_participants: number | null
          parent_event_id: string | null
          price: number | null
          private_code: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          state: string | null
          time: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          city?: string | null
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_private?: boolean | null
          is_recurring?: boolean | null
          location: string
          max_participants?: number | null
          parent_event_id?: string | null
          price?: number | null
          private_code?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          state?: string | null
          time: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_private?: boolean | null
          is_recurring?: boolean | null
          location?: string
          max_participants?: number | null
          parent_event_id?: string | null
          price?: number | null
          private_code?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          state?: string | null
          time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          event_join: boolean
          event_reminder: boolean
          event_updated: boolean
          friend_request: boolean
          id: string
          new_event: boolean
          new_message: boolean
          participant_joined: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_join?: boolean
          event_reminder?: boolean
          event_updated?: boolean
          friend_request?: boolean
          id?: string
          new_event?: boolean
          new_message?: boolean
          participant_joined?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_join?: boolean
          event_reminder?: boolean
          event_updated?: boolean
          friend_request?: boolean
          id?: string
          new_event?: boolean
          new_message?: boolean
          participant_joined?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_messages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message_id: string
          pinned_by: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message_id: string
          pinned_by: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message_id?: string
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "event_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_preferences: {
        Row: {
          allow_direct_messages: boolean
          allow_friend_requests: boolean
          created_at: string
          id: string
          show_events_participated: boolean
          show_location: boolean
          show_online_status: boolean
          show_profile_public: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_direct_messages?: boolean
          allow_friend_requests?: boolean
          created_at?: string
          id?: string
          show_events_participated?: boolean
          show_location?: boolean
          show_online_status?: boolean
          show_profile_public?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_direct_messages?: boolean
          allow_friend_requests?: boolean
          created_at?: string
          id?: string
          show_events_participated?: boolean
          show_location?: boolean
          show_online_status?: boolean
          show_profile_public?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          business_verified: boolean
          city: string | null
          created_at: string
          full_name: string
          id: string
          interests: string[] | null
          onboarding_completed: boolean
          updated_at: string
          user_id: string
          user_number: number
          username: string | null
          verification_level: number
          verified: boolean
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          business_verified?: boolean
          city?: string | null
          created_at?: string
          full_name: string
          id?: string
          interests?: string[] | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
          user_number?: number
          username?: string | null
          verification_level?: number
          verified?: boolean
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          business_verified?: boolean
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          interests?: string[] | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
          user_number?: number
          username?: string | null
          verification_level?: number
          verified?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_community_events: {
        Row: {
          category: string
          community_id: string
          created_at: string
          day_of_week: number
          description: string | null
          id: string
          is_active: boolean
          location: string
          max_participants: number | null
          recurrence: Database["public"]["Enums"]["community_recurrence"]
          time: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          community_id: string
          created_at?: string
          day_of_week: number
          description?: string | null
          id?: string
          is_active?: boolean
          location: string
          max_participants?: number | null
          recurrence?: Database["public"]["Enums"]["community_recurrence"]
          time: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          community_id?: string
          created_at?: string
          day_of_week?: number
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string
          max_participants?: number | null
          recurrence?: Database["public"]["Enums"]["community_recurrence"]
          time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_community_events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: Database["public"]["Enums"]["report_category"]
          created_at: string
          description: string
          evidence_image_url: string | null
          id: string
          is_urgent: boolean
          reported_event_id: string | null
          reported_message_id: string | null
          reported_user_id: string | null
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          category: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string
          evidence_image_url?: string | null
          id?: string
          is_urgent?: boolean
          reported_event_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string
          evidence_image_url?: string | null
          id?: string
          is_urgent?: boolean
          reported_event_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_event_id_fkey"
            columns: ["reported_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_event_id_fkey"
            columns: ["reported_event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          badge_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          accepted_privacy_version: string
          accepted_terms_version: string
          created_at: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          accepted_privacy_version?: string
          accepted_terms_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          accepted_privacy_version?: string
          accepted_terms_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_data_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          request_type: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_penalties: {
        Row: {
          blocked_feature: string | null
          created_at: string
          duration_days: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          moderator_id: string
          penalty_type: string
          reason: string
          reputation_impact: number | null
          user_id: string
        }
        Insert: {
          blocked_feature?: string | null
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          moderator_id: string
          penalty_type: string
          reason: string
          reputation_impact?: number | null
          user_id: string
        }
        Update: {
          blocked_feature?: string | null
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          moderator_id?: string
          penalty_type?: string
          reason?: string
          reputation_impact?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_reputation_log: {
        Row: {
          change_amount: number
          created_at: string
          id: string
          moderator_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          change_amount: number
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          change_amount?: number
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_restrictions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          restriction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          restriction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          restriction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          comment: string | null
          communication_rating: number
          created_at: string
          event_id: string
          id: string
          overall_rating: number
          punctuality_rating: number
          reliability_rating: number
          respect_rating: number
          reviewed_user_id: string
          reviewer_user_id: string
          safety_rating: number
        }
        Insert: {
          comment?: string | null
          communication_rating: number
          created_at?: string
          event_id: string
          id?: string
          overall_rating?: number
          punctuality_rating: number
          reliability_rating: number
          respect_rating: number
          reviewed_user_id: string
          reviewer_user_id: string
          safety_rating: number
        }
        Update: {
          comment?: string | null
          communication_rating?: number
          created_at?: string
          event_id?: string
          id?: string
          overall_rating?: number
          punctuality_rating?: number
          reliability_rating?: number
          respect_rating?: number
          reviewed_user_id?: string
          reviewer_user_id?: string
          safety_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
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
      user_trust_scores: {
        Row: {
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_verifications: {
        Row: {
          created_at: string
          document_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selfie_url: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      events_with_details: {
        Row: {
          average_rating: number | null
          category: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          creator_avatar: string | null
          creator_name: string | null
          date: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_private: boolean | null
          is_recurring: boolean | null
          location: string | null
          max_participants: number | null
          parent_event_id: string | null
          participants_count: number | null
          price: number | null
          private_code: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          review_count: number | null
          state: string | null
          time: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_penalty: {
        Args: {
          p_blocked_feature?: string
          p_duration_days?: number
          p_moderator_id: string
          p_penalty_type: string
          p_reason: string
          p_reputation_impact?: number
          p_user_id: string
        }
        Returns: string
      }
      approve_business_verification: {
        Args: { p_moderator_id: string; p_verification_id: string }
        Returns: undefined
      }
      approve_user_verification: {
        Args: { p_moderator_id: string; p_verification_id: string }
        Returns: undefined
      }
      calculate_reputation_score: { Args: { p_user_id: string }; Returns: Json }
      can_send_notification: { Args: { p_user_id: string }; Returns: boolean }
      check_and_grant_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      cleanup_expired_availability: { Args: never; Returns: undefined }
      find_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      generate_private_code: { Args: never; Returns: string }
      get_available_users: {
        Args: { p_city?: string; p_interests?: string[]; p_user_id: string }
        Returns: {
          avatar_url: string
          city: string
          common_interests: string[]
          created_at: string
          expires_at: string
          full_name: string
          id: string
          interests: string[]
          location_lat: number
          location_lng: number
          user_id: string
        }[]
      }
      get_complete_schema: { Args: never; Returns: Json }
      get_friends_events: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          average_rating: number | null
          category: string | null
          city: string | null
          created_at: string | null
          created_by: string | null
          creator_avatar: string | null
          creator_name: string | null
          date: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_private: boolean | null
          is_recurring: boolean | null
          location: string | null
          max_participants: number | null
          parent_event_id: string | null
          participants_count: number | null
          price: number | null
          private_code: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          review_count: number | null
          state: string | null
          time: string | null
          title: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "events_with_details"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_moderation_stats: { Args: never; Returns: Json }
      get_platform_metrics: { Args: never; Returns: Json }
      get_public_profile_by_id: { Args: { p_user_id: string }; Returns: Json }
      get_public_profile_by_username: {
        Args: { p_username: string }
        Returns: Json
      }
      get_reported_users: { Args: never; Returns: Json }
      get_unread_counts: { Args: { p_user_id: string }; Returns: Json }
      get_user_reputation: { Args: { target_user_id: string }; Returns: Json }
      get_user_restrictions: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_admin: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_community_member: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_event_participant: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_profile_public: { Args: { target_user_id: string }; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      revoke_penalty: {
        Args: { p_moderator_id: string; p_penalty_id: string }
        Returns: undefined
      }
      safe_uuid: { Args: { p_text: string }; Returns: string }
      user_wants_notification:
        | { Args: { p_type: string; p_user_id: string }; Returns: boolean }
        | { Args: { p_type: string; p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
      community_member_role: "admin" | "member"
      community_recurrence: "weekly" | "biweekly" | "monthly"
      report_category:
        | "harassment"
        | "hate_speech"
        | "sexual_content"
        | "spam"
        | "fraud"
        | "fake_profile"
        | "suspicious_behavior"
        | "dangerous_event"
        | "misleading_event"
        | "other"
      report_status: "created" | "under_review" | "resolved" | "dismissed"
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
      app_role: ["admin", "moderator", "user", "super_admin"],
      community_member_role: ["admin", "member"],
      community_recurrence: ["weekly", "biweekly", "monthly"],
      report_category: [
        "harassment",
        "hate_speech",
        "sexual_content",
        "spam",
        "fraud",
        "fake_profile",
        "suspicious_behavior",
        "dangerous_event",
        "misleading_event",
        "other",
      ],
      report_status: ["created", "under_review", "resolved", "dismissed"],
    },
  },
} as const
