import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { Globe, Package, ArrowRight, ArrowLeft, ShieldCheck, Lock, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COUNTRIES = [
  { id: 'colombia', flag: '🇨🇴', goods: [{ id: 'drugs', price: 15000, type: 'drugs' }] },
  { id: 'russia', flag: '🇷🇺', goods: [{ id: 'weapons', price: 35000, type: 'weapons' }] },
  { id: 'uae', flag: '🇦🇪', goods: [{ id: 'gold', price: 50000, type: 'gold' }, { id: 'electronics', price: 10000, type: 'electronics' }] },
  { id: 'egypt', flag: '🇪🇬', goods: [{ id: 'antiques', price: 100000, type: 'antiques' }] },
  { id: 'lebanon', flag: '🇱🇧', goods: [{ id: 'drugs', price: 12000, type: 'drugs' }, { id: 'weapons', price: 30000, type: 'weapons' }] },
];

const COOLDOWN_MS = 10000;

export default function Trade() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState(0);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!profile?.lastTradeTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - profile.lastTradeTime!;
      if (diff < COOLDOWN_MS) {
        setTimeLeft(Math.ceil((COOLDOWN_MS - diff) / 1000));
      } else {
        setTimeLeft(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.lastTradeTime]);

  const handleAppointAgent = async (countryId: string) => {
    if (!profile) return;
    const cost = 50000;
    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    try {
      const newAgents = [...(profile.agents || []), countryId];
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney - cost,
        agents: newAgents
      });
      toast.success(t('trade.agentAppointed'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleTrade = async (type: string, price: number, action: 'buy' | 'sellAll', quantity: number = 1) => {
    if (!profile) return;

    if (profile.lastTradeTime && Date.now() - profile.lastTradeTime < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - profile.lastTradeTime)) / 1000);
      toast.error(t('trade.cooldown', { time: remaining }));
      return;
    }

    const inventory = profile.inventory;
    if (!inventory) return;

    let currentStock = 0;
    const isObjectCategory = ['drugs', 'weapons', 'armor', 'tools'].includes(type);
    
    if (isObjectCategory) {
      currentStock = (inventory as any)[type]?.['all'] || 0;
    } else {
      const stock = (inventory as any)[type];
      currentStock = typeof stock === 'object' ? (stock?.all || 0) : (stock || 0);
    }

    if (action === 'buy') {
      const totalCost = price * quantity;
      if (profile.dirtyMoney < totalCost) {
        toast.error(t('common.noDirtyMoney'));
        return;
      }

      try {
        const updatePath = isObjectCategory ? `inventory.${type}.all` : `inventory.${type}`;
        await updateDoc(doc(db, 'users', profile.uid), {
          dirtyMoney: profile.dirtyMoney - totalCost,
          [updatePath]: currentStock + quantity,
          lastTradeTime: Date.now()
        });
        toast.success(t('trade.boughtMultiple', { count: quantity, item: t(`trade.goods.${type}`) }) || t('trade.bought', { item: t(`trade.goods.${type}`) }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }
    } else if (action === 'sellAll') {
      if (currentStock <= 0) {
        toast.error(t('trade.noItem'));
        return;
      }

      const sellPricePerUnit = Math.floor(price * 1.2);
      const totalSellPrice = sellPricePerUnit * currentStock;

      try {
        const updatePath = isObjectCategory ? `inventory.${type}.all` : `inventory.${type}`;
        await updateDoc(doc(db, 'users', profile.uid), {
          dirtyMoney: profile.dirtyMoney + totalSellPrice,
          [updatePath]: 0,
          lastTradeTime: Date.now()
        });
        toast.success(t('trade.soldAll', { count: currentStock, item: t(`trade.goods.${type}`), price: formatMoney(totalSellPrice) }) || t('trade.sold', { item: t(`trade.goods.${type}`), price: formatMoney(totalSellPrice) }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-indigo-600/10 text-indigo-500 rounded-2xl mafia-glow border border-indigo-600/20">
            <Globe className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">{t('trade.title')}</h1>
            <p className="text-zinc-400 max-w-md leading-relaxed">{t('trade.desc')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <AnimatePresence>
            {timeLeft > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="bg-indigo-600/20 px-6 py-3 rounded-2xl border border-indigo-600/30 flex items-center gap-3"
              >
                <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{t('trade.cooldownTitle') || 'انتظار'}</span>
                  <span className="text-xl font-black text-white font-mono leading-none">{timeLeft}s</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="bg-black/40 px-6 py-3 rounded-2xl border border-zinc-800 flex flex-col items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('header.dirtyMoney')}</span>
            <span className="text-xl font-black text-red-500 font-mono">{formatMoney(profile?.dirtyMoney || 0)}</span>
          </div>
          <div className="bg-black/40 px-6 py-3 rounded-2xl border border-zinc-800 flex flex-col items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('header.cleanMoney')}</span>
            <span className="text-xl font-black text-green-500 font-mono">{formatMoney(profile?.cleanMoney || 0)}</span>
          </div>
        </div>
      </div>

      {/* Market Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {COUNTRIES.map((country, idx) => {
          const hasAgent = profile?.agents?.includes(country.id);

          return (
            <motion.div 
              key={country.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative"
            >
              <div className={`mafia-card h-full flex flex-col transition-all duration-500 ${!hasAgent ? 'grayscale-[0.8] opacity-80' : 'hover:border-indigo-600/50'}`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500">
                      {country.flag}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t(`trade.countries.${country.id}`)}</h2>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <TrendingUp size={12} className="text-indigo-500" />
                        {t('trade.view')}
                      </div>
                    </div>
                  </div>
                  
                  {!hasAgent ? (
                    <button
                      onClick={() => handleAppointAgent(country.id)}
                      className="mafia-button-primary px-6 py-2.5 text-sm flex items-center gap-2"
                    >
                      <ShieldCheck size={16} />
                      {t('trade.appointAgent')}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-500 rounded-xl border border-green-600/20 text-xs font-black uppercase tracking-widest">
                      <ShieldCheck size={14} />
                      {t('trade.agentAppointed')}
                    </div>
                  )}
                </div>

                <div className="relative flex-1">
                  {!hasAgent && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-2xl border border-dashed border-zinc-700">
                      <Lock size={32} className="text-zinc-500 mb-3" />
                      <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">{t('trade.agentRequired') || 'AGENT REQUIRED'}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {country.goods.map((good) => {
                      const isObjectCategory = ['drugs', 'weapons', 'armor', 'tools'].includes(good.type);
                      const stock = isObjectCategory 
                        ? (profile?.inventory as any)?.[good.type]?.['all'] || 0
                        : (profile?.inventory as any)?.[good.type]?.all || (profile?.inventory as any)?.[good.type] || 0;

                      return (
                        <div key={good.id} className="bg-black/40 p-5 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group/item">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover/item:text-indigo-500 transition-colors border border-zinc-800">
                                <Package size={24} />
                              </div>
                              <div>
                                <h3 className="font-black text-white uppercase tracking-tight">{t(`trade.goods.${good.id}`)}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('trade.stock')}</span>
                                  <span className="text-xs font-mono text-indigo-400 font-bold">{stock}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end px-3">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">{t('trade.buy')}</span>
                                <span className="text-sm font-mono font-black text-red-500">{formatMoney(good.price)}</span>
                              </div>
                              <div className="w-px h-8 bg-zinc-800" />
                              <div className="flex flex-col items-end px-3">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">{t('trade.sell')}</span>
                                <span className="text-sm font-mono font-black text-green-500">{formatMoney(Math.floor(good.price * 1.2))}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center gap-2 bg-black/40 border border-zinc-800 rounded-xl px-3 py-1.5 w-full sm:w-auto">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('trade.quantity')}</span>
                              <input 
                                type="number" 
                                min="1" 
                                max="100" 
                                value={buyQuantities[`${country.id}-${good.id}`] || 1}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                                  setBuyQuantities(prev => ({ ...prev, [`${country.id}-${good.id}`]: val }));
                                }}
                                className="bg-transparent text-white font-mono font-bold w-12 outline-none text-center"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                              <button
                                disabled={timeLeft > 0}
                                onClick={() => handleTrade(good.type, good.price, 'buy', buyQuantities[`${country.id}-${good.id}`] || 1)}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest border ${
                                  timeLeft > 0 
                                  ? 'bg-zinc-800/50 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50' 
                                  : 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border-red-600/20'
                                }`}
                              >
                                <ArrowLeft size={14} />
                                {t('trade.buy')}
                              </button>
                              <button
                                disabled={timeLeft > 0 || stock <= 0}
                                onClick={() => handleTrade(good.type, good.price, 'sellAll')}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest border ${
                                  timeLeft > 0 || stock <= 0
                                  ? 'bg-zinc-800/50 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50' 
                                  : 'bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white border-green-600/20'
                                }`}
                              >
                                {t('trade.sellAll')}
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="bg-indigo-600/5 border border-indigo-600/20 p-6 rounded-3xl flex items-start gap-4">
        <AlertCircle className="text-indigo-500 shrink-0 mt-1" size={20} />
        <div className="text-sm text-indigo-200/70 leading-relaxed">
          <p className="font-bold text-indigo-400 mb-1 uppercase tracking-widest text-xs">نظام التجارة الدولي</p>
          <p>يتم تحديث الأسعار بشكل دوري. تعيين عميل سري في كل دولة يمنحك الوصول الدائم لأسواقها. الأرباح من البيع تصل إلى 20% كحد أدنى. تذكر أن جميع المعاملات تتم بالأموال القذرة.</p>
        </div>
      </div>
    </div>
  );
}

