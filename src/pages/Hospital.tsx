import React, { useEffect, useState } from 'react';
import { 
  Heart, 
  Plus, 
  ShoppingCart, 
  Check, 
  Clock, 
  Skull, 
  Users, 
  Image as ImageIcon, 
  Stethoscope, 
  Activity, 
  ShieldAlert, 
  User, 
  Droplet, 
  Calendar, 
  Syringe,
  Truck,
  Building2,
  Cross,
  Bed,
  Scissors,
  Edit2,
  Pill,
  QrCode,
  ShieldCheck,
  Fingerprint
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, safeToDate } from '../lib/utils';
import { getVIPDiscount } from '../lib/vip';
import PlayerAvatar from '../components/PlayerAvatar';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, collection, query, where, orderBy, limit, onSnapshot, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const DRUGS = [
  {
    id: 'paracetamol',
    nameKey: 'hospital.drugs.paracetamol',
    image: 'https://p7.hiclipart.com/preview/218/875/627/acetaminophen-drug-tablet-excipient-dietary-supplement-tablet.jpg',
    price: 5000,
    heal: 10
  },
  {
    id: 'ibuprofen',
    nameKey: 'hospital.drugs.ibuprofen',
    image: 'https://p1.hiclipart.com/preview/502/335/695/ibuprofen-service-tablet-pain-drug-inflammation-pain-management-arthritis-modifiedrelease-dosage-png-clipart-thumbnail.jpg',
    price: 15000,
    heal: 25
  },
  {
    id: 'cetirizine',
    nameKey: 'hospital.drugs.cetirizine',
    image: 'https://p7.hiclipart.com/preview/464/558/498/nasal-spray-hay-fever-allergy-pharmaceutical-drug-cetirizine-allergy-thumbnail.jpg',
    price: 25000,
    heal: 15
  },
  {
    id: 'dextromethorphan',
    nameKey: 'hospital.drugs.dextromethorphan',
    image: 'https://p7.hiclipart.com/preview/276/477/113/brompheniramine-acetaminophen-phenylephrine-dextromethorphan-pharmaceutical-drug-fb-thumbnail.jpg',
    price: 50000,
    heal: 30
  },
  {
    id: 'amoxicillin',
    nameKey: 'hospital.drugs.amoxicillin',
    image: 'https://p7.hiclipart.com/preview/792/988/845/dietary-supplement-food-pharmaceutical-drug-amoxicillin-tablet-hydrogen-peroxide-thumbnail.jpg',
    price: 100000,
    heal: 50
  }
];

