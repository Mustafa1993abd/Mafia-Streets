import React, { useState, useEffect } from 'react';
import { Gift, CheckCircle, Lock, Car, Crosshair, Shield, Landmark, Package, PackageOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { MARKET_ITEMS } from '../lib/items';
import clsx from 'clsx';
import { formatMoney } from '../lib/utils';
import { getVIPMultiplier } from '../lib/vip';
import { motion } from 'motion/react';

const REWARDS = [
  { day: 1, type: 'money', amount: 500, name: '500$', icon: Landmark, color: 'text-green-500' },
  { day: 2, type: 'money', amount: 1000, name: '1,000$', icon: Landmark, color: 'text-green-500' },
  { day: 3, type: 'weapon', itemId: 'w1', name: 'Glock 19', icon: Crosshair, color: 'text-red-500' },
  { day: 4, type: 'money', amount: 2500, name: '2,500$', icon: Landmark, color: 'text-green-500' },
  { day: 5, type: 'car', itemId: 'c1', name: 'Honda Civic', icon: Car, color: 'text-blue-500' },
  { day: 6, type: 'armor', itemId: 'a1', name: 'Light Kevlar', icon: Shield, color: 'text-purple-500' },
  { day: 7, type: 'money', amount: 5000, name: '5,000$', icon: Landmark, color: 'text-green-500' },
  { day: 8, type: 'weapon', itemId: 'w3', name: 'AK-47', icon: Crosshair, color: 'text-red-500' },
  { day: 9, type: 'car', itemId: 'c2', name: 'Dodge Charger', icon: Car, color: 'text-blue-500' },
  { day: 10, type: 'grand', amount: 25000, itemId: 'c6', name: '25K$ + G-Class', icon: Gift, color: 'text-yellow-500' },
];

const getFunnyMessage = (day: number, reward: any) => {
  switch (day) {
    case 1: return `هلا بالضلع! هاي ${formatMoney(reward.amount)} تفيدك حق جكاير ورصيد، لا تصرفها عالكهاوي!`;
    case 2: return `عاشت ايدك بطل! ${formatMoney(reward.amount)} طكت بجيبك، روح اضرب بيها باجة معدلة!`;
    case 3: return `اويلي يابا! ${reward.name} يلمع، دير بالك لا تثور بالغلط وتفضحنا بالمنطقة!`;
    case 4: return `خمسين ورقة.. اقصد ${formatMoney(reward.amount)}! صرت زنكين يا خوي، لا تنسى ربعك عاد!`;
    case 5: return `${reward.name} يا عيني! هسه تكدر تفحط بالشارع براحتك، بس دير بالك من المرور!`;
    case 6: return `درع ثقيل! هسه لو تضربك دبابة ما يهمك، صرت حديد يا يابه!`;
    case 7: return `مية ألف كاش! عمي طكت ولزكت، روح اشتريلك بيت بالخضراء!`;
    case 8: return `قناصة ${reward.name}! هسه تكدر تصيد الذبانة من كيلو متر، عاش القناص!`;
    case 9: return `جكسارة ${reward.name}! عمي صرت من كبار الشخصيات، بس لا تتكبر علينا!`;
    case 10: return `مليون دولار وبوغاتي!! يابا انت ختمت اللعبة، هسه تكدر تشتري نص بغداد!`;
    default: return `مبروك الجائزة! استمر يا بطل!`;
  }
};

const getBigChestMessage = (amount: number) => {
  const messages = [
    `يابا شنو هالرزق! فتحت الصندوق وطكت بـ ${formatMoney(amount)}، عمي صرت ملياردير، لا تنسانا بعزيمة باجة!`,
    `اللهم صلي على محمد! ${formatMoney(amount)} كاش من الصندوق السري، روح اشتريلك طيارة خاصة وفكنا!`,
    `ولك هاي شنو! ${formatMoney(amount)} دولار!! عمي انت حظك يكسر الصخر، مبروك يا ذيب!`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

const SPIN_PRIZES = [
  { id: 0, type: 'money', amount: 5000, label: '5 آلاف$', color: '#ffffff', textColor: '#b45309' },
  { id: 1, type: 'influence', tier: 'bronze', label: 'نفوذ برونزي', color: '#eab308', textColor: '#ffffff' },
  { id: 2, type: 'money', amount: 10000, label: '10 آلاف$', color: '#ffffff', textColor: '#b45309' },
  { id: 3, type: 'influence', tier: 'silver', label: 'نفوذ فضي', color: '#eab308', textColor: '#ffffff' },
  { id: 4, type: 'money', amount: 25000, label: '25 ألف$', color: '#ffffff', textColor: '#b45309' },
  { id: 5, type: 'money', amount: 50000, label: '50 ألف$', color: '#eab308', textColor: '#ffffff' },
  { id: 6, type: 'influence', tier: 'diamond', label: 'نفوذ ماسي', color: '#ffffff', textColor: '#b45309' },
  { id: 7, type: 'money', amount: 100000, label: '100 ألف$', color: '#eab308', textColor: '#ffffff' },
];

const getSpinMessage = (prize: any) => {
  if (prize.type === 'money') {
    return `فرت العجلة وطكت بـ ${prize.label}! عمي رزقك من السما، روح اصرفها وتونس!`;
  } else {
    return `مبروك! حصلت ${prize.label} لمدة أسبوع! هسه محد يكدر يحجي وياك، صرت واصل!`;
  }
};

export default function DailyReward() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [claiming, setClaiming] = useState(false);
  const [claimingChest, setClaimingChest] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  const [chestReward, setChestReward] = useState<number | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<any>(null);

  if (!profile) return null;

  const currentDay = profile.dailyRewardDay || 0;
  const lastClaimStr = profile.lastDailyRewardClaim;
  
  let canClaim = false;
  if (!lastClaimStr) {
    canClaim = true;
  } else {
    const lastClaim = new Date(lastClaimStr);
    const now = new Date();
    // Check if it's a new day (different date string)
    if (lastClaim.toDateString() !== now.toDateString()) {
      canClaim = true;
    }
  }

  const lastBigChestStr = profile.lastBigChestClaim;
  let canClaimBigChest = false;
  if (!lastBigChestStr) {
    canClaimBigChest = true;
  } else {
    const lastBigChest = new Date(lastBigChestStr);
    const now = new Date();
    if (lastBigChest.toDateString() !== now.toDateString()) {
      canClaimBigChest = true;
    }
  }

  const lastSpinStr = profile.lastSpinDate;
  // Admin can always spin
  const canSpin = profile.role === 'Admin' || !lastSpinStr || new Date(lastSpinStr).toDateString() !== new Date().toDateString();

  const handleClaim = async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);

    try {
      const nextDay = currentDay >= 10 ? 1 : currentDay + 1;
      const reward = REWARDS.find(r => r.day === nextDay);
      
      if (!reward) throw new Error("Reward not found");

      let updates: any = {
        dailyRewardDay: nextDay,
        lastDailyRewardClaim: new Date().toISOString()
      };

      const inventory = profile.inventory || { cars: {}, bikes: 0, weapons: {}, drugs: {}, armor: {}, tools: {} };
      let updatedInventory = { ...inventory };

      if (reward.type === 'money') {
        const amount = Math.floor(reward.amount! * getVIPMultiplier(profile.vipLevel as any));
        updates.cleanMoney = (profile.cleanMoney || 0) + amount;
      } else if (reward.type === 'weapon') {
        updatedInventory.weapons = { ...updatedInventory.weapons, [reward.itemId!]: (updatedInventory.weapons[reward.itemId!] || 0) + 1 };
        updates.inventory = updatedInventory;
      } else if (reward.type === 'car') {
        updatedInventory.cars = { ...updatedInventory.cars, [reward.itemId!]: (updatedInventory.cars[reward.itemId!] || 0) + 1 };
        updates.inventory = updatedInventory;
      } else if (reward.type === 'armor') {
        updatedInventory.armor = { ...updatedInventory.armor, [reward.itemId!]: (updatedInventory.armor[reward.itemId!] || 0) + 1 };
        updates.inventory = updatedInventory;
      } else if (reward.type === 'grand') {
        const amount = Math.floor(reward.amount! * getVIPMultiplier(profile.vipLevel as any));
        updates.cleanMoney = (profile.cleanMoney || 0) + amount;
        updatedInventory.cars = { ...updatedInventory.cars, [reward.itemId!]: (updatedInventory.cars[reward.itemId!] || 0) + 1 };
        updates.inventory = updatedInventory;
      }

      await updateDoc(doc(db, 'users', profile.uid), updates);
      
      const funnyMessage = getFunnyMessage(nextDay, reward);
      
      try {
        await addDoc(collection(db, 'messages'), {
          senderId: profile.uid,
          senderName: '🎁 الجائزة اليومية',
          receiverId: profile.uid,
          content: funnyMessage,
          type: 'system',
          read: false,
          timestamp: new Date(),
          subject: 'استلام الجائزة اليومية'
        });
      } catch (msgErr) {
        console.error("Failed to send system message:", msgErr);
      }
      
      toast.success(funnyMessage, { duration: 6000 });
      
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.error'));
    } finally {
      setClaiming(false);
    }
  };

  const handleBigChestClaim = async () => {
    if (!canClaimBigChest || claimingChest) return;
    setClaimingChest(true);

    try {
      // Random amount between 10,000 and 50,000
      const rewardAmount = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
      
      let updates: any = {
        cleanMoney: (profile.cleanMoney || 0) + rewardAmount,
        lastBigChestClaim: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', profile.uid), updates);
      
      const funnyMessage = getBigChestMessage(rewardAmount);
      
      try {
        await addDoc(collection(db, 'messages'), {
          senderId: profile.uid,
          senderName: '📦 صندوق الحظ السري',
          receiverId: profile.uid,
          content: funnyMessage,
          type: 'system',
          read: false,
          timestamp: new Date(),
          subject: 'جائزة صندوق الحظ السري'
        });
      } catch (msgErr) {
        console.error("Failed to send system message:", msgErr);
      }
      
      setChestReward(rewardAmount);
      setChestOpened(true);
      toast.success(funnyMessage, { duration: 8000 });
      
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.error'));
    } finally {
      setClaimingChest(false);
    }
  };

  const handleSpin = async () => {
    const isAdmin = profile.role === 'Admin';
    if (!isAdmin && (!canSpin || isSpinning)) return;
    
    setIsSpinning(true);
    setSpinResult(null);

    const prizeIndex = Math.floor(Math.random() * SPIN_PRIZES.length);
    const prize = SPIN_PRIZES[prizeIndex];

    const sliceAngle = 360 / SPIN_PRIZES.length;
    const targetRotation = spinRotation + 360 * 5 + (360 - (prizeIndex * sliceAngle + sliceAngle / 2));

    setSpinRotation(targetRotation);

    setTimeout(async () => {
      try {
        const updateData: any = {};
        
        // Only update lastSpinDate if not admin
        if (!isAdmin) {
          updateData.lastSpinDate = new Date().toISOString();
        }

        if (prize.type === 'money') {
          updateData.cleanMoney = (profile.cleanMoney || 0) + prize.amount;
        } else if (prize.type === 'influence') {
          updateData.influence = {
            type: prize.tier,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 1 week
          };
        }

        await updateDoc(doc(db, 'users', profile.uid), updateData);

        const funnyMessage = getSpinMessage(prize);

        try {
          await addDoc(collection(db, 'messages'), {
            senderId: profile.uid,
            senderName: '🎡 عجلة الحظ',
            receiverId: profile.uid,
            content: funnyMessage,
            type: 'system',
            read: false,
            timestamp: new Date(),
            subject: 'جائزة عجلة الحظ'
          });
        } catch (msgErr) {
          console.error("Failed to send system message:", msgErr);
        }
        
        setSpinResult(prize);
        toast.success(funnyMessage, { duration: 6000 });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
        toast.error('حدث خطأ أثناء استلام الجائزة');
      } finally {
        setIsSpinning(false);
      }
    }, 5000); // 5 seconds animation
  };

  const sliceAngle = 360 / SPIN_PRIZES.length;
  const gradientStops = SPIN_PRIZES.map((p, i) => {
    const start = i * sliceAngle;
    const end = (i + 1) * sliceAngle;
    return `${p.color} ${start}deg ${end}deg`;
  }).join(', ');

  const getItemImage = (type: string, itemId?: string) => {
    if (!itemId) return null;
    let item;
    if (type === 'weapon') item = MARKET_ITEMS.weapons.find(i => i.id === itemId);
    if (type === 'car' || type === 'grand') item = MARKET_ITEMS.cars.find(i => i.id === itemId);
    if (type === 'armor') item = MARKET_ITEMS.armor.find(i => i.id === itemId);
    return item?.image;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
          <Gift size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">الجائزة اليومية</h1>
          <p className="text-zinc-400">سجل دخولك يومياً لتحصل على جوائز قيمة، سيارات، وأسلحة غالية!</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
          {REWARDS.map((reward) => {
            const isClaimed = reward.day <= currentDay;
            const isNext = reward.day === (currentDay >= 10 ? 1 : currentDay + 1);
            const isLocked = reward.day > currentDay + 1;
            const itemImage = getItemImage(reward.type, reward.itemId);

            return (
              <motion.div
                key={reward.day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reward.day * 0.05 }}
                className={clsx(
                  "relative rounded-xl border-2 p-2 flex flex-col items-center justify-center text-center min-h-[110px] transition-all",
                  isClaimed ? "bg-zinc-950/50 border-green-500/30 opacity-70" :
                  isNext ? "bg-yellow-500/10 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-105 z-10" :
                  "bg-zinc-950/50 border-zinc-800 opacity-50"
                )}
              >
                <div className="absolute top-1 right-2 text-[10px] font-bold text-zinc-500">
                  يوم {reward.day}
                </div>

                {isClaimed && (
                  <div className="absolute top-1 left-2 text-green-500">
                    <CheckCircle size={14} />
                  </div>
                )}

                {isLocked && !isClaimed && (
                  <div className="absolute top-1 left-2 text-zinc-600">
                    <Lock size={14} />
                  </div>
                )}

                {itemImage ? (
                  <img src={itemImage} alt={reward.name} className="w-10 h-10 object-contain mb-2 drop-shadow-lg" />
                ) : (
                  <reward.icon size={28} className={clsx("mb-2", reward.color)} />
                )}

                <div className={clsx(
                  "font-bold text-xs",
                  isNext ? "text-yellow-500" : "text-zinc-300"
                )}>
                  {reward.name}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center relative z-10">
          <button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            className={clsx(
              "px-8 py-3 rounded-xl font-bold text-base flex items-center gap-2 transition-all",
              canClaim 
                ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]" 
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            <Gift size={20} className={canClaim ? "animate-bounce" : ""} />
            {claiming ? "جاري الاستلام..." : canClaim ? "استلام جائزة اليوم" : "عد غداً لاستلام الجائزة القادمة"}
          </button>
        </div>
      </div>

      {/* Big 3D Chest Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8 relative overflow-hidden flex flex-col items-center justify-center text-center">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 uppercase">
          صندوق الحظ السري
        </h2>
        <p className="text-zinc-400 mb-8 max-w-md">
          افتح الصندوق السري يومياً لفرصة ربح جائزة كبرى!
        </p>

        <motion.button
          onClick={handleBigChestClaim}
          disabled={!canClaimBigChest || claimingChest}
          whileHover={canClaimBigChest && !chestOpened ? { scale: 1.1, rotateZ: [-2, 2, -2, 2, 0] } : {}}
          whileTap={canClaimBigChest && !chestOpened ? { scale: 0.95 } : {}}
          className={clsx(
            "relative flex flex-col items-center justify-center transition-all duration-300 z-10 outline-none",
            canClaimBigChest 
              ? "cursor-pointer" 
              : "cursor-not-allowed opacity-80 grayscale"
          )}
        >
          {/* Glowing aura behind the chest */}
          {canClaimBigChest && !chestOpened && (
            <div className="absolute inset-0 bg-yellow-500/40 blur-[50px] rounded-full animate-pulse" />
          )}

          {chestOpened ? (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="flex flex-col items-center relative z-10"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400/40 blur-[60px] rounded-full animate-pulse" />
                <img 
                  src="https://img.icons8.com/fluency/512/gold-bars.png" 
                  alt="Open Treasure Chest" 
                  className="w-64 h-64 object-contain drop-shadow-[0_20px_50px_rgba(234,179,8,0.6)] mb-4 relative z-10"
                  onError={(e) => {
                    e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/2928/2928883.png";
                  }}
                />
              </div>
              <div className="absolute bottom-4 bg-black/90 px-8 py-3 rounded-full border-2 border-yellow-500/50 backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.3)] z-20">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-md">
                  +{formatMoney(chestReward || 0)}
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="relative z-10">
              <img 
                src="https://img.icons8.com/fluency/512/treasure-chest.png" 
                alt="Treasure Chest" 
                className={clsx(
                  "w-56 h-56 object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.8)] transition-transform duration-700",
                  canClaimBigChest && "animate-[bounce_3s_infinite]"
                )}
                onError={(e) => {
                  e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/5254/5254006.png";
                }}
              />
              {!canClaimBigChest && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl backdrop-blur-sm scale-90">
                  <div className="text-center bg-black/80 px-6 py-3 rounded-2xl border border-zinc-700 shadow-xl">
                    <Lock size={28} className="mx-auto mb-2 text-zinc-400" />
                    <span className="text-base font-bold text-zinc-300">يفتح غداً</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.button>
        
        {chestOpened && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-green-400 font-bold text-lg"
          >
            تم استلام الجائزة بنجاح! راجع صندوق رسائلك.
          </motion.p>
        )}
      </div>

      {/* Daily Spin Section */}
      <div className="mt-16 bg-zinc-900/80 rounded-3xl p-8 border border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col items-center">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">
            عجلة الحظ (Daily Spin)
          </h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            فر العجلة يومياً واربح جوائز توصل لـ 10 ملايين دولار أو نفوذ لمدة أسبوع!
          </p>
        </div>

        <div className="relative w-80 h-80 mx-auto mb-8">
          {/* Pointer */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 text-red-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L22 20H2L12 2Z" transform="rotate(180 12 12)" />
            </svg>
          </div>

          {/* Wheel */}
          <motion.div 
            className="w-full h-full rounded-full border-8 border-yellow-600 shadow-[0_0_40px_rgba(234,179,8,0.4)] relative overflow-hidden"
            style={{ background: `conic-gradient(${gradientStops})` }}
            animate={{ rotate: spinRotation }}
            transition={{ duration: 5, ease: [0.1, 0.8, 0.1, 1] }}
          >
            {SPIN_PRIZES.map((prize, index) => {
              const rotation = index * sliceAngle + (sliceAngle / 2);
              return (
                <div 
                  key={prize.id}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 flex items-start justify-center pt-6">
                    <span 
                      className="text-sm font-black whitespace-nowrap drop-shadow-md" 
                      style={{ 
                        color: prize.textColor,
                      }}
                    >
                      <div className="transform -rotate-90 origin-center">
                        {prize.label}
                      </div>
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Center Button */}
          <button
            onClick={handleSpin}
            disabled={!canSpin || isSpinning}
            className={clsx(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full z-10 flex items-center justify-center font-black text-xl border-4 shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform",
              canSpin && !isSpinning 
                ? "bg-gradient-to-br from-red-500 to-red-700 text-white border-red-900 hover:scale-110 cursor-pointer" 
                : "bg-zinc-700 text-zinc-400 border-zinc-800 cursor-not-allowed"
            )}
          >
            {isSpinning ? '...' : 'فر!'}
          </button>
        </div>

        {!canSpin && !isSpinning && (
          <div className="text-center bg-black/50 px-6 py-3 rounded-2xl border border-zinc-700">
            <Lock size={24} className="mx-auto mb-2 text-zinc-400" />
            <span className="text-sm font-bold text-zinc-300">تفتح غداً</span>
          </div>
        )}

        {spinResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 text-center bg-yellow-500/20 border border-yellow-500/50 px-6 py-4 rounded-2xl"
          >
            <p className="text-yellow-400 font-bold text-lg mb-1">
              {spinResult.type === 'money' ? `ربحت ${formatMoney(spinResult.amount)}!` : `ربحت ${spinResult.label}!`}
            </p>
            <p className="text-zinc-300 text-sm">
              راجع صندوق رسائلك للتفاصيل.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
