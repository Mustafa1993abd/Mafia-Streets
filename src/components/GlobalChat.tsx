import React, { useState, useEffect, useRef } from 'react';
// RULE: Use JSX/TSX only. Do not use raw HTML strings or innerHTML.
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import PlayerAvatar from './PlayerAvatar';
import { 
  MessageSquare, X, Send, Users, Crown, ShieldCheck, 
  User as UserIcon, ChevronRight, ChevronLeft,
  Gavel, Bird, Shield, ShieldAlert, Globe, Landmark,
  Target, Briefcase, Zap, Search, Lock,
  Signal, Wifi, Battery, Camera, Mic, Phone, Info, MoreVertical,
  Check, CheckCheck, Smile, Paperclip, Camera as CameraIcon, Trash2
} from 'lucide-react';
import { 
  collection, query, orderBy, limit, onSnapshot, 
  addDoc, serverTimestamp, where, doc, getDocs, writeBatch, deleteDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { safeToDate } from '../lib/utils';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  senderRole?: string;
  senderGangId?: string;
  senderGangName?: string;
  senderGangColor?: string;
  senderPhoneNumber?: string;
  senderHasESim?: boolean;
  vipLevel?: string | null;
  text: string;
  timestamp: any;
}

interface OnlinePlayer {
  uid: string;
  displayName: string;
  role: string;
  lastActive: any;
  gangId?: string;
  gangName?: string;
  gangColor?: string;
  phoneNumber?: string;
  hasESim?: boolean;
  photoURL?: string;
}

