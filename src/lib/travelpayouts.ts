/**
 * Travelpayouts Flight Data API Client
 * 
 * USING CACHED DATA API (v3) - simpler and works without complex signature
 * Returns data from last 48 hours of user searches
 */

const TRAVELPAYOUTS_API_BASE = 'https://api.travelpayouts.com/aviasales/v3';

export interface TravelpayoutsFlight {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    price: number;
    currency: string;
    airline: string;
    flightNumber: string;
    transfers: number;
    tripDuration: number;
    link: string;
}

export interface FlightSearchParams {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults?: number;
    tripClass?: 'Y' | 'C' | 'F' | 'W';
}

/**
 * Get round-trip prices using the CACHED DATA API
 * This is simpler and doesn't require complex signature
 */
export async function searchFlights(
    params: FlightSearchParams,
    userIp?: string
): Promise<TravelpayoutsFlight[]> {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    if (!token) {
        console.error('TRAVELPAYOUTS_TOKEN is not set');
        return [];
    }

    const queryParams = new URLSearchParams({
        origin: params.origin,
        destination: params.destination,
        currency: 'eur',
        market: 'tr',
        limit: '30',
        token,
        sorting: 'price',
        one_way: 'false',
    });

    if (params.departureDate) {
        queryParams.set('departure_at', params.departureDate.substring(0, 7)); // YYYY-MM
    }

    try {
        const url = `${TRAVELPAYOUTS_API_BASE}/prices_for_dates?${queryParams}`;
        console.log('Fetching from Travelpayouts cached API...');

        const response = await fetch(url);
        const data = await response.json();

        if (!data.success || !data.data) {
            console.error('Travelpayouts API Error:', data.error || 'No data');
            return [];
        }

        // Filter round-trip only
        const roundTrips = data.data.filter((t: any) => t.return_at);

        return roundTrips.map((ticket: any) => {
            const actualOrigin = ticket.origin_airport || ticket.origin;
            const actualDest = ticket.destination_airport || ticket.destination;

            const depDate = new Date(ticket.departure_at);
            const retDate = new Date(ticket.return_at);
            const tripDuration = Math.round((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));

            return {
                origin: actualOrigin,
                destination: actualDest,
                departureDate: ticket.departure_at?.split('T')[0] || '',
                returnDate: ticket.return_at?.split('T')[0] || '',
                price: ticket.price,
                currency: 'eur',
                airline: ticket.airline,
                flightNumber: ticket.flight_number || '',
                transfers: ticket.transfers || 0,
                tripDuration,
                link: generateSkyscannerLink(actualOrigin, actualDest, ticket.departure_at, ticket.return_at, ticket.airline),
            };
        });
    } catch (error) {
        console.error('Travelpayouts fetch error:', error);
        return [];
    }
}

/**
 * Search multiple routes and return cheapest deals
 */
export async function findCheapDeals(): Promise<TravelpayoutsFlight[]> {
    const origins = ['IST', 'SAW'];
    const destinations = ['ZRH', 'BER', 'CDG', 'AMS', 'BCN', 'VIE', 'MUC', 'PRG', 'BUD', 'ARN'];

    const allFlights: TravelpayoutsFlight[] = [];

    // Get departure month (next month)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const departureMonth = nextMonth.toISOString().substring(0, 7);

    for (const origin of origins) {
        for (const dest of destinations) {
            try {
                const flights = await searchFlights({
                    origin,
                    destination: dest,
                    departureDate: departureMonth,
                });

                allFlights.push(...flights.slice(0, 2));

                // Rate limit
                await new Promise(r => setTimeout(r, 200));
            } catch (e) {
                console.log(`Error for ${origin}->${dest}:`, e);
            }
        }
    }

    // Sort by price and deduplicate
    const seen = new Set<string>();
    return allFlights
        .sort((a, b) => a.price - b.price)
        .filter(f => {
            const key = `${f.origin}-${f.destination}-${f.departureDate}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

/**
 * Generate Skyscanner link with correct airport codes
 */
function generateSkyscannerLink(
    origin: string,
    destination: string,
    departureDate?: string,
    returnDate?: string,
    airline?: string
): string {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = String(date.getFullYear()).slice(2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const depDate = formatDate(departureDate);
    const retDate = formatDate(returnDate);
    const originCode = origin.toLowerCase();
    const destCode = destination.toLowerCase();

    const baseUrl = `https://www.skyscanner.net/transport/flights/${originCode}/${destCode}/${depDate}/${retDate}/`;

    const params = new URLSearchParams({
        adultsv2: '1',
        cabinclass: 'economy',
        children: '0',
        infants: '0',
        rtn: '1',
        currency: 'eur',
    });

    if (airline) {
        params.set('airlines', airline);
    }

    return `${baseUrl}?${params.toString()}`;
}

export { generateSkyscannerLink, FlightSearchParams as SearchParams };
