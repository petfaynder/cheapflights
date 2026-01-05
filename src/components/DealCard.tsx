'use client';

import { motion } from 'framer-motion';
import { Plane, Calendar, ExternalLink } from 'lucide-react';

interface DealCardProps {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    price: number;
    currency: string;
    skyscannerLink: string;
}

// Airport code to city name mapping
const airportNames: Record<string, string> = {
    IST: 'Istanbul',
    SAW: 'Istanbul',
    CDG: 'Paris',
    LHR: 'London',
    AMS: 'Amsterdam',
    BCN: 'Barcelona',
    FCO: 'Rome',
    MUC: 'Munich',
    VIE: 'Vienna',
    ARN: 'Stockholm',
    JFK: 'New York',
    LAX: 'Los Angeles',
};

export default function DealCard({
    origin,
    destination,
    departureDate,
    returnDate,
    price,
    currency,
    skyscannerLink,
}: DealCardProps) {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const originCity = airportNames[origin] || origin;
    const destCity = airportNames[destination] || destination;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content */}
            <div className="relative p-6">
                {/* Route */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white">{originCity}</span>
                        <Plane className="w-5 h-5 text-emerald-400 rotate-45" />
                        <span className="text-2xl font-bold text-white">{destCity}</span>
                    </div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{origin} → {destination}</span>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 mb-6 text-slate-300">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <span>{formatDate(departureDate)}</span>
                    <span className="text-slate-500">—</span>
                    <span>{formatDate(returnDate)}</span>
                </div>

                {/* Price & CTA */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-slate-400 mb-1">Gidiş-Dönüş</p>
                        <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            {currency === 'EUR' ? '€' : currency} {price.toFixed(0)}
                        </p>
                    </div>

                    <a
                        href={skyscannerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105"
                    >
                        Görüntüle
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
        </motion.div>
    );
}
