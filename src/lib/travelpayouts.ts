/**
 * Travelpayouts REAL-TIME Flight Search API
 * 
 * This API provides LIVE prices, not cached data.
 * Documentation: https://support.travelpayouts.com/hc/en-us/articles/360016197352
 * 
 * IMPORTANT:
 * - Cannot be used from localhost (requires deployment)
 * - Rate limit: 100 requests/hour per user IP
 * - Search takes 30-60 seconds to complete
 * - Links must only be generated on user click (not pre-generated)
 */

import crypto from 'crypto';

const SEARCH_API_BASE = 'https://tickets-api.travelpayouts.com';

export interface FlightSearchParams {
    origin: string;        // IATA code (e.g., "IST")
    destination: string;   // IATA code (e.g., "CDG")
    departureDate: string; // YYYY-MM-DD
    returnDate?: string;   // YYYY-MM-DD (optional for one-way)
    adults?: number;       // 1-9
    children?: number;     // 0-6
    infants?: number;      // 0-6
    tripClass?: 'Y' | 'C' | 'F' | 'W'; // Economy, Business, First, Comfort
}

export interface FlightTicket {
    id: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    price: number;
    currency: string;
    airline: string;
    airlineName: string;
    transfers: number;
    flightLegs: FlightLeg[];
    proposals: Proposal[];
}

export interface FlightLeg {
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    carrier: string;
    flightNumber: string;
    aircraft: string;
}

export interface Proposal {
    id: string;
    agentId: number;
    agentName: string;
    price: number;
    currency: string;
}

export interface SearchResult {
    searchId: string;
    resultsUrl: string;
    tickets: FlightTicket[];
    isOver: boolean;
}

/**
 * Generate the signature required for API authentication
 * Signature = MD5(token:marker:param1:param2:...) where params are sorted alphabetically
 */
function generateSignature(params: Record<string, any>): string {
    const token = process.env.TRAVELPAYOUTS_TOKEN || '';
    const marker = process.env.TRAVELPAYOUTS_MARKER || '';

    // Sort parameters alphabetically and join values
    const sortedValues = Object.keys(params)
        .sort()
        .map(key => {
            const value = params[key];
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        })
        .join(':');

    const signatureString = `${token}:${marker}:${sortedValues}`;
    return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Start a flight search
 * Returns searchId and resultsUrl for polling
 */
export async function startSearch(params: FlightSearchParams, userIp: string = '78.182.150.226'): Promise<{ searchId: string; resultsUrl: string } | null> {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    const marker = process.env.TRAVELPAYOUTS_MARKER;

    if (!token || !marker) {
        console.error('TRAVELPAYOUTS_TOKEN or TRAVELPAYOUTS_MARKER not set');
        return null;
    }

    // Build directions array
    const directions: any[] = [
        {
            origin: params.origin.toUpperCase(),
            destination: params.destination.toUpperCase(),
            date: params.departureDate,
        }
    ];

    // Add return direction for round-trip
    if (params.returnDate) {
        directions.push({
            origin: params.destination.toUpperCase(),
            destination: params.origin.toUpperCase(),
            date: params.returnDate,
        });
    }

    const requestBody = {
        marker,
        locale: 'en-us',
        currency_code: 'EUR',
        market_code: 'TR',
        search_params: {
            trip_class: params.tripClass || 'Y',
            passengers: {
                adults: params.adults || 1,
                children: params.children || 0,
                infants: params.infants || 0,
            },
            directions,
        },
    };

    // Generate signature
    const signature = generateSignature(requestBody);

    try {
        const response = await fetch(`${SEARCH_API_BASE}/search/affiliate/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-affiliate-user-id': token,
                'x-signature': signature,
                'x-real-host': process.env.NEXT_PUBLIC_SITE_URL || 'cheapflights.app',
                'x-user-ip': userIp,
            },
            body: JSON.stringify({ ...requestBody, signature }),
        });

        if (!response.ok) {
            console.error('Search start failed:', response.status, await response.text());
            return null;
        }

        const data = await response.json();
        return {
            searchId: data.search_id,
            resultsUrl: data.results_url,
        };
    } catch (error) {
        console.error('Search start error:', error);
        return null;
    }
}

/**
 * Poll for search results until is_over = true
 */
export async function getSearchResults(
    searchId: string,
    resultsUrl: string,
    lastTimestamp: number = 0
): Promise<{ tickets: FlightTicket[]; isOver: boolean; lastTimestamp: number } | null> {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    const marker = process.env.TRAVELPAYOUTS_MARKER;

    if (!token || !marker) {
        return null;
    }

    const requestBody = {
        search_id: searchId,
        limit: 50,
        last_update_timestamp: lastTimestamp,
    };

    const signature = generateSignature(requestBody);

    try {
        const response = await fetch(`${resultsUrl}/search/affiliate/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-affiliate-user-id': token,
                'x-signature': signature,
                'x-real-host': process.env.NEXT_PUBLIC_SITE_URL || 'cheapflights.app',
                'x-user-ip': '0.0.0.0',
            },
            body: JSON.stringify({ ...requestBody, signature }),
        });

        if (response.status === 304) {
            // No new results yet
            return { tickets: [], isOver: false, lastTimestamp };
        }

        if (!response.ok) {
            console.error('Results fetch failed:', response.status);
            return null;
        }

        const data = await response.json();

        // Parse tickets from response
        const tickets = parseTickets(data);

        return {
            tickets,
            isOver: data.is_over || false,
            lastTimestamp: data.last_update_timestamp || lastTimestamp,
        };
    } catch (error) {
        console.error('Results fetch error:', error);
        return null;
    }
}

