import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Dices } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function Casino() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(100);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);

  const flipCoin = async (choice: 'heads' | 'tails') => {
    if (!profile || profile.cleanMoney < betAmount || betAmount <= 0) {
      toast.error(t('casino.invalidBet'));
      return;
    }

    if (betAmount > 1000000) {
      toast.error('الحد الأقصى للرهان هو 1,000,000$');
      return;
    }

    setIsFlipping(true);
    setResult(null);

    // Simulate flip delay
    setTimeout(async () => {
      const outcome = Math.random() > 0.5 ? 'heads' : 'tails';
      setResult(outcome);

      const won = outcome === choice;
      const newBalance = won 
        ? profile.cleanMoney + betAmount 
        : profile.cleanMoney - betAmount;

      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          cleanMoney: newBalance
        });
        if (won) {
          toast.success(t('casino.won', { outcome: t(`casino.${outcome}`), bet: betAmount }));
        } else {
          toast.error(t('casino.lost', { outcome: t(`casino.${outcome}`), bet: betAmount }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        setIsFlipping(false);
      }
    }, 1000);
  };

  return (
    <div className="text-white space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
          <Dices size={32} />
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('casino.title')}</h2>
      </div>

      <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 max-w-md mx-auto text-center">
        <h3 className="text-2xl font-bold mb-2">{t('casino.coinFlip')}</h3>
        <p className="text-zinc-400 mb-8">{t('casino.desc')}</p>

        <div className="mb-8">
          <label className="block text-sm font-medium text-zinc-400 mb-2">{t('casino.betAmount')}</label>
          <input 
            type="number" 
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-center text-xl font-bold focus:outline-none focus:border-yellow-500"
            min="1"
            max={Math.min(profile?.cleanMoney || 0, 1000000)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => flipCoin('heads')}
            disabled={isFlipping || (profile?.cleanMoney || 0) < betAmount}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-6 py-4 rounded-xl font-bold transition-colors"
          >
            {t('casino.heads')}
          </button>
          <button 
            onClick={() => flipCoin('tails')}
            disabled={isFlipping || (profile?.cleanMoney || 0) < betAmount}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-6 py-4 rounded-xl font-bold transition-colors"
          >
            {t('casino.tails')}
          </button>
        </div>

        {result && (
          <div className={`mt-8 text-xl font-bold ${result === 'heads' ? 'text-yellow-500' : 'text-zinc-300'}`}>
            {t('common.success')} - {t(`casino.${result}`)}
          </div>
        )}
      </div>
    </div>
  );
}
