import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { Shield, Sword, Heart, DollarSign, Wallet, ArrowLeft, X, Zap, Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { MARKET_ITEMS } from '../lib/items';

// Mission Types and Data
const MISSION_TYPES = {
  haji: [
    { id: 'h1', name: 'تصفية حسابات', desc: 'تصفية أحد الخصوم القدامى للحجي.', basePower: 500, baseDef: 200, reward: 50000 },
    { id: 'h2', name: 'حماية القافلة', desc: 'تأمين وصول شحنة أسلحة مهمة.', basePower: 300, baseDef: 600, reward: 45000 },
    { id: 'h3', name: 'هجوم على المقر', desc: 'اقتحام مقر عصابة منافسة.', basePower: 800, baseDef: 400, reward: 120000 },
  ],
  layan: [
    { id: 'l1', name: 'تهريب بضائع', desc: 'نقل بضائع ممنوعة عبر الحدود.', basePower: 400, baseDef: 300, reward: 60000 },
    { id: 'l2', name: 'صفقة سلاح', desc: 'إتمام صفقة بيع أسلحة ثقيلة.', basePower: 200, baseDef: 200, reward: 35000 },
    { id: 'l3', name: 'تمويل مشروع', desc: 'تمويل عملية إجرامية كبرى.', basePower: 100, baseDef: 100, reward: 25000 },
  ],
  saif: [
    { id: 's1', name: 'اغتيال صامت', desc: 'التخلص من هدف دون لفت الأنظار.', basePower: 600, baseDef: 100, reward: 80000 },
    { id: 's2', name: 'تصفية ميدانية', desc: 'مواجهة مباشرة في الشوارع.', basePower: 700, baseDef: 500, reward: 95000 },
    { id: 's3', name: 'هجوم مسلح', desc: 'هجوم شامل على بنك محلي.', basePower: 1000, baseDef: 800, reward: 250000 },
  ],
  rand: [
    { id: 'r1', name: 'غسل أموال', desc: 'تنظيف مبلغ ضخم من المال.', basePower: 100, baseDef: 400, reward: 40000 },
    { id: 'r2', name: 'استثمار عقاري', desc: 'شراء عقارات بأسماء وهمية.', basePower: 50, baseDef: 200, reward: 30000 },
    { id: 'r3', name: 'تبييض دولارات', desc: 'تحويل دولارات مجمدة إلى نظيفة.', basePower: 150, baseDef: 500, reward: 75000 },
  ],
  muhannad: [
    { id: 'm1', name: 'سرقة مجوهرات', desc: 'سطو على محل مجوهرات فاخر.', basePower: 450, baseDef: 200, reward: 55000 },
    { id: 'm2', name: 'سطو مسلح', desc: 'سرقة سيارة نقل أموال.', basePower: 650, baseDef: 450, reward: 110000 },
    { id: 'm3', name: 'نهب مستودع', desc: 'سرقة بضائع من مستودع حكومي.', basePower: 350, baseDef: 300, reward: 40000 },
  ],
  yara: [
    { id: 'y1', name: 'تجسس سياسي', desc: 'زرع أجهزة تنصت في مكتب مسؤول.', basePower: 200, baseDef: 100, reward: 30000 },
    { id: 'y2', name: 'جمع معلومات', desc: 'الحصول على ملفات سرية.', basePower: 150, baseDef: 150, reward: 20000 },
    { id: 'y3', name: 'مراقبة هدف', desc: 'تتبع تحركات زعيم عصابة.', basePower: 100, baseDef: 200, reward: 15000 },
  ],
};

const MAFIA_CHARACTERS = [
  {
    id: 'haji',
    name: 'الحجي',
    role: 'الزعيم',
    description: 'قائد العمليات الكبيرة ويتعامل مع المهام عالية الربح',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDE0YWMyMDI4ODE5MTllMzdiMzk0NmVjNWVmN2Y6ZmlsZV8wMDAwMDAwMDI1MWM3MjQ2YWExODgxZTgzZTUyYzk1NiIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjhiOWMxNjNmOGU1YmYzYWJjOTkwMGY0ZmM5MzZmNzAyOTgwZThiZTY0NTE2ZWI2MzcxMmJkZjUyNTAwNjQ1MTYiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    buttons: ['مهام الحجي'],
  },
  {
    id: 'layan',
    name: 'ليان',
    role: 'الزعيمة',
    description: 'مسؤولة التمويل والصفقات',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDE0MTllYTYwODE5MThjZmE3ODQxNTkzY2E3Zjk6ZmlsZV8wMDAwMDAwMDhlMDA3MjQ2YjZlNTdiN2EzYWYwMWJhNCIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImQxZjQxNTQyOGRmYmNiMzVmOGJhZGJkYmM0MzQ3NjgyY2MyYTM0NDA4Yjc0ODRmYjRkZDI3OGVlMDA0Y2YyZjYiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    buttons: ['مهام التهريب'],
  },
  {
    id: 'saif',
    name: 'سيف',
    role: 'شبه الزعيم',
    description: 'يقود العمليات الميدانية',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDEwOTM4NjMwODE5MWI1NWZlN2Y1MDVmOTIxNTk6ZmlsZV8wMDAwMDAwMDdmNjg3MjQ2YjFjMjcwMzBiNmY0NjFiYyIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjE4N2M4ZTQwZDljZTc5NTNjY2MwODRhZDZlMWIzNWMxNGFjM2JlMjQ1MDNhYWM4ZDM5MTZkYmI1NWU5NjE3ZjAiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    buttons: ['مهام الاغتيال'],
  },
  {
    id: 'rand',
    name: 'رند',
    role: 'امرأة ثرية',
    description: 'تمويل وغسل أموال',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDE2YzI3Yzc0ODE5MTgzZDU2OWY3NWNkMjNhYmI6ZmlsZV8wMDAwMDAwMDk0M2M3MjQzOTYzMjg5NDE3MWUxYWZhMSIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImQ5OTdlZGJjNDViOGVmZGRkY2Y3NjQ3MzhjMThmMWMwNmQwNmM1ZWVjN2FkODhjM2IwODQ2MjRjYTQyNDVhYjYiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    buttons: ['مهام الغسيل', 'غسل أموال'],
  },
  {
    id: 'muhannad',
    name: 'مهند',
    role: 'مجرم / لص',
    description: 'تنفيذ السرقات',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDE0OWU3NzBjODE5MWI1NjJhYWQxY2E2ZmRlN2Q6ZmlsZV8wMDAwMDAwMDI0Mzg3MjQ2ODgxMzFhYzA2NzM3Zjk5MSIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImY2OTJiNzQ0OWMyZGZmM2E1ZjIzZTBmYzViMmJjNTBlN2RkNTZlYTY4OTllOTQyOTc4OGM2YzIzYmRhZmRmNzMiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    buttons: ['مهام السرقة'],
  },
  {
    id: 'yara',
    name: 'يارا',
    role: 'باعة هوى',
    description: 'جمع معلومات',
    image: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDE1Y2Q4ZTkwODE5MWE5YzdlYjk5YzMwYmI5Yzk6ZmlsZV8wMDAwMDAwMDE3NjA3MjQzYTkxMzFkODAyZDBkYTM0MiIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjQ5YjNmOGZkYjk3ZmM0ODJkOWEzNzA4NmRkMjZiZTEyMWI2ZmUxZmRkYWQ3N2EyMDhmYzhmN2FhYTA4YTdjMzEiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
    buttons: ['مهام التجسس'],
  }
];

interface MafiasSectionProps {
  onBack: () => void;
}

export const MafiasSection: React.FC<MafiasSectionProps> = ({ onBack }) => {
  const { profile, calculatePower, calculateDefense, updateActiveMission } = useAuthStore();
  const power = profile ? (typeof calculatePower === 'function' ? calculatePower(profile) : 0) : 0;
  const defense = profile ? (typeof calculateDefense === 'function' ? calculateDefense(profile) : 0) : 0;
  const [activeCharacter, setActiveCharacter] = useState<typeof MAFIA_CHARACTERS[0]>(MAFIA_CHARACTERS[0]);
  const [launderingModal, setLaunderingModal] = useState<boolean>(false);
  const [launderingAmount, setLaunderingAmount] = useState<string>('');
  const [message, setMessage] = useState<{ sender: string; text: string } | null>(null);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [missionModal, setMissionModal] = useState<boolean>(false);
  const [currentMissions, setCurrentMissions] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [missionResult, setMissionResult] = useState<{ success: boolean; reward?: number; healthLoss?: number; name: string } | null>(null);

  useEffect(() => {
    // Random messages
    const messages = [
      // Haji (Male - Provocative/Encouraging)
      { sender: 'الحجي', text: 'عندي مهمة جديدة الك، شتكول؟' },
      { sender: 'الحجي', text: 'اذا بيك خير تعال خلصلي هالشغلة.' },
      { sender: 'الحجي', text: 'الزلم تبين بالشدايد، وريني شطارتك.' },
      { sender: 'الحجي', text: 'شغلة دسمة بس يرادلها گلب ميت.' },
      { sender: 'الحجي', text: 'لا تظل كاعد مثل النسوان، كوم تحرك.' },
      { sender: 'الحجي', text: 'عندي صيدة تسوى راسك، تجي؟' },
      { sender: 'الحجي', text: 'اذا خايف خليك بالبيت، الشغلة للزلم.' },
      { sender: 'الحجي', text: 'فلوسها زينة بس بيها مجازفة، شگلت؟' },
      { sender: 'الحجي', text: 'اريدك بظهر هالشغلة، تگدها لو ادور غيرك؟' },
      { sender: 'الحجي', text: 'اليوم يومك يا بطل، لا تفشلني.' },
      // Saif (Male - Provocative/Encouraging)
      { sender: 'سيف', text: 'اكو دگة زينة، تحضر سلاحك وتعال.' },
      { sender: 'سيف', text: 'شغلة سريعة ونطفر، الك بيها خوش حصة.' },
      { sender: 'سيف', text: 'لا ترجف، خليك سبع وامشي وياي.' },
      { sender: 'سيف', text: 'اذا بيك حظ اليوم نطلع بخوش صيدة.' },
      { sender: 'سيف', text: 'الشارع يريد زلم، مو زعاطيط، اثبتلي نفسك.' },
      { sender: 'سيف', text: 'عندي هدف سهل، بس لا تجيب العيد.' },
      { sender: 'سيف', text: 'جهز روحك، اليوم نلعب طوبة بيهم.' },
      { sender: 'سيف', text: 'الشغلة بيها دم، تتحمل لو تنسحب؟' },
      { sender: 'سيف', text: 'اريدك وياي بالهجوم، لا تكسر بيه.' },
      { sender: 'سيف', text: 'اذا نجحنا، نعيش ملوك، واذا فشلنا... لا تفكر بالفشل.' },
      // Muhannad (Male - Provocative/Encouraging)
      { sender: 'مهند', text: 'اكو خزنة مليانة، نكسرها ونطفر؟' },
      { sender: 'مهند', text: 'شغلة نظيفة، بس يرادلها خفة ايد.' },
      { sender: 'مهند', text: 'اذا لزمونا، ما اعرفك ولا تعرفني، متفقين؟' },
      { sender: 'مهند', text: 'عندي صيدة تخبل، بس الكاميرات مشكلة.' },
      { sender: 'مهند', text: 'جهز ادواتك، اليوم نسطو على خوش مكان.' },
      { sender: 'مهند', text: 'لا تصير ثقيل، خليك خفيف وسريع.' },
      { sender: 'مهند', text: 'الشغلة بيها فلوس كومة، بس الخطر عالي.' },
      { sender: 'مهند', text: 'اذا نجحنا، نشتري نص بغداد.' },
      { sender: 'مهند', text: 'اريدك تراقبلي الوضع، واني اتكفل بالباقي.' },
      { sender: 'مهند', text: 'لا ترتبك، خليك طبيعي والامور تمشي.' },
      // Layan (Female - Elegant/Encouraging)
      { sender: 'ليان', text: 'يمكنني تمويلك مقابل نسبة، فكر بالموضوع.' },
      { sender: 'ليان', text: 'عندي صفقة استثمارية ممتازة، تناسب طموحك.' },
      { sender: 'ليان', text: 'المال يجيب مال، خليني اساعدك تضاعف ثروتك.' },
      { sender: 'ليان', text: 'شراكتنا راح تكون مثمرة جداً، متأكدة من هالشي.' },
      { sender: 'ليان', text: 'عندي فرصة ذهبية الك، لا تضيعها.' },
      { sender: 'ليان', text: 'الذكاء بالبزنس اهم من القوة، خليني اوجهك.' },
      { sender: 'ليان', text: 'ارباحك مضمونة وياي، بس التزم بالاتفاق.' },
      // Rand (Female - Elegant/Encouraging)
      { sender: 'رند', text: 'اموالك تحتاج غسيل؟ اني بالخدمة.' },
      { sender: 'رند', text: 'عندي طرق ذكية لتنظيف اموالك، وبنسبة معقولة.' },
      { sender: 'رند', text: 'لا تخلي فلوسك مكشوفة، خليني ارتبها الك.' },
      { sender: 'رند', text: 'السرية التامة هي شعاري، ثق بيه.' },
      { sender: 'رند', text: 'عندي استثمارات آمنة ومربحة، جرب حظك.' },
      { sender: 'رند', text: 'الفلوس القذرة تسبب مشاكل، خليني احلها الك.' },
      { sender: 'رند', text: 'شغلي نظيف ومضمون، ما راح تندم.' },
      // Yara (Female - Elegant/Encouraging)
      { sender: 'يارا', text: 'عندي معلومات تسوى وزنها ذهب، تشتري؟' },
      { sender: 'يارا', text: 'اكو اسرار محد يعرفها غيري، تفيدك بشغلك.' },
      { sender: 'يارا', text: 'المعلومة قوة، واني املك اقوى المعلومات.' },
      { sender: 'يارا', text: 'عندي تفاصيل عن خصومك، راح تنصدم منها.' },
      { sender: 'يارا', text: 'اذا تريد تسبق خطوة، لازم تعرف كل شي.' },
      { sender: 'يارا', text: 'عيوني بكل مكان، ماكو شي يخفى عليه.' },
    ];
    
    const showRandomMessage = () => {
      if (Math.random() > 0.3) { // Increased chance to show message
        setMessage(messages[Math.floor(Math.random() * messages.length)]);
        setTimeout(() => setMessage(null), 5000);
      }
    };

    const interval = setInterval(showRandomMessage, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!profile) return null;

  const relationships = profile.mafiaRelationships || {};

  const handleCharacterSelect = (char: typeof MAFIA_CHARACTERS[0]) => {
    setActiveCharacter(char);
    setIsSidebarExpanded(false);
  };

  const handleButtonClick = (btn: string) => {
    if (btn === 'غسل أموال') {
      setLaunderingModal(true);
    } else {
      const charMissions = MISSION_TYPES[activeCharacter.id as keyof typeof MISSION_TYPES] || [];
      
      // Shuffle missions to make them appear in random order
      const shuffledMissions = [...charMissions].sort(() => Math.random() - 0.5);

      const randomizedMissions = shuffledMissions.map(m => {
        const randomPower = Math.floor(Math.random() * (200554 - 1000 + 1)) + 1000;
        const randomDef = Math.floor(Math.random() * (200000 - 1000 + 1)) + 1000;
        
        // Scale reward dynamically based on the new randomized difficulty
        const statTotal = randomPower + randomDef;
        const rewardMultiplier = Math.random() * 1.5 + 0.5; // 0.5x to 2.0x of total stats
        const randomReward = Math.floor(m.reward + (statTotal * rewardMultiplier));

        return {
          ...m,
          basePower: randomPower,
          baseDef: randomDef,
          reward: randomReward,
        };
      });
      
      setCurrentMissions(randomizedMissions);
      setMissionModal(true);
    }
  };

  const executeMission = async (mission: any) => {
    if (!profile || isExecuting) return;
    
    // Check if hospitalized
    if (profile.hospitalizedUntil && profile.hospitalizedUntil > Date.now()) {
      toast.error('أنت في المستشفى حالياً! لا يمكنك القيام بأي عمل.');
      return;
    }

    setIsExecuting(true);
    
    // Strategic Success Calculation
    const powerRequirement = mission.basePower;
    const defenseRequirement = mission.baseDef;
    
    // How much the player exceeds or falls short of the requirements
    const powerDiff = (power || 0) - powerRequirement;
    const defenseDiff = (defense || 0) - defenseRequirement;
    
    // Base success is 50%, adjusted by stats
    // Every 100 points above requirement adds 5% success
    // Every 100 points below requirement subtracts 10% success
    let successChance = 50 + (powerDiff / 20) + (defenseDiff / 20);
    
    // Relationship bonus: up to 15%
    const relBonus = (relationships[activeCharacter.id] || 0) * 0.15;
    successChance += relBonus;
    
    successChance = Math.min(98, Math.max(2, successChance));
    
    const isSuccess = Math.random() * 100 < successChance;

    // Simulate "Scanning" or "Executing" delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const userRef = doc(db, 'users', profile.uid);
      
      if (isSuccess) {
        const bonusMultiplier = Math.max(1, (power + defense) / (powerRequirement + defenseRequirement));
        const moneyReward = Math.floor(mission.reward * bonusMultiplier);
        const repReward = Math.floor(mission.reward / 800);
        const relReward = 3;

        await updateDoc(userRef, {
          dirtyMoney: increment(moneyReward),
          reputation: increment(repReward),
          [`mafiaRelationships.${activeCharacter.id}`]: increment(relReward),
        });

        setMissionResult({ success: true, reward: moneyReward, name: mission.name });
        toast.success(`نجحت المهمة! +$${moneyReward.toLocaleString()}`);
      } else {
        const healthLoss = Math.floor(Math.random() * 25) + 15;
        const currentHealth = profile.health ?? 100;
        const newHealth = Math.max(0, currentHealth - healthLoss);
        
        const updates: any = {
          health: newHealth,
          [`mafiaRelationships.${activeCharacter.id}`]: increment(-3),
        };

        if (newHealth <= 0) {
          updates.hospitalizedUntil = Date.now() + (20 * 60 * 1000);
          setMissionResult({ success: false, healthLoss: 100, name: mission.name });
        } else {
          setMissionResult({ success: false, healthLoss, name: mission.name });
        }

        await updateDoc(userRef, updates);
        toast.error(`فشلت المهمة! فقدت ${healthLoss}% من صحتك`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleLaundering = async () => {
    if (!profile) return;
    const amount = parseInt(launderingAmount.replace(/,/g, ''));
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (profile.dirtyMoney < amount) {
      toast.error('لا تملك هذا المبلغ من الأموال القذرة');
      return;
    }

    const rel = relationships['rand'] || 0;
    // Base cut is 30%, decreases by 0.2% per relationship point (min 10%)
    const cutPercentage = Math.max(10, 30 - (rel * 0.2)); 
    const cleanAmount = Math.floor(amount * (1 - cutPercentage / 100));

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        dirtyMoney: increment(-amount),
        cleanMoney: increment(cleanAmount),
        [`mafiaRelationships.rand`]: increment(1),
      });
      toast.success(`تم غسل ${amount.toLocaleString()} بنجاح! استلمت ${cleanAmount.toLocaleString()} أموال نظيفة (عمولة ${cutPercentage.toFixed(1)}%)`);
      setLaunderingModal(false);
      setLaunderingAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('حدث خطأ أثناء عملية غسل الأموال');
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-transparent overflow-hidden font-sans" dir="rtl">
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="absolute top-4 right-4 z-40 p-3 bg-black/60 border border-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>

      {/* Messages System */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-black/90 border border-yellow-500/50 p-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] w-[90%] max-w-md flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
              {message.sender[0]}
            </div>
            <div>
              <p className="text-xs text-yellow-500/80">{message.sender}</p>
              <p className="text-sm text-white">{message.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Right Sidebar - Character Selection */}
        <div 
          className={clsx(
            "w-24 lg:w-32 h-full bg-black/40 backdrop-blur-md flex flex-col items-center py-4 z-30 transition-all duration-500 scrollbar-hide",
            isSidebarExpanded ? "overflow-y-auto gap-4" : "justify-center gap-4 overflow-hidden"
          )}
          onTouchStart={() => !isSidebarExpanded && setIsSidebarExpanded(true)}
          onMouseEnter={() => !isSidebarExpanded && setIsSidebarExpanded(true)}
          onMouseLeave={() => isSidebarExpanded && setIsSidebarExpanded(false)}
        >
          {MAFIA_CHARACTERS.map((char, index) => {
            const activeIndex = MAFIA_CHARACTERS.findIndex(c => c.id === activeCharacter.id);
            const distance = index - activeIndex;
            
            // If not expanded, only show active, prev, and next
            if (!isSidebarExpanded && Math.abs(distance) > 1) {
              return null;
            }

            let opacityClass = "opacity-100";
            let scaleClass = "scale-100";
            
            if (!isSidebarExpanded) {
              if (distance !== 0) {
                opacityClass = "opacity-5";
                scaleClass = "scale-90";
              }
            }

            return (
              <button
                key={char.id}
                onClick={() => handleCharacterSelect(char)}
                className={clsx(
                  "relative w-[90%] aspect-square rounded-xl overflow-hidden transition-all duration-500 flex flex-col items-center justify-end p-2 group shrink-0",
                  activeCharacter.id === char.id 
                    ? "border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]" 
                    : "border-2 border-black shadow-[0_0_10px_rgba(0,0,0,0.8)] hover:border-yellow-500/50",
                  opacityClass,
                  scaleClass
                )}
                style={{
                  background: 'linear-gradient(45deg, #3d2314, #8B5A2B)', // Wooden color
                }}
              >
                {/* Character Image Background with white transparent filter */}
                <div className="absolute inset-0 z-0">
                  <img src={char.image} alt={char.name} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-white/20 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                </div>
                
                <span className={clsx(
                  "relative z-10 text-xs lg:text-sm font-black drop-shadow-[0_2px_2px_rgba(0,0,0,1)]",
                  activeCharacter.id === char.id ? "text-yellow-500" : "text-white group-hover:text-yellow-200"
                )}>
                  {char.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center Area - Active Character Display */}
        <div className="flex-1 relative flex flex-col items-center justify-start pt-10 overflow-y-auto scrollbar-hide">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCharacter.id}
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="relative z-10 flex flex-col items-center w-full max-w-lg px-4"
            >
              {/* Animated Character Image */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative h-[40vh] min-h-[300px] w-full flex justify-center"
              >
                <img 
                  src={activeCharacter.image} 
                  alt={activeCharacter.name} 
                  className="h-full object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
                  referrerPolicy="no-referrer" 
                />
              </motion.div>

              {/* Floating Info Card (No border, no background) */}
              <div className="w-full flex flex-col items-center text-center -mt-10 z-20">
                <h2 className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 drop-shadow-[0_2px_10px_rgba(234,179,8,0.3)] mb-1">
                  {activeCharacter.name}
                </h2>
                <h3 className="text-lg text-red-500 font-bold mb-2 tracking-widest uppercase">{activeCharacter.role}</h3>
                <p className="text-sm text-zinc-300 mb-4 max-w-sm leading-relaxed drop-shadow-md">
                  {activeCharacter.description}
                </p>

                <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
                  <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                    <Heart className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-zinc-400">مستوى العلاقة:</span>
                    <span className="text-sm font-bold text-yellow-500">{relationships[activeCharacter.id] || 0}%</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                    <Sword className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-zinc-400">القوة:</span>
                    <span className="text-sm font-bold text-red-500">{power.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                    <Shield className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-zinc-400">الدفاع:</span>
                    <span className="text-sm font-bold text-blue-500">{defense.toLocaleString()}</span>
                  </div>
                </div>

                {/* Mission Area */}
                <div className="w-full flex flex-col items-center gap-4">
                  {activeCharacter.buttons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleButtonClick(btn)}
                      className="relative overflow-hidden rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-600/20 to-black/80 px-12 py-4 w-full max-w-md transition-all duration-500 backdrop-blur-xl hover:border-yellow-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="flex items-center justify-center gap-3">
                        {btn === 'غسل أموال' ? (
                          <Wallet className="w-6 h-6 text-yellow-500 group-hover:animate-pulse" />
                        ) : (
                          <Target className="w-6 h-6 text-yellow-500 group-hover:animate-pulse" />
                        )}
                        <span className="text-xl font-black text-white tracking-widest uppercase">
                          {btn}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Missions Modal */}
      <AnimatePresence>
        {missionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-[#0a0a0a] border border-yellow-500/30 rounded-3xl w-full max-w-4xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)]"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-black to-zinc-900">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-xl font-black text-white tracking-wider">{activeCharacter.buttons[0]}</h3>
                </div>
                <button 
                  onClick={() => setMissionModal(false)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                {currentMissions.map((mission) => {
                  const powerDiff = (power || 0) - mission.basePower;
                  const defenseDiff = (defense || 0) - mission.baseDef;
                  const relBonus = (relationships[activeCharacter.id] || 0) * 0.15;
                  let successChance = 50 + (powerDiff / 20) + (defenseDiff / 20) + relBonus;
                  successChance = Math.min(98, Math.max(2, Math.floor(successChance)));
                  
                  const riskLevel = successChance > 80 ? 'منخفض' : successChance > 50 ? 'متوسط' : 'عالي جداً';
                  const riskColor = successChance > 80 ? 'text-green-500' : successChance > 50 ? 'text-yellow-500' : 'text-red-500';

                  return (
                    <motion.div
                      key={mission.id}
                      whileHover={{ y: -10, scale: 1.02 }}
                      className="relative flex flex-col bg-gradient-to-b from-zinc-900/80 to-black border border-white/5 rounded-3xl p-6 overflow-hidden group shadow-2xl"
                    >
                      {/* Animated Border Effect */}
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-yellow-500/20 rounded-3xl transition-all duration-500" />
                      
                      <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 group-hover:bg-yellow-500/20 transition-colors">
                            <Zap className="w-7 h-7 text-yellow-500" />
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">المكافأة</span>
                            <p className="text-xl font-black text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                              ${mission.reward.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <h4 className="text-2xl font-black text-white mb-2 group-hover:text-yellow-500 transition-colors">{mission.name}</h4>
                        <p className="text-xs text-zinc-400 mb-8 leading-relaxed font-medium">{mission.desc}</p>

                        <div className="space-y-5 mb-10">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-zinc-500">القوة الهجومية</span>
                              <span className={clsx(power >= mission.basePower ? "text-green-500" : "text-red-500")}>
                                {power.toLocaleString()} / {mission.basePower.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (power / mission.basePower) * 100)}%` }}
                                className={clsx("h-full shadow-[0_0_10px_currentColor]", power >= mission.basePower ? "bg-green-500" : "bg-red-500")}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-zinc-500">الدفاع والتحمل</span>
                              <span className={clsx(defense >= mission.baseDef ? "text-green-500" : "text-red-500")}>
                                {defense.toLocaleString()} / {mission.baseDef.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (defense / mission.baseDef) * 100)}%` }}
                                className={clsx("h-full shadow-[0_0_10px_currentColor]", defense >= mission.baseDef ? "bg-green-500" : "bg-red-500")}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={clsx("p-2 rounded-lg bg-white/5", riskColor)}>
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="block text-[10px] text-zinc-500 font-black uppercase tracking-tighter">احتمالية النجاح</span>
                              <span className={clsx("text-lg font-black", riskColor)}>
                                {successChance}%
                              </span>
                            </div>
                          </div>
                          
                          <button
                            disabled={isExecuting}
                            onClick={() => executeMission(mission)}
                            className="relative overflow-hidden bg-white text-black px-8 py-3 rounded-2xl font-black text-sm hover:bg-yellow-500 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isExecuting ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>جاري...</span>
                              </div>
                            ) : 'تنفيذ'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Result Overlay */}
              <AnimatePresence>
                {missionResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/95 backdrop-blur-2xl"
                  >
                    <div className="text-center space-y-6 max-w-md">
                      <div className={clsx(
                        "w-24 h-24 rounded-full mx-auto flex items-center justify-center shadow-2xl",
                        missionResult.success ? "bg-green-500/20 text-green-500 shadow-green-500/20" : "bg-red-500/20 text-red-500 shadow-red-500/20"
                      )}>
                        {missionResult.success ? <CheckCircle2 className="w-12 h-12" /> : <X className="w-12 h-12" />}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-3xl font-black text-white">{missionResult.success ? 'نجاح العملية!' : 'فشل ذريع!'}</h4>
                        <p className="text-zinc-400 font-medium">{missionResult.name}</p>
                      </div>

                      {missionResult.success ? (
                        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-3xl">
                          <p className="text-xs text-green-500/80 font-black uppercase tracking-widest mb-1">الأرباح المستلمة</p>
                          <p className="text-4xl font-black text-green-500">${missionResult.reward?.toLocaleString()}</p>
                        </div>
                      ) : (
                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
                          <p className="text-xs text-red-500/80 font-black uppercase tracking-widest mb-1">الأضرار الجسدية</p>
                          <p className="text-4xl font-black text-red-500">-{missionResult.healthLoss}% صحة</p>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setMissionResult(null);
                          setMissionModal(false);
                        }}
                        className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-yellow-500 transition-colors active:scale-95"
                      >
                        إغلاق التقرير
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Laundering Modal */}
      <AnimatePresence>
        {launderingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
                <h3 className="text-lg font-bold text-white">غسل الأموال - رند</h3>
                <button onClick={() => setLaunderingModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-400 text-center">
                  أدخل المبلغ القذر الذي تريد غسله. سآخذ عمولتي حسب علاقتنا.
                </p>
                
                <div className="flex justify-between items-center p-3 bg-black/30 rounded-lg">
                  <span className="text-zinc-400 text-sm">أموالك القذرة</span>
                  <span className="text-red-500 font-bold">${profile.dirtyMoney?.toLocaleString() || 0}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white">المبلغ المراد غسله:</label>
                  <input
                    type="text"
                    value={launderingAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setLaunderingAmount(val ? Number(val).toLocaleString() : '');
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-center font-bold focus:outline-none focus:border-yellow-500 transition-colors"
                    placeholder="0"
                  />
                </div>
                
                {launderingAmount && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                    <p className="text-xs text-yellow-500/80 mb-1">العمولة المتوقعة: {Math.max(10, 30 - ((relationships['rand'] || 0) * 0.2)).toFixed(1)}%</p>
                    <p className="text-sm text-green-500 font-bold">
                      الصافي: +${Math.floor(parseInt(launderingAmount.replace(/,/g, '')) * (1 - Math.max(10, 30 - ((relationships['rand'] || 0) * 0.2)) / 100)).toLocaleString()} نظيف
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-black/50 grid grid-cols-2 gap-2">
                <button
                  onClick={handleLaundering}
                  className="col-span-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  تأكيد الغسيل
                </button>
                <button
                  onClick={() => setLaunderingModal(false)}
                  className="col-span-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
