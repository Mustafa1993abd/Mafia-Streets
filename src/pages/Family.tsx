import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { Heart, Users, User, Baby, Car, Package, Plus, Trash2, DollarSign, TrendingUp, TrendingDown, RefreshCw, GraduationCap, Smile, Activity, Briefcase, MessageCircle, Camera, X, Dumbbell, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { formatMoney } from '../lib/utils';
import { getVIPMultiplier } from '../lib/vip';
import { MARKET_ITEMS } from '../lib/items';
import PlayerAvatar from '../components/PlayerAvatar';

const EDUCATION_STAGES = [
  { id: 'none', cost: 0 },
  { id: 'middle', cost: 5000000 },
  { id: 'high', cost: 10000000 },
  { id: 'university', cost: 25000000 },
  { id: 'bachelor', cost: 50000000 },
  { id: 'master', cost: 75000000 },
  { id: 'phd', cost: 100000000 },
];

const GYM_LEVELS = 20;
const getGymCost = (currentLevel: number) => {
  // Starts at 500,000 for level 0, scales exponentially to 100,000,000 at level 19
  return Math.floor(500000 * Math.pow(200, Math.min(currentLevel, 19) / 19));
};
const getGymStrengthGain = (level: number) => {
  const gains = [0, 10, 50, 100, 200, 500, 600, 700, 800, 900, 1500, 1600, 1700, 1800, 1900, 2500, 2600, 2770, 2800, 2900, 5000];
  return gains[level] || 0;
};
const calculateTotalGymStrength = (level: number) => {
  return getGymStrengthGain(level);
};

const GymCertificate = ({ name, level, isSmall = false }: { name: string; level: number; isSmall?: boolean }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (level < 5) return null;
  
  let borderColor = '#d4af37';
  let bgColor = '#fdfbf7';
  let iconColor = '#d4af37';
  let textColor = '#8b6b1d';
  let title = '';
  let sealColor = '#d4af37';
  let ribbonColor = '#b91c1c';

  if (level >= 20) {
    title = t('family.gymStages.professional', 'شهادة تدريب احتراف');
    borderColor = '#b76e79';
    bgColor = '#fff5f5';
    iconColor = '#b76e79';
    textColor = '#702935';
    sealColor = '#b76e79';
    ribbonColor = '#4c0519';
  } else if (level >= 15) {
    title = t('family.gymStages.advanced', 'شهادة تدريب عالي');
    borderColor = '#94a3b8';
    bgColor = '#f8fafc';
    iconColor = '#64748b';
    textColor = '#334155';
    sealColor = '#94a3b8';
    ribbonColor = '#1e293b';
  } else if (level >= 10) {
    title = t('family.gymStages.intermediate', 'شهادة تدريب متوسط');
    borderColor = '#1e40af';
    bgColor = '#eff6ff';
    iconColor = '#1e40af';
    textColor = '#1e3a8a';
    sealColor = '#1e40af';
    ribbonColor = '#1d4ed8';
  } else if (level >= 5) {
    title = t('family.gymStages.primary', 'شهادة تدريب ابتدائي');
    borderColor = '#d4af37';
    bgColor = '#fdfbf7';
    iconColor = '#d4af37';
    textColor = '#8b6b1d';
    sealColor = '#d4af37';
    ribbonColor = '#b91c1c';
  }

  return (
    <div 
      className={isSmall 
        ? "w-[30px] h-[30px] rounded border shadow-sm flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-transform" 
        : "p-1 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden font-serif text-zinc-900 mx-auto max-w-lg w-full h-full"
      } 
      style={{ backgroundColor: bgColor, borderColor: isSmall ? borderColor : undefined, borderWidth: isSmall ? '1px' : undefined }}
      onClick={isSmall ? () => setIsExpanded(true) : undefined}
    >
      {isSmall ? (
        <div className="w-[30px] h-[30px] rounded-full border-2 border-orange-500 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-transform bg-zinc-800">
          <Dumbbell size={16} style={{ color: iconColor }} />
        </div>
      ) : (
        <div className="border-[10px] md:border-[16px] border-double p-6 md:p-10 relative h-full flex flex-col items-center justify-center" style={{ borderColor: borderColor }}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
            <Dumbbell size={300} style={{ color: borderColor }} />
          </div>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: `radial-gradient(${borderColor} 0.5px, transparent 0.5px)`, backgroundSize: '15px 15px' }} />
          <div className="relative z-10 flex flex-col items-center text-center space-y-6 md:space-y-8 w-full">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="w-12 h-px bg-zinc-300" />
                <div className={`w-16 h-16 md:w-24 md:h-24 border-4 rounded-full flex items-center justify-center shadow-xl bg-white relative`} style={{ borderColor: borderColor }}>
                  <Dumbbell size={40} className="md:w-14 md:h-14" style={{ color: iconColor }} />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 border border-yellow-600 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">★</span>
                  </div>
                </div>
                <div className="w-12 h-px bg-zinc-300" />
              </div>
              <h1 className={`text-2xl md:text-4xl font-black uppercase tracking-[0.15em] md:tracking-[0.25em] mb-2`} style={{ color: textColor }}>
                {title}
              </h1>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-px bg-zinc-400" />
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-500">Official Training Record</p>
                <div className="w-8 h-px bg-zinc-400" />
              </div>
            </div>
            <div className="space-y-4 md:space-y-6 my-4 md:my-10 w-full">
              <p className="text-sm md:text-lg italic text-zinc-600 font-medium">This is to certify that</p>
              <div className="relative inline-block">
                <p className="text-4xl md:text-6xl font-black text-zinc-900 py-2 px-6 border-b-2 border-zinc-200" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {name}
                </p>
              </div>
              <p className="text-sm md:text-lg italic text-zinc-600 font-medium max-w-md mx-auto leading-relaxed px-4">
                has successfully completed the prescribed physical training program and fulfilled all the requirements for the level of
              </p>
              <div className="py-4 px-8 bg-zinc-50/50 rounded-lg border border-zinc-100 inline-block shadow-inner">
                <p className={`text-xl md:text-4xl font-bold uppercase tracking-wider`} style={{ color: textColor }}>
                  {title}
                </p>
              </div>
            </div>
            <div className="w-full flex justify-between items-end mt-10 md:mt-16 pt-8 md:pt-10 relative border-t border-zinc-100">
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3 z-20">
                 <div className="relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex space-x-1 -translate-y-2">
                      <div className="w-4 h-16 md:w-6 md:h-24 shadow-lg" style={{ backgroundColor: ribbonColor, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }} />
                      <div className="w-4 h-16 md:w-6 md:h-24 shadow-lg" style={{ backgroundColor: ribbonColor, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }} />
                    </div>
                    <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-[6px] md:border-[10px] border-double flex items-center justify-center bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 shadow-2xl relative z-10" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                       <div className="text-center">
                          <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-white/20 flex items-center justify-center">
                             <Dumbbell size={24} className="md:w-12 md:h-12 text-white/90" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-24 md:w-40 h-px bg-zinc-300 mb-2" />
                <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Head of Training</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-24 md:w-40 h-px bg-zinc-300 mb-2" />
                <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gym Director</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-xl"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="relative w-full max-w-4xl aspect-[1/1.4] md:aspect-[1.4/1] bg-white rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                onClick={() => setIsExpanded(false)}
              >
                <X size={24} />
              </button>
              <div className="p-1 bg-white relative overflow-hidden font-serif text-zinc-900 mx-auto max-w-lg w-full h-full" style={{ backgroundColor: bgColor }}>
                <div className="border-[10px] md:border-[16px] border-double p-6 md:p-10 relative h-full flex flex-col items-center justify-center" style={{ borderColor: borderColor }}>
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                    <Dumbbell size={300} style={{ color: borderColor }} />
                  </div>
                  <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: `radial-gradient(${borderColor} 0.5px, transparent 0.5px)`, backgroundSize: '15px 15px' }} />
                  <div className="relative z-10 flex flex-col items-center text-center space-y-6 md:space-y-8 w-full">
                    <div className="flex flex-col items-center w-full">
                      <div className="flex items-center justify-center space-x-4 mb-4">
                        <div className="w-12 h-px bg-zinc-300" />
                        <div className={`w-16 h-16 md:w-24 md:h-24 border-4 rounded-full flex items-center justify-center shadow-xl bg-white relative`} style={{ borderColor: borderColor }}>
                          <Dumbbell size={40} className="md:w-14 md:h-14" style={{ color: iconColor }} />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 border border-yellow-600 flex items-center justify-center">
                            <span className="text-[6px] font-bold text-white">★</span>
                          </div>
                        </div>
                        <div className="w-12 h-px bg-zinc-300" />
                      </div>
                      <h1 className={`text-2xl md:text-4xl font-black uppercase tracking-[0.15em] md:tracking-[0.25em] mb-2`} style={{ color: textColor }}>
                        {title}
                      </h1>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-px bg-zinc-400" />
                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-500">Official Training Record</p>
                        <div className="w-8 h-px bg-zinc-400" />
                      </div>
                    </div>
                    <div className="space-y-4 md:space-y-6 my-4 md:my-10 w-full">
                      <p className="text-sm md:text-lg italic text-zinc-600 font-medium">This is to certify that</p>
                      <div className="relative inline-block">
                        <p className="text-4xl md:text-6xl font-black text-zinc-900 py-2 px-6 border-b-2 border-zinc-200" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {name}
                        </p>
                      </div>
                      <p className="text-sm md:text-lg italic text-zinc-600 font-medium max-w-md mx-auto leading-relaxed px-4">
                        has successfully completed the prescribed physical training program and fulfilled all the requirements for the level of
                      </p>
                      <div className="py-4 px-8 bg-zinc-50/50 rounded-lg border border-zinc-100 inline-block shadow-inner">
                        <p className={`text-xl md:text-4xl font-bold uppercase tracking-wider`} style={{ color: textColor }}>
                          {title}
                        </p>
                      </div>
                    </div>
                    <div className="w-full flex justify-between items-end mt-10 md:mt-16 pt-8 md:pt-10 relative border-t border-zinc-100">
                      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3 z-20">
                         <div className="relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex space-x-1 -translate-y-2">
                              <div className="w-4 h-16 md:w-6 md:h-24 shadow-lg" style={{ backgroundColor: ribbonColor, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }} />
                              <div className="w-4 h-16 md:w-6 md:h-24 shadow-lg" style={{ backgroundColor: ribbonColor, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }} />
                            </div>
                            <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-[6px] md:border-[10px] border-double flex items-center justify-center bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 shadow-2xl relative z-10" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                               <div className="text-center">
                                  <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-white/20 flex items-center justify-center">
                                     <Dumbbell size={24} className="md:w-12 md:h-12 text-white/90" />
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-24 md:w-40 h-px bg-zinc-300 mb-2" />
                        <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Head of Training</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-24 md:w-40 h-px bg-zinc-300 mb-2" />
                        <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gym Director</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAMILY_MESSAGES = {
  wife: [
    "يا عيني، شوكت تطلعنا؟ البيت صار كأنه سجن!",
    "حلمت بيك جايبلي ذهب، عسى يطلع الحلم صدك!",
    "محتاجين غراض للبيت، لا تنسى تجيبهن وانت راجع.",
    "الشغل اليوم جان تعب، بس الحمد لله الأرباح زينة.",
    "شوكت تشتريلي سيارة؟ صديقاتي كلهن صار عدهن سيارات!",
    "يا سند العائلة، محتاجة شوية فلوس للسوك.",
    "الجهال كبروا ومصاريفهم زادت، الله يعينك يابه.",
    "سويتلك أكلة تخبل، تعال تعشى قبل لا تبرد.",
    "السيارة محتاجة بانزين، لا تنسى تعبيها.",
    "أريد فستان جديد، عندي مناسبة قريبة.",
    "البيت محتاج صيانة، المطبخ صار يخر!",
    "الجو يجنن اليوم، ما نطلع نتعشى برة؟",
    "يا روحي، محتاجة مبلغ بسيط للالتزامات.",
    "شفت قطعة ذهب بالسوك، تجنن وتلوكلك!",
    "سهرت وية الجهال، تعبت بس كلشي يهون لعيونك.",
    "شوكت تشتريلي موبايل جديد؟ هذا صار يكلب بالصفحات ببطء!",
    "شفت ملابس للجهال بالسوك، بس أسعارهم نار!",
    "محتاجة فلوس للصالون، صارلي دهر ما رايحة.",
    "لا تنسى تجيب الدواء مالي، خلص من زمان.",
    "سويتلك حلوى، ريحتها تارسة البيت!"
  ],
  son: [
    "يابه، السيارة كامت تطلع صوت، لو تصلحها لو تشتريلي وحدة جديدة!",
    "يابه، شوكت تشتريلي سيارة رياضية؟ مليت من هاي السيارة!",
    "الشغل اليوم جان يهد الحيل، بس كلشي يهون لعيونك.",
    "يابه، أريد أروح للحلاق، انطيني شوية فلوس.",
    "محتاج فلوس أشتري سلاح جديد، أصدقائي كلهم صار عدهم أسلحة قوية.",
    "اليوم فزت بالسباق، سيارتي جانت أسرع وحدة!",
    "يابه، الشغل اليوم جان تعب بس الأرباح زينة.",
    "أريد أسافر وية أصدقائي، انطيني شوية فلوس.",
    "يابه، محتاج ملابس جديدة للشغل، ذني صارن قديمات.",
    "اليوم دعمت السيارة دعمة خفيفة، لا تغضب يابه، راح أصلحها.",
    "محتاج فلوس أشتري موبايل جديد، هذا صار يكلب ببطء!",
    "يابه، كل أصدقائي عدهم سيارات فارهة، بس أني سيارتي عادية.",
    "الشغل اليوم جان يجنن، بعنا كومة بضاعة.",
    "يابه، أريد أفتح مشروع صغير، تساعدني برأس المال؟",
    "محتاج فلوس أشتري عطور وملابس، أريد أصير كشخة.",
    "المدرب يكول مستواي تحسن، أريد أشتري معدات رياضية.",
    "يابه، السيارة محتاجة تايرات جديدة، هاي التايرات صارت تمسح.",
    "أريد أروح لحفلة وية أصدقائي، انطيني فلوس للعشة.",
    "يابه، اليوم ساعدت واحد محتاج، ادعيلي بالتوفيق.",
    "محتاج شوية فلوس أكمل غرفتي، أريد أرتبها."
  ],
  daughter: [
    "يابه، أريد فلوس، صديقاتي كلهن اشترن تليفونات جديدة وأني بقيت على هذا!",
    "يابه، اليوم بالجامعة سألوني عن سيارتي، شكراً لأنك اشتريتها إلي.",
    "يابه، شوكت تشتريلي موبايل جديد؟ هذا صار قديم.",
    "اليوم طلعت الأولى بالامتحانات، أريد هدية مميزة منك!",
    "يابه، أريد أروح للصالون، عندي حفلة تخرج صديقتي.",
    "الشغل اليوم جان ممتع، تعلمت أشياء جديدة.",
    "يابه، أريد أشتري جنطة ماركة، شفت وحدة تجنن بالسوك.",
    "اليوم سويتلك كيكة، إن شاء الله تعجبك.",
    "يابه، محتاجة فلوس لدورات تقوية، أريد أطور نفسي.",
    "شوكت تطلعنا نتعشى برة؟ مشتاقة نسولف.",
    "محتاجة فلوس أشتري عطور، شفت عطر ريحته خيالية.",
    "يابه، غرفتي محتاجة ترتيب، أريد أشتري ديكورات جديدة.",
    "اليوم اشتريت كومة كتب، محتاجة فلوس أكمل المجموعة.",
    "يابه، صديقاتي راح يسافرن، تسمحلي أروح وياهن؟",
    "محتاجة فلوس أشتري هدية لأمي، عيد ميلادها قرب.",
    "الشغل اليوم جان هادئ، رتبنا كلشي والحمد لله.",
    "يابه، أريد أتعلم سياقة، سجلني بمدرسة سياقة.",
    "محتاجة فلوس أشتري لابتوب جديد للدراسة، هذا صار بطيء.",
    "اليوم لعبت رياضة وحسيت بنشاط، أريد أشتري ملابس رياضية.",
    "يابه، أنت أحسن أب بالدنيا، الله يحفظك النا."
  ]
};

const FAMILY_IMAGES: any = {
  boy: {
    12: [
      'https://images.pexels.com/photos/4680778/pexels-photo-4680778.jpeg',
      'https://images.pexels.com/photos/7869834/pexels-photo-7869834.jpeg',
      'https://images.pexels.com/photos/11487240/pexels-photo-11487240.jpeg',
      'https://images.pexels.com/photos/5093774/pexels-photo-5093774.jpeg',
      'https://images.pexels.com/photos/11122564/pexels-photo-11122564.jpeg',
      'https://images.pexels.com/photos/3374319/pexels-photo-3374319.jpeg',
      'https://images.pexels.com/photos/31687255/pexels-photo-31687255.jpeg',
      'https://images.pexels.com/photos/7699965/pexels-photo-7699965.jpeg',
      'https://images.pexels.com/photos/7848422/pexels-photo-7848422.jpeg',
      'https://images.pexels.com/photos/15032431/pexels-photo-15032431.jpeg'
    ],
    18: [
      'https://images.pexels.com/photos/28447100/pexels-photo-28447100.jpeg',
      'https://images.pexels.com/photos/15006269/pexels-photo-15006269.jpeg',
      'https://images.pexels.com/photos/6256320/pexels-photo-6256320.jpeg',
      'https://images.pexels.com/photos/5996399/pexels-photo-5996399.jpeg',
      'https://images.pexels.com/photos/6256262/pexels-photo-6256262.jpeg',
      'https://images.pexels.com/photos/4626704/pexels-photo-4626704.jpeg',
      'https://images.pexels.com/photos/1300400/pexels-photo-1300400.jpeg',
      'https://images.pexels.com/photos/5212319/pexels-photo-5212319.jpeg',
      'https://images.pexels.com/photos/36713135/pexels-photo-36713135.jpeg',
      'https://images.pexels.com/photos/22042277/pexels-photo-22042277.jpeg'
    ]
  },
  girl: {
    12: [
      'https://t4.ftcdn.net/jpg/11/26/40/65/360_F_1126406504_Et1rDxd7Z6XH9CFvIolaydJbhnehV28Z.jpg',
      'https://img.freepik.com/premium-photo/portrait-smiling-young-girl-skate-park_641010-74629.jpg?w=360',
      'https://images.pexels.com/photos/3252801/pexels-photo-3252801.jpeg',
      'https://images.pexels.com/photos/4680695/pexels-photo-4680695.jpeg',
      'https://images.pexels.com/photos/355159/pexels-photo-355159.jpeg',
      'https://images.pexels.com/photos/36765472/pexels-photo-36765472.jpeg',
      'https://images.pexels.com/photos/30349209/pexels-photo-30349209.jpeg',
      'https://images.pexels.com/photos/4680778/pexels-photo-4680778.jpeg',
      'https://images.pexels.com/photos/4680778/pexels-photo-4680778.jpeg',
      'https://images.pexels.com/photos/4680778/pexels-photo-4680778.jpeg'
    ],
    18: [
      'https://t3.ftcdn.net/jpg/07/76/02/50/360_F_776025023_nwVBJR3NY03kw5Dw1fzmrgEatwBuKPFF.jpg',
      'https://www.shutterstock.com/image-photo/headshot-portrait-serious-student-teenage-260nw-2570103581.jpg',
      'https://t3.ftcdn.net/jpg/08/11/04/94/360_F_811049433_hlrMocUIfwNS7ylFN23w6he2Z2aKFleA.jpg',
      'https://t3.ftcdn.net/jpg/06/96/65/36/360_F_696653630_jSkwp274ohEutuFDdPsy3N2Uv0E1Yhsv.jpg',
      'https://t4.ftcdn.net/jpg/10/53/47/63/360_F_1053476375_Fotpr3pwYpQqzjR6khAIFsu2YuzSUe8f.jpg',
      'https://static.vecteezy.com/system/resources/thumbnails/060/814/603/small/a-designer-creating-an-original-illustration-to-avoid-copyright-issues-photo.jpg',
      'https://images.pexels.com/photos/4144451/pexels-photo-4144451.jpeg',
      'https://media.istockphoto.com/id/2194007561/photo/portrait-of-saudi-woman-with-headscarf-smiling-at-library.jpg?s=612x612&w=0&k=20&c=FSFdVDVRn-N6C9-FnE0IdiIS7uJBdnnTQP1rFeWDC80=',
      'https://images.pexels.com/photos/732420/pexels-photo-732420.jpeg',
      'https://images.pexels.com/photos/12070173/pexels-photo-12070173.jpeg'
    ]
  },
  man: [
    "https://picsum.photos/seed/m1/400/400",
    "https://picsum.photos/seed/m2/400/400",
    "https://picsum.photos/seed/m3/400/400",
    "https://picsum.photos/seed/m4/400/400",
    "https://picsum.photos/seed/m5/400/400",
    "https://picsum.photos/seed/m6/400/400",
    "https://picsum.photos/seed/m7/400/400",
    "https://picsum.photos/seed/m8/400/400",
    "https://picsum.photos/seed/m9/400/400",
    "https://picsum.photos/seed/m10/400/400"
  ],
  woman: [
    "https://picsum.photos/seed/w1/400/400",
    "https://picsum.photos/seed/w2/400/400",
    "https://picsum.photos/seed/w3/400/400",
    "https://picsum.photos/seed/w4/400/400",
    "https://picsum.photos/seed/w5/400/400",
    "https://picsum.photos/seed/w6/400/400",
    "https://picsum.photos/seed/w7/400/400",
    "https://picsum.photos/seed/w8/400/400",
    "https://picsum.photos/seed/w9/400/400",
    "https://picsum.photos/seed/w10/400/400"
  ]
};

const getChildAge = (birthTimestamp: number) => {
  const hours = (Date.now() - birthTimestamp) / (1000 * 60 * 60);
  return Math.min(Math.floor(hours), 25);
};

const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getFamilyMessage = (id: string, type: 'wife' | 'son' | 'daughter') => {
  const messages = FAMILY_MESSAGES[type];
  const date = new Date();
  const seed = getHash(id) + date.getDate() + date.getHours();
  return messages[seed % messages.length];
};

const getEducationStage = (stageIndex: number) => {
  return EDUCATION_STAGES[stageIndex]?.id || 'none';
};

const getEducationCost = (stageIndex: number) => {
  return EDUCATION_STAGES[stageIndex + 1]?.cost || 0;
};

const Certificate = ({ name, stage, t }: { name: string, stage: string, t: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (stage === 'none' || stage === 'middle' || stage === 'high') return null;
  
  let borderColor = '#d4af37';
  let bgColor = '#fdfbf7';
  let iconColor = '#d4af37';
  let textColor = '#8b6b1d';
  let title = t('family.certificate');
  let sealColor = '#d4af37';
  let ribbonColor = '#b91c1c';

  if (stage === 'university') {
    borderColor = '#1e40af';
    bgColor = '#eff6ff';
    iconColor = '#1e40af';
    textColor = '#1e3a8a';
    sealColor = '#1e40af';
    ribbonColor = '#1d4ed8';
    title = t('family.educationStages.university');
  } else if (stage === 'master') {
    borderColor = '#94a3b8';
    bgColor = '#f8fafc';
    iconColor = '#64748b';
    textColor = '#334155';
    sealColor = '#94a3b8';
    ribbonColor = '#1e293b';
    title = t('family.educationStages.master');
  } else if (stage === 'phd') {
    borderColor = '#b76e79';
    bgColor = '#fff5f5';
    iconColor = '#b76e79';
    textColor = '#702935';
    sealColor = '#b76e79';
    ribbonColor = '#4c0519';
    title = t('family.educationStages.phd');
  }

  const CertificateContent = ({ isSmall = false }: { isSmall?: boolean }) => (
    <div 
      className={isSmall 
        ? "w-[30px] h-[30px] rounded border shadow-sm flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-transform" 
        : "p-1 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden font-serif text-zinc-900 mx-auto max-w-lg w-full h-full"
      } 
      style={{ backgroundColor: bgColor, borderColor: isSmall ? borderColor : undefined, borderWidth: isSmall ? '1px' : undefined }}
      onClick={isSmall ? () => setIsExpanded(true) : undefined}
    >
      {isSmall ? (
        <GraduationCap size={16} style={{ color: iconColor }} />
      ) : (
        <div className="border-[10px] md:border-[16px] border-double p-6 md:p-10 relative h-full flex flex-col items-center justify-center" style={{ borderColor: borderColor }}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
            <GraduationCap size={300} style={{ color: borderColor }} />
          </div>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: `radial-gradient(${borderColor} 0.5px, transparent 0.5px)`, backgroundSize: '15px 15px' }} />
          <div className="relative z-10 flex flex-col items-center text-center space-y-6 md:space-y-8 w-full">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="w-12 h-px bg-zinc-300" />
                <div className={`w-16 h-16 md:w-24 md:h-24 border-4 rounded-full flex items-center justify-center shadow-xl bg-white relative`} style={{ borderColor: borderColor }}>
                  <GraduationCap size={40} className="md:w-14 md:h-14" style={{ color: iconColor }} />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 border border-yellow-600 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">★</span>
                  </div>
                </div>
                <div className="w-12 h-px bg-zinc-300" />
              </div>
              <h1 className={`text-2xl md:text-4xl font-black uppercase tracking-[0.15em] md:tracking-[0.25em] mb-2`} style={{ color: textColor }}>
                {title}
              </h1>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-px bg-zinc-400" />
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-500">Official Academic Record</p>
                <div className="w-8 h-px bg-zinc-400" />
              </div>
            </div>
            <div className="space-y-4 md:space-y-6 my-4 md:my-10 w-full">
              <p className="text-sm md:text-lg italic text-zinc-600 font-medium">This is to certify that</p>
              <div className="relative inline-block">
                <p className="text-4xl md:text-6xl font-black text-zinc-900 py-2 px-6 border-b-2 border-zinc-200" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {name}
                </p>
              </div>
              <p className="text-sm md:text-lg italic text-zinc-600 font-medium max-w-md mx-auto leading-relaxed px-4">
                has successfully completed the prescribed course of study and fulfilled all the requirements for the degree of
              </p>
              <div className="py-4 px-8 bg-zinc-50/50 rounded-lg border border-zinc-100 inline-block shadow-inner">
                <p className={`text-xl md:text-4xl font-bold uppercase tracking-wider`} style={{ color: textColor }}>
                  {t(`family.educationStages.${stage}`)}
                </p>
              </div>
            </div>
            <div className="w-full flex justify-between items-end mt-10 md:mt-16 pt-8 md:pt-10 relative border-t border-zinc-100">
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3 z-20">
                 <div className="relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex space-x-1 -translate-y-2">
                      <div className="w-4 h-16 md:w-6 md:h-24 shadow-lg" style={{ backgroundColor: ribbonColor, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }} />
                      <div className="w-4 h-16 md:w-6 md:h-24 shadow-lg" style={{ backgroundColor: ribbonColor, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }} />
                    </div>
                    <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-[6px] md:border-[10px] border-double flex items-center justify-center bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 shadow-2xl relative z-10" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                       <div className="text-center">
                          <div className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest leading-tight">
                            UNIVERSITY<br/>OF<br/>MAFIA
                          </div>
                          <div className="mt-1 text-[8px] md:text-[10px] text-white/80 font-bold">EST. 1990</div>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="text-center z-10 w-28 md:w-40">
                <p className="text-[8px] md:text-[10px] text-zinc-400 mb-1">Date: {new Date().toLocaleDateString()}</p>
                <p className="text-[10px] md:text-xs font-serif italic text-zinc-700 mb-1">Dr. Alexander Thorne</p>
                <div className="w-full h-px bg-zinc-400 mb-2" />
                <p className="text-[8px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">Dean of Faculty</p>
              </div>
              <div className="text-center z-10 w-28 md:w-40">
                <p className="text-[8px] md:text-[10px] text-zinc-400 mb-1">ID: #AC-{Math.floor(Math.random() * 100000)}</p>
                <p className="text-[10px] md:text-xs font-serif italic text-zinc-700 mb-1">Prof. Elena Vance</p>
                <div className="w-full h-px bg-zinc-400 mb-2" />
                <p className="text-[8px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">University President</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <CertificateContent isSmall={true} />

      <AnimatePresence>
        {isExpanded && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.1, opacity: 0 }}
              className="w-full max-w-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <CertificateContent />
              <button 
                onClick={() => setIsExpanded(false)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white text-zinc-900 rounded-full flex items-center justify-center shadow-xl hover:bg-zinc-100 transition-colors z-[110]"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function Family() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const gender = profile?.gender;

  const [showGenderConfirm, setShowGenderConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [divorceConfirm, setDivorceConfirm] = useState<string | null>(null);
  const [kickConfirm, setKickConfirm] = useState<{ wifeId: string, childId: string } | null>(null);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [hiddenMessages, setHiddenMessages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'table'>('grid');

  const handleSetGender = async (g: 'male' | 'female') => {
    if (!profile) return;
    await updateDoc(doc(db, 'users', profile.uid), { gender: g });
  };

  const wives = useMemo(() => profile?.family?.wives || [], [profile?.family?.wives]);
  const maxPartners = useMemo(() => gender === 'male' ? 4 : 1, [gender]);

  const hideMessage = useCallback((id: string) => setHiddenMessages(prev => new Set(prev).add(id)), []);

  // Calculate Finances
  const { dailyIncome, dailyExpenses, hourlyPropertiesProfit } = useMemo(() => {
    let income = 0;
    let expenses = 0;

    // Player (Head of Family) Salary
    if (profile?.managedPropertyId) {
      income += profile.salary || 2000;
    }

    wives.forEach(wife => {
      expenses += 2500; // Base expense per partner (increased for realism)
      
      // Partner Salary if managing property
      if (wife.managedPropertyId) {
        const prop = (profile?.builtProperties || []).find(p => p.id === wife.managedPropertyId);
        const baseSalary = 2000;
        const levelBonus = (prop?.level || 1) * 500;
        income += baseSalary + levelBonus;
      }

      (wife.children || []).forEach(child => {
        const age = getChildAge(child.birthTimestamp);
        
        if (age >= 18 && child.managedPropertyId) {
          const prop = (profile?.builtProperties || []).find(p => p.id === child.managedPropertyId);
          const baseSalary = 1000;
          const levelBonus = (prop?.level || 1) * 200;
          income += baseSalary + levelBonus;
        }

        expenses += 1500; // Base expense per child (increased for realism)
      });
    });

    let propertiesHourlyProfit = 0;
    (profile?.builtProperties || []).forEach(prop => {
      let baseHourly = 0;
      if (prop.type === 'casino') baseHourly = 1500;
      else if (prop.type === 'hotel') baseHourly = 800;
      else if (prop.type === 'drug_factory') baseHourly = 500 + (prop.workers || 0) * 20;
      else if (prop.type === 'weapon_stash') baseHourly = 800;
      else if (prop.type === 'bank') baseHourly = 1200;
      else if (prop.type === 'ammunition_factory') baseHourly = 1000;
      else if (prop.type === 'headquarters') baseHourly = 2000;
      
      let multiplier = 1 + (prop.level - 1) * 0.01;
      if (prop.upgrades) {
        Object.values(prop.upgrades).forEach(val => {
          multiplier += (Number(val) || 0) * 0.005;
        });
      }
      if (prop.managerId) {
        multiplier *= 1.1;
      }
      const minuteProfit = Math.floor((baseHourly / 60) * multiplier * getVIPMultiplier(profile?.vipLevel as any));
      propertiesHourlyProfit += minuteProfit * 60;
    });

    return { dailyIncome: income, dailyExpenses: expenses, hourlyPropertiesProfit: propertiesHourlyProfit };
  }, [profile?.managedPropertyId, profile?.salary, profile?.builtProperties, profile?.vipLevel, wives]);

  const totalDailyIncome = dailyIncome + (hourlyPropertiesProfit * 24);
  const netDailyProfit = totalDailyIncome - dailyExpenses;
  const netHourlyProfit = Math.floor(netDailyProfit / 24);

  const lastCollection = profile?.family?.lastCollection || Date.now();
  const hoursPassed = (Date.now() - lastCollection) / (1000 * 60 * 60);
  const pendingProfits = Math.floor(netHourlyProfit * hoursPassed);

  const totalFamilyStrength = useMemo(() => {
    let total = calculateTotalGymStrength(profile?.familyGymLevel || 0);
    wives.forEach(wife => {
      total += calculateTotalGymStrength(wife.gymLevel || 0);
      wife.children.forEach(child => {
        total += calculateTotalGymStrength(child.gymLevel || 0);
      });
    });
    return total;
  }, [profile?.familyGymLevel, wives]);

  const totalFamilyDefense = useMemo(() => {
    let total = Math.min((profile?.education || 0) * 1000, 5000);
    wives.forEach(wife => {
      total += Math.min((wife.education || 0) * 1000, 5000);
      wife.children.forEach(child => {
        total += Math.min((child.education || 0) * 1000, 5000);
      });
    });
    return total;
  }, [profile?.education, wives]);

  const handleAdvanceGym = async (wifeId: string | null, childId: string | null) => {
    if (!profile) return;
    
    let currentLevel = 0;
    let lastTime = 0;
    const wives = profile.family?.wives || [];
    
    if (wifeId === null && childId === null) {
      // Player
      currentLevel = profile.familyGymLevel || 0;
      lastTime = profile.lastFamilyGymTime || 0;
    } else if (wifeId && !childId) {
      // Wife
      const wife = wives.find(w => w.id === wifeId);
      currentLevel = wife?.gymLevel || 0;
      lastTime = wife?.lastGymTime || 0;
    } else if (wifeId && childId) {
      // Child
      const wife = wives.find(w => w.id === wifeId);
      const child = wife?.children.find(c => c.id === childId);
      currentLevel = child?.gymLevel || 0;
      lastTime = child?.lastGymTime || 0;
    }
    
    if (currentLevel >= GYM_LEVELS) {
      toast.error(t('family.maxGymLevel', 'وصلت لأقصى مستوى تدريب'));
      return;
    }
    
    const cost = getGymCost(currentLevel);
    if (profile.cleanMoney < cost) {
      toast.error(t('common.insufficientFunds'));
      return;
    }
    
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    if (now - lastTime < oneHour) {
      const remaining = Math.ceil((oneHour - (now - lastTime)) / (60 * 1000));
      toast.error(t('family.gymCooldown', { minutes: remaining }) || `يجب الانتظار ${remaining} دقيقة للتدريب القادم`);
      return;
    }
    
    const updates: any = {
      cleanMoney: profile.cleanMoney - cost
    };
    
    if (wifeId === null && childId === null) {
      updates.familyGymLevel = currentLevel + 1;
      updates.lastFamilyGymTime = now;
    } else if (wifeId && !childId) {
      updates.family = {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? { ...w, gymLevel: currentLevel + 1, lastGymTime: now } : w)
      };
    } else if (wifeId && childId) {
      updates.family = {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? {
          ...w,
          children: w.children.map(c => c.id === childId ? { ...c, gymLevel: currentLevel + 1, lastGymTime: now } : c)
        } : w)
      };
    }
    
    await updateDoc(doc(db, 'users', profile.uid), updates);
    toast.success(t('family.gymSuccess', 'تم رفع مستوى التدريب بنجاح'));
  };

  const handleAdminLevelUp = async (wifeId: string | null, childId: string | null) => {
    if (!profile) return;
    
    let currentLevel = 0;
    const wives = profile.family?.wives || [];
    
    if (wifeId === null && childId === null) {
      currentLevel = profile.familyGymLevel || 0;
    } else if (wifeId && !childId) {
      const wife = wives.find(w => w.id === wifeId);
      currentLevel = wife?.gymLevel || 0;
    } else if (wifeId && childId) {
      const wife = wives.find(w => w.id === wifeId);
      const child = wife?.children.find(c => c.id === childId);
      currentLevel = child?.gymLevel || 0;
    }
    
    if (currentLevel >= GYM_LEVELS) {
      toast.error('وصلت لأقصى مستوى تدريب');
      return;
    }
    
    const updates: any = {};
    
    if (wifeId === null && childId === null) {
      updates.familyGymLevel = currentLevel + 1;
    } else if (wifeId && !childId) {
      updates.family = {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? { ...w, gymLevel: currentLevel + 1 } : w)
      };
    } else if (wifeId && childId) {
      updates.family = {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? {
          ...w,
          children: w.children.map(c => c.id === childId ? { ...c, gymLevel: currentLevel + 1 } : c)
        } : w)
      };
    }
    
    await updateDoc(doc(db, 'users', profile.uid), updates);
    toast.success('تم رفع المستوى بنجاح (Admin)');
  };

  const handleAdminEducationLevelUp = async (wifeId: string | null, childId: string | null) => {
    if (!profile) return;
    
    let currentLevel = 0;
    const wives = profile.family?.wives || [];
    
    if (wifeId === null && childId === null) {
      currentLevel = profile.education || 0;
    } else if (wifeId && !childId) {
      const wife = wives.find(w => w.id === wifeId);
      currentLevel = wife?.education || 0;
    } else if (wifeId && childId) {
      const wife = wives.find(w => w.id === wifeId);
      const child = wife?.children.find(c => c.id === childId);
      currentLevel = child?.education || 0;
    }
    
    if (currentLevel >= EDUCATION_STAGES.length - 1) {
      toast.error(t('family.maxEducationReached'));
      return;
    }
    
    const updates: any = {};
    
    if (wifeId === null && childId === null) {
      updates.education = currentLevel + 1;
    } else if (wifeId && !childId) {
      updates.family = {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? { ...w, education: currentLevel + 1 } : w)
      };
    } else if (wifeId && childId) {
      updates.family = {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? {
          ...w,
          children: w.children.map(c => c.id === childId ? { ...c, education: currentLevel + 1 } : c)
        } : w)
      };
    }
    
    await updateDoc(doc(db, 'users', profile.uid), updates);
    toast.success('تم رفع المستوى بنجاح (Admin)');
  };

  const handleAdvanceEducation = async (wifeId: string | null, childId: string | null) => {
    if (!profile) return;
    
    const wives = profile.family?.wives || [];
    let currentEducation = 0;
    let lastEducationTime = 0;
    
    if (wifeId === null) {
      currentEducation = profile.education || 0;
      lastEducationTime = profile.lastEducationTime || 0;
    } else if (wifeId && !childId) {
      const wife = wives.find(w => w.id === wifeId);
      currentEducation = wife?.education || 0;
      lastEducationTime = wife?.lastEducationTime || 0;
    } else if (wifeId && childId) {
      const wife = wives.find(w => w.id === wifeId);
      const child = wife?.children.find(c => c.id === childId);
      currentEducation = child?.education || 0;
      lastEducationTime = child?.lastEducationTime || 0;
    }

    const nextStage = EDUCATION_STAGES[currentEducation + 1];
    if (!nextStage) {
      toast.error(t('family.maxEducationReached'));
      return;
    }

    const timeSinceLastEducation = Date.now() - lastEducationTime;
    const oneHour = 60 * 60 * 1000;
    if (timeSinceLastEducation < oneHour) {
      const remainingMinutes = Math.ceil((oneHour - timeSinceLastEducation) / (60 * 1000));
      toast.error(t('family.educationWait', { minutes: remainingMinutes }));
      return;
    }
    
    if (profile.cleanMoney < nextStage.cost) {
      toast.error(t('common.notEnoughMoney'));
      return;
    }

    if (wifeId === null) {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney - nextStage.cost,
        education: currentEducation + 1,
        lastEducationTime: Date.now()
      });
      toast.success(t('family.educationAdvanced'));
      return;
    }
    
    const updatedWives = wives.map(w => {
      if (w.id === wifeId) {
        if (!childId) {
          return { ...w, education: currentEducation + 1, lastEducationTime: Date.now() };
        } else {
          return {
            ...w,
            children: w.children.map(c => c.id === childId ? { ...c, education: currentEducation + 1, lastEducationTime: Date.now() } : c)
          };
        }
      }
      return w;
    });
    
    await updateDoc(doc(db, 'users', profile.uid), {
      cleanMoney: profile.cleanMoney - nextStage.cost,
      'family.wives': updatedWives
    });
    
    toast.success(t('family.educationAdvanced'));
  };







  const handleCollectProfits = async () => {
    if (!profile || pendingProfits <= 0) {
      toast.error(t('family.noProfitsToCollect', 'لا توجد أرباح للتحصيل.'));
      return;
    }
    
    await updateDoc(doc(db, 'users', profile.uid), {
      cleanMoney: (profile.cleanMoney || 0) + pendingProfits,
      'family.lastCollection': Date.now()
    });
    toast.success(t('family.collectProfits') + ': ' + formatMoney(pendingProfits));
  };

  const handleAddPartner = async () => {
    if (!profile || (profile.family?.wives?.length || 0) >= maxPartners) return;
    
    const traitKeys = ['loyal', 'ambitious', 'clever', 'wise'];
    const countryKeys = ['syria', 'lebanon', 'egypt', 'iraq', 'uae'];
    
    const partnerNames = i18n.language === 'ar'
      ? (gender === 'male' ? ['سارة', 'ليلى', 'نور', 'هدى', 'فاطمة', 'مريم', 'عائشة', 'زينب', 'خديجة', 'حفصة'] : ['أحمد', 'عمر', 'علي', 'زيد', 'يوسف', 'حمزة', 'خالد', 'سلمان', 'عبدالله', 'إبراهيم'])
      : (gender === 'male' ? ['Sara', 'Layla', 'Nour', 'Huda', 'Fatima', 'Maryam', 'Aisha', 'Zainab', 'Khadija', 'Hafsa'] : ['Ahmed', 'Omar', 'Ali', 'Zaid', 'Yousef', 'Hamza', 'Khalid', 'Salman', 'Abdullah', 'Ibrahim']);

    const seedIndex = Math.floor(Math.random() * 10);
    const targetGender = gender === 'male' ? 'female' : 'male';
    const genderKey = targetGender === 'male' ? 'man' : 'woman';
    const initialImageUrl = FAMILY_IMAGES[genderKey][seedIndex];

    const newPartner = {
      id: `partner_${Date.now()}`,
      name: partnerNames[Math.floor(Math.random() * partnerNames.length)],
      image: initialImageUrl,
      seedIndex: seedIndex,
      age: 20 + Math.floor(Math.random() * 20),
      traitKey: traitKeys[Math.floor(Math.random() * traitKeys.length)],
      countryKey: countryKeys[Math.floor(Math.random() * countryKeys.length)],
      health: 100,
      mood: 100,
      education: 0,
      children: []
    };
    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: [...wives, newPartner]
      }
    });
  };

  const handleRemoveWife = async (wifeId: string) => {
    if (!profile) return;
    setDivorceConfirm(wifeId);
  };

  const confirmDivorce = async () => {
    if (!profile || !divorceConfirm) return;
    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: wives.filter(w => w.id !== divorceConfirm)
      }
    });
    setDivorceConfirm(null);
    toast.success(t('common.success'));
  };

  const handleKickChild = async (wifeId: string, childId: string) => {
    if (!profile) return;
    setKickConfirm({ wifeId, childId });
  };

  const confirmKickChild = async () => {
    if (!profile || !kickConfirm) return;
    const { wifeId, childId } = kickConfirm;
    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? {
          ...w,
          children: w.children.filter(c => c.id !== childId)
        } : w)
      }
    });
    setKickConfirm(null);
    toast.success(t('common.success'));
  };

  const handleChangeGender = async () => {
    if (!profile) return;
    setShowGenderConfirm(true);
  };

  const confirmChangeGender = async () => {
    if (!profile) return;
    
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        gender: null, // Set to null to return to selection screen
        family: {
          wives: [],
          lastCollection: Date.now()
        }
      });
      toast.success(t('common.success'));
      setShowGenderConfirm(false);
    } catch (error) {
      console.error("Error changing gender:", error);
      toast.error(t('common.failed'));
    }
  };

  const handleResetFamily = async () => {
    if (!profile) return;
    setShowResetConfirm(true);
  };

  const confirmResetFamily = async () => {
    if (!profile) return;
    
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        family: {
          wives: [],
          lastCollection: Date.now()
        }
      });
      toast.success(t('common.success'));
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Error resetting family:", error);
      toast.error(t('common.failed'));
    }
  };

  const getChildImageFallback = (child: any, age: number) => {
    return `https://picsum.photos/seed/${child.id}/400/400`;
  };

  const getPlayerImageFallback = (gender: 'male' | 'female', uid: string) => {
    return `https://picsum.photos/seed/${uid}/400/400`;
  };

  const getPartnerImageFallback = (gender: 'male' | 'female', id: string, seedIndex?: number) => {
    const targetGender = gender === 'male' ? 'female' : 'male';
    const genderKey = targetGender === 'male' ? 'man' : 'woman';
    const images = FAMILY_IMAGES[genderKey];
    const index = (seedIndex !== undefined ? seedIndex : getHash(id)) % images.length;
    return images[index];
  };

  const handleAddChild = async (wifeId: string) => {
    if (!profile) return;
    const isBoy = Math.random() > 0.5;
    const boyNames = ['أحمد', 'عمر', 'علي', 'زيد', 'يوسف', 'خالد', 'سعود', 'فهد', 'عبدالله', 'محمد'];
    const girlNames = ['سارة', 'ليلى', 'نور', 'هدى', 'فاطمة', 'مريم', 'نورة', 'ريم', 'شهد', 'حصة'];
    const name = isBoy ? boyNames[Math.floor(Math.random() * boyNames.length)] : girlNames[Math.floor(Math.random() * girlNames.length)];
    
    const childId = `child_${Date.now()}`;
    const seedIndex = Math.floor(Math.random() * 10);
    const genderKey = isBoy ? 'boy' : 'girl';
    const initialImageUrl = FAMILY_IMAGES[genderKey][12][seedIndex];
    
    const newChild = {
      id: childId,
      name: name,
      gender: isBoy ? 'boy' : 'girl',
      image: initialImageUrl,
      seedIndex: seedIndex,
      birthTimestamp: Date.now() - (12 * 60 * 60 * 1000), // Start at age 12
      health: 100,
      mood: 100,
      education: 0,
      items: []
    };
    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: wives.map(w => w.id === wifeId ? { ...w, children: [...(w.children || []), newChild] } : w)
      }
    });
  };

  const handleAssignProperty = async (wifeId: string | null, childId: string | null, propertyId: string) => {
    if (!profile) return;
    
    // Partner/Player salary: 2k - 5k, Child salary: 1k - 2k
    const salary = !childId 
      ? 2000 + Math.floor(Math.random() * 3000)
      : 1000 + Math.floor(Math.random() * 1000);

    if (wifeId === null) {
      // Player (Head of Family)
      await updateDoc(doc(db, 'users', profile.uid), {
        managedPropertyId: propertyId,
        salary: propertyId ? salary : 0
      });
      toast.success(t('common.success'));
      return;
    }

    const updatedWives = wives.map(w => {
      if (w.id === wifeId) {
        if (childId) {
          return {
            ...w,
            children: w.children.map(c => c.id === childId ? { ...c, managedPropertyId: propertyId, salary: propertyId ? salary : 0 } : c)
          };
        } else {
          return { ...w, managedPropertyId: propertyId, salary: propertyId ? salary : 0 };
        }
      }
      return w;
    });

    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: updatedWives
      }
    });
    toast.success(t('common.success'));
  };

  const handleAssignVehicle = async (wifeId: string, childId: string | null, vehicleId: string, fromMarket: boolean = false) => {
    if (!profile) return;

    if (fromMarket) {
      const car = MARKET_ITEMS.cars.find(c => c.id === vehicleId);
      if (!car) return;
      if ((profile.cleanMoney || 0) < car.price) {
        toast.error(t('common.noMoney'));
        return;
      }
      // Deduct money
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: (profile.cleanMoney || 0) - car.price
      });
    } else {
      // Check inventory
      const currentCount = (profile.inventory?.cars?.[vehicleId] || 0);
      if (currentCount <= 0) {
        toast.error(t('common.noItem'));
        return;
      }
      // Deduct from inventory
      await updateDoc(doc(db, 'users', profile.uid), {
        [`inventory.cars.${vehicleId}`]: currentCount - 1
      });
    }

    const updatedWives = wives.map(w => {
      if (w.id === wifeId) {
        if (childId) {
          return {
            ...w,
            children: w.children.map(c => c.id === childId ? { ...c, assignedVehicleId: vehicleId } : c)
          };
        } else {
          return { ...w, assignedVehicleId: vehicleId };
        }
      }
      return w;
    });

    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: updatedWives
      }
    });
    toast.success(t('common.success'));
  };

  const handleAddItem = async (wifeId: string, childId: string | null, itemId: string, fromMarket: boolean = false) => {
    if (!profile) return;

    if (fromMarket) {
      const allItems = [...MARKET_ITEMS.weapons, ...MARKET_ITEMS.armor, ...MARKET_ITEMS.tools, ...MARKET_ITEMS.supplements];
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;
      if ((profile.cleanMoney || 0) < item.price) {
        toast.error(t('common.noMoney'));
        return;
      }
      // Deduct money
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: (profile.cleanMoney || 0) - item.price
      });
    } else {
      // Check inventory across all categories
      let category: 'weapons' | 'armor' | 'tools' | 'supplements' | null = null;
      if (profile.inventory?.weapons?.[itemId]) category = 'weapons';
      else if (profile.inventory?.armor?.[itemId]) category = 'armor';
      else if (profile.inventory?.tools?.[itemId]) category = 'tools';
      else if (profile.inventory?.supplements?.[itemId]) category = 'supplements';

      if (!category) {
        toast.error(t('common.noItem'));
        return;
      }

      const currentCount = profile.inventory![category]![itemId] || 0;
      if (currentCount <= 0) {
        toast.error(t('common.noItem'));
        return;
      }

      // Deduct from inventory
      await updateDoc(doc(db, 'users', profile.uid), {
        [`inventory.${category}.${itemId}`]: currentCount - 1
      });
    }

    const updatedWives = wives.map(w => {
      if (w.id === wifeId) {
        if (childId) {
          return {
            ...w,
            children: w.children.map(c => {
              if (c.id === childId) {
                return { ...c, items: [...(c.items || []), itemId] };
              }
              return c;
            })
          };
        } else {
          return { ...w, items: [...(w.items || []), itemId] };
        }
      }
      return w;
    });

    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: updatedWives
      }
    });
    toast.success(t('common.success'));
  };

  const handleRemoveItem = async (wifeId: string, childId: string | null, itemIndex: number) => {
    if (!profile) return;
    const updatedWives = wives.map(w => {
      if (w.id === wifeId) {
        if (childId) {
          return {
            ...w,
            children: w.children.map(c => {
              if (c.id === childId) {
                const newItems = [...(c.items || [])];
                newItems.splice(itemIndex, 1);
                return { ...c, items: newItems };
              }
              return c;
            })
          };
        } else {
          const newItems = [...(w.items || [])];
          newItems.splice(itemIndex, 1);
          return { ...w, items: newItems };
        }
      }
      return w;
    });

    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: updatedWives
      }
    });
  };

  const handleUpdateWifeImage = async (wifeId: string) => {
    if (!profile) return;
    
    const wife = profile.family.wives.find((w: any) => w.id === wifeId);
    if (!wife) return;

    const gender = profile.gender === 'male' ? 'woman' : 'man';
    const images = FAMILY_IMAGES[gender];
    
    // Pick a random seedIndex from 0-9 that is different from the current one
    let nextSeedIndex;
    const currentSeedIndex = wife.seedIndex || 0;
    do {
      nextSeedIndex = Math.floor(Math.random() * 10);
    } while (nextSeedIndex === currentSeedIndex);

    const newImageUrl = images[nextSeedIndex];

    const updatedWives = profile.family.wives.map((w: any) => 
      w.id === wifeId ? { ...w, image: newImageUrl, seedIndex: nextSeedIndex } : w
    );

    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: updatedWives
      }
    });
    toast.success(t('common.success'));
  };

  const handleUpdateChildImage = async (wifeId: string, childId: string) => {
    if (!profile) return;
    setImagePrompt(`child_${wifeId}_${childId}`);
    setNewImageUrl('');
  };

  const handleRefreshChildImage = async (wifeId: string, childId: string) => {
    if (!profile) return;
    const wife = profile.family.wives.find((w: any) => w.id === wifeId);
    if (!wife) return;
    const child = wife.children.find((c: any) => c.id === childId);
    if (!child) return;
    
    // Pick a random seedIndex from 0-9 that is different from the current one
    let nextSeedIndex;
    const currentSeedIndex = child.seedIndex || 0;
    do {
      nextSeedIndex = Math.floor(Math.random() * 10);
    } while (nextSeedIndex === currentSeedIndex);

    const age = getChildAge(child.birthTimestamp);
    const gender = child.gender === 'boy' ? 'boy' : 'girl';
    const ageKey = age >= 18 ? 18 : 12;
    const newImageUrl = FAMILY_IMAGES[gender][ageKey as 12 | 18][nextSeedIndex];
    
    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: profile.family.wives.map((w: any) => w.id === wifeId ? {
          ...w,
          children: w.children.map((c: any) => c.id === childId ? { ...c, image: newImageUrl, seedIndex: nextSeedIndex } : c)
        } : w)
      }
    });
    toast.success(t('common.success'));
  };

  const handleRefreshAllChildrenImages = async () => {
    if (!profile) return;
    
    const updatedWives = profile.family.wives.map((wife: any) => ({
      ...wife,
      children: (wife.children || []).map((child: any) => {
        const age = getChildAge(child.birthTimestamp);
        const gender = child.gender === 'boy' ? 'boy' : 'girl';
        const ageKey = age >= 18 ? 18 : 12;
        const nextSeedIndex = Math.floor(Math.random() * 10);
        const newImageUrl = FAMILY_IMAGES[gender][ageKey as 12 | 18][nextSeedIndex];
        return { ...child, image: newImageUrl, seedIndex: nextSeedIndex };
      })
    }));

    await updateDoc(doc(db, 'users', profile.uid), {
      family: {
        ...profile.family,
        wives: updatedWives
      }
    });
    toast.success(t('common.success'));
  };

  const confirmUpdateWifeImage = async () => {
    if (!profile || !imagePrompt || !newImageUrl) return;

    try {
      if (imagePrompt === 'player') {
        await updateDoc(doc(db, 'users', profile.uid), {
          photoURL: newImageUrl
        });
      } else if (imagePrompt.startsWith('child_')) {
        const [, wifeId, childId] = imagePrompt.split('_');
        await updateDoc(doc(db, 'users', profile.uid), {
          family: {
            ...profile.family,
            wives: wives.map(w => w.id === wifeId ? {
              ...w,
              children: w.children.map(c => c.id === childId ? { ...c, image: newImageUrl } : c)
            } : w)
          }
        });
      } else {
        await updateDoc(doc(db, 'users', profile.uid), {
          family: {
            ...profile.family,
            wives: wives.map(w => w.id === imagePrompt ? { ...w, image: newImageUrl } : w)
          }
        });
      }
      toast.success(t('common.success'));
      setImagePrompt(null);
      setNewImageUrl('');
    } catch (error) {
      console.error("Error updating Firestore:", error);
      toast.error(t('common.failed'));
    }
  };

  const handleAgeUpChild = async (wifeId: string, childId: string) => {
    if (!profile || (profile.cleanMoney || 0) < 1000000) {
        toast.error(t('common.noMoney'));
        return;
    }
    
    await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: (profile.cleanMoney || 0) - 1000000,
        family: {
            ...profile.family,
            wives: wives.map(w => w.id === wifeId ? {
                ...w,
                children: w.children.map(c => {
                    if (c.id === childId) {
                        const genderKey = c.gender === 'boy' ? 'boy' : 'girl';
                        const seedIndex = c.seedIndex || 0;
                        const newImageUrl = FAMILY_IMAGES[genderKey][18][seedIndex % 10];
                        
                        return {
                            ...c,
                            birthTimestamp: Date.now() - (18 * 60 * 60 * 1000), // Set age to 18
                            image: newImageUrl
                        };
                    }
                    return c;
                })
            } : w)
        }
    });
  };

  const getCountryFlag = (countryKey: string) => {
    const flags: Record<string, string> = {
      'syria': '🇸🇾',
      'lebanon': '🇱🇧',
      'egypt': '🇪🇬',
      'iraq': '🇮🇶',
      'uae': '🇦🇪'
    };
    return flags[countryKey.toLowerCase()] || '🏳️';
  };

  const getItemName = (itemId: string) => {
    if (!itemId) return '';
    return t(`items.${itemId}`);
  };

  const inventoryCars = profile?.inventory?.cars || {};
  const inventoryItems: Record<string, number> = {
    ...(profile?.inventory?.weapons || {}),
    ...(profile?.inventory?.armor || {}),
    ...(profile?.inventory?.tools || {}),
    ...(profile?.inventory?.supplements || {})
  };

  if (!gender) {
    return (
      <div className="text-white p-8 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-black mb-8">{t('family.chooseGender')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-blue-500 transition-all group">
            <div className="text-4xl mb-4">👨</div>
            <h3 className="text-xl font-bold mb-2">{t('family.male')}</h3>
            <p className="text-zinc-400 text-sm mb-6">{t('family.maleDesc')}</p>
            <button 
              onClick={() => handleSetGender('male')} 
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
            >
              {t('family.male')}
            </button>
          </div>
          
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-pink-500 transition-all group">
            <div className="text-4xl mb-4">👩</div>
            <h3 className="text-xl font-bold mb-2">{t('family.female')}</h3>
            <p className="text-zinc-400 text-sm mb-6">{t('family.femaleDesc')}</p>
            <button 
              onClick={() => handleSetGender('female')} 
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-bold transition-colors"
            >
              {t('family.female')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white space-y-8 max-w-7xl mx-auto pb-20">
      {/* Gender Change Confirmation Modal */}
      {showGenderConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-4 text-yellow-500">
              <RefreshCw size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('family.changeGender')}</h3>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {t('family.changeGenderDesc')}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowGenderConfirm(false)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-black uppercase tracking-wider transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmChangeGender}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Family Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-4 text-red-500">
              <Trash2 size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('family.resetFamily', 'إعادة إنشاء العائلة')}</h3>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {t('family.resetFamilyDesc', 'هل أنت متأكد من رغبتك في إعادة إنشاء العائلة؟ سيتم حذف جميع أفراد العائلة الحاليين.')}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-black uppercase tracking-wider transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmResetFamily}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Divorce Confirmation Modal */}
      {divorceConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-4 text-red-500">
              <Trash2 size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('family.divorce')}</h3>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {t('family.divorceConfirmDesc')}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDivorceConfirm(null)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-black uppercase tracking-wider transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmDivorce}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Child Confirmation Modal */}
      {kickConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-4 text-red-500">
              <Trash2 size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('family.kickChild')}</h3>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {t('family.kickChildConfirmDesc')}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setKickConfirm(null)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-black uppercase tracking-wider transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmKickChild}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image URL Prompt Modal */}
      {imagePrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-4 text-blue-500">
              <RefreshCw size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tight">{t('family.updateImage')}</h3>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('family.imageUrl')}</label>
              <input 
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setImagePrompt(null)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-black uppercase tracking-wider transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmUpdateWifeImage}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Header Section */}
      <div className="relative overflow-hidden bg-zinc-900/40 p-8 md:p-12 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-xl shadow-2xl">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-600/10 blur-[120px] -mr-48 -mt-48 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-600/10 blur-[100px] -ml-32 -mb-32 rounded-full pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div className="flex items-center gap-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <div className="relative p-6 bg-zinc-900 rounded-3xl border border-white/5 text-white shadow-2xl">
                <Heart size={48} className="text-pink-500" />
              </div>
            </motion.div>
            <div>
              <motion.h2 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-sm"
              >
                {t('family.title')}
              </motion.h2>
              <motion.p 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-zinc-400 text-xl max-w-xl leading-relaxed font-medium"
              >
                {t('family.desc')}
              </motion.p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full lg:w-auto">
            {/* Income Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="group relative bg-zinc-900/80 p-6 rounded-3xl border border-white/5 hover:border-green-500/30 transition-all duration-500 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">{t('family.income')}</p>
                  <p className="text-2xl font-black text-green-500 tabular-nums">{formatMoney(dailyIncome)}</p>
                </div>
              </div>
            </motion.div>

            {/* Expenses Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="group relative bg-zinc-900/80 p-6 rounded-3xl border border-white/5 hover:border-red-500/30 transition-all duration-500 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">{t('family.expenses')}</p>
                  <p className="text-2xl font-black text-red-500 tabular-nums">{formatMoney(dailyExpenses)}</p>
                </div>
              </div>
            </motion.div>

            {/* Net Profit Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="group relative bg-zinc-900/80 p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all duration-500 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">{t('family.netProfit', 'صافي الربح اليومي')}</p>
                  <p className="text-2xl font-black text-blue-500 tabular-nums">{formatMoney(netDailyProfit)}</p>
                </div>
              </div>
            </motion.div>

            {/* Total Strength Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="group relative bg-zinc-900/80 p-6 rounded-3xl border border-white/5 hover:border-orange-500/30 transition-all duration-500 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">{t('family.totalStrength', 'مجموع قوة العائلة')}</p>
                  <p className="text-2xl font-black text-orange-500 tabular-nums">+{totalFamilyStrength}</p>
                </div>
              </div>
            </motion.div>

            {/* Total Defense Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="group relative bg-zinc-900/80 p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all duration-500 shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-1">{t('family.totalDefense', 'مجموع دفاع العائلة')}</p>
                  <p className="text-2xl font-black text-blue-500 tabular-nums">+{totalFamilyDefense}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Actions Bar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center gap-4"
        >
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleChangeGender}
              className="group px-6 py-4 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-2xl font-black uppercase tracking-wider transition-all flex items-center gap-3 border border-white/5 active:scale-95"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
              {t('family.changeGender')}
            </button>

            <button 
              onClick={handleResetFamily}
              className="px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-wider transition-all flex items-center gap-3 border border-red-500/20 active:scale-95"
            >
              <Trash2 size={18} />
              {t('family.resetFamily', 'إعادة إنشاء العائلة')}
            </button>

            <button 
              onClick={handleRefreshAllChildrenImages}
              className="px-6 py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-2xl font-black uppercase tracking-wider transition-all flex items-center gap-3 border border-blue-500/20 active:scale-95"
            >
              <RefreshCw size={18} />
              {t('family.refreshAllChildren', 'تحديث جميع صور الأبناء')}
            </button>
          </div>

          <div className="flex flex-wrap gap-4 ml-auto">
            {pendingProfits > 0 && (
              <button 
                onClick={handleCollectProfits}
                className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black uppercase tracking-wider transition-all flex items-center gap-3 shadow-lg shadow-green-600/20 active:scale-95"
              >
                <DollarSign size={20} />
                {t('family.collectProfits')}
              </button>
            )}

            {wives.length < maxPartners && (
              <button 
                onClick={handleAddPartner} 
                className="px-10 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl font-black uppercase tracking-wider shadow-xl shadow-pink-600/20 transition-all active:scale-95 hover:-translate-y-0.5"
              >
                <Plus size={20} className="inline-block mr-2 -mt-1" />
                {t(gender === 'male' ? 'family.addWife' : 'family.addHusband')}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Player Card (Head of Family) */}
        {profile && (
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-zinc-800/50 overflow-hidden flex flex-col">
            <div className="relative h-64 group flex items-center justify-center bg-zinc-800/30">
              <PlayerAvatar 
                photoURL={profile.photoURL} 
                displayName={profile.displayName} 
                vipLevel={profile.vipLevel} 
                size="2xl"
                shape="square"
                className="w-full h-full"
              />
              <button onClick={() => { setImagePrompt('player'); setNewImageUrl(profile.photoURL || ''); }} className="absolute bottom-4 right-4 p-2 bg-red-600 hover:bg-red-500 rounded-full transition-colors border-2 border-zinc-900 shadow-lg z-20">
                <RefreshCw size={14} className="text-white" />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-3xl font-black player-name-script mb-1">{profile.displayName}</h3>
                <div className="flex items-center gap-3 text-zinc-300">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase">
                    {t(gender === 'male' ? 'family.husband' : 'family.wife')} ({t('family.headOfFamily')})
                  </span>
                  <span className="text-sm font-medium">
                    {profile.age || 25} {t('common.years')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Family Income & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-3xl p-6 flex items-center justify-between group hover:bg-zinc-800/50 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform shadow-lg shadow-green-900/10">
                      <DollarSign size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('family.totalIncome', 'إجمالي دخل العائلة (يومي)')}</p>
                      <p className="text-2xl font-black text-white tracking-tight">{formatMoney(totalDailyIncome)}</p>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('family.lastUpdate', 'آخر تحصيل')}</p>
                    <p className="text-xs font-bold text-zinc-400">
                      {profile.family?.lastCollection ? new Date(profile.family.lastCollection).toLocaleTimeString() : t('common.never', 'أبداً')}
                    </p>
                  </div>
                </div>
                
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-3xl p-6 flex items-center justify-between group hover:bg-zinc-800/50 transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/10">
                      <TrendingUp size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('family.hourlyProfit', 'الأرباح الساعية')}</p>
                      <p className="text-2xl font-black text-white tracking-tight">
                        {formatMoney(netHourlyProfit)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('family.pendingProfits', 'الأرباح المعلقة')}</p>
                    <p className="text-xs font-bold text-emerald-400">
                      {formatMoney(pendingProfits)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex flex-col gap-1 min-w-[100px]">
                  <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <Activity size={12} className="text-red-500" />
                      {t('family.health')}
                    </div>
                    <span>{profile.health || 100}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${profile.health || 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Player Education Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <GraduationCap size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{t('family.education')}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {(profile.education || 0) < EDUCATION_STAGES.length - 1 && (
                      <button 
                        onClick={() => handleAdvanceEducation(null, null)}
                        disabled={(Date.now() - (profile.lastEducationTime || 0)) < (60 * 60 * 1000)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                          (Date.now() - (profile.lastEducationTime || 0)) < (60 * 60 * 1000)
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
                        }`}
                      >
                        <GraduationCap size={16} />
                        <span className="hidden sm:inline">
                          {(Date.now() - (profile.lastEducationTime || 0)) < (60 * 60 * 1000)
                            ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (profile.lastEducationTime || 0))) / (60 * 1000))}m`
                            : t('family.goToStudy')}
                        </span>
                        <span className="sm:hidden">
                          {(Date.now() - (profile.lastEducationTime || 0)) < (60 * 60 * 1000)
                            ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (profile.lastEducationTime || 0))) / (60 * 1000))}m`
                            : t('family.education')}
                        </span>
                        <span className="text-[10px] opacity-80">({formatMoney(getEducationCost(profile.education || 0))})</span>
                      </button>
                    )}
                    {profile.role === 'Admin' && (profile.education || 0) < EDUCATION_STAGES.length - 1 && (
                      <button 
                        onClick={() => handleAdminEducationLevelUp(null, null)}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {t(`family.educationStages.${getEducationStage(profile.education || 0)}`)}
                    </span>
                    <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                      +{Math.min((profile.education || 0) * 1000, 5000)} D
                    </span>
                  </div>
                  
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                      style={{ width: `${((profile.education || 0) / (EDUCATION_STAGES.length - 1)) * 100}%` }}
                    />
                  </div>

                  <Certificate name={profile.displayName} stage={getEducationStage(profile.education || 0)} t={t} />
                </div>
              </div>

              {/* Player Gym Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Dumbbell size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{t('family.gym', 'النادي الرياضي')}</h4>
                  </div>
                  {(profile.familyGymLevel || 0) < 20 && (
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleAdvanceGym(null, null)}
                        disabled={(Date.now() - (profile.lastFamilyGymTime || 0)) < (60 * 60 * 1000)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                          (Date.now() - (profile.lastFamilyGymTime || 0)) < (60 * 60 * 1000)
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                            : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-900/20'
                        }`}
                      >
                        <Dumbbell size={16} />
                        <span className="hidden sm:inline">
                          {(Date.now() - (profile.lastFamilyGymTime || 0)) < (60 * 60 * 1000)
                            ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (profile.lastFamilyGymTime || 0))) / (60 * 1000))}m`
                            : t('family.train', 'تدريب')}
                        </span>
                        <span className="sm:hidden">
                          {(Date.now() - (profile.lastFamilyGymTime || 0)) < (60 * 60 * 1000)
                            ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (profile.lastFamilyGymTime || 0))) / (60 * 1000))}m`
                            : t('family.gym', 'النادي')}
                        </span>
                        <span className="text-[10px] opacity-80">({formatMoney(getGymCost(profile.familyGymLevel || 0))})</span>
                      </button>
                      {profile.role === 'Admin' && (
                        <button 
                          onClick={() => handleAdminLevelUp(null, null)}
                          className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg w-full"
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      {t('family.gymLevel', 'مستوى النادي')}: {profile.familyGymLevel || 0}
                    </span>
                    <span className="text-xs font-black text-orange-500">+{calculateTotalGymStrength(profile.familyGymLevel || 0)} {t('common.strength', 'قوة')}</span>
                  </div>
                  
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000"
                      style={{ width: `${((profile.familyGymLevel || 0) / 20) * 100}%` }}
                    />
                  </div>

                  <GymCertificate name={profile.displayName} level={profile.familyGymLevel || 0} isSmall={true} />
                </div>
              </div>
            </div>
          </div>
        )}

        {wives.map((wife) => (
          <div key={wife.id} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden flex flex-col">
            <div className="relative h-64 group flex items-center justify-center bg-zinc-800/30">
              <div className="absolute inset-0 opacity-20">
                <img 
                  src={wife.image || getPartnerImageFallback(gender as 'male' | 'female', wife.id, wife.seedIndex)} 
                  alt={wife.name} 
                  className="w-full h-full object-cover blur-sm" 
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <PlayerAvatar 
                photoURL={wife.image || getPartnerImageFallback(gender as 'male' | 'female', wife.id, wife.seedIndex)} 
                displayName={wife.name}
                size="2xl"
                shape="square"
                className="w-full h-full"
              />

              {/* Floating Message Bubble */}
              {!hiddenMessages.has(wife.id) && (
                <div className="absolute bottom-4 right-4 z-20 w-64 pointer-events-auto">
                  <div className="bg-white text-zinc-900 p-4 rounded-2xl shadow-2xl border border-zinc-200 relative animate-bounce-slow">
                    <button
                      onClick={() => hideMessage(wife.id)}
                      className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-zinc-700"
                    >
                      X
                    </button>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                        <MessageCircle size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('family.wife')}</p>
                        <p className="text-sm font-bold leading-tight text-right dir-rtl">
                          {getFamilyMessage(wife.id, 'wife')}
                        </p>
                      </div>
                    </div>
                    {/* Speech Bubble Arrow */}
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-zinc-200 rotate-45" />
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-3xl font-black player-name-script mb-1">{wife.name}</h3>
                    <div className="flex items-center gap-3 text-zinc-300">
                      <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs font-bold uppercase">
                        {t(gender === 'male' ? 'family.wife' : 'family.husband')}
                      </span>
                      <span className="text-sm font-medium">
                        {wife.age} {t('common.years')} • {getCountryFlag(wife.countryKey || wife.country || '')} {wife.countryKey ? t(`family.countries.${wife.countryKey}`) : wife.country}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleUpdateWifeImage(wife.id)} className="p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl transition-colors">
                    <RefreshCw size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Stats & Traits */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex flex-col gap-1 min-w-[100px]">
                    <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Activity size={12} className="text-red-500" />
                        {t('family.health')}
                      </div>
                      <span>{wife.health}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${wife.health}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-w-[100px]">
                    <div className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Smile size={12} className="text-yellow-500" />
                        {t('family.mood')}
                      </div>
                      <span>{wife.mood || 100}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${wife.mood || 100}%` }} />
                    </div>
                  </div>
                  {wife.traitKey && (
                    <span className="px-4 py-2 bg-zinc-800 rounded-xl text-xs font-bold text-zinc-300 border border-zinc-700 flex items-center gap-2">
                      ✨ {t(`family.traits.${wife.traitKey}`)}
                    </span>
                  )}
                  <div className="flex-1" />
                  <button 
                    onClick={() => handleRemoveWife(wife.id)}
                    className="px-4 py-2 text-red-500 hover:text-white hover:bg-red-600 bg-red-600/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-red-600/20"
                  >
                    {t('family.divorce')}
                  </button>
                </div>

              {/* Assigned Vehicle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Car size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{t('family.assignedVehicle')}</h4>
                  </div>
                  <div className="flex gap-1">
                    <select 
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[8px] outline-none text-blue-400 max-w-[70px]"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignVehicle(wife.id, null, e.target.value, false);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">{t('family.fromInventory')}</option>
                      {Object.keys(inventoryCars).map(carId => (
                        <option key={carId} value={carId}>{getItemName(carId)}</option>
                      ))}
                    </select>
                    <select 
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[8px] outline-none text-yellow-400 max-w-[70px]"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignVehicle(wife.id, null, e.target.value, true);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">{t('family.fromMarket')}</option>
                      {MARKET_ITEMS.cars.map(car => (
                        <option key={car.id} value={car.id}>{getItemName(car.id)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {wife.assignedVehicleId ? (
                  <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                    <div className="flex items-center gap-3">
                      <Car size={20} className="text-pink-500" />
                      <span className="font-bold">{getItemName(wife.assignedVehicleId)}</span>
                    </div>
                    <button 
                      onClick={() => handleAssignVehicle(wife.id, null, '')}
                      className="text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">{t('family.noVehicle')}</p>
                )}
              </div>

              {/* Education Section for Partner */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <GraduationCap size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{t('family.education')}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {wife.education < EDUCATION_STAGES.length - 1 && (
                      <button 
                        onClick={() => handleAdvanceEducation(wife.id, null)}
                        disabled={(Date.now() - (wife.lastEducationTime || 0)) < (60 * 60 * 1000)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                          (Date.now() - (wife.lastEducationTime || 0)) < (60 * 60 * 1000)
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
                        }`}
                      >
                        <GraduationCap size={16} />
                        <span className="hidden sm:inline">
                          {(Date.now() - (wife.lastEducationTime || 0)) < (60 * 60 * 1000)
                            ? `${t('family.goToStudy')} (${Math.ceil(((60 * 60 * 1000) - (Date.now() - (wife.lastEducationTime || 0))) / (60 * 1000))}m)`
                            : t('family.goToStudy')}
                        </span>
                        <span className="sm:hidden">
                          {(Date.now() - (wife.lastEducationTime || 0)) < (60 * 60 * 1000)
                            ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (wife.lastEducationTime || 0))) / (60 * 1000))}m`
                            : t('family.education')}
                        </span>
                        <span className="text-[10px] opacity-80">({formatMoney(getEducationCost(wife.education || 0))})</span>
                      </button>
                    )}
                    {profile.role === 'Admin' && wife.education < EDUCATION_STAGES.length - 1 && (
                      <button 
                        onClick={() => handleAdminEducationLevelUp(wife.id, null)}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {t(`family.educationStages.${getEducationStage(wife.education || 0)}`)}
                    </span>
                    <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                      +{Math.min((wife.education || 0) * 1000, 5000)} D
                    </span>
                  </div>
                  
                  {/* Progress Bar for Education */}
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                      style={{ width: `${((wife.education || 0) / (EDUCATION_STAGES.length - 1)) * 100}%` }}
                    />
                  </div>

                  <Certificate name={wife.name} stage={getEducationStage(wife.education || 0)} t={t} />
                </div>
              </div>

              {/* Gym Section for Wife */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Dumbbell size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{t('family.gym', 'النادي الرياضي')}</h4>
                  </div>
                  {(wife.gymLevel || 0) < 20 && (
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleAdvanceGym(wife.id, null)}
                        disabled={(Date.now() - (wife.lastGymTime || 0)) < (60 * 60 * 1000)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                          (Date.now() - (wife.lastGymTime || 0)) < (60 * 60 * 1000)
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                            : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-900/20'
                        }`}
                      >
                        <Dumbbell size={16} />
                        <span className="hidden sm:inline">
                          {(Date.now() - (wife.lastGymTime || 0)) < (60 * 60 * 1000)
                            ? `${t('family.train', 'تدريب')} (${Math.ceil(((60 * 60 * 1000) - (Date.now() - (wife.lastGymTime || 0))) / (60 * 1000))}m)`
                            : t('family.train', 'تدريب')}
                        </span>
                        <span className="sm:hidden">
                          {(Date.now() - (wife.lastGymTime || 0)) < (60 * 60 * 1000)
                            ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (wife.lastGymTime || 0))) / (60 * 1000))}m`
                            : t('family.gym', 'النادي')}
                        </span>
                        <span className="text-[10px] opacity-80">({formatMoney(getGymCost(wife.gymLevel || 0))})</span>
                      </button>
                      {profile.role === 'Admin' && (
                        <button 
                          onClick={() => handleAdminLevelUp(wife.id, null)}
                          className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg w-full"
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      {t('family.gymLevel', 'مستوى النادي')}: {wife.gymLevel || 0}
                    </span>
                    <span className="text-xs font-black text-orange-500">+{calculateTotalGymStrength(wife.gymLevel || 0)} {t('common.strength', 'قوة')}</span>
                  </div>
                  
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000"
                      style={{ width: `${((wife.gymLevel || 0) / 20) * 100}%` }}
                    />
                  </div>

                  <GymCertificate name={wife.name} level={wife.gymLevel || 0} isSmall={true} />
                </div>
              </div>

              {/* Items Section for Wife */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Package size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{t('family.items')}</h4>
                  </div>
                  <div className="flex gap-1">
                    <select 
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[7px] outline-none text-blue-400 max-w-[60px] h-6"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(wife.id, null, e.target.value, false);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">{t('family.fromInventory')}</option>
                      {Object.keys(inventoryItems).map(itemId => (
                        <option key={itemId} value={itemId}>{getItemName(itemId)}</option>
                      ))}
                    </select>
                    <select 
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[7px] outline-none text-yellow-400 max-w-[60px] h-6"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(wife.id, null, e.target.value, true);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">{t('family.fromMarket')}</option>
                      {[...MARKET_ITEMS.weapons, ...MARKET_ITEMS.armor, ...MARKET_ITEMS.tools, ...MARKET_ITEMS.supplements].map(item => (
                        <option key={item.id} value={item.id}>{getItemName(item.id)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(wife.items || []).map((itemId, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                      <span className="text-xs font-bold">{getItemName(itemId)}</span>
                      <button onClick={() => handleRemoveItem(wife.id, null, idx)} className="text-zinc-500 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!wife.items || wife.items.length === 0) && (
                    <p className="text-sm text-zinc-500 italic">{t('family.noItems')}</p>
                  )}
                </div>
              </div>

              {/* Assets Section for Wife */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Briefcase size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{t('family.work')}</h4>
                  </div>
                  <select 
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[7px] outline-none text-blue-400 max-w-[80px] h-6"
                    onChange={(e) => handleAssignProperty(wife.id, null, e.target.value)}
                    value={wife.managedPropertyId || ''}
                  >
                    <option value="">{t('family.noProperty')}</option>
                    {(profile?.builtProperties || []).map(prop => (
                      <option key={prop.id} value={prop.id}>{t(`properties.types.${prop.type}`)}</option>
                    ))}
                  </select>
                </div>
                {wife.managedPropertyId ? (
                  <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-green-500" />
                      <span className="text-xs font-bold">{t(`properties.types.${(profile?.builtProperties || []).find(p => p.id === wife.managedPropertyId)?.type}`)}</span>
                    </div>
                    <span className="text-[10px] font-black text-green-500">+{formatMoney(wife.salary || 0)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">{t('family.noManagedProperty')}</p>
                )}
              </div>

              {/* Children Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Users size={18} />
                      <h4 className="text-sm font-black uppercase tracking-widest">{t('family.childrenList', 'قائمة الأبناء')}</h4>
                    </div>
                    
                    <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                      <button 
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'cards' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {t('family.viewCards', 'بطاقات')}
                      </button>
                      <button 
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {t('family.viewTable', 'جدول')}
                      </button>
                    </div>
                  </div>
                  
                  {wife.children.length < 15 && (
                    <button 
                      onClick={() => handleAddChild(wife.id)}
                      className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>

                {viewMode === 'table' ? (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-md">
                    <table className="w-full text-right dir-rtl">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50">
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('family.child', 'الابن')}</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('common.age', 'العمر')}</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('family.stats', 'الحالة')}</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('family.education', 'التعليم')}</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('family.assets', 'الأصول')}</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('common.actions', 'الإجراءات')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {(wife.children || []).map(child => {
                          const age = getChildAge(child.birthTimestamp);
                          const educationStage = getEducationStage(child.education || 0);
                          
                          return (
                            <tr key={child.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <PlayerAvatar 
                                    photoURL={(!child.image || child.image.includes('pollinations.ai') || child.image.includes('dicebear.com')) ? getChildImageFallback(child, age) : child.image}
                                    displayName={child.name}
                                    size="md"
                                    shape="square"
                                  />
                                  <div>
                                    <div className="text-xs font-black text-white">{child.name}</div>
                                    <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                                      {child.gender === 'boy' ? t('family.son') : t('family.daughter')}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-xs font-bold text-zinc-300">{age} {t('common.years')}</div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Activity size={10} className="text-red-500" />
                                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden w-16">
                                      <div className="h-full bg-red-500" style={{ width: `${child.health}%` }} />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Smile size={10} className="text-yellow-500" />
                                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden w-16">
                                      <div className="h-full bg-yellow-500" style={{ width: `${child.mood}%` }} />
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <GraduationCap size={14} className="text-blue-500" />
                                  <span className="text-[10px] font-bold text-blue-400">
                                    {t(`family.educationStages.${educationStage}`)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-1">
                                  {child.assignedVehicleId && (
                                    <div className="flex items-center gap-1 text-[8px] text-zinc-400">
                                      <Car size={10} />
                                      <span>{MARKET_ITEMS.cars.find(c => c.id === child.assignedVehicleId)?.name}</span>
                                    </div>
                                  )}
                                  {child.managedPropertyId && (
                                    <div className="flex items-center gap-1 text-[8px] text-green-500">
                                      <Briefcase size={10} />
                                      <span>{t(`properties.types.${(profile?.builtProperties || []).find(p => p.id === child.managedPropertyId)?.type}`)}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleAgeUpChild(wife.id, child.id)}
                                    className="p-1.5 bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-lg transition-all"
                                    title={t('family.ageUp')}
                                  >
                                    <TrendingUp size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleKickChild(wife.id, child.id)}
                                    className="p-1.5 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-lg transition-all"
                                    title={t('family.kickChild')}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(wife.children || []).map(child => {
                    const age = getChildAge(child.birthTimestamp);
                    return (
                      <div key={child.id} className="bg-zinc-800/50 rounded-2xl border border-zinc-700 overflow-hidden space-y-4">
                        <div className="relative group h-64 flex items-center justify-center bg-zinc-800/30">
                          <div className="absolute inset-0 opacity-20">
                            <img 
                              src={(!child.image || child.image.includes('pollinations.ai') || child.image.includes('dicebear.com')) ? getChildImageFallback(child, age) : child.image} 
                              alt={child.name}
                              className="w-full h-full object-cover blur-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <PlayerAvatar 
                            photoURL={(!child.image || child.image.includes('pollinations.ai') || child.image.includes('dicebear.com')) ? getChildImageFallback(child, age) : child.image}
                            displayName={child.name}
                            size="xl"
                            shape="square"
                            className="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                          
                          <button 
                            onClick={() => handleRefreshChildImage(wife.id, child.id)}
                            className="absolute top-4 right-14 p-2 bg-black/40 hover:bg-black/80 backdrop-blur-md rounded-xl text-white transition-all border border-white/10 shadow-lg active:scale-90"
                            title={t('common.refresh')}
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button 
                            onClick={() => handleUpdateChildImage(wife.id, child.id)}
                            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/80 backdrop-blur-md rounded-xl text-white transition-all border border-white/10 shadow-lg active:scale-90"
                            title={t('family.updateImage')}
                          >
                            <Camera size={16} />
                          </button>

                          {/* Floating Message Bubble for Child */}
                          {!hiddenMessages.has(child.id) && (
                            <div className="absolute bottom-4 right-4 z-20 w-48 pointer-events-auto">
                              <div className="bg-white/90 backdrop-blur-md text-zinc-900 p-3 rounded-xl shadow-xl border border-zinc-200 relative animate-bounce-slow">
                                <button
                                  onClick={() => hideMessage(child.id)}
                                  className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-zinc-700"
                                >
                                  X
                                </button>
                                <div className="flex items-start gap-2">
                                  <MessageCircle size={14} className={child.gender === 'boy' ? 'text-blue-500' : 'text-pink-500'} />
                                  <div>
                                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                                      {child.gender === 'boy' ? t('family.son') : t('family.daughter')}
                                    </p>
                                    <p className="text-[10px] font-bold leading-tight text-right dir-rtl">
                                      {getFamilyMessage(child.id, child.gender === 'boy' ? 'son' : 'daughter')}
                                    </p>
                                  </div>
                                </div>
                                {/* Speech Bubble Arrow */}
                                <div className="absolute -bottom-2 right-4 w-3 h-3 bg-white/90 border-r border-b border-zinc-200 rotate-45" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-6 pt-0 space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-xl font-black player-name-script">{child.name}</h5>
                                <div className="flex flex-wrap gap-4 mt-2">
                                  <div className="flex flex-col gap-1 min-w-[80px]">
                                    <div className="flex items-center justify-between text-[8px] font-black text-zinc-500 uppercase tracking-tighter">
                                      <div className="flex items-center gap-1">
                                        <Activity size={10} className="text-red-500" />
                                        {t('family.health')}
                                      </div>
                                      <span>{child.health}%</span>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-red-500" style={{ width: `${child.health}%` }} />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 min-w-[80px]">
                                    <div className="flex items-center justify-between text-[8px] font-black text-zinc-500 uppercase tracking-tighter">
                                      <div className="flex items-center gap-1">
                                        <Smile size={10} className="text-yellow-500" />
                                        {t('family.mood')}
                                      </div>
                                      <span>{child.mood || 100}%</span>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-yellow-500" style={{ width: `${child.mood || 100}%` }} />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 min-w-[80px]">
                                    <div className="flex items-center justify-between text-[8px] font-black text-zinc-500 uppercase tracking-tighter">
                                      <div className="flex items-center gap-1">
                                        <GraduationCap size={10} className="text-blue-500" />
                                        {t('family.education')}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-blue-400">+{Math.min((child.education || 0) * 1000, 5000)} D</span>
                                        <span>{Math.round(((child.education || 0) / (EDUCATION_STAGES.length - 1)) * 100)}%</span>
                                      </div>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500" style={{ width: `${((child.education || 0) / (EDUCATION_STAGES.length - 1)) * 100}%` }} />
                                    </div>
                                  </div>
                                  <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                    {age} {t('common.years')}
                                  </div>
                                </div>
                                
                                {age >= 18 && child.traits && child.traits.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {child.traits.map(trait => (
                                      <span key={trait} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[8px] font-bold uppercase rounded-md border border-zinc-700">
                                        {t(`family.traits.${trait}`)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {age < 18 ? (
                                <button 
                                  onClick={() => handleAgeUpChild(wife.id, child.id)}
                                  className="px-4 py-2 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                >
                                  {t('family.ageUp')}
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleKickChild(wife.id, child.id)}
                                  className="px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-red-600/20 active:scale-95"
                                >
                                  {t('family.kickChild')}
                                </button>
                              )}
                              <button 
                                onClick={() => handleRefreshChildImage(wife.id, child.id)}
                                className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/5 flex items-center justify-center gap-2 active:scale-95"
                              >
                                <RefreshCw size={12} />
                                {t('common.refresh')}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Education Section for Child */}
                          <div className="space-y-3 col-span-full lg:col-span-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <GraduationCap size={16} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">{t('family.education')}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                {child.education < EDUCATION_STAGES.length - 1 && (
                                  <button 
                                    onClick={() => handleAdvanceEducation(wife.id, child.id)}
                                    disabled={(Date.now() - (child.lastEducationTime || 0)) < (60 * 60 * 1000)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-1 ${
                                      (Date.now() - (child.lastEducationTime || 0)) < (60 * 60 * 1000)
                                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
                                    }`}
                                  >
                                    <GraduationCap size={12} />
                                    <span className="hidden sm:inline">
                                      {(Date.now() - (child.lastEducationTime || 0)) < (60 * 60 * 1000)
                                        ? `${t('family.goToStudy')} (${Math.ceil(((60 * 60 * 1000) - (Date.now() - (child.lastEducationTime || 0))) / (60 * 1000))}m)`
                                        : t('family.goToStudy')}
                                    </span>
                                    <span className="sm:hidden">
                                      {(Date.now() - (child.lastEducationTime || 0)) < (60 * 60 * 1000)
                                        ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (child.lastEducationTime || 0))) / (60 * 1000))}m`
                                        : t('family.education')}
                                    </span>
                                    <span className="text-[8px] opacity-80">({formatMoney(getEducationCost(child.education || 0))})</span>
                                  </button>
                                )}
                                {profile.role === 'Admin' && child.education < EDUCATION_STAGES.length - 1 && (
                                  <button 
                                    onClick={() => handleAdminEducationLevelUp(wife.id, child.id)}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg text-[10px] font-black uppercase"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  {t(`family.educationStages.${getEducationStage(child.education || 0)}`)}
                                </span>
                                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                                  +{Math.min((child.education || 0) * 1000, 5000)} D
                                </span>
                              </div>
                              
                              {/* Progress Bar for Education */}
                              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                                  style={{ width: `${((child.education || 0) / (EDUCATION_STAGES.length - 1)) * 100}%` }}
                                />
                              </div>

                              <Certificate name={child.name} stage={getEducationStage(child.education || 0)} t={t} />
                            </div>
                          </div>

                          {/* Gym Section for Child */}
                          <div className="space-y-3 col-span-full lg:col-span-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Dumbbell size={16} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">{t('family.gym', 'النادي الرياضي')}</h4>
                              </div>
                              {(child.gymLevel || 0) < 20 && (
                                <div className="flex flex-col gap-2">
                                  <button 
                                    onClick={() => handleAdvanceGym(wife.id, child.id)}
                                    disabled={(Date.now() - (child.lastGymTime || 0)) < (60 * 60 * 1000)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-1 ${
                                      (Date.now() - (child.lastGymTime || 0)) < (60 * 60 * 1000)
                                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                                        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-900/20'
                                    }`}
                                  >
                                    <Dumbbell size={12} />
                                    <span className="hidden sm:inline">
                                      {(Date.now() - (child.lastGymTime || 0)) < (60 * 60 * 1000)
                                        ? `${t('family.train', 'تدريب')} (${Math.ceil(((60 * 60 * 1000) - (Date.now() - (child.lastGymTime || 0))) / (60 * 1000))}m)`
                                        : t('family.train', 'تدريب')}
                                    </span>
                                    <span className="sm:hidden">
                                      {(Date.now() - (child.lastGymTime || 0)) < (60 * 60 * 1000)
                                        ? `${Math.ceil(((60 * 60 * 1000) - (Date.now() - (child.lastGymTime || 0))) / (60 * 1000))}m`
                                        : t('family.gym', 'النادي')}
                                    </span>
                                    <span className="text-[8px] opacity-80">({formatMoney(getGymCost(child.gymLevel || 0))})</span>
                                  </button>
                                  {profile.role === 'Admin' && (
                                    <button 
                                      onClick={() => handleAdminLevelUp(wife.id, child.id)}
                                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg text-[10px] font-black uppercase"
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-700/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                  {t('family.gymLevel', 'مستوى النادي')}: {child.gymLevel || 0}
                                </span>
                                <span className="text-[10px] font-black text-orange-500">+{calculateTotalGymStrength(child.gymLevel || 0)} {t('common.strength', 'قوة')}</span>
                              </div>
                              
                              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
                                <div 
                                  className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000"
                                  style={{ width: `${((child.gymLevel || 0) / 20) * 100}%` }}
                                />
                              </div>

                              <GymCertificate name={child.name} level={child.gymLevel || 0} isSmall={true} />
                            </div>
                          </div>

                          {/* Vehicle Assignment Section for Child */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Car size={16} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">{t('family.vehicle')}</h4>
                              </div>
                              <div className="flex gap-1">
                                <select 
                                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[7px] outline-none text-blue-400 max-w-[60px] h-6"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignVehicle(wife.id, child.id, e.target.value, false);
                                      e.target.value = '';
                                    }
                                  }}
                                >
                                  <option value="">{t('family.fromInventory')}</option>
                                  {Object.keys(inventoryCars).map(carId => (
                                    <option key={carId} value={carId}>{getItemName(carId)}</option>
                                  ))}
                                </select>
                                <select 
                                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[7px] outline-none text-yellow-400 max-w-[60px] h-6"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignVehicle(wife.id, child.id, e.target.value, true);
                                      e.target.value = '';
                                    }
                                  }}
                                >
                                  <option value="">{t('family.fromMarket')}</option>
                                  {MARKET_ITEMS.cars.map(car => (
                                    <option key={car.id} value={car.id}>{getItemName(car.id)}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {child.assignedVehicleId ? (
                              <div className="flex items-center justify-between bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-700/50">
                                <span className="text-xs font-bold">{getItemName(child.assignedVehicleId)}</span>
                                <button onClick={() => handleAssignVehicle(wife.id, child.id, '')} className="text-zinc-500 hover:text-red-500">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-600 italic">{t('family.noVehicle')}</p>
                            )}
                          </div>

                          {/* Items Section for Child */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Package size={16} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">{t('family.items')}</h4>
                              </div>
                              <div className="flex gap-1">
                                <div className="relative group">
                                  <select 
                                    className="appearance-none bg-blue-500/10 border border-blue-500/20 rounded-lg px-1 py-0.5 text-[7px] font-bold outline-none text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer pr-4 max-w-[60px] h-6"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAddItem(wife.id, child.id, e.target.value, false);
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    <option value="">+ {t('family.fromInventory')}</option>
                                    {Object.keys(inventoryItems).map(itemId => (
                                      <option key={itemId} value={itemId}>{getItemName(itemId)} ({inventoryItems[itemId]})</option>
                                    ))}
                                  </select>
                                  <Plus size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                                </div>
                                <div className="relative group">
                                  <select 
                                    className="appearance-none bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-1 py-0.5 text-[7px] font-bold outline-none text-yellow-400 hover:bg-yellow-500/20 transition-all cursor-pointer pr-4 max-w-[60px] h-6"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAddItem(wife.id, child.id, e.target.value, true);
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    <option value="">+ {t('family.fromMarket')}</option>
                                    {[...MARKET_ITEMS.weapons, ...MARKET_ITEMS.armor, ...MARKET_ITEMS.tools, ...MARKET_ITEMS.supplements].map(item => (
                                      <option key={item.id} value={item.id}>{getItemName(item.id)} ({formatMoney(item.price)})</option>
                                    ))}
                                  </select>
                                  <Plus size={8} className="absolute right-1 top-1/2 -translate-y-1/2 text-yellow-400 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {(child.items || []).map((itemId, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-700/50">
                                  <span className="text-[10px] font-bold">{getItemName(itemId)}</span>
                                  <button onClick={() => handleRemoveItem(wife.id, child.id, idx)} className="text-zinc-500 hover:text-red-500">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                              {(!child.items || child.items.length === 0) && (
                                <p className="text-[10px] text-zinc-600 italic">{t('family.noItems')}</p>
                              )}
                            </div>
                          </div>

                          {/* Assets Section for Child */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Briefcase size={16} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">{t('family.work')}</h4>
                              </div>
                              <select 
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-0.5 text-[7px] outline-none text-blue-400 max-w-[80px] h-6"
                                onChange={(e) => handleAssignProperty(wife.id, child.id, e.target.value)}
                                value={child.managedPropertyId || ''}
                              >
                                <option value="">{t('family.noProperty')}</option>
                                {(profile?.builtProperties || []).map(prop => (
                                  <option key={prop.id} value={prop.id}>{t(`properties.types.${prop.type}`)}</option>
                                ))}
                              </select>
                            </div>
                            {child.managedPropertyId ? (
                              <div className="bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TrendingUp size={12} className="text-green-500" />
                                  <span className="text-[10px] font-bold">{t(`properties.types.${(profile?.builtProperties || []).find(p => p.id === child.managedPropertyId)?.type}`)}</span>
                                </div>
                                <span className="text-[8px] font-black text-green-500">+{formatMoney(child.salary || 0)}</span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-600 italic">{t('family.noManagedProperty')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
  );
}

const styles = `
@keyframes bounce-slow {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -5px); }
}

.animate-bounce-slow {
  animation: bounce-slow 3s ease-in-out infinite;
}

.dir-rtl {
  direction: rtl;
}
`;

if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}

