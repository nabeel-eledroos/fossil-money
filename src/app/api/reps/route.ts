import { NextRequest, NextResponse } from 'next/server'
import { getRepsByZip } from '@/lib/zip-lookup'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const zip = searchParams.get('zip')

  if (!zip) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    )
  }

  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: 'Invalid ZIP code format. Must be 5 digits.' },
      { status: 400 }
    )
  }

  try {
    const representatives = await getRepsByZip(zip)
    return NextResponse.json({
      zip,
      representatives
    })
  } catch (error) {
    console.error('Error fetching representatives:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch representatives' },
      { status: 500 }
    )
  }
}
