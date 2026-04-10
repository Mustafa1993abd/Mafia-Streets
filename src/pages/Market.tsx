import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Shield, Crosshair, Car, Wrench, Pill, Edit2, Image as ImageIcon, Save, X, Landmark, Coffee, Smartphone, RefreshCw, Eye, EyeOff, Gift, Search, User, Loader2, Crown, Monitor, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, onSnapshot, collection, setDoc, increment, query, where, getDocs, limit, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

import { MARKET_ITEMS } from '../lib/items';

export default function Market() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'drugs' | 'weapons' | 'cars' | 'armor' | 'tools' | 'supplements' | 'phones' | 'computers'>('weapons');
  const [customProducts, setCustomProducts] = useState<any[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    type: '',
    image: '',
    category: 'weapons',
    specs: '',
    power: 0,
    price: 0,
    hidden: false,
    rare: false
  });
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [govData, setGovData] = useState<any>(null);
  
  // Gifting state
  const [isGifting, setIsGifting] = useState(false);
  const [giftingItem, setGiftingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playerSuggestions, setPlayerSuggestions] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessingGift, setIsProcessingGift] = useState(false);
  
  // Phone selection state
  const [selectedMemory, setSelectedMemory] = useState<Record<string, string>>({});
  const [selectedSim, setSelectedSim] = useState<Record<string, string>>({});
  
  // eSIM state
  const [randomPhoneNumber, setRandomPhoneNumber] = useState('');
  const [buying, setBuying] = useState<string | null>(null);

  const generateRandomPhoneNumber = () => {
    const randomNum = Math.floor(Math.random() * 100000000);
    return randomNum.toString().padStart(8, '0');
  };

  useEffect(() => {
    setRandomPhoneNumber(generateRandomPhoneNumber());
  }, []);

  const isAdmin = profile?.role === 'Admin' || user?.email === 'mx779969@gmail.com' || user?.email === 'j7primemustafa@gmail.com' || user?.email === 'zoomnet5@gmail.com' || user?.email === 'm07821779969@gmail.com' || user?.email === 'nttn642@gmail.com' || user?.email === 'nwyyttt@gmail.com' || profile?.displayName?.toLowerCase() === 'mustafa';

  useEffect(() => {
    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists()) setGovData(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });
    return () => unsubGov();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const unsubscribe = onSnapshot(collection(db, 'market_overrides'), (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setOverrides(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'market_overrides');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubCustom = onSnapshot(collection(db, 'custom_products'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomProducts(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'custom_products');
    });
    return () => unsubCustom();
  }, []);

  const handleSaveProduct = async () => {
    if (!isAdmin) return;
    if (!productForm.name || !productForm.price) {
      toast.error('يرجى ملء الحقول الأساسية');
      return;
    }

    try {
      if (editingCustomId) {
        // Update existing custom product
        await updateDoc(doc(db, 'custom_products', editingCustomId), {
          ...productForm,
          updatedAt: serverTimestamp()
        });
        toast.success('تم تحديث المنتج بنجاح');
      } else if (editingItem) {
        // Update static product override
        await setDoc(doc(db, 'market_overrides', editingItem), {
          ...productForm,
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast.success('تم تحديث مواصفات المنتج بنجاح');
      } else {
        // Add new custom product
        await addDoc(collection(db, 'custom_products'), {
          ...productForm,
          createdAt: serverTimestamp()
        });
        toast.success('تم إضافة المنتج بنجاح');
      }
      setIsAddingProduct(false);
      setEditingCustomId(null);
      setEditingItem(null);
      setProductForm({
        name: '',
        type: '',
        image: '',
        category: 'weapons',
        specs: '',
        power: 0,
        price: 0,
        hidden: false,
        rare: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingItem ? 'market_overrides' : 'custom_products');
    }
  };

  const handleBuy = async (item: any) => {
    if (!profile || buying) return;
    
    // Apply Visa discount
    let finalPrice = item.price;
    if (profile.visaCard) {
      const { type } = profile.visaCard;
      if (['Platinum', 'Signature', 'Infinite'].includes(type)) {
        finalPrice = Math.floor(item.price * 0.95); // 5% discount
      }
    }
    
    // Apply Tax Holiday discount
    if (govData?.taxHoliday) {
      finalPrice = Math.floor(finalPrice * 0.90); // 10% discount
    }

    // Check VIP requirement for rare items
    if (item.rare && !profile.vipLevel) {
      toast.error('هذا العنصر متاح فقط لأعضاء VIP');
      return;
    }

    if (profile.cleanMoney < finalPrice) {
      toast.error(t('market.noMoney'));
      return;
    }

    setBuying(item.id);
    try {
      let updatePath = '';
      if (item.type === 'drugs') {
        updatePath = `inventory.drugs.${item.id}`;
      } else if (item.type === 'supplement') {
        updatePath = `inventory.supplements.${item.id}`;
      } else if (['pistol', 'rifle', 'shotgun', 'sniper', 'heavy'].includes(item.type)) {
        updatePath = `inventory.weapons.${item.id}`;
      } else if (item.type === 'armor') {
        updatePath = `inventory.armor.${item.id}`;
      } else if (item.type === 'tool') {
        updatePath = `inventory.tools.${item.id}`;
      } else if (['normal', 'suv', 'luxury', 'armored', 'sports'].includes(item.type)) {
        updatePath = `inventory.cars.${item.id}`;
      } else if (item.type === 'phone') {
        const memory = selectedMemory[item.id] || item.memoryOptions[0];
        const sim = selectedSim[item.id] || item.simOptions[0];
        updatePath = `inventory.phones.${item.id}_${memory}_${sim}`;
      }

      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-finalPrice),
        [updatePath]: increment(1)
      });
      toast.success(t('market.purchaseSuccess', { item: item.name, price: formatMoney(finalPrice) }));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setBuying(null);
    }
  };

  const handleToggleVisibility = async (itemId: string, currentHidden: boolean) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'market_overrides', itemId), {
        hidden: !currentHidden
      }, { merge: true });
      toast.success(!currentHidden ? 'تم إخفاء المنتج' : 'تم إظهار المنتج');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'market_overrides');
    }
  };

  const searchPlayers = async (queryStr: string) => {
    if (queryStr.length < 2) {
      setPlayerSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users_public'),
        where('displayName', '>=', queryStr),
        where('displayName', '<=', queryStr + '\uf8ff'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const players = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(p => p.uid !== profile?.uid);
      setPlayerSuggestions(players);
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGift = async () => {
    if (!profile || !selectedPlayer || !giftingItem || isProcessingGift) return;

    let finalPrice = giftingItem.price;
    if (profile.visaCard) {
      const { type } = profile.visaCard;
      if (['Platinum', 'Signature', 'Infinite'].includes(type)) {
        finalPrice = Math.floor(giftingItem.price * 0.95);
      }
    }
    if (govData?.taxHoliday) {
      finalPrice = Math.floor(finalPrice * 0.90);
    }

    if (profile.cleanMoney < finalPrice) {
      toast.error(t('market.noMoney'));
      return;
    }

    setIsProcessingGift(true);
    try {
      let updatePath = '';
      if (giftingItem.type === 'drugs') {
        updatePath = `inventory.drugs.${giftingItem.id}`;
      } else if (giftingItem.type === 'supplement') {
        updatePath = `inventory.supplements.${giftingItem.id}`;
      } else if (['pistol', 'rifle', 'shotgun', 'sniper', 'heavy'].includes(giftingItem.type)) {
        updatePath = `inventory.weapons.${giftingItem.id}`;
      } else if (giftingItem.type === 'armor') {
        updatePath = `inventory.armor.${giftingItem.id}`;
      } else if (giftingItem.type === 'tool') {
        updatePath = `inventory.tools.${giftingItem.id}`;
      } else if (['normal', 'suv', 'luxury', 'armored', 'sports'].includes(giftingItem.type)) {
        updatePath = `inventory.cars.${giftingItem.id}`;
      } else if (giftingItem.type === 'phone') {
        const memory = selectedMemory[giftingItem.id] || giftingItem.memoryOptions[0];
        const sim = selectedSim[giftingItem.id] || giftingItem.simOptions[0];
        updatePath = `inventory.phones.${giftingItem.id}_${memory}_${sim}`;
      }

      const response = await fetch('/api/market/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: profile.uid,
          recipientId: selectedPlayer.uid,
          item: {
            ...giftingItem,
            image: overrides[giftingItem.id]?.image || giftingItem.image
          },
          price: finalPrice,
          updatePath
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'فشل إرسال الهدية');

      toast.success(`تم إرسال الهدية إلى ${selectedPlayer.displayName} بنجاح!`);
      setIsGifting(false);
      setGiftingItem(null);
      setSelectedPlayer(null);
      setSearchQuery('');
    } catch (error: any) {
      toast.error(error.message || 'فشل إرسال الهدية');
    } finally {
      setIsProcessingGift(false);
    }
  };

  const tabs = [
    { id: 'drugs', icon: Pill, label: t('market.drugs') },
    { id: 'supplements', icon: Coffee, label: t('gym.supplements') },
    { id: 'weapons', icon: Crosshair, label: t('market.weapons') },
    { id: 'cars', icon: Car, label: t('market.cars') },
    { id: 'armor', icon: Shield, label: t('market.armor') },
    { id: 'tools', icon: Wrench, label: t('market.tools') },
    { id: 'phones', icon: Smartphone, label: t('market.phones') },
    { id: 'computers', icon: Monitor, label: t('market.computers') },
  ];

  const allItems = useMemo(() => {
    const base: Record<string, any[]> = { 
      ...MARKET_ITEMS, 
      computers: [] 
    };
    
    const result: Record<string, any[]> = {};
    
    // Initialize with shallow copies of static item arrays and apply overrides
    Object.keys(base).forEach(key => {
      result[key] = base[key].map(item => {
        if (overrides[item.id]) {
          return { ...item, ...overrides[item.id] };
        }
        return item;
      });
    });
    
    // Add custom products to their respective categories
    customProducts.forEach(item => {
      const cat = item.category || 'weapons';
      if (!result[cat]) result[cat] = [];
      
      // Check if item already exists to prevent duplicates if any
      if (!result[cat].find(existing => existing.id === item.id)) {
        result[cat].push(item);
      }
    });
    
    return result;
  }, [customProducts, overrides]);

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('market.title')}</h2>
        </div>
        {isAdmin && (
          <button 
            onClick={() => {
              setEditingCustomId(null);
              setProductForm({
                name: '',
                type: '',
                image: '',
                category: activeTab,
                specs: '',
                power: 0,
                price: 0,
                hidden: false,
                rare: false
              });
              setIsAddingProduct(true);
            }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
          >
            <Plus size={20} />
            {t('market.addProduct')}
          </button>
        )}
      </div>

      {govData?.taxHoliday && (
        <div className="bg-emerald-900/40 border border-emerald-500/50 rounded-2xl p-6 flex items-start gap-4 animate-pulse">
          <Landmark className="text-emerald-500 shrink-0 mt-1" size={28} />
          <div>
            <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-2">{t('map.taxHolidayActive')}</h3>
            <p className="text-emerald-200/80 font-medium">
              {t('market.taxHolidayDesc')}
              <br/>
              <span className="text-emerald-400 font-bold">{t('map.effect')}</span> {t('market.taxHolidayEffect')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold transition-all text-sm ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                  : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {(allItems[activeTab] || [])
          .filter((item: any) => isAdmin || (!overrides[item.id]?.hidden && !item.hidden && (!item.rare || profile?.vipLevel)))
          .map((item: any) => {
          let finalPrice = item.price;
          let hasDiscount = false;
          
          if (profile?.visaCard) {
            const { type } = profile.visaCard;
            if (['Platinum', 'Signature', 'Infinite'].includes(type)) {
              finalPrice = Math.floor(item.price * 0.95);
              hasDiscount = true;
            }
          }
          
          if (govData?.taxHoliday) {
            finalPrice = Math.floor(finalPrice * 0.90);
            hasDiscount = true;
          }

          return (
          <div key={item.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden group hover:border-purple-500/50 transition-all shadow-xl">
            <div className="relative h-48 overflow-hidden bg-white/5">
              <img 
                src={overrides[item.id]?.image || item.image} 
                alt={item.name}
                className={`w-full h-full transition-transform duration-500 group-hover:scale-110 ${activeTab === 'phones' ? 'object-contain p-4' : 'object-cover'} ${overrides[item.id]?.hidden ? 'opacity-40 grayscale' : ''}`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-60" />
              
              {isAdmin && (
                <div className="absolute top-2 end-2 flex gap-2 opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleToggleVisibility(item.id, overrides[item.id]?.hidden)}
                    className={`p-2 rounded-lg backdrop-blur-sm transition-colors shadow-lg ${overrides[item.id]?.hidden ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    title={overrides[item.id]?.hidden ? 'إظهار' : 'إخفاء'}
                  >
                    {overrides[item.id]?.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button 
                    onClick={() => {
                      if (item.createdAt) {
                        // Custom product
                        setEditingCustomId(item.id);
                        setProductForm({
                          name: item.name,
                          type: item.type,
                          image: item.image,
                          category: item.category,
                          specs: item.specs || '',
                          power: item.power || 0,
                          price: item.price,
                          hidden: item.hidden || false,
                          rare: item.rare || false
                        });
                        setIsAddingProduct(true);
                      } else {
                        // Static product - allow editing all specs via overrides
                        setEditingItem(item.id);
                        const currentOverride = overrides[item.id] || {};
                        setProductForm({
                          name: currentOverride.name || item.name,
                          type: currentOverride.type || item.type,
                          image: currentOverride.image || item.image,
                          category: currentOverride.category || activeTab,
                          specs: currentOverride.specs || item.specs || '',
                          power: currentOverride.power || item.power || 0,
                          price: currentOverride.price || item.price,
                          hidden: currentOverride.hidden || false,
                          rare: currentOverride.rare || item.rare || false
                        });
                        setIsAddingProduct(true);
                      }
                    }}
                    className="p-2 bg-black/60 hover:bg-purple-600 text-white rounded-lg backdrop-blur-sm transition-colors shadow-lg"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              {overrides[item.id]?.hidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-red-500/80 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">مخفي عن اللاعبين</div>
                </div>
              )}
              {item.rare && (
                <div className="absolute top-2 start-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg flex items-center gap-1">
                  <Crown size={12} />
                  VIP
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col justify-between flex-1">
              <div>
                <div className="text-[10px] text-purple-500 font-bold uppercase tracking-widest mb-1">{t(`itemTypes.${item.type}`)}</div>
                <h3 className="text-lg font-black mb-1">{item.name}</h3>
                {item.power && (
                  <div className="text-xs text-blue-400 font-bold flex items-center gap-1">
                    <Shield size={12} />
                    {t('gangs.power')}: +{formatNumber(item.power)}
                  </div>
                )}
                {item.specs && (
                  <div className="mt-2 p-2 bg-black/40 rounded-lg border border-zinc-800">
                    <p className="text-[10px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{item.specs}</p>
                  </div>
                )}
                {item.type === 'phone' && (
                  <div className="mt-4 space-y-2 text-xs text-zinc-400">
                    <p><strong className="text-zinc-300">{t('market.processor')}:</strong> {item.processor}</p>
                    <p><strong className="text-zinc-300">{t('market.camera')}:</strong> {item.camera}</p>
                    <p><strong className="text-zinc-300">{t('market.battery')}:</strong> {item.battery}</p>
                    <p><strong className="text-zinc-300">{t('market.screen')}:</strong> {item.screen}</p>
                    
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.memory')}</label>
                      <div className="flex flex-wrap gap-1">
                        {item.memoryOptions.map((mem: string) => (
                          <button
                            key={mem}
                            onClick={() => setSelectedMemory({...selectedMemory, [item.id]: mem})}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                              (selectedMemory[item.id] || item.memoryOptions[0]) === mem
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                          >
                            {mem}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.sim')}</label>
                      <div className="flex flex-wrap gap-1">
                        {item.simOptions.map((sim: string) => (
                          <button
                            key={sim}
                            onClick={() => setSelectedSim({...selectedSim, [item.id]: sim})}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                              (selectedSim[item.id] || item.simOptions[0]) === sim
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                          >
                            {sim}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t('map.price')}</span>
                    {hasDiscount ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-black text-lg">{formatMoney(finalPrice)}</span>
                        <span className="text-zinc-500 line-through text-xs">{formatMoney(item.price)}</span>
                      </div>
                    ) : (
                      <span className="text-green-400 font-black text-lg">{formatMoney(item.price)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setGiftingItem(item);
                        setIsGifting(true);
                      }}
                      className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-purple-400 rounded-xl transition-all border border-zinc-700"
                      title="إهداء"
                    >
                      <Gift size={20} />
                    </button>
                    <button 
                      onClick={() => handleBuy(item)}
                      disabled={buying === item.id}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 text-sm disabled:opacity-50"
                    >
                      {buying === item.id ? t('common.processing') : t('market.buy')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>

      {activeTab === 'phones' && (
        <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3">
                <Smartphone className="text-purple-500" size={28} />
                {t('market.buyEsim')}
              </h3>
              <p className="text-zinc-400 font-medium mb-6">{t('market.esimDesc')}</p>
              
              <div className="bg-black/50 border border-zinc-800 rounded-2xl p-6 mb-6">
                <div className="text-center mb-4">
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">{t('market.yourNewNumber')}</div>
                  <div className="text-3xl font-black text-white tracking-widest font-mono">{randomPhoneNumber}</div>
                </div>
                <div className="flex justify-center">
                  <button 
                    onClick={() => setRandomPhoneNumber(generateRandomPhoneNumber())}
                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-bold transition-colors"
                  >
                    <RefreshCw size={16} />
                    {t('market.changeNumber')}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">{t('map.price')}</div>
                  <div className="text-2xl font-black text-green-400">{formatMoney(1000)}</div>
                </div>
                <button 
                  onClick={async () => {
                    if (!profile || buying === 'esim') return;
                    if (profile.cleanMoney < 1000) {
                      toast.error(t('market.noMoney'));
                      return;
                    }
                    setBuying('esim');
                    try {
                      await updateDoc(doc(db, 'users', profile.uid), {
                        cleanMoney: increment(-1000),
                        phoneNumber: randomPhoneNumber,
                        [`inventory.sims.${randomPhoneNumber}`]: increment(1)
                      });
                      toast.success(t('market.esimBought'));
                    } catch (error) {
                      handleFirestoreError(error, OperationType.WRITE, 'users');
                    } finally {
                      setBuying(null);
                    }
                  }}
                  disabled={buying === 'esim'}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
                >
                  {buying === 'esim' ? t('common.processing') : t('market.buyEsimBtn')}
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-72 h-44 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl relative overflow-hidden flex flex-col justify-between p-5 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-8 bg-yellow-600/80 rounded border border-yellow-500/50 flex items-center justify-center">
                  <div className="w-6 h-4 border border-yellow-800/50 rounded-sm grid grid-cols-3 grid-rows-2 gap-[1px]">
                    {[...Array(6)].map((_, i) => <div key={i} className="bg-yellow-800/30" />)}
                  </div>
                </div>
                <div className="text-xs font-black text-zinc-500 tracking-widest uppercase">eSIM</div>
              </div>
              <div className="relative z-10">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Global Network</div>
                <div className="text-lg font-black text-white tracking-wider font-mono">{randomPhoneNumber}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-white uppercase flex items-center gap-2">
                    <Plus size={20} className="text-purple-500" />
                    {editingCustomId || editingItem ? t('market.editProduct') : t('market.addProduct')}
                  </h3>
                  <button onClick={() => {
                    setIsAddingProduct(false);
                    setEditingCustomId(null);
                    setEditingItem(null);
                  }} className="text-zinc-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productName')}</label>
                      <input 
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productType')}</label>
                      <input 
                        type="text"
                        value={productForm.type}
                        onChange={(e) => setProductForm({...productForm, type: e.target.value})}
                        placeholder="مسدس، سيارة، سموم..."
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productCategory')}</label>
                      <select 
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value as any})}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      >
                        {tabs.map(tab => (
                          <option key={tab.id} value={tab.id}>{tab.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productPrice')}</label>
                      <input 
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: parseInt(e.target.value) || 0})}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productPower')}</label>
                      <input 
                        type="number"
                        value={productForm.power}
                        onChange={(e) => setProductForm({...productForm, power: parseInt(e.target.value) || 0})}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productImage')}</label>
                      <input 
                        type="text"
                        value={productForm.image}
                        onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productSpecs')}</label>
                      <textarea 
                        value={productForm.specs}
                        onChange={(e) => setProductForm({...productForm, specs: e.target.value})}
                        placeholder={t('market.specsPlaceholder')}
                        rows={4}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('market.productVisibility')}</label>
                        <button 
                          onClick={() => setProductForm({...productForm, hidden: !productForm.hidden})}
                          className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all ${productForm.hidden ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500/20 text-green-500 border border-green-500/50'}`}
                        >
                          {productForm.hidden ? t('market.hidden') : t('market.visible')}
                        </button>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">VIP</label>
                        <button 
                          onClick={() => setProductForm({...productForm, rare: !productForm.rare})}
                          className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all ${productForm.rare ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                        >
                          {productForm.rare ? t('market.vipOnly') : t('market.noVip')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setIsAddingProduct(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSaveProduct}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
                  >
                    {t('common.save')}
                  </button>
                  {editingCustomId && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
                        try {
                          await deleteDoc(doc(db, 'custom_products', editingCustomId));
                          toast.success('تم حذف المنتج بنجاح');
                          setIsAddingProduct(false);
                          setEditingCustomId(null);
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, 'custom_products');
                        }
                      }}
                      className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gifting Modal */}
      <AnimatePresence>
        {isGifting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-white uppercase flex items-center gap-2">
                    <Gift size={20} className="text-purple-500" />
                    إهداء منتج
                  </h3>
                  <button onClick={() => {
                    setIsGifting(false);
                    setGiftingItem(null);
                    setSelectedPlayer(null);
                    setSearchQuery('');
                  }} className="text-zinc-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Item Preview */}
                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-zinc-800">
                    <img src={overrides[giftingItem?.id]?.image || giftingItem?.image} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    <div>
                      <div className="font-black text-white">{giftingItem?.name}</div>
                      <div className="text-green-400 font-bold">{formatMoney(giftingItem?.price)}</div>
                    </div>
                  </div>

                  {/* Player Search */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">ابحث عن اللاعب</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchPlayers(e.target.value);
                        }}
                        placeholder="اكتب اسم اللاعب..."
                        className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Loader2 className="animate-spin text-purple-500" size={18} />
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    <AnimatePresence>
                      {playerSuggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="bg-black border border-zinc-800 rounded-xl overflow-hidden mt-2"
                        >
                          {playerSuggestions.map((player) => (
                            <button
                              key={player.uid}
                              onClick={() => {
                                setSelectedPlayer(player);
                                setSearchQuery(player.displayName);
                                setPlayerSuggestions([]);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                            >
                              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-500">
                                <User size={16} />
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-bold text-white">{player.displayName}</div>
                                <div className="text-[10px] text-zinc-500">مستوى {player.level || 1}</div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {selectedPlayer && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-black">
                          {selectedPlayer.displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs text-purple-400 font-bold">المرسل إليه</div>
                          <div className="font-black text-white">{selectedPlayer.displayName}</div>
                        </div>
                      </div>
                      <button onClick={() => setSelectedPlayer(null)} className="text-zinc-500 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleGift}
                    disabled={!selectedPlayer || isProcessingGift}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                  >
                    {isProcessingGift ? <Loader2 className="animate-spin" size={20} /> : <Gift size={20} />}
                    إرسال الهدية الآن
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