/**
 * Parse the complex API response into our FlightTicket format
 */
function parseTickets(data: any): FlightTicket[] {
    if (!data.tickets || !data.flight_legs || !data.airlines || !data.agents) {
        return [];
    }

    const tickets: FlightTicket[] = [];
    const airlines = new Map(data.airlines.map((a: any) => [a.iata, a]));
    const agents = new Map(data.agents.map((a: any) => [a.id, a]));
    const flightLegs = data.flight_legs;

    for (const ticket of data.tickets) {
        if (!ticket.proposals || ticket.proposals.length === 0) continue;

        // Get the cheapest proposal
        const cheapestProposal = ticket.proposals.reduce((min: any, p: any) =>
            (!min || p.price.value < min.price.value) ? p : min, null);

        if (!cheapestProposal) continue;

        // Get flight info from first and last legs
        const firstLegIndex = ticket.segments[0]?.flights[0];
        const lastSegment = ticket.segments[ticket.segments.length - 1];
        const lastLegIndex = lastSegment?.flights[lastSegment.flights.length - 1];

        const firstLeg = flightLegs[firstLegIndex];
        const lastLeg = flightLegs[lastLegIndex];

        if (!firstLeg) continue;

        const airline = airlines.get(cheapestProposal.airline_id?.split('-')[0] || firstLeg.operating_carrier_designator?.split(' ')[0]);

        // Calculate total transfers
        let totalTransfers = 0;
        for (const segment of ticket.segments) {
            totalTransfers += segment.transfers?.length || 0;
        }

        // Parse proposals
        const proposals: Proposal[] = ticket.proposals.map((p: any) => {
            const agent = agents.get(p.agent_id);
            return {
                id: p.id,
                agentId: p.agent_id,
                agentName: (agent as any)?.label || 'Unknown',
                price: p.price.value,
                currency: p.price.currency_code || 'EUR',
            };
        });

        tickets.push({
            id: ticket.id || ticket.signature,
            origin: firstLeg.origin,
            destination: ticket.segments[0]?.flights.length > 0
                ? flightLegs[ticket.segments[0].flights[ticket.segments[0].flights.length - 1]]?.destination
                : firstLeg.destination,
            departureDate: firstLeg.local_departure_date_time?.split('T')[0] || '',
            returnDate: lastLeg?.local_departure_date_time?.split('T')[0] || '',
            price: cheapestProposal.price.value,
            currency: cheapestProposal.price.currency_code || 'EUR',
            airline: (airline as any)?.iata || '',
            airlineName: (airline as any)?.name || '',
            transfers: totalTransfers,
            flightLegs: [], // Simplified for now
            proposals,
        });
    }

    // Sort by price
    tickets.sort((a, b) => a.price - b.price);

    return tickets;
}

/**
 * Get booking link when user clicks "Buy"
 * This must only be called on user action, not pre-generated
 */
export async function getBookingLink(
    resultsUrl: string,
    searchId: string,
    proposalId: string
): Promise<string | null> {
    const marker = process.env.TRAVELPAYOUTS_MARKER;

    if (!marker) {
        return null;
    }

    try {
        const response = await fetch(
            `${resultsUrl}/searches/${searchId}/clicks/${proposalId}`,
            {
                method: 'GET',
                headers: {
                    'x-marker': marker,
                },
            }
        );

        if (!response.ok) {
            console.error('Booking link failed:', response.status);
            return null;
        }

        const data = await response.json();
        return data.url || null;
    } catch (error) {
        console.error('Booking link error:', error);
        return null;
    }
}

/**
 * Complete flight search - starts search and polls until complete
 * NOTE: This takes 30-60 seconds!
 */
export async function searchFlights(params: FlightSearchParams, userIp: string = '78.182.150.226'): Promise<FlightTicket[]> {
    console.log(`Starting real-time search: ${params.origin} -> ${params.destination}`);

    // Start the search
    const searchStart = await startSearch(params, userIp);
    if (!searchStart) {
        console.error('Failed to start search');
        return [];
    }

    console.log(`Search started. ID: ${searchStart.searchId}`);

    // Poll for results
    let allTickets: FlightTicket[] = [];
    let lastTimestamp = 0;
    let attempts = 0;
    const maxAttempts = 30; // Max 30 seconds of polling

    while (attempts < maxAttempts) {
        attempts++;

        const results = await getSearchResults(searchStart.searchId, searchStart.resultsUrl, lastTimestamp);

        if (!results) {
            console.error('Failed to get results');
            break;
        }

        allTickets = [...allTickets, ...results.tickets];
        lastTimestamp = results.lastTimestamp;

        if (results.isOver) {
            console.log(`Search complete. Found ${allTickets.length} tickets.`);
            break;
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove duplicates and sort by price
    const uniqueTickets = removeDuplicateTickets(allTickets);
    uniqueTickets.sort((a, b) => a.price - b.price);

    return uniqueTickets;
}

function removeDuplicateTickets(tickets: FlightTicket[]): FlightTicket[] {
    const seen = new Set<string>();
    return tickets.filter(ticket => {
        const key = `${ticket.origin}-${ticket.destination}-${ticket.departureDate}-${ticket.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Export for backward compatibility with old code
export { generateSignature };
