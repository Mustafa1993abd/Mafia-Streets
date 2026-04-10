import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { User, Shield, Target, Car, Building2, Users, Calendar, Camera, CreditCard, Award, ShieldCheck, Siren, Globe, ChevronRight, Search, Edit3, Dumbbell, Activity, Wind, FileText, X, Check, Smartphone, Zap, Radio, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatNumberExact, formatMoney, safeToDate } from '../lib/utils';
import { doc, updateDoc, getDoc, query, collection, getDocs, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import PlayerAvatar from '../components/PlayerAvatar';
import clsx from 'clsx';
import { getReputationForLevel, getProgressToNextLevel } from '../lib/leveling';

import { COUNTRIES } from '../constants/countries';

import { MARKET_ITEMS } from '../lib/items';
import { ALL_PRODUCTS } from '../lib/mallItems';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, equipItem, unequipItem, calculatePower, calculateDefense, repairArmor } = useAuthStore();
  const [isSelectingCountry, setIsSelectingCountry] = useState(false);
  const [isEditingBirthdate, setIsEditingBirthdate] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [birthdate, setBirthdate] = useState(profile?.birthdate || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [hasESim, setHasESim] = useState(profile?.hasESim || false);
  const [isSelectingItem, setIsSelectingItem] = useState<{ type: 'weapon1' | 'weapon2' | 'armor' | 'vehicle' | 'stimulant' | 'phone' | 'sim', open: boolean }>({ type: 'weapon1', open: false });
  const [searchCountry, setSearchCountry] = useState('');
  const [imageUrl, setImageUrl] = useState(profile?.photoURL || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || '');
  const [newMotto, setNewMotto] = useState(profile?.motto || '');
  const [gangName, setGangName] = useState<string | null>(null);
  const [customProducts, setCustomProducts] = useState<any[]>([]);
  const [telecomCompany, setTelecomCompany] = useState<any>(null);
  const [loadingTelecom, setLoadingTelecom] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'gang_companies'), where('ownerId', '==', profile.uid), where('type', '==', 'telecom'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setTelecomCompany({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setTelecomCompany(null);
      }
      setLoadingTelecom(false);
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    const fetchCustomProducts = async () => {
      try {
        const q = query(collection(db, 'custom_products'));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomProducts(products);
      } catch (error) {
        console.error("Error fetching custom products:", error);
      }
    };
    fetchCustomProducts();
  }, []);

  const combinedProducts = [...ALL_PRODUCTS, ...customProducts];

  const getEquippedItemDetails = (slotId: string) => {
    const itemId = profile?.equipped?.[slotId as keyof typeof profile.equipped];
    if (!itemId) return null;

    // Check mall
    const mallItem = combinedProducts.find(p => p.id === itemId);
    if (mallItem) return { ...mallItem, source: 'mall' };

    // Check stash
    const weapon = MARKET_ITEMS.weapons.find(w => w.id === itemId);
    if (weapon) return { ...weapon, source: 'stash' };

    const armor = MARKET_ITEMS.armor.find(a => a.id === itemId);
    if (armor) return { ...armor, source: 'stash' };

    return null;
  };

  const getAvatarBaseUrl = () => {
    const clothingItem = getEquippedItemDetails('clothing');
    if (clothingItem) return clothingItem.layerImage || clothingItem.image;

    // Default base avatar
    return `https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkNDIzN2YyZmY0ODE5MTgxN2IzZWFjN2VkNzBiODU6ZmlsZV8wMDAwMDAwMGQzZmM3MjQ2OGVlODJlNThhN2FhMDI5OSIsInRzIjoiMjA1NDkiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImJkOGZjNDM0ZTViODdjMGU1ZTZmYWEwNjA5NTI3ZjNjZjU0ZjMxZWVlMjkzZjBhODJjNDU0YjBiODI2YjAyNjUiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9`;
  };

  useEffect(() => {
    setBirthdate(profile?.birthdate || '');
    setPhoneNumber(profile?.phoneNumber || '');
    setHasESim(profile?.hasESim || false);
    setImageUrl(profile?.photoURL || '');
    setNewName(profile?.displayName || '');
    setNewMotto(profile?.motto || '');
  }, [profile]);

  useEffect(() => {
    const fetchGangName = async () => {
      if (!profile?.gangId) {
        setGangName(null);
        return;
      }

      try {
        const gangDoc = await getDoc(doc(db, 'gangs', profile.gangId));
        if (gangDoc.exists()) {
          setGangName(gangDoc.data().name);
        }
      } catch (error) {
        console.error('Error fetching gang name:', error);
      }
    };

    fetchGangName();
  }, [profile?.gangId]);

  if (!profile) return null;

  const nextLevelRep = getReputationForLevel(profile.level + 1);
  const progress = getProgressToNextLevel(profile.reputation, profile.level);

  const getGangDisplay = () => {
    if (!profile.gangId) return t('playerProfile.none');
    if (!gangName) return '...';
    
    const role = profile.gangRole === 'leader' ? t('gangs.leader') : t('gangs.member');
    return `${role} - ${gangName}`;
  };

  const handleEquip = async (type: string, itemId: string) => {
    await equipItem(type, itemId);
    toast.success(t('common.success'));
    setIsSelectingItem({ ...isSelectingItem, open: false });
  };

  const handleUnequip = async (type: string) => {
    await unequipItem(type);
    toast.success(t('common.success'));
  };

  const handleRepairArmor = async () => {
    if (!profile) return;
    const cost = 5000; // Fixed cost for now, could be dynamic
    if (profile.cleanMoney < cost) {
      toast.error(t('market.notEnoughMoney'));
      return;
    }
    await repairArmor(cost);
  };

  const getItemName = (id: string) => {
    if (!id) return undefined;
    
    // First, search in all categories for an exact match
    for (const category of Object.values(MARKET_ITEMS)) {
      const item = (category as any[]).find((i: any) => i.id === id);
      if (item) return item.name;
    }

    // If not found, check if it's a variant (e.g., p1_256GB or special_iphone_gold_1TB)
    if (id.includes('_')) {
      const parts = id.split('_');
      // Try to find the longest prefix that matches an item ID
      for (let i = parts.length - 1; i > 0; i--) {
        const baseId = parts.slice(0, i).join('_');
        for (const category of Object.values(MARKET_ITEMS)) {
          const item = (category as any[]).find((i: any) => i.id === baseId);
          if (item) return item.name;
        }
      }
    }

    return t(`items.${id}`) || id;
  };

  const getItemImage = (id: string) => {
    if (!id) return undefined;

    // First, search in all categories for an exact match
    for (const category of Object.values(MARKET_ITEMS)) {
      const item = (category as any[]).find((i: any) => i.id === id);
      if (item && item.image) return item.image;
    }

    // If not found, check if it's a variant
    if (id.includes('_')) {
      const parts = id.split('_');
      for (let i = parts.length - 1; i > 0; i--) {
        const baseId = parts.slice(0, i).join('_');
        for (const category of Object.values(MARKET_ITEMS)) {
          const item = (category as any[]).find((i: any) => i.id === baseId);
          if (item && item.image) return item.image;
        }
      }
    }

    // Special case for SIM
    if (/^\d{8}$/.test(id)) {
      return 'https://cdn-icons-png.flaticon.com/512/5608/5608615.png';
    }

    return undefined;
  };

  const getInventoryItems = (type: 'weapon1' | 'weapon2' | 'armor' | 'vehicle' | 'stimulant' | 'phone' | 'sim') => {
    if (!profile.inventory) return [];
    
    let items: { id: string, count: number }[] = [];
    if (type === 'weapon1' || type === 'weapon2') {
      items = Object.entries(profile.inventory.weapons || {}).map(([id, count]) => ({ id, count }));
    } else if (type === 'armor') {
      items = Object.entries(profile.inventory.armor || {}).map(([id, count]) => ({ id, count }));
    } else if (type === 'vehicle') {
      items = Object.entries(profile.inventory.cars || {}).map(([id, count]) => ({ id, count }));
    } else if (type === 'stimulant') {
      items = Object.entries(profile.inventory.drugs || {}).map(([id, count]) => ({ id, count }));
    } else if (type === 'phone') {
      items = Object.entries(profile.inventory.phones || {}).map(([id, count]) => ({ id, count }));
    } else if (type === 'sim') {
      items = Object.entries(profile.inventory.sims || {}).map(([id, count]) => ({ id, count }));
    }
    
    return items.filter(item => item.count > 0);
  };

  const onUpdateImage = async () => {
    if (!profile.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), { 
        photoURL: imageUrl,
        isAvatarPinned: false 
      });
      await updateDoc(doc(db, 'users_public', profile.uid), { photoURL: imageUrl });
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const onUpdateBirthdate = async () => {
    if (!profile.uid) return;
    if (!birthdate) {
      toast.error(t('common.error'));
      return;
    }
    try {
      await updateDoc(doc(db, 'users', profile.uid), { birthdate });
      toast.success(t('common.success'));
      setIsEditingBirthdate(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      let errorMsg = error.message || t('common.failed');
      if (errorMsg.includes('The string did not match the expected pattern')) {
        errorMsg = t('errors.patternMismatch');
      }
      toast.error(errorMsg);
    }
  };

  const onUpdatePhone = async () => {
    if (!profile.uid) return;
    
    // Validate phone number is exactly 8 digits
    const phoneRegex = /^\d{8}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      toast.error(t('يرجى إدخال رقم هاتف مكون من 8 أرقام فقط'));
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), { 
        phoneNumber: phoneNumber.trim(),
        hasESim: hasESim 
      });
      
      // Update public profile as well
      await updateDoc(doc(db, 'users_public', profile.uid), {
        phoneNumber: phoneNumber.trim(),
        hasESim: hasESim
      });

      toast.success(t('common.success'));
      setIsEditingPhone(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };
  
  const checkWeeklyLimit = (history: number[] | undefined, limit: number) => {
    if (!history) return true;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentChanges = history.filter(ts => ts > oneWeekAgo);
    return recentChanges.length < limit;
  };

  const onUpdateName = async () => {
    if (!profile.uid || !newName.trim()) return;
    
    if (!checkWeeklyLimit(profile.nameChangeHistory, 3)) {
      toast.error(t('profile.nameChangeLimit') || 'You can only change your name 3 times per week');
      return;
    }

    try {
      const history = [...(profile.nameChangeHistory || []), Date.now()];
      await updateDoc(doc(db, 'users', profile.uid), { 
        displayName: newName.trim(),
        nameChangeHistory: history
      });
      toast.success(t('common.success'));
      setIsEditingName(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const onUpdateMotto = async () => {
    if (!profile.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), { motto: newMotto.trim() });
      toast.success(t('common.success'));
      setIsEditingMotto(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const onSelectCountry = async (countryCode: string) => {
    if (!profile.uid) return;
    
    if (!checkWeeklyLimit(profile.countryChangeHistory, 2)) {
      toast.error(t('profile.countryChangeLimit') || 'You can only change your country 2 times per week');
      return;
    }

    try {
      const history = [...(profile.countryChangeHistory || []), Date.now()];
      await updateDoc(doc(db, 'users', profile.uid), { 
        country: countryCode,
        countryChangeHistory: history
      });
      toast.success(t('common.success'));
      setIsSelectingCountry(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(profile.uid);
    toast.success(t('common.copied') || 'تم النسخ');
  };

  const currentCountry = COUNTRIES.find(c => c.code === profile.country);
  const filteredCountries = COUNTRIES.filter(c => 
    (c.name || '').toLowerCase().includes((searchCountry || '').toLowerCase()) || 
    (c.nameAr || '').includes(searchCountry || '')
  );

  return (
    <div className="text-white space-y-4 max-w-4xl mx-auto pb-20 px-2">
      {/* Header Section - Compact & Mafia Style */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 border border-red-900/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop" 
            alt="Mafia Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Avatar with Neon Glow */}
          <div className="relative group">
            <PlayerAvatar
              photoURL={imageUrl || profile.photoURL}
              displayName={profile.displayName}
              vipLevel={profile.vipLevel}
              size="4xl"
              className="shadow-[0_0_50px_rgba(220,38,38,0.4)]"
            />
            <button 
              onClick={() => setIsEditingPhoto(true)}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-10"
            >
              <Camera size={24} className="text-white" />
            </button>
            <button 
              onClick={() => setIsEditingPhoto(true)}
              className="absolute bottom-0 right-0 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center border-4 border-zinc-950 hover:bg-red-500 transition-colors shadow-lg z-20"
            >
              <Camera size={16} className="text-white" />
            </button>
          </div>

          <div className="text-center space-y-3 w-full">
            {isEditingName ? (
              <div className="flex items-center gap-2 justify-center">
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-zinc-900 border border-red-600/50 rounded-xl px-4 py-1 text-xl font-black text-center focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <button onClick={onUpdateName} className="p-2 bg-red-600 rounded-lg"><Check size={18} /></button>
                <button onClick={() => setIsEditingName(false)} className="p-2 bg-zinc-800 rounded-lg"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 group">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {profile.displayName}
                </h3>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 bg-zinc-900/50 rounded-lg hover:bg-red-600/20 text-zinc-500 hover:text-red-500 transition-all"
                    title="تغيير الاسم"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button onClick={copyId} className="p-1.5 bg-zinc-900/50 rounded-lg hover:bg-zinc-800 transition-colors" title="نسخ المعرف">
                    <FileText size={14} className="text-zinc-500" />
                  </button>
                </div>
              </div>
            )}

            {/* Motto Section */}
            <div className="max-w-xs mx-auto">
              {isEditingMotto ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={newMotto}
                    onChange={(e) => setNewMotto(e.target.value)}
                    placeholder="اكتب شعارك هنا..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-[10px] text-center focus:border-red-600 outline-none"
                  />
                  <button onClick={onUpdateMotto} className="p-1.5 bg-red-600 rounded-lg"><Check size={12} /></button>
                </div>
              ) : (
                <p 
                  onClick={() => setIsEditingMotto(true)}
                  className="text-[11px] font-medium text-zinc-400 italic cursor-pointer hover:text-red-400 transition-colors"
                >
                  "{profile.motto || 'لا يوجد شعار بعد...'}"
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <div className="px-3 py-0.5 bg-red-600/20 text-red-500 rounded-full border border-red-600/30 text-[10px] font-black uppercase tracking-widest">
                {t(`roles.${profile.role}`)}
              </div>
              <button 
                onClick={() => setIsSelectingCountry(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900/80 rounded-full border border-zinc-800 hover:border-red-600/50 transition-all group"
              >
                {profile.country && (
                  <img 
                    src={`https://flagcdn.com/w40/${profile.country}.png`} 
                    alt={profile.country}
                    className="w-4 h-auto rounded-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-[9px] font-bold text-zinc-400 group-hover:text-white transition-colors">
                  {i18n.language === 'ar' ? currentCountry?.nameAr : currentCountry?.name}
                </span>
                <Globe size={10} className="text-zinc-600 group-hover:text-red-500" />
              </button>
            </div>
          </div>

          {/* Level & Reputation Bar - Compact */}
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('profile.level')} {profile.level}</span>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{formatNumber(profile.reputation)} XP</span>
            </div>
            <div className="relative h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="absolute h-full bg-gradient-to-r from-red-800 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              />
            </div>
          </div>


        </div>
      </div>

      {/* Stats Grid - Compact & Modern */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ProfileStat 
          label="القوة القتالية" 
          value={formatNumberExact(calculatePower(profile))} 
          icon={Target} 
          color="red"
          bgImage="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=200&auto=format&fit=crop"
        />
        <ProfileStat 
          label="الدفاع" 
          value={formatNumberExact(calculateDefense(profile))} 
          icon={Shield} 
          color="blue"
          bgImage="https://images.unsplash.com/photo-1557597774-9d2739f85a76?q=80&w=200&auto=format&fit=crop"
        />
        <ProfileStat 
          label="عمليات السرقة" 
          value={profile.crimes.theft.toString()} 
          icon={Activity} 
          color="yellow"
          bgImage="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop"
        />
        <ProfileStat 
          label="الاغتيالات" 
          value={profile.crimes.kills.toString()} 
          icon={Siren} 
          color="red"
          bgImage="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=200&auto=format&fit=crop"
        />
      </div>

      {/* Equipment & Inventory Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-zinc-950/50 backdrop-blur-md rounded-3xl border border-zinc-800 p-5">
            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <Shield size={16} className="text-red-600" />
              تجهيزات المعركة
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <EquipmentSlot 
                label="السلاح الأساسي" 
                type="weapon1"
                itemId={profile.equipped?.weapon1} 
                itemName={profile.equipped?.weapon1 ? getItemName(profile.equipped.weapon1) : undefined}
                itemImage={profile.equipped?.weapon1 ? getItemImage(profile.equipped.weapon1) : undefined}
                onEquip={() => setIsSelectingItem({ type: 'weapon1', open: true })} 
                onUnequip={() => handleUnequip('weapon1')} 
              />
              <EquipmentSlot 
                label="السلاح الثانوي" 
                type="weapon2"
                itemId={profile.equipped?.weapon2} 
                itemName={profile.equipped?.weapon2 ? getItemName(profile.equipped.weapon2) : undefined}
                itemImage={profile.equipped?.weapon2 ? getItemImage(profile.equipped.weapon2) : undefined}
                onEquip={() => setIsSelectingItem({ type: 'weapon2', open: true })} 
                onUnequip={() => handleUnequip('weapon2')} 
              />
              <EquipmentSlot 
                label="الدرع الواقي" 
                type="armor"
                itemId={profile.equipped?.armor} 
                itemName={profile.equipped?.armor ? getItemName(profile.equipped.armor) : undefined}
                itemImage={profile.equipped?.armor ? getItemImage(profile.equipped.armor) : undefined}
                health={profile.armorHealth}
                onEquip={() => setIsSelectingItem({ type: 'armor', open: true })} 
                onUnequip={() => handleUnequip('armor')} 
                onRepair={handleRepairArmor}
              />
              <EquipmentSlot 
                label="المركبة" 
                type="vehicle"
                itemId={profile.equipped?.vehicle} 
                itemName={profile.equipped?.vehicle ? getItemName(profile.equipped.vehicle) : undefined}
                itemImage={profile.equipped?.vehicle ? getItemImage(profile.equipped.vehicle) : undefined}
                onEquip={() => setIsSelectingItem({ type: 'vehicle', open: true })} 
                onUnequip={() => handleUnequip('vehicle')} 
              />
              <EquipmentSlot 
                label="المنشطات" 
                type="stimulant"
                itemId={profile.equipped?.stimulant} 
                itemName={profile.equipped?.stimulant ? getItemName(profile.equipped.stimulant) : undefined}
                itemImage={profile.equipped?.stimulant ? getItemImage(profile.equipped.stimulant) : undefined}
                onEquip={() => setIsSelectingItem({ type: 'stimulant', open: true })} 
                onUnequip={() => handleUnequip('stimulant')} 
              />
              <EquipmentSlot 
                label="الهاتف" 
                type="phone"
                itemId={profile.equipped?.phone} 
                itemName={profile.equipped?.phone ? getItemName(profile.equipped.phone) : undefined}
                itemImage={profile.equipped?.phone ? getItemImage(profile.equipped.phone) : undefined}
                onEquip={() => setIsSelectingItem({ type: 'phone', open: true })} 
                onUnequip={() => handleUnequip('phone')} 
              />
              <EquipmentSlot 
                label="شريحة eSIM" 
                type="sim"
                itemId={profile.equipped?.sim} 
                itemName={profile.equipped?.sim}
                itemImage={profile.equipped?.sim ? getItemImage(profile.equipped.sim) : undefined}
                onEquip={() => setIsSelectingItem({ type: 'sim', open: true })} 
                onUnequip={() => handleUnequip('sim')} 
              />
            </div>
          </div>

          {/* Telecom Company Section */}
          <div className="bg-zinc-950/50 backdrop-blur-md rounded-3xl border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Radio size={16} className="text-sky-500" />
                شركة الاتصالات
              </h4>
              <button 
                onClick={() => navigate('/companies')}
                className="text-[10px] font-black text-sky-500 hover:text-sky-400 transition-colors uppercase tracking-widest"
              >
                {telecomCompany ? 'إدارة الشركة' : 'إنشاء شركة'}
              </button>
            </div>

            {telecomCompany ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-sky-500/5 rounded-2xl border border-sky-500/20">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-sky-500/30">
                    <img src={telecomCompany.logoUrl} alt={telecomCompany.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-black text-white">{telecomCompany.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                        <Users size={10} className="text-sky-500" />
                        <span>{formatNumber(telecomCompany.subscribers || 0)} مشترك</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                        <Zap size={10} className="text-yellow-500" />
                        <span>إشارة: {telecomCompany.signalStrength || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-zinc-700" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">الأبراج</div>
                    <div className="text-lg font-black text-white">{telecomCompany.towers || 0}</div>
                  </div>
                  <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">السيرفرات</div>
                    <div className="text-lg font-black text-white">{telecomCompany.servers || 0}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                <Radio size={32} className="text-zinc-800 mx-auto mb-3" />
                <p className="text-[10px] font-bold text-zinc-500 max-w-[200px] mx-auto">
                  لم تقم بإنشاء شركة اتصالات بعد. ابدأ بإنتاج الهواتف والشرائح الآن.
                </p>
                <button 
                  onClick={() => navigate('/companies')}
                  className="mt-4 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-widest"
                >
                  إنشاء شركة (500K$)
                </button>
              </div>
            )}
          </div>

          {/* Avatar Display - New Section */}
          <div className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl border border-zinc-800 p-6 flex flex-col items-center gap-4">
            <div className="relative w-48 h-96 bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 shadow-2xl group">
              <img 
                src={getAvatarBaseUrl()} 
                alt="Avatar" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <button 
              onClick={() => navigate('/character')}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              <Edit3 size={18} />
              تغيير الأفاتار
            </button>
          </div>

          {/* Physique Stats - Compact */}
          <div 
            onClick={() => navigate('/gym')}
            className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl border border-zinc-800 p-5 hover:border-red-600/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Dumbbell size={16} className="text-red-600" />
                البنية الجسدية
              </h4>
              <ChevronRight size={16} className="text-zinc-600 group-hover:text-red-500 transition-colors" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "القوة", value: profile.gymStats?.strength || 0, color: 'text-red-500' },
                { label: "التحمل", value: profile.gymStats?.endurance || 0, color: 'text-yellow-500' },
                { label: "السرعة", value: profile.gymStats?.speed || 0, color: 'text-blue-500' },
                { label: "الصلابة", value: profile.gymStats?.toughness || 0, color: 'text-green-500' },
              ].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">{stat.label}</span>
                  <div className={`text-lg font-black ${stat.color}`}>{formatNumber(stat.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Documents & Info */}
        <div className="space-y-4">
          <div className="bg-zinc-950/50 backdrop-blur-md rounded-3xl border border-zinc-800 p-5">
            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-red-600" />
              السجل المدني
            </h4>
            <div className="space-y-3">
              {/* Birthdate Section */}
              <div className="p-3 bg-black/40 rounded-2xl border border-zinc-800/50 group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-red-600" />
                    <span className="text-[10px] font-black uppercase text-zinc-500">تاريخ الميلاد</span>
                  </div>
                  <button 
                    onClick={() => setIsEditingBirthdate(!isEditingBirthdate)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    تعديل
                  </button>
                </div>
                {isEditingBirthdate ? (
                  <div className="flex gap-2 mt-2">
                    <input 
                      type="date" 
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs outline-none focus:border-red-600"
                    />
                    <button onClick={onUpdateBirthdate} className="p-1.5 bg-red-600 rounded-lg"><Check size={14} /></button>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-zinc-200">{profile.birthdate || 'غير محدد'}</div>
                )}
              </div>

              {/* Phone Number Section */}
              <div className="p-3 bg-black/40 rounded-2xl border border-zinc-800/50 group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Smartphone size={14} className="text-purple-500" />
                    <span className="text-[10px] font-black uppercase text-zinc-500">رقم الهاتف و eSIM</span>
                  </div>
                  <button 
                    onClick={() => setIsEditingPhone(!isEditingPhone)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    تعديل
                  </button>
                </div>
                {isEditingPhone ? (
                  <div className="space-y-3 mt-2">
                    <input 
                      type="text" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="أدخل رقم الهاتف..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs outline-none focus:border-red-600"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">تفعيل eSIM</span>
                      <button 
                        onClick={() => setHasESim(!hasESim)}
                        className={clsx(
                          "w-10 h-5 rounded-full transition-colors relative",
                          hasESim ? "bg-green-600" : "bg-zinc-700"
                        )}
                      >
                        <div className={clsx(
                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                          hasESim ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                    <button 
                      onClick={onUpdatePhone}
                      className="w-full bg-red-600 hover:bg-red-700 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors"
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-zinc-200 font-mono tracking-wider">
                      {profile.phoneNumber || 'لا يوجد رقم هاتف'}
                    </div>
                    {profile.hasESim && (
                      <div className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase">
                        <Zap size={10} />
                        eSim
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <DocumentItem icon={CreditCard} label="بطاقة الهوية" isOwned={!!(profile.documents?.idCard || profile.documents?.clearance)} />
                <DocumentItem icon={Globe} label="جواز السفر" isOwned={!!profile.documents?.passport} />
                <DocumentItem icon={ShieldCheck} label="رخصة القيادة" isOwned={!!(profile.documents?.driverLicense || profile.documents?.license)} />
                <DocumentItem icon={Siren} label="رخصة سلاح" isOwned={!!(profile.documents?.weaponLicense || profile.documents?.weapon)} />
                <DocumentItem icon={Award} label="براءة ذمة" isOwned={!!profile.documents?.clearance} />
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/50 backdrop-blur-md rounded-3xl border border-zinc-800 p-5">
            <div className="flex items-center gap-3 text-zinc-500">
              <Calendar size={16} className="text-red-600" />
              <div className="text-[9px] font-black uppercase tracking-widest">
                تاريخ الانضمام: {profile.createdAt ? format(safeToDate(profile.createdAt), 'yyyy/MM/dd') : 'غير معروف'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals remain same logic but styled */}
      <AnimatePresence>
        {isSelectingCountry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900 border border-red-900/30 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.2)]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <h3 className="text-lg font-black uppercase tracking-tight text-red-500">اختر الدولة</h3>
                <button onClick={() => setIsSelectingCountry(false)} className="p-2 hover:bg-zinc-800 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    type="text" 
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    placeholder="ابحث عن دولة..."
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl ps-12 pe-4 py-2.5 text-sm focus:border-red-600 outline-none transition-all"
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar space-y-1 pe-2">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => onSelectCountry(country.code)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${profile.country === country.code ? 'bg-red-600/10 border-red-600/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={`https://flagcdn.com/w40/${country.code}.png`} alt="" className="w-6 h-auto rounded-sm" referrerPolicy="no-referrer" />
                        <span className="text-sm font-bold">{i18n.language === 'ar' ? country.nameAr : country.name}</span>
                      </div>
                      {profile.country === country.code && <ShieldCheck className="text-red-500" size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSelectingItem.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900 border border-red-900/30 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.2)]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <h3 className="text-lg font-black uppercase tracking-tight text-red-500">تجهيز المعدات</h3>
                <button onClick={() => setIsSelectingItem({ ...isSelectingItem, open: false })} className="p-2 hover:bg-zinc-800 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                {getInventoryItems(isSelectingItem.type).length > 0 ? (
                  getInventoryItems(isSelectingItem.type).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleEquip(isSelectingItem.type, item.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border bg-black/20 border-zinc-800/50 hover:border-red-600/50 transition-all group"
                    >
                      <div className="flex items-center gap-4 text-start">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-red-600/10 transition-colors">
                          {isSelectingItem.type === 'vehicle' ? <Car size={20} /> : 
                           (isSelectingItem.type === 'phone' || isSelectingItem.type === 'sim') ? <Smartphone size={20} /> :
                           <Shield size={20} />}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{getItemName(item.id)}</div>
                          <div className="text-[10px] text-zinc-500">الكمية: {item.count}</div>
                        </div>
                      </div>
                      <ChevronRight className="text-zinc-600 group-hover:text-red-500 transition-colors" size={18} />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    <p className="text-sm">لا توجد معدات متوفرة في مخزنك</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(220,38,38,0.2)]"
            >
              <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Camera size={24} className="text-red-500" />
                تغيير الصورة
              </h3>
              <p className="text-zinc-400 text-sm">أدخل رابط الصورة الجديد (يجب أن يكون رابط مباشر للصورة):</p>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-600 outline-none transition-all"
                dir="ltr"
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    onUpdateImage();
                    setIsEditingPhoto(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-colors"
                >
                  حفظ
                </button>
                <button
                  onClick={() => {
                    setImageUrl(profile?.photoURL || '');
                    setIsEditingPhoto(false);
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileStat({ label, value, icon: Icon, color = "red", bgImage }: { label: string, value: string, icon?: any, color?: string, bgImage?: string }) {
  return (
    <div className="relative group overflow-hidden bg-zinc-900/40 backdrop-blur-md p-4 rounded-[1.5rem] border border-zinc-800/50 hover:border-red-600/50 transition-all duration-500">
      {bgImage && (
        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <img src={bgImage} alt="" className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-zinc-500">
          {Icon && <Icon size={12} className={`text-${color}-500`} />}
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className={`text-xl font-black tracking-tighter text-white group-hover:text-red-500 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function EquipmentSlot({ label, type, itemId, itemName, itemImage, health, onEquip, onUnequip, onRepair }: { label: string, type: string, itemId?: string, itemName?: string, itemImage?: string, health?: number, onEquip: () => void, onUnequip: () => void, onRepair?: () => void }) {
  const { t } = useTranslation();
  
  const isPhone = type === 'phone';
  const isSim = type === 'sim';
  
  // Base border colors
  const defaultBorder = isPhone || isSim ? 'border-purple-600/50 shadow-[0_0_10px_rgba(147,51,234,0.3)]' : 'border-red-600/50 shadow-[0_0_10px_rgba(220,38,38,0.3)]';
  const activeBorder = isPhone || isSim ? 'active:border-purple-400 active:shadow-[0_0_20px_rgba(168,85,247,0.8)]' : 'active:border-yellow-400 active:shadow-[0_0_20px_rgba(250,204,21,0.8)]';

  return (
    <div 
      className={`min-h-[120px] bg-black/40 p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 relative group overflow-hidden transition-all duration-300 cursor-pointer ${defaultBorder} ${activeBorder}`}
      onClick={itemId ? undefined : onEquip}
    >
      {/* Background Image if equipped */}
      {itemId && itemImage && (
        <div className="absolute inset-0 z-0">
          <img 
            src={itemImage} 
            alt="" 
            className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>
      )}

      {/* Default gradient hover if no item */}
      {!itemId && (
        <div className={`absolute inset-0 bg-gradient-to-b ${isPhone || isSim ? 'from-purple-600/10' : 'from-red-600/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      )}

      <div className="text-zinc-300 text-[10px] font-black uppercase tracking-widest relative z-10 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">{label}</div>
      
      <div className="text-xs font-bold text-center flex-1 flex items-center justify-center text-white relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
        {itemName || '---'}
      </div>
      
      {itemId && health !== undefined && (
        <div className="w-full px-2 space-y-1 mb-1 relative z-10">
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className={`h-full transition-all duration-500 ${health < 30 ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}
              style={{ width: `${Math.min(100, health)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 relative z-10 w-full justify-center">
        {itemId ? (
          <>
            <button onClick={(e) => { e.stopPropagation(); onUnequip(); }} className="bg-red-600/80 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-colors shadow-lg backdrop-blur-sm">نزع</button>
            {onRepair && health !== undefined && health < 100 && (
              <button onClick={(e) => { e.stopPropagation(); onRepair(); }} className="bg-blue-600/80 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-colors shadow-lg backdrop-blur-sm">إصلاح</button>
            )}
          </>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onEquip(); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-colors shadow-lg backdrop-blur-sm text-white ${isPhone || isSim ? 'bg-purple-600/80 hover:bg-purple-500' : 'bg-green-600/80 hover:bg-green-500'}`}>تجهيز</button>
        )}
      </div>
    </div>
  );
}

function DocumentItem({ icon: Icon, label, isOwned }: { icon: any, label: string, isOwned: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isOwned ? 'bg-red-600/5 border-red-600/20' : 'bg-zinc-950 border-zinc-800 opacity-40'}`}>
      <div className="flex items-center gap-3">
        <Icon size={14} className={isOwned ? 'text-red-500' : 'text-zinc-600'} />
        <span className={`text-xs font-bold ${isOwned ? 'text-zinc-200' : 'text-zinc-600'}`}>{label}</span>
      </div>
      {isOwned && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
    </div>
  );
}
