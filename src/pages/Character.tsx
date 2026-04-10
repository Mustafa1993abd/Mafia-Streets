import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, onSnapshot, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ALL_PRODUCTS } from '../lib/mallItems';
import { MARKET_ITEMS } from '../lib/items';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Shield, Sword, Shirt, Glasses, Watch, Briefcase, Gem, Crosshair, User, Settings, Loader2, Crown, Footprints, Headphones, RefreshCw, Trash2, Tag } from 'lucide-react';

const SLOTS = [
  // 1. Head
  { id: 'hats', label: 'القبعات', category: 'head', icon: Crown, zIndex: 40 },
  { id: 'glasses', label: 'النظارات', category: 'head', icon: Glasses, zIndex: 35 },
  
  // 2. Clothing
  { id: 'clothing', label: 'الملابس', category: 'clothing', icon: Shirt, zIndex: 20 },

  // 3. Feet
  { id: 'shoes', label: 'الأحذية', category: 'feet', icon: Footprints, zIndex: 20 },
  { id: 'socks', label: 'الجوارب', category: 'feet', icon: User, zIndex: 15 },

  // 4. Accessories
  { id: 'acc_head', label: 'إكسسوارات الرأس', category: 'accessories', icon: Headphones, zIndex: 45 },
  { id: 'acc_neck', label: 'إكسسوارات الرقبة', category: 'accessories', icon: Gem, zIndex: 30 },
  { id: 'acc_chest', label: 'إكسسوارات الصدر', category: 'accessories', icon: Briefcase, zIndex: 35 },
  { id: 'acc_arms', label: 'إكسسوارات الذراعين', category: 'accessories', icon: Watch, zIndex: 30 },
  { id: 'acc_hands', label: 'إكسسوارات اليد', category: 'accessories', icon: Gem, zIndex: 30 },
  { id: 'acc_waist', label: 'إكسسوارات الخصر', category: 'accessories', icon: Briefcase, zIndex: 30 },
  { id: 'acc_back', label: 'إكسسوارات الظهر', category: 'accessories', icon: Briefcase, zIndex: 5 },
  { id: 'acc_feet', label: 'إكسسوارات القدم', category: 'accessories', icon: Gem, zIndex: 25 },

  // 5. System
  { id: 'weapon1', label: 'اليد اليمنى', category: 'system', icon: Sword, zIndex: 50 },
  { id: 'weapon2', label: 'اليد اليسرى', category: 'system', icon: Sword, zIndex: 50 },
  { id: 'armor', label: 'الدرع', category: 'system', icon: Shield, zIndex: 18 },
] as const;

