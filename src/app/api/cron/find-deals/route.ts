import { NextResponse } from 'next/server';
import { searchFlights, FlightSearchParams } from '@/lib/travelpayouts';
import db from '@/lib/db';

/**
 * IMPORTANT: Real-time Flight Search API Limitations
 * 
 * 1. Cannot be used from localhost (127.x.x.x) - must deploy first
 * 2. Rate limit: 100 requests/hour per user IP
 * 3. Search takes 30-60 seconds to complete
 * 4. Must show 9% search-to-click conversion (TOS requirement)
 * 5. Links must only be generated on user click, not pre-cached
 */

// Popular routes to search
const SEARCH_ROUTES = [
  { origin: 'IST', destinations: ['CDG', 'AMS', 'BCN', 'LHR', 'BER', 'VIE', 'ZRH'] },
  { origin: 'SAW', destinations: ['CDG', 'AMS', 'BCN', 'ARN', 'BER', 'VIE', 'ZRH'] },
];

export async function GET(request: Request) {
  try {
    // Check if running on localhost (API won't work)
    const host = request.headers.get('host') || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return NextResponse.json({
        success: false,
        error: 'Real-time Flight Search API cannot be used from localhost. Please deploy the application first.',
        details: 'The Travelpayouts Flight Search API blocks requests from localhost IP addresses (127.x.x.x). You must deploy to a public server to use this API.',
      }, { status: 400 });
    }

    console.log('Starting REAL-TIME flight search...');

    // Get tomorrow and 1 month from now for sample search
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30); // Search for flights 30 days out
    const returnDate = new Date(tomorrow);
    returnDate.setDate(returnDate.getDate() + 7);

    const departureStr = tomorrow.toISOString().split('T')[0];
    const returnStr = returnDate.toISOString().split('T')[0];

    const allTickets: any[] = [];

    // Search first route as example
    const params: FlightSearchParams = {
      origin: 'SAW',
      destination: 'ZRH',
      departureDate: departureStr,
      returnDate: returnStr,
      adults: 1,
      tripClass: 'Y',
    };

    console.log(`Searching: ${params.origin} -> ${params.destination} (${departureStr} - ${returnStr})`);

    const tickets = await searchFlights(params);
    allTickets.push(...tickets.slice(0, 10));

    // Save to database (simplified)
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO deals (origin, destination, departureDate, returnDate, price, currency, skyscannerLink)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let savedCount = 0;
    for (const ticket of allTickets) {
      // Note: With real-time API, we don't pre-generate links
      // Links are generated only when user clicks "Buy"
      stmt.run(
        ticket.origin,
        ticket.destination,
        ticket.departureDate,
        ticket.returnDate,
        ticket.price,
        ticket.currency,
        '' // No pre-generated link - will be fetched on click
      );
      savedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Real-time search complete. Found ${allTickets.length} tickets, saved ${savedCount}.`,
      tickets: allTickets.slice(0, 10),
      note: 'Prices are LIVE from airlines and agencies. Links will be generated when user clicks Buy.',
    });

  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
