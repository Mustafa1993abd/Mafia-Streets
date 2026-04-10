import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, safeFetch, safeToDate } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, runTransaction, increment, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Target, Skull, Trash2, Search, Plus, User, DollarSign, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Bounty {
  id: string;
  targetId: string;
  targetName: string;
  bountyAmount: number;
  posterId: string;
  posterName: string;
  timestamp: any;
}

export default function Bounties() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [amount, setAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'bounties'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bounty[];
      setBounties(data.sort((a, b) => b.bountyAmount - a.bountyAmount));
    }, (error) => {
      console.error('Bounties listener error:', error);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  // Client-side search for users
  useEffect(() => {
    if (!searchTerm.trim() || !showCreateModal) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const qStr = searchTerm.trim();
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
              displayName: data.displayName || t('common.unknown'),
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
  }, [searchTerm, showCreateModal, profile?.uid]);

  const handleCreateBounty = async () => {
    console.log('handleCreateBounty called', { profile, selectedTarget, amount });
    if (!profile) {
      toast.error(t('errors.notLoggedIn'));
      return;
    }
    if (!selectedTarget) {
      toast.error(t('bounties.selectTarget'));
      return;
    }
    if (selectedTarget.id === profile.uid) {
      toast.error(t('bounties.cannotBountySelf'));
      return;
    }
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum < 10000) {
      toast.error(t('bounties.minAmount'));
      return;
    }
    if ((profile.cleanMoney || 0) < amountNum) {
      toast.error(t('common.noMoney'));
      return;
    }

    try {
      console.log('Attempting transaction');
      const userRef = doc(db, 'users', profile.uid);
      const bountyRef = doc(collection(db, 'bounties'));

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || (userDoc.data().cleanMoney || 0) < amountNum) {
          throw new Error('Insufficient funds');
        }

        transaction.update(userRef, {
          cleanMoney: increment(-amountNum)
        });

        transaction.set(bountyRef, {
          targetId: selectedTarget.id,
          targetName: selectedTarget.displayName,
          bountyAmount: amountNum,
          posterId: profile.uid,
          posterName: profile.displayName,
          timestamp: serverTimestamp()
        });
      });

      console.log('Transaction successful');
      toast.success(t('common.success'));
      setAmount('');
      setSelectedTarget(null);
      setSearchTerm('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error(t('common.failed'));
    }
  };

  const handleDeleteBounty = async (bountyId: string, bountyAmount: number) => {
    try {
      const userRef = doc(db, 'users', profile!.uid);
      const bountyRef = doc(db, 'bounties', bountyId);

      await runTransaction(db, async (transaction) => {
        const bountyDoc = await transaction.get(bountyRef);
        if (!bountyDoc.exists() || bountyDoc.data().posterId !== profile!.uid) {
          throw new Error('Unauthorized');
        }

        transaction.update(userRef, {
          cleanMoney: increment(bountyAmount)
        });

        transaction.delete(bountyRef);
      });

      toast.success(t('common.success'));
    } catch (error) {
      console.error(error);
      toast.error(t('common.failed'));
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{t('bounties.title')}</h1>
            <p className="text-zinc-500 text-sm">{t('bounties.desc')}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20"
        >
          <Plus size={20} />
          {t('bounties.createBounty')}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {bounties.map((bounty, index) => (
            <motion.div 
              key={bounty.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-red-500/50 transition-all flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-600/10 rounded-lg text-red-500">
                    <Target size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {safeToDate(bounty.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-xl font-black text-white mb-1 player-name-script">{bounty.targetName}</h3>
                <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
                  <User size={14} />
                  <span>{t('bounties.postedBy')}: <span className="player-name-script">{bounty.posterName}</span></span>
                </div>

                <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{t('bounties.bounty')}</p>
                  <p className="text-2xl font-black text-green-500">{formatMoney(bounty.bountyAmount)}</p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex items-center gap-2">
                <Link 
                  to={`/attack/${bounty.targetId}`} 
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <Skull size={14} />
                  {t('crimes.attack')}
                </Link>
                {profile?.uid === bounty.posterId && (
                  <button 
                    onClick={() => handleDeleteBounty(bounty.id, bounty.bountyAmount)} 
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {bounties.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-800">
            <div className="inline-flex p-4 bg-zinc-800/50 rounded-full text-zinc-600 mb-4">
              <Target size={48} />
            </div>
            <h3 className="text-xl font-bold text-zinc-400 mb-2">{t('bounties.noBounties')}</h3>
          </div>
        )}
      </div>

      {/* Create Bounty Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-white uppercase">{t('bounties.createBounty')}</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      {t('bounties.targetName')}
                    </label>
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          if (selectedTarget) setSelectedTarget(null);
                        }}
                        placeholder={t('bounties.search')}
                        className="w-full bg-black border border-zinc-800 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    
                    {/* Search Results */}
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {isSearching && <div className="text-center py-2 text-xs text-zinc-500">{t('common.searching')}</div>}
                      {searchResults.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedTarget(user);
                            setSearchTerm(user.displayName);
                            setSearchResults([]);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            selectedTarget?.id === user.id ? 'bg-red-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                            <img src={user.photoURL || `https://picsum.photos/seed/${user.id}/32/32`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-bold">{user.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      {t('bounties.amount')}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={t('bounties.minAmountPlaceholder')}
                        className="w-full bg-black border border-zinc-800 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCreateBounty}
                    disabled={!selectedTarget || !amount}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 mt-4"
                  >
                    {t('bounties.placeBounty')}
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
