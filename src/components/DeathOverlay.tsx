import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Skull, Crosshair, Ghost, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface DeathOverlayProps {
  killedBy: string | null;
}

export default function DeathOverlay({ killedBy }: DeathOverlayProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden flex items-center justify-center">
      {/* Background Blood Splatters */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/40 blur-[100px] rounded-full" />
        
        {/* Simulated Blood Drips */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: Math.random() * 300 + 100 }}
            transition={{ duration: 2, delay: i * 0.2 }}
            className="absolute top-0 bg-gradient-to-b from-red-900 to-transparent w-1 opacity-60"
            style={{ left: `${i * 11}%` }}
          />
        ))}
      </div>

      {/* Bullet Holes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={{ delay: 0.5 + i * 0.3 }}
            className="absolute"
            style={{ 
              top: `${Math.random() * 80 + 10}%`, 
              left: `${Math.random() * 80 + 10}%` 
            }}
          >
            <div className="w-8 h-8 bg-zinc-800 rounded-full border-4 border-zinc-900 flex items-center justify-center">
              <div className="w-2 h-2 bg-black rounded-full" />
            </div>
            <div className="absolute inset-0 bg-red-900/20 blur-md rounded-full" />
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-md p-8 text-center space-y-8"
      >
        <motion.div
          animate={{ 
            rotate: [0, -5, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="inline-block"
        >
          <div className="relative">
            <Skull size={120} className="text-red-600 mx-auto drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]" />
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Crosshair size={140} className="text-red-500/30" />
            </motion.div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">
            تمت تصفيتك!
          </h1>
          
          <div className="bg-red-950/30 border border-red-900/50 p-6 rounded-2xl backdrop-blur-sm">
            <p className="text-zinc-400 text-sm uppercase tracking-widest mb-2 font-bold">بواسطة القاتل</p>
            <p className="text-3xl font-black text-red-500">{killedBy || 'مجهول'}</p>
          </div>

          <p className="text-zinc-500 font-medium leading-relaxed">
            لقد سقطت في المعركة. تم نقلك الآن إلى المقبرة لتلقي العلاج والتعافي.
          </p>
        </div>

        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/hospital')}
            className="w-full py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xl transition-all shadow-[0_10px_30px_rgba(220,38,38,0.4)] flex items-center justify-center gap-3 group"
          >
            <Ghost size={28} className="group-hover:animate-bounce" />
            الذهاب إلى المقبرة
          </motion.button>
          
          <div className="flex items-center justify-center gap-2 text-zinc-600">
            <AlertTriangle size={16} />
            <p className="text-xs uppercase tracking-widest font-bold">
              سيتم شفاؤك بنسبة 100% خلال ساعة واحدة
            </p>
          </div>
        </div>
      </motion.div>

      {/* Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,1)]" />
    </div>
  );
}
