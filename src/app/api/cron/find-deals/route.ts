import { NextResponse } from 'next/server';
import { findCheapDeals } from '@/lib/travelpayouts';

/**
 * Flight Search using Cached Data API
 * Returns deals from last 48 hours of user searches
 */

export async function GET() {
  try {
    console.log('Starting flight search with cached API...');

    const token = process.env.TRAVELPAYOUTS_TOKEN;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'TRAVELPAYOUTS_TOKEN not set',
      }, { status: 400 });
    }

    const deals = await findCheapDeals();

    console.log(`Found ${deals.length} deals`);

    return NextResponse.json({
      success: true,
      message: `Found ${deals.length} flight deals`,
      tickets: deals.slice(0, 30),
      note: 'Prices are from cached data (last 48 hours). May differ 10-20% from live prices.',
    });

  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
