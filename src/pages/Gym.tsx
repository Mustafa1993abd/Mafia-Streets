import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Dumbbell, 
  Zap, 
  Timer, 
  TrendingUp,
  Shield,
  Activity,
  Wind,
  Coffee,
  Plus,
  Flame,
  Trophy,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MARKET_ITEMS } from '../lib/items';
import { formatNumber } from '../lib/utils';
import { getVIPMultiplier, getVIPDiscount } from '../lib/vip';

const Gym = () => {
  const { t } = useTranslation();
  const { profile, train, useSupplement, buyAndUseSupplement } = useAuthStore();
  const [trainingId, setTrainingId] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isUsingSupplement, setIsUsingSupplement] = useState(false);

  useEffect(() => {
    if (!profile?.lastTrainAt) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const lastTrain = profile.lastTrainAt || 0;
      const cooldown = 10 * 1000;
      const remaining = Math.max(0, Math.ceil((cooldown - (now - lastTrain)) / 1000));
      setCooldownRemaining(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [profile?.lastTrainAt]);

  if (!profile) return null;

  const gymLevel = profile.gymLevel || 5;
  const energy = profile.energy || 0;
  const maxEnergy = profile.maxEnergy || 100;
  const fatigue = profile.fatigue || 0;

  const handleUseSupplement = async () => {
    if (isUsingSupplement) return;
    setIsUsingSupplement(true);
    try {
      // Use Adrenaline Shot (s3) as the default steroid/supplement
      await buyAndUseSupplement('s3');
    } finally {
      setIsUsingSupplement(false);
    }
  };

  const machines = [
    {
      id: 'treadmill',
      name: t('gym.machines.treadmill'),
      stat: 'speed' as const,
      icon: <Wind className="w-8 h-8 text-blue-400" />,
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop',
      cost: 500 * (gymLevel / 5),
      energyCost: 10,
      gain: 2,
      description: t('gym.descriptions.treadmill')
    },
    {
      id: 'bench_press',
      name: t('gym.machines.bench_press'),
      stat: 'strength' as const,
      icon: <Dumbbell className="w-8 h-8 text-red-400" />,
      image: 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?q=80&w=1000&auto=format&fit=crop',
      cost: 1000 * (gymLevel / 5),
      energyCost: 15,
      gain: 3,
      description: t('gym.descriptions.bench_press')
    },
    {
      id: 'squats',
      name: t('gym.machines.squats'),
      stat: 'toughness' as const,
      icon: <Shield className="w-8 h-8 text-green-400" />,
      image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1000&auto=format&fit=crop',
      cost: 1000 * (gymLevel / 5),
      energyCost: 15,
      gain: 3,
      description: t('gym.descriptions.squats')
    },
    {
      id: 'punching_bag',
      name: t('gym.machines.punching_bag'),
      stat: 'endurance' as const,
      icon: <Activity className="w-8 h-8 text-yellow-400" />,
      image: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=1000&auto=format&fit=crop',
      cost: 800 * (gymLevel / 5),
      energyCost: 12,
      gain: 3,
      description: t('gym.descriptions.punching_bag')
    },
    {
      id: 'dumbbells',
      name: t('gym.machines.dumbbells'),
      stat: 'strength' as const,
      icon: <Dumbbell className="w-8 h-8 text-purple-400" />,
      image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=1000&auto=format&fit=crop',
      cost: 400 * (gymLevel / 5),
      energyCost: 8,
      gain: 5,
      description: t('gym.descriptions.dumbbells')
    }
  ];

  const handleTrain = async (machine: typeof machines[0]) => {
    if (cooldownRemaining > 0 || trainingId) return;
    
    setTrainingId(machine.id);
    
    const finalCost = Math.floor(machine.cost * getVIPDiscount(profile.vipLevel as any));
    const finalGain = Math.floor(machine.gain * getVIPMultiplier(profile.vipLevel as any));

    // Simulate training animation
    setTimeout(async () => {
      await train(machine.stat, finalCost, machine.energyCost, finalGain);
      setTrainingId(null);
    }, 2000);
  };

  const supplementsInInventory = profile.inventory?.supplements ? Object.entries(profile.inventory.supplements).map(([id, quantity]) => ({
    id,
    quantity
  })).filter(item => 
    MARKET_ITEMS.supplements.some(s => s.id === item.id)
  ) : [];

  const totalGymPower = (profile.gymStats?.strength || 0) + 
                        (profile.gymStats?.endurance || 0) + 
                        (profile.gymStats?.speed || 0) + 
                        (profile.gymStats?.toughness || 0);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      {/* Header Section - Modern Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end border-b border-zinc-800/50 pb-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/10 text-red-500 rounded-full border border-red-600/20 text-[10px] font-black uppercase tracking-[0.2em]">
            <Flame size={12} />
            {t('gym.eliteTraining')}
          </div>
          <h1 className="text-6xl font-black tracking-tighter uppercase italic text-white leading-none">
            {t('gym.title')}
          </h1>
          <p className="text-zinc-500 font-medium text-lg max-w-md">
            {t('gym.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-1">{t('gym.level')}</p>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <p className="text-2xl font-black text-white">{gymLevel}</p>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl relative group/energy">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-1">{t('gym.energy')}</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <p className="text-2xl font-black text-white">{Math.floor(energy)}</p>
              </div>
              <button
                onClick={handleUseSupplement}
                disabled={isUsingSupplement || energy >= maxEnergy}
                className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-500 rounded-lg border border-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('gym.useSupplement')}
              >
                <Plus size={16} className={isUsingSupplement ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="hidden sm:block bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-1">{t('profile.power')}</p>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-red-500" />
              <p className="text-2xl font-black text-white">{formatNumber(totalGymPower)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard - Single Combined Field */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50" />
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: t('gym.stats.strength'), value: profile.gymStats?.strength || 0, icon: <Dumbbell className="w-6 h-6" />, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: t('gym.stats.endurance'), value: profile.gymStats?.endurance || 0, icon: <Activity className="w-6 h-6" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: t('gym.stats.speed'), value: profile.gymStats?.speed || 0, icon: <Wind className="w-6 h-6" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: t('gym.stats.toughness'), value: profile.gymStats?.toughness || 0, icon: <Shield className="w-6 h-6" />, color: 'text-green-500', bg: 'bg-green-500/10' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center md:items-start space-y-3">
              <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl w-fit shadow-lg`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1 text-center md:text-left">{stat.label}</p>
                <p className="text-4xl font-black text-white tracking-tighter text-center md:text-left">{formatNumber(stat.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training Machines - High-End Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {machines.map((machine) => (
          <motion.div 
            key={machine.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl hover:border-zinc-700 transition-all"
          >
            <div className="relative h-64 overflow-hidden">
              <img 
                src={machine.image} 
                alt={machine.name}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
              
              <div className="absolute top-6 right-6">
                <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                  +{machine.gain} {t(`gym.stats.${machine.stat}`)}
                </div>
              </div>

              <div className="absolute bottom-6 left-8 right-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white text-zinc-950 rounded-2xl shadow-xl">
                    {machine.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight">{machine.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                        <Zap size={12} />
                        {machine.energyCost}
                      </div>
                      <div className="text-zinc-500 text-[10px] font-black">•</div>
                      <div className="text-green-500 text-[10px] font-black uppercase tracking-widest">
                        ${Math.floor(machine.cost * getVIPDiscount(profile.vipLevel as any)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
              <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                {machine.description}
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-zinc-500 font-bold">{t('gym.gain')}</span>
                  <span className="text-emerald-400 font-black">+{Math.floor(machine.gain * getVIPMultiplier(profile.vipLevel as any))} {t(`gym.stats.${machine.stat}`)}</span>
                </div>
                <button
                  onClick={() => handleTrain(machine)}
                  disabled={energy < machine.energyCost || (profile.cleanMoney || 0) < Math.floor(machine.cost * getVIPDiscount(profile.vipLevel as any)) || cooldownRemaining > 0 || !!trainingId}
                  className="relative w-full py-5 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase italic tracking-tighter rounded-2xl transition-all overflow-hidden group/btn"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {trainingId === machine.id ? (
                      <Activity className="w-5 h-5 animate-pulse" />
                    ) : cooldownRemaining > 0 ? (
                      <Timer className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    {trainingId === machine.id ? t('gym.training') : cooldownRemaining > 0 ? `${cooldownRemaining}s` : t('gym.trainNow')}
                  </span>
                  
                  {/* Progress Bar under button */}
                  {trainingId === machine.id && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, ease: "linear" }}
                      className="absolute bottom-0 left-0 h-1 bg-red-600"
                    />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Supplements Section - Minimalist Grid */}
      <AnimatePresence>
        {supplementsInInventory.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-12 border-t border-zinc-800/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                <Coffee className="w-8 h-8 text-blue-500" />
                {t('gym.supplements')}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {supplementsInInventory.map((item) => {
                const supplement = MARKET_ITEMS.supplements.find(s => s.id === item.id);
                if (!supplement) return null;
                return (
                  <div key={item.id} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl flex items-center gap-4 group hover:border-zinc-700 transition-all">
                    <div className="relative">
                      <img 
                        src={supplement.image} 
                        alt={supplement.name} 
                        className="w-16 h-16 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-zinc-950">
                        x{item.quantity}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white uppercase tracking-tight">{supplement.name}</p>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">+{ (supplement as any).energy } {t('gym.energy')}</p>
                    </div>
                    <button
                      onClick={() => useSupplement(item.id)}
                      className="p-3 bg-zinc-800 hover:bg-white hover:text-zinc-950 text-white rounded-2xl transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Gym;
