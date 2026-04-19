import { supabase } from './db'
import type { RepresentativeResponse, PoliticianWithSummary, ZipToDistrict } from './database.types'

export async function getRepsByZip(zip: string): Promise<RepresentativeResponse[]> {
  const { data: zipData, error: zipError } = await supabase
    .from('zip_to_district')
    .select('state, congressional_district')
    .eq('zip_code', zip)
    .single()

  if (zipError || !zipData) {
    throw new Error(`Invalid ZIP code: ${zip}`)
  }

  const zipRecord = zipData as unknown as Pick<ZipToDistrict, 'state' | 'congressional_district'>
  const { state, congressional_district } = zipRecord
  const districtNumber = congressional_district.split('-')[1]

  const [senatorsResult, repResult] = await Promise.all([
    supabase
      .from('politicians')
      .select(`
        *,
        politician_summaries (*)
      `)
      .eq('state', state)
      .eq('chamber', 'senate'),
    supabase
      .from('politicians')
      .select(`
        *,
        politician_summaries (*)
      `)
      .eq('state', state)
      .eq('chamber', 'house')
      .eq('district', districtNumber)
  ])

  const politicians: PoliticianWithSummary[] = [
    ...((senatorsResult.data || []) as unknown as PoliticianWithSummary[]),
    ...((repResult.data || []) as unknown as PoliticianWithSummary[])
  ]

  return politicians.map(pol => ({
    id: pol.id,
    name: pol.name,
    party: pol.party,
    chamber: pol.chamber,
    state: pol.state,
    district: pol.district,
    fossilFuelTotal: pol.politician_summaries?.total_fossil_fuel_donations || 0,
    lcvScores: (pol.politician_summaries?.lcv_score_trend as Record<string, number>) || {},
    signedPledge: pol.signed_nffm_pledge,
    photoUrl: pol.photo_url,
    contactEmail: pol.office_email,
    websiteUrl: pol.website_url,
    officePhone: pol.office_phone
  }))
}
