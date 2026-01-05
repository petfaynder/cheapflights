'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Sparkles, RefreshCw } from 'lucide-react';
import DealCard from '@/components/DealCard';

interface Deal {
  id: number;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  price: number;
  currency: string;
  skyscannerLink: string;
}

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      if (data.success) {
        setDeals(data.deals);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      await fetch('/api/cron/find-deals');
      await fetchDeals();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Hero Section */}
      <header className="relative pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Yapay Zeka Destekli Fırsat Bulucu</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-6"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Ucuz Uçuşları
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400">
              Anında Keşfet
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Sistemimiz dünya genelindeki uçuş fiyatlarını tarar ve size en iyi fırsatları sunar.
            Skyscanner üzerinden güvenle rezervasyon yapın.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={runScan}
            disabled={scanning}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Taranıyor...' : 'Yeni Fırsatları Tara'}
          </motion.button>
        </div>
      </header>

      {/* Deals Grid */}
      <section className="relative px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Plane className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Güncel Fırsatlar</h2>
            <span className="text-slate-500">({deals.length} adet)</span>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Fırsatlar yükleniyor...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-20">
              <Plane className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">Henüz fırsat bulunamadı.</p>
              <button
                onClick={runScan}
                className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
              >
                Fırsatları Taramak İçin Tıkla
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((deal, index) => (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <DealCard
                    origin={deal.origin}
                    destination={deal.destination}
                    departureDate={deal.departureDate}
                    returnDate={deal.returnDate}
                    price={deal.price}
                    currency={deal.currency}
                    skyscannerLink={deal.skyscannerLink}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-slate-500 text-sm">
          <p>Veriler Amadeus API üzerinden alınmaktadır. Fiyatlar değişkenlik gösterebilir.</p>
          <p className="mt-2">© 2026 CheapFlights. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </main>
  );
}
