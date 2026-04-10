import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, increment, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, X, RefreshCw, DollarSign, Zap, Target, TrendingUp, Star, Sword, Shield } from 'lucide-react';
import clsx from 'clsx';
import { MARKET_ITEMS } from '../lib/items';
import { getWealthyReward } from '../lib/wealthyRewards';
import { formatMoney } from '../lib/utils';

const WEALTHY_CHARACTERS = [
  {
    id: 'elizabeth',
    name: 'إليزابيث هارتفورد',
    age: 50,
    country: 'بريطانيا 🇬🇧',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTIxOWY1ODcwODE5MWE3MDFhNzNjNTFmZjc3OTQ6ZmlsZV8wMDAwMDAwMGQ5OTA3MjQzYjVmMWZjNGMxMjIyNjJlYiIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImZkNGMzODhhZDc5N2YwZmVhZGUwMGExY2FhM2FkMjAyYzEyOWM4YjFlNWU4ZDQ4M2FiYjRiZWQxNmU2YWRhYzUiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    style: 'حبيبي، الشغل لازم يكون نظيف وبدون غلطة… لا تخيب ظني.',
    missionTypes: ['cars'],
    dialogues: [
      "حبيبي، الأسطول مالي يحتاج سيارات جديدة وفخمة.. تكدر تدبرها؟",
      "الشغل وياي يعني كلاس ودقة، أريد سيارات تبيض الوجه.",
      "سمعت أنت أحسن واحد بالشوارع، أثبتلي هالشي وجيبلي هاي السيارات.",
      "لا تتأخر عليّ، الوقت يمي أغلى من الذهب."
    ]
  },
  {
    id: 'jawaher',
    name: 'جواهر آل الشيخ',
    age: 27,
    country: 'السعودية 🇸🇦',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTJmODIyNGQ4ODE5MThmNDU2ZmQyNzQxZDFlZjE6ZmlsZV8wMDAwMDAwMDM0YTg3MWY3YTVhN2M5MWExNzczN2E2MCIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6Ijc4MWU4NmI4M2QyZmE2NmI2MDA5ZDVkM2U1YjBlNTE5MGExYmE5NzM4YjI5NzZmMDRlYTk2NzZjMGJmODA2OGEiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    style: 'يلا خلصها بسرعة، ما عندي وقت… أبي شغل ثقيل ومربح.',
    missionTypes: ['phones'],
    dialogues: [
      "أبي أحدث الأجهزة بالسوق، ولا تقول لي صعبة.. تحرك!",
      "التكنولوجيا هي القوة الحين، جيب لي هالأجهزة وبغرقك فلوس.",
      "يا بطل، نبي نوزع هدايا فخمة، دبر لي هالتلفونات بسرعة.",
      "ما أحب الانتظار، الشغل السريع هو اللي يعجبني."
    ]
  },
  {
    id: 'natalia',
    name: 'ناتاليا فولكوفا',
    age: 24,
    country: 'روسيا 🇷🇺',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTJkZTUxYzI4ODE5MWEwMTkzMDI5ZTlkOWM4YWY6ZmlsZV8wMDAwMDAwMGZiZjA3MWZkODA2OWMyNDVmOWE3ZDI3ZiIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjgzYjE1YmU1ZWVjZWQyNTU4OGEyMzgwYzg1Njc4MjNmZTZlMmQzNDE4YTdhMmRkMGEwOTY0MTEyOTMzYmVmZDAiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    style: 'إذا سويت الشغل مضبوط… عندي إلك مفاجأة حلوة 😉',
    missionTypes: ['tools', 'drugs'],
    dialogues: [
      "محتاجة أغراض خاصة للمختبر.. تكدر تجيبها بدون ما أحد يحس؟",
      "الشغل الخطر يحتاج ناس شجعان، وأنت شكلك شجاع.. مو؟",
      "دبرلي هاي المواد، وراح تكون حصتك جبيرة كلش.",
      "أحب الشغل النظيف، لا تخلي الشرطة تشم خبر."
    ]
  },
  {
    id: 'jackson',
    name: 'جاكسون بلاك',
    age: 45,
    country: 'أمريكا 🇺🇸',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTBmNzk1MTc0ODE5MWFlOTQ5MDczNmE3MjgzNzE6ZmlsZV8wMDAwMDAwMDZkZTQ3MWY0YTQ5MjUzMjRhMWMxMGVkYSIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6Ijc5MjBkNjdkODNiNzU4MDZjYTA5MTE4MjdhZDIxMTZiNmM0Mzg1ZjEyYTJhZDdmMjA5NTY2NWExN2ExOTkzMTYiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    style: 'اسمع… إذا تجيب المطلوب، الفلوس توصلك فوراً. بدون سوالف.',
    missionTypes: ['weapons', 'kill'],
    dialogues: [
      "الحرب بدت، ومحتاجين سلاح ثقيل.. دبرلي المكتوب.",
      "أكو شخص كاعد يزعجنا، أريدك تنهي موضوعه للأبد.",
      "السلاح هو اللغة الوحيدة اللي يفهموها، جيبلي الترسانة هاي.",
      "شغلنا خطر، بس الفلوس تستاهل.. ها شتگول؟"
    ]
  }
];