export default function Character() {
  const { profile, equipItem, batchEquipItems, unequipItem, saveOutfit, deleteOutfit } = useAuthStore();
  const [mallData, setMallData] = useState<any>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [customProducts, setCustomProducts] = useState<any[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaveOutfit = async () => {
    if (!outfitName.trim()) return;
    await saveOutfit(outfitName);
    setOutfitName('');
    setShowSaveModal(false);
    toast.success('تم حفظ الطقم بنجاح!');
  };

  const loadOutfit = async (items: Record<string, string>) => {
    const itemsToEquip = Object.entries(items)
      .filter(([_, itemId]) => itemId !== null)
      .map(([type, itemId]) => ({ type, itemId }));
    await batchEquipItems(itemsToEquip);
    toast.success('تم تحميل الطقم!');
  };

  const clearAllEquipment = async () => {
    if (!profile?.uid) return;
    const updates: any = {};
    SLOTS.forEach(slot => {
      updates[`equipped.${slot.id}`] = null;
    });
    await updateDoc(doc(db, 'users', profile.uid), updates);
    toast.success('تم نزع جميع الملابس!');
  };

  const randomizeOutfit = async () => {
    toast.info('هذه الميزة غير متوفرة حالياً.');
  };

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

  useEffect(() => {
    if (!profile?.uid) return;
    if (!profile.gender) {
      setShowGenderModal(true);
    }

    const unsub = onSnapshot(doc(db, 'mall_data', profile.uid), (snapshot) => {
      if (snapshot.exists()) {
        setMallData(snapshot.data());
      }
    });
    return () => unsub();
  }, [profile?.uid, profile?.gender]);

  const handleSetGender = async (gender: 'male' | 'female') => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, 'users', profile.uid), { gender });
    setShowGenderModal(false);
  };

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

  const generateAvatar = async (force = false) => {
    // System changed to layering, generation no longer needed
    return;
  };

  useEffect(() => {
    // No longer auto-generating
  }, [profile?.equipped, profile?.gender, profile?.uid]);

  // Combine inventory
  const getInventoryItems = () => {
    const items: any[] = [];
    
    // Mall Items
    if (mallData?.purchasedIds) {
      mallData.purchasedIds.forEach((id: string) => {
        const product = combinedProducts.find(p => p.id === id);
        if (product) {
          items.push({
            ...product,
            source: 'mall',
            slotType: product.slotType || 'acc_other'
          });
        }
      });
    }

    // Secret Stash Items
    if (profile?.inventory?.weapons) {
      Object.entries(profile.inventory.weapons).forEach(([id, count]) => {
        if (count > 0) {
          const weapon = MARKET_ITEMS.weapons.find(w => w.id === id);
          if (weapon) {
            items.push({
              ...weapon,
              source: 'stash',
              slotType: 'weapon1' // Can be weapon1 or weapon2
            });
          }
        }
      });
    }

    if (profile?.inventory?.armor) {
      Object.entries(profile.inventory.armor).forEach(([id, count]) => {
        if (count > 0) {
          const armor = MARKET_ITEMS.armor.find(a => a.id === id);
          if (armor) {
            items.push({
              ...armor,
              source: 'stash',
              slotType: 'armor'
            });
          }
        }
      });
    }

    return items;
  };

  const inventoryItems = getInventoryItems();
  const paddedInventory = [...inventoryItems];
  while (paddedInventory.length < 10) {
    paddedInventory.push(null);
  }

  const handleEquip = async (item: any) => {
    let targetSlot = item.slotType;
    // If it's a weapon and weapon1 is full, try weapon2
    if (targetSlot === 'weapon1' && profile?.equipped?.weapon1) {
      targetSlot = 'weapon2';
    }
    await equipItem(targetSlot, item.id);
  };

  const handleUnequip = async (slotId: string) => {
    await unequipItem(slotId as any);
  };

  const handleSellItem = async (item: any) => {
    if (!profile?.uid) return;
    
    const isEquipped = Object.values(profile.equipped || {}).includes(item.id);
    if (isEquipped) {
      toast.error('يرجى نزع المنتج قبل بيعه');
      return;
    }

    try {
      const sellPrice = Math.floor(item.cost * 0.5);
      const userRef = doc(db, 'users', profile.uid);

      if (item.source === 'mall') {
        if (!mallData) return;
        const mallRef = doc(db, 'mall_data', profile.uid);
        await updateDoc(mallRef, {
          purchasedIds: mallData.purchasedIds.filter((id: string) => id !== item.id)
        });
      } else if (item.source === 'stash') {
        const inventory = { ...profile.inventory };
        if (item.type === 'weapon') {
          inventory.weapons = { ...inventory.weapons };
          inventory.weapons[item.id] = (inventory.weapons[item.id] || 0) - 1;
        } else if (item.type === 'armor') {
          inventory.armor = { ...inventory.armor };
          inventory.armor[item.id] = (inventory.armor[item.id] || 0) - 1;
        }
        await updateDoc(userRef, { inventory });
      }

      await updateDoc(userRef, {
        cleanMoney: (profile.cleanMoney || 0) + sellPrice
      });

      toast.success(`تم بيع ${item.name} مقابل ${sellPrice.toLocaleString()} $`);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء بيع المنتج');
    }
  };

  const getAvatarBaseUrl = () => {
    const clothingItem = getEquippedItemDetails('clothing');
    if (clothingItem) return `${clothingItem.layerImage || clothingItem.image}?v=${refreshKey}`;

    // Default base avatar
    return `https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkNDIzN2YyZmY0ODE5MTgxN2IzZWFjN2VkNzBiODU6ZmlsZV8wMDAwMDAwMGQzZmM3MjQ2OGVlODJlNThhN2FhMDI5OSIsInRzIjoiMjA1NDkiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImJkOGZjNDM0ZTViODdjMGU1ZTZmYWEwNjA5NTI3ZjNjZjU0ZjMxZWVlMjkzZjBhODJjNDU0YjBiODI2YjAyNjUiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9?v=${refreshKey}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">الشخصية</h1>
          <p className="text-zinc-400">إدارة مظهر وتجهيزات {profile?.displayName}</p>
        </div>
        <button 
          onClick={() => setShowGenderModal(true)}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors flex items-center gap-2"
        >
          <Settings size={18} />
          تغيير الجنس
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar Display - Free Image Style */}
        <div className="lg:col-span-1 flex flex-col items-center relative min-h-[700px]">
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Avatar Container with fixed aspect ratio to ensure perfect alignment */}
              <div className="relative aspect-[1/2] h-[85vh] flex items-center justify-center">
                {/* Base Avatar or Clothing Layer */}
                <img 
                  src={getAvatarBaseUrl()} 
                  alt="Avatar" 
                  className="absolute inset-0 w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-black text-white tracking-widest drop-shadow-lg">{profile?.displayName}</h2>
            <p className="text-yellow-500 font-bold text-lg">{profile?.role}</p>

            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="p-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                title="تحديث الصورة"
              >
                <RefreshCw size={20} className={clsx(refreshKey > 0 && "animate-spin")} />
              </button>
              <button
                onClick={async () => {
                  if (!profile?.uid) return;
                  await updateDoc(doc(db, 'users', profile.uid), {
                    isAvatarPinned: !profile.isAvatarPinned
                  });
                  toast.success(!profile.isAvatarPinned ? 'تم تثبيت المظهر' : 'تم إلغاء تثبيت المظهر');
                }}
                className={clsx(
                  "px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2",
                  profile?.isAvatarPinned 
                    ? "bg-yellow-500 text-black hover:bg-yellow-400" 
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                )}
              >
                {profile?.isAvatarPinned ? 'إلغاء التثبيت' : 'تثبيت المظهر'}
              </button>
            </div>
          </div>
        </div>

        {/* Equipment Slots */}
        <div className="lg:col-span-2 bg-zinc-900/50 rounded-3xl border border-white/5 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="text-yellow-500" />
            التجهيزات الحالية
          </h3>
          
          <div className="space-y-8">
            {['head', 'clothing', 'feet', 'accessories', 'system'].map(category => {
              const categorySlots = SLOTS.filter(s => s.category === category);
              if (categorySlots.length === 0) return null;

              const categoryLabels: Record<string, string> = {
                'head': 'الرأس',
                'clothing': 'الملابس',
                'feet': 'القدمين',
                'accessories': 'الإكسسوارات',
                'system': 'الأسلحة والدروع'
              };

              return (
                <div key={category}>
                  <h4 className="text-sm font-black text-zinc-500 mb-4 uppercase tracking-widest">{categoryLabels[category]}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                    {categorySlots.map(slot => {
                      const item = getEquippedItemDetails(slot.id);
                      const Icon = slot.icon;
                      
                      return (
                        <div key={slot.id} className="bg-zinc-800/50 rounded-2xl border border-white/5 p-3 flex flex-col items-center text-center gap-3 relative group">
                          <div className="text-xs text-zinc-400 font-bold w-full pb-2 border-b border-white/5">{slot.label}</div>
                          
                          <div className="w-16 h-16 rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden relative">
                            {item ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Icon className="text-zinc-600 w-8 h-8 opacity-50" />
                            )}
                          </div>
                          
                          <div className="h-10 flex items-center justify-center w-full">
                            {item ? (
                              <p className="text-[10px] text-white font-bold line-clamp-2">{item.name}</p>
                            ) : (
                              <p className="text-[10px] text-zinc-500">فارغ</p>
                            )}
                          </div>

                          {item && (
                            <button 
                              onClick={() => handleUnequip(slot.id)}
                              className="w-full py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              نزع
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="text-zinc-500" />
          إدارة المظهر
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearAllEquipment}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            نزع الكل
          </button>
        </div>
      </div>

      {/* Saved Outfits Section */}
      {profile?.savedOutfits && profile.savedOutfits.length > 0 && (
        <div className="bg-zinc-900/50 rounded-3xl border border-white/5 p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Gem className="text-blue-500" />
            أطقمي المحفوظة
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {profile.savedOutfits.map((outfit) => (
              <div key={outfit.id} className="group relative bg-zinc-800/50 rounded-2xl p-4 border border-white/5 hover:border-blue-500/50 transition-all">
                <div className="text-center mb-3">
                  <p className="text-white font-bold text-sm truncate">{outfit.name}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => loadOutfit(outfit.items)}
                    className="w-full bg-blue-500 hover:bg-blue-400 text-white text-xs py-2 rounded-lg transition-colors"
                  >
                    ارتداء
                  </button>
                  <button 
                    onClick={() => deleteOutfit(outfit.id)}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs py-2 rounded-lg transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end mb-8">
        <button 
          onClick={() => setShowSaveModal(true)}
          className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-2"
        >
          <Gem size={20} />
          حفظ الطقم الحالي
        </button>
      </div>

      {/* Inventory */}
      <div className="bg-zinc-900/50 rounded-3xl border border-white/5 p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Briefcase className="text-yellow-500" />
          المخزون الشخصي
        </h3>
        
        {inventoryItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            لا تملك أي عناصر في المخزون. قم بزيارة مول المدينة أو المخزن السري للشراء.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {paddedInventory.map((item, idx) => {
              if (!item) {
                return (
                  <div key={`empty_${idx}`} className="bg-zinc-800/20 rounded-2xl border border-white/5 p-3 flex flex-col items-center justify-center text-center gap-3 h-40">
                    <div className="w-20 h-20 rounded-xl bg-zinc-900/50 flex items-center justify-center border border-dashed border-white/10">
                      <span className="text-zinc-600 text-xs">فارغ</span>
                    </div>
                  </div>
                );
              }

              // Check if already equipped
              const equippedSlot = Object.entries(profile?.equipped || {}).find(([_, id]) => id === item.id)?.[0];
              const isEquipped = !!equippedSlot;
              
              return (
                <div key={`${item.id}_${idx}`} className="bg-zinc-800/50 rounded-2xl border border-white/5 p-3 flex flex-col items-center text-center gap-3">
                  <div className="w-20 h-20 rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {isEquipped && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-yellow-500 text-xs font-bold bg-black/80 px-2 py-1 rounded-full">مجهز</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-10 flex items-center justify-center w-full">
                    <p className="text-[10px] text-white font-bold line-clamp-2">{item.name}</p>
                  </div>

                  <div className="flex gap-2 w-full">
                    {isEquipped ? (
                      <button 
                        onClick={() => handleUnequip(equippedSlot)}
                        className="flex-1 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        نزع
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleEquip(item)}
                        className="flex-1 py-1.5 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg text-[10px] font-bold transition-colors"
                      >
                        تجهيز
                      </button>
                    )}
                    <button 
                      onClick={() => handleSellItem(item)}
                      className="p-1.5 bg-zinc-700/50 text-zinc-400 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors"
                      title="بيع"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Outfit Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-md"
            >
              <h3 className="text-2xl font-bold text-white mb-6">حفظ الطقم الحالي</h3>
              <input 
                type="text" 
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="اسم الطقم (مثلاً: طقم العمل، ملابس السهرة...)"
                className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-6 py-4 text-white mb-6 focus:outline-none focus:border-blue-500/50"
              />
              <div className="flex gap-4">
                <button 
                  onClick={handleSaveOutfit}
                  className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  حفظ
                </button>
                <button 
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gender Selection Modal */}
      <AnimatePresence>
        {showGenderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center"
            >
              <h2 className="text-2xl font-black text-white mb-2">اختر جنس الشخصية</h2>
              <p className="text-zinc-400 mb-8">هذا سيحدد مظهر الشخصية الأساسي الخاص بك.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSetGender('male')}
                  className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-zinc-800 hover:border-blue-500 hover:bg-blue-500/10 transition-all"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800">
                    <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200" alt="Male" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-white font-bold text-lg">ذكر</span>
                </button>
                
                <button 
                  onClick={() => handleSetGender('female')}
                  className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-zinc-800 hover:border-pink-500 hover:bg-pink-500/10 transition-all"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800">
                    <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200" alt="Female" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-white font-bold text-lg">أنثى</span>
                </button>
              </div>
              
              {profile?.gender && (
                <button 
                  onClick={() => setShowGenderModal(false)}
                  className="mt-8 text-zinc-500 hover:text-white transition-colors"
                >
                  إلغاء
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
