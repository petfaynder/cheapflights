import { NextResponse } from 'next/server';

export interface Deal {
    id: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    price: number;
    currency: string;
    airline: string;
    link: string;
}

// In-memory cache for demo purposes
// In production, use Redis or a cloud database
let cachedDeals: Deal[] = [];
let lastFetch: number = 0;

export async function GET() {
    try {
        // Return cached deals (populated by cron job)
        // For now, return empty array - will be populated after search
        return NextResponse.json({
            success: true,
            deals: cachedDeals,
            message: cachedDeals.length === 0
                ? 'No deals cached. Run /api/cron/find-deals first.'
                : `${cachedDeals.length} deals available`,
            lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
        });
    } catch (error) {
        console.error('Failed to fetch deals:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

// Export for cron job to update
export function updateDealsCache(deals: Deal[]) {
    cachedDeals = deals;
    lastFetch = Date.now();
}
