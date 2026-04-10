import React, { useState, useEffect } from 'react';
import { Plane, Clock, MapPin, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const CITIES = [
  { id: 'baghdad', name: 'Baghdad', price: 5000, duration: 300 }, // 5 mins
  { id: 'damascus', name: 'Damascus', price: 4500, duration: 240 },
  { id: 'beirut', name: 'Beirut', price: 6000, duration: 180 },
  { id: 'cairo', name: 'Cairo', price: 8000, duration: 600 },
  { id: 'dubai', name: 'Dubai', price: 15000, duration: 900 },
];

export default function Airport() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [isTraveling, setIsTraveling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (profile?.travelingUntil && profile.travelingUntil > Date.now()) {
      setIsTraveling(true);
      const timer = setInterval(() => {
        const remaining = Math.ceil((profile.travelingUntil! - Date.now()) / 1000);
        if (remaining <= 0) {
          setIsTraveling(false);
          setTimeLeft(0);
          clearInterval(timer);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setIsTraveling(false);
    }
  }, [profile?.travelingUntil]);

  const handleTravel = async (cityId: string, price: number, duration: number) => {
    if (!profile) return;

    if (profile.city === 'hospital' || (profile.hospitalizedUntil && profile.hospitalizedUntil > Date.now())) {
      toast.error(t('airport.cannotTravelHospital'));
      return;
    }

    if (profile.city === cityId) {
      toast.error(t('map.alreadyOwn'));
      return;
    }

    if (!profile.documents?.passport) {
      toast.error(t('airport.passportRequired'));
      return;
    }

    const travelPrice = profile.hasPrivateJet ? 0 : price;

    if (profile.cleanMoney < travelPrice) {
      toast.error(t('common.noMoney'));
      return;
    }

    try {
      const drugs = profile.inventory?.drugs || {};
      const hasDrugs = Object.values(drugs).some((amount) => amount > 0);

      if (hasDrugs) {
        const caught = Math.random() < 0.5; // 50% chance
        if (caught) {
          await updateDoc(doc(db, 'users', profile.uid), {
            isImprisoned: true,
            jailTimeEnd: Date.now() + 20 * 60 * 1000,
            'inventory.drugs': {},
            'inventory.transportedDrugs': {}
          });
          toast.error(t('airport.caughtSmuggling'));
          return;
        }
      }

      let finalDuration = duration;
      if (profile.visaCard) {
        const { type } = profile.visaCard;
        if (['Signature', 'Infinite'].includes(type)) {
          finalDuration = Math.floor(duration * 0.8); // 20% faster
        }
      }

      const travelingUntil = Date.now() + finalDuration * 1000;
      const updates: any = {
        cleanMoney: profile.cleanMoney - travelPrice,
        city: cityId,
        travelingUntil: travelingUntil
      };

      if (hasDrugs) {
        const newTransportedDrugs = { ...(profile.inventory?.transportedDrugs || {}) };
        for (const [drugId, amount] of Object.entries(drugs)) {
          newTransportedDrugs[drugId] = (newTransportedDrugs[drugId] || 0) + amount;
        }
        updates['inventory.drugs'] = {};
        updates['inventory.transportedDrugs'] = newTransportedDrugs;
      }

      await updateDoc(doc(db, 'users', profile.uid), updates);
      toast.success(t('map.traveled', { city: t(`map.cities.${cityId}`) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    }
  };

  const handleBuyJet = async () => {
    if (!profile) return;
    const price = 50000000;
    if (profile.cleanMoney < price) {
      toast.error(t('common.noMoney'));
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney - price,
        hasPrivateJet: true
      });
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    }
  };

  if (isTraveling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="relative">
          <Plane size={80} className="text-red-600 animate-bounce" />
          <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full"></div>
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter">{t('airport.inFlight')}</h2>
        <p className="text-zinc-400 max-w-md">{t('airport.flightDesc')}</p>
        <div className="text-6xl font-black text-red-500 font-mono">
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>
    );
  }

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-red-600/10 text-red-600 rounded-xl mafia-glow">
          <Plane size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('nav.airport')}</h2>
          <p className="text-zinc-400">{t('airport.desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Private Jet Card */}
        <div className={`mafia-card relative overflow-hidden group ${profile?.hasPrivateJet ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}>
          <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity">
            <img 
              src="https://images.unsplash.com/photo-1559087867-ce4c9124cb9d?auto=format&fit=crop&q=80&w=1000" 
              alt="Private Jet" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-zinc-800/80 rounded-lg backdrop-blur-sm">
                <Plane size={24} className="text-yellow-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{t('nav.privateJet')}</h3>
                <p className="text-xs text-zinc-500">{t('airport.privateJetOwned')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">{t('map.price')}</span>
                <span className="text-yellow-500 font-bold">{formatMoney(50000000)}</span>
              </div>
              <button
                disabled={profile?.hasPrivateJet}
                onClick={handleBuyJet}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all ${
                  profile?.hasPrivateJet 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white mafia-glow'
                }`}
              >
                {profile?.hasPrivateJet ? t('police.owned') : t('airport.buyPrivateJet')}
              </button>
            </div>
          </div>
        </div>

        {CITIES.map((city) => (
          <div key={city.id} className={`mafia-card relative overflow-hidden ${profile?.city === city.id ? 'border-red-600/50 bg-red-600/5' : ''}`}>
            {profile?.city === city.id && (
              <div className="absolute top-4 end-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter z-20">
                {t('map.currentCity')}
              </div>
            )}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-zinc-800 rounded-lg">
                <MapPin size={24} className="text-zinc-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{t(`map.cities.${city.id}`)}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock size={12} />
                  <span>{Math.floor(city.duration / 60)} {t('common.minutes')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">{t('map.price')}</span>
                <span className="text-green-400 font-bold">
                  {profile?.hasPrivateJet ? (
                    <span className="text-yellow-500 uppercase">{t('map.privateJetTravel')}</span>
                  ) : (
                    formatMoney(city.price)
                  )}
                </span>
              </div>
              
              <button
                disabled={profile?.city === city.id}
                onClick={() => handleTravel(city.id, city.price, city.duration)}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all ${
                  profile?.city === city.id 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : profile?.hasPrivateJet
                      ? 'bg-yellow-600 hover:bg-yellow-500 text-white mafia-glow'
                      : 'bg-red-600 hover:bg-red-500 text-white mafia-glow'
                }`}
              >
                {profile?.city === city.id 
                  ? t('map.currentCity') 
                  : profile?.hasPrivateJet 
                    ? t('map.privateJetTravel') 
                    : t('airport.bookFlight')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
