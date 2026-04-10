import React, { useState } from 'react';
import { 
  Package, Car, Bike, Crosshair, Pill, Shield, Wrench, DollarSign, 
  Eye, Box, Smartphone, Cpu, Layers, Warehouse as WarehouseIcon,
  X, Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { MARKET_ITEMS } from '../lib/items';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { formatMoney } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Inventory() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [selling, setSelling] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const inv = profile?.inventory || { 
    cars: {}, bikes: 0, weapons: {}, drugs: {}, 
    transportedDrugs: {}, armor: {}, tools: {}, 
    phones: {}, sims: {} 
  };
  
  const totalCars = typeof inv.cars === 'number' ? inv.cars : Object.values(inv.cars || {}).reduce((a, b) => a + b, 0);
  const totalWeapons = Object.values(inv.weapons || {}).reduce((a, b) => a + b, 0);
  const totalDrugs = Object.values(inv.drugs || {}).reduce((a, b) => a + b, 0);
  const totalTransportedDrugs = Object.values(inv.transportedDrugs || {}).reduce((a, b) => a + b, 0);
  const totalArmor = Object.values(inv.armor || {}).reduce((a, b) => a + b, 0);
  const totalTools = Object.values(inv.tools || {}).reduce((a, b) => a + b, 0);
  const totalPhones = Object.values(inv.phones || {}).reduce((a, b) => a + b, 0);
  const totalSims = Object.values(inv.sims || {}).reduce((a, b) => a + b, 0);

  const handleSell = async (category: string, itemId: string, amount: number, price: number, isTransported: boolean = false) => {
    if (!profile || selling) return;
    
    let currentAmount = 0;
    if (category === 'bikes') {
      currentAmount = inv.bikes || 0;
    } else {
      currentAmount = isTransported ? (inv.transportedDrugs?.[itemId] || 0) : ((inv as any)[category]?.[itemId] || 0);
    }
    
    if (currentAmount < amount) {
      toast.error(t('trade.noItem'));
      return;
    }

    setSelling(`${category}_${itemId}`);
    try {
      const updatePath = category === 'bikes' ? 'inventory.bikes' : isTransported ? `inventory.transportedDrugs.${itemId}` : `inventory.${category}.${itemId}`;
      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: increment(price),
        [updatePath]: increment(-amount)
      });
      const itemName = category === 'phones' 
        ? MARKET_ITEMS.phones.find(p => p.id === itemId.split('_')[0])?.name || itemId 
        : category === 'sims' ? itemId : category === 'bikes' ? 'دراجة نارية مسروقة' : category === 'cars' && itemId === 'Stolen Car' ? 'سيارة مسروقة' : t(`items.${itemId}`);
      toast.success(t('trade.sold', { item: itemName, price: formatMoney(price) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('trade.tradeFailed'));
    } finally {
      setSelling(null);
    }
  };

  const inventoryStats = [
    { id: 'cars', name: t('inventory.cars'), count: totalCars, icon: Car, color: 'cyan', type: 'Vehicles' },
    { id: 'weapons', name: t('inventory.weapons'), count: totalWeapons, icon: Crosshair, color: 'rose', type: 'Armory' },
    { id: 'drugs', name: t('inventory.drugs'), count: totalDrugs + totalTransportedDrugs, icon: Pill, color: 'emerald', type: 'Narcotics' },
    { id: 'armor', name: t('inventory.armor'), count: totalArmor, icon: Shield, color: 'amber', type: 'Protection' },
    { id: 'tools', name: t('inventory.tools'), count: totalTools, icon: Wrench, color: 'indigo', type: 'Equipment' },
    { id: 'phones', name: t('market.phones'), count: totalPhones, icon: Smartphone, color: 'fuchsia', type: 'Electronics' },
    { id: 'sims', name: 'eSIM', count: totalSims, icon: Cpu, color: 'sky', type: 'Network' },
    { id: 'bikes', name: t('inventory.bikes'), count: inv.bikes || 0, icon: Bike, color: 'orange', type: 'Vehicles' },
  ];

  const getColorClasses = (color: string) => {
    const map: Record<string, string> = {
      cyan: 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] text-cyan-500',
      rose: 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] text-rose-500',
      emerald: 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-500',
      amber: 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] text-amber-500',
      indigo: 'border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] text-indigo-500',
      fuchsia: 'border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)] text-fuchsia-500',
      sky: 'border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)] text-sky-500',
      orange: 'border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)] text-orange-500',
    };
    return map[color] || map.cyan;
  };

  const getGlowClasses = (color: string) => {
    const map: Record<string, string> = {
      cyan: 'group-hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]',
      rose: 'group-hover:border-rose-400 group-hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]',
      emerald: 'group-hover:border-emerald-400 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]',
      amber: 'group-hover:border-amber-400 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]',
      indigo: 'group-hover:border-indigo-400 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.3)]',
      fuchsia: 'group-hover:border-fuchsia-400 group-hover:shadow-[0_0_25px_rgba(217,70,239,0.3)]',
      sky: 'group-hover:border-sky-400 group-hover:shadow-[0_0_25px_rgba(14,165,233,0.3)]',
      orange: 'group-hover:border-orange-400 group-hover:shadow-[0_0_25px_rgba(249,115,22,0.3)]',
    };
    return map[color] || map.cyan;
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-4 lg:p-8 font-sans selection:bg-cyan-500/30" dir="rtl">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-cyan-500 mb-2">
              <WarehouseIcon size={20} className="animate-pulse" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Secure Storage Facility</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase italic">
              {t('inventory.title')}
              <span className="text-cyan-500">.</span>
            </h1>
            <p className="text-zinc-500 font-bold max-w-md leading-relaxed">
              {t('inventory.desc')}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 p-4 rounded-3xl backdrop-blur-xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <Layers size={24} />
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Capacity Status</div>
              <div className="text-xl font-black tracking-tight">98.4% <span className="text-xs text-zinc-600">Optimized</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {inventoryStats.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative bg-zinc-950 border-2 rounded-[2.5rem] p-8 transition-all duration-500 cursor-pointer overflow-hidden ${getColorClasses(item.color)} ${getGlowClasses(item.color)}`}
              onClick={() => {
                setSelectedCategory(item.id);
                setIsModalOpen(true);
              }}
            >
              {/* Mesh Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-16 h-16 rounded-2xl bg-current/10 flex items-center justify-center`}>
                    <Icon size={32} />
                  </div>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    <Eye size={20} className="text-white" />
                  </button>
                </div>

                <div className="mt-auto space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.type}</div>
                  <h3 className="text-2xl font-black tracking-tight text-white">{item.name}</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tighter text-white">{item.count}</span>
                    <span className="text-xs font-bold opacity-40 mb-2">Units</span>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-current/5 rounded-full blur-3xl" />
            </motion.div>
          );
        })}
      </div>

      {/* Floating Details Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-8 lg:p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyan-500/5 to-transparent">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Box className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                      {selectedCategory === 'phones' ? t('market.phones') : t(`inventory.${selectedCategory}`)}
                    </h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Inventory Manifest v4.2</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-6 custom-scrollbar">
                {selectedCategory && (() => {
                  const itemsList = MARKET_ITEMS[selectedCategory as keyof typeof MARKET_ITEMS] || [];
                  const categoryItems = itemsList.filter(item => {
                    if (selectedCategory === 'drugs') {
                      return (inv.drugs?.[item.id] || 0) > 0 || (inv.transportedDrugs?.[item.id] || 0) > 0;
                    }
                    if (selectedCategory === 'phones') {
                      return Object.keys(inv.phones || {}).some(key => key.startsWith(`${item.id}_`));
                    }
                    return ((inv as any)[selectedCategory]?.[item.id] || 0) > 0;
                  });

                  if (categoryItems.length === 0 && selectedCategory !== 'sims') {
                    return (
                      <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                        <WarehouseIcon size={64} />
                        <p className="text-xl font-black uppercase tracking-widest">Section Empty</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryItems.map(item => {
                        if (selectedCategory === 'phones') {
                          const phoneKeys = Object.keys(inv.phones || {}).filter(key => key.startsWith(`${item.id}_`));
                          return phoneKeys.map(key => {
                            const count = inv.phones?.[key] || 0;
                            if (count === 0) return null;
                            const [, memory, sim] = key.split('_');
                            return (
                              <InventoryItemRow 
                                key={key}
                                name={item.name}
                                subtext={`${memory} • ${sim}`}
                                count={count}
                                price={Math.floor(item.price * 0.8)}
                                onSell={() => handleSell(selectedCategory, key, 1, Math.floor(item.price * 0.8))}
                                onSellAll={() => handleSell(selectedCategory, key, count, Math.floor(item.price * 0.8) * count)}
                                isSelling={selling === `${selectedCategory}_${key}`}
                              />
                            );
                          });
                        }

                        const normalCount = (inv as any)[selectedCategory]?.[item.id] || 0;
                        const transportedCount = selectedCategory === 'drugs' ? (inv.transportedDrugs?.[item.id] || 0) : 0;
                        
                        return (
                          <React.Fragment key={item.id}>
                            {normalCount > 0 && (
                              <InventoryItemRow 
                                name={t(`items.${item.id}`)}
                                count={normalCount}
                                price={item.price}
                                onSell={() => handleSell(selectedCategory, item.id, 1, item.price)}
                                onSellAll={() => handleSell(selectedCategory, item.id, normalCount, item.price * normalCount)}
                                isSelling={selling === `${selectedCategory}_${item.id}`}
                              />
                            )}
                            {transportedCount > 0 && (
                              <InventoryItemRow 
                                name={t(`items.${item.id}`)}
                                count={transportedCount}
                                price={Math.floor(item.price * 1.3)}
                                onSell={() => handleSell(selectedCategory, item.id, 1, Math.floor(item.price * 1.3), true)}
                                onSellAll={() => handleSell(selectedCategory, item.id, transportedCount, Math.floor(item.price * 1.3) * transportedCount, true)}
                                isSelling={selling === `${selectedCategory}_${item.id}_transported`}
                                isTransported
                              />
                            )}
                          </React.Fragment>
                        );
                      })}

                      {selectedCategory === 'cars' && (inv.cars as any)?.['Stolen Car'] > 0 && (
                        <InventoryItemRow 
                          name="سيارة مسروقة"
                          count={(inv.cars as any)['Stolen Car']}
                          price={5000}
                          onSell={() => handleSell('cars', 'Stolen Car', 1, 5000)}
                          onSellAll={() => handleSell('cars', 'Stolen Car', (inv.cars as any)['Stolen Car'], 5000 * (inv.cars as any)['Stolen Car'])}
                          isSelling={selling === `cars_Stolen Car`}
                        />
                      )}

                      {selectedCategory === 'bikes' && inv.bikes > 0 && (
                        <InventoryItemRow 
                          name="دراجة نارية مسروقة"
                          count={inv.bikes}
                          price={1000}
                          onSell={() => handleSell('bikes', 'bikes', 1, 1000)}
                          onSellAll={() => handleSell('bikes', 'bikes', inv.bikes, 1000 * inv.bikes)}
                          isSelling={selling === `bikes_bikes`}
                        />
                      )}

                      {selectedCategory === 'sims' && Object.entries(inv.sims || {}).map(([number, count]) => {
                        if (count === 0) return null;
                        return (
                          <InventoryItemRow 
                            key={number}
                            name={number}
                            count={count}
                            price={500}
                            onSell={() => handleSell('sims', number, 1, 500)}
                            onSellAll={() => handleSell('sims', number, count, 500 * count)}
                            isSelling={selling === `sims_${number}`}
                            isSim
                          />
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-white/5 bg-zinc-900/30 flex items-center justify-between">
                <div className="flex items-center gap-4 text-zinc-500">
                  <Info size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">All sales are processed through the underground network</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                  <span className="text-[10px] font-black uppercase text-cyan-500">Live Feed Active</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}} />
    </div>
  );
}

function InventoryItemRow({ name, subtext, count, price, onSell, onSellAll, isSelling, isTransported }: any) {
  const { t } = useTranslation();
  return (
    <div className={`group relative bg-white/5 border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/[0.07] hover:border-white/10 ${isTransported ? 'border-purple-500/30 bg-purple-500/5' : ''}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className={`text-lg font-black tracking-tight ${isTransported ? 'text-purple-400' : 'text-white'}`}>{name}</h4>
            {isTransported && (
              <span className="px-2 py-0.5 bg-purple-500 text-white text-[8px] font-black uppercase rounded-md tracking-tighter">Transported</span>
            )}
          </div>
          {subtext && <p className="text-xs text-zinc-500 font-bold">{subtext}</p>}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black tracking-tighter text-white">x{count}</span>
          <span className="text-[10px] text-zinc-600 font-black uppercase">Quantity</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-black/40 rounded-2xl px-4 py-3 border border-white/5">
          <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-0.5">Market Value</div>
          <div className="text-sm font-black text-emerald-500">{formatMoney(price)}</div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSell}
            disabled={isSelling}
            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isTransported 
              ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20' 
              : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {isSelling ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <DollarSign size={12} />
                <span>{t('trade.sell')} 1</span>
              </>
            )}
          </button>
          {count > 1 && (
            <button
              onClick={onSellAll}
              disabled={isSelling}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                isTransported 
                ? 'bg-purple-900/50 text-purple-200 hover:bg-purple-800/50 border border-purple-500/30' 
                : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10'
              }`}
            >
              {isSelling ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <DollarSign size={12} />
                  <span>بيع الجميع</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
