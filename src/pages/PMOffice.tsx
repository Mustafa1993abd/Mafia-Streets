import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  runTransaction, 
  query, 
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Crown, 
  Users, 
  Briefcase, 
  Shield, 
  Vote, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  UserMinus, 
  DollarSign, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Gavel, 
  Ban,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  Star,
  Zap,
  Target,
  Globe,
  Landmark,
  ShieldAlert,
  Coins,
  History as HistoryIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { safeFetch, getRealisticAvatar } from '../lib/utils';

export default function PMOffice() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [govData, setGovData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'nomination' | 'cabinet' | 'office' | 'monitoring'>('nomination');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetUser, setTargetUser] = useState<string>('');
  const [selectedTargetUser, setSelectedTargetUser] = useState<any>(null);
  const [selectedAppointUser, setSelectedAppointUser] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [confirmAction, setConfirmAction] = useState<{actionId: string, userId: string | null} | null>(null);
  const [ministryLogs, setMinistryLogs] = useState<any[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  const [selectedRoleForBudget, setSelectedRoleForBudget] = useState<string | null>(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState<number>(10000000);

  const handleAllocateBudget = async () => {
    if (!selectedRoleForBudget || newBudgetAmount < 0) return;
    setIsAllocating(true);
    try {
      const data = await safeFetch(`/api/government/allocate-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pmId: profile?.uid,
          roleId: selectedRoleForBudget,
          amount: newBudgetAmount
        })
      });
      if (data.success) {
        toast.success('تم تخصيص الميزانية بنجاح');
        setSelectedRoleForBudget(null);
      } else {
        toast.error(data.error || 'فشل تخصيص الميزانية');
      }
    } catch (error: any) {
      toast.error(error.message || 'خطأ في الاتصال');
    } finally {
      setIsAllocating(false);
    }
  };

  useEffect(() => {
    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists()) setGovData(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });

    // Fetch players once instead of listening to all updates
    getDocs(collection(db, 'users_public')).then(snapshot => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }).catch(error => {
      console.error("Failed to fetch players", error);
    });

    const logsQuery = query(
      collection(db, 'ministry_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setMinistryLogs(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ministry_logs');
    });

    return () => {
      unsubGov();
      unsubLogs();
    };
  }, []);

  const isMP = govData?.electedMPs?.some((m: any) => m.uid === profile?.uid);
  const isSpeaker = govData?.results?.speakerId === profile?.uid;
  const isPM = govData?.primeMinisterId === profile?.uid;

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

  const handleStartElection = async () => {
    if (!isSpeaker) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        'pmElection.isActive': true,
        'pmElection.candidates': [],
        'pmElection.startTime': new Date().toISOString()
      });
      toast.success(t('government.pm.electionStarted'));
    } catch (error) {
      toast.error(t('government.pm.electionStartedFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNominate = async () => {
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
      toast.success(t('government.pm.nominateSuccess'));
    } catch (error) {
      toast.error(t('government.pm.nominateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (candidateUid: string) => {
    if (!profile || !isMP || !govData?.pmElection?.isActive) {
      if (!isMP) toast.error(t('government.pm.onlyMPsCanVote'));
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
      toast.success(t('government.pm.voteSuccess'));
    } catch (error) {
      toast.error(t('government.pm.voteFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeElection = async () => {
    if (!isSpeaker || !govData?.pmElection?.candidates?.length) return;
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

      toast.success(t('government.pm.finalizeSuccess'));
    } catch (error) {
      toast.error(t('government.pm.finalizeFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppointMinister = async (role: string, userId: string) => {
    if (!isPM) return;
    const user = players.find(p => p.id === userId);
    if (!user) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const govRef = doc(db, 'government', 'current');
        const userRef = doc(db, 'users', userId);
        
        transaction.update(govRef, {
          [`cabinet.${role}`]: {
            uid: userId,
            name: user.displayName,
            photoURL: user.photoURL
          }
        });

        transaction.update(userRef, { 
          ministerRole: role,
          immunity: 'diamond',
          immunityExpires: 'permanent'
        });

        // Send humorous message from PM
        const msgRef = doc(collection(db, 'messages'));
        transaction.set(msgRef, {
          senderId: profile?.uid,
          senderName: profile?.displayName || t('politics.pm'),
          receiverId: userId,
          content: t('government.office.immunityMessage'),
          type: 'system',
          read: false,
          timestamp: serverTimestamp()
        });

        // Add Facebook post for Minister appointment
        const roleTitle = ministerRoles.find(r => r.id === role)?.title || role;
        const newsRef = doc(collection(db, 'news_posts'));
        transaction.set(newsRef, {
          title: `عاجل: تعيين وزير جديد`,
          content: `تم رسمياً تعيين اللاعب (${user.displayName}) في منصب ${roleTitle}. نتمنى له التوفيق في مهامه الجديدة.`,
          type: 'news',
          timestamp: serverTimestamp(),
          image: user.photoURL || 'https://picsum.photos/seed/minister/400/300'
        });
      });
      const roleTitle = ministerRoles.find(r => r.id === role)?.title || role;
      toast.success(t('government.pm.appointSuccess', { ministerName: user.displayName, role: roleTitle }));
    } catch (error) {
      console.error('Appoint Minister Error:', error);
      toast.error(t('government.pm.appointFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecutiveAction = async (actionId: string, userId: string | null) => {
    if (!isPM) return;
    setIsSubmitting(true);
    try {
      switch (actionId) {
        case 'corruption':
          if (!userId) throw new Error('يجب تحديد هدف');
          await updateDoc(doc(db, 'users', userId), {
            bankBalance: increment(100000)
          });
          toast.success('تم تحويل 100,000$ إلى حساب المواطن');
          break;
        case 'pardon':
          if (!userId) throw new Error('يجب تحديد هدف');
          await updateDoc(doc(db, 'users', userId), {
            isImprisoned: false,
            jailTimeEnd: null
          });
          await updateDoc(doc(db, 'users_public', userId), {
            isImprisoned: false,
            jailTimeEnd: null
          });
          toast.success('تم إصدار عفو رئاسي وإطلاق سراح المواطن');
          break;
        case 'jail':
          if (!userId) throw new Error('يجب تحديد هدف');
          await updateDoc(doc(db, 'users', userId), {
            isImprisoned: true,
            jailTimeEnd: Date.now() + 24 * 60 * 60 * 1000
          });
          await updateDoc(doc(db, 'users_public', userId), {
            isImprisoned: true,
            jailTimeEnd: Date.now() + 24 * 60 * 60 * 1000
          });
          toast.success('تم إصدار أمر اعتقال وسجن المواطن');
          break;
        case 'freeze':
          if (!userId) throw new Error('يجب تحديد هدف');
          await updateDoc(doc(db, 'users', userId), {
            isBankFrozen: true
          });
          toast.success('تم تجميد حسابات المواطن');
          break;
        case 'martial':
          const newMartialLaw = !govData?.martialLaw;
          await updateDoc(doc(db, 'government', 'current'), {
            martialLaw: newMartialLaw
          });
          toast.success(newMartialLaw ? 'تم إعلان حالة الطوارئ والأحكام العرفية' : 'تم إنهاء حالة الطوارئ والأحكام العرفية');
          break;
        case 'tax':
          const newTaxHoliday = !govData?.taxHoliday;
          await updateDoc(doc(db, 'government', 'current'), {
            taxHoliday: newTaxHoliday
          });
          toast.success(newTaxHoliday ? 'تم إعلان عطلة ضريبية' : 'تم إنهاء العطلة الضريبية');
          break;
        default:
          toast.error('إجراء غير معروف');
      }
    } catch (error) {
      console.error('Executive Action Error:', error);
      toast.error('فشل تنفيذ الإجراء التنفيذي');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCabinet = async () => {
    if (!isPM) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'government', 'current'), { cabinet: {} });
      toast.success(t('government.pm.clearCabinetSuccess'));
    } catch (error) {
      toast.error(t('government.pm.clearCabinetFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlayers = players.filter(p => 
    (p.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (p.id || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  ).slice(0, 5);

  const ministerRoles = [
    { id: 'interior', title: 'وزارة الداخلية', icon: Shield, color: 'text-blue-500' },
    { id: 'defense', title: 'وزارة الدفاع', icon: ShieldAlert, color: 'text-red-500' },
    { id: 'foreign', title: 'وزارة الخارجية', icon: Globe, color: 'text-emerald-500' },
    { id: 'finance', title: 'وزارة المالية', icon: Landmark, color: 'text-amber-500' },
    { id: 'health', title: 'وزارة الصحة', icon: Target, color: 'text-rose-500' },
    { id: 'industry', title: 'وزارة الصناعة', icon: Briefcase, color: 'text-zinc-400' },
    { id: 'oil', title: 'وزارة النفط', icon: Zap, color: 'text-yellow-600' },
    { id: 'electricity', title: 'وزارة الكهرباء', icon: Zap, color: 'text-yellow-400' },
    { id: 'labor', title: 'وزارة العمل', icon: Users, color: 'text-orange-500' },
    { id: 'intelligence', title: 'رئيس المخابرات', icon: Search, color: 'text-purple-500' },
    { id: 'security', title: 'رئيس الأمن', icon: Lock, color: 'text-slate-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 sm:space-y-12 animate-in fade-in duration-700">
      {/* Header Section - Executive Desk Style */}
      <div className="relative bg-[#1a1a1a] rounded-[2rem] sm:rounded-[3.5rem] p-6 sm:p-10 border-2 sm:border-4 border-[#c5a059]/30 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Wood Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
        
        <div className="absolute top-0 end-0 w-64 h-64 sm:w-96 sm:h-96 bg-purple-600/10 blur-[80px] sm:blur-[120px] -me-32 sm:-me-48 -mt-32 sm:-mt-48 opacity-10" />
        <div className="absolute bottom-0 start-0 w-64 h-64 sm:w-96 sm:h-96 bg-amber-600/5 blur-[80px] sm:blur-[120px] -ms-32 sm:-ms-48 -mb-32 sm:-mb-48 opacity-10" />
        
        {/* Official Stamps */}
        <OfficialStamp text="سيادي" color="blue" rotation="15deg" className="top-10 end-10" />
        <OfficialStamp text="سري" color="red" rotation="-20deg" className="bottom-20 start-1/4" />
        <OfficialStamp text="تنفيذي" color="blue" rotation="-5deg" className="top-1/3 end-1/4" />

        <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12 z-10">
          {/* Official Portrait Frame */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-6 bg-gradient-to-tr from-purple-500/30 to-amber-500/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className={clsx(
              "relative w-48 h-64 sm:w-56 sm:h-72 bg-zinc-800 rounded-2xl overflow-hidden border-[4px] sm:border-[8px] shadow-[0_30px_60px_rgba(0,0,0,0.6)]",
              isPM ? "border-amber-500" : "border-zinc-400"
            )}>
              <img 
                src={profile?.photoURL || getRealisticAvatar(profile?.uid || '', profile?.gender || 'male', profile?.age || 25)} 
                alt="Official Portrait"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-4 sm:bottom-6 inset-x-0 text-center">
                <div className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-1">صورة شخصية</div>
                <div className="w-10 sm:w-12 h-0.5 bg-amber-500/50 mx-auto rounded-full" />
              </div>
            </div>
            {/* Stamp Effect */}
            <div className="absolute -bottom-4 -end-4 sm:-bottom-6 sm:-end-6 w-16 h-16 sm:w-24 sm:h-24 border-[4px] sm:border-8 border-red-600/20 rounded-full flex items-center justify-center -rotate-12 pointer-events-none backdrop-blur-[2px]">
              <div className="text-[6px] sm:text-[10px] font-black text-red-600/40 uppercase text-center leading-tight tracking-tighter">
                رسمي<br/>مكتب رئيس الوزراء<br/>ختم
              </div>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-start space-y-6 w-full">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-2 sm:mb-4">
                <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2 sm:gap-2.5">
                  <Crown className="text-amber-500" size={14} />
                  <span className="text-[9px] sm:text-[10px] font-black text-amber-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">
                    {isPM ? "رئيس الوزراء" : "مكتب رئاسة الوزراء"}
                  </span>
                </div>
                <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                  <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">السلطة التنفيذية</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter italic leading-none break-words">
                {isPM ? profile?.displayName : "رئاسة الوزراء"}
              </h1>
              <p className="text-zinc-500 text-sm sm:text-xl max-w-2xl font-medium leading-relaxed italic opacity-80 border-s-4 border-[#c5a059]/40 ps-4 sm:ps-6 py-1 sm:py-2">
                إدارة شؤون الدولة، تعيين الوزراء، وإصدار المراسيم التنفيذية العليا.
              </p>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-4">
              {(govData?.pmElection?.isActive || profile?.role === 'Admin' || isSpeaker) && (
                <button 
                  onClick={() => setActiveTab('nomination')}
                  className={clsx(
                    "px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 text-[10px] sm:text-base",
                    activeTab === 'nomination' ? "bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.3)]" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                  )}
                >
                  <Vote size={16} className="sm:w-[18px] sm:h-[18px]" />
                  الانتخابات
                </button>
              )}
              <button 
                onClick={() => setActiveTab('cabinet')}
                className={clsx(
                  "px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 text-[10px] sm:text-base",
                  activeTab === 'cabinet' ? "bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.3)]" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                )}
              >
                <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
                الكابينة الوزارية
              </button>
              {isPM && (
                <>
                  <button 
                    onClick={() => setActiveTab('office')}
                    className={clsx(
                      "px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 text-[10px] sm:text-base",
                      activeTab === 'office' ? "bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    <Briefcase size={16} className="sm:w-[18px] sm:h-[18px]" />
                    إدارة الدولة
                  </button>
                  <button 
                    onClick={() => setActiveTab('monitoring')}
                    className={clsx(
                      "px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 text-[10px] sm:text-base",
                      activeTab === 'monitoring' ? "bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    )}
                  >
                    <HistoryIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                    مراقبة الوزارات
                  </button>
                </>
              )}
              {isSpeaker && (
                <div className="flex gap-2">
                  {!govData?.pmElection?.isActive ? (
                    <button
                      onClick={handleStartElection}
                      disabled={isSubmitting}
                      className="px-4 sm:px-8 py-2.5 sm:py-4 bg-red-600 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 text-[10px] sm:text-base shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                    >
                      <Zap size={16} className="sm:w-[18px] sm:h-[18px]" />
                      فتح الترشيح
                    </button>
                  ) : (
                    <button
                      onClick={handleFinalizeElection}
                      disabled={isSubmitting}
                      className="px-4 sm:px-8 py-2.5 sm:py-4 bg-green-600 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 text-[10px] sm:text-base shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                    >
                      <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                      إنهاء الانتخابات
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'nomination' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-zinc-900/30 border border-white/5 rounded-[3rem] p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">المرشحون للمنصب</h2>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1">قائمة النواب المرشحين لرئاسة الوزراء</p>
                    </div>
                    {govData?.pmElection?.isActive && !govData?.pmElection?.candidates?.some((c: any) => c.uid === profile?.uid) && (
                      <button
                        onClick={handleNominate}
                        disabled={isSubmitting}
                        className="px-4 md:px-8 py-2 md:py-4 bg-amber-500 text-black font-black rounded-xl md:rounded-2xl hover:scale-105 transition-transform disabled:opacity-50 text-xs md:text-base"
                      >
                        ترشيح نفسي
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {govData?.pmElection?.candidates?.map((candidate: any) => (
                      <div key={candidate.uid} className="bg-black/40 border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden border-2 border-amber-500/20 shadow-lg">
                            {candidate.photoURL ? (
                              <img src={candidate.photoURL} alt={candidate.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="text-zinc-600 m-auto mt-4" size={32} />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-amber-500 italic">{candidate.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{candidate.votes} أصوات</span>
                            </div>
                          </div>
                        </div>
                        {isMP && (
                          <button
                            onClick={() => handleVote(candidate.uid)}
                            disabled={isSubmitting || candidate.voters?.includes(profile?.uid)}
                            className={clsx(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                              candidate.voters?.includes(profile?.uid) 
                                ? "bg-green-500 text-black" 
                                : "bg-white/5 text-zinc-400 hover:bg-amber-500 hover:text-black"
                            )}
                          >
                            <Vote size={24} />
                          </button>
                        )}
                      </div>
                    ))}
                    {(!govData?.pmElection?.candidates || govData.pmElection.candidates.length === 0) && (
                      <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-[2rem]">
                        <p className="text-zinc-600 italic font-medium">لا يوجد مرشحون حالياً</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-zinc-900/30 border border-white/5 rounded-[3rem] p-8">
                  <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-widest">
                    <Gavel className="text-amber-500" size={24} />
                    إدارة الانتخابات
                  </h3>
                  <div className="space-y-6">
                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">الفائز الأخير</p>
                      <p className="text-2xl font-black text-amber-500 italic">{govData?.pmElection?.lastWinner || 'غير محدد'}</p>
                    </div>
                    {isSpeaker && (
                      <button
                        onClick={handleFinalizeElection}
                        disabled={isSubmitting || !govData?.pmElection?.candidates?.length}
                        className="w-full py-5 bg-green-600 text-white font-black rounded-2xl hover:bg-green-500 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
                      >
                        إعلان النتائج النهائية
                      </button>
                    )}
                    <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                      <p className="text-xs text-amber-500/70 font-bold leading-relaxed">
                        ملاحظة: يحق فقط لأعضاء البرلمان التصويت والترشح لمنصب رئيس الوزراء. يتم إعلان الفائز من قبل رئيس البرلمان.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cabinet' && (
            <div className="space-y-10 sm:space-y-16">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-start">
                  <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter">الكابينة الوزارية</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] md:text-sm mt-2 border-s-4 border-purple-500/40 ps-4">التشكيلة الحكومية الحالية والوزارات السيادية</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 w-full md:w-auto">
                  {profile?.ministerRole && (
                    <button
                      onClick={() => navigate('/minister-office')}
                      className="flex-1 md:flex-none px-6 md:px-10 py-3.5 md:py-5 bg-amber-500 text-black font-black rounded-xl md:rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 text-sm md:text-lg shadow-[0_20px_40px_rgba(245,158,11,0.2)]"
                    >
                      <Crown size={22} />
                      دخول مكتب الوزير
                    </button>
                  )}
                  {isPM && (
                    <button
                      onClick={handleClearCabinet}
                      className="flex-1 md:flex-none px-6 md:px-10 py-3.5 md:py-5 bg-red-500/10 border-2 border-red-500/20 text-red-500 font-black rounded-xl md:rounded-2xl hover:bg-red-500 hover:text-white transition-all text-sm md:text-lg"
                    >
                      إقالة الحكومة بالكامل
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                {ministerRoles.map((role) => {
                  const minister = govData?.cabinet?.[role.id];
                  return (
                    <div key={role.id} className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-tr from-white/5 to-white/10 rounded-[2.5rem] blur opacity-50 group-hover:opacity-100 transition duration-500" />
                        <div className={clsx(
                          "relative bg-[#1a1a1a] rounded-[2.5rem] p-8 sm:p-10 overflow-hidden transition-all duration-500 group-hover:translate-y-[-8px] group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)]",
                          role.id === 'interior' ? "border-2 sm:border-4 border-[#c5a059]/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]" : "border border-white/5"
                        )}>
                          {role.id === 'interior' && (
                            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                          )}
                          <div className={clsx("absolute top-0 end-0 w-40 h-40 blur-[80px] -me-20 -mt-20 opacity-10", role.color.replace('text-', 'bg-'))} />
                        
                        {/* Official Stamp for appointed ministers */}
                        {minister && (
                          <OfficialStamp text="معين" color="blue" rotation="-15deg" className="top-4 end-4 scale-75 opacity-40" />
                        )}

                        <div className="flex items-center gap-6 mb-10 relative z-10">
                          <div className={clsx("p-5 rounded-2xl bg-black/50 border-2 border-white/5 shadow-inner", role.color)}>
                            <role.icon size={36} />
                          </div>
                          <div>
                            <h4 className="text-2xl font-black text-white italic tracking-tight">{role.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">المنصب الوزاري</p>
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10">
                          {minister ? (
                            <div className="bg-black/40 rounded-3xl p-6 border-2 border-white/5 flex items-center gap-5 group-hover:border-amber-500/20 transition-colors">
                              <div className="relative shrink-0">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-lg">
                                  {minister.photoURL ? (
                                    <img src={minister.photoURL} alt={minister.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                      <Users className="text-zinc-600" size={28} />
                                    </div>
                                  )}
                                </div>
                                <div className="absolute -bottom-2 -end-2 w-6 h-6 bg-green-500 rounded-full border-4 border-[#1a1a1a] shadow-lg" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-lg font-black text-amber-500 italic truncate">{minister.name}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-0.5">معين بمرسوم رسمي</p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-black/20 rounded-3xl p-8 border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-zinc-600 group-hover:border-white/10 transition-colors">
                              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center">
                                <UserPlus size={24} className="opacity-30" />
                              </div>
                              <p className="text-sm font-black uppercase tracking-widest italic opacity-50">المنصب شاغر حالياً</p>
                            </div>
                          )}
                        </div>

                        {/* Decorative Background Icon */}
                        <role.icon size={140} className={clsx("absolute -bottom-10 -start-10 opacity-[0.03] rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0", role.color)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'office' && isPM && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
              <div className="lg:col-span-2 space-y-8 sm:space-y-12">
                {/* Executive Actions - State Management */}
                <div className="relative bg-[#1a1a1a] border-2 border-white/5 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-12 overflow-hidden shadow-2xl">
                  {/* Wood Texture Overlay */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                  
                  <OfficialStamp text="أمر تنفيذي" color="red" rotation="10deg" className="top-10 end-10 opacity-30" />

                  <div className="relative z-10 mb-12">
                    <h3 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-5 uppercase tracking-tighter italic">
                      <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                        <Zap className="text-amber-500" size={32} />
                      </div>
                      إدارة الدولة العليا
                    </h3>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-4 ps-6 border-s-4 border-amber-500/40">الصلاحيات التنفيذية المطلقة لرئيس الوزراء</p>
                  </div>
                  
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { id: 'corruption', title: 'توزيع ميزانية الطوارئ', icon: DollarSign, color: 'text-green-500', desc: 'توزيع مبالغ مالية من خزينة الدولة على الموالين', active: false },
                      { id: 'pardon', title: 'عفو رئاسي خاص', icon: Unlock, color: 'text-blue-500', desc: 'إسقاط التهم وإطلاق سراح سجين مختار فوراً', active: false },
                      { id: 'jail', title: 'أمر اعتقال تنفيذي', icon: Lock, color: 'text-red-500', desc: 'سجن مواطن فوراً دون محاكمة (صلاحية طوارئ)', active: false },
                      { id: 'freeze', title: 'تجميد الأصول المالية', icon: Ban, color: 'text-orange-500', desc: 'تجميد حسابات بنكية لمستهدف معين', active: false },
                      { id: 'martial', title: 'إعلان الأحكام العرفية', icon: ShieldAlert, color: 'text-purple-500', desc: 'تفعيل حالة الطوارئ القصوى وتعطيل القوانين العادية', active: govData?.martialLaw },
                      { id: 'tax', title: 'إعفاء ضريبي شامل', icon: Landmark, color: 'text-emerald-500', desc: 'إلغاء الضرائب عن كافة المواطنين لفترة محدودة', active: govData?.taxHoliday },
                    ].map((action) => (
                      <button
                        key={action.id}
                        onClick={() => {
                          const requiresTarget = ['corruption', 'pardon', 'jail', 'freeze'].includes(action.id);
                          
                          if (requiresTarget && !selectedTargetUser) {
                            toast.error('يرجى تحديد هدف أولاً من قائمة المواطنين');
                            return;
                          }
                          
                          setConfirmAction({
                            actionId: action.id, 
                            userId: selectedTargetUser ? selectedTargetUser.id : null
                          });
                        }}
                        className={clsx(
                          "group relative p-8 border-2 rounded-[2rem] text-start transition-all overflow-hidden",
                          action.active 
                            ? `bg-${action.color.replace('text-', '')}/10 border-${action.color.replace('text-', '')}/40 shadow-[0_0_40px_rgba(0,0,0,0.3)]` 
                            : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60"
                        )}
                      >
                        <div className={clsx("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity", action.color.replace('text-', 'bg-'))} />
                        
                        <div className="flex justify-between items-start mb-8">
                          <div className={clsx("p-5 rounded-2xl bg-black/50 border-2 border-white/5 shadow-inner", action.color)}>
                            <action.icon size={32} />
                          </div>
                          {action.active && (
                            <div className="px-4 py-1.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                              مرسوم نشط
                            </div>
                          )}
                        </div>
                        
                        <h4 className="text-2xl font-black text-white mb-3 italic tracking-tight">{action.title}</h4>
                        <p className="text-xs text-zinc-500 font-bold leading-relaxed opacity-80">{action.desc}</p>
                        
                        {/* Decorative elements */}
                        <div className="absolute -bottom-8 -end-8 opacity-[0.03] rotate-12 group-hover:scale-125 group-hover:rotate-0 transition-all duration-1000">
                          <action.icon size={160} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minister Appointment */}
                <div className="bg-[#1a1a1a] border-2 border-white/5 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                  
                  <div className="relative z-10 mb-12">
                    <h3 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-5 uppercase tracking-tighter italic">
                      <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                        <UserPlus className="text-purple-500" size={32} />
                      </div>
                      تشكيل الكابينة الوزارية
                    </h3>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-4 ps-6 border-s-4 border-purple-500/40">تعيين وإقالة الوزراء في المناصب السيادية</p>
                  </div>
                  
                  <div className="relative z-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ps-2">الوزارة المستهدفة</label>
                        <div className="relative">
                          <Briefcase className="absolute start-5 top-1/2 -translate-y-1/2 text-purple-500" size={20} />
                          <select 
                            id="minister-role-select"
                            className="w-full bg-black/60 border-2 border-white/5 rounded-2xl p-5 ps-14 text-white font-black outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                          >
                            {ministerRoles.map(r => <option key={r.id} value={r.id} className="bg-zinc-900">{r.title}</option>)}
                          </select>
                          <div className="absolute end-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <ChevronDown size={20} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ps-2">البحث عن مرشح</label>
                        <div className="relative">
                          <Search className="absolute start-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                          <input 
                            type="text"
                            placeholder="ابحث بالاسم أو المعرف..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/60 border-2 border-white/5 rounded-2xl p-5 ps-14 text-white font-black outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {searchQuery && filteredPlayers.map(player => (
                          <motion.div 
                            key={player.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={clsx(
                              "bg-black/40 border-2 rounded-2xl p-5 flex items-center justify-between group transition-all cursor-pointer",
                              selectedAppointUser?.id === player.id ? "border-purple-500 bg-purple-500/5" : "border-white/5 hover:border-purple-500/30 hover:bg-white/5"
                            )}
                            onClick={() => {
                              setSearchQuery(player.displayName);
                              setSelectedAppointUser(player);
                            }}
                          >
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 shadow-lg group-hover:border-purple-500/40 transition-colors">
                                <img src={player.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <p className="text-lg font-black text-white italic player-name-script">{player.displayName}</p>
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{player.id}</p>
                              </div>
                            </div>
                            <div className={clsx(
                              "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                              selectedAppointUser?.id === player.id ? "bg-purple-500 border-purple-500 text-white" : "border-white/10 text-transparent"
                            )}>
                              <CheckCircle2 size={16} />
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={() => {
                        const roleSelect = document.getElementById('minister-role-select') as HTMLSelectElement;
                        if (selectedAppointUser) {
                          handleAppointMinister(roleSelect.value, selectedAppointUser.id);
                        } else {
                          toast.error('لم يتم اختيار لاعب للتعيين');
                        }
                      }}
                      disabled={isSubmitting || !selectedAppointUser}
                      className="w-full py-6 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-500 transition-all shadow-[0_20px_40px_rgba(168,85,247,0.2)] disabled:opacity-50 disabled:grayscale uppercase tracking-[0.2em] italic text-lg"
                    >
                      إصدار مرسوم التعيين الرسمي
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Target Selection Panel */}
                <div className="bg-[#1a1a1a] border-2 border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                  
                  <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 uppercase tracking-widest italic relative z-10">
                    <Target className="text-red-500" size={24} />
                    تحديد الهدف التنفيذي
                  </h3>
                  
                  <div className="space-y-8 relative z-10">
                    <div className="relative">
                      <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text"
                        placeholder="ابحث عن مواطن..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/60 border-2 border-white/5 rounded-xl p-4 ps-12 text-white font-bold outline-none focus:border-red-500/50 transition-all text-sm"
                      />
                    </div>

                    <div className="space-y-3">
                      {selectedTargetUser ? (
                        <div className="p-6 bg-red-500/5 border-2 border-red-500/20 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-500/40">
                              <img src={selectedTargetUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="font-black text-white italic player-name-script">{selectedTargetUser.displayName}</p>
                              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">المستهدف الحالي</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedTargetUser(null)}
                            className="p-2 text-zinc-500 hover:text-white transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ) : (
                        <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                          <UserPlus className="mx-auto text-zinc-700 mb-4 opacity-30" size={40} />
                          <p className="text-xs text-zinc-500 font-black uppercase tracking-widest opacity-50">لم يتم تحديد هدف</p>
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3 mb-4">
                        <ShieldAlert className="text-amber-500" size={18} />
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">بروتوكول الاستهداف</h4>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                        يجب تحديد مواطن قبل تنفيذ أوامر الاعتقال، العفو، تجميد الحسابات، أو توزيع الأموال. الأوامر التنفيذية نهائية وغير قابلة للنقض.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'monitoring' && isPM && (
            <div className="space-y-10 sm:space-y-16">
              <div className="text-center md:text-start">
                <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter">مراقبة الوزارات</h2>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] md:text-sm mt-2 border-s-4 border-emerald-500/40 ps-4">نظام الرقابة الحكومية العليا والتقارير الوزارية</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {ministerRoles.map((role) => {
                  const budget = govData?.budgets?.[role.id] ?? 10000000;
                  const spent = 10000000 - budget;
                  const percentage = (spent / 10000000) * 100;
                  
                  return (
                    <div key={role.id} className="bg-[#1a1a1a] border-2 border-white/5 rounded-[2rem] p-6 sm:p-8 group relative overflow-hidden transition-all hover:border-white/10">
                      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                      
                      <div className="relative z-10 flex items-center justify-between mb-6">
                        <div className={clsx("p-3 rounded-xl bg-black/50 border border-white/5 shadow-inner", role.color)}>
                          <role.icon size={20} />
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedRoleForBudget(role.id);
                            setNewBudgetAmount(budget);
                          }}
                          className="p-2 bg-white/5 hover:bg-amber-500 hover:text-black rounded-lg text-zinc-500 transition-all"
                        >
                          <Landmark size={16} />
                        </button>
                      </div>

                      <div className="relative z-10 space-y-4">
                        <h4 className="text-sm font-black text-white italic tracking-tight">{role.title}</h4>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                            <span className="text-zinc-500">الميزانية المتبقية</span>
                            <span className="text-amber-500">{budget.toLocaleString()}$</span>
                          </div>
                          <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, percentage)}%` }}
                              className={clsx("h-full transition-all duration-1000", percentage > 80 ? "bg-red-500" : "bg-emerald-500")}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Decorative Background Icon */}
                      <role.icon size={100} className={clsx("absolute -bottom-6 -start-6 opacity-[0.02] rotate-12 transition-transform duration-700 group-hover:scale-110", role.color)} />
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#1a1a1a] border-2 border-white/5 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
                
                <div className="relative z-10 mb-12">
                  <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-5 uppercase tracking-tighter italic">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <HistoryIcon className="text-emerald-500" size={28} />
                    </div>
                    سجل النشاط المالي للوزارات
                  </h3>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-4 ps-6 border-s-4 border-emerald-500/40">متابعة الصرف والنشاط المالي للوزراء</p>
                </div>
                
                <div className="relative z-10 space-y-4">
                  {ministryLogs.length > 0 ? (
                    ministryLogs.map((log) => (
                      <div key={log.id} className="bg-black/40 border-2 border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-emerald-500/20 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-zinc-900 rounded-xl flex items-center justify-center border-2 border-white/5 shadow-lg">
                            {ministerRoles.find(r => r.id === log.role)?.icon && (
                              React.createElement(ministerRoles.find(r => r.id === log.role)!.icon, { size: 28, className: ministerRoles.find(r => r.id === log.role)!.color })
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-black text-white italic">
                              <span className="text-amber-500">{log.ministerName}</span> 
                              <span className="text-zinc-500 text-sm mx-2">({ministerRoles.find(r => r.id === log.role)?.title})</span>
                            </p>
                            <p className="text-sm text-zinc-500 font-bold">
                              {log.action === 'auto_distribution' ? (
                                <>تم توزيع <span className="text-emerald-500 font-black">{log.amount.toLocaleString()}$</span> (مكرمة تلقائية) إلى <span className="text-white font-black">{log.targetUserName}</span></>
                              ) : (
                                <>أرسل <span className="text-green-500 font-black">{log.amount.toLocaleString()}$</span> إلى <span className="text-white font-black">{log.targetUserName}</span></>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-end border-t md:border-t-0 md:border-s border-white/5 pt-4 md:pt-0 md:ps-6">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black mb-1">
                            {new Date(log.timestamp).toLocaleString('ar-EG')}
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">الميزانية المتبقية</span>
                            <span className="text-xs text-amber-500 font-black">{log.remainingBudget?.toLocaleString()}$</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-black/20">
                      <HistoryIcon className="mx-auto text-zinc-700 mb-4 opacity-20" size={48} />
                      <p className="text-sm text-zinc-600 italic font-black uppercase tracking-widest opacity-50">لا توجد سجلات مالية حالياً</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {/* Budget Allocation Modal */}
      <AnimatePresence>
        {selectedRoleForBudget && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] border-2 border-[#c5a059]/30 rounded-[2.5rem] p-10 max-w-md w-full space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-amber-500/10 rounded-2xl border-2 border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                  <Landmark className="text-amber-500" size={40} />
                </div>
                <h3 className="text-3xl font-black text-white italic text-center tracking-tight">تخصيص ميزانية سيادية</h3>
                <p className="text-zinc-500 text-sm text-center font-bold mt-2 uppercase tracking-widest">
                  تعديل ميزانية <span className="text-amber-500">{ministerRoles.find(r => r.id === selectedRoleForBudget)?.title}</span>
                </p>
              </div>
              
              <div className="relative z-10 space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ps-2">المبلغ المخصص ($)</label>
                <div className="relative">
                  <DollarSign className="absolute start-5 top-1/2 -translate-y-1/2 text-amber-500" size={24} />
                  <input 
                    type="number"
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(Number(e.target.value))}
                    className="w-full bg-black/60 border-2 border-white/5 rounded-2xl px-6 py-5 ps-14 text-white text-2xl font-black focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="relative z-10 flex gap-4">
                <button 
                  onClick={() => setSelectedRoleForBudget(null)}
                  className="flex-1 px-6 py-5 bg-zinc-800/50 border-2 border-white/5 text-zinc-400 font-black rounded-2xl hover:bg-zinc-800 hover:text-white transition-all uppercase tracking-widest text-sm"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleAllocateBudget}
                  disabled={isAllocating}
                  className="flex-1 px-6 py-5 bg-amber-600 text-white font-black rounded-2xl hover:bg-amber-500 transition-all disabled:opacity-50 shadow-lg shadow-amber-900/20 uppercase tracking-widest text-sm"
                >
                  {isAllocating ? 'جاري الحفظ...' : 'تأكيد المرسوم'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] border-2 border-red-500/30 rounded-[2.5rem] p-10 max-w-md w-full space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')]" />
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-red-500/10 rounded-2xl border-2 border-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert className="text-red-500" size={40} />
                </div>
                <h3 className="text-3xl font-black text-white italic text-center tracking-tight">تأكيد المرسوم التنفيذي</h3>
                <p className="text-zinc-500 text-sm text-center font-bold mt-4 leading-relaxed">
                  {['martial', 'tax'].includes(confirmAction.actionId) 
                    ? 'هل أنت متأكد من تنفيذ هذا الإجراء السيادي على مستوى الدولة؟ هذا القرار نهائي وله تبعات قانونية وتنفيذية فورية.'
                    : 'هل أنت متأكد من تنفيذ هذا الإجراء التنفيذي على المواطن المختار؟ سيتم تفعيل القرار فور إصدار المرسوم.'}
                </p>
              </div>

              <div className="relative z-10 flex gap-4">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-6 py-5 bg-zinc-800/50 border-2 border-white/5 text-zinc-400 font-black rounded-2xl hover:bg-zinc-800 hover:text-white transition-all uppercase tracking-widest text-sm"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    handleExecutiveAction(confirmAction.actionId, confirmAction.userId);
                    setConfirmAction(null);
                  }}
                  className="flex-1 px-6 py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/20 uppercase tracking-widest text-sm"
                >
                  تأكيد التنفيذ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
