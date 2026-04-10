import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Shield, 
  Skull, 
  Activity, 
  FileText, 
  CreditCard, 
  ShieldCheck, 
  Award, 
  Plane,
  Search,
  Sword,
  UserPlus,
  Car,
  Crosshair,
  Siren,
  Vote,
  Home,
  Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import { clsx } from 'clsx';
import PlayerModal from '../components/PlayerModal';
import { formatNumber, formatMoney, safeFetch, safeToDate } from '../lib/utils';

interface KillRecord {
  id: string;
  killerName: string;
  victimName: string;
  killerLevel: number;
  victimLevel: number;
  timestamp: any;
}

interface TargetPlayer {
  uid: string;
  displayName: string;
  level: number;
  reputation: number;
  gangId?: string;
  gangRole?: 'leader' | 'member';
  photoURL?: string;
  vipLevel?: string | null;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { profile, setInSafeHouse } = useAuthStore();
  const [recentKills, setRecentKills] = useState<KillRecord[]>([]);
  const [randomTargets, setRandomTargets] = useState<TargetPlayer[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [govData, setGovData] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'government', 'current'), (snapshot) => {
      setGovData(snapshot.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'kills'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const kills = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as KillRecord[];
      setRecentKills(kills);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kills');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchRandomTargets = async () => {
      if (!profile) return;
      try {
        const usersRef = collection(db, 'users_public');
        const snapshot = await getDocs(query(usersRef, limit(20)));
        
        const players = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as TargetPlayer)).filter((u: TargetPlayer) => u.uid !== profile.uid);
        
        const shuffled = players.sort(() => 0.5 - Math.random()).slice(0, 3);
        setRandomTargets(shuffled);
      } catch (error: any) {
        console.error('Error fetching targets:', error);
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchRandomTargets();
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Election Alert */}
      {govData?.electionActive && (
        <Link 
          to="/government" 
          className="relative overflow-hidden rounded-3xl bg-blue-600/10 border border-blue-600/20 p-6 flex items-center justify-between group hover:bg-blue-600/20 transition-all"
        >
          <div className="flex items-center gap-6">
            <div className="p-4 bg-blue-600/20 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
              <Vote size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{t('government.politics.electionActive')}</span>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t('dashboard.electionStarted')}</h3>
              <p className="text-zinc-500 text-sm font-medium">{t('dashboard.electionDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20">
            {t('dashboard.nominateNow')}
          </div>
        </Link>
      )}

      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-zinc-800/50 mafia-glow">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-transparent to-transparent"></div>
        <div className="absolute top-0 end-0 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] -me-48 -mt-48"></div>
        
        <div className="relative z-10 p-8 md:p-12">
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Mafia Streets',
                  text: 'انضم إلي في لعبة Mafia Streets!',
                  url: window.location.href,
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('تم نسخ الرابط!');
              }
            }}
            className="absolute top-4 end-4 p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <Share2 size={20} />
          </button>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="text-center md:text-start">
              {/* Logo MAFIA STREETS */}
              <div className="mb-8 flex flex-col items-center md:items-start">
                <div className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none drop-shadow-2xl">MAFIA</div>
                <div className="text-2xl md:text-3xl font-black text-red-600 uppercase tracking-[0.3em] mt-[-0.2em] drop-shadow-lg">STREETS</div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/10 text-red-500 rounded-full border border-red-600/20 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                {t(`map.cities.${profile.city}`)}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-tight mb-4">
                {t('dashboard.welcome')}, <span className="player-name-script text-5xl md:text-7xl">{profile.displayName}</span>
              </h1>
              <p className="text-zinc-400 text-base md:text-lg max-w-xl font-medium mb-6">
                {t('dashboard.desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-wrap justify-center gap-4 w-full md:w-auto">
              <ActionButton to="/crimes" icon={Sword} label={t('crimes.title')} color="red" />
              <ActionButton to="/bank" icon={TrendingUp} label={t('bank.title')} color="green" />
              <ActionButton to="/airport" icon={Plane} label={t('airport.title')} color="blue" />
              {profile.builtProperties?.some(p => p.type === 'safe_house') && (
                <button 
                  onClick={() => setInSafeHouse(!profile.inSafeHouse)}
                  className={clsx(
                    "flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg hover:-translate-y-1",
                    profile.inSafeHouse ? "bg-emerald-600 shadow-emerald-600/20" : "bg-orange-600 shadow-orange-600/20"
                  )}
                >
                  <Home size={18} />
                  {profile.inSafeHouse ? t('properties.safe_house.exit') : t('properties.safe_house.enter')}
                </button>
              )}
            </div>
          </div>

          {/* Money at the bottom */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-8 border-t border-zinc-800/50">
            <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 flex-1 sm:flex-none">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('bank.currentClean')}</div>
                <div className="text-xl md:text-2xl font-black text-white">{formatMoney(profile.cleanMoney)}</div>
              </div>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 flex-1 sm:flex-none">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                <Skull size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('bank.dirtyMoney')}</div>
                <div className="text-xl md:text-2xl font-black text-white">{formatMoney(profile.dirtyMoney)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Targets */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label={t('dashboard.reputation')} value={formatNumber(profile.reputation)} color="red" />
            <StatCard icon={Users} label={t('dashboard.gangMembers')} value={formatNumber(profile.gangMembers)} color="blue" />
            <StatCard icon={Target} label={t('profile.level')} value={formatNumber(profile.level)} color="orange" />
            <StatCard icon={Crosshair} label={t('profile.kills')} value={formatNumber(profile.crimes.kills)} color="green" />
          </div>

          {/* Find Targets (Random Players) */}
          <section className="mafia-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <Search className="text-red-600" />
                {t('dashboard.findTargets')}
              </h3>
              <button 
                onClick={() => window.location.reload()}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-500 transition-colors"
              >
                {t('common.refresh')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loadingTargets ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-32 bg-zinc-800/50 rounded-2xl animate-pulse"></div>
                ))
              ) : (
                randomTargets.map((target) => (
                    <div 
                      key={target.uid} 
                      onClick={() => setSelectedPlayer(target)}
                      className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl hover:border-red-600/50 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <PlayerAvatar
                          photoURL={target.photoURL}
                          displayName={target.displayName}
                          vipLevel={target.vipLevel as any}
                          size="sm"
                        />
                        <div className="overflow-hidden">
                          <div className="text-sm font-black uppercase tracking-tight truncate player-name-script">{target.displayName || 'Unknown'}</div>
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">{t('profile.level')} {target.level}</div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlayer(target);
                        }}
                        className="w-full py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-center block group-hover:bg-red-600 group-hover:border-red-600 transition-all"
                      >
                        {t('dashboard.viewProfile')}
                      </button>
                    </div>
                ))
              )}
            </div>
          </section>

          {/* Kill Log */}
          <section className="mafia-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <Skull className="text-red-600" />
                {t('dashboard.killLog')}
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 rounded-full border border-red-600/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">{t('dashboard.liveFeed')}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {recentKills.length > 0 ? (
                recentKills.map((kill) => (
                  <div key={kill.id} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800/50 rounded-2xl hover:bg-zinc-900 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-600/10 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                        <Skull size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold">
                          <span className="text-red-500 uppercase tracking-tight player-name-script">{kill.killerName}</span>
                          <span className="text-zinc-500 mx-2 text-xs font-black">{t('dashboard.whacked')}</span>
                          <span className="text-white uppercase tracking-tight player-name-script">{kill.victimName}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                          {t('dashboard.lvl')} {kill.killerLevel} vs {t('dashboard.lvl')} {kill.victimLevel}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      {(() => {
                        try {
                          const d = safeToDate(kill.timestamp);
                          return formatDistanceToNow(d, { addSuffix: true });
                        } catch (e) {
                          return t('dashboard.justNow');
                        }
                      })()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-zinc-600 font-black uppercase tracking-widest text-xs">
                  {t('dashboard.noKills')}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Intelligence & Quick Actions */}
        <div className="space-y-8">
          <section className="mafia-card bg-red-600/5 border-red-600/20">
            <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-red-500">
              {t('dashboard.wanted')}
            </h3>
            <p className="text-xs text-zinc-500 font-medium mb-6 leading-relaxed">
              {t('dashboard.wantedDesc')}
            </p>
            <Link to="/bounties" className="mafia-button-primary w-full py-3 text-xs">
              {t('dashboard.viewBounties')}
            </Link>
          </section>

          <section className="mafia-card">
            <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
              <Activity className="text-red-600" />
              {t('dashboard.intel')}
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{t('dashboard.activeCity')}</div>
                <div className="text-lg font-black text-white uppercase">{t(`map.cities.${profile.city}`)}</div>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{t('dashboard.gangStatus')}</div>
                <div className="text-lg font-black text-white uppercase">
                  {profile.gangId ? (profile.gangRole === 'leader' ? t('gangs.leader') : t('gangs.member')) : t('gangs.noGang')}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
}

function SirenIcon({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M7 18v-6a5 5 0 1 1 10 0v6" />
      <path d="M5 21h14" />
      <path d="M21 12h1" />
      <path d="M1 12h1" />
      <path d="M12 2v1" />
    </svg>
  );
}

function ActionButton({ to, icon: Icon, label, color }: { to: string, icon: any, label: string, color: 'red' | 'green' | 'blue' | 'orange' }) {
  const colors = {
    red: 'bg-red-600 hover:bg-red-500 shadow-red-600/20',
    green: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
    blue: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20',
    orange: 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20'
  };

  return (
    <Link 
      to={to} 
      className={clsx(
        "flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg hover:-translate-y-1",
        colors[color]
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const textColors = {
    red: 'text-red-500',
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    green: 'text-emerald-500'
  };

  return (
    <div className="mafia-card p-5 border-zinc-800/50 hover:border-zinc-700 transition-all">
      <div className={clsx("mb-3", textColors[color as keyof typeof textColors])}>
        <Icon size={20} />
      </div>
      <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</div>
      <div className="text-2xl font-black tracking-tighter">{value}</div>
    </div>
  );
}

function IntelligenceItem({ icon: Icon, label, status, active }: { icon: any, label: string, status: string, active: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
      <div className="flex items-center gap-3">
        <Icon size={16} className={active ? 'text-red-500' : 'text-zinc-700'} />
        <span className="text-xs font-bold uppercase tracking-tight text-zinc-300">{label}</span>
      </div>
      <span className={clsx(
        "text-[8px] font-black px-2 py-0.5 rounded-full border",
        active ? "bg-red-600/10 text-red-500 border-red-600/20" : "bg-zinc-900 text-zinc-700 border-zinc-800"
      )}>
        {status}
      </span>
    </div>
  );
}
