import Amadeus from 'amadeus';

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

export interface FlightOffer {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  price: {
    total: string;
    currency: string;
  };
  airline: string;
}

/**
 * Finds cheap flight offers for a specific route and date.
 * Uses Amadeus Flight Offers Search API (more reliable in test env).
 */
export async function findFlightOffers(
  origin: string = 'IST',
  destination: string = 'CDG',
  departureDate: string,
  returnDate?: string
): Promise<FlightOffer[]> {
  try {
    const params: Record<string, unknown> = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: '1',
      currencyCode: 'EUR',
      max: 5, // Limit results
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    const response = await amadeus.shopping.flightOffersSearch.get(params);

    if (!response.data || response.data.length === 0) return [];

    // Transform to our format
    return response.data.map((offer: any) => ({
      origin,
      destination,
      departureDate,
      returnDate: returnDate || departureDate,
      price: {
        total: offer.price.total,
        currency: offer.price.currency,
      },
      airline: offer.validatingAirlineCodes?.[0] || 'Unknown',
    }));
  } catch (error) {
    console.error('Amadeus API Error:', error);
    return [];
  }
}

/**
 * Find destinations from a given origin (uses cached/inspiration API when available).
 * Falls back to a list of popular destinations if the inspiration API fails.
 */
export async function findCheapFlights(origin: string = 'IST'): Promise<FlightOffer[]> {
  // Popular destinations from Istanbul for MVP
  const popularDestinations = ['CDG', 'LHR', 'AMS', 'BCN', 'FCO', 'MUC', 'VIE'];

  // Generate dates for the next 2-3 months
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setMonth(futureDate.getMonth() + 2);

  const departureDate = futureDate.toISOString().split('T')[0];
  const returnDate = new Date(futureDate);
  returnDate.setDate(returnDate.getDate() + 7);
  const returnDateStr = returnDate.toISOString().split('T')[0];

  const allOffers: FlightOffer[] = [];

  // Query a few popular destinations
  for (const dest of popularDestinations.slice(0, 3)) {
    try {
      const offers = await findFlightOffers(origin, dest, departureDate, returnDateStr);
      allOffers.push(...offers);
    } catch (e) {
      console.log(`Failed to get offers for ${dest}:`, e);
    }
  }

  return allOffers;
}

export default amadeus;
