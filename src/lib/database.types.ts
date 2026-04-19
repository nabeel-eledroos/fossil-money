export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      zip_to_district: {
        Row: {
          zip_code: string
          state: string
          congressional_district: string
          updated_at: string
        }
        Insert: {
          zip_code: string
          state: string
          congressional_district: string
          updated_at?: string
        }
        Update: {
          zip_code?: string
          state?: string
          congressional_district?: string
          updated_at?: string
        }
      }
      politicians: {
        Row: {
          id: string
          bioguide_id: string | null
          fec_candidate_id: string | null
          name: string
          party: string | null
          chamber: string | null
          state: string | null
          district: string | null
          photo_url: string | null
          office_phone: string | null
          office_email: string | null
          website_url: string | null
          signed_nffm_pledge: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bioguide_id?: string | null
          fec_candidate_id?: string | null
          name: string
          party?: string | null
          chamber?: string | null
          state?: string | null
          district?: string | null
          photo_url?: string | null
          office_phone?: string | null
          office_email?: string | null
          website_url?: string | null
          signed_nffm_pledge?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bioguide_id?: string | null
          fec_candidate_id?: string | null
          name?: string
          party?: string | null
          chamber?: string | null
          state?: string | null
          district?: string | null
          photo_url?: string | null
          office_phone?: string | null
          office_email?: string | null
          website_url?: string | null
          signed_nffm_pledge?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      donations: {
        Row: {
          id: string
          politician_id: string | null
          amount: number
          donor_name: string | null
          donor_type: string | null
          sector_tag: string | null
          is_fossil_fuel: boolean
          cycle_year: number
          source: string
          source_transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          politician_id?: string | null
          amount: number
          donor_name?: string | null
          donor_type?: string | null
          sector_tag?: string | null
          is_fossil_fuel?: boolean
          cycle_year: number
          source: string
          source_transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          politician_id?: string | null
          amount?: number
          donor_name?: string | null
          donor_type?: string | null
          sector_tag?: string | null
          is_fossil_fuel?: boolean
          cycle_year?: number
          source?: string
          source_transaction_id?: string | null
          created_at?: string
        }
      }
      lcv_scores: {
        Row: {
          id: string
          politician_id: string | null
          score: number | null
          year: number
          created_at: string
        }
        Insert: {
          id?: string
          politician_id?: string | null
          score?: number | null
          year: number
          created_at?: string
        }
        Update: {
          id?: string
          politician_id?: string | null
          score?: number | null
          year?: number
          created_at?: string
        }
      }
      politician_summaries: {
        Row: {
          politician_id: string
          total_fossil_fuel_donations: number
          total_clean_energy_donations: number
          latest_lcv_score: number | null
          lcv_score_trend: Json | null
          last_updated: string
        }
        Insert: {
          politician_id: string
          total_fossil_fuel_donations?: number
          total_clean_energy_donations?: number
          latest_lcv_score?: number | null
          lcv_score_trend?: Json | null
          last_updated?: string
        }
        Update: {
          politician_id?: string
          total_fossil_fuel_donations?: number
          total_clean_energy_donations?: number
          latest_lcv_score?: number | null
          lcv_score_trend?: Json | null
          last_updated?: string
        }
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

export type Politician = Tables<'politicians'>
export type PoliticianSummary = Tables<'politician_summaries'>
export type Donation = Tables<'donations'>
export type LcvScore = Tables<'lcv_scores'>
export type ZipToDistrict = Tables<'zip_to_district'>

export interface PoliticianWithSummary extends Politician {
  politician_summaries: PoliticianSummary | null
}

export interface RepresentativeResponse {
  id: string
  name: string
  party: string | null
  chamber: string | null
  state: string | null
  district: string | null
  fossilFuelTotal: number
  lcvScores: Record<string, number>
  signedPledge: boolean
  photoUrl: string | null
  contactEmail: string | null
  websiteUrl: string | null
  officePhone: string | null
}