interface WealthySectionProps {
  onBack: () => void;
}

export const WealthySection: React.FC<WealthySectionProps> = ({ onBack }) => {
  const { profile, updateActiveMission, calculatePower, calculateDefense } = useAuthStore();
  const [activeCharacter, setActiveCharacter] = useState(WEALTHY_CHARACTERS[0]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [localMission, setLocalMission] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeMission = profile?.activeMission;

  const generateMission = (char: typeof WEALTHY_CHARACTERS[0]) => {
    setIsGenerating(true);
    setLocalMission(null);
    
    // Determine mission type based on character's preference
    const missionType = char.missionTypes[Math.floor(Math.random() * char.missionTypes.length)];
    const isKillMission = missionType === 'kill' || (char.id === 'jackson' && Math.random() > 0.5);
    
    const randomStyle = char.dialogues[Math.floor(Math.random() * char.dialogues.length)];
    
    let missionData: any = {};

    if (isKillMission) {
      const targets = ['رئيس الوزراء', 'وزير المالية', 'رئيس مجلس النواب', 'لاعب عشوائي', 'زعيم عصابة منافسة', 'وزير الداخلية', 'وزير الدفاع', 'وزير الخارجية', 'وزير النفط'];
      const target = targets[Math.floor(Math.random() * targets.length)];
      missionData = {
        type: 'kill',
        targetName: target,
        description: `${randomStyle} اريدك تخلصني من ${target}، الشغلة يرادلها دقة وشجاعة.`,
        reward: Math.floor(Math.random() * 1000000) + 500000,
        status: 'pending'
      };
    } else {
      let category = missionType === 'kill' ? 'weapons' : missionType;
      let items = (MARKET_ITEMS[category as keyof typeof MARKET_ITEMS] || []).filter((i: any) => !i.id.startsWith('special_') && !i.rare);
      
      // Fallback if category is empty
      if (items.length === 0) {
        category = 'weapons';
        items = (MARKET_ITEMS.weapons || []).filter((i: any) => !i.id.startsWith('special_') && !i.rare);
      }

      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = Math.floor(Math.random() * 10) + 5; // Difficulty: 5 to 15 items

      if (!item) {
        setIsGenerating(false);
        return;
      }

      missionData = {
        type: category,
        targetId: item.id,
        targetName: item.name,
        quantity,
        description: `${randomStyle} محتاج ${quantity} من ${item.name} بأسرع وقت، لا تتأخر!`,
        reward: (item.price || 1000) * quantity * 1.8, // Slightly higher reward multiplier for difficulty
        status: 'pending'
      };
    }

    setLocalMission(missionData);
    setTimeout(() => setIsGenerating(false), 500);
  };

  useEffect(() => {
    if (!activeMission) {
      generateMission(activeCharacter);
    }
  }, [activeCharacter.id, activeMission]);

  useEffect(() => {
    if (activeMission?.characterId) {
      const char = WEALTHY_CHARACTERS.find(c => c.id === activeMission.characterId);
      if (char && char.id !== activeCharacter.id) {
        setActiveCharacter(char);
      }
    }
  }, [activeMission, activeCharacter.id]);

  const handleAccept = async () => {
    if (!localMission) return;
    await updateActiveMission({
      ...localMission,
      characterId: activeCharacter.id,
      status: 'accepted'
    });
    toast.success('تم قبول المهمة!');
  };

  const handleReject = () => {
    generateMission(activeCharacter);
  };

  const handleCancelMission = async () => {
    if (!activeMission) return;
    await updateActiveMission(null);
    setLocalMission(null);
    toast.info('تم إلغاء المهمة بنجاح.');
    onBack(); // Return to previous section as requested
  };

  const handleDeliver = async () => {
    if (!activeMission || !profile) return;

    // Check inventory for item missions
    if (activeMission.type !== 'kill') {
      const inventory = profile.inventory || {};
      const categoryItems = inventory[activeMission.type as keyof typeof inventory] as Record<string, number> || {};
      const count = categoryItems[activeMission.targetId] || 0;

      if (count < activeMission.quantity) {
        toast.error(`ما عندك الكمية المطلوبة! محتاج ${activeMission.quantity} وعندك ${count}`);
        return;
      }

      try {
        const userRef = doc(db, 'users', profile.uid);
        const reward = getWealthyReward(activeCharacter.id);
        
        const updates: any = {
          [`inventory.${activeMission.type}.${activeMission.targetId}`]: increment(-activeMission.quantity),
          cleanMoney: increment(reward.money),
          reputation: increment(Math.floor(reward.money / 1000))
        };

        // Add reward items to inventory
        reward.items.forEach(item => {
          let category = 'weapons';
          if (['normal', 'suv', 'luxury', 'armored', 'sports'].includes(item.type)) category = 'cars';
          else if (item.type === 'phones') category = 'phones';
          
          const path = `inventory.${category}.${item.id}`;
          updates[path] = (updates[path] || 0) + 1;
        });

        // Convert updates to use increment for all
        const finalUpdates: any = {};
        Object.entries(updates).forEach(([key, value]) => {
          finalUpdates[key] = typeof value === 'number' ? increment(value) : value;
        });

        await updateDoc(userRef, finalUpdates);
        
        await updateActiveMission(null);
        setLocalMission(null);
        
        const rewardNames = reward.items.map(i => i.name).join(' و ');
        const rewardMsg = rewardNames 
          ? `تم تسليم المهمة بنجاح! حصلت على ${formatMoney(reward.money)} و ${rewardNames}`
          : `تم تسليم المهمة بنجاح! حصلت على ${formatMoney(reward.money)}`;
          
        toast.success(rewardMsg);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }
    } else {
      // Kill mission logic
      try {
        const killsQuery = query(
          collection(db, 'kills'),
          where('killerId', '==', profile.uid),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const killsSnapshot = await getDocs(killsQuery);
        if (killsSnapshot.empty) {
          toast.error('لم يتم العثور على أي عمليات قتل مسجلة باسمك مؤخراً!');
          return;
        }

        const lastKill = killsSnapshot.docs[0].data();
        const killTime = lastKill.timestamp?.toMillis?.() || lastKill.timestamp;
        
        // Check if kill happened after mission was accepted (approximate check)
        if (Date.now() - killTime > 3600000) { // Older than 1 hour
          toast.error('آخر عملية قتل قمت بها قديمة جداً، نحتاج لعملية جديدة!');
          return;
        }

        const userRef = doc(db, 'users', profile.uid);
        const reward = getWealthyReward(activeCharacter.id);
        
        const updates: any = {
          cleanMoney: increment(reward.money),
          reputation: increment(Math.floor(reward.money / 500))
        };

        // Add reward items to inventory
        reward.items.forEach(item => {
          let category = 'weapons';
          if (['normal', 'suv', 'luxury', 'armored', 'sports'].includes(item.type)) category = 'cars';
          else if (item.type === 'phones') category = 'phones';
          
          const path = `inventory.${category}.${item.id}`;
          updates[path] = increment(1);
        });

        await updateDoc(userRef, updates);
        
        await updateActiveMission(null);
        setLocalMission(null);
        
        const rewardNames = reward.items.map(i => i.name).join(' و ');
        const rewardMsg = rewardNames 
          ? `تم التحقق من العملية بنجاح! حصلت على ${formatMoney(reward.money)} و ${rewardNames}`
          : `تم التحقق من العملية بنجاح! حصلت على ${formatMoney(reward.money)}`;
          
        toast.success(rewardMsg);
      } catch (error) {
        console.error("Error verifying kill mission:", error);
        toast.error('فشل التحقق من العملية، تأكد من وجود اسمك في المقبرة');
      }
    }
  };

  const sidebarRef = useRef<HTMLDivElement>(null);
  const collapseTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSidebarScroll = () => {
    setIsSidebarExpanded(true);
    if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
    collapseTimeout.current = setTimeout(() => {
      setIsSidebarExpanded(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/60 backdrop-blur-md overflow-hidden font-sans" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1505843513577-22bb7d21e455?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          className="h-full w-full object-cover opacity-60 brightness-50 contrast-125"
          alt="Wealthy Background"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
      </div>

      {/* Back Button */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center pointer-events-none">
        <button 
          onClick={onBack} 
          className="p-2 lg:p-3 bg-black/60 border border-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md pointer-events-auto"
        >
          <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
        </button>

        <div className="flex gap-3 pointer-events-auto">
          {activeMission && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeliver}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-white/20 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-wider">تنفيذ العملية</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative z-10 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCharacter.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="relative flex flex-col items-center w-full max-h-full overflow-y-auto scrollbar-hide"
          >
            {/* Character Image */}
            <div className="relative h-[250px] sm:h-[300px] lg:h-[450px] w-[200px] sm:w-[220px] lg:w-[320px] mb-4 [mask-image:linear-gradient(to_bottom,black_95%,transparent_100%)] shrink-0">
              <motion.img
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                src={activeCharacter.image}
                className="h-full w-full object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                alt={activeCharacter.name}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Info Box */}
            <div className="bg-transparent p-4 sm:p-6 max-w-md w-full text-center z-10 shrink-0">
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1 drop-shadow-md">{activeCharacter.name}</h3>
              <p className="text-yellow-500 text-sm sm:text-base font-bold mb-4 drop-shadow-md">{activeCharacter.style}</p>
              
              {activeMission ? (
                <div className="space-y-4">
                  <div className="p-4 bg-transparent">
                    <p className="text-white font-bold mb-2 drop-shadow-md">{activeMission.description || activeMission.title}</p>
                    <div className="flex justify-center gap-4 text-xs drop-shadow-md">
                      <span className="flex items-center gap-1 text-green-400"><DollarSign size={14}/> {formatMoney(activeMission.reward)}</span>
                      {activeMission.successChance && (
                        <span className="flex items-center gap-1 text-blue-400"><Zap size={14}/> {activeMission.successChance}% نجاح</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleCancelMission}
                    className="text-xs text-zinc-500 hover:text-red-500 transition-colors drop-shadow-md"
                  >
                    إلغاء المهمة الحالية
                  </button>
                </div>
              ) : localMission ? (
                <div className="space-y-4">
                  <div className="p-4 bg-transparent">
                    <p className="text-white font-bold mb-2 drop-shadow-md">{localMission.description}</p>
                    <div className="flex justify-center gap-4 text-xs drop-shadow-md">
                      <span className="flex items-center gap-1 text-green-400"><DollarSign size={14}/> {formatMoney(localMission.reward)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAccept}
                      className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors"
                    >
                      قبول
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isGenerating}
                      className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                    >
                      <RefreshCw className={clsx("w-5 h-5", isGenerating && "animate-spin")} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Bar */}
      <div className="w-full h-28 bg-zinc-950/90 backdrop-blur-2xl flex items-center justify-center z-50 border-t border-white/10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div 
          ref={sidebarRef}
          onScroll={handleSidebarScroll}
          className="flex gap-6 items-center overflow-x-auto scrollbar-hide w-full py-4 px-8 justify-center"
        >
          {WEALTHY_CHARACTERS.map((char) => {
            const isActive = activeCharacter.id === char.id;
            return (
              <motion.button
                key={char.id}
                layout
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (activeMission) {
                    toast.error('خلص المهمة الحالية اولاً!');
                    return;
                  }
                  setActiveCharacter(char);
                }}
                className={clsx(
                  "relative w-14 sm:w-16 aspect-square rounded-2xl overflow-hidden transition-all duration-500 shrink-0 border-2",
                  isActive 
                    ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)] scale-110" 
                    : "border-white/10 grayscale hover:grayscale-0 hover:border-white/30",
                )}
              >
                <img src={char.image} className="w-full h-full object-cover" alt={char.name} referrerPolicy="no-referrer" />
                {isActive && (
                  <div className="absolute inset-0 bg-yellow-500/10 pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
