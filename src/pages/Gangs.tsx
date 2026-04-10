import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, formatDate } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { doc, onSnapshot, collection, query, getDocs, runTransaction, getDoc, serverTimestamp, updateDoc, increment, limit, orderBy, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { Users, Shield, Swords, Target, UserPlus, Crosshair, UserMinus, Plus, Trash2, Wallet, Package, Check, X, List, Edit3, Bird, Sword, Crown, Skull, Flame, Zap, Anchor, Ghost, TrendingUp, History, Settings, Activity, Clock, ArrowDown, User, AlertTriangle, Trophy, Car, DollarSign, Gift, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MARKET_ITEMS } from '../lib/items';

interface Gang {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  balance: number;
  level: number;
  reputation: number;
  members: string[];
  memberRanks?: Record<string, string>;
  pendingRequests: {
    uid: string;
    displayName: string;
    timestamp: string;
  }[];
  inventory: Record<string, number>;
  nameChangeHistory?: number[];
  createdAt: string;
  symbol: string;
  color: string;
  activityLog?: {
    type: 'deposit_money' | 'withdraw_money' | 'deposit_item' | 'withdraw_item' | 'level_up' | 'join' | 'leave' | 'kick' | 'war' | 'rank_change' | 'give_item' | 'sell_item';
    userId: string;
    userName: string;
    amount?: number;
    itemName?: string;
    targetName?: string;
    rankName?: string;
    timestamp: string;
    details?: string;
    price?: number;
    targetId?: string;
  }[];
  warLogs?: {
    targetGangId: string;
    targetGangName: string;
    result: 'win' | 'loss';
    timestamp: string;
    myFighterName?: string;
    targetFighterName?: string;
    damageToMyFighter?: number;
    damageToTargetFighter?: number;
  }[];
  lastWarTime?: number;
}

const GANG_LEVELS = [
  { level: 1, cost: 0, bonus: 1 },
  { level: 2, cost: 10000000, bonus: 1.2 },
  { level: 3, cost: 50000000, bonus: 1.5 },
  { level: 4, cost: 100000000, bonus: 2 },
  { level: 5, cost: 500000000, bonus: 3 },
];

const GANG_RANKS = [
  { id: 'leader', label: 'الزعيم', icon: Crown, color: 'text-yellow-500' },
  { id: 'underboss', label: 'النائب', icon: Shield, color: 'text-blue-500' },
  { id: 'captain', label: 'كابتن', icon: Sword, color: 'text-red-500' },
  { id: 'soldier', label: 'جندي', icon: Crosshair, color: 'text-zinc-400' },
  { id: 'recruit', label: 'مجند', icon: Users, color: 'text-zinc-600' },
];

const ALL_ITEMS = Object.values(MARKET_ITEMS).flat();

const getItemDetails = (itemId: string) => {
  return ALL_ITEMS.find(item => item.id === itemId);
};

const getItemType = (itemId: string) => {
  for (const [type, items] of Object.entries(MARKET_ITEMS)) {
    if (items.find(i => i.id === itemId)) return type;
  }
  return 'tools';
};

const getItemIcon = (itemId: string) => {
  const type = getItemType(itemId);
  switch (type) {
    case 'weapons': return Sword;
    case 'drugs': return Skull;
    case 'cars': return Car;
    case 'armor': return Shield;
    case 'tools': return Settings;
    default: return Package;
  }
};

  const hasPermission = (role: string | undefined, action: 'manage_members' | 'withdraw_money' | 'withdraw_items' | 'deposit_items' | 'level_up' | 'delete_gang' | 'manage_requests' | 'edit_gang_name' | 'manage_ranks' | 'initiate_war' | 'sell_items' | 'give_items') => {
    if (role === 'leader') return true;
    if (role === 'underboss') {
      return ['manage_members', 'manage_requests', 'withdraw_items', 'deposit_items', 'manage_ranks', 'initiate_war', 'give_items', 'sell_items'].includes(action);
    }
    if (role === 'captain') {
      return ['manage_requests', 'initiate_war', 'deposit_items'].includes(action);
    }
    if (role === 'soldier') {
      return ['deposit_items'].includes(action);
    }
    return false;
  };

const GANG_SYMBOLS = ['Bird', 'Sword', 'Shield', 'Crown', 'Skull', 'Target', 'Flame', 'Zap', 'Anchor', 'Ghost'];
const GANG_COLORS = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-purple-500', 'text-pink-500', 'text-emerald-500', 'text-amber-500', 'text-cyan-500', 'text-rose-500'];

const SYMBOL_MAP: Record<string, any> = {
  Bird: Bird,
  Sword: Sword,
  Shield: Shield,
  Crown: Crown,
  Skull: Skull,
  Target: Target,
  Flame: Flame,
  Zap: Zap,
  Anchor: Anchor,
  Ghost: Ghost,
};

export default function Gangs() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [gang, setGang] = useState<Gang | null>(null);
  const [allGangs, setAllGangs] = useState<Gang[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGangName, setNewGangName] = useState('');
  const [newGangSymbol, setNewGangSymbol] = useState(GANG_SYMBOLS[0]);
  const [newGangColor, setNewGangColor] = useState(GANG_COLORS[0]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'inventory' | 'requests' | 'list' | 'management' | 'wars' | 'activity'>('dashboard');
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [isEditingGangName, setIsEditingGangName] = useState(false);
  const [tempGangName, setTempGangName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (gang && gang.members) {
      const fetchMemberNames = async () => {
        const names: Record<string, string> = {};
        for (const memberId of gang.members) {
          if (memberId === gang.leaderId) {
            names[memberId] = gang.leaderName;
          } else {
            const userDoc = await getDoc(doc(db, 'users_public', memberId));
            if (userDoc.exists()) {
              names[memberId] = userDoc.data().displayName;
            } else {
              names[memberId] = `Member ${memberId.slice(0, 5)}`;
            }
          }
        }
        setMemberNames(names);
      };
      fetchMemberNames();
    }
  }, [gang]);

  useEffect(() => {
    if (!profile?.gangId) {
      setGang(null);
      setActiveTab('list');
      fetchAllGangs();
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'gangs', profile.gangId), (docSnap) => {
      if (docSnap.exists()) {
        setGang(docSnap.data() as Gang);
        setActiveTab('dashboard');
      } else {
        setGang(null);
        setActiveTab('list');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `gangs/${profile.gangId}`);
      setLoading(false);
    });

    fetchAllGangs();
    return () => unsubscribe();
  }, [profile?.gangId]);

  const fetchAllGangs = async () => {
    try {
      const q = query(collection(db, 'gangs'));
      const querySnapshot = await getDocs(q);
      const gangs: Gang[] = [];
      querySnapshot.forEach((doc) => {
        gangs.push(doc.data() as Gang);
      });
      setAllGangs(gangs);
    } catch (error) {
      console.error('Error fetching gangs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetMyGangStatus = async () => {
    if (!profile) return;
    if (!window.confirm('هل أنت متأكد من تصفير بيانات العصابة الخاصة بك؟')) return;

    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.uid);
      const publicRef = doc(db, 'users_public', profile.uid);

      batch.update(userRef, {
        gangId: null,
        gangName: null,
        gangRole: null,
        gangSymbol: null,
        gangColor: null,
        gangMembers: 0
      });

      batch.update(publicRef, {
        gangId: null,
        gangName: null,
        gangRole: null,
        gangSymbol: null,
        gangColor: null
      });

      await batch.commit();
      toast.success('تم تصفير بيانات العصابة الخاصة بك بنجاح');
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const logActivity = async (gangId: string, activity: Omit<Gang['activityLog'][0], 'timestamp'>) => {
    const gangRef = doc(db, 'gangs', gangId);
    try {
      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) return;
        const gangData = gangDoc.data() as Gang;
        const newLog = {
          ...activity,
          timestamp: new Date().toISOString()
        };
        const logs = [newLog, ...(gangData.activityLog || [])].slice(0, 50); // Keep last 50 logs
        transaction.update(gangRef, { activityLog: logs });
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleLevelUp = async () => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'level_up')) return;
    
    const nextLevel = GANG_LEVELS.find(l => l.level === gang.level + 1);
    if (!nextLevel) {
      toast.error(t('gangs.maxLevelReached'));
      return;
    }

    if (gang.balance < nextLevel.cost) {
      toast.error(t('gangs.insufficientGangFunds'));
      return;
    }

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        const gangData = gangDoc.data() as Gang;

        if (gangData.balance < nextLevel.cost) throw new Error(t('gangs.insufficientGangFunds'));

        transaction.update(gangRef, {
          level: nextLevel.level,
          balance: gangData.balance - nextLevel.cost
        });
      });

      await logActivity(gang.id, {
        type: 'level_up',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        amount: nextLevel.cost,
        details: t('gangs.levelUpLog', { level: nextLevel.level })
      });

      toast.success(t('gangs.levelUpSuccess', { level: nextLevel.level }));
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleUpdateMemberRank = async (memberId: string, rankId: string) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'manage_ranks')) return;
    if (memberId === profile.uid) return;

    // Check if the current user has authority over the target member
    const targetCurrentRank = gang.memberRanks?.[memberId] || (memberId === gang.leaderId ? 'leader' : 'recruit');
    const currentUserRank = profile.gangRole || 'recruit';
    
    // Only leader can change ranks of underbosses
    if (targetCurrentRank === 'underboss' && currentUserRank !== 'leader') {
      toast.error(t('gangs.permissions.denied'));
      return;
    }

    // Underboss can only change ranks of those below them
    if (currentUserRank === 'underboss' && !['captain', 'soldier', 'recruit'].includes(targetCurrentRank)) {
      toast.error(t('gangs.permissions.denied'));
      return;
    }

    // Cannot promote someone to leader
    if (rankId === 'leader') {
      toast.error(t('gangs.permissions.denied'));
      return;
    }

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      const userRef = doc(db, 'users', memberId);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        const gangData = gangDoc.data() as Gang;

        const memberRanks = { ...(gangData.memberRanks || {}) };
        memberRanks[memberId] = rankId;

        transaction.update(gangRef, { memberRanks });
        transaction.update(userRef, { gangRole: rankId });
      });

      await logActivity(gang.id, {
        type: 'rank_change',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        targetName: memberNames[memberId] || memberId,
        rankName: t(`gangs.ranks.${rankId}`),
        details: t('gangs.rankChangeLog', { member: memberNames[memberId] || memberId, rank: t(`gangs.ranks.${rankId}`) })
      });

      toast.success(t('gangs.rankUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleDepositMoney = async (amount: number) => {
    if (!profile || !gang || amount <= 0) return;
    if ((profile.cleanMoney || 0) < amount) {
      toast.error(t('gangs.insufficientFunds'));
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const gangRef = doc(db, 'gangs', gang.id);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const gangDoc = await transaction.get(gangRef);
        if (!userDoc.exists() || !gangDoc.exists()) throw new Error(t('common.noData'));

        const userData = userDoc.data();
        const gangData = gangDoc.data();

        if ((userData.cleanMoney || 0) < amount) throw new Error(t('gangs.insufficientFunds'));

        transaction.update(userRef, {
          cleanMoney: (userData.cleanMoney || 0) - amount
        });

        transaction.update(gangRef, {
          balance: (gangData.balance || 0) + amount
        });
      });

      await logActivity(gang.id, {
        type: 'deposit_money',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        amount: amount,
        details: t('gangs.activity.deposit_money', { amount: formatMoney(amount) })
      });

      toast.success(t('gangs.depositSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleWithdrawMoney = async (amount: number) => {
    if (!profile || !gang || amount <= 0 || !hasPermission(profile.gangRole, 'withdraw_money')) return;
    if (gang.balance < amount) {
      toast.error(t('gangs.insufficientGangFunds'));
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const gangRef = doc(db, 'gangs', gang.id);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const gangDoc = await transaction.get(gangRef);
        if (!userDoc.exists() || !gangDoc.exists()) throw new Error(t('common.noData'));

        const userData = userDoc.data();
        const gangData = gangDoc.data();

        if (gangData.balance < amount) throw new Error(t('gangs.insufficientGangFunds'));

        transaction.update(userRef, {
          cleanMoney: (userData.cleanMoney || 0) + amount
        });

        transaction.update(gangRef, {
          balance: (gangData.balance || 0) - amount
        });
      });

      await logActivity(gang.id, {
        type: 'withdraw_money',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        amount: amount,
        details: t('gangs.activity.withdraw_money', { amount: formatMoney(amount) })
      });

      toast.success(t('gangs.withdrawSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleCreateGang = async () => {
    if (!profile || !newGangName.trim()) return;
    
    const creationFee = 10000000; // 10M
    
    if ((profile.cleanMoney || 0) < creationFee) {
      toast.error(t('gangs.insufficientFunds'));
      return;
    }

    try {
      console.log('Creating gang with:', { newGangName, profile });
      const gangId = `gang_${Date.now()}`;
      const userRef = doc(db, 'users', profile.uid);
      const gangRef = doc(db, 'gangs', gangId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error(t('common.noData'));
        
        const userData = userDoc.data();
        console.log('User data:', userData);
        if ((userData.cleanMoney || 0) < creationFee) {
          throw new Error(t('gangs.insufficientFunds'));
        }
        if (userData.gangId) {
          throw new Error(t('gangs.alreadyInGang'));
        }

        transaction.update(userRef, {
          cleanMoney: (userData.cleanMoney || 0) - creationFee,
          gangId: gangId,
          gangRole: 'leader',
          gangMembers: 1,
          gangName: newGangName.trim(),
          gangColor: newGangColor
        });

        transaction.set(gangRef, {
          id: gangId,
          name: newGangName.trim(),
          leaderId: profile.uid,
          leaderName: profile.displayName || t('common.unknown'),
          balance: 0,
          level: 1,
          reputation: 0,
          members: [profile.uid],
          pendingRequests: [],
          inventory: {},
          createdAt: serverTimestamp(),
          symbol: newGangSymbol,
          color: newGangColor
        });
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gangId}/create`));

      toast.success(t('gangs.gangCreated'));
      setNewGangName('');
      setNewGangSymbol(GANG_SYMBOLS[0]);
      setNewGangColor(GANG_COLORS[0]);
    } catch (error: any) {
      console.error('Error creating gang:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleJoinRequest = async (gangId: string) => {
    if (!profile) return;
    
    const joinFee = 100000; // 100k
    const isAdmin = profile.role === 'Admin' && (profile.email === 'm07821779969@gmail.com' || profile.email === 'soft4net2016@gmail.com');

    try {
      const userRef = doc(db, 'users', profile.uid);
      const gangRef = doc(db, 'gangs', gangId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const gangDoc = await transaction.get(gangRef);
        
        if (!userDoc.exists() || !gangDoc.exists()) throw new Error(t('common.noData'));
        
        const userData = userDoc.data();
        const gangData = gangDoc.data();

        if (userData.gangId) throw new Error(t('gangs.alreadyInGang'));
        
        // if (isAdmin) {
        //   // Join directly
        //   const newRequests = (gangData.pendingRequests || []).filter((r: any) => r.uid !== profile.uid);
        //   const newMembers = [...(gangData.members || []), profile.uid];
        //   const newCount = newMembers.length;
        //   
        //   transaction.update(gangRef, {
        //     members: newMembers,
        //     pendingRequests: newRequests
        //   });
        //
        //   transaction.update(userRef, {
        //     gangId: gangId,
        //     gangRole: 'recruit',
        //     gangMembers: newCount,
        //     gangName: gangData.name,
        //     gangColor: gangData.color
        //   });
        //
        //   const leaderRef = doc(db, 'users', gangData.leaderId);
        //   transaction.update(leaderRef, {
        //     gangMembers: newCount
        //   });
        //   
        //   return;
        // }

        if ((userData.cleanMoney || 0) < joinFee) throw new Error(t('gangs.insufficientFunds'));
        
        if (gangData.pendingRequests?.some((r: any) => r.uid === profile.uid)) {
          throw new Error(t('gangs.requestPending'));
        }

        transaction.update(userRef, {
          cleanMoney: (userData.cleanMoney || 0) - joinFee
        });

        const newRequests = [...(gangData.pendingRequests || []), {
          uid: profile.uid,
          displayName: profile.displayName,
          timestamp: new Date().toISOString()
        }];

        transaction.update(gangRef, {
          balance: (gangData.balance || 0) + joinFee,
          pendingRequests: newRequests
        });
      }).catch(error => {
        if (error.message === t('gangs.requestPending')) {
          throw error;
        }
        handleFirestoreError(error, OperationType.WRITE, `gangs/${gangId}/join`);
        throw error;
      });

      toast.success(t('gangs.requestSent'));
    } catch (error: any) {
      if (error.message === t('gangs.requestPending')) {
        toast.warning(error.message);
        return;
      }
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleApproveRequest = async (applicantId: string) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'manage_requests')) return;
    
    try {
      const gangRef = doc(db, 'gangs', gang.id);
      const applicantRef = doc(db, 'users', applicantId);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        
        const gangData = gangDoc.data();
        // Permission check is already done by hasPermission, but we still need to ensure the user is in the gang
        if (Array.isArray(gangData.members) && !gangData.members.includes(profile.uid) && gangData.leaderId !== profile.uid) {
          throw new Error(t('gangs.unauthorized'));
        }

        const request = gangData.pendingRequests?.find((r: any) => r.uid === applicantId);
        if (!request) throw new Error(t('gangs.requestNotFound'));

        const newRequests = gangData.pendingRequests.filter((r: any) => r.uid !== applicantId);
        const newMembers = [...(gangData.members || []), applicantId];
        const newCount = newMembers.length;

        transaction.update(gangRef, {
          members: newMembers,
          pendingRequests: newRequests
        });

        transaction.update(applicantRef, {
          gangId: gang.id,
          gangRole: 'recruit',
          gangMembers: newCount,
          gangName: gangData.name,
          gangColor: gangData.color
        });

        // Update leader's member count
        if (gangData.leaderId) {
          const leaderRef = doc(db, 'users', gangData.leaderId);
          transaction.update(leaderRef, {
            gangMembers: newCount
          });
        }
      }).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/approve/${applicantId}`);
        throw error; // Rethrow to trigger the outer catch
      });

      await logActivity(gang.id, {
        type: 'join',
        userId: applicantId,
        userName: memberNames[applicantId] || t('gangs.newMember'),
        details: t('gangs.activity.member_join')
      });

      toast.success(t('gangs.requestApproved'));
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleRejectRequest = async (applicantId: string) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'manage_requests')) return;
    
    try {
      const gangRef = doc(db, 'gangs', gang.id);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        
        const gangData = gangDoc.data();
        if (Array.isArray(gangData.members) && !gangData.members.includes(profile.uid) && gangData.leaderId !== profile.uid) {
          throw new Error(t('gangs.unauthorized'));
        }

        const newRequests = gangData.pendingRequests?.filter((r: any) => r.uid !== applicantId) || [];

        transaction.update(gangRef, {
          pendingRequests: newRequests
        });
      }).catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/reject/${applicantId}`);
        throw error;
      });

      toast.success(t('gangs.requestRejected'));
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleDepositItem = async (itemType: string, itemId: string, amount: number) => {
    if (!profile || !gang) return;
    
    try {
      const userRef = doc(db, 'users', profile.uid);
      const gangRef = doc(db, 'gangs', gang.id);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const gangDoc = await transaction.get(gangRef);
        
        if (!userDoc.exists() || !gangDoc.exists()) throw new Error(t('common.noData'));
        
        const userData = userDoc.data();
        const gangData = gangDoc.data();

        if (userData.gangId !== gang.id) throw new Error(t('gangs.unauthorized'));

        const userInventory = userData.inventory || {};
        const category = userInventory[itemType] || {};
        const currentAmount = category[itemId] || 0;

        if (currentAmount < amount) throw new Error(t('gangs.insufficientItems'));

        // Update user inventory
        const newUserInventory = { ...userInventory };
        if (!newUserInventory[itemType]) newUserInventory[itemType] = {};
        newUserInventory[itemType][itemId] = currentAmount - amount;

        transaction.update(userRef, {
          inventory: newUserInventory
        });

        // Update gang inventory
        const gangInventory = gangData.inventory || {};
        const newGangAmount = (gangInventory[itemId] || 0) + amount;
        
        transaction.update(gangRef, {
          [`inventory.${itemId}`]: newGangAmount
        });
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/deposit/${itemId}`));

      await logActivity(gang.id, {
        type: 'deposit_item',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        itemName: getItemDetails(itemId)?.name || itemId,
        amount: amount,
        details: t('gangs.activity.item_deposit', { count: amount, itemName: getItemDetails(itemId)?.name || itemId })
      });

      toast.success(t('gangs.depositSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleWithdrawItem = async (itemId: string, amount: number) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'withdraw_items')) return;
    if (!gang.inventory[itemId] || gang.inventory[itemId] < amount) {
      toast.error(t('gangs.noItem'));
      return;
    }

    const itemType = getItemType(itemId);

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      const userRef = doc(db, 'users', profile.uid);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        const gangData = gangDoc.data() as Gang;

        if (!gangData.inventory[itemId] || gangData.inventory[itemId] < amount) {
          throw new Error(t('gangs.insufficientItems'));
        }

        const inventory = { ...gangData.inventory };
        inventory[itemId] -= amount;
        if (inventory[itemId] <= 0) delete inventory[itemId];

        transaction.update(gangRef, { inventory });
        transaction.update(userRef, {
          [`inventory.${itemType}.${itemId}`]: increment(amount)
        });
      });

      await logActivity(gang.id, {
        type: 'withdraw_item',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        amount: amount,
        itemName: getItemDetails(itemId)?.name || itemId,
        details: t('gangs.activity.item_withdraw', { count: amount, itemName: getItemDetails(itemId)?.name || itemId })
      });

      toast.success(t('gangs.withdrawSuccess'));
    } catch (error: any) {
      console.error('Error withdrawing item:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleGiveItem = async (memberId: string, itemId: string, amount: number) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'give_items')) return;
    
    if (memberId === profile.uid) {
      toast.error(t('gangs.cannotGiveToSelf'));
      return;
    }

    if (!gang.inventory[itemId] || gang.inventory[itemId] < amount) {
      toast.error(t('gangs.noItem'));
      return;
    }

    const itemType = getItemType(itemId);

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      const memberRef = doc(db, 'users', memberId);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        const gangData = gangDoc.data() as Gang;

        if (!gangData.inventory[itemId] || gangData.inventory[itemId] < amount) {
          throw new Error(t('gangs.insufficientItems'));
        }

        const inventory = { ...gangData.inventory };
        inventory[itemId] -= amount;
        if (inventory[itemId] <= 0) delete inventory[itemId];

        transaction.update(gangRef, { inventory });
        transaction.update(memberRef, {
          [`inventory.${itemType}.${itemId}`]: increment(amount)
        });
      });

      await logActivity(gang.id, {
        type: 'give_item',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        amount: amount,
        itemName: getItemDetails(itemId)?.name || itemId,
        targetId: memberId,
        targetName: memberNames[memberId] || memberId,
        details: t('gangs.activity.item_give', { count: amount, itemName: getItemDetails(itemId)?.name || itemId, targetName: memberNames[memberId] || memberId })
      });

      toast.success(t('gangs.giveSuccess'));
    } catch (error: any) {
      console.error('Error giving item:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleSellItem = async (itemId: string, amount: number, price: number) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'sell_items')) return;
    if (!gang.inventory[itemId] || gang.inventory[itemId] < amount) {
      toast.error(t('gangs.noItem'));
      return;
    }

    try {
      const gangRef = doc(db, 'gangs', gang.id);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        const gangData = gangDoc.data() as Gang;

        if (!gangData.inventory[itemId] || gangData.inventory[itemId] < amount) {
          throw new Error(t('gangs.insufficientItems'));
        }

        const inventory = { ...gangData.inventory };
        inventory[itemId] -= amount;
        if (inventory[itemId] <= 0) delete inventory[itemId];

        transaction.update(gangRef, { 
          inventory,
          balance: gangData.balance + (price * amount)
        });
      });

      await logActivity(gang.id, {
        type: 'sell_item',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        amount: amount,
        itemName: getItemDetails(itemId)?.name || itemId,
        price: price * amount,
        details: t('gangs.activity.item_sell', { count: amount, itemName: getItemDetails(itemId)?.name || itemId, price: formatMoney(price * amount) })
      });

      toast.success(t('gangs.sellSuccess'));
    } catch (error: any) {
      console.error('Error selling item:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleUpdateGangName = async () => {
    if (!profile || !gang || !tempGangName.trim()) return;
    if (gang.leaderId !== profile.uid) return;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentChanges = (gang.nameChangeHistory || []).filter(ts => ts > oneWeekAgo);
    
    if (recentChanges.length >= 1) {
      toast.error(t('gangs.nameChangeLimit'));
      return;
    }

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      const history = [...(gang.nameChangeHistory || []), Date.now()];
      const newName = tempGangName.trim();
      
      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        const gangData = gangDoc.data() as Gang;

        transaction.update(gangRef, {
          name: newName,
          nameChangeHistory: history
        });

        // Sync name to all members
        for (const memberId of gangData.members) {
          const memberRef = doc(db, 'users', memberId);
          transaction.update(memberRef, {
            gangName: newName
          });
        }
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/updateName`));

      toast.success(t('common.success'));
      setIsEditingGangName(false);
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleUpdateGangSettings = async (symbol: string, color: string) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'edit_gang_name')) return;
    try {
      const gangRef = doc(db, 'gangs', gang.id);
      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));
        const gangData = gangDoc.data() as Gang;

        transaction.update(gangRef, {
          symbol,
          color
        });

        // Sync color to all members
        for (const memberId of gangData.members) {
          const memberRef = doc(db, 'users', memberId);
          transaction.update(memberRef, {
            gangColor: color
          });
        }
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/updateSettings`));
      toast.success(t('common.success'));
    } catch (error: any) {
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleAttackGang = async (targetGang: Gang) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'initiate_war')) return;
    
    const now = Date.now();
    const cooldown = 60 * 60 * 1000; // 1 hour cooldown
    if (gang.lastWarTime && now - gang.lastWarTime < cooldown) {
      toast.error(t('gangs.warCooldown'));
      return;
    }

    try {
      const myGangRef = doc(db, 'gangs', gang.id);
      const targetGangRef = doc(db, 'gangs', targetGang.id);

      let isWin = false;
      await runTransaction(db, async (transaction) => {
        const myGangDoc = await transaction.get(myGangRef);
        const targetGangDoc = await transaction.get(targetGangRef);

        if (!myGangDoc.exists() || !targetGangDoc.exists()) throw new Error(t('gangs.notFound'));

        const myGangData = myGangDoc.data() as Gang;
        const targetGangData = targetGangDoc.data() as Gang;

        // Select random fighters
        const myFighterId = myGangData.members[Math.floor(Math.random() * myGangData.members.length)];
        const targetFighterId = targetGangData.members[Math.floor(Math.random() * targetGangData.members.length)];

        const myFighterRef = doc(db, 'users', myFighterId);
        const targetFighterRef = doc(db, 'users', targetFighterId);

        const myFighterDoc = await transaction.get(myFighterRef);
        const targetFighterDoc = await transaction.get(targetFighterRef);

        let myFighterName = 'Unknown';
        let targetFighterName = 'Unknown';
        let myFighterHealth = 100;
        let targetFighterHealth = 100;

        if (myFighterDoc.exists()) {
          myFighterName = myFighterDoc.data().displayName || t('common.unknown');
          myFighterHealth = myFighterDoc.data().health || 100;
        }
        if (targetFighterDoc.exists()) {
          targetFighterName = targetFighterDoc.data().displayName || t('common.unknown');
          targetFighterHealth = targetFighterDoc.data().health || 100;
        }

        // Calculate power (members count + reputation/1000 + level bonus)
        const myLevelData = GANG_LEVELS.find(l => l.level === (myGangData.level || 1)) || GANG_LEVELS[0];
        const targetLevelData = GANG_LEVELS.find(l => l.level === (targetGangData.level || 1)) || GANG_LEVELS[0];

        const myPower = ((myGangData.members?.length || 1) * 10 + (myGangData.reputation || 0) / 1000) * myLevelData.bonus;
        const targetPower = ((targetGangData.members?.length || 1) * 10 + (targetGangData.reputation || 0) / 1000) * targetLevelData.bonus;

        // Add some randomness
        const myRoll = myPower * (0.8 + Math.random() * 0.4);
        const targetRoll = targetPower * (0.8 + Math.random() * 0.4);

        isWin = myRoll > targetRoll;
        const result = isWin ? 'win' : 'loss';
        
        // Calculate damage
        const damageToMyFighter = isWin ? Math.floor(Math.random() * 20) : Math.floor(Math.random() * 50) + 20;
        const damageToTargetFighter = isWin ? Math.floor(Math.random() * 50) + 20 : Math.floor(Math.random() * 20);

        if (myFighterDoc.exists()) {
          transaction.update(myFighterRef, {
            health: Math.max(0, myFighterHealth - damageToMyFighter)
          });
        }
        if (targetFighterDoc.exists()) {
          transaction.update(targetFighterRef, {
            health: Math.max(0, targetFighterHealth - damageToTargetFighter)
          });
        }

        const myLog = {
          targetGangId: targetGang.id,
          targetGangName: targetGang.name,
          result,
          timestamp: new Date().toISOString(),
          myFighterName,
          targetFighterName,
          damageToMyFighter,
          damageToTargetFighter
        };

        const targetLog = {
          targetGangId: gang.id,
          targetGangName: gang.name,
          result: isWin ? 'loss' : 'win',
          timestamp: new Date().toISOString(),
          myFighterName: targetFighterName,
          targetFighterName: myFighterName,
          damageToMyFighter: damageToTargetFighter,
          damageToTargetFighter: damageToMyFighter
        };

        const myNewLogs = [myLog, ...(myGangData.warLogs || [])].slice(0, 20);
        const targetNewLogs = [targetLog, ...(targetGangData.warLogs || [])].slice(0, 20);

        let myRepChange = isWin ? 50 : -20;
        let targetRepChange = isWin ? -20 : 50;

        const newMyRep = Math.max(0, (myGangData.reputation || 0) + myRepChange);
        const newTargetRep = Math.max(0, (targetGangData.reputation || 0) + targetRepChange);

        transaction.update(myGangRef, {
          warLogs: myNewLogs,
          lastWarTime: now,
          reputation: newMyRep
        });

        transaction.update(targetGangRef, {
          warLogs: targetNewLogs,
          reputation: newTargetRep
        });
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/attack/${targetGang.id}`));

      await logActivity(gang.id, {
        type: 'war',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        details: t('gangs.warLogDetails', { target: targetGang.name, result: t(`gangs.${isWin ? 'victory' : 'defeat'}`) })
      });

      toast.success(t('gangs.warSuccess', { result: t(`gangs.${isWin ? 'win' : 'loss'}`) }));
    } catch (error: any) {
      toast.error(error.message || t('gangs.warFailed'));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'manage_members') || memberId === profile.uid) return;

    const targetRank = gang.memberRanks?.[memberId] || 'recruit';
    const currentUserRank = profile.gangRole || 'recruit';

    // Only leader can kick underboss
    if (targetRank === 'underboss' && currentUserRank !== 'leader') {
      toast.error(t('gangs.permissions.denied'));
      return;
    }

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      const userRef = doc(db, 'users', memberId);
      const leaderRef = doc(db, 'users', profile.uid);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));

        const currentMembers = gangDoc.data().members || [];
        const newMembers = currentMembers.filter((id: string) => id !== memberId);
        const newCount = newMembers.length;

        transaction.update(gangRef, {
          members: newMembers
        });

        transaction.update(userRef, {
          gangId: null,
          gangRole: null,
          gangMembers: 0,
          gangName: null,
          gangColor: null
        });

        transaction.update(leaderRef, {
          gangMembers: newCount
        });
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/kick/${memberId}`));

      await logActivity(gang.id, {
        type: 'kick',
        userId: memberId,
        userName: memberNames[memberId] || t('gangs.member'),
        details: t('gangs.activity.member_remove')
      });

      toast.success(t('gangs.memberRemoved'));
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleLeaveGang = async () => {
    if (!profile || !gang || profile.gangRole === 'leader') return;

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      const userRef = doc(db, 'users', profile.uid);

      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));

        const gangData = gangDoc.data();
        const currentMembers = gangData.members || [];
        const newMembers = currentMembers.filter((id: string) => id !== profile.uid);
        const newCount = newMembers.length;

        transaction.update(gangRef, {
          members: newMembers
        });

        transaction.update(userRef, {
          gangId: null,
          gangRole: null,
          gangMembers: 0,
          gangName: null,
          gangColor: null
        });

        // Update leader's gangMembers count too
        const leaderRef = doc(db, 'users', gangData.leaderId);
        transaction.update(leaderRef, {
          gangMembers: newCount
        });
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/leave`));

      await logActivity(gang.id, {
        type: 'leave',
        userId: profile.uid,
        userName: profile.displayName || t('common.unknown'),
        details: t('gangs.activity.member_leave')
      });

      toast.success(t('gangs.leaveSuccess'));
      setActiveTab('list');
    } catch (error: any) {
      console.error('Error leaving gang:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  const handleDeleteGang = async () => {
    if (!profile || !gang || !hasPermission(profile.gangRole, 'delete_gang')) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      const gangRef = doc(db, 'gangs', gang.id);
      
      await runTransaction(db, async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        if (!gangDoc.exists()) throw new Error(t('gangs.notFound'));

        const members = gangDoc.data().members || [];
        
        for (const memberId of members) {
          const userRef = doc(db, 'users', memberId);
          transaction.update(userRef, {
            gangId: null,
            gangRole: null,
            gangMembers: 0,
            gangName: null,
            gangColor: null
          });
        }

        transaction.delete(gangRef);
      }).catch(error => handleFirestoreError(error, OperationType.WRITE, `gangs/${gang.id}/delete`));

      toast.success(t('gangs.gangDeleted'));
      setShowDeleteConfirm(false);
      setActiveTab('list');
    } catch (error: any) {
      console.error('Error deleting gang:', error);
      toast.error(error.message || t('common.failed'));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">{t('common.loading')}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-900/50 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />
          
          <div className="relative z-10 flex-1">
            {isEditingGangName ? (
              <div className="flex items-center gap-3">
                <Shield className="text-red-500" size={32} />
                <input
                  type="text"
                  value={tempGangName}
                  onChange={(e) => setTempGangName(e.target.value)}
                  className="bg-black/50 border border-red-500/50 rounded-xl px-4 py-2 text-2xl font-black uppercase tracking-tight focus:outline-none focus:ring-2 ring-red-500/20"
                />
                <button onClick={handleUpdateGangName} className="p-2.5 bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20">
                  <Check size={20} />
                </button>
                <button onClick={() => setIsEditingGangName(false)} className="p-2.5 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all">
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-2 bg-red-600/20 blur-xl rounded-full opacity-50" />
                  {gang ? React.createElement(SYMBOL_MAP[gang.symbol] || Shield, { className: `${gang.color} relative z-10`, size: 48 }) : <Shield className="text-red-500 relative z-10" size={48} />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
                      {gang ? gang.name : t('gangs.title')}
                    </h1>
                    {gang && profile?.gangRole === 'leader' && (
                      <button 
                        onClick={() => {
                          setTempGangName(gang.name);
                          setIsEditingGangName(true);
                        }}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-600 hover:text-white"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">{t('gangs.operationalStatus')}</span>
                    </div>
                    <span className="text-zinc-600">|</span>
                    <p className="text-zinc-500 text-xs font-medium">{gang ? t('gangs.desc') : t('gangs.gangList')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {gang && (
            <div className="flex gap-3 relative z-10">
              <div className="bg-black/40 px-6 py-4 rounded-2xl border border-zinc-800/50 backdrop-blur-md min-w-[140px]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{t('gangs.treasury')}</p>
                <p className="text-xl font-black text-emerald-500 tabular-nums">{formatMoney(gang.balance)}</p>
              </div>
              <div className="bg-black/40 px-6 py-4 rounded-2xl border border-zinc-800/50 backdrop-blur-md min-w-[100px]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{t('gangs.level')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-black text-red-500">{gang.level}</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-1 h-3 rounded-full ${i < gang.level ? 'bg-red-500' : 'bg-zinc-800'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        {gang && (
          <div className="flex flex-wrap gap-2 bg-zinc-950/50 p-2 rounded-2xl border border-zinc-900/50">
            {[
              { id: 'dashboard', icon: Target, label: t('common.dashboard') },
              { id: 'members', icon: Users, label: t('gangs.membersList') },
              { id: 'inventory', icon: Package, label: t('gangs.gangInventory') },
              { id: 'requests', icon: UserPlus, label: t('gangs.pendingRequests'), count: gang.pendingRequests.length, leaderOnly: true },
              { id: 'management', icon: Settings, label: t('gangs.management'), leaderOnly: true },
              { id: 'wars', icon: Swords, label: t('gangs.wars') },
              { id: 'activity', icon: History, label: t('gangs.activityLog') },
              { id: 'list', icon: List, label: t('gangs.gangList') },
            ].map((tab) => {
              if (tab.leaderOnly && profile?.gangRole !== 'leader') return null;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2.5 relative group ${
                    isActive 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <tab.icon size={16} className={isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'} />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${isActive ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="space-y-8">
        {activeTab === 'dashboard' && gang && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Hierarchy & Leadership */}
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Crown size={160} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">{t('gangs.hierarchy')}</p>
                  {gang.leaderId !== profile?.uid && (
                    <button
                      onClick={handleLeaveGang}
                      className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                    >
                      {t('gangs.leaveGang')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-5 p-5 bg-black/40 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-red-600/30 blur-md rounded-full" />
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center relative z-10 border border-zinc-700">
                      <Crown className="text-red-500" size={32} />
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('gangs.ranks.leader')}</p>
                    <p className="text-xl font-black text-white">{gang.leaderName}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between items-center px-2">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">{t('gangs.members')}</p>
                    <p className="text-xl font-black text-white">{gang.members.length}</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">{t('gangs.influence')}</p>
                    <p className="text-xl font-black text-red-500">{formatNumber(gang.reputation)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Assets */}
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Target size={160} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-6">{t('gangs.strategicAssets')}</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                        <Shield size={18} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300">{t('gangs.territory')}</span>
                    </div>
                    <span className="text-sm font-black text-white">84%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                        <Activity size={18} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300">{t('gangs.intel')}</span>
                    </div>
                    <span className="text-sm font-black text-white">{t('gangs.lvl')} {gang.level}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Expansion */}
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <TrendingUp size={160} />
              </div>
              <div className="relative z-10 h-full flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-6">{t('gangs.levelUp')}</p>
                
                <div className="flex-1 flex flex-col justify-center">
                  {gang.level < 5 ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">{t('gangs.nextLevelCost')}</p>
                          <p className="text-2xl font-black text-emerald-500">{formatMoney(GANG_LEVELS.find(l => l.level === gang.level + 1)?.cost || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">{t('gangs.target')}</p>
                          <p className="text-xl font-black text-white">{t('gangs.lvl')} {gang.level + 1}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLevelUp}
                        disabled={gang.balance < (GANG_LEVELS.find(l => l.level === gang.level + 1)?.cost || 0)}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all relative overflow-hidden group/btn ${
                          gang.balance >= (GANG_LEVELS.find(l => l.level === gang.level + 1)?.cost || 0)
                            ? 'bg-red-600 text-white shadow-xl shadow-red-900/40 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className="relative z-10">{t('gangs.levelUp')}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-zinc-500">
                      <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                        <Check className="text-emerald-500" size={32} />
                      </div>
                      <p className="font-black uppercase tracking-widest text-xs">{t('gangs.maxLevelReached')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Treasury & Logistics */}
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 lg:col-span-3 relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-2">{t('gangs.treasury')}</p>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('gangs.gangBalance')}</h2>
                </div>
                <div className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-zinc-800/50">
                  <div className="p-3 bg-emerald-600/10 rounded-xl">
                    <Wallet className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('gangs.availableFunds')}</p>
                    <p className="text-2xl font-black text-emerald-500 tabular-nums">{formatMoney(gang.balance)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-sm group hover:border-emerald-500/30 transition-colors">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t('gangs.depositMoney')}</p>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">$</span>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                        id="depositAmount"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const amount = parseInt((document.getElementById('depositAmount') as HTMLInputElement).value);
                        handleDepositMoney(amount);
                      }}
                      className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-emerald-900/20"
                    >
                      {t('common.confirm')}
                    </button>
                  </div>
                </div>

                {profile?.gangRole === 'leader' && (
                  <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-sm group hover:border-red-500/30 transition-colors">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">{t('gangs.withdrawMoney')}</p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">$</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white font-bold focus:outline-none focus:border-red-500 transition-colors"
                          id="withdrawAmount"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const amount = parseInt((document.getElementById('withdrawAmount') as HTMLInputElement).value);
                          handleWithdrawMoney(amount);
                        }}
                        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-red-900/20"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && gang && (
          <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-2">{t('gangs.personnel') || 'Personnel'}</p>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <Users className="text-red-500" size={32} />
                  {t('gangs.membersList')}
                </h2>
              </div>
              <div className="flex items-center gap-4 px-6 py-3 bg-black/40 rounded-2xl border border-zinc-800/50">
                <div className="text-right">
                  <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-0.5">{t('gangs.activePersonnel') || 'الأفراد النشطين'}</p>
                  <p className="text-xl font-black text-white">{gang.members.length} / {gang.level * 10 + 10}</p>
                </div>
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gang.members.map((memberId) => {
                const rankId = gang.memberRanks?.[memberId] || (memberId === gang.leaderId ? 'leader' : 'recruit');
                const rank = GANG_RANKS.find(r => r.id === rankId) || GANG_RANKS[4];
                const isLeader = memberId === gang.leaderId;
                
                return (
                  <div key={memberId} className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-sm group hover:border-red-500/30 transition-all relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${rank.color.replace('text-', 'bg-')}`} />
                    
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-zinc-800/50 border border-zinc-700/50 relative overflow-hidden`}>
                          <div className={`absolute inset-0 opacity-10 ${rank.color.replace('text-', 'bg-')}`} />
                          <rank.icon size={28} className={rank.color} />
                        </div>
                        <div>
                          <p className="font-black text-lg text-white uppercase tracking-tight">
                            {memberNames[memberId] || (isLeader ? gang.leaderName : `${t('gangs.operative')} ${memberId.slice(0, 4)}`)}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-zinc-800/50 ${rank.color}`}>
                              {t(`gangs.ranks.${rank.id}`)}
                            </span>
                            {isLeader && <Crown size={12} className="text-yellow-500" />}
                          </div>
                        </div>
                      </div>
                      
                      {profile?.gangRole === 'leader' && !isLeader && (
                        <button 
                          onClick={() => handleRemoveMember(memberId)} 
                          className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          title={t('gangs.removeMember')}
                        >
                          <UserMinus size={18} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/30">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1">{t('gangs.status')}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-zinc-400">{t('gangs.active')}</span>
                        </div>
                      </div>
                      <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/30">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1">{t('gangs.contribution')}</p>
                        <p className="text-[10px] font-bold text-white">{t('gangs.high')}</p>
                      </div>
                    </div>

                    {hasPermission(profile?.gangRole, 'manage_ranks') && !isLeader && (
                      <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{t('gangs.identityControl')}</p>
                        <div className="flex flex-wrap gap-2">
                          {GANG_RANKS.filter(r => r.id !== 'leader').map(r => (
                            <button
                              key={r.id}
                              onClick={() => handleUpdateMemberRank(memberId, r.id)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                                rankId === r.id 
                                  ? `${r.color} border-current bg-current/5` 
                                  : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                              }`}
                            >
                              {t(`gangs.ranks.${r.id}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'activity' && gang && (
          <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-red-600/10 rounded-2xl">
                <History className="text-red-500" size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-1">{t('gangs.intelligence')}</p>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('gangs.activityLog')}</h2>
              </div>
            </div>

            <div className="space-y-3">
              {gang.activityLog && gang.activityLog.length > 0 ? (
                gang.activityLog.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-5 p-5 bg-black/40 rounded-2xl border border-zinc-800/50 group hover:border-red-500/30 transition-all backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-500 group-hover:text-red-500 transition-colors border border-zinc-700/30">
                      <Activity size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        <span className="font-black text-white uppercase tracking-tight mr-2">{log.userName}</span>
                        <span className="font-medium">
                          {t(`gangs.activity.${log.type}`, { 
                            amount: log.amount ? (['deposit_money', 'withdraw_money'].includes(log.type) ? formatMoney(log.amount) : formatNumber(log.amount)) : '',
                            itemName: log.itemName || '',
                            level: log.details?.match(/\d+/)?.[0] || '',
                            targetName: log.targetName || '',
                            rankName: log.rankName || ''
                          })}
                        </span>
                        {typeof log.details === 'string' && !log.details.includes('level') && (
                          <span className="text-zinc-500 italic ml-2 text-xs opacity-60">/ {log.details}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock size={10} className="text-zinc-700" />
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">{formatDate(log.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-[2rem] border border-dashed border-zinc-800">
                  <History className="text-zinc-800 mb-4" size={48} />
                  <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && gang && (
          <div className="space-y-8">
            {/* Gang Inventory */}
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-2">{t('gangs.logistics')}</p>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Package className="text-red-500" size={32} />
                    {t('gangs.gangInventory')}
                  </h2>
                </div>
                <div className="flex items-center gap-4 px-6 py-3 bg-black/40 rounded-2xl border border-zinc-800/50">
                  <div className="text-right">
                    <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-0.5">{t('gangs.stockCapacity')}</p>
                    <p className="text-xl font-black text-white">{Object.values(gang.inventory).reduce((a, b) => a + b, 0)} {t('gangs.units')}</p>
                  </div>
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                    <Package size={20} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(gang.inventory).length > 0 ? (
                  Object.entries(gang.inventory).map(([itemId, count]) => {
                    const details = getItemDetails(itemId);
                    const Icon = getItemIcon(itemId);
                    return (
                      <div key={itemId} className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 text-center group relative overflow-hidden hover:border-red-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-2 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                          <Icon size={48} />
                        </div>
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-zinc-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 text-zinc-400 group-hover:text-red-500 transition-colors">
                            <Icon size={24} />
                          </div>
                          <p className="text-xs font-black text-white uppercase tracking-tight mb-1 truncate px-2">
                            {details ? (t(`items.${details.id}`) === `items.${details.id}` ? details.name : t(`items.${details.id}`)) : itemId}
                          </p>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[10px] font-black text-red-500">x{count}</span>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t('gangs.units')}</span>
                          </div>
                        </div>
                        
                        {hasPermission(profile?.gangRole, 'withdraw_items') && (
                          <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-4 gap-3 backdrop-blur-sm">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{t('gangs.withdrawal')}</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleWithdrawItem(itemId, 1)}
                                className="p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-lg shadow-red-900/20"
                                title={t('gangs.withdraw1')}
                              >
                                <ArrowDown size={18} />
                              </button>
                              {hasPermission(profile?.gangRole, 'sell_items') && (
                                <button 
                                  onClick={() => handleSellItem(itemId, 1, details?.price || 100)}
                                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                                  title={t('gangs.sell1')}
                                >
                                  <DollarSign size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleWithdrawItem(itemId, count)}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                {t('common.all')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 bg-black/20 rounded-[2rem] border border-dashed border-zinc-800">
                    <Package className="text-zinc-800 mb-4" size={48} />
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">{t('gangs.noItemsInInventory')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Deposit Items */}
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-10">
                <div className="p-3 bg-emerald-600/10 rounded-2xl">
                  <Plus className="text-emerald-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1">{t('gangs.resourceAcquisition')}</p>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('gangs.depositItems')}</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {profile?.inventory && Object.entries(profile.inventory).map(([type, items]) => (
                  <div key={type} className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                      {t(`inventory.${type}`)}
                    </div>
                    <div className="space-y-3">
                      {Object.entries(items as Record<string, number>).map(([itemId, count]) => {
                        const details = getItemDetails(itemId);
                        const Icon = getItemIcon(itemId);
                        return count > 0 && (
                          <div key={itemId} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/30 flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-800/50 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 transition-colors">
                                <Icon size={20} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white mb-0.5">{details ? t(`items.${details.id}`) : itemId}</p>
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{t('gangs.available', { count })}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleDepositItem(type, itemId, 1)}
                                className="p-2 bg-emerald-600/10 text-emerald-500 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                title={t('gangs.deposit1')}
                              >
                                <Plus size={16} />
                              </button>
                              <button 
                                onClick={() => handleDepositItem(type, itemId, count)}
                                className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all"
                              >
                                {t('common.all')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {Object.values(items as Record<string, number>).every(c => c === 0) && (
                        <p className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-zinc-700">{t('common.empty')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && gang && hasPermission(profile?.gangRole, 'manage_requests') && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600/10 rounded-2xl">
                    <UserPlus className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">{t('gangs.personnelIntake')}</p>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('gangs.pendingRequests')}</h2>
                  </div>
                </div>
                <div className="px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700/30">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    {t('gangs.totalPending')} <span className="text-white ml-1">{gang.pendingRequests.length}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {gang.pendingRequests.length > 0 ? (
                  gang.pendingRequests.map((request) => (
                    <div key={request.uid} className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 flex items-center justify-between group hover:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:border-blue-500/30 transition-colors">
                          <User className="text-zinc-500 group-hover:text-blue-500 transition-colors" size={24} />
                        </div>
                        <div>
                          <p className="font-black text-white uppercase tracking-wider player-name-script">{request.displayName}</p>
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-1">
                            {t('gangs.applied')} <span className="text-zinc-400">{formatDate(request.timestamp)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveRequest(request.uid)}
                          className="flex items-center gap-2 px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border border-emerald-500/20"
                        >
                          <Check size={16} />
                          {t('common.approve')}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.uid)}
                          className="flex items-center gap-2 px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border border-red-500/20"
                        >
                          <X size={16} />
                          {t('common.reject')}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 bg-black/20 rounded-[2rem] border border-dashed border-zinc-800">
                    <UserPlus className="text-zinc-800 mb-4" size={48} />
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">{t('gangs.noActiveRecruitment')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'management' && gang && profile?.gangRole === 'leader' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-10">
                <div className="p-3 bg-red-600/10 rounded-2xl">
                  <Edit3 className="text-red-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-1">{t('gangs.identityControl')}</p>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('gangs.management')}</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Symbol Selection */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-red-500 rounded-full" />
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t('gangs.symbol')}</h3>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {GANG_SYMBOLS.map(sym => (
                      <button
                        key={sym}
                        onClick={() => handleUpdateGangSettings(sym, gang.color)}
                        className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center group ${
                          gang.symbol === sym 
                            ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                            : 'border-zinc-800 bg-black/40 hover:border-zinc-600'
                        }`}
                      >
                        {React.createElement(SYMBOL_MAP[sym] || Shield, { 
                          size: 24, 
                          className: gang.symbol === sym ? gang.color : 'text-zinc-600 group-hover:text-zinc-400 transition-colors' 
                        })}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-red-500 rounded-full" />
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t('gangs.color')}</h3>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {GANG_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => handleUpdateGangSettings(gang.symbol, color)}
                        className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center ${
                          gang.color === color 
                            ? 'border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                            : 'border-transparent hover:border-zinc-600'
                        } ${color.replace('text-', 'bg-').replace('-500', '-500')}`}
                      >
                        {gang.color === color && <Check size={20} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-16 pt-10 border-t border-zinc-800/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-red-600/10 rounded-xl">
                    <AlertTriangle className="text-red-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('gangs.dangerZone')}</h3>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-0.5">{t('gangs.irreversibleActions')}</p>
                  </div>
                </div>

                {showDeleteConfirm ? (
                  <div className="p-8 bg-red-900/10 border border-red-500/30 rounded-3xl animate-in zoom-in-95 duration-300">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{t('gangs.deleteGangConfirm')}</h3>
                    <p className="text-xs font-black text-red-500/70 uppercase tracking-widest mb-8">{t('gangs.dissolveOrg')}</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleDeleteGang} 
                        className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-red-600/20"
                      >
                        {t('common.confirm')}
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)} 
                        className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="group flex items-center gap-3 px-8 py-4 bg-red-600/5 hover:bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl transition-all duration-300"
                  >
                    <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('gangs.deleteGang')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wars' && gang && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-600/10 rounded-2xl">
                    <Swords className="text-red-500" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-1">{t('gangs.strategicConflict')}</p>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('gangs.wars')}</h2>
                  </div>
                </div>
                <div className="px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700/30">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    {t('gangs.availableTargets')}: <span className="text-white ml-1">{allGangs.filter(g => g.id !== gang.id).length}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allGangs.filter(g => g.id !== gang.id).length > 0 ? (
                  allGangs.filter(g => g.id !== gang.id).map(targetGang => (
                    <div key={targetGang.id} className="bg-black/40 p-6 rounded-[2rem] border border-zinc-800/50 group hover:border-red-500/30 transition-all duration-500">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-red-500/30 transition-all duration-500">
                            {React.createElement(SYMBOL_MAP[targetGang.symbol] || Shield, { 
                              size: 32, 
                              className: targetGang.color 
                            })}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">{targetGang.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('gangs.lvl')} {targetGang.level}</p>
                              <div className="w-1 h-1 rounded-full bg-zinc-700" />
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{targetGang.members?.length || 0} {t('gangs.membersCount')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{t('gangs.status')}</p>
                          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{t('gangs.vulnerable')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/30">
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{t('gangs.estTreasury')}</p>
                          <p className="text-sm font-black text-white">{formatMoney(targetGang.balance || 0)}</p>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/30">
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{t('gangs.combatPower')}</p>
                          <p className="text-sm font-black text-white">{(targetGang.level * 150).toLocaleString()}</p>
                        </div>
                      </div>

                      {profile?.gangRole === 'leader' && (
                        <button
                          onClick={() => handleAttackGang(targetGang)}
                          className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center gap-3 group/btn"
                        >
                          <Swords size={18} className="group-hover/btn:rotate-12 transition-transform" />
                          {t('gangs.initiateAssault')}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-24 bg-black/20 rounded-[2rem] border border-dashed border-zinc-800">
                    <Target className="text-zinc-800 mb-4" size={48} />
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">{t('gangs.noRivals')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-10">
                <div className="p-3 bg-zinc-800 rounded-2xl">
                  <List className="text-zinc-400" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">{t('gangs.historicalRecords')}</p>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t('gangs.warLog')}</h2>
                </div>
              </div>

              <div className="space-y-4">
                {gang.warLogs && gang.warLogs.length > 0 ? (
                  gang.warLogs.map((log, index) => (
                    <div key={index} className="bg-black/40 p-6 rounded-2xl border border-zinc-800/50 flex items-center justify-between group hover:border-zinc-700 transition-all duration-300">
                      <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                          log.result === 'win' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                            : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}>
                          {log.result === 'win' ? <Trophy size={24} /> : <Skull size={24} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{t('gangs.engagementVs')}</p>
                          <p className="text-lg font-black text-white uppercase tracking-tight">{log.targetGangName}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">{formatDate(new Date(log.timestamp).getTime())}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-12">
                        {log.myFighterName && (
                          <div className="hidden lg:block text-right">
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{t('gangs.combatants')}</p>
                            <p className="text-xs font-black text-white uppercase tracking-wider">
                              {log.myFighterName} <span className="text-zinc-600 mx-2">{t('gangs.vs')}</span> {log.targetFighterName}
                            </p>
                          </div>
                        )}
                        <div className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border ${
                          log.result === 'win' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                            : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}>
                          {t(`gangs.${log.result}`)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-[2rem] border border-dashed border-zinc-800">
                    <History className="text-zinc-800 mb-4" size={48} />
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">{t('gangs.noConflictHistory')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-8">
            {/* Admin Tools */}
            {(profile?.role === 'Admin' || profile?.displayName?.toLowerCase() === 'mustafa') && (
              <div className="bg-zinc-900/50 border border-orange-500/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">أدوات الإدارة</h4>
                    <p className="text-xs text-zinc-400">حل مشاكل العصابات المعلقة</p>
                  </div>
                </div>
                <button
                  onClick={handleResetMyGangStatus}
                  className="px-4 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-lg text-sm font-bold transition-all"
                >
                  تصفير حالة العصابة الخاصة بي
                </button>
              </div>
            )}

            {!profile?.gangId && (
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                  <Plus className="text-red-500" />
                  {t('gangs.createGang')}
                </h2>
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={newGangName}
                    onChange={(e) => setNewGangName(e.target.value)}
                    placeholder={t('gangs.title')}
                    className="flex-1 bg-black border border-zinc-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase">{t('gangs.selectSymbol')}</p>
                    <div className="flex flex-wrap gap-2">
                      {GANG_SYMBOLS.map(s => {
                        const Icon = SYMBOL_MAP[s];
                        return (
                          <button
                            key={s}
                            onClick={() => setNewGangSymbol(s)}
                            className={`p-3 rounded-xl border transition-all ${newGangSymbol === s ? 'border-red-500 bg-red-500/20 text-red-500' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600'}`}
                          >
                            <Icon size={24} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase">{t('gangs.selectColor')}</p>
                    <div className="flex flex-wrap gap-2">
                      {GANG_COLORS.map(c => {
                        const colorClass = c.replace('text-', 'bg-');
                        return (
                          <button
                            key={c}
                            onClick={() => setNewGangColor(c)}
                            className={`w-10 h-10 rounded-full border-2 transition-all ${newGangColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'} ${colorClass}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateGang}
                    className="w-full px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    {t('gangs.createGang')}
                    <span className="text-xs opacity-50">({formatMoney(10000000)})</span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
              <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                <List className="text-red-500" />
                {t('gangs.gangList')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allGangs.map((g) => (
                  <div key={g.id} className="bg-black/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {React.createElement(SYMBOL_MAP[g.symbol] || Shield, { className: g.color, size: 24 })}
                        <h3 className="text-xl font-bold">{g.name}</h3>
                      </div>
                      <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold">{t('gangs.lvl')} {g.level}</span>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-400">
                      <p className="flex justify-between">
                        <span>{t('gangs.leader')}:</span>
                        <span className="text-white">{g.leaderName}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>{t('gangs.members')}:</span>
                        <span className="text-white">{g.members.length}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>{t('gangs.power')}:</span>
                        <span className="text-red-400 font-bold">{formatNumber(g.reputation)}</span>
                      </p>
                    </div>
                    {!profile?.gangId && (
                      <button
                        onClick={() => handleJoinRequest(g.id)}
                        disabled={g.pendingRequests?.some(r => r.uid === profile?.uid)}
                        className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                          g.pendingRequests?.some(r => r.uid === profile?.uid)
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        }`}
                      >
                        <UserPlus size={18} />
                        {g.pendingRequests?.some(r => r.uid === profile?.uid) ? t('gangs.requestPending') : t('gangs.joinGang')}
                        {!g.pendingRequests?.some(r => r.uid === profile?.uid) && <span className="text-[10px] opacity-50">($100k)</span>}
                      </button>
                    )}
                  </div>
                ))}
                {allGangs.length === 0 && (
                  <div className="col-span-full text-center py-12 text-zinc-500">
                    {t('common.noData')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
