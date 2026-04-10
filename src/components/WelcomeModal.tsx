import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Users, Wallet, Building2, Map as MapIcon, BookOpen, X, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function WelcomeModal() {
  const { t } = useTranslation();
  const { profile, setWelcomeMessageSeen } = useAuthStore();

  if (!profile || profile.welcomeMessageSeen) return null;

  const steps = [
    {
      icon: <Shield className="text-red-500" />,
      title: t('welcome.step1.title') || 'مرحباً بك في عالم الجريمة',
      desc: t('welcome.step1.desc') || 'أنت الآن جزء من أخطر شبكة إجرامية. هدفك هو تسلق الرتب وتصبح الزعيم النهائي.'
    },
    {
      icon: <Target className="text-emerald-500" />,
      title: t('welcome.step2.title') || 'الجرائم والسطو',
      desc: t('welcome.step2.desc') || 'ابدأ بسرقات صغيرة لكسب السمعة والمال. كلما زادت قوتك، انضم إلى عمليات السطو مع لاعبين آخرين للحصول على مكافآت ضخمة.'
    },
    {
      icon: <Building2 className="text-blue-500" />,
      title: t('welcome.step3.title') || 'العقارات والأعمال',
      desc: t('welcome.step3.desc') || 'استثمر أموالك في أعمال مشروعة. اشترِ العقارات، وابنِ المصانع، وقم بتبييض أموالك لتبقى متقدماً على القانون.'
    },
    {
      icon: <Users className="text-purple-500" />,
      title: t('welcome.step4.title') || 'العصابات والعائلات',
      desc: t('welcome.step4.desc') || 'لا تمشِ وحيداً. انضم إلى عصابة أو ابدأ عصابتك الخاصة. ابنِ عائلة لتأمين إرثك وتوسيع نفوذك عبر المدن.'
    },
    {
      icon: <MapIcon className="text-amber-500" />,
      title: t('welcome.step5.title') || 'السيطرة العالمية',
      desc: t('welcome.step5.desc') || 'سافر بين مدن مثل بغداد ودبي والقاهرة. تقدم كل مدينة فرصاً وتحديات فريدة.'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
        >
          {/* Left Side - Visual */}
          <div className="md:w-1/3 bg-gradient-to-br from-red-900 to-black p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
              <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/mafia/800/1200')] bg-cover bg-center mix-blend-overlay"></div>
            </div>
            
            <div className="relative z-10">
              <Shield size={48} className="text-red-500 mb-4" />
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                {t('welcome.title') || 'ميثاق الصمت'}
              </h2>
            </div>
            
            <div className="relative z-10">
              <p className="text-red-500 font-bold uppercase tracking-widest text-xs mb-2">تأسست عام 2024</p>
              <p className="text-zinc-400 text-sm italic">"الاحترام يُكتسب، ولا يُعطى."</p>
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="flex-1 p-8 md:p-12 flex flex-col h-[80vh] md:h-auto overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
                  {t('welcome.subtitle') || 'البداية'}
                </h3>
                <p className="text-zinc-500 text-sm">
                  {t('welcome.instruction') || 'اتبع هذه الخطوات لتبدأ رحلتك في عالم الجريمة.'}
                </p>
              </div>
              <button 
                onClick={setWelcomeMessageSeen}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {steps.map((step, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4 group"
                >
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                      {step.title}
                    </h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Wallet className="text-emerald-500" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('welcome.startingBalance') || 'رصيد البداية'}</p>
                  <p className="text-lg font-bold text-emerald-500">50,000,000 $</p>
                </div>
              </div>
              
              <button 
                onClick={setWelcomeMessageSeen}
                className="w-full sm:w-auto px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <BookOpen size={20} />
                {t('welcome.startPlaying') || 'ابدأ رحلتي'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