export default function GlobalChat() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [govData, setGovData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<OnlinePlayer | null>(null);
  const [showNumber, setShowNumber] = useState(false);

  const isRTL = i18n.language === 'ar';
  const isAdmin = profile?.role === 'Admin';

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleClearChat = async () => {
    if (!isAdmin) return;
    
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000);
      return;
    }

    try {
      const q = query(collection(db, 'global_chat'));
      const snapshot = await getDocs(q);
      
      const chunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        chunks.push(snapshot.docs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      toast.success('تم حذف جميع الدردشات بنجاح');
      setIsConfirmingDelete(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'global_chat');
      setIsConfirmingDelete(false);
    }
  };

  const autoCleanup = async () => {
    if (!isAdmin) return;
    try {
      const q = query(collection(db, 'global_chat'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      
      const chunks = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        chunks.push(snapshot.docs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      console.log('Auto-cleanup: Deleted all messages');
    } catch (error) {
      console.error('Auto-cleanup error:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      const interval = setInterval(autoCleanup, 60 * 60 * 1000); // Check every 1 hour
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handlePlayerClick = (player: any) => {
    // Convert ChatMessage to OnlinePlayer-like object if needed
    const playerInfo: OnlinePlayer = {
      uid: player.uid || player.senderId,
      displayName: player.displayName || player.senderName,
      role: player.role || player.senderRole || '',
      lastActive: player.lastActive || null,
      gangId: player.gangId || player.senderGangId,
      gangName: player.gangName || player.senderGangName,
      gangColor: player.gangColor || player.senderGangColor,
      phoneNumber: player.phoneNumber || player.senderPhoneNumber,
      hasESim: player.hasESim || player.senderHasESim,
      photoURL: player.photoURL || player.senderPhoto
    };
    setSelectedPlayer(playerInfo);
    setShowNumber(true);
  };

  useEffect(() => {
    // Listen to Government Data for roles
    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists()) setGovData(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });

    // Listen to Global Chat
    const q = query(
      collection(db, 'global_chat'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubChat = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'global_chat');
    });

    // Listen to Online Players (active in the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const qOnline = query(
      collection(db, 'users_public'),
      where('lastActive', '>=', fiveMinutesAgo),
      limit(100)
    );

    const unsubOnline = onSnapshot(qOnline, (snapshot) => {
      const players = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as OnlinePlayer[];
      setOnlinePlayers(players);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_public');
    });

    return () => {
      unsubGov();
      unsubChat();
      unsubOnline();
    };
  }, []);

  // Scroll is handled naturally by flex-col-reverse

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || sending) return;
    
    if (!profile) {
      toast.error(t('جاري تحميل بيانات الملف الشخصي... يرجى المحاولة مرة أخرى'));
      return;
    }

    const messageText = inputText.trim();
    setInputText(''); // Clear input immediately for better UX
    setSending(true);

    try {
      await addDoc(collection(db, 'global_chat'), {
        senderId: profile.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL || '',
        senderRole: profile.role,
        senderPhoneNumber: profile.equipped?.sim || profile.phoneNumber || '',
        senderHasESim: profile.hasESim || false,
        senderGangId: profile.gangId || '',
        senderGangName: profile.gangName || '',
        senderGangColor: profile.gangColor || '',
        vipLevel: profile.vipLevel || null,
        text: messageText,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'global_chat');
    } finally {
      setSending(false);
    }
  };

  const getPlayerRoleInfo = (uid: string) => {
    if (!govData) return null;
    
    // Prime Minister
    if (govData.primeMinisterId === uid) return { title: t('politics.pm'), type: 'pm', color: 'text-amber-500', icon: Crown };
    
    // Parliament Leadership
    if (govData.parliament?.speaker?.uid === uid) return { title: t('government.parliament.speaker'), type: 'speaker', color: 'text-amber-500', icon: Crown };
    if (govData.parliament?.deputy1?.uid === uid) return { title: t('government.parliament.deputy1'), type: 'deputy', color: 'text-amber-500', icon: Crown };
    if (govData.parliament?.deputy2?.uid === uid) return { title: t('government.parliament.deputy2'), type: 'deputy', color: 'text-amber-500', icon: Crown };

    // Cabinet Ministers
    if (govData.cabinet) {
      const ministerConfigs: Record<string, any> = {
        interior: { title: 'وزير الداخلية', icon: Shield, color: 'text-amber-500' },
        defense: { title: 'وزير الدفاع', icon: ShieldAlert, color: 'text-amber-500' },
        foreign: { title: 'وزير الخارجية', icon: Globe, color: 'text-amber-500' },
        finance: { title: 'وزير المالية', icon: Landmark, color: 'text-amber-500' },
        health: { title: 'وزير الصحة', icon: Target, color: 'text-amber-500' },
        industry: { title: 'وزير الصناعة', icon: Briefcase, color: 'text-amber-500' },
        oil: { title: 'وزير النفط', icon: Zap, color: 'text-amber-500' },
        electricity: { title: 'وزير الكهرباء', icon: Zap, color: 'text-amber-500' },
        labor: { title: 'وزير العمل', icon: Users, color: 'text-amber-500' },
        intelligence: { title: 'رئيس المخابرات', icon: Search, color: 'text-amber-500' },
        security: { title: 'رئيس الأمن', icon: Lock, color: 'text-amber-500' },
      };

      for (const [roleId, data] of Object.entries(govData.cabinet)) {
        if ((data as any).uid === uid) {
          const config = ministerConfigs[roleId];
          return { 
            title: config?.title || 'وزير', 
            type: 'minister', 
            color: config?.color || 'text-zinc-400',
            icon: config?.icon || ShieldCheck
          };
        }
      }
    }

    // Members of Parliament
    if (govData.parliament?.members?.some((m: any) => m.uid === uid)) {
      return { title: 'سعادة النائب', type: 'mp', color: 'text-zinc-400', icon: Bird };
    }

    return null;
  };

  const getMessageStyle = (msg: ChatMessage) => {
    const roleInfo = getPlayerRoleInfo(msg.senderId);
    
    if (msg.senderRole === 'Admin') {
      return {
        border: 'border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]',
        titleColor: 'text-red-500',
        nameColor: 'text-red-400',
        title: t('roles.Admin'),
        icon: Gavel,
        iconColor: 'bg-red-600'
      };
    }

    if (roleInfo?.type === 'pm' || roleInfo?.type === 'speaker' || roleInfo?.type === 'deputy' || roleInfo?.type === 'minister') {
      const colorClass = roleInfo.color || 'text-amber-500';
      const borderClass = colorClass.replace('text-', 'border-');
      const bgClass = colorClass.replace('text-', 'bg-');

      return {
        border: `${borderClass} shadow-[0_0_10px_rgba(0,0,0,0.3)]`,
        titleColor: (roleInfo.type === 'pm' || roleInfo.type === 'minister') ? 'text-purple-500' : colorClass,
        nameColor: colorClass,
        title: roleInfo.title,
        icon: roleInfo.icon || Crown,
        iconColor: bgClass
      };
    }
    
    if (roleInfo?.type === 'mp') {
      return {
        border: 'border-zinc-400 shadow-[0_0_10px_rgba(161,161,170,0.3)]',
        titleColor: 'text-green-500',
        nameColor: 'text-zinc-300',
        title: roleInfo.title,
        icon: Bird,
        iconColor: 'bg-zinc-400'
      };
    }

    return {
      border: 'border-white/40',
      titleColor: 'text-zinc-500',
      titleStyle: { color: msg.senderGangColor },
      nameColor: 'text-white',
      title: msg.senderGangName || t('roles.player'),
      icon: null,
      iconColor: ''
    };
  };

  return (
    <div className="fixed bottom-4 end-4 z-[100] transition-all duration-500">
      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-zinc-950 border-2 border-amber-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] text-amber-500 hover:bg-amber-500 hover:text-black transition-all"
        >
          <MessageSquare size={24} />
        </motion.button>
      )}

      {/* iPhone 17 Pro Max Frame */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="relative w-[320px] h-[600px] bg-zinc-900 rounded-[3rem] p-2.5 shadow-2xl border-[5px] border-zinc-800"
            style={{
              boxShadow: '0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(245,158,11,0.1)'
            }}
          >
            {/* Dynamic Island */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-50 flex items-center justify-center gap-1.5 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="flex-1 h-0.5 bg-zinc-900 rounded-full" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            </div>

            {/* Side Buttons */}
            <div className="absolute -left-[6px] top-24 w-1 h-10 bg-zinc-800 rounded-r-md" />
            <div className="absolute -left-[6px] top-36 w-1 h-12 bg-zinc-800 rounded-r-md" />
            <div className="absolute -left-[6px] top-52 w-1 h-12 bg-zinc-800 rounded-r-md" />
            <div className="absolute -right-[6px] top-36 w-1 h-16 bg-zinc-800 rounded-l-md" />

            {/* Screen Content */}
            <div className="w-full h-full bg-black rounded-[2.4rem] overflow-hidden relative flex flex-col border border-white/5">
              {/* Wallpaper (Mafia Theme) */}
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop" 
                  alt="Mafia Wallpaper" 
                  className="w-full h-full object-cover opacity-40 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
              </div>

              {/* Status Bar */}
              <div className="h-8 flex items-center justify-between px-6 relative z-20">
                <span className="text-white text-[11px] font-semibold">{format(new Date(), 'HH:mm')}</span>
                <div className="flex items-center gap-1">
                  <Signal size={12} className="text-white" />
                  <Wifi size={12} className="text-white" />
                  <div className="flex items-center gap-0.5 border border-white/30 rounded-[2px] px-0.5 py-0.5">
                    <div className="w-3 h-1.5 bg-white rounded-[0.5px]" />
                  </div>
                </div>
              </div>

                {/* WhatsApp Header */}
                <div className="bg-[#075E54]/90 backdrop-blur-md p-1 flex items-center justify-between relative z-20 border-b border-white/5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 p-0.5 rounded-full">
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center">
                        <img src={profile?.photoURL || "https://picsum.photos/seed/mafia/200"} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-[9px] leading-none">{t('chat.globalTitle')}</h4>
                        <p className="text-white/70 text-[7px] mt-0.5">{onlinePlayers.length} {t('chat.online')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-white pr-2">
                    {isAdmin && (
                      <button 
                        onClick={handleClearChat}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${isConfirmingDelete ? 'bg-red-600 text-white' : 'bg-red-500/20 hover:bg-red-500/40 text-red-400'}`}
                        title="حذف جميع الدردشات"
                      >
                        <Trash2 size={12} />
                        <span className="text-[9px] font-bold">{isConfirmingDelete ? 'تأكيد الحذف؟' : 'حذف الكل'}</span>
                      </button>
                    )}
                    <Camera size={14} />
                    <Phone size={12} />
                    <MoreVertical size={14} />
                  </div>
                </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Messages Container */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-3 scrollbar-none"
                  style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'repeat',
                    opacity: 0.9
                  }}
                >
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    const roleInfo = getPlayerRoleInfo(msg.senderId);
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={clsx(
                          "flex flex-col max-w-[90%]",
                          isMe ? "ms-auto items-end" : "me-auto items-start"
                        )}
                      >
                        <div className={clsx(
                          "relative p-2 rounded-xl shadow-sm",
                          isMe ? "bg-[#DCF8C6] text-black rounded-tr-none" : "bg-white text-black rounded-tl-none"
                        )}>
                          {/* Sender Info (Always show for context) */}
                          <div className={clsx("flex items-center gap-1.5 mb-1", isMe ? "flex-row-reverse" : "flex-row")}>
                            <button 
                              onClick={() => handlePlayerClick(msg)}
                              className="shrink-0"
                            >
                              <PlayerAvatar
                                photoURL={msg.senderPhoto}
                                displayName={msg.senderName}
                                vipLevel={msg.vipLevel as any}
                                size="sm"
                              />
                            </button>
                            <div className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}>
                              <div className="flex items-center gap-1">
                                <span 
                                  onClick={() => handlePlayerClick(msg)}
                                  className="text-[9px] font-bold text-blue-600 cursor-pointer hover:underline"
                                >
                                  {msg.senderName}
                                </span>
                                {roleInfo && (
                                  <span className={clsx("text-[6px] font-black uppercase px-1 rounded", roleInfo.color.replace('text-', 'bg-').replace('500', '500/20'))}>
                                    {roleInfo.title}
                                  </span>
                                )}
                              </div>
                              {msg.senderGangName && (
                                <span 
                                  className="text-[7px] font-black uppercase tracking-tighter"
                                  style={{ color: msg.senderGangColor || '#666' }}
                                >
                                  {msg.senderGangName}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs leading-tight break-words">{msg.text}</p>
                          
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[8px] text-zinc-500 font-mono">
                              {msg.timestamp ? format(safeToDate(msg.timestamp), 'HH:mm') : '--:--'}
                            </span>
                            {isMe && <CheckCheck size={10} className="text-blue-500" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* WhatsApp Input Bar */}
                <div className="p-1.5 bg-[#F0F0F0] flex items-center gap-1.5 relative z-20">
                  <Smile size={18} className="text-zinc-500" />
                  <Paperclip size={18} className="text-zinc-500 -rotate-45" />
                  <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-1.5">
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t('chat.placeholder')}
                      className="flex-1 bg-white rounded-full px-2.5 py-1 text-[11px] text-black outline-none border border-zinc-200 focus:border-[#25D366]"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="w-7 h-7 bg-[#075E54] text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all disabled:opacity-50"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                  <Mic size={18} className="text-zinc-500" />
                </div>
              </div>

              {/* Home Indicator */}
              <div className="h-6 flex items-center justify-center relative z-20">
                <div className="w-24 h-1 bg-white/30 rounded-full" />
              </div>
            </div>

            {/* Player Info Overlay (iOS Style) */}
            <AnimatePresence>
              {selectedPlayer && showNumber && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[85%] bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl z-[60] border border-white/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden border border-zinc-300">
                        <img src={selectedPlayer.photoURL || `https://picsum.photos/seed/${selectedPlayer.uid}/200`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h5 className="font-bold text-black text-xs">{selectedPlayer.displayName}</h5>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{selectedPlayer.role}</p>
                        {selectedPlayer.gangName && (
                          <p className="text-[8px] font-black uppercase" style={{ color: selectedPlayer.gangColor }}>
                            {selectedPlayer.gangName}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setShowNumber(false)} className="p-1.5 bg-zinc-100 rounded-full text-zinc-400 hover:text-black">
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-zinc-100 rounded-xl">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">رقم الهاتف</span>
                      <span className="text-xs font-mono font-bold text-black">{selectedPlayer.phoneNumber || 'لا يوجد رقم'}</span>
                    </div>
                    {selectedPlayer.hasESim && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-xl text-[9px] text-blue-600 font-black uppercase tracking-widest">
                        <Zap size={12} />
                        eSim مفعل
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
