import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, User, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

interface GiftData {
  id: string;
  senderName: string;
  itemName: string;
  itemImage: string;
  timestamp: any;
}

const GiftNotification = () => {
  const { profile } = useAuthStore();
  const [giftQueue, setGiftQueue] = useState<GiftData[]>([]);
  const [currentGift, setCurrentGift] = useState<GiftData | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'gift_notifications'),
      where('recipientId', '==', profile.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newGifts: GiftData[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          newGifts.push({ id: change.doc.id, ...change.doc.data() } as GiftData);
        }
      });
      
      if (newGifts.length > 0) {
        setGiftQueue(prev => [...prev, ...newGifts]);
      }
    }, (error) => {
      console.error('Gift notification listener error:', error);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  useEffect(() => {
    if (!currentGift && giftQueue.length > 0) {
      setCurrentGift(giftQueue[0]);
      setGiftQueue(prev => prev.slice(1));
    }
  }, [giftQueue, currentGift]);

  useEffect(() => {
    if (currentGift) {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentGift]);

  const handleClose = async () => {
    if (!currentGift) return;
    try {
      await deleteDoc(doc(db, 'gift_notifications', currentGift.id));
      setCurrentGift(null);
    } catch (error) {
      console.error('Error deleting gift notification:', error);
      setCurrentGift(null);
    }
  };

  return (
    <AnimatePresence>
      {currentGift && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full px-4">
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 overflow-hidden">
                    {currentGift.itemImage ? (
                      <img src={currentGift.itemImage} alt={currentGift.itemName} className="w-8 h-8 object-contain drop-shadow-md" />
                    ) : (
                      <Gift className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-bold text-white">
                    هدية جديدة من {currentGift.senderName}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    لقد تلقيت {currentGift.itemName}!
                  </p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex rounded-full bg-white/10 p-1.5 text-white/50 hover:text-white hover:bg-white/20 focus:outline-none transition-colors"
                    onClick={handleClose}
                  >
                    <span className="sr-only">إغلاق</span>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GiftNotification;
