import React, { useState, useEffect } from 'react';
import { Siren, Star, CreditCard, Award, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function Police() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [now, setNow] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const jailEnd = profile?.jailTimeEnd || 0;
  const isJailed = jailEnd > now;
  const timeRemaining = isJailed ? Math.ceil((jailEnd - now) / 1000) : 0;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const handleUpgrade = async (rank: string, price: number) => {
    if (isSubmitting) return;
    if (!profile) return;
    if (profile.cleanMoney < price) {
      toast.error(t('common.noMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        policeRank: rank,
        cleanMoney: increment(-price)
      });
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBribe = async () => {
    if (isSubmitting) return;
    if (!profile) return;
    const bribePrice = (profile.wantedStars || 0) * 100000;
    if (bribePrice === 0) {
      toast.error('أنت لست مطلوباً!');
      return;
    }
    if (profile.cleanMoney < bribePrice) {
      toast.error(t('common.noMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        wanted: false,
        cleanMoney: increment(-bribePrice),
        displayName: `${profile.displayName} (هوية جديدة)`
      });
      toast.success('تم دفع الرشوة، أنت الآن مواطن حر بهوية جديدة!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const ranks = [
    { id: 'Silver', name: t('police.silver'), price: 50000, color: 'text-zinc-300', bg: 'bg-zinc-300/10' },
    { id: 'Bronze', name: t('police.bronze'), price: 100000, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'Diamond', name: t('police.diamond'), price: 500000, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  ];

  const DocumentItem = ({ icon: Icon, label, isOwned }: { icon: any, label: string, isOwned: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isOwned ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-500'}`}>
          <Icon size={16} />
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider ${isOwned ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
      </div>
      {isOwned ? (
        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
      ) : (
        <div className="w-2 h-2 rounded-full bg-zinc-800" />
      )}
    </div>
  );

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
          <Siren size={32} />
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('police.title')}</h2>
      </div>

      {profile?.wanted && (
        <div className="p-6 rounded-xl border bg-red-950/50 border-red-900 text-center mb-8">
          <h3 className="text-2xl font-bold mb-4 text-red-500">أنت مطلوب للعدالة!</h3>
          <button 
            onClick={handleBribe}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            رشوة الشرطة ({formatMoney((profile.wantedStars || 0) * 100000)}) - تغيير الهوية
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className={`p-8 rounded-xl border ${isJailed ? 'bg-red-950/50 border-red-900' : 'bg-zinc-900 border-zinc-800'} text-center`}>
          <h3 className="text-2xl font-bold mb-4">{t('police.jailStatus')}</h3>
          {isJailed ? (
            <div>
              <p className="text-red-400 text-lg mb-2">{t('police.jailed')}</p>
              <div className="text-5xl font-black text-red-500 tracking-widest">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <p className="text-green-400 text-xl font-bold">{t('police.free')}</p>
          )}
        </div>

        <div className="mafia-card space-y-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="text-blue-500" />
            {t('police.documents.title')}
          </h3>
          <div className="space-y-3">
            <DocumentItem icon={CreditCard} label={t('police.documents.idCard')} isOwned={!!profile.documents?.clearance} />
            <DocumentItem icon={Award} label={t('police.documents.passport')} isOwned={!!profile.documents?.passport} />
            <DocumentItem icon={ShieldCheck} label={t('police.documents.driverLicense')} isOwned={!!profile.documents?.license} />
            <DocumentItem icon={Siren} label={t('police.documents.weaponLicense')} isOwned={!!profile.documents?.weapon} />
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold mb-4">{t('police.upgrades')}</h3>
      <p className="text-zinc-400 mb-6">{t('police.upgradesDesc')}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ranks.map((rank) => {
          const isOwned = profile?.policeRank === rank.id || 
                          (rank.id === 'Silver' && ['Bronze', 'Diamond'].includes(profile?.policeRank || '')) ||
                          (rank.id === 'Bronze' && profile?.policeRank === 'Diamond');
          
          return (
            <div key={rank.id} className="mafia-card text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${rank.bg} ${rank.color} mafia-glow`}>
                <Star size={32} />
              </div>
              <h4 className="text-lg font-bold mb-4">{rank.name}</h4>
              {isOwned ? (
                <div className="bg-zinc-800 text-zinc-400 py-3 rounded-lg font-bold">
                  {t('police.owned')}
                </div>
              ) : (
                <button 
                  onClick={() => handleUpgrade(rank.id, rank.price)}
                  disabled={isSubmitting}
                  className="w-full mafia-button-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('police.buy', { price: formatMoney(rank.price) })}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
