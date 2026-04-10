import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, safeToMillis } from '../lib/utils';
import { getVIPMultiplier } from '../lib/vip';
import { useAuthStore, BuiltProperty } from '../store/useAuthStore';
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MARKET_ITEMS } from '../lib/items';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Shield, Landmark, Crosshair, Beaker, Home, RefreshCw, Wrench, ChevronDown, ChevronUp, Users, CheckCircle, Skull, Briefcase, Zap, Target, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const CITIES = ['baghdad', 'damascus', 'beirut', 'cairo', 'dubai'];

const PROPERTY_TYPES = [
  { id: 'headquarters', price: 1000000, icon: Shield, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50', glow: 'shadow-red-500/20' },
  { id: 'bank', price: 5000000, icon: Landmark, color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', glow: 'shadow-yellow-500/20' },
  { id: 'weapon_stash', price: 500000, icon: Crosshair, color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/50', glow: 'shadow-orange-500/20' },
  { id: 'drug_factory', price: 750000, icon: Beaker, color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/50', glow: 'shadow-green-500/20' },
  { id: 'safe_house', price: 250000, icon: Home, color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500/50', glow: 'shadow-blue-500/20' },
  { id: 'laundromat', price: 400000, icon: RefreshCw, color: 'text-teal-500', bg: 'bg-teal-500/20', border: 'border-teal-500/50', glow: 'shadow-teal-500/20' },
  { id: 'garage', price: 300000, icon: Wrench, color: 'text-purple-500', bg: 'bg-purple-500/20', border: 'border-purple-500/50', glow: 'shadow-purple-500/20' },
  { id: 'ammunition_factory', price: 600000, icon: Crosshair, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50', glow: 'shadow-red-500/20' },
  { id: 'casino', price: 10000000, icon: Landmark, color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/50', glow: 'shadow-yellow-400/20' },
  { id: 'hotel', price: 7500000, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/50', glow: 'shadow-blue-400/20' },
];

export default function Properties() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [selectedCity, setSelectedCity] = useState<string>(profile?.city || 'baghdad');
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [buildingOnTile, setBuildingOnTile] = useState<number | null>(null);
  const [selectedInventoryCar, setSelectedInventoryCar] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const builtProperties = profile?.builtProperties || [];
  const cityProperties = builtProperties.filter(p => p.city === selectedCity);
  const ownedTilesInCity = profile?.ownedTiles?.[selectedCity] || [];

  const handleBuild = async (propType: typeof PROPERTY_TYPES[0], tileId: number) => {
    if (!profile || processing) return;
    if (profile.cleanMoney < propType.price) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);

    const newProperty: BuiltProperty = {
      id: `${propType.id}_${selectedCity}_${tileId}_${Date.now()}`,
      type: propType.id as any,
      city: selectedCity,
      tileId: tileId,
      level: 1,
      upgrades: {},
      workers: 0,
      inventory: {}
    };

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-propType.price),
        builtProperties: [...builtProperties, newProperty]
      });
      toast.success(t('properties.buildSuccess', { property: t(`properties.types.${propType.id}`), city: t(`map.cities.${selectedCity}`) }));
      setBuildingOnTile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSell = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    const propType = PROPERTY_TYPES.find(pt => pt.id === property.type)!;
    const sellPrice = Math.floor(propType.price * 0.5); // Sell for 50% of original price

    setProcessing(true);

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(sellPrice),
        builtProperties: builtProperties.filter(p => p.id !== property.id)
      });
      toast.success(t('properties.sellSuccess', { property: t(`properties.types.${property.type}`) }));
      setExpandedProperty(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const toggleManage = (propId: string) => {
    setExpandedProperty(expandedProperty === propId ? null : propId);
  };

  const handleUpgrade = async (property: BuiltProperty, upgradeKey: string, cost: number) => {
    if (!profile || processing) return;
    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);

    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        const currentLevel = p.upgrades?.[upgradeKey] || 0;
        return {
          ...p,
          upgrades: {
            ...p.upgrades,
            [upgradeKey]: currentLevel + 1
          }
        };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        builtProperties: updatedProperties
      });
      toast.success(t('properties.upgradeSuccess', { upgrade: t(`properties.upgrades.${upgradeKey}`) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleHireWorker = async (property: BuiltProperty, cost: number) => {
    if (!profile || processing) return;
    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);

    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        return {
          ...p,
          workers: (p.workers || 0) + 1
        };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        builtProperties: updatedProperties
      });
      toast.success(t('properties.hireSuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgradeLevel = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    const cost = 500000 * property.level;
    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);

    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        return { ...p, level: p.level + 1 };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        builtProperties: updatedProperties
      });
      toast.success(t('properties.upgradeSuccess', { upgrade: t('properties.level', { level: property.level + 1 }) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleModifyCar = async (property: BuiltProperty, carName: string) => {
    if (!profile || processing) return;
    const inventory = profile.inventory || { cars: {}, bikes: 0, weapons: {}, drugs: {}, armor: {}, tools: {} };
    const carCount = inventory.cars?.[carName] || 0;
    if (carCount <= 0) {
      toast.error(t('properties.garage.noCars'));
      return;
    }
    let cost = 50000;
    if (property.managerId) cost *= 0.5; // 50% discount if managed

    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);

    const newVehicle = {
      id: `veh_${Date.now()}`,
      name: `${t('properties.garage.modifiedCar')} (${carName})`,
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
      armorLevel: 0,
      power: 100
    };

    const updatedInventoryCars = { ...inventory.cars };
    if (updatedInventoryCars[carName] > 1) {
      updatedInventoryCars[carName]--;
    } else {
      delete updatedInventoryCars[carName];
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        'inventory.cars': updatedInventoryCars,
        vehicles: [...(profile.vehicles || []), newVehicle]
      });
      toast.success(t('properties.garage.modifySuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSellInventoryCar = async (carName: string) => {
    if (!profile || processing) return;
    const inventory = profile.inventory || { cars: {}, bikes: 0, weapons: {}, drugs: {}, armor: {}, tools: {} };
    const carCount = inventory.cars?.[carName] || 0;
    if (carCount <= 0) return;

    // Find price from MARKET_ITEMS
    const carItem = MARKET_ITEMS.cars.find(item => item.name === carName);
    const sellPrice = carItem ? Math.floor(carItem.price * 0.5) : 2500;

    setProcessing(true);

    const updatedInventoryCars = { ...inventory.cars };
    if (updatedInventoryCars[carName] > 1) {
      updatedInventoryCars[carName]--;
    } else {
      delete updatedInventoryCars[carName];
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(sellPrice),
        'inventory.cars': updatedInventoryCars
      });
      toast.success(t('properties.garage.sellSuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSellModifiedVehicle = async (vehicleId: string) => {
    if (!profile || processing) return;
    const vehicle = profile.vehicles?.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const sellPrice = 25000 + (vehicle.armorLevel * 10000); // Base modified price + armor bonus

    setProcessing(true);

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(sellPrice),
        vehicles: profile.vehicles?.filter(v => v.id !== vehicleId)
      });
      toast.success(t('properties.garage.sellSuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgradeArmor = async (property: BuiltProperty, vehicleId: string, currentLevel: number) => {
    if (!profile || processing) return;
    if (currentLevel >= 5) {
      toast.error(t('properties.garage.maxArmor'));
      return;
    }
    let cost = 25000 * (currentLevel + 1);
    if (property.managerId) cost *= 0.5; // 50% discount if managed

    if (profile.cleanMoney < cost) {
      toast.error(t('common.noMoney'));
      return;
    }

    setProcessing(true);

    const updatedVehicles = (profile.vehicles || []).map(v => {
      if (v.id === vehicleId) {
        return { ...v, armorLevel: v.armorLevel + 1, power: v.power + 50 };
      }
      return v;
    });

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-cost),
        vehicles: updatedVehicles
      });
      toast.success(t('properties.garage.armorUpgradeSuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDonateProfitsToGang = async (property: BuiltProperty) => {
    if (!profile?.gangId) {
      toast.error(t('properties.headquarters.noGang'));
      return;
    }

    const lastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || currentTime);
    const minutesPassed = Math.floor((currentTime - lastCollection) / (1000 * 60));
    const minuteProfit = calculateMinuteProfit(property);
    const profit = Math.floor(minuteProfit * minutesPassed);

    if (profit < 1) {
      toast.error(t('properties.noProfits'));
      return;
    }

    setProcessing(true);

    try {
      const gangRef = doc(db, 'gangs', profile.gangId);
      const gangSnap = await getDoc(gangRef);
      
      if (!gangSnap.exists()) {
        toast.error('العصابة غير موجودة!');
        return;
      }

      const gangData = gangSnap.data();
      await updateDoc(gangRef, {
        vault: (gangData.vault || 0) + profit
      });

      const updatedProperties = builtProperties.map(p => 
        p.id === property.id ? { ...p, lastProfitCollection: currentTime } : p
      );

      await updateDoc(doc(db, 'users', profile.uid), {
        builtProperties: updatedProperties
      });

      toast.success(t('properties.headquarters.profitsDonated', { amount: formatMoney(profit) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'gangs');
    } finally {
      setProcessing(false);
    }
  };

  const handleLaunder = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    
    const baseCapacity = (property.upgrades?.washers || 0) * 10000 + 5000;
    let capacity = baseCapacity * (1 + (property.level - 1) * 0.5);
    
    if (property.managerId) {
      capacity *= 1.5; // 50% more capacity
    }
    
    if (profile.dirtyMoney < capacity) {
      toast.error(t('common.noDirtyMoney'));
      return;
    }

    setProcessing(true);

    try {
      let fee = 0.2 * (1 - (property.level - 1) * 0.05);
      if (property.managerId) {
        fee *= 0.8; // 20% less fee
      }
      const cleanAmount = capacity * (1 - Math.max(0.05, fee));
      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: increment(-capacity),
        cleanMoney: increment(cleanAmount)
      });
      toast.success(t('properties.laundromat.washSuccess', { amount: formatNumber(capacity) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const calculateMinuteProfit = (property: BuiltProperty) => {
    let baseHourly = 0;
    if (property.type === 'casino') baseHourly = 1500;
    else if (property.type === 'hotel') baseHourly = 800;
    else if (property.type === 'drug_factory') baseHourly = 500 + (property.workers || 0) * 20;
    else if (property.type === 'weapon_stash') baseHourly = 800;
    else if (property.type === 'bank') baseHourly = 1200;
    else if (property.type === 'ammunition_factory') baseHourly = 1000;
    else if (property.type === 'headquarters') baseHourly = 2000;
    
    // Add level bonus
    let multiplier = 1 + (property.level - 1) * 0.01;

    // Add internal upgrades bonus (each upgrade level adds 10%)
    if (property.upgrades) {
      Object.values(property.upgrades).forEach(val => {
        multiplier += (Number(val) || 0) * 0.005;
      });
    }

    // Add manager bonus (50% increase)
    if (property.managerId) {
      multiplier *= 1.1;
      
      // Find manager to check for traits
      let manager: any = profile?.family?.wives.find(w => w.id === property.managerId);
      if (!manager) {
        manager = profile?.family?.wives.flatMap(w => w.children).find(c => c.id === property.managerId);
      }
      
      if (manager && manager.traits?.includes('clever')) {
        multiplier *= 1.2;
      }
    }
    
    return Math.floor((baseHourly * multiplier) / 60);
  };

  const handleToggleSafeHouse = async () => {
    if (!profile) return;
    
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        inSafeHouse: !profile.inSafeHouse
      });
      toast.success(profile.inSafeHouse ? t('properties.safe_house.exited') : t('properties.safe_house.entered'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    }
  };

  const handleCollectProfits = async (property: BuiltProperty) => {
    if (!profile || processing) return;
    
    const now = Date.now();
    const lastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || Date.now());
    const minutesPassed = Math.floor((now - lastCollection) / (1000 * 60));
    
    if (minutesPassed < 1) {
      toast.error(t('properties.noProfits'));
      return;
    }

    setProcessing(true);

    const baseMinuteProfit = calculateMinuteProfit(property);
    const minuteProfit = Math.floor(baseMinuteProfit * getVIPMultiplier(profile.vipLevel as any));
    const totalProfit = minuteProfit * minutesPassed;

    const updatedProperties = builtProperties.map(p => {
      if (p.id === property.id) {
        return { ...p, lastProfitCollection: now };
      }
      return p;
    });

    const newFamilyIncome = (profile.familyFinances?.income || 0) + totalProfit;

    if (property.type === 'headquarters') {
      if (!profile.gangId) {
        toast.error(t('properties.headquarters.noGang'));
        setProcessing(false);
        return;
      }
      
      try {
        const gangRef = doc(db, 'gangs', profile.gangId);
        const gangDoc = await getDoc(gangRef);
        if (gangDoc.exists()) {
          const gangData = gangDoc.data();
          await updateDoc(gangRef, {
            bankBalance: increment(totalProfit)
          });
          
          await updateDoc(doc(db, 'users', profile.uid), {
            builtProperties: updatedProperties,
            'familyFinances.income': increment(totalProfit),
            'familyFinances.lastUpdate': now
          });
          toast.success(t('properties.headquarters.profitsDonated', { amount: formatNumber(totalProfit) }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `gangs/${profile.gangId}`);
      } finally {
        setProcessing(false);
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(totalProfit),
        builtProperties: updatedProperties,
        'familyFinances.income': increment(totalProfit),
        'familyFinances.lastUpdate': now
      });
      toast.success(t('properties.profitsCollected', { amount: formatNumber(totalProfit) }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setProcessing(false);
    }
  };

  const renderManagementUI = (property: BuiltProperty) => {
    const familyMembers = [
      ...(profile?.family?.wives || []).map(w => ({ id: w.id, name: w.name, type: 'wife', gender: 'female' })),
      ...(profile?.family?.wives || []).flatMap(w => (w.children || []).map(c => ({ id: c.id, name: c.name, type: 'child', gender: c.gender })))
    ];

    const managerAssignment = (
      <div className="p-6 bg-black/40 rounded-2xl border border-zinc-800 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-1 h-full bg-red-600 group-hover:bg-red-500 transition-colors"></div>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-600/10 rounded-xl border border-red-600/20">
            <Users className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="font-black text-white text-sm uppercase tracking-tighter italic">إدارة المنشأة</h4>
            <p className="text-[10px] text-zinc-500 font-bold">تعيين أحد أفراد العائلة لإدارة العمليات وزيادة الأرباح بنسبة 50%</p>
          </div>
        </div>
        <select 
          className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm font-black text-white focus:outline-none focus:border-red-600 transition-all appearance-none cursor-pointer"
          value={property.managerId || ''}
          onChange={async (e) => {
            const managerId = e.target.value || null;
            const updatedProperties = builtProperties.map(p => p.id === property.id ? { ...p, managerId } : p);
            
            // Update family member's managedPropertyId
            const updatedWives = profile!.family!.wives.map(wife => {
              let newWife = { ...wife };
              if (wife.id === managerId) {
                newWife.managedPropertyId = property.id;
              } else if (wife.managedPropertyId === property.id && wife.id !== managerId) {
                newWife.managedPropertyId = undefined;
              }
              
              newWife.children = wife.children.map(child => {
                if (child.id === managerId) {
                  return { ...child, managedPropertyId: property.id };
                }
                if (child.managedPropertyId === property.id && child.id !== managerId) {
                  return { ...child, managedPropertyId: undefined };
                }
                return child;
              });
              return newWife;
            });

            await updateDoc(doc(db, 'users', profile!.uid), { 
              builtProperties: updatedProperties,
              'family.wives': updatedWives
            });
            toast.success('تم تعيين المدير بنجاح!');
          }}
        >
          <option value="">بدون مدير (إدارة يدوية)</option>
          {familyMembers.map(m => (
            <option key={m.id} value={m.id}>{m.name} ({m.type === 'wife' ? 'زوجة' : m.gender === 'boy' ? 'ابن' : 'ابنة'})</option>
          ))}
        </select>
        {property.managerId && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-3 text-[10px] font-black text-emerald-500 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="uppercase tracking-widest">المنشأة تحت إدارة احترافية (كفاءة 150%)</span>
          </motion.div>
        )}
        {property.activityLog && property.activityLog.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800/50">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              {t('properties.activityLog')}
            </p>
            <ul className="text-[10px] font-bold text-zinc-400 space-y-2">
              {property.activityLog.slice(-3).map((log, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  {log}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );

    const upgradeItem = (label: string, key: string, baseCost: number, maxLevel?: number) => {
      const level = property.upgrades?.[key] || 0;
      const isMaxed = maxLevel !== undefined && level >= maxLevel;
      const cost = baseCost * (level + 1);
      return (
        <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all">
          <div>
            <p className="text-xs font-black text-white uppercase tracking-tighter italic">{label}</p>
            <p className="text-[10px] text-zinc-500 font-bold mt-0.5">{isMaxed ? 'أقصى مستوى' : t('properties.level', { level })}</p>
          </div>
          <button 
            onClick={() => handleUpgrade(property, key, cost)}
            disabled={isMaxed || profile!.cleanMoney < cost}
            className={`px-4 py-2 text-[10px] rounded-xl font-black transition-all uppercase tracking-widest ${
              isMaxed 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white border border-zinc-700 hover:border-red-500'
            }`}
          >
            {isMaxed ? 'MAX' : formatMoney(cost)}
          </button>
        </div>
      );
    };

    const upgradeLevelButton = (
      <div className="flex items-center justify-between p-5 bg-red-600/5 rounded-2xl border border-red-600/20 mb-6 group">
        <div>
          <p className="text-sm font-black text-red-500 uppercase tracking-tighter italic">{t('properties.upgradeLevel')}</p>
          <p className="text-[10px] text-red-500/60 font-bold">{t('properties.level', { level: property.level })}</p>
        </div>
        <button 
          onClick={() => handleUpgradeLevel(property)}
          disabled={profile!.cleanMoney < 500000 * property.level}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 border-b-4 border-red-800"
        >
          {formatMoney(500000 * property.level)}
        </button>
      </div>
    );

    const sellButton = (
      <button 
        onClick={() => handleSell(property)}
        className="w-full py-4 mt-8 bg-zinc-900 text-zinc-500 hover:bg-red-950/50 hover:text-red-500 rounded-2xl transition-all border border-zinc-800 hover:border-red-900/50 font-black uppercase tracking-widest text-[10px]"
      >
        {t('properties.sell')}
      </button>
    );

    switch (property.type) {
      case 'headquarters':
        const hqLastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || currentTime);
        const hqMinutesPassed = Math.floor((currentTime - hqLastCollection) / (1000 * 60));
        const hqMinuteProfit = calculateMinuteProfit(property);
        const hqProfit = hqMinuteProfit * hqMinutesPassed;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center text-center group">
                <div className="p-3 bg-emerald-500/10 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.pendingProfit')}</p>
                <p className="text-2xl font-black text-emerald-500">{formatMoney(Math.floor(hqProfit))}</p>
                <button
                  onClick={() => handleCollectProfits(property)}
                  disabled={hqMinutesPassed < 1}
                  className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-emerald-600/20"
                >
                  {t('properties.collect')}
                </button>
              </div>

              <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center text-center group">
                <div className="p-3 bg-red-600/10 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.headquarters.donateToGang')}</p>
                <p className="text-2xl font-black text-white">{formatMoney(Math.floor(hqProfit))}</p>
                <button
                  onClick={() => handleDonateProfitsToGang(property)}
                  disabled={hqMinutesPassed < 1 || !profile.gangId}
                  className="mt-4 w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-600/20"
                >
                  {t('properties.headquarters.donateToGang')}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('properties.upgrades.title')}</h5>
              {upgradeItem(t('properties.hq.security'), 'security', 200000)}
              {upgradeItem(t('properties.hq.intel'), 'intel', 150000)}
              {upgradeItem(t('properties.hq.tactical'), 'tactical', 250000)}
            </div>
            {sellButton}
          </div>
        );
      case 'laundromat':
        let laundromatCapacity = ((property.upgrades?.washers || 0) * 10000 + 5000) * (1 + (property.level - 1) * 0.5);
        if (property.managerId) laundromatCapacity *= 1.5;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}
            
            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 group">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.laundromat.capacity')}</p>
                  <p className="text-2xl font-black text-teal-500">{formatMoney(laundromatCapacity)}</p>
                </div>
                <div className="p-3 bg-teal-500/10 rounded-xl group-hover:rotate-12 transition-transform">
                  <RefreshCw className="w-6 h-6 text-teal-500" />
                </div>
              </div>
              <button 
                onClick={() => handleLaunder(property)}
                disabled={profile.dirtyMoney < 1000}
                className="w-full py-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-teal-600/20 border-b-4 border-teal-800"
              >
                {t('properties.laundromat.washBtn', { amount: formatNumber(laundromatCapacity) })}
              </button>
            </div>

            <div className="space-y-3">
              {upgradeItem(t('properties.laundromat.washers'), 'washers', 50000)}
              {upgradeItem(t('properties.laundromat.accounting'), 'accounting', 75000)}
            </div>
            {sellButton}
          </div>
        );
      case 'drug_factory':
        const drugLastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || currentTime);
        const drugMinutesPassed = Math.floor((currentTime - drugLastCollection) / (1000 * 60));
        const drugMinuteProfit = calculateMinuteProfit(property);
        const drugProfit = drugMinuteProfit * drugMinutesPassed;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}
            
            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 group">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.pendingProfit')}</p>
                  <p className="text-2xl font-black text-emerald-500">{formatMoney(Math.floor(drugProfit))}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Beaker className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <button
                onClick={() => handleCollectProfits(property)}
                disabled={drugMinutesPassed < 1}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-600/20 border-b-4 border-emerald-800"
              >
                {t('properties.collect')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.drugs.chemists')}</p>
                <p className="text-xl font-black text-white">{property.workers || 0}</p>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.drugs.quality')}</p>
                <p className="text-xl font-black text-white">Lvl {property.upgrades?.lab_equipment || 0}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all">
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tighter italic">{t('properties.drugs.hire')}</p>
                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5">{t('properties.drugs.chemist_desc')}</p>
                </div>
                <button 
                  onClick={() => handleHireWorker(property, 15000)}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] rounded-xl font-black uppercase tracking-widest transition-all"
                >
                  {formatMoney(15000)}
                </button>
              </div>
              {upgradeItem(t('properties.drugs.lab'), 'lab_equipment', 120000)}
              {upgradeItem(t('properties.drugs.quality_control'), 'quality_control', 100000)}
            </div>
            {sellButton}
          </div>
        );
      case 'weapon_stash':
        const weaponLastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || currentTime);
        const weaponMinutesPassed = Math.floor((currentTime - weaponLastCollection) / (1000 * 60));
        const weaponMinuteProfit = calculateMinuteProfit(property);
        const weaponProfit = weaponMinuteProfit * weaponMinutesPassed;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}

            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 group">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.pendingProfit')}</p>
                  <p className="text-2xl font-black text-emerald-500">{formatMoney(Math.floor(weaponProfit))}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Crosshair className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <button
                onClick={() => handleCollectProfits(property)}
                disabled={weaponMinutesPassed < 1}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-600/20 border-b-4 border-emerald-800"
              >
                {t('properties.collect')}
              </button>
            </div>

            <div className="space-y-3">
              {upgradeItem(t('properties.weapons.security'), 'security', 80000)}
              {upgradeItem(t('properties.weapons.distribution'), 'distribution', 120000)}
            </div>
            {sellButton}
          </div>
        );
      case 'ammunition_factory':
        const ammoLastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || currentTime);
        const ammoMinutesPassed = Math.floor((currentTime - ammoLastCollection) / (1000 * 60));
        const ammoMinuteProfit = calculateMinuteProfit(property);
        const ammoProfit = ammoMinuteProfit * ammoMinutesPassed;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}

            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 group">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.pendingProfit')}</p>
                  <p className="text-2xl font-black text-emerald-500">{formatMoney(Math.floor(ammoProfit))}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <button
                onClick={() => handleCollectProfits(property)}
                disabled={ammoMinutesPassed < 1}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-600/20 border-b-4 border-emerald-800"
              >
                {t('properties.collect')}
              </button>
            </div>

            <div className="space-y-3">
              {upgradeItem(t('properties.ammunition.production'), 'production_speed', 100000)}
              {upgradeItem(t('properties.ammunition.variety'), 'variety', 150000)}
            </div>
            {sellButton}
          </div>
        );
      case 'garage':
        const inventoryCars = profile?.inventory?.cars || {};
        const carNames = Object.keys(inventoryCars).filter(name => inventoryCars[name] > 0);
        const modifyCost = property.managerId ? 25000 : 50000;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}
            
            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Wrench className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm uppercase tracking-tighter italic">{t('properties.garage.modifyCars')}</h4>
                  <p className="text-[10px] text-zinc-500 font-bold">تعديل وتصفيح المركبات للعمليات الخاصة</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
                    {t('properties.garage.selectCar')}
                  </label>
                  <select 
                    value={selectedInventoryCar || ''}
                    onChange={(e) => setSelectedInventoryCar(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-sm font-black text-white focus:outline-none focus:border-purple-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">{t('properties.garage.chooseCar')}</option>
                    {carNames.map((carName) => (
                      <option key={carName} value={carName}>{carName} (x{inventoryCars[carName]})</option>
                    ))}
                  </select>
                </div>

                {selectedInventoryCar && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModifyCar(property, selectedInventoryCar)}
                      disabled={profile!.cleanMoney < modifyCost}
                      className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-purple-600/20 border-b-4 border-purple-800"
                    >
                      {t('properties.garage.modifyBtn')} ({formatMoney(modifyCost)})
                    </button>
                    <button
                      onClick={() => handleSellInventoryCar(selectedInventoryCar)}
                      className="px-6 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-600 hover:text-white transition-all"
                    >
                      {t('common.sell')}
                    </button>
                  </div>
                )}

                {carNames.length === 0 && (
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest text-center py-6 bg-black/20 rounded-2xl border border-zinc-800/50 border-dashed">
                    {t('properties.garage.noCarsInInventory')}
                  </p>
                )}
              </div>
            </div>

            {profile?.vehicles && profile.vehicles.length > 0 && (
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t('properties.garage.modifiedVehicles')}</h5>
                <div className="grid grid-cols-1 gap-3">
                  {profile.vehicles.map(vehicle => {
                    const upgradeCost = (25000 * (vehicle.armorLevel + 1)) * (property.managerId ? 0.5 : 1);
                    return (
                      <div key={vehicle.id} className="bg-black/40 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img src={vehicle.image} alt={vehicle.name} className="w-16 h-16 object-cover rounded-xl border border-zinc-800" />
                            <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-black">
                              MOD
                            </div>
                          </div>
                          <div>
                            <p className="font-black text-white text-sm uppercase tracking-tighter italic">{vehicle.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-[10px] text-zinc-500 font-bold">{t('properties.garage.armorLevel')}: <span className="text-purple-500">{vehicle.armorLevel}/5</span></p>
                              <p className="text-[10px] text-zinc-500 font-bold">{t('properties.garage.power')}: <span className="text-blue-500">{vehicle.power} HP</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleUpgradeArmor(property, vehicle.id, vehicle.armorLevel)}
                            disabled={vehicle.armorLevel >= 5 || profile!.cleanMoney < upgradeCost}
                            className="px-4 py-2 bg-zinc-800 hover:bg-purple-600 disabled:opacity-50 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-700 hover:border-purple-500"
                          >
                            {vehicle.armorLevel >= 5 ? t('properties.garage.maxed') : `${t('properties.garage.upgradeArmor')} (${formatMoney(upgradeCost)})`}
                          </button>
                          <button
                            onClick={() => handleSellModifiedVehicle(vehicle.id)}
                            className="px-4 py-2 bg-zinc-900/50 hover:bg-red-600 text-red-500/50 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-900/20 hover:border-red-500"
                          >
                            {t('common.sell')}
                          </button>
                        </div>
                      </div>
                    )})}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {upgradeItem(t('properties.garage.tuning'), 'tuning_shop', 100000)}
              {upgradeItem(t('properties.garage.armor'), 'armor_plating', 150000)}
            </div>

            {sellButton}
          </div>
        );
      case 'bank':
        const bankLastCollection = property.lastProfitCollection || (safeToMillis(profile.createdAt) || currentTime);
        const bankMinutesPassed = Math.floor((currentTime - bankLastCollection) / (1000 * 60));
        const bankMinuteProfit = calculateMinuteProfit(property);
        const bankProfit = bankMinuteProfit * bankMinutesPassed;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}
            
            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 group">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.pendingProfit')}</p>
                  <p className="text-2xl font-black text-emerald-500">{formatMoney(Math.floor(bankProfit))}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:rotate-12 transition-transform">
                  <Landmark className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              <button
                onClick={() => handleCollectProfits(property)}
                disabled={bankMinutesPassed < 1}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-600/20 border-b-4 border-emerald-800"
              >
                {t('properties.collect')}
              </button>
            </div>

            <div className="space-y-3">
              {upgradeItem(t('properties.bank.vault'), 'vault_security', 500000)}
              {upgradeItem(t('properties.bank.efficiency'), 'laundering_efficiency', 300000)}
            </div>
            {sellButton}
          </div>
        );
      case 'safe_house':
        const isInside = profile?.inSafeHouse;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}
            
            <div className="bg-black/40 p-8 rounded-3xl border border-zinc-800 flex flex-col items-center justify-center gap-6 relative overflow-hidden group">
              <div className={`absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10 ${isInside ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              
              <div className={`p-5 rounded-2xl border ${isInside ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                <Shield className="w-10 h-10" />
              </div>

              <div className="text-center relative z-10">
                <p className="text-lg font-black text-white uppercase tracking-tighter italic mb-2">
                  {isInside ? t('properties.safe_house.insideMsg') : t('properties.safe_house.outsideMsg')}
                </p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  {isInside ? 'أنت في منطقة آمنة تماماً' : 'أنت مكشوف للأعداء حالياً'}
                </p>
              </div>

              <button
                onClick={() => handleToggleSafeHouse()}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all relative z-10 shadow-xl border-b-4 ${
                  isInside 
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20 border-red-800' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 border-emerald-800'
                }`}
              >
                {isInside ? t('properties.safe_house.exit') : t('properties.safe_house.enter')}
              </button>
            </div>

            <div className="space-y-3">
              {upgradeItem(t('properties.safe_house.defense'), 'defense', 100000)}
              {upgradeItem(t('properties.safe_house.reinforced_doors'), 'reinforced_doors', 150000)}
            </div>
            {sellButton}
          </div>
        );
      case 'casino':
      case 'hotel':
        const lastCollection = property.lastProfitCollection || (safeToMillis(profile?.createdAt) || currentTime);
        const minutesPassed = Math.floor((currentTime - lastCollection) / (1000 * 60));
        const minuteProfit = calculateMinuteProfit(property);
        const pendingProfits = minuteProfit * minutesPassed;

        return (
          <div className="mt-8 space-y-6">
            {managerAssignment}
            {upgradeLevelButton}
            
            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 group">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.pendingProfit')}</p>
                  <p className="text-2xl font-black text-emerald-500">{formatMoney(Math.floor(pendingProfits))}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{t('properties.profitPerMinute')}</p>
                  <p className="text-2xl font-black text-white">{formatMoney(minuteProfit)}</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleCollectProfits(property)}
                disabled={minutesPassed < 1}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl border-b-4 ${
                  minutesPassed < 1 
                    ? 'bg-zinc-800 text-zinc-600 border-zinc-900 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 border-emerald-800'
                }`}
              >
                {t('properties.collectProfits')}
              </button>
            </div>

            <div className="space-y-3">
              {property.type === 'casino' 
                ? upgradeItem(t('properties.casino.security'), 'security', 200000)
                : upgradeItem(t('properties.hotel.luxury'), 'luxury', 300000)
              }
            </div>
            {sellButton}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen pb-20">
      {/* Mafia Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/mafia_city/1920/1080?blur=10')] bg-cover bg-center opacity-20 grayscale"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black"></div>
      </div>

      <div className="relative z-10 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-600/20 rounded-2xl border border-red-500/30 shadow-lg shadow-red-500/10">
              <Building2 className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                {t('properties.title')}
              </h1>
              <p className="text-zinc-400 font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" />
                {t('properties.desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md p-2 rounded-2xl border border-zinc-800">
            <TrendingUp className="w-5 h-5 text-emerald-500 ml-2" />
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-1">إجمالي الدخل الساعي</p>
              <p className="text-xl font-black text-emerald-500 leading-none">
                {formatMoney(builtProperties.reduce((acc, p) => acc + calculateMinuteProfit(p) * 60, 0))}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {CITIES.map((city, idx) => (
            <motion.button
              key={city}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedCity(city)}
              className={`px-8 py-4 rounded-2xl font-black whitespace-nowrap transition-all uppercase tracking-tighter text-sm ${
                selectedCity === city 
                  ? 'bg-red-600 text-white shadow-xl shadow-red-600/20 border-b-4 border-red-800' 
                  : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800 hover:text-white border border-zinc-800'
              }`}
            >
              {t(`map.cities.${city}`)}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {ownedTilesInCity.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full p-12 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl text-center border-dashed"
              >
                <AlertTriangle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-bold text-lg">{t('properties.noProperties')}</p>
              </motion.div>
            ) : (
              ownedTilesInCity.map((tileId, idx) => {
                const builtProp = cityProperties.find(p => p.tileId === tileId);
                const isBuilt = !!builtProp;
                const isExpanded = expandedProperty === builtProp?.id;
                const isBuilding = buildingOnTile === tileId;

                if (isBuilt && builtProp) {
                  const propType = PROPERTY_TYPES.find(pt => pt.id === builtProp.type)!;
                  return (
                    <motion.div 
                      key={`tile-${tileId}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`group bg-zinc-900/80 backdrop-blur-md border ${propType.border} rounded-3xl p-8 transition-all hover:shadow-2xl ${propType.glow} relative overflow-hidden`}
                    >
                      {/* Decorative Background Icon */}
                      <propType.icon className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12 pointer-events-none" />

                      <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-6">
                          <div className={`p-5 rounded-2xl ${propType.bg} ${propType.color} shadow-inner`}>
                            <propType.icon className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                {t(`properties.types.${propType.id}`)}
                              </h3>
                              <div className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                {t('properties.level', { level: builtProp.level })}
                              </div>
                            </div>
                            <p className="text-sm text-zinc-400 font-medium max-w-[280px] leading-relaxed">
                              {t(`properties.desc_types.${propType.id}`)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 mt-8 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">الأرباح الساعية</p>
                              <p className="text-lg font-black text-emerald-500">{formatMoney(calculateMinuteProfit(builtProp) * 60)}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleManage(builtProp.id)}
                            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-700"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              {renderManagementUI(builtProp)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div 
                    key={`tile-${tileId}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 border-dashed rounded-3xl p-8 transition-all hover:bg-zinc-900/60"
                  >
                    <div className="flex items-center gap-6 mb-8">
                      <div className="p-5 rounded-2xl bg-zinc-800/50 text-zinc-600">
                        <Skull className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-zinc-500 tracking-tighter uppercase italic">
                          {t('properties.emptyTile', { id: tileId })}
                        </h3>
                        <p className="text-sm text-zinc-600 font-medium">أرض خالية تنتظر استثمارك الإجرامي</p>
                      </div>
                    </div>

                    {isBuilding ? (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 text-center">
                          {t('properties.selectToBuild')}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {PROPERTY_TYPES.map(propType => (
                            <button 
                              key={propType.id}
                              onClick={() => handleBuild(propType, tileId)}
                              className="group w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-red-600/10 rounded-2xl transition-all border border-zinc-800 hover:border-red-600/50"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${propType.bg} ${propType.color}`}>
                                  <propType.icon className="w-5 h-5" />
                                </div>
                                <span className="text-white font-black uppercase tracking-tighter italic">{t(`properties.types.${propType.id}`)}</span>
                              </div>
                              <span className="text-emerald-500 font-black text-sm">{formatMoney(propType.price)}</span>
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => setBuildingOnTile(null)}
                          className="w-full py-4 mt-4 text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setBuildingOnTile(tileId)}
                        className="w-full py-5 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-xs border border-zinc-700 hover:border-red-500 shadow-lg hover:shadow-red-600/20"
                      >
                        {t('properties.buildOnTile')}
                      </button>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
