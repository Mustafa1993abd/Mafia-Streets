import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, orderBy, limit, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Trophy, Skull, Clock, Users, Search, ShieldAlert, X, Mail, MapPin } from 'lucide-react';
import { formatNumber, safeToDate } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';

interface PlayerData {
  id: string;
  displayName: string;
  photoURL: string;
  level: number;
  reputation: number;
  wealth: number;
  kills: number;
  createdAt: any;
  gangId?: string;
  country?: string;
  power?: number;
  vipLevel?: string | null;
}

import { COUNTRIES } from '../constants/countries';
import i18n from '../i18n/config';

export default function Players() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const getCountryName = (code?: string) => {
    if (!code) return t('common.unknown');
    const country = COUNTRIES.find(c => c.code === code.toLowerCase());
    return i18n.language === 'ar' ? (country?.nameAr || code) : (country?.name || code);
  };
  
  const [richest, setRichest] = useState<PlayerData[]>([]);
  const [killers, setKillers] = useState<PlayerData[]>([]);
  const [newest, setNewest] = useState<PlayerData[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const playerId = params.get('id');
    if (playerId) {
      const fetchPlayer = async () => {
        try {
          const docRef = doc(db, 'users_public', playerId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSelectedPlayer({ id: docSnap.id, ...docSnap.data() } as PlayerData);
          }
        } catch (error) {
          console.error("Error fetching player:", error);
        }
      };
      fetchPlayer();
    }
  }, [location.search]);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        const usersRef = collection(db, 'users_public');
        
        // Fetch Richest
        const richestQ = query(usersRef, orderBy('wealth', 'desc'), limit(10));
        const richestSnap = await getDocs(richestQ);
        setRichest(richestSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerData)));

        // Fetch Top Killers
        const killersQ = query(usersRef, orderBy('kills', 'desc'), limit(10));
        const killersSnap = await getDocs(killersQ);
        setKillers(killersSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerData)));

        // Fetch Newest
        const newestQ = query(usersRef, orderBy('createdAt', 'desc'), limit(10));
        const newestSnap = await getDocs(newestQ);
        setNewest(newestSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerData)));

      } catch (error) {
        console.error("Error fetching leaderboards:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, []);

  const fetchAllPlayers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users_public');
      const allQ = query(usersRef, orderBy('wealth', 'desc'), limit(200));
      const allSnap = await getDocs(allQ);
      setAllPlayers(allSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerData)));
      setShowAll(true);
    } catch (error) {
      console.error("Error fetching all players:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFinancialStatus = (wealth: number) => {
    if (wealth >= 1000000000000) return { label: t('players.trillionaire'), color: 'text-purple-500' };
    if (wealth >= 1000000000) return { label: t('players.billionaire'), color: 'text-yellow-500' };
    if (wealth >= 1000000) return { label: t('players.millionaire'), color: 'text-green-500' };
    return { label: t('players.rich'), color: 'text-blue-500' };
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t('common.unknown');
    try {
      const date = safeToDate(timestamp);
      return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return t('common.unknown');
    }
  };

  const filteredPlayers = allPlayers.filter(p => 
    (p.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  if (loading && !showAll && richest.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const renderPlayerModal = () => {
    if (!selectedPlayer) return null;

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="relative h-52 bg-gradient-to-r from-red-900/50 to-zinc-900">
            <button 
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-black/50 rounded-full p-1 z-10"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="px-6 pb-6 relative">
            <div className="absolute -top-44 left-1/2 -translate-x-1/2">
              <PlayerAvatar
                photoURL={selectedPlayer.photoURL}
                displayName={selectedPlayer.displayName}
                vipLevel={selectedPlayer.vipLevel as any}
                size="2xl"
                className="border-4 border-zinc-900 shadow-xl"
              />
            </div>

            <div className="mt-6 text-center space-y-2">
              <h2 className="text-3xl font-black tracking-tight player-name-script">{selectedPlayer.displayName}</h2>
              <div className="text-sm font-bold text-zinc-400">{t('players.criminalLevel')} {selectedPlayer.level || 1}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50 text-center">
                <div className="text-xs text-zinc-500 mb-1">{t('players.currentCity')}</div>
                <div className="font-bold text-blue-400">{getCountryName(selectedPlayer.country)}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50 text-center">
                <div className="text-xs text-zinc-500 mb-1">{t('players.combatPower')}</div>
                <div className="font-bold text-red-500">{formatNumber(selectedPlayer.power || 0)}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50 text-center">
                <div className="text-xs text-zinc-500 mb-1">{t('players.gang')}</div>
                <div className="font-bold text-yellow-500">{selectedPlayer.gangId ? t('players.gangMember') : t('players.noGang')}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50 text-center">
                <div className="text-xs text-zinc-500 mb-1">{t('players.criminalLevel')}</div>
                <div className="font-bold text-white">{selectedPlayer.level || 1}</div>
              </div>
            </div>

            {selectedPlayer.id !== profile?.uid && (
              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedPlayer(null);
                    navigate(`/attack/${selectedPlayer.id}`);
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldAlert size={18} />
                  {t('players.eliminate')}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedPlayer(null);
                    // navigate to map or locate logic
                    navigate(`/map`);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin size={18} />
                  {t('players.locate')}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedPlayer(null);
                    navigate(`/messages?to=${selectedPlayer.id}`);
                  }}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={18} />
                  {t('players.sendMessage')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (showAll) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-12 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-2 md:gap-3">
            <Users className="text-red-500 w-6 h-6 md:w-8 md:h-8" />
            {t('players.allPlayers')}
          </h1>
          <button 
            onClick={() => setShowAll(false)}
            className="px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base bg-zinc-800 hover:bg-zinc-700 rounded-lg font-bold transition-colors"
          >
            {t('players.backToLeaderboards')}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder={t('players.searchPlayer')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 md:py-4 pr-12 pl-4 text-white focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredPlayers.map((player) => (
            <div 
              key={player.id} 
              onClick={() => setSelectedPlayer(player)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:border-red-500/50 transition-colors cursor-pointer"
            >
              <div className="relative">
                <PlayerAvatar
                  photoURL={player.photoURL}
                  displayName={player.displayName}
                  vipLevel={player.vipLevel as any}
                  size="lg"
                />
                <div className="absolute -bottom-2 -right-2 bg-zinc-800 border border-zinc-700 text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-full z-10">
                  {t('players.lvl')} {player.level || 1}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base md:text-lg truncate player-name-script">{player.displayName}</h3>
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-zinc-400">
                  <span className={getFinancialStatus(player.wealth || 0).color}>
                    {getFinancialStatus(player.wealth || 0).label}
                  </span>
                  <span>•</span>
                  <span>{formatNumber(player.reputation || 0)} {t('players.reputation')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderPlayerModal()}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-2 md:gap-3">
          <Trophy className="text-yellow-500 w-6 h-6 md:w-8 md:h-8" />
          {t('players.leaderboards')}
        </h1>
        <button 
          onClick={fetchAllPlayers}
          className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <Users size={18} className="md:w-5 md:h-5" />
          {t('players.allPlayers')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Richest Players */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-yellow-500/20 rounded-lg text-yellow-500">
              <Trophy size={20} className="md:w-6 md:h-6" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-yellow-500">{t('players.top10Richest')}</h2>
          </div>
          <div className="p-3 md:p-4 flex-1 overflow-y-auto">
            <div className="space-y-2 md:space-y-3">
              {richest.map((player, index) => {
                const status = getFinancialStatus(player.wealth || 0);
                return (
                  <div 
                    key={player.id} 
                    onClick={() => setSelectedPlayer(player)}
                    className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-zinc-950 rounded-xl border border-zinc-800/50 cursor-pointer hover:border-red-500/50 transition-colors"
                  >
                    <div className="w-6 md:w-8 text-center font-black text-zinc-500 text-sm md:text-base">#{index + 1}</div>
                    <PlayerAvatar
                      photoURL={player.photoURL}
                      displayName={player.displayName}
                      vipLevel={player.vipLevel as any}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-sm md:text-base player-name-script">{player.displayName}</div>
                      <div className={`text-[10px] md:text-xs font-bold ${status.color}`}>{status.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Killers */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-red-500/10 border-b border-red-500/20 p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-red-500/20 rounded-lg text-red-500">
              <Skull size={20} className="md:w-6 md:h-6" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-red-500">{t('players.top10Killers')}</h2>
          </div>
          <div className="p-3 md:p-4 flex-1 overflow-y-auto">
            <div className="space-y-2 md:space-y-3">
              {killers.map((player, index) => (
                <div 
                  key={player.id} 
                  onClick={() => setSelectedPlayer(player)}
                  className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-zinc-950 rounded-xl border border-zinc-800/50 cursor-pointer hover:border-red-500/50 transition-colors"
                >
                  <div className="w-6 md:w-8 text-center font-black text-zinc-500 text-sm md:text-base">#{index + 1}</div>
                  <PlayerAvatar
                    photoURL={player.photoURL}
                    displayName={player.displayName}
                    vipLevel={player.vipLevel as any}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-sm md:text-base">{player.displayName}</div>
                    <div className="text-[10px] md:text-xs text-zinc-400">{formatNumber(player.kills || 0)} {t('players.killed')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Newest Players */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-blue-500/10 border-b border-blue-500/20 p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-blue-500/20 rounded-lg text-blue-500">
              <Clock size={20} className="md:w-6 md:h-6" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-blue-500">{t('players.newestPlayers')}</h2>
          </div>
          <div className="p-3 md:p-4 flex-1 overflow-y-auto">
            <div className="space-y-2 md:space-y-3">
              {newest.map((player, index) => (
                <div 
                  key={player.id} 
                  onClick={() => setSelectedPlayer(player)}
                  className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-zinc-950 rounded-xl border border-zinc-800/50 cursor-pointer hover:border-red-500/50 transition-colors"
                >
                  <div className="w-6 md:w-8 text-center font-black text-zinc-500 text-sm md:text-base">#{index + 1}</div>
                  <PlayerAvatar
                    photoURL={player.photoURL}
                    displayName={player.displayName}
                    vipLevel={player.vipLevel as any}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-sm md:text-base">{player.displayName}</div>
                    <div className="text-[10px] md:text-xs text-zinc-400">{formatDate(player.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {renderPlayerModal()}
    </div>
  );
}
