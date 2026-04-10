import React, { useState, useEffect } from 'react';
import { useAuthStore, VisaType } from '../store/useAuthStore';
import { doc, updateDoc, collection, query, where, getDocs, limit, increment, runTransaction, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Landmark, ArrowRightLeft, CreditCard, ShieldCheck, Zap, Crown, Info, ChevronRight, Search, User, Check, History, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, safeFetch, safeToDate } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const VISA_TIERS: { type: VisaType; price: number; color: string; bg: string; icon: any; benefits: string[] }[] = [
  { 
    type: 'Classic', 
    price: 10000, 
    color: 'text-zinc-400', 
    bg: 'from-zinc-800 to-zinc-950',
    icon: CreditCard,
    benefits: ['bank.visa.classic.b1', 'bank.visa.classic.b2']
  },
  { 
    type: 'Platinum', 
    price: 50000, 
    color: 'text-zinc-300', 
    bg: 'from-zinc-700 via-zinc-800 to-zinc-900',
    icon: ShieldCheck,
    benefits: ['bank.visa.platinum.b1', 'bank.visa.platinum.b2', 'bank.visa.platinum.b3']
  },
  { 
    type: 'Signature', 
    price: 250000, 
    color: 'text-blue-400', 
    bg: 'from-blue-900/40 via-zinc-900 to-black',
    icon: Zap,
    benefits: ['bank.visa.signature.b1', 'bank.visa.signature.b2', 'bank.visa.signature.b3', 'bank.visa.signature.b4']
  },
  { 
    type: 'Infinite', 
    price: 1000000, 
    color: 'text-amber-500', 
    bg: 'from-amber-900/40 via-zinc-900 to-black',
    icon: Crown,
    benefits: ['bank.visa.infinite.b1', 'bank.visa.infinite.b2', 'bank.visa.infinite.b3', 'bank.visa.infinite.b4', 'bank.visa.infinite.b5']
  },
];

