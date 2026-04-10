import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Activity, AlertTriangle, RefreshCw } from 'lucide-react';

interface ServerStatusGuardProps {
  children: React.ReactNode;
}

export default function ServerStatusGuard({ children }: ServerStatusGuardProps) {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('server_status_skipped') === 'true';
    }
    return false;
  });
  const [retryCount, setRetryCount] = useState(0);
  const [showSkip, setShowSkip] = useState(true);

  const handleSkip = () => {
    sessionStorage.setItem('server_status_skipped', 'true');
    setIsReady(true);
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        // Use relative path for better reliability
        const res = await fetch('/api/health', { 
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' }
        });
        const text = await res.text();
        
        const trimmedText = text.trim().toLowerCase();
        const isHtml = trimmedText.startsWith('<!doctype html>') || 
                       trimmedText.startsWith('<html') ||
                       trimmedText.includes('<head>') ||
                       trimmedText.includes('<body>');
        
        if (res.ok && !isHtml) {
          if (mounted) {
            setIsReady(true);
          }
        } else {
          throw new Error('Server not ready');
        }
      } catch (err) {
        if (mounted) {
          setRetryCount(prev => prev + 1);
          timeoutId = setTimeout(checkStatus, 3000);
        }
      }
    };

    if (!isReady) {
      checkStatus();
    }

    return () => { 
      mounted = false; 
      clearTimeout(timeoutId);
    };
  }, [isReady]); // Empty dependency array to prevent double-calling

  if (!isReady) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex items-center justify-center p-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05),transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600/50 to-transparent animate-pulse" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full text-center space-y-8"
        >
          {/* Logo/Icon Section */}
          <div className="relative inline-block">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 bg-red-600/10 border border-red-600/20 rounded-[2rem] flex items-center justify-center text-red-600 shadow-[0_0_50px_rgba(220,38,38,0.1)]"
            >
              <Shield size={48} strokeWidth={1.5} />
            </motion.div>
            <motion.div 
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-amber-500"
            >
              <Activity size={16} />
            </motion.div>
          </div>

          {/* Text Content */}
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
              جاري الاتصال بالخوادم الحكومية
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">
              يرجى الانتظار بينما نقوم بتأمين اتصالك المشفر مع وزارة الداخلية...
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 30, ease: "linear" }}
                className="h-full bg-gradient-to-r from-red-600 to-amber-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              />
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <div className="flex items-center gap-2">
                <RefreshCw size={10} className="animate-spin" />
                <span>المحاولة رقم {retryCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-600 animate-ping" />
                <span>حالة النظام: قيد التشغيل</span>
              </div>
            </div>
          </div>

          {/* Skip Button */}
          <AnimatePresence>
            {showSkip && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSkip}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)] border border-red-500/50"
              >
                تجاوز الانتظار والدخول المباشر
              </motion.button>
            )}
          </AnimatePresence>

          {/* Footer Note */}
          <div className="pt-8 border-t border-white/5">
            <div className="flex items-center justify-center gap-2 text-zinc-700 text-[9px] font-black uppercase tracking-[0.3em]">
              <AlertTriangle size={12} />
              <span>تنبيه: لا تقم بإغلاق الصفحة لتجنب فقدان البيانات</span>
            </div>
          </div>
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 p-8 opacity-10">
          <div className="text-[120px] font-black text-white leading-none select-none">MAFIA</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