const SECTIONS = [
  { id: 'pharmacy', icon: Pill, color: 'emerald', labelKey: 'hospital.pharmacy', image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=1000' },
  { id: 'emergency', icon: Activity, color: 'blue', labelKey: 'hospital.emergency', image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=1000' },
  { id: 'surgery', icon: Scissors, color: 'purple', labelKey: 'hospital.surgery', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=1000' },
  { id: 'icu', icon: Stethoscope, color: 'red', labelKey: 'hospital.icu', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000' }
];

export default function Hospital() {
  const { t } = useTranslation();
  const { 
    profile, 
    heal, 
    hirePrivateDoctor, 
    buySurgeryRoom, 
    buyAmbulance, 
    processing 
  } = useAuthStore();
  const [activeTab, setActiveTab] = useState('emergency');
  const [recoveringPlayers, setRecoveringPlayers] = useState<any[]>([]);
  const [cemeteryKills, setCemeteryKills] = useState<any[]>([]);
  const [sectionImages, setSectionImages] = useState<Record<string, string>>({
    pharmacy: SECTIONS[0].image,
    emergency: SECTIONS[1].image,
    surgery: SECTIONS[2].image,
    icu: SECTIONS[3].image
  });
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const health = profile?.health ?? 100;

  useEffect(() => {
    // Determine section based on health if hospitalized
    if (profile?.city === 'hospital') {
      if (health < 30) setActiveTab('icu');
      else if (health < 70) setActiveTab('surgery');
      else setActiveTab('emergency');
    }
  }, [health, profile?.city]);

  useEffect(() => {
    const q = query(collection(db, 'users_public'), where('city', '==', 'hospital'), limit(20));
    const unsubscribeRecovering = onSnapshot(q, (snapshot) => {
      setRecoveringPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const killsQ = query(collection(db, 'kills'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeCemetery = onSnapshot(killsQ, (snapshot) => {
      setCemeteryKills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeRecovering();
      unsubscribeCemetery();
    };
  }, []);

  const handleHeal = async () => {
    if (!profile) return;
    if (health >= 100) {
      toast.error(t('hospital.alreadyFull'));
      return;
    }
    let cost = health === 0 ? 100000 : 10000;
    cost = Math.floor(cost * getVIPDiscount(profile.vipLevel as any));
    await heal(cost);
  };

  const handleBuyDrug = async (drug: typeof DRUGS[0]) => {
    if (!profile) return;
    if (profile.cleanMoney < drug.price) {
      toast.error(t('common.noMoney'));
      return;
    }

    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        cleanMoney: increment(-drug.price),
        [`inventory.drugs.${drug.id}`]: increment(1)
      });
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleUseDrug = async (drug: typeof DRUGS[0]) => {
    if (!profile || !profile.inventory?.drugs?.[drug.id]) return;
    if (health >= 100) {
      toast.error(t('hospital.alreadyFull'));
      return;
    }

    try {
      const docRef = doc(db, 'users', profile.uid);
      const newHealth = Math.min(100, health + drug.heal);
      await updateDoc(docRef, {
        health: newHealth,
        [`inventory.drugs.${drug.id}`]: increment(-1),
        hospitalizedUntil: newHealth >= 100 ? null : profile.hospitalizedUntil,
        city: newHealth >= 100 ? 'baghdad' : profile.city
      });
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleUpdateImage = () => {
    if (!newImageUrl) return;
    setSectionImages(prev => ({ ...prev, [activeTab]: newImageUrl }));
    setIsEditingImage(false);
    setNewImageUrl('');
    toast.success(t('common.success'));
  };

  const getTimeRemaining = () => {
    if (!profile?.hospitalizedUntil) return null;
    const remaining = Math.max(0, profile.hospitalizedUntil - Date.now());
    if (remaining === 0) return null;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentSection = SECTIONS.find(s => s.id === activeTab) || SECTIONS[1];

  return (
    <div className="text-white space-y-8 max-w-7xl mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-500/20 text-red-500 rounded-2xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Cross size={32} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">{t('hospital.title')}</h2>
            <p className="text-zinc-500 font-medium">{t('hospital.desc')}</p>
          </div>
        </div>

        {/* Health Status Bar */}
        <div className="bg-zinc-900/50 backdrop-blur-xl p-4 rounded-2xl border border-zinc-800 flex items-center gap-6">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={health > 30 ? "#22c55e" : "#ef4444"} strokeWidth="8" strokeDasharray={`${health * 2.827} 282.7`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-sm font-black">{health}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
              <Heart size={12} className="text-red-500" />
              <span>{t('family.health')}</span>
            </div>
            {profile?.hospitalizedUntil && getTimeRemaining() && (
              <div className="flex items-center gap-2 text-blue-400 text-xs font-black">
                <Clock size={12} />
                <span>{getTimeRemaining()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Ward & Death Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recovery Ward */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bed size={24} className="text-blue-500" />
              <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('hospital.recoveryWard')}</h3>
            </div>
            <span className="bg-blue-500/10 text-blue-500 text-[10px] font-black px-2 py-1 rounded-lg border border-blue-500/20">
              {recoveringPlayers.length}
            </span>
          </div>
          <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {recoveringPlayers.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 font-bold uppercase text-xs tracking-widest">
                {t('hospital.noRecovering')}
              </div>
            ) : (
              recoveringPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 group hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <PlayerAvatar 
                        photoURL={player.photoURL} 
                        displayName={player.displayName} 
                        vipLevel={player.vipLevel} 
                        size="md"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-zinc-950 flex items-center justify-center z-10">
                        <Activity size={8} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-black player-name-script">{player.displayName}</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('hospital.inRecovery')}</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-blue-500">
                    {player.health}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cemetery Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
            <h4 className="text-lg font-black italic text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Skull size={24} className="text-zinc-400" />
              {t('hospital.cemetery')}
            </h4>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {cemeteryKills.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {cemeteryKills.map((kill) => (
                  <div key={kill.id} className="p-6 hover:bg-white/5 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                        <Skull size={24} />
                      </div>
                      <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                          <span className="text-white font-black italic text-lg">{kill.victimName}</span>
                          <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">{t('hospital.killedBy')}</span>
                          <span className="text-red-500 font-black italic text-lg">{kill.killerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                          <Clock size={10} />
                          {safeToDate(kill.timestamp).toLocaleString('ar-EG')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Skull size={48} className="mx-auto text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-black uppercase tracking-widest">{t('hospital.emptyCemetery')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Realistic Medical ID Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-auto w-full max-w-2xl perspective-1000"
      >
        <div className="relative bg-gradient-to-br from-zinc-100 to-zinc-300 rounded-[2rem] p-1 shadow-2xl overflow-hidden border border-white/50">
          {/* Holographic Shimmer Effect */}
          <motion.div 
            animate={{ 
              background: [
                "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                "linear-gradient(120deg, transparent 100%, rgba(255,255,255,0.4) 150%, transparent 200%)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 pointer-events-none z-10"
          />

          <div className="bg-white rounded-[1.8rem] p-6 md:p-8 relative overflow-hidden shadow-inner">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none flex flex-wrap gap-4 p-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <Activity key={i} size={40} className="text-blue-900" />
              ))}
            </div>

            {/* Card Header */}
            <div className="flex justify-between items-start mb-8 relative z-20">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
                  <Cross size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-blue-900 font-black text-lg leading-tight uppercase tracking-tight">
                    {t('hospital.healthAuthority')}
                  </h3>
                  <p className="text-blue-700/60 text-[10px] font-bold uppercase tracking-widest">
                    {t('hospital.medicalCard')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mb-2">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('hospital.verified')}</span>
                </div>
                <div className="w-12 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md shadow-inner border border-amber-300 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-[1px] bg-amber-700/20 my-1" />
                  <div className="w-full h-[1px] bg-amber-700/20 my-1" />
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-col md:flex-row gap-8 relative z-20">
              {/* Photo Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-40 h-48 rounded-2xl bg-zinc-100 border-4 border-white shadow-xl overflow-hidden relative">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="" className="w-full h-full object-cover grayscale-[20%]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-200">
                        <User size={80} className="text-zinc-400" />
                      </div>
                    )}
                    {/* Holographic Overlay on Photo */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-emerald-500/10 mix-blend-overlay" />
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-xl shadow-lg border border-zinc-100">
                    <Fingerprint size={24} className="text-blue-600" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">
                    {t('hospital.digitalSignature')}
                  </div>
                  <div className="font-['Dancing_Script',cursive] text-2xl text-blue-900/40 select-none italic">
                    {profile?.displayName}
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-grow space-y-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('common.username')}
                  </label>
                  <div className="text-2xl font-black text-blue-900 uppercase tracking-tight">
                    {profile?.displayName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('hospital.bloodType')}
                    </label>
                    <div className="flex items-center gap-2">
                      <Droplet size={16} className="text-red-600" />
                      <span className="text-xl font-black text-zinc-800">{profile?.bloodType || 'O+'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('hospital.age')}
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-blue-600" />
                      <span className="text-xl font-black text-zinc-800">{profile?.level ? profile.level + 18 : 25}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('hospital.issueDate')}
                    </label>
                    <div className="text-sm font-bold text-zinc-600">01/01/2024</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('hospital.expiryDate')}
                    </label>
                    <div className="text-sm font-bold text-zinc-600">01/01/2029</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {t('hospital.serialNumber')}
                    </div>
                    <div className="font-mono text-xs font-bold text-zinc-500 tracking-wider">
                      {profile?.uid?.toUpperCase()}
                    </div>
                  </div>
                  <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    <QrCode size={40} className="text-zinc-800" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

          {/* Private Medical Services */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30">
                <Stethoscope className="text-amber-500" size={24} />
              </div>
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white">{t('hospital.privateServices')}</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('hospital.premiumCare')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Private Doctor */}
              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[3rem] p-8 flex flex-col items-center text-center group relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-zinc-700 overflow-hidden mb-6 shadow-2xl group-hover:scale-105 transition-transform relative">
                  <img 
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400" 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay" />
                </div>
                <h4 className="text-2xl font-black italic mb-2 text-white uppercase tracking-tighter">{t('hospital.privateDoctor')}</h4>
                <p className="text-xs text-zinc-500 mb-8 leading-relaxed px-2">{t('hospital.privateDoctorDesc')}</p>
                <button
                  onClick={hirePrivateDoctor}
                  disabled={profile?.hasPrivateDoctor || processing}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                    profile?.hasPrivateDoctor 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40 hover:shadow-amber-500/40'
                  }`}
                >
                  {profile?.hasPrivateDoctor ? t('hospital.hired') : t('hospital.hire', { cost: formatMoney(100000000) })}
                </button>
              </motion.div>

              {/* Surgery Room */}
              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[3rem] p-8 flex flex-col items-center text-center group relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center mb-6 shadow-2xl group-hover:scale-105 transition-transform relative overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400" 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                  <Building2 size={56} className="text-blue-500 absolute" />
                </div>
                <h4 className="text-2xl font-black italic mb-2 text-white uppercase tracking-tighter">{t('hospital.surgeryRoom')}</h4>
                <p className="text-xs text-zinc-500 mb-8 leading-relaxed px-2">{t('hospital.surgeryRoomDesc')}</p>
                <button
                  onClick={buySurgeryRoom}
                  disabled={profile?.hasPrivateSurgeryRoom || processing}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                    profile?.hasPrivateSurgeryRoom 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 hover:shadow-blue-500/40'
                  }`}
                >
                  {profile?.hasPrivateSurgeryRoom ? t('hospital.hired') : t('hospital.hire', { cost: formatMoney(100000000) })}
                </button>
              </motion.div>

              {/* Ambulance */}
              <motion.div 
                whileHover={{ y: -10 }}
                className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[3rem] p-8 flex flex-col items-center text-center group relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center mb-6 shadow-2xl group-hover:scale-105 transition-transform relative overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1587350859728-117699f4a714?auto=format&fit=crop&q=80&w=400" 
                    alt="" 
                    className="w-full h-full object-cover opacity-50"
                  />
                  <Truck size={56} className="text-red-500 absolute" />
                </div>
                <h4 className="text-2xl font-black italic mb-2 text-white uppercase tracking-tighter">{t('hospital.ambulance')}</h4>
                <p className="text-xs text-zinc-500 mb-8 leading-relaxed px-2">{t('hospital.ambulanceDesc')}</p>
                <button
                  onClick={buyAmbulance}
                  disabled={profile?.hasPrivateAmbulance || processing}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                    profile?.hasPrivateAmbulance 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 hover:shadow-red-500/40'
                  }`}
                >
                  {profile?.hasPrivateAmbulance ? t('hospital.hired') : t('hospital.hire', { cost: formatMoney(10000000) })}
                </button>
              </motion.div>
            </div>
          </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-4 no-scrollbar">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveTab(section.id)}
            className={`flex-none flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-tighter transition-all duration-300 border ${
              activeTab === section.id
                ? `bg-${section.color}-500/20 border-${section.color}-500/50 text-${section.color}-400 shadow-[0_0_20px_rgba(0,0,0,0.3)]`
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <section.icon size={20} />
            <span>{t(section.labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {/* Section Hero Image */}
        <div className="relative h-[300px] rounded-3xl overflow-hidden border border-zinc-800 group">
          <img 
            src={sectionImages[activeTab]} 
            alt="" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          
          <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
            <div>
              <h3 className="text-3xl font-black uppercase italic text-white mb-2">{t(currentSection.labelKey)}</h3>
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <Activity size={16} className={`text-${currentSection.color}-500`} />
                <span>{t('hospital.recoveryDesc')}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsEditingImage(true)}
              className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-colors text-white"
            >
              <Edit2 size={20} />
            </button>
          </div>
        </div>

          {/* Pharmacy Content */}
          {activeTab === 'pharmacy' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {DRUGS.map((drug) => (
                <motion.div
                  key={drug.id}
                  layoutId={drug.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-emerald-500/30 transition-all group shadow-2xl"
                >
                  <div className="relative h-64 bg-white p-8 group-hover:p-6 transition-all duration-500">
                    <img src={drug.image} alt="" className="w-full h-full object-contain drop-shadow-2xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
                      +{drug.heal}% HP
                    </div>
                  </div>
                  
                  <div className="p-8 flex-grow flex flex-col">
                    <div className="mb-6">
                      <h4 className="text-2xl font-black italic mb-2 tracking-tighter">{t(drug.nameKey)}</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-500 font-black text-lg">
                          <ShoppingCart size={18} />
                          <span>{formatMoney(drug.price)}</span>
                        </div>
                        <div className="bg-zinc-800/50 px-3 py-1 rounded-lg border border-zinc-700/50 text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                          {t('hospital.owned', { count: profile?.inventory?.drugs?.[drug.id] || 0 })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 mt-auto">
                      <button
                        onClick={() => handleBuyDrug(drug)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20"
                      >
                        <ShoppingCart size={18} />
                        {t('hospital.buy')}
                      </button>
                      {profile?.inventory?.drugs?.[drug.id] > 0 && (
                        <button
                          onClick={() => handleUseDrug(drug)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-3 border border-zinc-700"
                        >
                          <Check size={18} />
                          {t('hospital.use')}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Medical Sections Content */
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <currentSection.icon size={40} className={`text-${currentSection.color}-500`} />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-2xl font-black uppercase italic mb-2">{t('hospital.inRecovery')}</h4>
                <p className="text-zinc-500 font-medium mb-8">{t('hospital.recoveryDesc')}</p>
                
                <button
                  onClick={handleHeal}
                  disabled={health >= 100}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-3 ${
                    health >= 100 
                      ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      : `bg-${currentSection.color}-600 hover:bg-${currentSection.color}-500 text-white shadow-[0_0_30px_rgba(0,0,0,0.3)]`
                  }`}
                >
                  <Heart size={20} />
                  <span>{t('hospital.healAction', { cost: formatMoney(Math.floor((health === 0 ? 100000 : 10000) * getVIPDiscount(profile?.vipLevel as any))) })}</span>
                </button>
              </div>
            </div>
          )}
        </div>




      {/* Edit Image Modal */}
      <AnimatePresence>
        {isEditingImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingImage(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <h3 className="text-2xl font-black uppercase italic mb-6">{t('hospital.changeImage')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">{t('family.imageUrl')}</label>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 transition-colors outline-none font-bold"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setIsEditingImage(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-black uppercase tracking-tighter text-zinc-500 hover:text-white transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleUpdateImage}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-tighter shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