export default function Bank() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [investAmount, setInvestAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferType, setTransferType] = useState<'clean' | 'dirty'>('clean');
  const [searchResults, setSearchResults] = useState<{ id: string, displayName: string, photoURL?: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dirtyVaultAmount, setDirtyVaultAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState<typeof VISA_TIERS[0] | null>(null);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);

  const investment = profile?.investments || { amount: 0, lastClaimed: Date.now() };
  const daysPassed = Math.max(0, (Date.now() - investment.lastClaimed) / (1000 * 60 * 60 * 24));
  const pendingReturns = Math.floor(investment.amount * 0.01 * daysPassed);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'transfer_history'),
      where('senderId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransferHistory(history);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transfer_history');
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  // Client-side search for users
  useEffect(() => {
    if (!transferTarget.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const qStr = transferTarget.trim();
        const usersRef = collection(db, 'users_public');
        
        const queryStrings = new Set<string>();
        queryStrings.add(qStr);
        queryStrings.add(qStr.toLowerCase());
        queryStrings.add(qStr.toUpperCase());
        queryStrings.add(qStr.charAt(0).toUpperCase() + qStr.slice(1).toLowerCase());

        const snapshots = await Promise.all(
          Array.from(queryStrings).map(qs => 
            getDocs(query(usersRef, where('displayName', '>=', qs), where('displayName', '<=', qs + '\uf8ff'), limit(10)))
          )
        );

        const resultsMap = new Map();
        snapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            resultsMap.set(doc.id, {
              id: doc.id,
              displayName: data.displayName || 'Unknown',
              photoURL: data.photoURL || null
            });
          });
        });
        
        const results = Array.from(resultsMap.values()).slice(0, 10);
        setSearchResults(results.filter((u: any) => u.id !== profile?.uid));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [transferTarget, profile?.uid]);

  const handleTransaction = async (type: 'deposit' | 'withdraw') => {
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) {
      toast.error(t('common.invalidAmount'));
      return;
    }

    if (!profile) return;

    if (type === 'deposit' && profile.cleanMoney < val) {
      toast.error(t('common.noMoney'));
      return;
    }

    if (type === 'withdraw' && (profile.bankBalance || 0) < val) {
      toast.error(t('bank.noBalance'));
      return;
    }

    setIsProcessing(true);
    try {
      const newClean = type === 'deposit' ? profile.cleanMoney - val : profile.cleanMoney + val;
      const newBank = type === 'deposit' ? (profile.bankBalance || 0) + val : (profile.bankBalance || 0) - val;

      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: newClean,
        bankBalance: newBank
      });
      
      toast.success(t('common.success'));
      setAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirtyVaultTransaction = async (type: 'deposit' | 'withdraw') => {
    const val = parseInt(dirtyVaultAmount);
    if (isNaN(val) || val <= 0) {
      toast.error(t('common.invalidAmount'));
      return;
    }

    if (!profile) return;

    // Check Visa capacity
    let capacity = 0;
    if (profile.visaCard) {
      const { type } = profile.visaCard;
      if (type === 'Platinum') capacity = 100000;
      if (type === 'Signature') capacity = 500000;
      if (type === 'Infinite') capacity = 2000000;
    }

    if (capacity === 0) {
      toast.error(t('bank.platinumRequired'));
      return;
    }

    const currentDirtyVault = profile.dirtyVaultBalance || 0;

    if (type === 'deposit') {
      if (profile.dirtyMoney < val) {
        toast.error(t('common.noDirtyMoney'));
        return;
      }
      if (currentDirtyVault + val > capacity) {
        toast.error(t('bank.vaultCapacityExceeded', { capacity: formatNumber(capacity) }));
        return;
      }
    }

    if (type === 'withdraw' && currentDirtyVault < val) {
      toast.error(t('bank.insufficientVaultBalance'));
      return;
    }

    setIsProcessing(true);
    try {
      const newDirty = type === 'deposit' ? profile.dirtyMoney - val : profile.dirtyMoney + val;
      const newDirtyVault = type === 'deposit' ? currentDirtyVault + val : currentDirtyVault - val;

      await updateDoc(doc(db, 'users', profile.uid), {
        dirtyMoney: newDirty,
        dirtyVaultBalance: newDirtyVault
      });
      
      toast.success(t('common.success'));
      setDirtyVaultAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransfer = async () => {
    if (!profile || !transferAmount || !transferTargetId) return;
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('common.invalidAmount'));
      return;
    }

    const senderBalance = transferType === 'clean' ? profile.bankBalance : profile.dirtyMoney;
    if (senderBalance < amount) {
      toast.error(transferType === 'clean' ? t('bank.noBalance') : t('common.noDirtyMoney'));
      return;
    }

    if (transferTargetId === profile.uid) {
      toast.error(t('common.failed'));
      return;
    }

    if (!profile.visaCard || profile.visaCard.type !== 'Infinite') {
      toast.error(t('bank.infiniteRequired'));
      return;
    }

    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, 'users', profile.uid);
        const receiverRef = doc(db, 'users', transferTargetId);
        const receiverDoc = await transaction.get(receiverRef);

        if (!receiverDoc.exists()) {
          throw new Error('Target player not found');
        }

        if (transferType === 'clean') {
          transaction.update(senderRef, { bankBalance: increment(-amount) });
          transaction.update(receiverRef, { bankBalance: increment(amount) });
        } else {
          transaction.update(senderRef, { dirtyMoney: increment(-amount) });
          transaction.update(receiverRef, { dirtyMoney: increment(amount) });
        }

        // Log transfer history
        const historyRef = doc(collection(db, 'transfer_history'));
        transaction.set(historyRef, {
          senderId: profile.uid,
          senderName: profile.displayName,
          receiverId: transferTargetId,
          receiverName: transferTarget,
          amount: amount,
          moneyType: transferType,
          timestamp: serverTimestamp()
        });

        // Send message to receiver
        const messageRef = doc(collection(db, 'messages'));
        transaction.set(messageRef, {
          senderId: 'system',
          senderName: 'Mafia Bank',
          receiverId: transferTargetId,
          content: t('bank.transferNotification', { 
            amount: formatMoney(amount), 
            type: transferType === 'clean' ? t('bank.currentClean') : t('bank.dirtyMoney'),
            sender: profile.displayName 
          }),
          type: 'system',
          read: false,
          timestamp: serverTimestamp(),
          subject: t('bank.internationalTransfer')
        });
      });

      toast.success(t('bank.transferSuccess', { amount: formatNumber(amount), target: transferTarget }));
      setTransferAmount('');
      setTransferTarget('');
      setTransferTargetId('');
      setSearchResults([]);
    } catch (error: any) {
      if (error.message === 'Target player not found') {
        toast.error(t('bank.targetNotFound'));
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
        toast.error(t('common.failed'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInvestTransaction = async (type: 'invest' | 'withdraw') => {
    const val = parseInt(investAmount);
    if (isNaN(val) || val <= 0) {
      toast.error(t('common.invalidAmount'));
      return;
    }

    if (!profile) return;

    if (type === 'invest' && profile.cleanMoney < val) {
      toast.error(t('common.noMoney'));
      return;
    }

    if (type === 'withdraw' && investment.amount < val) {
      toast.error(t('bank.noInvestBalance'));
      return;
    }

    setIsProcessing(true);
    try {
      const newClean = type === 'invest' 
        ? profile.cleanMoney - val + pendingReturns 
        : profile.cleanMoney + val + pendingReturns;
        
      const newInvestAmount = type === 'invest' 
        ? investment.amount + val 
        : investment.amount - val;

      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: newClean,
        investments: {
          amount: newInvestAmount,
          lastClaimed: Date.now()
        }
      });
      
      toast.success(t('common.success'));
      setInvestAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimReturns = async () => {
    if (!profile || pendingReturns <= 0) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney + pendingReturns,
        investments: {
          amount: investment.amount,
          lastClaimed: Date.now()
        }
      });
      
      toast.success(t('bank.claimSuccess', { amount: pendingReturns }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeVisa = async (tier: typeof VISA_TIERS[0]) => {
    if (!profile) return;
    if (profile.cleanMoney < tier.price) {
      toast.error(t('common.noMoney'));
      return;
    }

    setIsProcessing(true);
    try {
      const cardNumber = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('').replace(/(.{4})/g, '$1 ').trim();
      
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney - tier.price,
        visaCard: {
          type: tier.type,
          number: cardNumber,
          issuedAt: Date.now()
        }
      });
      
      toast.success(t('bank.visa.upgradeSuccess', { tier: tier.type }));
      setSelectedVisa(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error(t('common.failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="text-white space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-green-500/10 text-green-500 rounded-xl mafia-glow">
          <Landmark size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('bank.title')}</h2>
          <p className="text-zinc-400">{t('bank.desc')}</p>
        </div>
      </div>

      {/* Visa Card Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <CreditCard className="text-green-500" />
            {t('bank.visa.title')}
          </h3>

          {profile?.visaCard ? (
            <div className="relative group">
              <VisaCardUI 
                type={profile.visaCard.type} 
                number={profile.visaCard.number} 
                name={profile.displayName} 
                balance={profile.bankBalance || 0}
              />
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {VISA_TIERS.map((tier) => {
                  const isCurrent = profile.visaCard?.type === tier.type;
                  const currentTierIndex = VISA_TIERS.findIndex(t => t.type === profile.visaCard?.type);
                  const thisTierIndex = VISA_TIERS.findIndex(t => t.type === tier.type);
                  const isUpgrade = thisTierIndex > currentTierIndex;

                  if (!isUpgrade && !isCurrent) return null;

                  return (
                    <button
                      key={tier.type}
                      onClick={() => isUpgrade && setSelectedVisa(tier)}
                      disabled={isCurrent || !isUpgrade}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-green-600/10 border-green-600/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className="flex items-center gap-3">
                        <tier.icon className={tier.color} size={20} />
                        <div className="text-start">
                          <div className="font-black uppercase text-xs tracking-widest">{t(`bank.visa.${tier.type.toLowerCase()}.name`)}</div>
                          <div className="text-[10px] text-zinc-500">{isCurrent ? t('police.owned') : formatMoney(tier.price)}</div>
                        </div>
                      </div>
                      {isUpgrade && <ChevronRight size={18} className="text-zinc-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
                <CreditCard size={40} />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">{t('bank.visa.noCard')}</h4>
                <p className="text-zinc-500 max-w-md mx-auto">{t('bank.visa.noCardDesc')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {VISA_TIERS.map((tier) => (
                  <button
                    key={tier.type}
                    onClick={() => setSelectedVisa(tier)}
                    className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-green-600/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <tier.icon className={tier.color} size={20} />
                      <div className="text-start">
                        <div className="font-black uppercase text-xs tracking-widest">{tier.type}</div>
                        <div className="text-[10px] text-zinc-500">{formatMoney(tier.price)}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600 group-hover:text-green-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Landmark className="text-green-500" />
            {t('bank.vault')}
          </h3>
          
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('bank.currentClean')}</span>
                <span className="text-green-500 font-black text-lg">{formatMoney(profile?.cleanMoney || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('bank.bankBalance')}</span>
                <span className="text-blue-500 font-black text-lg">{formatMoney(profile?.bankBalance || 0)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('bank.amountPlaceholder')}
                  className="w-full bg-black/50 border border-zinc-800 rounded-2xl ps-8 pe-4 py-4 text-white focus:outline-none focus:border-green-600 transition-colors font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleTransaction('deposit')}
                  disabled={isProcessing || !amount}
                  className="mafia-button-primary py-4"
                >
                  {t('bank.deposit')}
                </button>
                <button 
                  onClick={() => handleTransaction('withdraw')}
                  disabled={isProcessing || !amount}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  {t('bank.withdraw')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight">{t('bank.invest')}</h3>
              <ArrowRightLeft className="text-zinc-500" size={20} />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('bank.investedAmount')}</span>
                <span className="text-blue-500 font-black text-lg">{formatMoney(investment.amount)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('bank.pendingReturns')}</span>
                <span className="text-green-500 font-black text-lg">{formatMoney(pendingReturns)}</span>
              </div>
              {pendingReturns > 0 && (
                <button 
                  onClick={handleClaimReturns}
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all mafia-glow"
                >
                  {t('bank.claimReturns')}
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input 
                  type="number" 
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder={t('bank.amountPlaceholder')}
                  className="w-full bg-black/50 border border-zinc-800 rounded-2xl ps-8 pe-4 py-4 text-white focus:outline-none focus:border-purple-600 transition-colors font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleInvestTransaction('invest')}
                  disabled={isProcessing || !investAmount}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  {t('bank.investBtn')}
                </button>
                <button 
                  onClick={() => handleInvestTransaction('withdraw')}
                  disabled={isProcessing || !investAmount}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  {t('bank.withdraw')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="text-amber-500" size={20} />
                {t('bank.hiddenVault')}
              </h3>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {profile?.visaCard ? t(`bank.visa.${profile.visaCard.type.toLowerCase()}.name`) : t('bank.visa.noCard')}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('bank.dirtyMoney')}</span>
                <span className="text-red-500 font-black text-lg">{formatMoney(profile?.dirtyMoney || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('bank.hiddenVaultBalance')}</span>
                <span className="text-amber-500 font-black text-lg">{formatMoney(profile?.dirtyVaultBalance || 0)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input 
                  type="number" 
                  value={dirtyVaultAmount}
                  onChange={(e) => setDirtyVaultAmount(e.target.value)}
                  placeholder={t('bank.amountPlaceholder')}
                  className="w-full bg-black/50 border border-zinc-800 rounded-2xl ps-8 pe-4 py-4 text-white focus:outline-none focus:border-amber-600 transition-colors font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleDirtyVaultTransaction('deposit')}
                  disabled={isProcessing || !dirtyVaultAmount}
                  className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  {t('bank.deposit')}
                </button>
                <button 
                  onClick={() => handleDirtyVaultTransaction('withdraw')}
                  disabled={isProcessing || !dirtyVaultAmount}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  {t('bank.withdraw')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="text-blue-500" size={20} />
                {t('bank.internationalTransfer')}
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-zinc-800/50">
                <button
                  onClick={() => setTransferType('clean')}
                  className={`py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${transferType === 'clean' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t('bank.currentClean')}
                </button>
                <button
                  onClick={() => setTransferType('dirty')}
                  className={`py-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${transferType === 'dirty' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t('bank.dirtyMoney')}
                </button>
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ms-2">{t('bank.transferTarget')}</label>
                <div className="relative">
                  <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    value={transferTarget}
                    onChange={(e) => {
                      setTransferTarget(e.target.value);
                      if (transferTargetId) setTransferTargetId('');
                    }}
                    placeholder={t('bank.targetPlaceholder')}
                    className="w-full bg-black/50 border border-zinc-800 rounded-2xl ps-12 pe-4 py-4 text-white focus:outline-none focus:border-blue-600 transition-colors font-bold"
                  />
                  {isSearching && (
                    <div className="absolute end-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchResults.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => {
                          setTransferTarget(player.displayName);
                          setTransferTargetId(player.id);
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-start group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-blue-600/20 group-hover:text-blue-500 transition-colors">
                            <User size={16} />
                          </div>
                          <span className="font-bold">{player.displayName}</span>
                        </div>
                        {transferTargetId === player.id && <Check size={16} className="text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ms-2">{t('bank.transferAmount')}</label>
                <div className="relative">
                  <span className="absolute start-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input 
                    type="number" 
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder={t('bank.amountPlaceholder')}
                    className="w-full bg-black/50 border border-zinc-800 rounded-2xl ps-8 pe-4 py-4 text-white focus:outline-none focus:border-blue-600 transition-colors font-bold"
                  />
                </div>
              </div>
              <button 
                onClick={handleTransfer}
                disabled={isProcessing || !transferAmount || !transferTargetId}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
              >
                {t('bank.transferBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer History Section */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <History className="text-blue-500" />
            {t('bank.transferHistory')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <th className="px-6 py-4 text-start">{t('bank.historyTarget')}</th>
                <th className="px-6 py-4 text-start">{t('bank.historyAmount')}</th>
                <th className="px-6 py-4 text-start">{t('bank.historyType')}</th>
                <th className="px-6 py-4 text-start">{t('bank.historyDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {transferHistory.length > 0 ? (
                transferHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <User size={16} />
                        </div>
                        <span className="font-bold text-sm">{log.receiverName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-black text-sm ${log.moneyType === 'clean' ? 'text-green-500' : 'text-red-500'}`}>
                        {formatMoney(log.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${log.moneyType === 'clean' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {log.moneyType === 'clean' ? t('bank.currentClean') : t('bank.dirtyMoney')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Clock size={12} />
                        {(() => {
                          try {
                            const d = safeToDate(log.timestamp);
                            return formatDistanceToNow(d, { 
                              addSuffix: true,
                              locale: i18n.language === 'ar' ? ar : enUS
                            });
                          } catch (e) {
                            return '...';
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                    {t('bank.noHistory')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visa Upgrade Modal */}
      <AnimatePresence>
        {selectedVisa && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">{t('bank.visa.upgradeTitle', { tier: selectedVisa.type })}</h3>
                <button 
                  onClick={() => setSelectedVisa(null)}
                  className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <ArrowRightLeft className="rotate-45" size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center bg-zinc-800 border border-zinc-700 ${selectedVisa.color} mafia-glow`}>
                    <selectedVisa.icon size={40} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black uppercase tracking-tighter">{t(`bank.visa.${selectedVisa.type.toLowerCase()}.name`)}</h4>
                    <p className="text-zinc-500 text-sm">{t(`bank.visa.${selectedVisa.type.toLowerCase()}.desc`)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('bank.visa.benefits')}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedVisa.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-zinc-800/50">
                        <div className="w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center text-green-500">
                          <Zap size={12} />
                        </div>
                        <span className="text-xs font-bold text-zinc-300">{t(benefit)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('bank.visa.price')}</div>
                    <div className="text-2xl font-black text-green-500">{formatMoney(selectedVisa.price)}</div>
                  </div>
                  <button
                    onClick={() => handleUpgradeVisa(selectedVisa)}
                    disabled={isProcessing}
                    className="mafia-button-primary py-4 px-12"
                  >
                    {t('bank.visa.upgradeBtn')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VisaCardUI({ type, number, name, balance }: { type: VisaType; number: string; name: string; balance: number }) {
  const { t } = useTranslation();
  const tier = VISA_TIERS.find(t => t.type === type) || VISA_TIERS[0];
  const Icon = tier.icon;

  return (
    <motion.div 
      initial={{ rotateY: -10, rotateX: 5 }}
      whileHover={{ rotateY: 0, rotateX: 0 }}
      className={`relative w-full aspect-[1.586/1] max-w-[450px] mx-auto rounded-[24px] p-8 text-white shadow-2xl overflow-hidden border border-white/10 bg-gradient-to-br ${tier.bg} mafia-glow`}
    >
      {/* Background Patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 end-0 w-64 h-64 bg-white rounded-full blur-[80px] -me-32 -mt-32"></div>
        <div className="absolute bottom-0 start-0 w-48 h-48 bg-black rounded-full blur-[60px] -ms-24 -mb-24"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      </div>

      <div className="relative h-full flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{t('bank.mafiaBank')}</div>
            <div className={`text-xl font-black uppercase tracking-tighter flex items-center gap-2 ${tier.color}`}>
              <Icon size={24} />
              {t(`bank.visa.${type.toLowerCase()}.name`)}
            </div>
          </div>
          <div className="w-12 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md opacity-80 shadow-inner flex items-center justify-center">
            <div className="w-8 h-6 border border-black/20 rounded-sm"></div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-2xl sm:text-3xl font-mono tracking-[0.2em] drop-shadow-lg">
            {number}
          </div>
          
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-[8px] font-black uppercase tracking-widest opacity-60">{t('bank.cardHolder')}</div>
              <div className="text-sm font-bold uppercase tracking-widest">{name}</div>
            </div>
            <div className="text-end space-y-1">
              <div className="text-[8px] font-black uppercase tracking-widest opacity-60">{t('bank.balance')}</div>
              <div className="text-lg font-black tracking-tighter text-green-400">{formatMoney(balance)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Visa Logo */}
      <div className="absolute bottom-8 end-8 flex flex-col items-end opacity-40">
        <div className="text-2xl font-black italic tracking-tighter leading-none">VISA</div>
        <div className="text-[6px] font-bold uppercase tracking-widest">{t(`bank.visa.${type.toLowerCase()}.name`)}</div>
      </div>
    </motion.div>
  );
}
