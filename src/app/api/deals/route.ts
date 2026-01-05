import { NextResponse } from 'next/server';
import db from '@/lib/db';

export interface Deal {
    id: number;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    price: number;
    currency: string;
    skyscannerLink: string;
    foundAt: string;
}

export async function GET() {
    try {
        const deals = db.prepare(`
      SELECT * FROM deals 
      ORDER BY foundAt DESC 
      LIMIT 20
    `).all() as Deal[];

        return NextResponse.json({ success: true, deals });
    } catch (error) {
        console.error('Failed to fetch deals:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
