import { NextResponse } from 'next/server';
import { startSearch, getSearchResults, FlightSearchParams } from '@/lib/travelpayouts';

/**
 * Real-time Flight Search API - Debug Version
 */

export async function GET(request: Request) {
  const debugInfo: any = {
    step: 'init',
    errors: [],
    apiResponses: [],
  };

  try {
    // Get user IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const userIp = forwardedFor?.split(',')[0]?.trim() || '78.182.150.226';

    debugInfo.userIp = userIp;

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

    // Sample search
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

    // Start search
    const searchStart = await startSearch(params, userIp);

    if (!searchStart) {
      debugInfo.step = 'search_start_failed';
      debugInfo.errors.push('startSearch returned null - check Netlify function logs for details');

      return NextResponse.json({
        success: false,
        error: 'Failed to start search. Check Netlify logs.',
        debug: debugInfo,
      });
    }

    debugInfo.step = 'search_started';
    debugInfo.searchId = searchStart.searchId;
    debugInfo.resultsUrl = searchStart.resultsUrl;

    // Poll for results (max 30 seconds)
    let allTickets: any[] = [];
    let lastTimestamp = 0;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      attempts++;
      debugInfo.pollAttempt = attempts;

      const results = await getSearchResults(searchStart.searchId, searchStart.resultsUrl, lastTimestamp);

      if (!results) {
        debugInfo.errors.push(`Poll attempt ${attempts} failed`);
        break;
      }

      allTickets = [...allTickets, ...results.tickets];
      lastTimestamp = results.lastTimestamp;

      if (results.isOver) {
        debugInfo.step = 'search_complete';
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    debugInfo.ticketCount = allTickets.length;

    return NextResponse.json({
      success: true,
      message: `Found ${allTickets.length} real-time tickets`,
      userIp,
      searchParams: params,
      tickets: allTickets.slice(0, 20),
      debug: debugInfo,
    });

  } catch (error) {
    debugInfo.step = 'exception';
    debugInfo.errors.push(String(error));

    return NextResponse.json({
      success: false,
      error: String(error),
      debug: debugInfo,
    }, { status: 500 });
  }
}
