import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { doc, onSnapshot, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Bell, 
  User, 
  Shield, 
  ShieldAlert, 
  Globe, 
  Zap, 
  TrendingUp, 
  Landmark, 
  Target, 
  Lock, 
  DollarSign, 
  History,
  Briefcase,
  Search,
  ChevronRight,
  Star,
  FileText,
  AlertCircle,
  X,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { safeFetch } from '../lib/utils';

import { MARKET_ITEMS } from '../lib/items';

export default function MinisterOffice() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [govData, setGovData] = useState<any>(null);
  const [recentGrants, setRecentGrants] = useState<any[]>([]);
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);

  useEffect(() => {
    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists()) setGovData(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });
    return () => unsubGov();
  }, []);

  const role = profile?.ministerRole;

  // Fetch recent automatic grants for this ministry
  useEffect(() => {
    if (!role) return;

    const fetchGrants = async () => {
      setIsLoadingGrants(true);
      try {
        const q = query(
          collection(db, 'ministry_logs'),
          where('role', '==', role),
          where('action', '==', 'auto_distribution'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const grants = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentGrants(grants);
      } catch (error) {
        console.error('Error fetching grants:', error);
      } finally {
        setIsLoadingGrants(false);
      }
    };

    fetchGrants();
  }, [role]);

  const roles: any = {
    interior: { title: t('ministry.roles.interior.title'), icon: Shield, desc: t('ministry.roles.interior.desc'), color: 'text-blue-500' },
    defense: { title: t('ministry.roles.defense.title'), icon: ShieldAlert, desc: t('ministry.roles.defense.desc'), color: 'text-red-500' },
    foreign: { title: t('ministry.roles.foreign.title'), icon: Globe, desc: t('ministry.roles.foreign.desc'), color: 'text-emerald-500' },
    finance: { title: t('ministry.roles.finance.title'), icon: Landmark, desc: t('ministry.roles.finance.desc'), color: 'text-amber-500' },
    health: { title: t('ministry.roles.health.title'), icon: Target, desc: t('ministry.roles.health.desc'), color: 'text-rose-500' },
    industry: { title: t('ministry.roles.industry.title'), icon: Briefcase, desc: t('ministry.roles.industry.desc'), color: 'text-zinc-400' },
    oil: { title: t('ministry.roles.oil.title'), icon: Zap, desc: t('ministry.roles.oil.desc'), color: 'text-yellow-600' },
    electricity: { title: t('ministry.roles.electricity.title'), icon: Zap, desc: t('ministry.roles.electricity.desc'), color: 'text-yellow-400' },
    labor: { title: t('ministry.roles.labor.title'), icon: Target, desc: t('ministry.roles.labor.desc'), color: 'text-orange-500' },
    intelligence: { title: t('ministry.roles.intelligence.title'), icon: Search, desc: t('ministry.roles.intelligence.desc'), color: 'text-purple-500' },
    security: { title: t('ministry.roles.security.title'), icon: Lock, desc: t('ministry.roles.security.desc'), color: 'text-slate-500' },
  };

  const currentRole = roles[role || ''] || { title: t('ministry.roles.unknown.title'), icon: Landmark, desc: '', color: 'text-zinc-500' };

  const OfficialStamp = ({ text, color = "red", rotation = "-12deg", className = "" }: { text: string, color?: string, rotation?: string, className?: string }) => (
    <div 
      className={clsx(
        "absolute border-4 px-4 py-1 rounded-sm font-black uppercase tracking-widest text-xl opacity-20 pointer-events-none select-none z-0 whitespace-nowrap",
        color === "red" ? "border-red-600 text-red-600" : "border-blue-600 text-blue-600",
        className
      )}
      style={{ transform: `rotate(${rotation})` }}
    >
      {text}
    </div>
  );

  if (!role) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500">
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-red-500/20 blur-xl rounded-full animate-pulse" />
          <div className="relative w-32 h-32 bg-zinc-900 border-4 border-red-500/30 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <Lock size={64} className="text-red-500" />
          </div>
        </div>
        <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 italic">{t('ministry.unauthorizedTitle')}</h2>
        <p className="text-zinc-500 max-w-md text-lg font-medium leading-relaxed">
          {t('ministry.unauthorizedDesc')}
        </p>
        <div className="mt-10 w-24 h-1 bg-red-500/20 rounded-full" />
      </div>
    );
  }

  const handleAction = (action: string) => {
    const actions: Record<string, string> = {
      budget: t('ministry.labels.requestBudget'),
      deals: t('ministry.labels.deals')
    };
    toast.info(t('ministry.toast.submitted', { action: actions[action] || action }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 p-4 md:p-8 animate-in fade-in duration-700">
      {/* Header Section - Executive Desk Style */}
      <div className="relative bg-[#1a1a1a] rounded-[2rem] sm:rounded-[3.5rem] p-6 sm:p-10 border-2 sm:border-4 border-[#c5a059]/30 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Wood Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
        
        {role === 'interior' ? (
          <>
            <div className="absolute top-0 end-0 w-64 h-64 sm:w-96 sm:h-96 bg-purple-600/10 blur-[80px] sm:blur-[120px] -me-32 sm:-me-48 -mt-32 sm:-mt-48 opacity-10" />
            <div className="absolute bottom-0 start-0 w-64 h-64 sm:w-96 sm:h-96 bg-amber-600/5 blur-[80px] sm:blur-[120px] -ms-32 sm:-ms-48 -mb-32 sm:-mb-48 opacity-10" />
          </>
        ) : (
          <div className={clsx("absolute top-0 end-0 w-64 h-64 sm:w-96 sm:h-96 blur-[80px] sm:blur-[120px] -me-32 sm:-me-48 -mt-32 sm:-mt-48 opacity-10", currentRole.color.replace('text-', 'bg-'))} />
        )}
        
        {/* Official Stamps */}
        <OfficialStamp text={t('ministry.stamps.approved')} color="blue" rotation="15deg" className="top-10 end-10" />
        <OfficialStamp text={t('ministry.stamps.topSecret')} color="red" rotation="-20deg" className="bottom-20 start-1/4" />
        <OfficialStamp text={t('ministry.stamps.ministerial')} color="blue" rotation="-5deg" className="top-1/3 end-1/4" />

        <div className="relative flex flex-col lg:flex-row items-center gap-8 sm:gap-12 z-10">
          {/* Official Portrait Frame */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-6 bg-gradient-to-tr from-zinc-500/20 to-white/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className={clsx(
              "relative w-48 h-64 sm:w-56 sm:h-72 bg-zinc-800 rounded-2xl overflow-hidden border-[4px] sm:border-[8px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex items-center justify-center",
              role === 'interior' ? "border-amber-500" : "border-zinc-400"
            )}>
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt="Official Portrait"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={64} className="text-zinc-600 sm:w-[80px] sm:h-[80px]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-4 sm:bottom-6 inset-x-0 text-center">
                <div className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-1">{t('ministry.labels.minister')}</div>
                <div className="w-10 sm:w-12 h-0.5 bg-amber-500/50 mx-auto rounded-full" />
              </div>
            </div>
            {/* Stamp Effect */}
            <div className="absolute -bottom-4 -end-4 sm:-bottom-6 sm:-end-6 w-16 h-16 sm:w-24 sm:h-24 border-[4px] sm:border-8 border-amber-600/20 rounded-full flex items-center justify-center -rotate-12 pointer-events-none backdrop-blur-[2px]">
              <div className="text-[6px] sm:text-[10px] font-black text-amber-600/40 uppercase text-center leading-tight tracking-tighter">
                {t('ministry.stamps.official').split(' ').join('\n')}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-start space-y-6 w-full">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-2 sm:mb-4">
                <div className={clsx(
                  "px-4 py-1.5 rounded-full flex items-center gap-2 sm:gap-2.5",
                  role === 'interior' 
                    ? "bg-amber-500/10 border border-amber-500/20" 
                    : clsx("bg-opacity-10 border border-opacity-20", currentRole.color.replace('text-', 'bg-'), currentRole.color.replace('text-', 'border-'))
                )}>
                  <currentRole.icon size={14} className={role === 'interior' ? "text-amber-500" : currentRole.color} />
                  <span className={clsx("text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]", role === 'interior' ? "text-amber-500" : currentRole.color)}>
                    {currentRole.title}
                  </span>
                </div>
                <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                  <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">{t('ministry.labels.cabinetMember')}</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter italic leading-none break-words player-name-script">
                {profile?.displayName}
              </h1>
              <p className="text-zinc-500 text-sm sm:text-xl max-w-2xl font-medium leading-relaxed italic opacity-80 border-s-4 border-[#c5a059]/40 ps-4 sm:ps-6 py-1 sm:py-2">
                {currentRole.desc}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-8 bg-black/40 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 backdrop-blur-xl w-full md:w-fit">
                <div className="text-end">
                  <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mb-1">{t('ministry.labels.budget')}</p>
                  <p className="text-xl sm:text-3xl font-black text-amber-500 tracking-tighter">
                    {govData?.budgets?.[role]?.toLocaleString() || '10,000,000'} $
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-amber-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-amber-500/20">
                  <Landmark className="text-amber-500 sm:w-[24px] sm:h-[24px]" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
        <div className="lg:col-span-2 space-y-8 sm:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
             <button
                onClick={() => handleAction('budget')}
                className="group relative p-6 sm:p-10 bg-zinc-900/40 border border-white/5 hover:border-amber-500/30 rounded-2xl sm:rounded-[3rem] text-start transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 sm:mb-8 relative z-10 border border-amber-500/20">
                  <DollarSign className="text-amber-500 sm:w-[32px] sm:h-[32px]" size={24} />
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 relative z-10 italic">{t('ministry.labels.requestBudget')}</h4>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed relative z-10 font-medium">{t('ministry.labels.requestBudgetDesc')}</p>
              </button>
              
              <button
                onClick={() => handleAction('deals')}
                className="group relative p-6 sm:p-10 bg-zinc-900/40 border border-white/5 hover:border-blue-500/30 rounded-2xl sm:rounded-[3rem] text-start transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 sm:mb-8 relative z-10 border border-blue-500/20">
                  <TrendingUp className="text-blue-500 sm:w-[32px] sm:h-[32px]" size={24} />
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 relative z-10 italic">{t('ministry.labels.deals')}</h4>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed relative z-10 font-medium">{t('ministry.labels.dealsDesc')}</p>
              </button>
              
              <div className="group relative p-6 sm:p-10 bg-zinc-900/40 border border-white/5 rounded-2xl sm:rounded-[3rem] text-start transition-all overflow-hidden sm:col-span-2">
                <div className="absolute inset-0 bg-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 sm:mb-8 relative z-10 border border-emerald-500/20">
                  <Gift className="text-emerald-500 sm:w-[32px] sm:h-[32px]" size={24} />
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 relative z-10 italic">{t('ministry.labels.autoDistribution')}</h4>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed relative z-10 font-medium">
                  {t('ministry.labels.autoDistributionDesc')}
                </p>
              </div>

              {/* Recent Grants Log */}
              <div className="sm:col-span-2 space-y-6">
                <h3 className="text-2xl font-black text-white italic flex items-center gap-3">
                  <History className="text-amber-500" />
                  {t('ministry.labels.recentGrants')}
                </h3>
                <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
                  {isLoadingGrants ? (
                    <div className="p-12 text-center text-zinc-500 font-bold animate-pulse">{t('ministry.labels.loadingLogs')}</div>
                  ) : recentGrants.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {recentGrants.map((grant) => (
                        <div key={grant.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                              <User className="text-emerald-500" size={20} />
                            </div>
                            <div>
                              <p className="text-white font-bold player-name-script">{grant.targetUserName}</p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                {new Date(grant.timestamp).toLocaleDateString('ar-EG', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="text-lg font-black text-emerald-500">+1,000,000 $</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('ministry.labels.grantType')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-zinc-500 font-bold italic">{t('ministry.labels.noLogs')}</div>
                  )}
                </div>
              </div>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div className="p-8 sm:p-10 bg-zinc-900/30 border border-white/5 rounded-2xl sm:rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 end-0 w-24 h-24 sm:w-32 sm:h-32 bg-red-500/5 blur-3xl -me-12 sm:-me-16 -mt-12 sm:-mt-16" />
            <h4 className="text-lg sm:text-xl font-black text-white mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4 uppercase tracking-widest italic">
              <Target className="text-red-500 sm:w-[24px] sm:h-[24px]" size={20} />
              {t('ministry.labels.management')}
            </h4>
            <div className="space-y-4 sm:space-y-6 relative z-10">
              <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-medium">
                {t('ministry.labels.managementDesc')}
              </p>
              <div className="p-4 sm:p-6 bg-amber-500/5 border border-amber-500/10 rounded-xl sm:rounded-2xl flex gap-3 sm:gap-4">
                <AlertCircle className="text-amber-500 shrink-0 sm:w-[20px] sm:h-[20px]" size={18} />
                <p className="text-[10px] sm:text-xs text-amber-500/70 font-bold leading-relaxed">
                  {t('ministry.labels.managementNote')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10 bg-gradient-to-br from-zinc-900/50 to-black/50 border border-white/5 rounded-2xl sm:rounded-[3rem]">
            <h4 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-6 italic">{t('ministry.labels.stats')}</h4>
            <div className="space-y-3 sm:space-y-4">
              {[
                { label: t('ministry.labels.efficiency'), value: '85%' },
                { label: t('ministry.labels.budgetUsed'), value: '12%' },
                { label: t('ministry.labels.satisfaction'), value: '64%' },
                { label: t('ministry.labels.totalSent'), value: `$${((profile as any)?.totalGrantsSent || 0).toLocaleString()}` },
              ].map((stat, i) => (
                <div key={i} className="flex justify-between items-center p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl">
                  <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</span>
                  <span className="text-base sm:text-lg font-black text-white">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Send Money Modal removed as requested */}
    </div>
  );
}
