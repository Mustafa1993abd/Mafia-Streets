import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ShieldAlert, Car, Bike, Home, Landmark, Timer, Lock, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, safeToMillis } from '../lib/utils';
import { getVIPMultiplier, getVIPCooldownReduction } from '../lib/vip';
import { toast } from 'sonner';

// Mock cooldowns (in a real app, store in Firestore)
const COOLDOWNS: Record<string, number> = {};

export default function Crimes() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [now, setNow] = useState(Date.now());
  const [govData, setGovData] = useState<any>(null);
  const [committing, setCommitting] = useState<string | null>(null);

  useEffect(() => {
    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists()) setGovData(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });
    return () => unsubGov();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const commitCrime = async (type: string, level: number, baseReward: number, successChance: number) => {
    if (!profile || committing) return;
    
    if (COOLDOWNS[type] && COOLDOWNS[type] > now) {
      toast.error(t('crimes.cooldownMsg'));
      return;
    }

    setCommitting(type);

    // Check if player is in jail
    const jailTime = safeToMillis(profile.jailTimeEnd);
    if (profile.isImprisoned && jailTime && jailTime > Date.now()) {
      toast.error(t('crimes.inJailMsg'));
      setCommitting(null);
      return;
    }

    // Apply Martial Law penalty
    let finalSuccessChance = successChance;
    if (govData?.martialLaw) {
      finalSuccessChance = successChance * 0.8; // 20% harder
    }

    const success = Math.random() < finalSuccessChance;
    const baseRewardCalc = Math.floor(baseReward * (0.8 + Math.random() * 0.4));
    const levelMultiplier = 1 + ((profile.level || 1) * 0.05);
    const reward = Math.floor(baseRewardCalc * getVIPMultiplier(profile.vipLevel as any) * levelMultiplier);

    try {
      if (success) {
        const inventory = profile.inventory || { cars: {}, bikes: 0, weapons: {}, drugs: {}, armor: {}, tools: {}, gold: 0, antiques: 0, electronics: 0 };
        const newInventory = { ...inventory };
        
        if (type === 'cars') {
          const cars = { ...(newInventory.cars as Record<string, number> || {}) };
          cars['Stolen Car'] = (cars['Stolen Car'] || 0) + 1;
          newInventory.cars = cars;
        }
        if (type === 'bikes') newInventory.bikes = (newInventory.bikes as number || 0) + 1;

        await updateDoc(doc(db, 'users', profile.uid), {
          dirtyMoney: increment(reward),
          'crimes.theft': increment(1),
          reputation: increment(level * 100),
          inventory: newInventory
        });
        toast.success(t('crimes.successMsg', { reward }));
      } else {
        // Calculate jail time based on wanted stars
        let jailMinutes = 5; // Base jail time
        
        if (profile.wantedStars === 5) jailMinutes = 20;
        else if (profile.wantedStars === 4) jailMinutes = 15;
        else if (profile.wantedStars === 3) jailMinutes = 10;
        else if (profile.wantedStars === 1 || profile.wantedStars === 2) jailMinutes = 10;
        
        if (profile.policeRank === 'Silver') jailMinutes *= 0.75;
        if (profile.policeRank === 'Bronze') jailMinutes *= 0.5;
        if (profile.policeRank === 'Diamond') jailMinutes = 0;

        // Calculate dirty money loss with Visa protection
        let hidePercentage = 0;
        if (profile.visaCard) {
          const { type } = profile.visaCard;
          if (type === 'Platinum') hidePercentage = 0.10;
          if (type === 'Signature') hidePercentage = 0.25;
          if (type === 'Infinite') hidePercentage = 0.50;
        }

        const visibleMoney = profile.dirtyMoney * (1 - hidePercentage);
        const moneyLost = Math.floor(visibleMoney * 0.5); // Lose 50% of visible dirty money
        
        const updates: any = {
          dirtyMoney: increment(-moneyLost)
        };

        if (jailMinutes > 0) {
          const newStars = Math.min(5, (profile.wantedStars || 0) + 1);
          updates.jailTimeEnd = new Date(Date.now() + (jailMinutes * 60 * 1000));
          updates.isImprisoned = true;
          updates.wantedStars = newStars;
          updates.bounty = increment(newStars * 10000);
          
          await updateDoc(doc(db, 'users', profile.uid), updates);
          toast.error(t('crimes.failMsg') + ' ' + t('crimes.sentToJail', { minutes: Math.ceil(jailMinutes) }));
          if (moneyLost > 0) {
            toast.error(t('crimes.moneyConfiscated', { amount: formatMoney(moneyLost) }));
          }
        } else {
          await updateDoc(doc(db, 'users', profile.uid), updates);
          toast.success(t('crimes.immunityMsg'));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setCommitting(null);
      // Set specific cooldowns based on crime type
      const cooldownMinutes: Record<string, number> = {
        bikes: 3,
        cars: 10,
        villas: 30,
        banks: 60
      };
      
      const minutes = cooldownMinutes[type] || 5;
      const finalMinutes = minutes * getVIPCooldownReduction(profile.vipLevel as any);
      COOLDOWNS[type] = Date.now() + finalMinutes * 60 * 1000;
      setNow(Date.now()); // force re-render
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderCrimeCategory = (id: string, title: string, icon: any, levels: number, baseReward: number, baseChance: number, baseLevelReq: number) => {
    const Icon = icon;
    const isOnCooldown = COOLDOWNS[id] && COOLDOWNS[id] > now;
    const timeRemaining = isOnCooldown ? COOLDOWNS[id] - now : 0;

    return (
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <Icon size={24} />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          {isOnCooldown && (
            <div className="flex items-center gap-2 text-orange-500 font-bold bg-orange-500/10 px-3 py-1 rounded-full">
              <Timer size={16} />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {Array.from({ length: levels }).map((_, i) => {
            const level = i + 1;
            const reward = baseReward * level;
            const chance = Math.max(0.1, baseChance - (level * 0.05)); // Harder at higher levels
            const requiredLevel = baseLevelReq + (level - 1);
            const isLocked = (profile?.level || 1) < requiredLevel;

            return (
              <div key={level} className={`flex items-center justify-between p-3 rounded-lg border ${isLocked ? 'bg-black/30 border-zinc-800/30 opacity-75' : 'bg-black/50 border-zinc-800/50'}`}>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {t('crimes.level', { lvl: level })}
                    {isLocked && <Lock size={12} className="text-zinc-500" />}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {isLocked ? t('crimes.requiredLevel', { level: requiredLevel }) : t('crimes.estReward', { reward, chance: (chance * 100).toFixed(0) })}
                  </div>
                </div>
                <button 
                  onClick={() => commitCrime(id, level, reward, chance)}
                  disabled={isOnCooldown || isLocked || committing === id}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors text-sm ${
                    isLocked 
                      ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      : isOnCooldown || committing === id
                        ? 'bg-zinc-800 text-zinc-600' 
                        : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {isLocked ? t('crimes.locked') : isOnCooldown ? t('crimes.wait') : committing === id ? t('crimes.committing') : t('crimes.start')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('crimes.title')}</h2>
      </div>

      {govData?.martialLaw && (
        <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-6 flex items-start gap-4 animate-pulse">
          <ShieldAlert className="text-red-500 shrink-0 mt-1" size={28} />
          <div>
            <h3 className="text-xl font-black text-red-400 uppercase tracking-widest mb-2">{t('crimes.martialLawActive')}</h3>
            <p className="text-red-200/80 font-medium">
              {t('crimes.martialLawDesc')}
              <br/>
              <span className="text-red-400 font-bold">{t('map.effect')}</span> {t('crimes.martialLawEffect')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCrimeCategory('bikes', t('crimes.bikes'), Bike, 10, 500, 0.85, 1)}
        {renderCrimeCategory('cars', t('crimes.cars'), Car, 10, 2000, 0.75, 5)}
        {renderCrimeCategory('villas', t('crimes.villas'), Home, 10, 8000, 0.60, 10)}
        {renderCrimeCategory('banks', t('crimes.banks'), Landmark, 10, 25000, 0.40, 20)}
      </div>
    </div>
  );
}
