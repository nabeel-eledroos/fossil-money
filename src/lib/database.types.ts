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
      politicians: { Row: Politician; Insert: Partial<Politician>; Update: Partial<Politician> }
      politician_summaries: { Row: PoliticianSummary; Insert: Partial<PoliticianSummary>; Update: Partial<PoliticianSummary> }
      donations: { Row: Donation; Insert: Partial<Donation>; Update: Partial<Donation> }
      lcv_scores: { Row: LcvScore; Insert: Partial<LcvScore>; Update: Partial<LcvScore> }
      homepage_stats: { Row: HomepageStats; Insert: Partial<HomepageStats>; Update: Partial<HomepageStats> }
      zip_to_district: { Row: ZipToDistrict; Insert: Partial<ZipToDistrict>; Update: Partial<ZipToDistrict> }
      zip_to_division: { Row: ZipToDivision; Insert: Partial<ZipToDivision>; Update: Partial<ZipToDivision> }
      divisions: { Row: Division; Insert: Partial<Division>; Update: Partial<Division> }
      coverage: { Row: Coverage; Insert: Partial<Coverage>; Update: Partial<Coverage> }
      committees: { Row: Committee; Insert: Partial<Committee>; Update: Partial<Committee> }
      outside_spending: { Row: OutsideSpending; Insert: Partial<OutsideSpending>; Update: Partial<OutsideSpending> }
      key_votes: { Row: KeyVote; Insert: Partial<KeyVote>; Update: Partial<KeyVote> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type CoverageStatus = 'live' | 'pending' | 'unavailable'
export type Level = 'federal' | 'state' | 'local'
export type PledgeStatus = 'signed' | 'none' | 'broke' | 'unknown'
export type Party = 'D' | 'R' | 'I' | 'NP'

export interface Division {
  ocd_id: string
  level: Level
  division_type: string
  name: string
  state: string | null
  parent_ocd_id: string | null
  updated_at: string
}

export interface ZipToDivision {
  zip_code: string
  ocd_id: string
  match_confidence: number
  source: string
  updated_at: string
}

export interface Coverage {
  level: Level
  scope: string
  status: CoverageStatus
  note: string | null
  updated_at: string
}

export interface Committee {
  id: string
  external_id: string | null
  name: string
  level: Level | null
  chamber: string | null
  jurisdiction: string | null
  is_energy_relevant: boolean
  updated_at: string
}

export interface CommitteeMembership {
  politician_id: string
  committee_id: string
  role: string
  is_leadership: boolean
}

export interface Politician {
  id: string
  bioguide_id: string | null
  fec_candidate_id: string | null
  openstates_id: string | null
  cicero_id: string | null
  name: string
  party: string | null
  chamber: string | null
  state: string | null
  district: string | null
  level: Level
  office_type: string | null
  ocd_division_id: string | null
  bio: string | null
  total_raised: number
  incumbent: boolean
  term_start: string | null
  next_election: string | null
  up_this_cycle: boolean
  last_margin: string | null
  pledge_status: PledgeStatus
  pledge_signed_date: string | null
  pledge_source_url: string | null
  photo_url: string | null
  office_phone: string | null
  office_email: string | null
  website_url: string | null
  signed_nffm_pledge: boolean
  created_at: string
  updated_at: string
}

export interface Donation {
  id: string
  politician_id: string | null
  amount: number
  donor_name: string | null
  donor_type: string | null
  sector_tag: string | null
  industry_subsector: string | null
  is_fossil_fuel: boolean
  is_clean_energy: boolean
  employer: string | null
  recipient_committee_id: string | null
  cycle_year: number
  contribution_date: string | null
  contributor_city: string | null
  contributor_state: string | null
  committee_name: string | null
  fec_committee_id: string | null
  fec_file_number: string | null
  source: string
  source_transaction_id: string | null
  source_url: string | null
  created_at: string
}

export interface OutsideSpending {
  id: string
  politician_id: string | null
  amount: number
  spender_name: string | null
  spender_type: string | null
  support_or_oppose: 'support' | 'oppose' | null
  is_fossil_fuel: boolean
  cycle_year: number
  source: string
  source_transaction_id: string | null
  source_url: string | null
  created_at: string
}

export interface KeyVote {
  id: string
  politician_id: string | null
  bill_id: string | null
  bill_title: string
  chamber: string | null
  position: string | null
  pro_environment: boolean | null
  lcv_scored: boolean
  vote_date: string | null
  congress: number | null
  session: number | null
  roll_call: number | null
  source: string | null
  source_url: string | null
  created_at: string
}

export interface LcvScore {
  id: string
  politician_id: string | null
  score: number | null
  year: number
  scope: 'national' | 'state'
  score_type: 'lifetime' | 'session'
  source_url: string | null
  created_at: string
}

export interface LocalEnvGrade {
  politician_id: string
  grade: string | null
  votes_scored: number | null
  method_note: string | null
  updated_at: string
}

export interface LobbyingSpend {
  id: string
  client_name: string
  registrant_name: string | null
  is_fossil_fuel: boolean
  amount: number | null
  year: number
  quarter: number | null
  issue_codes: string[] | null
  chamber_targeted: string | null
  committee_id: string | null
  source: string
  filing_uuid: string | null
  source_url: string | null
  created_at: string
}

export interface PersonalHolding {
  id: string
  politician_id: string | null
  asset_name: string
  company: string | null
  asset_type: string | null
  value_min: number | null
  value_max: number | null
  is_fossil_fuel: boolean
  year: number
  source: string | null
  source_url: string | null
  created_at: string
}

export interface FossilInfrastructure {
  id: string
  ocd_division_id: string | null
  facility_name: string | null
  facility_type: string | null
  fuel_type: string | null
  status: string | null
  annual_co2e_tonnes: number | null
  capacity_mw: number | null
  year: number | null
  lat: number | null
  lng: number | null
  source: string | null
  facility_id: string | null
  source_url: string | null
  created_at: string
}

export interface Challenger {
  id: string
  seat_division_id: string | null
  name: string
  party: string | null
  pledge_status: string | null
  fossil_direct: number | null
  election_date: string | null
  fec_candidate_id: string | null
  source_url: string | null
  created_at: string
}

export interface SubsectorBreakdown {
  oil_gas: number
  coal: number
  utilities: number
  mining: number
}

export interface DonorSplit {
  pac: number
  individual: number
}

export interface TopDonor {
  n: string
  amt: number
  sector: string
  type: 'PAC' | 'Individual'
  sourceUrl?: string
}

export interface VoteRecord {
  m: 'bad' | 'good'
  t: string
  d: string
  bill: string
  sourceUrl?: string
}

export interface LobbyingFirm {
  n: string
  amt: number
}

export interface Holding {
  co: string
  range: string
}

export interface Stake {
  sv: string
  sl: string
}

export interface LcvHistoryEntry {
  y: string
  s: number
}

export interface YearlyDonation {
  y: string
  v: number
}

export interface PoliticianSummary {
  politician_id: string
  total_fossil_fuel_donations: number
  total_raised: number
  fossil_pct: number
  total_outside_fossil: number
  total_clean_energy_donations: number
  subsector_breakdown: SubsectorBreakdown | null
  pac_vs_individual: DonorSplit | null
  top_donors: TopDonor[] | null
  key_votes: VoteRecord[] | null
  fossil_lobbying_total: number
  fossil_lobbying_top: LobbyingFirm[] | null
  personal_fossil_count: number
  personal_fossil_value_min: number
  personal_fossil_value_max: number
  holdings: Holding[] | null
  district_stakes: Stake[] | null
  local_grade: string | null
  pledge_status: PledgeStatus | null
  committee_leverage: boolean
  flagged: boolean
  profile: PoliticianProfile | null
  latest_lcv_score: number | null
  lcv_score_trend: Record<string, number> | null
  last_updated: string
}

export interface PoliticianProfile {
  id: string
  name: string
  office: string
  level: Level
  party: Party
  state: string
  initials: string
  photoUrl: string | null
  committee: string | null
  committeeLeverage: boolean
  since: string
  next: string
  upThisCycle: boolean
  lastMargin: string
  totalRaised: number
  fossilDirect: number
  fossilPct: number
  outsideFossil: number
  cleanEnergy: number
  lcv: number | null
  localScore: string | null
  lcvHist: LcvHistoryEntry[]
  pledge: PledgeStatus
  pledgeSignedDate?: string
  subIndustry: SubsectorBreakdown
  donorSplit: DonorSplit
  yearly: YearlyDonation[]
  donors: TopDonor[]
  votes: VoteRecord[]
  lobbying: {
    annual: number
    note: string
    firms: LobbyingFirm[]
  } | null
  holdings: Holding[]
  stakes: Stake[]
  election: {
    challengers: { name: string; note: string }[]
  }
  sources: {
    money: string
    moneySynced: string
    lcv?: string
  }
  flagged: boolean
}

export interface HomepageStats {
  id: number
  total_fossil_fuel_donations: number
  total_raised_all: number
  fossil_pct_of_total: number
  total_clean_energy_donations: number
  total_outside_fossil: number
  pledge_signers: number
  officials_tracked: number
  scope: string
  as_of_label: string | null
  members_with_fossil_money: number
  members_with_fossil_money_pct: number
  avg_lcv_top_50: number
  members_with_zero: number
  avg_lcv_zero_members: number
  last_updated: string
}

export interface DataSource {
  key: string
  label: string
  url: string | null
  description: string | null
  coverage: string | null
  cadence: string | null
  last_synced: string | null
}

export interface EtlRun {
  id: string
  script: string
  status: 'running' | 'success' | 'error'
  rows_upserted: number | null
  started_at: string
  finished_at: string | null
  notes: string | null
}

export interface RepCard {
  id: string
  name: string
  office: string
  level: Level
  party: Party
  initials: string
  photoUrl: string | null
  fossilDirect: number
  totalRaised: number
  fossilPct: number
  outsideFossil: number
  lcv: number | null
  localScore: string | null
  pledge: PledgeStatus
  committeeLeverage: boolean
  since: string
  flagged: boolean
}

export interface RepsResponse {
  zip: string
  state: string | null
  coverage: {
    federal: CoverageStatus
    state: CoverageStatus
    local: CoverageStatus
  }
  officials: {
    federal: RepCard[]
    state: RepCard[]
    local: RepCard[]
  }
}

export interface NationalStats {
  totalFossil: number
  fossilPctOfTotal: number
  totalCleanEnergy: number
  pledgeSigners: number
  asOfLabel: string
  officialsTracked: number
}

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

export type ZipToDistrict = {
  zip_code: string
  state: string
  congressional_district: string
  updated_at: string
}
