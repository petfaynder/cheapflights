import { NextResponse } from 'next/server';
import { searchFlights, FlightSearchParams } from '@/lib/travelpayouts';

/**
 * Real-time Flight Search API
 * Debug version - shows detailed error info
 */

export async function GET(request: Request) {
  const debugInfo: any = {
    step: 'init',
    errors: [],
  };

  try {
    // Get user IP for API requirement
    const forwardedFor = request.headers.get('x-forwarded-for');
    const userIp = forwardedFor?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '78.182.150.226'; // Fallback to a valid IP for testing

    debugInfo.userIp = userIp;
    debugInfo.step = 'got_ip';

    // Check environment variables
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    const marker = process.env.TRAVELPAYOUTS_MARKER;

    debugInfo.hasToken = !!token;
    debugInfo.hasMarker = !!marker;
    debugInfo.tokenLength = token?.length || 0;
    debugInfo.markerValue = marker || 'NOT_SET';

    if (!token || !marker) {
      return NextResponse.json({
        success: false,
        error: 'Missing API credentials',
        debug: debugInfo,
      }, { status: 400 });
    }

    debugInfo.step = 'starting_search';

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

    debugInfo.searchParams = params;

    console.log(`Searching: ${params.origin} -> ${params.destination}, IP: ${userIp}`);

    const tickets = await searchFlights(params, userIp);

    debugInfo.step = 'search_complete';
    debugInfo.ticketCount = tickets.length;

    return NextResponse.json({
      success: true,
      message: `Found ${tickets.length} real-time tickets`,
      userIp,
      searchParams: params,
      tickets: tickets.slice(0, 20),
      debug: debugInfo,
    });

  } catch (error) {
    debugInfo.step = 'error';
    debugInfo.errors.push(String(error));

    console.error('Search failed:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      debug: debugInfo,
    }, { status: 500 });
  }
}
