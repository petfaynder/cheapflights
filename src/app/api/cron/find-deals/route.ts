import { NextResponse } from 'next/server';
import { searchFlights, FlightSearchParams } from '@/lib/travelpayouts';

/**
 * Real-time Flight Search API
 * 
 * NOTE: No database - returns live results from Travelpayouts API
 * Rate limit: 100 requests/hour per user IP
 */

export async function GET(request: Request) {
  try {
    // Get user IP for rate limiting (required by API)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const userIp = forwardedFor?.split(',')[0] || '0.0.0.0';

    // Check if running on localhost (API won't work)
    if (userIp.startsWith('127.') || userIp === '::1') {
      return NextResponse.json({
        success: false,
        error: 'Real-time Flight Search API cannot be used from localhost.',
        details: 'Deploy to a public server to use this API.',
      }, { status: 400 });
    }

    console.log('Starting REAL-TIME flight search...');

    // Sample search: Istanbul to Zurich, 30 days from now
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 30);
    const returnDate = new Date(departureDate);
    returnDate.setDate(returnDate.getDate() + 7);

    const params: FlightSearchParams = {
      origin: 'SAW',
      destination: 'ZRH',
      departureDate: departureDate.toISOString().split('T')[0],
      returnDate: returnDate.toISOString().split('T')[0],
      adults: 1,
      tripClass: 'Y',
    };

    console.log(`Searching: ${params.origin} -> ${params.destination}`);

    const tickets = await searchFlights(params);

    return NextResponse.json({
      success: true,
      message: `Found ${tickets.length} real-time tickets`,
      userIp,
      searchParams: params,
      tickets: tickets.slice(0, 20), // Top 20 cheapest
    });

  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
