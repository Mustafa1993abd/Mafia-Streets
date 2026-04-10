import React, { useState, useEffect } from 'react';
import { X, MapPin, Zap, Users, Skull, Search, ShieldAlert, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import PlayerAvatar from './PlayerAvatar';

interface PlayerModalProps {
  player: {
    uid: string;
    displayName: string;
    level: number;
    currentCity?: string;
    power?: number;
    gangId?: string;
    gangRole?: 'leader' | 'member';
    isDeceived?: boolean;
    photoURL?: string;
    vipLevel?: string | null;
  };
  onClose: () => void;
}

export default function PlayerModal({ player, onClose }: PlayerModalProps) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gangName, setGangName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGangName = async () => {
      if (!player.gangId) {
        setGangName(null);
        return;
      }

      try {
        const gangDoc = await getDoc(doc(db, 'gangs', player.gangId));
        if (gangDoc.exists()) {
          setGangName(gangDoc.data().name);
        }
      } catch (error) {
        console.error('Error fetching gang name:', error);
      }
    };

    fetchGangName();
  }, [player.gangId]);

  const getGangDisplay = () => {
    if (!player.gangId) return t('playerProfile.none');
    if (!gangName) return '...';
    
    const role = player.gangRole === 'leader' ? t('gangs.leader') : t('gangs.member');
    return `${role} - ${gangName}`;
  };

  const handleSearch = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Logic for searching player location
      // For now, just a simulation with a chance of success
      const success = Math.random() > 0.3;
      if (success) {
        toast.success(t('playerProfile.searchSuccess', { city: t(`map.cities.${player.currentCity || 'baghdad'}`) }));
      } else {
        toast.error(t('playerProfile.searchFailed'));
      }
    } catch (error) {
      toast.error(t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleKill = () => {
    navigate(`/attack/${player.uid}`);
    onClose();
  };

  const handleSendMessage = () => {
    navigate('/messages', { state: { recipientId: player.uid, recipientName: player.displayName } });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-br from-red-600/20 to-zinc-900 border-b border-zinc-800">
            <button 
              onClick={onClose}
              className="absolute top-4 end-4 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors z-10"
            >
              <X size={20} />
            </button>
            <div className="absolute -bottom-10 start-8 flex items-end gap-4">
              <PlayerAvatar
                photoURL={player.photoURL}
                displayName={player.displayName}
                vipLevel={player.vipLevel as any}
                size="xl"
                className="border-4 border-zinc-950 shadow-xl"
              />
              <div className="mb-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter player-name-script">{player.displayName}</h3>
                <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-widest">
                  <ShieldAlert size={12} />
                  {t('profile.level')} {player.level}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-14 p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <InfoCard 
                icon={MapPin} 
                label={t('playerProfile.currentCity')} 
                value={player.isDeceived ? t('playerProfile.deceived') : t(`map.cities.${player.currentCity || 'baghdad'}`)} 
                color="blue"
              />
              <InfoCard 
                icon={Zap} 
                label={t('playerProfile.power')} 
                value={formatNumber(player.power || 0)} 
                color="orange"
              />
              <InfoCard 
                icon={Users} 
                label={t('playerProfile.gang')} 
                value={getGangDisplay()} 
                color="purple"
              />
              <InfoCard 
                icon={Skull} 
                label={t('profile.level')} 
                value={player.level.toString()} 
                color="red"
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleKill}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                <Skull size={18} />
                {t('playerProfile.kill')}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                  {t('playerProfile.search')}
                </button>
                <button
                  onClick={handleSendMessage}
                  className="py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <MessageSquare size={18} />
                  {t('messages.send')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function InfoCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const colors = {
    blue: 'text-blue-500 bg-blue-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    red: 'text-red-500 bg-red-500/10'
  };

  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
      <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center mb-2", colors[color as keyof typeof colors])}>
        <Icon size={16} />
      </div>
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-bold text-white truncate">{value}</div>
    </div>
  );
}
