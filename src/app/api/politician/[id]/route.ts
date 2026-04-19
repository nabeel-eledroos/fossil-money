import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { data: politician, error } = await supabase
      .from('politicians')
      .select(`
        *,
        politician_summaries (*),
        donations (*),
        lcv_scores (*)
      `)
      .eq('id', id)
      .single()

    if (error || !politician) {
      return NextResponse.json(
        { error: 'Politician not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(politician)
  } catch (error) {
    console.error('Error fetching politician:', error)
    return NextResponse.json(
      { error: 'Failed to fetch politician details' },
      { status: 500 }
    )
  }
}
