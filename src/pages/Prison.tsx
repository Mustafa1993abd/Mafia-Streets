import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Unlock, Send, AlertTriangle, User, Search, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDocs,
  orderBy,
  limit,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatMoney, formatNumber, safeToMillis } from '../lib/utils';
import { getVIPDiscount } from '../lib/vip';
import { motion, AnimatePresence } from 'framer-motion';

export default function Prison() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [prisoners, setPrisoners] = useState<any[]>([]);
  const [wantedPlayers, setWantedPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;

    // Listen for imprisoned players
    const prisonersQuery = query(
      collection(db, 'users_public'),
      where('isImprisoned', '==', true)
    );
    const unsubscribePrisoners = onSnapshot(prisonersQuery, (snapshot) => {
      setPrisoners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_public (prisoners)');
    });

    // Listen for wanted players (5 stars)
    const wantedQuery = query(
      collection(db, 'users_public'),
      where('wantedStars', '==', 5),
      where('isImprisoned', '==', false)
    );
    const unsubscribeWanted = onSnapshot(wantedQuery, (snapshot) => {
      setWantedPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_public (wanted)');
    });

    // Listen for prison chat
    const chatQuery = query(
      collection(db, 'prison_messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prison_messages');
    });

    return () => {
      unsubscribePrisoners();
      unsubscribeWanted();
      unsubscribeChat();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'prison_messages'), {
        senderId: profile.uid,
        senderName: profile.displayName,
        content: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prison_messages');
    }
  };

  const handleBribe = async () => {
    if (!profile) return;
    const bribeAmount = Math.floor(100000 * getVIPDiscount(profile.vipLevel as any));

    if (profile.cleanMoney < bribeAmount) {
      toast.error(t('prison.noMoney'));
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney - bribeAmount,
        isImprisoned: false,
        wantedStars: 0
      });
      toast.success(t('prison.bribeSuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleBreakOut = async (targetId: string, targetName: string) => {
    if (!profile) return;
    if (profile.isImprisoned) {
      toast.error(t('prison.alreadyImprisoned'));
      return;
    }

    const success = Math.random() > 0.5;

    try {
      if (success) {
        await updateDoc(doc(db, 'users', targetId), {
          isImprisoned: false,
          jailTimeEnd: null
        });
        await updateDoc(doc(db, 'users_public', targetId), {
          isImprisoned: false,
          jailTimeEnd: null
        });
        toast.success(t('prison.breakOutSuccess', { name: targetName }));
      } else {
        await updateDoc(doc(db, 'users', profile.uid), {
          isImprisoned: true,
          jailTimeEnd: Date.now() + 5 * 60 * 1000,
          wantedStars: Math.min(5, (profile.wantedStars || 0) + 1)
        });
        await updateDoc(doc(db, 'users_public', profile.uid), {
          isImprisoned: true,
          jailTimeEnd: Date.now() + 5 * 60 * 1000,
          wantedStars: Math.min(5, (profile.wantedStars || 0) + 1)
        });
        toast.error(t('prison.breakOutFailed'));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleCatchWanted = async (target: any) => {
    if (!profile) return;
    if (profile.isImprisoned) return;

    try {
      // Fetch full target profile to get accurate power
      const targetDoc = await getDoc(doc(db, 'users_public', target.id));
      if (!targetDoc.exists()) return;
      const fullTarget = targetDoc.data();

      // Calculate power
      const calculatePower = (p: any) => {
        let power = (p.level || 1) * 100;
        if (p.equipped?.weapon1) power += 500;
        if (p.equipped?.weapon2) power += 300;
        return power;
      };

      const myPower = calculatePower(profile);
      const targetPower = calculatePower(fullTarget);

      if (myPower <= targetPower) {
        toast.error(t('prison.tooWeak'));
        return;
      }
      // Imprison target
      await updateDoc(doc(db, 'users', target.id), {
        isImprisoned: true,
        jailTimeEnd: Date.now() + 5 * 60 * 1000,
        wantedStars: 5
      });
      await updateDoc(doc(db, 'users_public', target.id), {
        isImprisoned: true,
        jailTimeEnd: Date.now() + 5 * 60 * 1000,
        wantedStars: 5
      });

      // Reward catcher
      const reward = target.bounty || 5000;
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney + reward
      });

      // Reset target bounty
      await updateDoc(doc(db, 'users', target.id), {
        bounty: 0
      });
      await updateDoc(doc(db, 'users_public', target.id), {
        bounty: 0
      });

      // Notify target
      await addDoc(collection(db, 'messages'), {
        senderId: 'system',
        senderName: 'Police',
        receiverId: target.id,
        content: `لقد تم القبض عليك من قبل ${profile.displayName} وتم إيداعك السجن.`,
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });

      // Notify catcher
      toast.success(t('prison.catchSuccess', { name: target.displayName, reward: formatMoney(reward) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="text-white space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
          <Lock size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('prison.title')}</h2>
          <p className="text-zinc-500 text-sm">{t('prison.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prisoners List (On the Right in RTL) */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col h-[600px] order-1 lg:order-2">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
            <h3 className="font-bold flex items-center gap-2 text-red-500">
              <User size={18} />
              {t('prison.prisoners')} ({prisoners.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {prisoners.map((prisoner) => (
              <div key={prisoner.id} className={`p-3 rounded-xl border flex items-center justify-between ${
                prisoner.wantedStars === 5 ? 'bg-red-500/10 border-red-500/50' : 'bg-zinc-950/50 border-zinc-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${prisoner.wantedStars === 5 ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400'}`}>
                    <User size={16} />
                  </div>
                  <div>
                    <p className={`font-bold text-sm player-name-script ${prisoner.wantedStars === 5 ? 'text-red-500' : 'text-white'}`}>
                      {prisoner.displayName}
                    </p>
                    <div className="flex gap-0.5 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (prisoner.wantedStars || 0) ? 'bg-yellow-500' : 'bg-zinc-800'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-mono text-zinc-500">
                  {prisoner.jailTimeEnd ? Math.max(0, Math.ceil((safeToMillis(prisoner.jailTimeEnd) - Date.now()) / 60000)) : 0} دقيقة
                </div>
                {!profile?.isImprisoned && (
                  <button 
                    onClick={() => handleBreakOut(prisoner.id, prisoner.displayName)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title={t('prison.breakOut')}
                  >
                    <Unlock size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Box (On the Left in RTL) */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col h-[600px] overflow-hidden order-2 lg:order-1">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Send size={18} className="text-blue-500" />
              {t('prison.chat')}
            </h3>
            {profile?.isImprisoned && (
              <button 
                onClick={handleBribe}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
              >
                <DollarSign size={14} />
                {t('prison.bribe')} ({Math.floor(100 * getVIPDiscount(profile?.vipLevel as any))}k)
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.senderId === profile?.uid ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-zinc-500 player-name-script">{msg.senderName}</span>
                </div>
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                  msg.senderId === profile?.uid ? 'bg-blue-600 text-white rounded-se-none' : 'bg-zinc-800 text-zinc-300 rounded-ss-none'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={profile?.isImprisoned ? t('prison.typeMessage') : t('prison.onlyPrisonersCanChat')}
              disabled={!profile?.isImprisoned}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={!profile?.isImprisoned || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white p-2 rounded-xl transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Most Wanted Section */}
      <div className="mt-12">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight">{t('prison.mostWanted')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wantedPlayers.map((player) => (
            <div key={player.id} className="bg-zinc-900 rounded-2xl border border-red-500/30 overflow-hidden group hover:border-red-500 transition-colors">
              <div className="relative h-40 bg-zinc-800">
                <img 
                  src={player.photoURL || `https://picsum.photos/seed/${player.uid}/400/300`} 
                  alt={player.displayName}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 end-2 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                  ))}
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-zinc-900 to-transparent">
                  <p className="font-black text-xl text-white">{player.displayName}</p>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between bg-zinc-950/50">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('prison.bounty')}</p>
                  <p className="text-lg font-black text-green-500">{formatMoney(player.bounty || 50000)}</p>
                </div>
                <button 
                  onClick={() => handleCatchWanted(player)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
                >
                  <Search size={14} />
                  {t('prison.catch')}
                </button>
              </div>
            </div>
          ))}
          {wantedPlayers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 font-bold">{t('prison.noWantedPlayers')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
