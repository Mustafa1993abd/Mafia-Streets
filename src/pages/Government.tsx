import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import { COUNTRIES } from '../constants/countries';
import { doc, onSnapshot, updateDoc, increment, runTransaction, serverTimestamp, arrayUnion, collection, getDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FileText, Users, ShieldCheck, Gavel, AlertTriangle, Landmark, Vote, DollarSign, Target, UserPlus, TrendingUp, Zap, Lock, Unlock, Ban, History, Globe, Car, Shield, User, ShieldAlert, Crown, ChevronRight, ChevronDown, ChevronUp, Scale, Bird, Building2, PenTool, Briefcase, FileX, Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatNumber, formatMoney, getRealisticAvatar, safeToMillis } from '../lib/utils';
import { OfficialDocument } from '../components/OfficialDocument';
import clsx from 'clsx';

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

const Modal = ({ isOpen, onClose, title, message, inputs, onConfirm }: any) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>({});
  
  useEffect(() => {
    if (isOpen && inputs) {
      const initialData: any = {};
      inputs.forEach((input: any) => {
        initialData[input.name] = input.defaultValue || '';
      });
      setFormData(initialData);
    }
  }, [isOpen, inputs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        {message && <p className="text-zinc-400 mb-6">{message}</p>}
        
        {inputs && inputs.length > 0 && (
          <div className="space-y-4 mb-6">
            {inputs.map((input: any) => (
              <div key={input.name}>
                <label className="block text-xs text-zinc-500 mb-1">{input.label}</label>
                {input.type === 'textarea' ? (
                  <textarea
                    value={formData[input.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [input.name]: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-amber-500/50 focus:outline-none min-h-[100px]"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[input.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [input.name]: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-amber-500/50 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        )}

            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-zinc-400 hover:bg-white/5 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={() => {
                onConfirm(formData);
                onClose();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(217,119,6,0.3)]"
            >
              {t('common.confirm')}
            </button>
      </motion.div>
    </div>
  );
};

export default function Government() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'parliament' | 'elections' | 'office' | 'documents' | 'bribes' | 'constitution'>('parliament');
  const [activeElectionTab, setActiveElectionTab] = useState<'parliament' | 'prime-minister'>('parliament');
  const [govData, setGovData] = useState<any>(null);
  const [gangs, setGangs] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [constitution, setConstitution] = useState<any[]>([]);
  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });

  const isMP = govData?.candidates?.some((c: any) => c.uid === profile?.uid && c.seats > 0);
  const isPM = govData?.primeMinisterId === profile?.uid;
  const isMinister = !!profile?.ministerRole;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'constitution'), (snapshot) => {
      setConstitution(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'constitution');
    });
    return () => unsub();
  }, []);

  const addArticle = async () => {
    setModalConfig({
      isOpen: true,
      title: t('government.constitution.addProposal'),
      inputs: [
        { name: 'title', label: t('government.constitution.proposalTitle') },
        { name: 'content', label: t('government.constitution.proposalText'), type: 'textarea' }
      ],
      onConfirm: async (data: any) => {
        if (!data.title || !data.content) return;
        try {
          await addDoc(collection(db, 'constitution'), {
            title: data.title,
            content: data.content,
            votesFor: 0,
            votesAgainst: 0,
            voters: [],
            status: 'pending'
          });
          toast.success(t('government.constitution.proposalSubmitted'));
        } catch (error: any) {
          console.error(error);
          toast.error(error.message || t('common.failed'));
        }
      }
    });
  };

  const certifyArticle = async (id: string, votesFor: number, votesAgainst: number) => {
    setModalConfig({
      isOpen: true,
      title: t('government.constitution.finalizeTitle'),
      message: t('government.constitution.confirmFinalize'),
      onConfirm: async () => {
        const status = votesFor > votesAgainst ? 'approved' : 'rejected';
        try {
          await updateDoc(doc(db, 'constitution', id), { status });
          toast.success(t('government.constitution.finalized', { result: t(`government.constitution.${status}`) }));
        } catch (error: any) {
          console.error(error);
          toast.error(error.message || t('common.failed'));
        }
      }
    });
  };

  const seedConstitution = async () => {
    const initialArticles = [
      { title: t('government.constitution.seed.article1.title'), content: t('government.constitution.seed.article1.content'), votesFor: 0, votesAgainst: 0, voters: [], status: 'active' },
      { title: t('government.constitution.seed.article2.title'), content: t('government.constitution.seed.article2.content'), votesFor: 0, votesAgainst: 0, voters: [], status: 'active' },
      { title: t('government.constitution.seed.article3.title'), content: t('government.constitution.seed.article3.content'), votesFor: 0, votesAgainst: 0, voters: [], status: 'active' },
    ];
    try {
      await Promise.all(initialArticles.map(article => addDoc(collection(db, 'constitution'), article)));
      toast.success(t('government.constitution.populate'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const editArticle = async (id: string, title: string, content: string) => {
    setModalConfig({
      isOpen: true,
      title: t('government.constitution.editArticle'),
      inputs: [
        { name: 'title', label: t('government.constitution.articleTitle'), defaultValue: title },
        { name: 'content', label: t('government.constitution.articleText'), defaultValue: content, type: 'textarea' }
      ],
      onConfirm: async (data: any) => {
        if (!data.title || !data.content) return;
        try {
          await updateDoc(doc(db, 'constitution', id), {
            title: data.title,
            content: data.content
          });
          toast.success(t('government.constitution.articleUpdated'));
        } catch (error: any) {
          console.error(error);
          toast.error(error.message || t('common.failed'));
        }
      }
    });
  };

  const deleteArticle = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: t('government.constitution.deleteArticle'),
      message: t('government.constitution.confirmDelete'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'constitution', id));
          toast.success(t('government.constitution.articleDeleted'));
        } catch (error: any) {
          console.error(error);
          toast.error(error.message || t('common.failed'));
        }
      }
    });
  };

  const voteArticle = async (id: string, voteType: 'for' | 'against') => {
    if (!profile?.uid) {
      toast.error(t('government.constitution.mustLoginToVote'));
      return;
    }
    const articleRef = doc(db, 'constitution', id);
    try {
      await runTransaction(db, async (transaction) => {
        const articleDoc = await transaction.get(articleRef);
        if (!articleDoc.exists()) {
          throw new Error(t('government.constitution.articleNotFound'));
        }
        const data = articleDoc.data();
        if (data.voters?.includes(profile?.uid)) {
          throw new Error(t('government.constitution.alreadyVoted'));
        }
        transaction.update(articleRef, {
          votesFor: voteType === 'for' ? increment(1) : data.votesFor,
          votesAgainst: voteType === 'against' ? increment(1) : data.votesAgainst,
          voters: arrayUnion(profile?.uid)
        });
      });
      toast.success(t('government.constitution.voteSuccess'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const finalizeElection = async (data: any) => {
    if (!data?.electionActive) return;
    try {
      const govRef = doc(db, 'government', 'current');
      
      await runTransaction(db, async (transaction) => {
        const freshGovDoc = await transaction.get(govRef);
        if (!freshGovDoc.exists()) return;
        const freshData = freshGovDoc.data();
        if (!freshData.electionActive) return;

        const candidates = freshData.candidates || [];
        const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);

        const results: any = {
          speakerId: sortedCandidates[0]?.uid || null,
          deputy1Id: sortedCandidates[1]?.uid || null,
          deputy2Id: sortedCandidates[2]?.uid || null
        };

        const MAX_SEATS = 329;
        const gangSeats: Record<string, number> = {};
        const gangVotes = freshData.gangVotes || {};
        
        // 1. Each candidate with votes gets 1 seat (up to 329)
        const candidatesWithSeats = sortedCandidates.filter(c => c.votes > 0).slice(0, MAX_SEATS);
        candidatesWithSeats.forEach(c => {
          c.seats = 1;
          c.position = 'Member'; // Default
          if (c.uid === results.speakerId) c.position = 'Speaker';
          else if (c.uid === results.deputy1Id) c.position = 'Deputy1';
          else if (c.uid === results.deputy2Id) c.position = 'Deputy2';

          if (c.gangId) {
            gangSeats[c.gangId] = (gangSeats[c.gangId] || 0) + 1;
          }
        });

        // 2. Distribute remaining seats among gangs based on 1000 votes = 1 seat
        let remainingSeats = MAX_SEATS - candidatesWithSeats.length;
        if (remainingSeats > 0) {
          const gangExtraSeats: Record<string, number> = {};
          let totalExtraRequested = 0;

          Object.entries(gangVotes).forEach(([gangId, votes]: [string, any]) => {
            const extra = Math.floor(votes / 1000);
            gangExtraSeats[gangId] = extra;
            totalExtraRequested += extra;
          });

          // If we have more extra seats requested than available, scale down
          if (totalExtraRequested > remainingSeats) {
            const scale = remainingSeats / totalExtraRequested;
            let assigned = 0;
            Object.keys(gangExtraSeats).forEach(gangId => {
              gangExtraSeats[gangId] = Math.floor(gangExtraSeats[gangId] * scale);
              assigned += gangExtraSeats[gangId];
            });
            
            // Distribute remainder to top gangs
            let remainder = remainingSeats - assigned;
            const sortedGangsByVotes = Object.entries(gangVotes).sort(([, a]: any, [, b]: any) => b - a);
            for (let i = 0; i < remainder; i++) {
              const gangId = sortedGangsByVotes[i % sortedGangsByVotes.length][0];
              gangExtraSeats[gangId] = (gangExtraSeats[gangId] || 0) + 1;
            }
          } else if (totalExtraRequested < remainingSeats && totalExtraRequested > 0) {
            // If we have fewer extra seats requested than available, but some were requested
            // Fill the rest proportionally or to top gangs? 
            // The prompt says "divide among gangs", so we fill the rest to top gangs
            let remainder = remainingSeats - totalExtraRequested;
            const sortedGangsByVotes = Object.entries(gangVotes).sort(([, a]: any, [, b]: any) => b - a);
            for (let i = 0; i < remainder; i++) {
              const gangId = sortedGangsByVotes[i % sortedGangsByVotes.length][0];
              gangExtraSeats[gangId] = (gangExtraSeats[gangId] || 0) + 1;
            }
          } else if (totalExtraRequested === 0 && remainingSeats > 0) {
            // No votes bought, but seats remaining? Distribute to gangs with candidates or just all gangs?
            const gangsWithCandidates = Array.from(new Set(candidates.map((c: any) => c.gangId).filter(Boolean)));
            let targetGangs = gangsWithCandidates.length > 0 ? gangsWithCandidates : Object.keys(gangVotes);
            
            // If still no target gangs, use all gangs from the gangs array
            if (targetGangs.length === 0 && gangs.length > 0) {
              targetGangs = gangs.map(g => g.id);
            }

            if (targetGangs.length > 0) {
              for (let i = 0; i < remainingSeats; i++) {
                const gangId = targetGangs[i % targetGangs.length] as string;
                gangExtraSeats[gangId] = (gangExtraSeats[gangId] || 0) + 1;
              }
            }
          }

          // Add extra seats to gang totals
          Object.entries(gangExtraSeats).forEach(([gangId, extra]) => {
            gangSeats[gangId] = (gangSeats[gangId] || 0) + extra;
          });
        }

        // Grant immunity to winners
        const winners = [results.speakerId, results.deputy1Id, results.deputy2Id].filter(Boolean);
        for (const uid of winners) {
          const userRef = doc(db, 'users', uid);
          transaction.update(userRef, {
            immunity: 'diamond',
            immunityExpires: 'permanent'
          });
          // Send message
          const msgRef = doc(collection(db, 'messages'));
          transaction.set(msgRef, {
            senderId: 'system',
            senderName: t('politics.councilName'),
            receiverId: uid,
            content: t('government.office.immunityMessage'),
            type: 'system',
            read: false,
            timestamp: serverTimestamp()
          });
        }

        // 3. Send messages to all candidates
        sortedCandidates.forEach(c => {
          const msgRef = doc(collection(db, 'messages'));
          const isWinner = c.seats && c.seats > 0;
          const positionKey = c.position === 'Speaker' ? 'speaker' : c.position === 'Deputy1' ? 'deputy1' : c.position === 'Deputy2' ? 'deputy2' : 'member';
          const content = isWinner 
            ? t('politics.electionWin', { votes: c.votes, seats: c.seats, position: t(`politics.${positionKey}`) })
            : t('politics.electionLoss', { votes: c.votes });
            
          transaction.set(msgRef, {
            senderId: 'system',
            senderName: t('politics.councilName'),
            receiverId: c.uid,
            content,
            type: 'system',
            read: false,
            timestamp: serverTimestamp()
          });

          if (isWinner && ['Speaker', 'Deputy1', 'Deputy2'].includes(c.position)) {
            const broadcastRef = doc(collection(db, 'messages'));
            transaction.set(broadcastRef, {
              senderId: 'system',
              senderName: t('politics.councilName'),
              receiverId: 'all',
              content: `تهانينا للاعب ${c.displayName || c.name} بمناسبة فوزه بمنصب ${t(`politics.${positionKey}`)} بـ ${c.votes} صوت. نتمنى له التوفيق!`,
              type: 'broadcast',
              read: false,
              timestamp: serverTimestamp()
            });
          }
        });

        const electedMPs = sortedCandidates
          .filter(c => c.seats && c.seats > 0)
          .map(c => ({
            uid: c.uid,
            name: c.displayName || c.name,
            position: c.position
          }));

        transaction.update(govRef, {
          electionActive: false,
          candidates: sortedCandidates,
          electedMPs,
          results,
          gangSeats,
          lastFinalized: serverTimestamp()
        });

        // Update gang seats
        for (const [gangId, seats] of Object.entries(gangSeats)) {
          const gangRef = doc(db, 'gangs', gangId);
          transaction.update(gangRef, { 
            seats,
            corruptionOpportunities: seats * 10 
          });
        }
      });
      
      toast.success(t('admin.electionFinalized'));
    } catch (error) {
      console.error('Auto-finalize error:', error);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      const data = doc.data();
      setGovData(data);
      
      if (data?.electionActive && data?.electionEndTime) {
        const endTime = new Date(data.electionEndTime).getTime();
        if (Date.now() > endTime) {
          finalizeElection(data);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });

    let unsubGangs: () => void = () => {};
    if (profile) {
      unsubGangs = onSnapshot(collection(db, 'gangs'), (snapshot) => {
        setGangs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'gangs');
      });
    }

    return () => {
      unsub();
      unsubGangs();
    };
  }, [profile]);

  useEffect(() => {
    if (!govData?.electionActive || !govData?.electionEndTime) {
      setTimeLeft('00:00:00');
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(govData.electionEndTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        clearInterval(timer);
        finalizeElection(govData);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [govData?.electionActive, govData?.electionEndTime]);

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-24 font-sans selection:bg-red-500/30">
      <Modal 
        isOpen={modalConfig.isOpen} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        inputs={modalConfig.inputs}
        onConfirm={modalConfig.onConfirm}
      />
      {/* Sovereign Government Header */}
      <div className="relative h-[30vh] w-full overflow-hidden border-b-4 border-amber-600/20">
        {/* Realistic Background Image/Texture */}
        <div className="absolute inset-0 bg-[#050505]">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-black" />
        </div>
        
        {/* Sovereign Crest / Logo Placeholder */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Landmark size={400} className="text-white" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <span className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.4em]">{t('government.sovereignEntity') || 'كيان سيادي معتمد'}</span>
              <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            </div>
            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-white font-serif italic leading-none">
              {t('government.title')}
            </h1>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] md:text-xs text-zinc-400 font-medium tracking-widest uppercase max-w-md mx-auto leading-relaxed">
                {t('government.desc')}
              </p>
              <div className="flex items-center gap-2 mt-4 px-4 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{t('government.status.operational') || 'النظام قيد التشغيل'}</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative Corner Elements */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-white/10" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/10" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/10" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-white/10" />
      </div>
      
      <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-20">
        {/* Navigation Rail - Redesigned for Sovereign Look */}
        <div className="flex flex-wrap justify-center gap-2 p-2 bg-zinc-950/90 backdrop-blur-2xl rounded-2xl border border-white/10 w-full md:w-fit mx-auto mb-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {[
            { id: 'parliament', icon: Landmark, label: t('government.tabs.parliament') },
            { id: 'elections', icon: Vote, label: t('government.tabs.elections'), hidden: !govData?.electionActive && profile?.role !== 'Admin' },
            { id: 'office', icon: Gavel, label: t('government.tabs.office') },
            { id: 'documents', icon: FileText, label: t('government.tabs.documents') },
            { id: 'constitution', icon: Shield, label: t('government.constitution.title') },
          ].filter(tab => !tab.hidden).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase transition-all relative overflow-hidden group ${
                activeTab === tab.id 
                  ? 'bg-amber-600 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-amber-500"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon size={14} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            {activeTab === 'parliament' && <ParliamentSection govData={govData} profile={profile} gangs={gangs} />}
            {activeTab === 'elections' && (
          <PoliticsSection 
            govData={govData} 
            profile={profile} 
            gangs={gangs} 
            timeLeft={timeLeft} 
            setModalConfig={setModalConfig}
            activeElectionTab={activeElectionTab}
            setActiveElectionTab={setActiveElectionTab}
          />
        )}
            {activeTab === 'office' && <OfficeSection profile={profile} govData={govData} />}
            {activeTab === 'documents' && <DocumentsSection profile={profile} />}
            {activeTab === 'constitution' && (
              <ConstitutionSection 
                constitution={constitution} 
                profile={profile} 
                addArticle={addArticle} 
                seedConstitution={seedConstitution} 
                certifyArticle={certifyArticle} 
                editArticle={editArticle} 
                deleteArticle={deleteArticle} 
                voteArticle={voteArticle} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}



function DocumentsSection({ profile }: { profile: any }) {
  const { t, i18n } = useTranslation();
  const [newName, setNewName] = useState('');
  const [newDocNumber, setNewDocNumber] = useState('');

  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    if (!country) return t('government.documents.unknownEntity');
    return i18n.language === 'ar' ? country.nameAr : country.name;
  };

  const documents = [
    { 
      id: 'idCard', 
      title: t('police.documents.idCard'), 
      desc: t('police.documents.desc'), 
      price: 0,
      header: 'بطاقة الهوية الوطنية / NATIONAL ID',
      subHeader: 'بطاقة الهوية الوطنية',
      color: 'from-blue-700 to-blue-900',
      icon: User
    },
    { 
      id: 'passport', 
      title: t('police.documents.passport'), 
      desc: t('police.documents.desc'), 
      price: 50000, 
      header: 'جواز سفر / PASSPORT',
      subHeader: 'جواز سفر',
      color: 'from-emerald-900 to-emerald-950',
      icon: Globe
    },
    { 
      id: 'driverLicense', 
      title: t('police.documents.driverLicense'), 
      desc: t('police.documents.desc'), 
      price: 25000, 
      header: 'رخصة القيادة / DRIVING LICENCE',
      subHeader: 'رخصة القيادة',
      color: 'from-pink-700 to-pink-900',
      icon: Car
    },
    { 
      id: 'weaponLicense', 
      title: t('police.documents.weaponLicense'), 
      desc: t('police.documents.desc'), 
      price: 100000, 
      header: 'تصريح حمل سلاح / FIREARMS PERMIT',
      subHeader: 'تصريح حمل سلاح',
      color: 'from-zinc-900 to-black',
      icon: Shield
    },
    { 
      id: 'clearance', 
      title: 'براءة ذمة', 
      desc: 'شهادة تثبت خلو سجلك من أي التزامات قانونية.', 
      price: 15000, 
      header: 'براءة ذمة / CLEARANCE CERTIFICATE',
      subHeader: 'براءة ذمة',
      color: 'from-amber-700 to-amber-900',
      icon: FileText
    },
  ];

  const handleBribe = async (type: 'name' | 'docNumber') => {
    const cost = 1000000;
    if ((profile?.cleanMoney || 0) < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    if (type === 'name' && !newName) {
      toast.error(t('government.documents.enterName'));
      return;
    }
    if (type === 'docNumber' && !newDocNumber) {
      toast.error(t('government.documents.enterNumber'));
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < cost) {
          throw new Error('Insufficient funds');
        }

        const updateData: any = {
          cleanMoney: increment(-cost),
        };
        if (type === 'name') updateData.displayName = newName;
        if (type === 'docNumber') updateData.docNumber = newDocNumber;

        transaction.update(userRef, updateData);
      });
      
      toast.success(t('government.documents.bribeSuccess'));
      setNewName('');
      setNewDocNumber('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handlePurchase = async (docId: string, price: number) => {
    if (docId === 'idCard') {
      try {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          [`documents.${docId}`]: true,
          reputation: increment(100)
        });
        toast.success(t('government.documents.purchaseSuccess'));
      } catch (error: any) {
        console.error(error);
        toast.error(t('common.failed'));
      }
      return;
    }

    if ((profile?.cleanMoney || 0) < price) {
      toast.error(t('common.noMoney'));
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < price) {
          throw new Error('Insufficient funds');
        }

        transaction.update(userRef, {
          cleanMoney: increment(-price),
          [`documents.${docId}`]: true,
          reputation: increment(500)
        });
      });
      
      toast.success(t('government.documents.purchaseSuccess'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    }
  };

  return (
    <div className="space-y-12">
      {/* Sovereign Document Center Header - Redesigned */}
      <div className="relative p-6 md:p-12 bg-zinc-950 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-amber-600/5" />
        
        {/* Sovereign Stamp Background */}
        <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-[0.03] rotate-12 pointer-events-none">
          <Landmark size={200} />
        </div>

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-2xl text-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.2)]">
              <ShieldCheck size={32} />
            </div>
            <div className="text-center md:text-start">
              <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter font-serif italic">
                {t('government.documents.title')}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                <div className="w-6 h-0.5 bg-amber-500/50 rounded-full" />
                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black">
                  {t('government.documents.archive')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
            <div className="text-center">
              <p className="text-[7px] text-zinc-500 uppercase tracking-widest font-black mb-1">{t('government.documents.yourDocs')}</p>
              <p className="text-xl font-black text-white">{Object.keys(profile?.documents || {}).length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-[7px] text-zinc-500 uppercase tracking-widest font-black mb-1">{t('government.documents.available')}</p>
              <p className="text-xl font-black text-white">{documents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid - Mobile Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {documents.map((doc, index) => {
          const isOwned = profile?.documents?.[doc.id];
          
          return (
            <motion.div 
              key={doc.id} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              {/* Folder Tab Effect */}
              <div className="absolute -top-4 left-8 w-32 h-8 bg-zinc-800 border-t border-x border-white/10 rounded-t-xl flex items-center justify-center">
                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.2em]">REF: {doc.id.toUpperCase()}-00{index + 1}</span>
              </div>

              {/* Security Aura */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-amber-600/10 via-transparent to-blue-600/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl group-hover:border-amber-500/30 transition-all duration-500">
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
                
                {/* Sovereign Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none rotate-[-35deg]">
                  <Landmark size={300} />
                </div>

                {/* Official Stamps */}
                <div className="absolute top-12 right-6 rotate-12 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity z-20">
                  <div className="border-4 border-amber-600 rounded-full p-3 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter leading-none">ARCHIVE</span>
                    <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter">CENTRAL</span>
                  </div>
                </div>

                {/* Document Container */}
                <div className="p-2 md:p-4">
                  <div className="relative rounded-2xl overflow-hidden shadow-inner bg-black/20 p-1">
                    <OfficialDocument 
                      doc={doc} 
                      profile={profile} 
                      getCountryName={getCountryName} 
                    />
                  </div>
                </div>

                {/* Controls & Metadata */}
                <div className="p-6 md:p-8 bg-gradient-to-t from-black/80 to-transparent border-t border-white/5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${doc.color} shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                        <h4 className="text-xl font-black text-white uppercase tracking-tight font-serif italic">{doc.title}</h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
                          <Shield size={10} className="text-zinc-500" />
                          <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">SEC-LEVEL: 04</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
                          <FileText size={10} className="text-zinc-500" />
                          <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">TYPE: OFFICIAL</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed max-w-[280px] font-medium">{doc.desc}</p>
                    </div>
                    
                    <div className="w-full sm:w-auto flex flex-col gap-2">
                      <button 
                        onClick={() => handlePurchase(doc.id, doc.price)}
                        disabled={isOwned}
                        className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 ${
                          isOwned
                            ? "bg-green-500/10 text-green-500 border border-green-500/20 cursor-default"
                            : "bg-amber-600 text-black hover:bg-amber-500 shadow-[0_15px_30px_rgba(217,119,6,0.2)]"
                        }`}
                      >
                        {isOwned ? (
                          <>
                            <ShieldCheck size={14} />
                            <span>{t('common.owned')}</span>
                          </>
                        ) : (
                          <span>{doc.price === 0 ? t('common.free') : formatMoney(doc.price)}</span>
                        )}
                      </button>
                      {!isOwned && (
                        <p className="text-[7px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                          {t('government.documents.legalNotice') || 'تخضع هذه الوثيقة للقوانين السيادية'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Identity Corruption (Bribes) - Redesigned for "Sovereign Underground" Look */}
      <div className="relative p-8 md:p-16 bg-[#080808] border border-red-900/30 rounded-[3rem] overflow-hidden shadow-2xl">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/5 blur-[100px] -ml-48 -mb-48" />
        
        {/* Security Scanlines & Grid */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/5 to-transparent" />

        {/* Classified Stamp Overlay */}
        <div className="absolute top-10 right-10 rotate-[-15deg] opacity-10 pointer-events-none select-none">
          <div className="border-8 border-red-600 px-8 py-4 rounded-xl">
            <span className="text-4xl font-black text-red-600 uppercase tracking-[0.2em] font-serif italic">CLASSIFIED</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-start">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-red-600/10 border border-red-500/20 rounded-2xl text-red-500 shadow-[0_0_40px_rgba(220,38,38,0.2)]">
                <ShieldAlert size={40} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter font-serif italic">
                  {t('government.documents.identityReset.title')}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em]">
                    {t('government.documents.undergroundService')}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-2xl font-medium">
              {t('government.documents.bribeDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-black mb-1">{t('government.documents.status')}</p>
                <p className="text-xs font-bold text-red-500 uppercase">{t('government.documents.encryptedActive')}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-black mb-1">{t('government.documents.riskLevel')}</p>
                  <p className="text-xs font-bold text-amber-500 uppercase">{t('government.documents.highTraceable')}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[450px] space-y-8">
            {/* Name Change Form */}
            <div className="relative space-y-4 p-6 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl group/form overflow-hidden">
              {/* Background Stamp */}
              <div className="absolute -bottom-4 -right-4 opacity-[0.03] rotate-12 pointer-events-none group-hover/form:opacity-10 transition-opacity">
                <ShieldAlert size={120} />
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('government.documents.updateFullName')}</span>
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t('government.documents.cost')}</span>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  placeholder={t('government.documents.enterNewName')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors font-mono"
                />
              </div>
              <button 
                onClick={() => handleBribe('name')}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_20px_rgba(220,38,38,0.2)]"
              >
                {t('government.documents.bribeName')}
              </button>
            </div>

            {/* ID Change Form */}
            <div className="relative space-y-4 p-6 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl group/form overflow-hidden">
              {/* Background Stamp */}
              <div className="absolute -bottom-4 -right-4 opacity-[0.03] rotate-12 pointer-events-none group-hover/form:opacity-10 transition-opacity">
                <FileX size={120} />
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('government.documents.updateNationalId')}</span>
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t('government.documents.cost')}</span>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  placeholder={t('government.documents.enterNewId')}
                  value={newDocNumber}
                  onChange={(e) => setNewDocNumber(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors font-mono"
                />
              </div>
              <button 
                onClick={() => handleBribe('docNumber')}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_20px_rgba(220,38,38,0.2)]"
              >
                {t('government.documents.bribeId')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstitutionSection({ 
  constitution, 
  profile, 
  addArticle, 
  seedConstitution, 
  certifyArticle, 
  editArticle, 
  deleteArticle, 
  voteArticle 
}: any) {
  const { t } = useTranslation();

  return (
    <div className="space-y-16">
      {/* Constitution Archive Header */}
      <div className="relative p-6 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,119,6,0.15),transparent_70%)]" />
        <div className="absolute -top-32 -end-32 w-[200px] h-[200px] bg-amber-600/5 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Decorative Lines */}
        <div className="absolute top-0 start-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="absolute bottom-0 start-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600/10 border border-amber-500/20 rounded-lg text-amber-500 shadow-lg">
              <Shield size={20} />
            </div>
            <div className="text-center lg:text-start space-y-0.5">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight italic font-serif leading-none">{t('government.constitution.title')}</h2>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <div className="w-6 h-0.5 bg-amber-500/50 rounded-full" />
                <p className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] font-black">{t('government.constitution.principles')}</p>
              </div>
            </div>
          </div>
          
          {profile && (
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={seedConstitution}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                {t('government.constitution.populate')}
              </button>
              <button 
                onClick={addArticle}
                className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                {t('government.constitution.addArticle')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {constitution.map((article: any, index: number) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            key={article.id} 
            className={`relative group p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${
              article.status === 'approved' 
                ? 'bg-green-950/10 border-green-900/30' 
                : article.status === 'rejected' 
                  ? 'bg-red-950/10 border-red-900/30' 
                  : 'bg-zinc-900/40 border-white/10 hover:border-amber-500/30'
            }`}
          >
            <div className="relative z-10 flex flex-col lg:flex-row gap-4">
              {/* Article Number & Status */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-serif text-lg font-black shadow-lg ${
                  article.status === 'approved' ? 'bg-green-900/40 text-green-400 border border-green-500/30' :
                  article.status === 'rejected' ? 'bg-red-900/40 text-red-400 border border-red-500/30' :
                  'bg-amber-900/40 text-amber-400 border border-amber-500/30'
                }`}>
                  {index + 1}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] border ${
                  article.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                  article.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {t(`government.constitution.${article.status === 'pending' ? 'voting' : article.status}`)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black text-white font-serif tracking-tight">{article.title}</h3>
                    <div className="h-0.5 w-8 bg-amber-600/30 rounded-full" />
                  </div>
                  
                  {profile && (
                    <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                      {article.status === 'pending' && (
                        <button 
                          onClick={() => certifyArticle(article.id, article.votesFor, article.votesAgainst)} 
                          className="px-2 py-1 hover:bg-green-500/20 rounded-md text-[8px] font-black text-green-400 uppercase tracking-widest transition-all"
                        >
                          {t('government.constitution.finalize')}
                        </button>
                      )}
                      <button 
                        onClick={() => editArticle(article.id, article.title, article.content)} 
                        className="px-2 py-1 hover:bg-blue-500/20 rounded-md text-[8px] font-black text-blue-400 uppercase tracking-widest transition-all"
                      >
                        {t('government.constitution.edit')}
                      </button>
                      <button 
                        onClick={() => deleteArticle(article.id)} 
                        className="px-2 py-1 hover:bg-red-500/20 rounded-md text-[8px] font-black text-red-400 uppercase tracking-widest transition-all"
                      >
                        {t('government.constitution.delete')}
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-zinc-400 leading-relaxed text-xs font-serif italic">
                  "{article.content}"
                </p>

                {/* Voting Section */}
                {article.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <div className="space-y-0">
                        <span className="text-[8px] text-zinc-600 uppercase tracking-[0.1em] font-black">{t('government.constitution.supporter')}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-green-500" />
                          <span className="text-lg font-black text-white tabular-nums">{article.votesFor || 0}</span>
                        </div>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="space-y-0">
                        <span className="text-[8px] text-zinc-600 uppercase tracking-[0.1em] font-black">{t('government.constitution.opponent')}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                          <span className="text-lg font-black text-white tabular-nums">{article.votesAgainst || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 w-full sm:w-auto">
                      <button 
                        onClick={() => voteArticle(article.id, 'for')} 
                        className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                      >
                        {t('government.constitution.agree')}
                      </button>
                      <button 
                        onClick={() => voteArticle(article.id, 'against')} 
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                      >
                        {t('government.constitution.disagree')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        {constitution.length === 0 && (
          <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-white/10 rounded-2xl">
            <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-4 opacity-20" />
            <p className="text-zinc-600 font-serif text-lg italic">{t('government.constitution.noArticles')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PoliticsSection({ 
  govData, 
  profile, 
  gangs, 
  timeLeft, 
  setModalConfig,
  activeElectionTab,
  setActiveElectionTab
}: { 
  govData: any, 
  profile: any, 
  gangs: any[], 
  timeLeft: string, 
  setModalConfig: any,
  activeElectionTab: 'parliament' | 'prime-minister',
  setActiveElectionTab: (tab: 'parliament' | 'prime-minister') => void
}) {
  const { t } = useTranslation();
  const [votesToBuy, setVotesToBuy] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const votePrice = 50000;
  const MAX_SEATS = 329;

  const isSpeaker = govData?.results?.speakerId === profile?.uid;
  const isMP = govData?.candidates?.some((c: any) => c.uid === profile?.uid && c.seats > 0);

  const launchElection = async () => {
    setModalConfig({
      isOpen: true,
      title: t('politics.startElectionTitle'),
      message: t('politics.startElectionConfirm'),
      onConfirm: async () => {
        try {
          const govRef = doc(db, 'government', 'current');
          await updateDoc(govRef, {
            electionActive: true,
            electionEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            candidates: [],
            gangSeats: {},
            gangVotes: {},
            gangInfluence: {},
            speakerId: null,
            deputy1Id: null,
            deputy2Id: null
          });
          toast.success(t('politics.startElectionSuccess'));
        } catch (error: any) {
          console.error(error);
          toast.error(error.message || t('politics.startElectionError'));
        }
      }
    });
  };

  const handleStartPMElection = async () => {
    if (!isSpeaker && profile?.role !== 'Admin') return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        'pmElection.isActive': true,
        'pmElection.candidates': [],
        'pmElection.startTime': new Date().toISOString()
      });
      toast.success(t('government.pm.electionStarted') || 'تم بدء انتخابات رئاسة الوزراء');
    } catch (error) {
      toast.error(t('government.pm.electionStartedFailed') || 'فشل بدء الانتخابات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNominatePM = async () => {
    if (!profile || !govData?.pmElection?.isActive) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        'pmElection.candidates': arrayUnion({
          uid: profile.uid,
          name: profile.displayName,
          photoURL: profile.photoURL,
          votes: 0,
          voters: []
        })
      });
      toast.success(t('government.pm.nominateSuccess') || 'تم الترشح بنجاح');
    } catch (error) {
      toast.error(t('government.pm.nominateFailed') || 'فشل الترشح');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVotePM = async (candidateUid: string) => {
    if (!profile || !isMP || !govData?.pmElection?.isActive) {
      if (!isMP) toast.error(t('government.pm.onlyMPsCanVote') || 'فقط النواب يمكنهم التصويت');
      return;
    }
    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const govRef = doc(db, 'government', 'current');
        const govDoc = await transaction.get(govRef);
        if (!govDoc.exists()) return;

        const data = govDoc.data();
        const candidates = [...(data.pmElection?.candidates || [])];
        const candidateIndex = candidates.findIndex(c => c.uid === candidateUid);
        
        if (candidateIndex === -1) return;

        // Remove previous vote if any
        candidates.forEach(c => {
          if (c.voters?.includes(profile.uid)) {
            c.voters = c.voters.filter((v: string) => v !== profile.uid);
            c.votes = c.voters.length;
          }
        });

        // Add new vote
        if (!candidates[candidateIndex].voters) candidates[candidateIndex].voters = [];
        candidates[candidateIndex].voters.push(profile.uid);
        candidates[candidateIndex].votes = candidates[candidateIndex].voters.length;

        transaction.update(govRef, { 'pmElection.candidates': candidates });
      });
      toast.success(t('government.pm.voteSuccess') || 'تم التصويت بنجاح');
    } catch (error) {
      toast.error(t('government.pm.voteFailed') || 'فشل التصويت');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizePMElection = async () => {
    if (!isSpeaker && profile?.role !== 'Admin') return;
    if (!govData?.pmElection?.candidates?.length) return;
    setIsSubmitting(true);
    try {
      const winner = [...govData.pmElection.candidates].sort((a, b) => b.votes - a.votes)[0];
      await updateDoc(doc(db, 'government', 'current'), {
        primeMinisterId: winner.uid,
        'pmElection.isActive': false,
        'pmElection.lastWinner': winner.name,
        'pmElection.candidates': []
      });
      
      // Add notification
      await updateDoc(doc(db, 'system', 'notifications'), {
        messages: arrayUnion({
          type: 'pm_election',
          text: `تم انتخاب ${winner.name} رئيساً للوزراء`,
          timestamp: new Date().toISOString()
        })
      });

      // Add Facebook post for PM appointment
      await addDoc(collection(db, 'news_posts'), {
        title: 'عاجل: انتخاب رئيس وزراء جديد',
        content: `تم رسمياً انتخاب اللاعب (${winner.name}) في منصب رئيس الوزراء. نتمنى له التوفيق في مهامه الجديدة لخدمة الوطن.`,
        type: 'news',
        timestamp: serverTimestamp(),
        image: 'https://picsum.photos/seed/pm/400/300'
      });

      toast.success(t('government.pm.finalizeSuccess') || 'تم اعتماد النتيجة بنجاح');
    } catch (error) {
      toast.error(t('government.pm.finalizeFailed') || 'فشل اعتماد النتيجة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const seatMap = React.useMemo(() => {
    const map: (string | null)[] = [];
    const isElectionActive = govData?.electionActive;

    if (isElectionActive && govData?.gangVotes) {
      // Show projected seats during election
      const sortedGangsByVotes = Object.entries(govData.gangVotes)
        .sort(([, a], [, b]) => (b as number) - (a as number));

      sortedGangsByVotes.forEach(([gangId, votes]) => {
        const projectedSeats = Math.floor((votes as number) / 1000);
        for (let i = 0; i < projectedSeats; i++) {
          if (map.length < MAX_SEATS) map.push(gangId);
        }
      });
    } else if (govData?.gangSeats) {
      // Sort gangs by seat count for a cleaner map
      const sortedGangs = Object.entries(govData.gangSeats)
        .sort(([, a], [, b]) => (b as number) - (a as number));

      sortedGangs.forEach(([gangId, count]) => {
        for (let i = 0; i < (count as number); i++) {
          if (map.length < MAX_SEATS) map.push(gangId);
        }
      });
    }
    while (map.length < MAX_SEATS) map.push(null);
    return map;
  }, [govData?.gangSeats, govData?.gangVotes, govData?.electionActive]);

  const gangLeaderboard = React.useMemo(() => {
    const colors = [
      'bg-red-600', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 
      'bg-amber-600', 'bg-pink-600', 'bg-cyan-600', 'bg-orange-600',
      'bg-indigo-600', 'bg-rose-600', 'bg-lime-600', 'bg-teal-600'
    ];
    const isElectionActive = govData?.electionActive;

    // Stable color mapping based on gang ID
    const getGangColor = (id: string, index: number) => {
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    return gangs.map((gang, idx) => {
      const seats = govData?.gangSeats?.[gang.id] || 0;
      const votes = govData?.gangVotes?.[gang.id] || 0;
      const extraInfluence = govData?.gangInfluence?.[gang.id] || 0;
      
      // 1000 votes = 1 seat
      const currentSeats = isElectionActive ? Math.floor(votes / 1000) : seats;
      
      // User wants 1 seat = 1% influence
      const influence = currentSeats + extraInfluence;
      
      const color = getGangColor(gang.id, idx);
      return { ...gang, seats: currentSeats, votes, influence, color };
    }).sort((a, b) => b.influence - a.influence || b.seats - a.seats || b.votes - a.votes);
  }, [gangs, govData]);

  const getSeatColor = (gangId: string | null) => {
    if (!gangId) return 'bg-zinc-900/50 border-white/5';
    const gang = gangLeaderboard.find(g => g.id === gangId);
    if (!gang) return 'bg-zinc-700 border-zinc-600';
    
    const colorMap: Record<string, string> = {
      'bg-red-600': 'bg-red-600 border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]',
      'bg-blue-600': 'bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]',
      'bg-emerald-600': 'bg-emerald-600 border-emerald-500 shadow-[0_0_10px_rgba(5,150,105,0.3)]',
      'bg-purple-600': 'bg-purple-600 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]',
      'bg-amber-600': 'bg-amber-600 border-amber-500 shadow-[0_0_10px_rgba(217,119,6,0.3)]',
      'bg-pink-600': 'bg-pink-600 border-pink-500 shadow-[0_0_10px_rgba(219,39,119,0.3)]',
      'bg-cyan-600': 'bg-cyan-600 border-cyan-500 shadow-[0_0_10px_rgba(8,145,178,0.3)]',
      'bg-orange-600': 'bg-orange-600 border-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.3)]',
      'bg-indigo-600': 'bg-indigo-600 border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.3)]',
      'bg-rose-600': 'bg-rose-600 border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.3)]',
      'bg-lime-600': 'bg-lime-600 border-lime-500 shadow-[0_0_10px_rgba(101,163,13,0.3)]',
      'bg-teal-600': 'bg-teal-600 border-teal-500 shadow-[0_0_10px_rgba(13,148,136,0.3)]',
    };
    
    return colorMap[gang.color] || 'bg-zinc-700 border-zinc-600';
  };

  const handleBuyVotes = async () => {
    if (isSubmitting) return;
    if (!profile?.uid || !profile?.gangId) {
      toast.error(t('common.failed'));
      return;
    }

    const totalCost = votesToBuy * votePrice;
    if ((profile?.cleanMoney || 0) < totalCost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const govRef = doc(db, 'government', 'current');

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < totalCost) {
          throw new Error('Insufficient funds');
        }

        transaction.update(userRef, {
          cleanMoney: increment(-totalCost)
        });

        transaction.update(govRef, {
          [`gangVotes.${profile.gangId}`]: increment(votesToBuy)
        });
      });

      toast.success(t('government.politics.buySuccess'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuySeat = async () => {
    if (isSubmitting) return;
    if (!profile?.uid || !profile?.gangId) {
      toast.error(t('common.failed'));
      return;
    }

    const cost = 50000000; // 50 million
    if ((profile?.cleanMoney || 0) < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const govRef = doc(db, 'government', 'current');

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < cost) {
          throw new Error('Insufficient funds');
        }

        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};
        
        const currentVotes = govData.gangVotes || {};
        const newVotes = (currentVotes[profile.gangId] || 0) + 1000;

        const currentSeats = govData.gangSeats || {};
        const newSeats = (currentSeats[profile.gangId] || 0) + 1;

        const currentInfluence = govData.gangInfluence || {};
        const newInfluence = (currentInfluence[profile.gangId] || 0) + 1;

        transaction.update(userRef, {
          cleanMoney: increment(-cost)
        });

        const updateData: any = {
          [`gangVotes.${profile.gangId}`]: newVotes,
          [`gangSeats.${profile.gangId}`]: newSeats,
          [`gangInfluence.${profile.gangId}`]: newInfluence
        };

        // Also update candidate if they exist
        const candidates = govData.candidates || [];
        const candidateIndex = candidates.findIndex((c: any) => c.uid === profile.uid);
        if (candidateIndex !== -1) {
          const updatedCandidates = [...candidates];
          updatedCandidates[candidateIndex] = {
            ...updatedCandidates[candidateIndex],
            seats: (updatedCandidates[candidateIndex].seats || 0) + 1,
            votes: (updatedCandidates[candidateIndex].votes || 0) + 1000
          };
          updateData.candidates = updatedCandidates;
        }

        transaction.update(govRef, updateData);
      });

      toast.success(t('politics.buySeatSuccess'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNominate = async () => {
    if (isSubmitting) return;
    
    if (!profile?.uid) {
      toast.error(t('politics.mustLoginToNominate'));
      return;
    }

    if (!profile?.gangId) {
      toast.error(t('politics.mustBeInGangToNominate'));
      return;
    }

    const nominationFee = 1000000;
    if ((profile?.cleanMoney || 0) < nominationFee) {
      toast.error(t('politics.insufficientNominationFee', { fee: nominationFee.toLocaleString() }));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const govRef = doc(db, 'government', 'current');

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < nominationFee) {
          throw new Error(t('politics.insufficientNominationFee', { fee: nominationFee.toLocaleString() }));
        }

        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};

        if (!govData.electionActive) {
          throw new Error(t('politics.noActiveElection'));
        }

        const candidates = govData.candidates || [];
        if (candidates.some((c: any) => c.uid === profile.uid)) {
          throw new Error(t('politics.alreadyNominated'));
        }

        const newCandidate = {
          uid: profile.uid,
          displayName: profile.displayName || profile.nickname || 'Unknown',
          gangId: profile.gangId || '',
          votes: 0
        };

        transaction.update(userRef, {
          cleanMoney: increment(-nominationFee)
        });

        transaction.update(govRef, {
          candidates: arrayUnion(newCandidate)
        });
      });

      toast.success(t('government.politics.nominationSuccess'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteForCandidate = async (candidateUid: string) => {
    if (isSubmitting) return;
    if (!profile?.uid) {
      toast.error(t('common.failed'));
      return;
    }

    // Check if user is in a gang (parliament member)
    if (!profile?.gangId) {
      toast.error(t('politics.mustBeInGangToVote'));
      return;
    }

    setIsSubmitting(true);
    try {
      const govRef = doc(db, 'government', 'current');
      
      await runTransaction(db, async (transaction) => {
        const govDoc = await transaction.get(govRef);
        if (!govDoc.exists()) throw new Error('Government data not found');
        
        const govData = govDoc.data();
        if (!govData.electionActive) throw new Error(t('politics.noActiveElection'));
        
        const candidates = govData.candidates || [];
        const candidateIndex = candidates.findIndex((c: any) => c.uid === candidateUid);
        
        if (candidateIndex === -1) throw new Error('Candidate not found');
        
        // Check if user already voted in this election
        const userVotes = govData.userVotes || {};
        if (userVotes[profile.uid]) {
          throw new Error(t('politics.alreadyVotedInElection'));
        }

        const updatedCandidates = [...candidates];
        updatedCandidates[candidateIndex] = {
          ...updatedCandidates[candidateIndex],
          votes: (updatedCandidates[candidateIndex].votes || 0) + 1
        };

        transaction.update(govRef, {
          candidates: updatedCandidates,
          [`userVotes.${profile.uid}`]: candidateUid
        });
      });

      toast.success(t('politics.voteSuccess'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCandidate = govData?.candidates?.some((c: any) => c.uid === profile?.uid);
  const hasVoted = govData?.userVotes?.[profile?.uid];
  const isElectedMP = govData?.candidates?.some((c: any) => c.uid === profile?.uid && c.seats > 0);

  // Check if election is active and visible to the user
  const isElectionVisible = govData?.electionActive || profile?.role === 'Admin';

  return (
    <div className="space-y-16">
      {/* Election Tab Switcher */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setActiveElectionTab('parliament')}
          className={clsx(
            "px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border",
            activeElectionTab === 'parliament'
              ? "bg-red-600 text-white border-red-500 shadow-[0_10px_30px_rgba(220,38,38,0.3)]"
              : "bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/10"
          )}
        >
          {t('government.politics.parliamentElections') || 'انتخابات البرلمان'}
        </button>
        <button
          onClick={() => setActiveElectionTab('prime-minister')}
          className={clsx(
            "px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border",
            activeElectionTab === 'prime-minister'
              ? "bg-amber-600 text-white border-amber-500 shadow-[0_10px_30px_rgba(217,119,6,0.3)]"
              : "bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/10"
          )}
        >
          {t('government.politics.pmElections') || 'انتخابات رئاسة الوزراء'}
        </button>
      </div>

      {activeElectionTab === 'parliament' ? (
        <>
          {/* Grand Hall Header */}
          {isElectionVisible && (
        <div className="relative h-64 rounded-[2.5rem] overflow-hidden border-2 sm:border-4 border-[#c5a059]/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
          <img 
            src="https://picsum.photos/seed/parliament/1200/600?grayscale&blur=2" 
            alt="Parliament Hall" 
            className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-[2000ms]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          
          <OfficialStamp text="SOVEREIGN" color="red" rotation="-15deg" className="top-6 end-12 opacity-30" />
          <OfficialStamp text="CLASSIFIED" color="blue" rotation="10deg" className="bottom-12 start-1/3 opacity-10" />

          <div className="absolute bottom-8 start-8 end-8 flex flex-col lg:flex-row justify-between items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
              {govData?.electionActive ? (
                <div className="px-3 py-1 bg-red-600/10 border border-red-500/20 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.3em]">{t('government.politics.sessionActive')}</span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-zinc-600/10 border border-zinc-500/20 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">{t('government.politics.sessionInactive')}</span>
                </div>
              )}
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t('government.politics.sovereignElections')}</span>
                </div>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{t('government.politics.title')}</h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">{t('government.politics.desc')}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {govData?.electionActive && (
                <div className="px-6 py-3 bg-red-600/10 backdrop-blur-xl border border-red-600/20 rounded-xl text-end animate-pulse shadow-2xl">
                  <p className="text-[9px] text-red-500 uppercase tracking-[0.2em] mb-0.5 font-black">{t('government.politics.electionCountdown')}</p>
                  <p className="text-2xl font-black text-white font-mono tracking-tighter">{timeLeft}</p>
                </div>
              )}
              <div className="px-6 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl text-end shadow-2xl">
                <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] mb-0.5 font-black">{t('government.politics.seats')}</p>
                <p className="text-2xl font-black text-white tracking-tighter">{(Object.values(govData?.gangSeats || {}) as number[]).reduce((a, b) => a + b, 0)} <span className="text-lg text-zinc-500">/ {MAX_SEATS}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Parliament Visualization */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 bg-[#1a1a1a] border-2 sm:border-4 border-[#c5a059]/30 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
            <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
            
            <OfficialStamp text="PARLIAMENT" color="blue" rotation="-5deg" className="top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 text-4xl" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Users size={12} />
                {t('government.politics.parliamentGrid')}
              </h3>
            <div className="flex flex-wrap gap-3">
              {gangLeaderboard.filter(g => g.seats > 0).slice(0, 3).map((gang, idx) => (
                <div key={gang.id} className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${gang.color}`} />
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest">
                    {idx === 0 ? t('government.parliament.speaker') : idx === 1 ? t('government.parliament.deputy1') : t('government.parliament.deputy2')}
                  </span>
                </div>
              ))}
            </div>
            </div>

            <div className="relative w-full aspect-square md:aspect-[16/9] flex items-end justify-center overflow-hidden pt-6 perspective-[1000px]">
              {/* Parliament Floor Effect */}
              <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-zinc-900/40 to-transparent [transform:rotateX(60deg)] origin-bottom scale-[2] md:scale-150" />
              
              {/* Speaker's Podium */}
              <div className="absolute bottom-4 md:bottom-6 start-1/2 -translate-x-1/2 w-12 md:w-16 h-8 md:h-10 bg-gradient-to-b from-zinc-800 to-black border border-white/10 rounded-t-lg flex items-center justify-center z-20 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <div className="w-1 md:w-1 h-2 md:h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
              </div>

              <div className="relative w-full h-full max-w-full md:max-w-2xl mx-auto z-10">
                {seatMap.map((gangId, i) => {
                  const totalSeats = 329;
                  const rows = 12;
                  const seatsPerRowBase = Math.floor(totalSeats / rows);
                  
                  // Distribute seats in rows with increasing radius
                  let row = 0;
                  let seatsInPrevRows = 0;
                  for (let r = 0; r < rows; r++) {
                    const seatsInThisRow = seatsPerRowBase + r * 2;
                    if (i < seatsInPrevRows + seatsInThisRow) {
                      row = r;
                      break;
                    }
                    seatsInPrevRows += seatsInThisRow;
                    row = r;
                  }
                  
                  const col = i - seatsInPrevRows;
                  const seatsInThisRow = seatsPerRowBase + row * 2;
                  
                  // Calculate polar coordinates
                  const radius = 30 + row * 5; // Radius in percentage
                  const angleRange = 160; // 160 degrees semi-circle
                  const startAngle = 180 - (180 - angleRange) / 2;
                  const endAngle = (180 - angleRange) / 2;
                  
                  const angle = startAngle - (col / (seatsInThisRow - 1 || 1)) * angleRange;
                  const rad = (angle * Math.PI) / 180;
                  
                  const x = 50 + radius * Math.cos(rad);
                  const y = 95 - radius * Math.sin(rad);
                  
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.001 }}
                      style={{
                        position: 'absolute',
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`w-1 md:w-1 h-1 md:h-1 rounded-full border transition-all duration-500 ${getSeatColor(gangId)}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

        {/* Influence Leaderboard */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-[#1a1a1a] border-2 border-[#c5a059]/20 rounded-2xl space-y-4 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
            <h3 className="text-[10px] font-black text-[#c5a059] uppercase tracking-[0.3em] flex items-center gap-2 relative z-10">
              <TrendingUp size={12} />
              {t('government.politics.influenceLeaderboard')}
            </h3>

            <div className="space-y-3 relative z-10">
              {gangLeaderboard.slice(0, 5).map((gang, idx) => (
                <div key={gang.id} className="space-y-1">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-700">0{idx + 1}</span>
                      <span className="text-xs font-bold text-white">{gang.name}</span>
                    </div>
                    <span className="text-[9px] font-black text-red-600">{gang.seats} {t('government.politics.seats')}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(gang.influence, 100)}%` }}
                      className={`h-full ${gang.color} shadow-[0_0_5px_rgba(255,255,255,0.1)]`}
                    />
                  </div>
                  <div className="flex justify-between text-[7px] uppercase tracking-widest text-zinc-600">
                    <span>{t('government.politics.votes')}: {formatNumber(gang.votes)}</span>
                    <span>{gang.influence.toFixed(1)}% {t('government.politics.influence')}</span>
                  </div>
                </div>
              ))}
            </div>
            <OfficialStamp text="CONFIDENTIAL" color="red" rotation="15deg" className="bottom-4 end-4 opacity-10 text-xs" />
          </div>
        </div>

        {/* Candidates List */}
        <div className="lg:col-span-12 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t('government.politics.candidatesList')}</h3>
            <div className="px-3 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-zinc-400 uppercase tracking-widest">
              {govData?.candidates?.length || 0} {t('government.politics.nominees')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {govData?.electionActive ? (
              govData?.candidates?.map((candidate: any) => {
                const gang = gangs.find(g => g.id === candidate.gangId);
                return (
                  <div key={candidate.uid} className="bg-[#1a1a1a] border border-[#c5a059]/20 rounded-xl p-3 flex items-center justify-between group hover:border-[#c5a059]/50 transition-all relative overflow-hidden shadow-lg">
                    <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 bg-black/40 rounded-lg overflow-hidden border border-[#c5a059]/20 shadow-inner">
                        {candidate.photoURL ? (
                          <img src={candidate.photoURL} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-zinc-600 m-auto mt-2" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white" style={{ color: gang?.color }}>{candidate.name}</h4>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: gang?.color || '#52525b' }} />
                          <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: gang?.color }}>{gang?.name || t('government.parliament.independent')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-end relative z-10">
                      <div className="text-xs font-black text-white">{formatNumber(candidate.votes || 0)}</div>
                      <div className="text-[8px] text-zinc-600 uppercase tracking-widest">{t('government.politics.votes')}</div>
                      {profile?.gangId && !hasVoted && (
                        <button 
                          onClick={() => handleVoteForCandidate(candidate.uid)}
                          className="mt-1 px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[8px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-600/20"
                        >
                          {t('politics.vote')}
                        </button>
                      )}
                      {hasVoted === candidate.uid && (
                        <div className="mt-1 px-2 py-0.5 bg-green-600/20 text-green-500 rounded-md text-[8px] font-black uppercase tracking-widest border border-green-600/30">
                          {t('politics.voted')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 bg-[#1a1a1a] border-2 border-dashed border-[#c5a059]/20 rounded-[3rem] text-center space-y-4 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                <OfficialStamp text="CLOSED" color="red" rotation="-15deg" className="top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 text-6xl" />
                <div className="w-16 h-16 bg-black/40 rounded-2xl flex items-center justify-center mx-auto border border-[#c5a059]/20 shadow-xl relative z-10">
                  <Vote size={24} className="text-[#c5a059]" />
                </div>
                <div className="space-y-1 relative z-10">
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter italic">{t('politics.noElection')}</h4>
                  <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed">{t('politics.noElectionDesc')}</p>
                  {profile?.role === 'Admin' && (
                    <button 
                      onClick={launchElection}
                      className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-[0_20px_40px_rgba(220,38,38,0.2)]"
                    >
                      {t('politics.launchElections')}
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {govData?.electionActive && (!govData?.candidates || govData.candidates.length === 0) && (
              <div className="col-span-full text-center py-12 bg-zinc-900/20 border border-dashed border-white/5 rounded-2xl text-zinc-600 italic">
                {t('government.politics.noCandidates')}
              </div>
            )}
          </div>
        </div>

          {/* Stats Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-8 bg-[#1a1a1a] border-2 border-[#c5a059]/20 rounded-[2.5rem] group hover:border-red-600/20 transition-colors sm:col-span-1 relative overflow-hidden shadow-xl">
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-red-600/10 rounded-xl">
                    <Vote className="text-red-600" size={20} />
                  </div>
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{t('common.live')}</span>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{t('government.politics.electionCountdown')}</p>
                <p className="text-3xl font-black text-white tabular-nums">{timeLeft}</p>
              </div>
            </div>
            <div className="p-8 bg-[#1a1a1a] border-2 border-[#c5a059]/20 rounded-[2.5rem] group hover:border-blue-600/20 transition-colors col-span-1 sm:col-span-2 relative overflow-hidden shadow-xl">
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-600/10 rounded-xl">
                    <TrendingUp className="text-blue-600" size={20} />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('government.parliament.budgetAllocation')}</span>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">{t('government.politics.stateBudget')}</p>
                <div className="space-y-4">
                  {[
                    { label: t('government.politics.military'), value: 45, color: 'bg-red-600' },
                    { label: t('government.politics.infrastructure'), value: 25, color: 'bg-blue-600' },
                    { label: t('government.politics.socialServices'), value: 15, color: 'bg-green-600' },
                    { label: t('government.politics.corruption'), value: 15, color: 'bg-yellow-600' }
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-[9px] uppercase tracking-widest font-black">
                        <span className="text-zinc-500">{item.label}</span>
                        <span className="text-white">{item.value}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          className={`h-full ${item.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Lobbying & Candidacy */}
        <div className="lg:col-span-4 space-y-8">
          {/* Candidacy Section */}
          {govData?.electionActive && (
            <div className="p-10 bg-[#1a1a1a] border-2 border-[#c5a059]/30 rounded-[3rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
              <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c5a059]/50 to-transparent" />
              
              <OfficialStamp text="NOMINATION" color="blue" rotation="-12deg" className="top-4 end-4 opacity-10 text-xs" />

              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="p-3 bg-[#c5a059]/10 rounded-2xl text-[#c5a059] group-hover:scale-110 transition-transform">
                  <Vote size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight italic">{t('government.politics.nomination')}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">{t('government.politics.electionActive')}</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{t('government.politics.nominationFee')}</span>
                    <span className="text-[#c5a059] font-black">$1,000,000</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {t('government.politics.nominationDesc')}
                  </p>
                </div>

                <button 
                  onClick={handleNominate}
                  disabled={isSubmitting || isCandidate}
                  className={`w-full py-5 ${isCandidate ? 'bg-green-600/20 text-green-500 border border-green-600/30' : 'bg-[#c5a059] hover:bg-[#b08d4a] text-black'} disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-[#c5a059]/20 transition-all active:scale-[0.98]`}
                >
                  {isCandidate ? t('government.politics.alreadyCandidate') : t('government.politics.nominateNow')}
                </button>
              </div>
            </div>
          )}

          {/* Lobbying Desk */}
          <div className="sticky top-8 p-10 bg-[#1a1a1a] border-2 border-[#c5a059]/30 rounded-[3rem] space-y-10 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
            <div className="absolute top-0 end-0 p-10 opacity-5">
              <Landmark size={120} />
            </div>
            
            <OfficialStamp text="LOBBYING" color="red" rotation="10deg" className="bottom-12 start-8 opacity-10 text-sm" />

            <div className="relative z-10">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">{t('government.politics.lobbyingDesk')}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">{t('government.politics.lobbyingDesc')}</p>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{t('government.politics.votesToBuy')}</span>
                  <span className="text-4xl font-black text-white">{votesToBuy}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={votesToBuy} 
                  onChange={(e) => setVotesToBuy(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#c5a059]"
                />
              </div>

              <div className="p-8 bg-black/50 rounded-3xl border border-white/5 flex justify-between items-center shadow-inner">
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">{t('common.confirm')}</p>
                  <p className="text-2xl font-black text-green-500">{formatMoney(votesToBuy * votePrice)}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <DollarSign className="text-green-500" size={20} />
                </div>
              </div>

              <button 
                onClick={handleBuyVotes}
                disabled={isSubmitting}
                className="w-full group relative overflow-hidden bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {t('government.politics.buyVotes')}
              </button>

              <div className="pt-4 border-t border-white/5">
                <button 
                  onClick={handleBuySeat}
                  disabled={isSubmitting}
                  className="w-full group relative overflow-hidden bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {t('politics.buySeat')} ($50,000,000)
                </button>
                <p className="text-center text-[10px] text-zinc-500 mt-2">{t('politics.buySeatDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
        <div className="space-y-12">
          {/* PM Election Header */}
          <div className="relative h-64 rounded-[2rem] overflow-hidden border-2 sm:border-4 border-[#c5a059]/30 group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
            <img 
              src="https://picsum.photos/seed/pmoffice/1200/600?grayscale&blur=2" 
              alt="PM Office" 
              className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-[2000ms]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            
            <OfficialStamp text="EXECUTIVE" color="blue" rotation="12deg" className="top-8 end-12 opacity-30" />
            <OfficialStamp text="PRIME MINISTER" color="red" rotation="-10deg" className="bottom-10 start-1/4 opacity-10" />

            <div className="absolute bottom-8 start-8 end-8 flex flex-col lg:flex-row justify-between items-end gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {govData?.pmElection?.isActive ? (
                    <div className="px-3 py-1 bg-amber-600/10 border border-amber-500/20 rounded-full flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse shadow-[0_0_10px_rgba(217,119,6,0.5)]" />
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.3em]">{t('government.politics.sessionActive')}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-zinc-600/10 border border-zinc-500/20 rounded-full flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">{t('government.politics.sessionInactive')}</span>
                    </div>
                  )}
                  <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t('government.politics.pmElections')}</span>
                  </div>
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{t('government.politics.pmTitle')}</h2>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">{t('government.politics.pmDesc')}</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {govData?.pmElection?.isActive && (isSpeaker || profile?.role === 'Admin') && (
                  <button 
                    onClick={handleFinalizePMElection} 
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-[0_20px_40px_rgba(22,163,74,0.2)] active:scale-95"
                  >
                    {t('politics.finalizePMElections')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Candidates List */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{t('government.politics.candidatesList')}</h3>
                <div className="px-3 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  {govData?.pmElection?.candidates?.length || 0} {t('government.politics.nominees')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {govData?.pmElection?.isActive ? (
                  govData.pmElection.candidates.map((candidate: any) => {
                    const hasVotedForThis = candidate.voters?.includes(profile?.uid);
                    return (
                      <div key={candidate.uid} className="bg-zinc-900/30 border border-white/10 rounded-2xl p-6 flex items-center justify-between group hover:border-amber-500/30 transition-all shadow-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-800 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                            {candidate.photoURL ? (
                              <img src={candidate.photoURL} alt={candidate.name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={32} className="text-zinc-600 m-auto mt-4" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-white">{candidate.name}</h4>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('government.politics.candidate')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-end space-y-2">
                          <div className="text-2xl font-black text-white tabular-nums">{candidate.votes || 0}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">{t('government.politics.votes')}</div>
                          {isMP && (
                            <button 
                              onClick={() => handleVotePM(candidate.uid)}
                              disabled={isSubmitting || hasVotedForThis}
                              className={clsx(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                hasVotedForThis 
                                  ? "bg-green-600/20 text-green-500 border border-green-500/20"
                                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
                              )}
                            >
                              {hasVotedForThis ? t('politics.voted') : t('politics.vote')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 bg-zinc-900/20 border border-dashed border-white/5 rounded-3xl text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto border border-white/5 shadow-xl">
                      <Crown size={24} className="text-zinc-600" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter italic">{t('politics.noPMElection') || 'لا توجد انتخابات رئاسة وزراء حالية'}</h4>
                      <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed">{t('politics.noPMElectionDesc') || 'يجب على رئيس البرلمان بدء الدورة الانتخابية.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nomination Section */}
            <div className="lg:col-span-4 space-y-8">
              {govData?.pmElection?.isActive && (
                <div className="p-10 bg-zinc-900/30 border border-amber-600/20 rounded-[3rem] relative overflow-hidden group">
                  <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-amber-600/10 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                      <Star size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight italic">{t('government.politics.nomination')}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">{t('government.politics.electionActive')}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {t('government.politics.pmNominationDesc') || 'يمكن لأي مواطن الترشح لمنصب رئيس الوزراء، ولكن التصويت مقتصر على أعضاء البرلمان.'}
                      </p>
                    </div>

                    <button 
                      onClick={handleNominatePM}
                      disabled={isSubmitting || govData?.pmElection?.candidates?.some((c: any) => c.uid === profile?.uid)}
                      className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98]"
                    >
                      {govData?.pmElection?.candidates?.some((c: any) => c.uid === profile?.uid) ? t('government.politics.alreadyCandidate') : t('government.politics.nominateNow')}
                    </button>
                  </div>
                </div>
              )}

              {/* Last Winner Info */}
              {govData?.pmElection?.lastWinner && (
                <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] text-center space-y-4">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black">{t('government.politics.lastWinner') || 'الفائز السابق'}</p>
                  <div className="w-20 h-20 bg-amber-600/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_30px_rgba(217,119,6,0.1)]">
                    <Crown size={32} className="text-amber-500" />
                  </div>
                  <h4 className="text-2xl font-black text-white tracking-tighter italic">{govData.pmElection.lastWinner}</h4>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function OfficeSection({ profile, govData }: { profile: any, govData: any }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  
  const candidates = govData?.candidates || [];
  const myCandidateData = candidates.find((c: any) => c.uid === profile?.uid && c.seats > 0);
  const isMP = !!myCandidateData;
  const isPM = govData?.primeMinisterId === profile?.uid;
  const isMinister = !!profile?.ministerRole;

  const members = candidates.filter((c: any) => c.seats && c.seats > 0).sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
  const speaker = members.find(m => m.uid === govData?.results?.speakerId) || members[0];
  const deputy1 = members.find(m => m.uid === govData?.results?.deputy1Id) || members[1];
  const deputy2 = members.find(m => m.uid === govData?.results?.deputy2Id) || members[2];

  useEffect(() => {
    const fetchProfiles = async () => {
      const profiles: Record<string, any> = {};
      const uids = members.map(m => m.uid);
      
      for (const uid of uids) {
        try {
          const userDoc = await getDoc(doc(db, 'users_public', uid));
          if (userDoc.exists()) {
            profiles[uid] = userDoc.data();
          }
        } catch (error) {
          console.error('Error fetching member profile:', error);
        }
      }
      setMemberProfiles(profiles);
    };

    if (members.length > 0) {
      fetchProfiles();
    }
  }, [members.length]);

  const getMemberData = (member: any) => {
    if (!member) return {};
    const p = memberProfiles[member.uid];
    return {
      ...member,
      name: p?.displayName || p?.name || member.displayName || member.name || '-',
      photoURL: p?.photoURL || member.photoURL
    };
  };

  const presidency = [
    { ...getMemberData(speaker), roleKey: 'speaker', icon: Crown, color: 'text-amber-500', borderColor: 'border-amber-500' },
    { ...getMemberData(deputy1), roleKey: 'deputy1', icon: Shield, color: 'text-blue-500', borderColor: 'border-blue-500' },
    { ...getMemberData(deputy2), roleKey: 'deputy2', icon: Shield, color: 'text-emerald-500', borderColor: 'border-emerald-500' },
  ];

  let myPosition = 'MP';
  if (profile?.uid === speaker?.uid) myPosition = 'Speaker';
  else if (profile?.uid === deputy1?.uid) myPosition = 'Deputy1';
  else if (profile?.uid === deputy2?.uid) myPosition = 'Deputy2';

  const getCorruptionBonus = () => {
    const financeInfluence = govData?.committees?.finance?.influence || 0;
    const interiorInfluence = govData?.committees?.interior?.influence || 0;
    const bonus = (financeInfluence / 100) + (interiorInfluence / 200);
    return 1 + bonus;
  };

  const [dailyActions, setDailyActions] = useState<{ corruption: number, budget: number, lastReset: string }>({ corruption: 0, budget: 0, lastReset: new Date().toDateString() });
  const [pendingLaws, setPendingLaws] = useState<any[]>([]);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    if (dailyActions.lastReset !== today) {
      setDailyActions({ corruption: 0, budget: 0, lastReset: today });
    }
  }, [dailyActions.lastReset]);

  useEffect(() => {
    if (['Speaker', 'Deputy1', 'Deputy2'].includes(myPosition)) {
      const q = query(collection(db, 'constitution'), where('status', '==', 'pending'));
      const unsub = onSnapshot(q, (snapshot) => {
        setPendingLaws(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'constitution (pending)');
      });
      return () => unsub();
    }
  }, [myPosition]);

  const grantImmunity = async () => {
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        immunity: 'diamond',
        immunityExpires: 'permanent'
      });
      // Send humorous message
      await addDoc(collection(db, 'messages'), {
        senderId: 'system',
        senderName: t('politics.councilName'),
        receiverId: profile.uid,
        content: t('government.office.immunityMessage'),
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });
      toast.success(t('government.office.immunitySuccess'));
    } catch (error) {
      console.error(error);
    }
  };

  const awardSalary = async () => {
    let salary = 500000; 
    if (isPM) salary = 1000000;
    else if (isMinister) salary = 800000;
    
    const source = isMinister ? t('politics.pm') : t('politics.parliament'); 

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        cleanMoney: increment(salary),
        lastSalaryClaim: new Date().toISOString()
      });
      // Send humorous message
      await addDoc(collection(db, 'messages'), {
        senderId: 'system',
        senderName: source,
        receiverId: profile.uid,
        content: t('government.office.salaryMessage', { source }),
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });
      toast.success(t('government.office.salarySuccess', { amount: formatMoney(salary) }));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!profile || !govData) return;
    
    // Immunity logic
    if ((isMP || isMinister || isPM) && profile.immunity !== 'diamond') {
      grantImmunity();
    }
    
    // Salary logic
    const lastClaim = profile?.lastSalaryClaim ? new Date(profile.lastSalaryClaim) : new Date(0);
    const now = new Date();
    if ((isMP || isMinister || isPM) && lastClaim.toDateString() !== now.toDateString()) {
      awardSalary();
    }
  }, [profile?.uid, govData?.primeMinisterId, isMP, isMinister, isPM]);


  const handleLaunchElections = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const govRef = doc(db, 'government', 'current');
        transaction.update(govRef, {
          electionActive: true,
          electionEndTime: serverTimestamp(),
          candidates: [],
          gangSeats: {},
          gangVotes: {},
          gangInfluence: {}
        });
        // Note: Clearing immunity for all users requires a collection group query or batch update, 
        // which might be too heavy for a transaction. 
        // We will rely on the police/jail logic to check if electionActive is true.
      });
      toast.success(t('politics.startElectionSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('politics.startElectionError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCertifyLaw = async (id: string, votesFor: number, votesAgainst: number) => {
    if (isSubmitting) return;
    const isHighRank = ['Speaker', 'Deputy1', 'Deputy2'].includes(myPosition);
    if (!isHighRank) return;

    setIsSubmitting(true);
    try {
      const status = votesFor > votesAgainst ? 'active' : 'rejected';
      await updateDoc(doc(db, 'constitution', id), { status });
      if (status === 'active') {
        toast.success('عاشت ايدك، القانون تمشى والكل راضي!');
      } else {
        toast.error('القانون انرفض، المعارضة وكفولنا عظم بلبلعوم!');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorruptionDeal = async () => {
    if (isSubmitting) return;
    if (!isMP || !profile.gangId) return;
    if (dailyActions.corruption >= 4) {
      toast.error(t('government.office.maxCorruption'));
      return;
    }
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const gangRef = doc(db, 'gangs', profile.gangId);
      const baseProfit = Math.floor(Math.random() * 500000) + 100000;
      const bonus = getCorruptionBonus();
      const dealProfit = Math.floor(baseProfit * bonus);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const gangDoc = await transaction.get(gangRef);
        if (!userDoc.exists() || !gangDoc.exists()) throw new Error('Data not found');
        
        const currentOpps = gangDoc.data().corruptionOpportunities || 0;
        if (currentOpps <= 0) throw new Error('No corruption opportunities left');

        transaction.update(userRef, {
          dirtyMoney: increment(dealProfit),
          totalCorruptionProfit: increment(dealProfit)
        });
        transaction.update(gangRef, {
          corruptionOpportunities: increment(-1)
        });
      });
      
      setDailyActions(prev => ({ ...prev, corruption: prev.corruption + 1 }));
      toast.success(`عاشت ايدك! خمطت ${formatMoney(dealProfit)} والوضع لوز.`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message === 'No corruption opportunities left' ? t('government.parliament.noOpps') : t('government.parliament.dealFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBudgetAllocation = async () => {
    if (isSubmitting) return;
    if (!isMP) return;
    if (dailyActions.budget >= 4) {
      toast.error(t('government.office.maxBudget'));
      return;
    }
    const isHighRank = ['Speaker', 'Deputy1', 'Deputy2'].includes(myPosition);
    if (!isHighRank) {
      toast.error(t('common.unauthorized'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const baseAllocation = Math.floor(Math.random() * 2000000) + 500000;
      const bonus = getCorruptionBonus();
      const allocation = Math.floor(baseAllocation * bonus);
      
      await runTransaction(db, async (transaction) => {
        transaction.update(userRef, {
          dirtyMoney: increment(allocation),
          totalCorruptionProfit: increment(allocation)
        });
      });
      
      setDailyActions(prev => ({ ...prev, budget: prev.budget + 1 }));
      toast.success(`تم شفط ${formatMoney(allocation)} من الميزانية، مبروك!`);
    } catch (error: any) {
      console.error(error);
      toast.error(t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgradeInfluence = async () => {
    if (isSubmitting) return;
    if (!isMP) return;
    const cost = 1000000;
    if ((profile?.dirtyMoney || 0) < cost) {
      toast.error(t('common.notEnoughMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');
        const currentDirty = userDoc.data().dirtyMoney || 0;
        if (currentDirty < cost) throw new Error('Not enough dirty money');
        transaction.update(userRef, {
          dirtyMoney: increment(-cost),
          reputation: increment(500)
        });
      });
      toast.success('كبر راسك بالمجلس، الكل صار يحسبلك حساب!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLobbying = async () => {
    if (isSubmitting) return;
    if (!isMP) return;
    const cost = 2500000;
    if ((profile?.cleanMoney || 0) < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const govRef = doc(db, 'government', 'current');
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < cost) {
          throw new Error('Insufficient funds');
        }
        transaction.update(userRef, {
          cleanMoney: increment(-cost),
          reputation: increment(1000)
        });
        if (profile.gangId) {
          transaction.update(govRef, {
            [`gangInfluence.${profile.gangId}`]: increment(5)
          });
        }
      });
      toast.success('الواسطات اشتغلت، نفوذك صعد بالسما!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProposeBill = async () => {
    if (isSubmitting) return;
    if (!isMP) return;
    const cost = 5000000;
    if ((profile?.cleanMoney || 0) < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const govRef = doc(db, 'government', 'current');
      const isSuccess = Math.random() > 0.5;

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < cost) {
          throw new Error('Insufficient funds');
        }

        if (isSuccess) {
          transaction.update(userRef, {
            cleanMoney: increment(-cost),
            reputation: increment(5000)
          });
          if (profile.gangId) {
            transaction.update(govRef, {
              [`gangInfluence.${profile.gangId}`]: increment(5)
            });
          }
        } else {
          transaction.update(userRef, {
            cleanMoney: increment(-cost),
            reputation: increment(-1000)
          });
        }
      });

      if (isSuccess) {
        toast.success('تم رفع القانون، ننتظر البصمة من الريس!');
      } else {
        toast.error('فشل القانون، الجماعة ما وافقوا!');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecurityClearance = async () => {
    if (isSubmitting) return;
    if (!isMP) return;
    const cost = 2000000;
    if ((profile?.dirtyMoney || 0) < cost) {
      toast.error(t('common.notEnoughMoney'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().dirtyMoney || 0) < cost) {
          throw new Error('Insufficient funds');
        }
        transaction.update(userRef, {
          dirtyMoney: increment(-cost),
          wanted: false,
          warrants: false,
          heat: 0
        });
      });
      toast.success('سجلك صار أبيض مثل الثلج، محد يكدر يفتح حلكه!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t('common.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const actions = [
    { 
      id: 'propose_bill', 
      icon: Gavel, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10', 
      border: 'hover:border-purple-500/50', 
      title: 'قانون تفصال', 
      desc: 'مشي قانون يفيد جماعتنا قبل لا يصحون.', 
      onClick: handleProposeBill 
    },
    { 
      id: 'corruption_deal', 
      icon: Briefcase, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10', 
      border: 'hover:border-yellow-500/50', 
      title: 'خمط مرتب', 
      desc: 'صفقة من جوة ليجوة، والكل مستفيد ومحد شاف.', 
      onClick: handleCorruptionDeal 
    },
    { 
      id: 'request_budget', 
      icon: Landmark, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10', 
      border: 'hover:border-blue-500/50', 
      title: 'شفط الميزانية', 
      desc: 'مشاريع وهمية وتبليط شوارع بالورق.', 
      onClick: handleBudgetAllocation 
    },
    { 
      id: 'lobbying', 
      icon: TrendingUp, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10', 
      border: 'hover:border-red-500/50', 
      title: 'شغل الواسطات', 
      desc: 'اتصل بالعرف ومشي المعاملات الواكفة.', 
      onClick: handleLobbying 
    },
    { 
      id: 'upgrade_influence', 
      icon: Zap, 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10', 
      border: 'hover:border-orange-500/50', 
      title: 'تكبير الراس', 
      desc: 'اصرف فلوس حتى يصير الك ثقل بالمجلس.', 
      onClick: handleUpgradeInfluence 
    },
    { 
      id: 'security_clearance', 
      icon: ShieldCheck, 
      color: 'text-green-500', 
      bg: 'bg-green-500/10', 
      border: 'hover:border-green-500/50', 
      title: 'غسل السجل', 
      desc: 'امسح قيودك الجنائية، كأنك طير أبيض.', 
      onClick: handleSecurityClearance 
    },
    ...(profile?.ministerRole ? [{
      id: 'minister_office',
      icon: Crown,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'hover:border-amber-500/50',
      title: 'مكتب الوزير',
      desc: 'إدارة شؤون الوزارة وإرسال الهدايا والمكرمات.',
      onClick: () => navigate('/minister-office')
    }] : []),
  ];

  const getCreatedAtTime = () => {
    return safeToMillis(profile?.createdAt) || Date.now();
  };
  const yearsInService = Math.max(0, Math.floor((Date.now() - getCreatedAtTime()) / (1000 * 60 * 60 * 24 * 30)));

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Executive Desk Header */}
      <div className="relative p-6 sm:p-10 bg-[#1a1a1a] border-2 sm:border-4 border-[#c5a059]/30 rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Wood Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
        
        <div className="absolute top-0 end-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-[#c5a059]/5 blur-[80px] sm:blur-[150px] -me-40 sm:-me-80 -mt-40 sm:-mt-80" />
        <div className="absolute bottom-0 start-0 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-blue-900/10 blur-[60px] sm:blur-[120px] -ms-30 sm:-ms-60 -mb-30 sm:-mb-60" />
        
        {/* Government Seal Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
          <Landmark size={400} className="text-white sm:w-[600px] sm:h-[600px]" />
        </div>

        {/* Official Stamps */}
        <OfficialStamp text="APPROVED" color="blue" rotation="15deg" className="top-10 end-10" />
        <OfficialStamp text="CLASSIFIED" color="red" rotation="-20deg" className="bottom-20 start-1/4" />
        <OfficialStamp text="SOVEREIGN" color="blue" rotation="-5deg" className="top-1/3 end-1/4" />

        <div className="relative flex flex-col lg:flex-row items-center gap-8 sm:gap-16">
          {/* Official Portrait Frame */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-6 bg-gradient-to-b from-[#c5a059]/30 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className={clsx(
              "relative w-48 h-64 sm:w-56 sm:h-72 bg-zinc-800 rounded-2xl overflow-hidden border-[4px] sm:border-[6px] shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all duration-700 group-hover:scale-[1.03]",
              (myPosition === 'Speaker' || myPosition === 'Deputy1' || myPosition === 'Deputy2' || govData?.primeMinisterId === profile?.uid) ? "border-[#c5a059] shadow-[#c5a059]/10" : "border-zinc-700 shadow-black"
            )}>
              <img 
                src={profile?.photoURL || getRealisticAvatar(profile?.uid || '', profile?.gender || 'male', profile?.age || 25)} 
                alt="Official Portrait"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute bottom-4 sm:bottom-6 inset-x-0 text-center">
                <div className="text-[8px] sm:text-[10px] font-black text-[#c5a059] uppercase tracking-[0.4em] drop-shadow-md">
                  {t('government.office.officialPortrait')}
                </div>
              </div>
            </div>
            
            {/* Seal of Office */}
            <div className="absolute -bottom-4 -end-4 sm:-bottom-6 sm:-end-6 w-16 h-16 sm:w-20 sm:h-20 bg-[#c5a059] rounded-full flex items-center justify-center border-[4px] sm:border-[6px] border-[#1a1a1a] shadow-2xl z-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-700">
              <Landmark size={24} className="text-[#1a1a1a] sm:w-[32px] sm:h-[32px]" />
            </div>

            {/* Legislative ID Card (Floating) - Hidden on very small screens */}
            <div className="absolute -top-6 -start-8 sm:-top-8 sm:-start-10 w-28 h-40 sm:w-36 sm:h-48 bg-gradient-to-br from-zinc-100 to-zinc-300 rounded-xl border-2 border-zinc-400 shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-3 sm:p-4 hidden md:flex flex-col justify-between transform -rotate-12 group-hover:rotate-[-4deg] transition-all duration-700 z-30">
              <div className="flex justify-between items-start">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#c5a059] rounded-full flex items-center justify-center shadow-inner">
                  <Landmark size={12} className="text-white sm:w-[16px] sm:h-[16px]" />
                </div>
                <div className="text-[6px] sm:text-[7px] font-black text-zinc-800 uppercase tracking-tighter text-end leading-tight">
                  هوية المجلس<br />التشريعي الوطني
                </div>
              </div>
              <div className="w-full h-20 sm:h-24 bg-zinc-400 rounded-lg overflow-hidden border-2 border-zinc-500 shadow-inner">
                <img 
                  src={profile?.photoURL || getRealisticAvatar(profile?.uid || '', profile?.gender || 'male', profile?.age || 25)} 
                  alt="ID"
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <div className="text-[7px] sm:text-[8px] font-black text-zinc-900 uppercase truncate border-b border-zinc-400 pb-0.5">{profile?.displayName}</div>
                <div className="flex justify-between items-center text-[5px] sm:text-[6px] text-zinc-600 font-mono">
                  <span>الرقم: {profile?.uid?.slice(0, 8)}</span>
                  <span className="text-amber-700 font-black">2026-2027</span>
                </div>
                <div className="flex justify-between items-center pt-0.5 sm:pt-1">
                  <div className="text-[5px] sm:text-[6px] font-black text-amber-600 uppercase tracking-tighter">صالحة لغاية 2027</div>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-zinc-800 rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 text-center lg:text-start space-y-6 sm:space-y-8 w-full">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <div className="px-4 sm:px-6 py-1.5 sm:py-2 bg-[#c5a059]/10 border-2 border-[#c5a059]/30 rounded-full flex items-center gap-2 sm:gap-3 shadow-lg">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#c5a059] animate-pulse shadow-[0_0_12px_rgba(197,160,89,0.8)]" />
                  <span className="text-[10px] sm:text-xs font-black text-[#c5a059] uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                    {govData?.primeMinisterId === profile?.uid ? t('roles.primeMinister') : t(`government.parliament.${myPosition.toLowerCase()}`)}
                  </span>
                </div>
                {profile?.gangId && (
                  <div className="px-4 sm:px-6 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                    <span className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">
                      {t('government.office.district')}: {profile.gangId.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <h3 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#FFD700] tracking-tighter italic leading-none break-words drop-shadow-[0_4px_15px_rgba(255,215,0,0.4)]">
                {profile?.displayName || t('government.office.deputyName')}
              </h3>
              
              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 sm:gap-6">
                <p className="text-zinc-300 text-xs sm:text-base max-w-2xl font-medium leading-relaxed italic opacity-90 border-s-4 border-[#c5a059]/40 ps-4 sm:ps-6 py-1 sm:py-2">
                  "{t('government.office.desc')}"
                </p>
                {/* Official Signature */}
                <div className="flex flex-col items-center gap-1 px-6 sm:px-8 py-2 sm:py-3 border-b-2 border-zinc-700/50 rotate-[-3deg] opacity-70 select-none pointer-events-none bg-white/5 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <PenTool size={14} className="text-[#c5a059] sm:w-[16px] sm:h-[16px]" />
                    <span className="font-serif text-xl sm:text-2xl text-zinc-200 italic tracking-[0.1em] sm:tracking-[0.2em]">
                      {profile?.displayName?.split(' ')[0] || 'رسمي'}
                    </span>
                  </div>
                  <div className="text-[6px] sm:text-[8px] text-zinc-500 uppercase tracking-[0.3em] sm:tracking-[0.5em] font-black">التوقيع الرسمي</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
              <div className="p-3 sm:p-6 bg-black/60 border-2 border-white/5 rounded-2xl sm:rounded-3xl hover:border-[#c5a059]/30 transition-all shadow-xl group">
                <div className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mb-1 sm:mb-2 group-hover:text-[#c5a059] transition-colors">{t('government.office.totalCorruption')}</div>
                <div className="text-base sm:text-2xl font-black text-amber-500 font-mono tracking-tight">
                  {formatMoney(profile?.totalCorruptionProfit || 0)}
                </div>
              </div>
              <div className="p-3 sm:p-6 bg-black/60 border-2 border-white/5 rounded-2xl sm:rounded-3xl hover:border-blue-500/30 transition-all shadow-xl group">
                <div className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mb-1 sm:mb-2 group-hover:text-blue-500 transition-colors">{t('government.office.immunityStatus')}</div>
                <div className={`text-base sm:text-2xl font-black flex items-center gap-1 sm:gap-2 ${profile?.immunity ? 'text-blue-500' : 'text-zinc-700'}`}>
                  {profile?.immunity ? t('government.office.active') : t('government.office.inactive')}
                </div>
              </div>
              <div className="p-3 sm:p-6 bg-black/60 border-2 border-white/5 rounded-2xl sm:rounded-3xl hover:border-purple-500/30 transition-all shadow-xl group">
                <div className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mb-1 sm:mb-2 group-hover:text-purple-500 transition-colors">{t('government.office.politicalInfluence')}</div>
                <div className="text-base sm:text-2xl font-black text-purple-500 font-mono tracking-tight">
                  {formatNumber(profile?.reputation || 0)}
                </div>
              </div>
              <div className="p-3 sm:p-6 bg-black/60 border-2 border-white/5 rounded-2xl sm:rounded-3xl hover:border-emerald-500/30 transition-all shadow-xl group">
                <div className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mb-1 sm:mb-2 group-hover:text-emerald-500 transition-colors">{t('government.office.yearsInService')}</div>
                <div className="text-base sm:text-2xl font-black text-emerald-500 font-mono tracking-tight">
                  {yearsInService} <span className="text-[8px] sm:text-[12px] text-zinc-500">{t('common.months')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 w-full lg:w-72">
          </div>
        </div>
      </div>

      {!isMP ? (
        <div className="relative py-12 sm:py-20 bg-zinc-900/20 border border-dashed border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden">
          <div className="relative text-center max-w-md mx-auto px-6 space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto border border-white/5 shadow-xl">
              <Lock size={20} className="text-zinc-600 sm:w-[24px] sm:h-[24px]" />
            </div>
            <h4 className="text-lg sm:text-xl font-black text-white uppercase tracking-tighter">{t('government.office.noAccess')}</h4>
            <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">{t('government.office.noAccessDesc')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-12">
          {/* Legislative Briefing - New Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-[#c5a059]" size={20} />
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">{t('government.office.recentActions')}</h4>
                </div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">2026/03/31</div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.07] transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 bg-[#c5a059]/10 rounded-lg flex items-center justify-center">
                        <Landmark size={14} className="text-[#c5a059]" />
                      </div>
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">عاجل</span>
                    </div>
                    <h5 className="text-xs font-black text-white mb-2 group-hover:text-[#c5a059] transition-colors">{t(`government.office.news${i}.title`)}</h5>
                    <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-3">{t(`government.office.news${i}.desc`)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Users className="text-[#c5a059]" size={20} />
                <h4 className="text-sm font-black text-white uppercase tracking-widest">رئاسة المجلس</h4>
              </div>
              
              <div className="space-y-3">
                {presidency.map((member, idx) => (
                  <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 hover:bg-white/[0.07] transition-colors">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/10">
                        <img 
                          src={member.photoURL || getRealisticAvatar(member.uid, member.gender || 'male', member.age || 25)} 
                          alt={member.name}
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      <div className={clsx("absolute -bottom-1 -end-1 w-5 h-5 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center bg-zinc-900", member.color)}>
                        <member.icon size={10} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">{t(`government.parliament.${member.roleKey}`)}</div>
                      <div className="text-xs font-black text-white">{member.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={isSubmitting}
                className={`group relative p-4 sm:p-6 bg-zinc-900/40 border border-white/5 ${action.border} rounded-xl sm:rounded-2xl text-start transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl`}
              >
                <div className={`absolute inset-0 ${action.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 ${action.bg} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-500`}>
                    <action.icon className={clsx(action.color, "sm:w-[20px] sm:h-[20px]")} size={16} />
                  </div>
                  <h4 className="text-[10px] sm:text-sm font-black text-white mb-1 uppercase tracking-tight">{action.title}</h4>
                  <p className="text-zinc-500 text-[8px] sm:text-[10px] leading-relaxed line-clamp-2 group-hover:text-zinc-400 transition-colors">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Parliament Directory */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-[2rem] p-5 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 end-0 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer relative z-10" onClick={() => setIsMembersOpen(!isMembersOpen)}>
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Users size={20} className="text-amber-500 md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className="text-lg md:text-2xl font-black text-white italic uppercase tracking-tighter">أعضاء مجلس النواب</h3>
                <p className="text-[8px] md:text-[10px] text-amber-500/80 uppercase tracking-[0.2em] md:tracking-[0.3em] font-black mt-0.5 md:mt-1">الريس والنواب وباقي الاعضاء</p>
              </div>
            </div>
            <button className="sm:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors shrink-0">
              {isMembersOpen ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
            </button>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="px-3 py-1.5 md:px-4 md:py-2 bg-black/40 border border-white/10 rounded-xl flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">{t('government.parliament.totalMembers') || 'إجمالي الأعضاء'}</span>
              <span className="text-xs md:text-sm font-black text-amber-500">{members.length}</span>
            </div>
            <button className="hidden sm:flex p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
              {isMembersOpen ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMembersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden relative z-10"
            >
              <div className="pt-4 md:pt-6 border-t border-white/10 mt-2">
                {/* Presidency Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                  {presidency.map((leader, idx) => (
                    <div key={leader.uid || idx} className="bg-gradient-to-b from-black/60 to-black/20 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-amber-500/30 transition-all relative overflow-hidden">
                      <div className={clsx("absolute top-0 inset-x-0 h-1", leader.borderColor ? leader.borderColor.replace('border-', 'bg-') : 'bg-zinc-700')} />
                      
                      <div className={clsx(
                        "w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 mb-3 shadow-lg group-hover:scale-105 transition-transform mt-2",
                        leader.borderColor || 'border-zinc-700'
                      )}>
                        {leader.photoURL ? (
                          <img src={leader.photoURL} alt={leader.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <User size={24} className="text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-black text-white text-xs md:text-sm mb-1 truncate w-full">{leader.name || '-'}</h4>
                      <div className={clsx("text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5", leader.color)}>
                        <leader.icon size={10} className="md:w-3 md:h-3" />
                        {t(`government.parliament.${leader.roleKey}`)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Other Members Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                  {members.filter(m => !presidency.some(p => p.uid === m.uid)).slice(0, 12).map((member) => {
                    const memberData = getMemberData(member);
                    return (
                    <div key={member.uid} className="bg-black/40 border border-white/5 rounded-xl p-2.5 md:p-3 flex flex-col items-center text-center group hover:border-white/20 hover:bg-zinc-900/60 transition-all">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border border-zinc-700 mb-2 shadow-md group-hover:scale-105 transition-transform">
                        {memberData.photoURL ? (
                          <img src={memberData.photoURL} alt={memberData.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <User size={16} className="text-zinc-600 md:w-5 md:h-5" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-black text-zinc-300 text-[9px] md:text-[10px] mb-1 truncate w-full">{memberData.name}</h4>
                      <div className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                        <Bird size={8} />
                        نائب
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* High Rank: Law Ratification */}
      {isMP && ['Speaker', 'Deputy1', 'Deputy2'].includes(myPosition) && (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 start-0 w-2 h-full bg-gradient-to-b from-red-600 via-red-600/50 to-transparent" />
          <div className="absolute -top-32 -end-32 w-[400px] h-[400px] bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                <Gavel size={32} />
              </div>
              <div>
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">المصادقة على القوانين (البصمة)</h4>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black mt-2">مراسيم تنتظر توقيعك</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-red-600/10 border border-red-600/20 rounded-2xl text-end animate-pulse">
              <p className="text-[10px] text-red-500 uppercase tracking-[0.2em] font-black mb-1">قيد الانتظار</p>
              <p className="text-2xl font-black text-white tracking-tighter">{pendingLaws.length}</p>
            </div>
          </div>
          
          {pendingLaws.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <FileText size={48} className="text-zinc-800 mx-auto mb-4 opacity-20" />
              <p className="text-zinc-600 italic font-serif text-lg">ماكو قوانين حالياً، الساحة فارغة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingLaws.map((law) => (
                <motion.div 
                  key={law.id} 
                  whileHover={{ y: -4 }}
                  className="group p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-red-500/30 transition-all space-y-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 end-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Scale size={64} />
                  </div>
                  
                  <div className="relative space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <FileText size={14} />
                      </div>
                      <h5 className="text-lg font-black text-white italic tracking-tight leading-none">{law.title}</h5>
                    </div>
                    <p className="text-zinc-400 leading-relaxed font-serif italic text-sm line-clamp-3">"{law.content}"</p>
                  </div>

                  <div className="flex justify-between items-end pt-6 border-t border-white/5">
                    <div className="flex gap-6">
                      <div className="space-y-1">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-black">مؤيد (وياك)</div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-xl font-black text-white tabular-nums">{law.votesFor}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-black">معارض (ضدك)</div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="text-xl font-black text-white tabular-nums">{law.votesAgainst}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCertifyLaw(law.id, law.votesFor, law.votesAgainst)}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
                    >
                      بصم ووافق (مشيها)
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParliamentSection({ govData, profile, gangs }: { govData: any, profile: any, gangs: any[] }) {
  const { t } = useTranslation();
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  
  const candidates = govData?.candidates || [];
  const isElectionActive = govData?.electionActive;
  
  // Filter only those who won seats, sort by votes descending
  const members = candidates.filter((c: any) => c.seats && c.seats > 0).sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
  
  const speaker = members.find(m => m.uid === govData?.results?.speakerId) || members[0];
  const deputy1 = members.find(m => m.uid === govData?.results?.deputy1Id) || members[1];
  const deputy2 = members.find(m => m.uid === govData?.results?.deputy2Id) || members[2];
  
  const presidencyIds = [speaker?.uid, deputy1?.uid, deputy2?.uid].filter(Boolean);
  const otherMembers = members.filter(m => !presidencyIds.includes(m.uid));

  useEffect(() => {
    const fetchProfiles = async () => {
      const profiles: Record<string, any> = {};
      const uids = members.map(m => m.uid);
      
      for (const uid of uids) {
        try {
          const userDoc = await getDoc(doc(db, 'users_public', uid));
          if (userDoc.exists()) {
            profiles[uid] = userDoc.data();
          }
        } catch (error) {
          console.error('Error fetching member profile:', error);
        }
      }
      setMemberProfiles(profiles);
    };

    if (members.length > 0) {
      fetchProfiles();
    }
  }, [members.length]);

  if (isElectionActive) {
    return (
      <div className="text-center py-20">
        <Vote className="mx-auto text-zinc-600 mb-4" size={64} />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">{t('government.parliament.electionInProgress')}</h2>
        <p className="text-zinc-500">{t('government.parliament.electionInProgressDesc')}</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-20">
        <Landmark className="mx-auto text-zinc-600 mb-4" size={64} />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">{t('government.parliament.noResults')}</h2>
        <p className="text-zinc-500">{t('government.parliament.noResultsDesc')}</p>
      </div>
    );
  }

  const getMemberData = (member: any) => {
    if (!member) return { name: '-', photoURL: null };
    const profile = memberProfiles[member.uid];
    return {
      name: profile?.displayName || profile?.name || member.displayName || member.name || '-',
      photoURL: profile?.photoURL || member.photoURL
    };
  };

  const speakerData = getMemberData(speaker);
  const deputy1Data = getMemberData(deputy1);
  const deputy2Data = getMemberData(deputy2);

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Sovereign Header */}
      <div className="relative h-48 md:h-64 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 group shadow-2xl">
        <img 
          src="https://picsum.photos/seed/parliament-hall/1200/600?grayscale&blur=2" 
          alt="Parliament Hall" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-[2000ms]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        
        <div className="absolute bottom-0 start-0 end-0 p-5 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-1 flex items-center gap-3 md:gap-4">
            <div className="p-2.5 md:p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl md:rounded-2xl backdrop-blur-md shrink-0">
              <Building2 className="text-amber-500 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="space-y-0.5 md:space-y-1">
              <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">{t('government.parliament.title')}</h2>
              <p className="text-zinc-400 text-[10px] md:text-xs font-medium">{t('government.parliament.desc')}</p>
            </div>
          </div>
          
          <div className="px-4 py-2 md:px-5 md:py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl text-end shadow-xl self-start sm:self-end shrink-0">
            <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-[0.1em] mb-0.5 font-black">{t('government.parliament.totalMembers') || 'إجمالي الأعضاء'}</p>
            <p className="text-lg md:text-2xl font-black text-white leading-none">{members.length}</p>
          </div>
        </div>
      </div>

      {/* Presidency */}
      <div className="space-y-8 md:space-y-10">
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-transparent to-amber-500/50" />
          <h3 className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.3em] text-center">
            {t('government.parliament.presidency') || 'هيئة الرئاسة'}
          </h3>
          <div className="h-[1px] w-12 md:w-24 bg-gradient-to-l from-transparent to-amber-500/50" />
        </div>
        
        <div className="flex flex-col items-center gap-8 md:gap-10">
          {/* Speaker (Top) */}
          <div className="w-full max-w-sm bg-gradient-to-b from-amber-500/20 to-zinc-900/80 border-2 border-amber-500/30 rounded-[2rem] p-6 md:p-8 text-center relative shadow-[0_20px_40px_rgba(245,158,11,0.15)] group hover:border-amber-500/50 transition-all">
            <div className="absolute -top-10 md:-top-12 start-1/2 -translate-x-1/2 w-20 h-20 md:w-24 md:h-24 bg-zinc-900 border-4 border-amber-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] overflow-hidden group-hover:scale-105 transition-transform">
              {speakerData.photoURL ? (
                <img src={speakerData.photoURL} alt={speakerData.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={40} className="text-zinc-600" />
              )}
            </div>
            <h4 className="text-xl md:text-2xl font-black text-amber-500 mt-10 md:mt-12 mb-1 tracking-tighter italic">{speakerData.name}</h4>
            <p className="text-[10px] md:text-xs text-amber-500/80 uppercase tracking-[0.3em] font-black mb-4 flex items-center justify-center gap-2">
              <Crown size={14} />
              {t('government.parliament.speaker')}
            </p>
            <div className="inline-block px-4 py-1.5 md:px-6 md:py-2 bg-amber-500 text-black rounded-xl text-xs md:text-sm font-black shadow-lg">
              {speaker?.seats || 0} {t('government.parliament.seats')}
            </div>
          </div>

          {/* Deputies (Bottom Row) */}
          <div className="w-full grid grid-cols-2 gap-4 md:gap-8 max-w-3xl">
            {/* Deputy 1 */}
            <div className="bg-zinc-900/60 border border-blue-500/20 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-center relative group hover:border-blue-500/40 transition-all shadow-lg mt-6 md:mt-8">
              <div className="absolute -top-8 start-1/2 -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 bg-zinc-900 border-2 border-blue-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.2)] group-hover:scale-105 transition-transform">
                {deputy1Data.photoURL ? (
                  <img src={deputy1Data.photoURL} alt={deputy1Data.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={32} className="text-zinc-600" />
                )}
              </div>
              <h4 className="text-sm md:text-xl font-black text-white mt-8 md:mt-10 tracking-tighter italic truncate">{deputy1Data.name}</h4>
              <p className="text-[8px] md:text-[10px] text-blue-400 uppercase tracking-[0.2em] mb-3 md:mb-4 font-black flex items-center justify-center gap-1 md:gap-1.5">
                <Shield size={10} />
                {t('government.parliament.deputy1')}
              </p>
              <div className="inline-block px-3 py-1 md:px-4 md:py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] md:text-xs font-black text-blue-400">
                {deputy1?.seats || 0} {t('government.parliament.seats')}
              </div>
            </div>

            {/* Deputy 2 */}
            <div className="bg-zinc-900/60 border border-emerald-500/20 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-center relative group hover:border-emerald-500/40 transition-all shadow-lg mt-6 md:mt-8">
              <div className="absolute -top-8 start-1/2 -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 bg-zinc-900 border-2 border-emerald-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover:scale-105 transition-transform">
                {deputy2Data.photoURL ? (
                  <img src={deputy2Data.photoURL} alt={deputy2Data.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={32} className="text-zinc-600" />
                )}
              </div>
              <h4 className="text-sm md:text-xl font-black text-white mt-8 md:mt-10 tracking-tighter italic truncate">{deputy2Data.name}</h4>
              <p className="text-[8px] md:text-[10px] text-emerald-400 uppercase tracking-[0.2em] mb-3 md:mb-4 font-black flex items-center justify-center gap-1 md:gap-1.5">
                <Shield size={10} />
                {t('government.parliament.deputy2')}
              </p>
              <div className="inline-block px-3 py-1 md:px-4 md:py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] md:text-xs font-black text-emerald-400">
                {deputy2?.seats || 0} {t('government.parliament.seats')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Members */}
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-transparent to-zinc-700" />
          <h3 className="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-[0.3em] text-center">
            {t('government.parliament.members')}
          </h3>
          <div className="h-[1px] w-12 md:w-24 bg-gradient-to-l from-transparent to-zinc-700" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {otherMembers.map((member: any) => {
            const gang = gangs.find(g => g.id === member.gangId);
            const data = getMemberData(member);
            return (
              <div key={member.uid} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 md:p-4 flex items-center justify-between group hover:bg-zinc-800/60 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                    {data.photoURL ? (
                      <img src={data.photoURL} alt={data.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={20} className="text-zinc-600 m-auto mt-3 md:mt-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-zinc-200 text-sm md:text-base truncate">{data.name}</h4>
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <Bird size={10} className="text-zinc-500" />
                      {t('government.parliament.member') || 'نائب'}
                    </p>
                    <p className="text-[8px] md:text-[9px] text-zinc-500 truncate mt-0.5" style={{ color: gang?.color }}>{gang?.name || t('government.parliament.independent')}</p>
                  </div>
                </div>
                <div className="text-end shrink-0 ms-2">
                  <div className="text-base md:text-lg font-black text-white">{member.seats}</div>
                  <div className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-widest">{t('government.parliament.seats')}</div>
                </div>
              </div>
            );
          })}
          
          {otherMembers.length === 0 && (
            <div className="col-span-full text-center py-12 bg-zinc-900/20 border border-white/5 rounded-3xl">
              <Users className="mx-auto text-zinc-700 mb-3" size={32} />
              <p className="text-zinc-500 text-sm font-medium">{t('government.parliament.noOtherMembers')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
