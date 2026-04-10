import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc, runTransaction, where, increment, getDocs, limit } from 'firebase/firestore';
import { VenetianMask, Users, ShieldAlert, Target, Crosshair, Car, Key, Plus, Check, X as CloseIcon, Play, AlertCircle, Trash2, Search } from 'lucide-react';
import { formatMoney, safeFetch, safeToMillis } from '../lib/utils';
import { getVIPMultiplier } from '../lib/vip';
import { MARKET_ITEMS } from '../lib/items';
import clsx from 'clsx';
import { toast } from 'sonner';

interface HeistMember {
  userId: string;
  name: string;
  role: 'leader' | 'driver' | 'lockpicker' | 'armed';
  share: number;
  status: 'joined' | 'pending';
  power: number;
  gear?: {
    weapon?: string;
    vehicle?: string;
    armor?: string;
  };
}

interface Heist {
  id: string;
  leaderId: string;
  leaderName: string;
  type: 'small' | 'large';
  status: 'recruiting' | 'completed' | 'failed';
  members: HeistMember[];
  shares: {
    driver: number;
    lockpicker: number;
    armed: number;
  };
  createdAt: any;
}

export default function Heists() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const [heists, setHeists] = useState<Heist[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [heistType, setHeistType] = useState<'small' | 'large'>('small');
  const [shares, setShares] = useState({ driver: 15, lockpicker: 15, armed: 10 });
  const [showInviteModal, setShowInviteModal] = useState<{ heistId: string, role: 'driver' | 'lockpicker' | 'armed', share: number } | null>(null);
  const [showGearModal, setShowGearModal] = useState<{ 
    heistId: string, 
    role: 'leader' | 'driver' | 'lockpicker' | 'armed', 
    share: number, 
    isLeader?: boolean,
    isDummy?: boolean 
  } | null>(null);
  const [selectedGear, setSelectedGear] = useState<{ weapon?: string, vehicle?: string, armor?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'heists'),
      where('status', '==', 'recruiting')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const heistsData: Heist[] = [];
      snapshot.forEach((doc) => {
        heistsData.push({ id: doc.id, ...doc.data() } as Heist);
      });
      setHeists(heistsData.sort((a, b) => (safeToMillis(b.createdAt) || 0) - (safeToMillis(a.createdAt) || 0)));
    }, (error) => {
      console.error('Heists listener error:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Client-side search for users
  useEffect(() => {
    if (!searchTerm.trim() || !showInviteModal) {
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
              displayName: data.displayName || 'Unknown',
              photoURL: data.photoURL || null
            });
          });
        });
        
        const results = Array.from(resultsMap.values()).slice(0, 10);
        setSearchResults(results.filter((u: any) => u.id !== user?.uid));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, showInviteModal, user?.uid]);

  const calculateLeaderShare = () => {
    if (heistType === 'small') {
      return 100 - shares.driver - shares.lockpicker - (shares.armed * 2);
    } else {
      return 100 - (shares.driver * 2) - shares.lockpicker - (shares.armed * 4);
    }
  };

  const calculatePowerFromGear = (gear: { weapon?: string, vehicle?: string, armor?: string }, isDummy?: boolean) => {
    let power = (isDummy ? 5 : (profile?.level || 1)) * 10;
    if (gear.weapon) {
      const w = MARKET_ITEMS.weapons.find(i => i.id === gear.weapon);
      power += w?.power || 0;
    }
    if (gear.armor) {
      const a = MARKET_ITEMS.armor.find(i => i.id === gear.armor);
      power += a?.power || 0;
    }
    if (gear.vehicle) {
      const v = MARKET_ITEMS.cars.find(i => i.id === gear.vehicle);
      power += v?.power || 0;
    }
    return power || 10; // Minimum power
  };

  const handleCreateHeist = async () => {
    if (!user || !profile || !selectedGear) return;

    const cost = heistType === 'small' ? 50000 : 100000;
    if (profile.cleanMoney < cost) {
      toast.error(t('heists.notEnoughMoney'));
      return;
    }

    const leaderShare = calculateLeaderShare();
    if (leaderShare < 0) {
      toast.error(t('heists.mustBe100'));
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");
        
        const currentMoney = userDoc.data().cleanMoney || 0;
        if (currentMoney < cost) throw new Error(t('heists.notEnoughMoney'));

        transaction.update(userRef, {
          cleanMoney: increment(-cost)
        });

        const power = calculatePowerFromGear(selectedGear);

        const heistRef = doc(collection(db, 'heists'));
        transaction.set(heistRef, {
          leaderId: profile.uid,
          leaderName: profile.displayName,
          type: heistType,
          status: 'recruiting',
          shares,
          members: [{
            userId: profile.uid,
            name: profile.displayName,
            role: 'leader',
            share: leaderShare,
            status: 'joined',
            power,
            gear: selectedGear
          }],
          createdAt: serverTimestamp()
        });
      });

      setShowCreateModal(false);
      setShowGearModal(null);
      setSelectedGear({});
      toast.success(t('heists.created'));
    } catch (error: any) {
      console.error('Error creating heist:', error);
      let errorMsg = error.message || t('heists.createFailed');
      if (errorMsg.includes('The string did not match the expected pattern')) {
        errorMsg = t('errors.patternMismatch');
      }
      toast.error(errorMsg);
    }
  };

  const handleJoinHeist = async (heistId: string, role: 'leader' | 'driver' | 'lockpicker' | 'armed', share: number, gear: { weapon?: string, vehicle?: string, armor?: string }) => {
    if (!user || !profile) return;

    const heist = heists.find(h => h.id === heistId);
    if (!heist) return;

    // Check if player is already in a team
    if (heist.members.some(m => m.userId === profile.uid)) {
      toast.error(t('heists.alreadyInTeam'));
      return;
    }

    // Check if gear needs to be purchased
    let purchaseCost = 0;
    const inventory = (profile?.inventory || {}) as any;
    
    if (gear.weapon && role === 'armed' && !(inventory.weapons?.[gear.weapon] > 0)) {
      purchaseCost += MARKET_ITEMS.weapons.find(w => w.id === gear.weapon)?.price || 0;
    }
    if (gear.weapon && role === 'lockpicker' && !(inventory.tools?.[gear.weapon] > 0)) {
      purchaseCost += MARKET_ITEMS.tools.find(t => t.id === gear.weapon)?.price || 0;
    }
    if (gear.vehicle && role === 'driver' && !(inventory.cars?.[gear.vehicle] > 0)) {
      purchaseCost += MARKET_ITEMS.cars.find(c => c.id === gear.vehicle)?.price || 0;
    }

    if (profile.cleanMoney < purchaseCost) {
      toast.error(t('heists.notEnoughMoney'));
      return;
    }

    const power = calculatePowerFromGear(gear);

    try {
      const userRef = doc(db, 'users', profile.uid);
      const heistRef = doc(db, 'heists', heistId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");
        
        if (purchaseCost > 0) {
          const currentMoney = userDoc.data().cleanMoney || 0;
          if (currentMoney < purchaseCost) throw new Error(t('heists.notEnoughMoney'));

          const updatedInventory = { ...userDoc.data().inventory };
          if (role === 'armed' && gear.weapon) {
            updatedInventory.weapons = { ...updatedInventory.weapons, [gear.weapon]: (updatedInventory.weapons?.[gear.weapon] || 0) + 1 };
          } else if (role === 'lockpicker' && gear.weapon) {
            updatedInventory.tools = { ...updatedInventory.tools, [gear.weapon]: (updatedInventory.tools?.[gear.weapon] || 0) + 1 };
          } else if (role === 'driver' && gear.vehicle) {
            updatedInventory.cars = { ...updatedInventory.cars, [gear.vehicle]: (updatedInventory.cars?.[gear.vehicle] || 0) + 1 };
          }

          transaction.update(userRef, {
            cleanMoney: increment(-purchaseCost),
            inventory: updatedInventory
          });
        }

        const heistDoc = await transaction.get(heistRef);
        if (!heistDoc.exists()) throw new Error("Heist not found");

        transaction.update(heistRef, {
          members: [...heistDoc.data().members, {
            userId: profile.uid,
            name: profile.displayName,
            role,
            share,
            status: 'pending',
            power,
            gear
          }]
        });
      });

      setShowGearModal(null);
      setSelectedGear({});
      toast.success(t('heists.joinRequestSent'));
    } catch (error: any) {
      console.error('Error joining heist:', error);
      let errorMsg = error.message || t('heists.joinFailed');
      if (errorMsg.includes('The string did not match the expected pattern')) {
        errorMsg = t('errors.patternMismatch');
      }
      toast.error(errorMsg);
    }
  };

  const handleApproveMember = async (heistId: string, memberId: string) => {
    const heist = heists.find(h => h.id === heistId);
    if (!heist || heist.leaderId !== user?.uid) return;

    const updatedMembers = heist.members.map(m => 
      m.userId === memberId ? { ...m, status: 'joined' as const } : m
    );

    try {
      await updateDoc(doc(db, 'heists', heistId), {
        members: updatedMembers
      });
      toast.success(t('heists.approve') + ' ✅');
      
      // Check if full
      const requiredMembers = heist.type === 'small' ? 5 : 8;
      const joinedMembers = updatedMembers.filter(m => m.status === 'joined');
      if (joinedMembers.length === requiredMembers) {
        toast.success(t('heists.teamFull'));
      }
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const handleRejectMember = async (heistId: string, memberId: string) => {
    const heist = heists.find(h => h.id === heistId);
    if (!heist || heist.leaderId !== user?.uid) return;

    const updatedMembers = heist.members.filter(m => m.userId !== memberId);

    try {
      await updateDoc(doc(db, 'heists', heistId), {
        members: updatedMembers
      });
      toast.success(t('heists.reject') + ' ❌');
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  const handleStartHeist = async (heistId: string, silent = false) => {
    const heistRef = doc(db, 'heists', heistId);
    const heistDoc = await getDoc(heistRef);
    if (!heistDoc.exists()) return;
    const heist = { id: heistDoc.id, ...heistDoc.data() } as Heist;

    const isMember = heist.members.some(m => m.userId === user?.uid && m.status === 'joined');
    if (!isMember) return;

    const joinedMembers = heist.members.filter(m => m.status === 'joined');
    const requiredMembers = heist.type === 'small' ? 5 : 8;

    if (joinedMembers.length < 1) {
      if (!silent) toast.error(t('heists.teamNotFull', { current: joinedMembers.length, required: requiredMembers }));
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const heistDoc = await transaction.get(heistRef);
        if (!heistDoc.exists()) {
          throw new Error("Heist not found");
        }
        if (heistDoc.data().status !== 'recruiting') {
          throw new Error("Heist status is " + heistDoc.data().status);
        }

        // Calculate total power
        const totalPower = joinedMembers.reduce((sum, m) => sum + m.power, 0);
        const requiredPower = heist.type === 'small' ? 500 : 800;
        
        let successChance = Math.floor((totalPower / requiredPower) * 100);
        if (successChance > 100) successChance = 100;

        const roll = Math.random() * 100;
        const isSuccess = roll <= successChance;

        if (isSuccess) {
          const minLoot = heist.type === 'small' ? 500000 : 1000000;
          const maxLoot = heist.type === 'small' ? 2000000 : 5000000;
          const totalLoot = Math.floor(Math.random() * (maxLoot - minLoot + 1)) + minLoot;

          // Fetch all user docs first to satisfy transaction rules
          const userDocs = await Promise.all(
            joinedMembers.map(m => transaction.get(doc(db, 'users', m.userId)))
          );

          // Distribute loot
          joinedMembers.forEach((member, index) => {
            const userDoc = userDocs[index];
            let memberShare = Math.floor(totalLoot * (member.share / 100));
            const userRef = doc(db, 'users', member.userId);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Apply VIP multiplier
              memberShare = Math.floor(memberShare * getVIPMultiplier(userData.vipLevel));

              transaction.update(userRef, {
                dirtyMoney: (userData.dirtyMoney || 0) + memberShare,
                reputation: (userData.reputation || 0) + Math.floor(memberShare / 1000)
              });
              
              // Send message
              const messageRef = doc(collection(db, 'messages'));
              transaction.set(messageRef, {
                senderId: profile.uid,
                senderName: profile.displayName,
                receiverId: member.userId,
                subject: t('heists.success'),
                content: t('heists.successMessage', { amount: formatMoney(memberShare) }),
                read: false,
                type: 'system',
                timestamp: serverTimestamp(),
                createdAt: serverTimestamp()
              });
            }
          });

          transaction.update(heistRef, { status: 'completed' });
        } else {
          for (const member of joinedMembers) {
            // Send message
            const messageRef = doc(collection(db, 'messages'));
            transaction.set(messageRef, {
              senderId: profile.uid,
              senderName: profile.displayName,
              receiverId: member.userId,
              subject: t('heists.failed'),
              content: t('heists.failedMessage'),
              read: false,
              type: 'system',
              timestamp: serverTimestamp(),
              createdAt: serverTimestamp()
            });
          }
          transaction.update(heistRef, { status: 'failed' });
        }
      });

      toast.success(t('heists.heistFinished'));
    } catch (error: any) {
      console.error('Error starting heist:', error);
      let errorMsg = error instanceof Error ? error.message : t('common.unknownError');
      if (errorMsg.includes('The string did not match the expected pattern')) {
        errorMsg = t('errors.patternMismatch');
      }
      toast.error(t('heists.startFailed', { error: errorMsg }));
    }
  };

  const handleInvitePlayer = async (heistId: string, targetId: string, role: string, share: number) => {
    if (!user || !profile) return;

    const heist = heists.find(h => h.id === heistId);
    if (!heist || heist.leaderId !== profile.uid) return;

    try {
      const targetDoc = await getDoc(doc(db, 'users_public', targetId));
      if (!targetDoc.exists()) {
        toast.error(t('common.playerNotFound'));
        return;
      }

      await addDoc(collection(db, 'messages'), {
        senderId: profile.uid,
        senderName: profile.displayName,
        receiverId: targetId,
        subject: t('heists.invitationSubject'),
        content: t('heists.inviteMessage', { leader: profile.displayName, role: t(`heists.${role}`), share }),
        read: false,
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        type: 'heist_invite',
        heistId,
        role,
        share
      });

      toast.success(t('heists.inviteSent'));
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error(t('heists.inviteFailed'));
    }
  };

  const handleAddDummyPlayer = (heistId: string, role: 'driver' | 'lockpicker' | 'armed', share: number) => {
    setShowGearModal({ heistId, role, share, isDummy: true });
  };

  const handleConfirmDummyPlayer = async (heistId: string, role: 'driver' | 'lockpicker' | 'armed', share: number, gear: { weapon?: string, vehicle?: string, armor?: string }) => {
    if (!user || !profile) return;

    const heist = heists.find(h => h.id === heistId);
    if (!heist || heist.leaderId !== profile.uid) return;

    // Calculate gear cost
    let totalCost = 0;
    if (gear.weapon) totalCost += MARKET_ITEMS.weapons.find(w => w.id === gear.weapon)?.price || 0;
    if (gear.vehicle) totalCost += MARKET_ITEMS.cars.find(c => c.id === gear.vehicle)?.price || 0;
    if (gear.armor) totalCost += MARKET_ITEMS.armor.find(a => a.id === gear.armor)?.price || 0;

    if (profile.cleanMoney < totalCost) {
      toast.error(t('heists.notEnoughMoney'));
      return;
    }

    const dummyId = `dummy_${Math.random().toString(36).substr(2, 9)}`;
    const dummyNames = [
      t('heists.dummyNames.shadow'),
      t('heists.dummyNames.ghost'),
      t('heists.dummyNames.silent'),
      t('heists.dummyNames.hunter'),
      t('heists.dummyNames.blade'),
      t('heists.dummyNames.cobra'),
      t('heists.dummyNames.wolf'),
      t('heists.dummyNames.eagle'),
      t('heists.dummyNames.phantom'),
      t('heists.dummyNames.viper')
    ];
    const dummyName = `${dummyNames[Math.floor(Math.random() * dummyNames.length)]} (${t('common.unknown')})`;
    const power = calculatePowerFromGear(gear, true);

    try {
      const userRef = doc(db, 'users', profile.uid);
      const heistRef = doc(db, 'heists', heistId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");
        
        const currentMoney = userDoc.data().cleanMoney || 0;
        if (currentMoney < totalCost) throw new Error(t('heists.notEnoughMoney'));

        transaction.update(userRef, {
          cleanMoney: increment(-totalCost)
        });

        transaction.update(heistRef, {
          members: [...heist.members, {
            userId: dummyId,
            name: dummyName,
            role,
            share,
            status: 'joined',
            power,
            gear
          }]
        });
      });

      setShowGearModal(null);
      setSelectedGear({});
      toast.success(t('heists.dummyAdded'));
      
      // Check if full
      const requiredMembers = heist.type === 'small' ? 5 : 8;
      const joinedMembers = [...heist.members, { userId: dummyId, status: 'joined' }].filter(m => m.status === 'joined');
      if (joinedMembers.length === requiredMembers) {
        toast.success(t('heists.teamFull'));
      }
    } catch (error: any) {
      console.error('Error adding dummy player:', error);
      toast.error(error.message || t('heists.failedToAddDummy'));
    }
  };

  const handleRemoveMember = async (heistId: string, userId: string) => {
    const heist = heists.find(h => h.id === heistId);
    if (!heist || heist.leaderId !== user?.uid) return;

    const updatedMembers = heist.members.filter(m => m.userId !== userId);

    try {
      await updateDoc(doc(db, 'heists', heistId), {
        members: updatedMembers
      });
      toast.success(t('heists.memberRemoved'));
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(t('heists.removeMemberFailed'));
    }
  };

  const handleDisbandTeam = async (heistId: string) => {
    const heist = heists.find(h => h.id === heistId);
    if (!heist || heist.leaderId !== user?.uid) return;

    try {
      await updateDoc(doc(db, 'heists', heistId), {
        status: 'failed'
      });
      toast.success(t('heists.disbandTeam'));
    } catch (error) {
      console.error('Error disbanding team:', error);
      toast.error(t('heists.disbandFailed'));
    }
  };

  const getRoleCount = (heist: Heist, role: string, status?: 'joined' | 'pending') => {
    return heist.members.filter(m => m.role === role && (!status || m.status === status)).length;
  };

  const getRequiredRoleCount = (type: 'small' | 'large', role: string) => {
    if (type === 'small') {
      if (role === 'driver') return 1;
      if (role === 'lockpicker') return 1;
      if (role === 'armed') return 2;
    } else {
      if (role === 'driver') return 2;
      if (role === 'lockpicker') return 1;
      if (role === 'armed') return 4;
    }
    return 0;
  };

  const renderRoleSlot = (heist: Heist, role: 'driver' | 'lockpicker' | 'armed', icon: any, label: string) => {
    const required = getRequiredRoleCount(heist.type, role);
    const joined = getRoleCount(heist, role, 'joined');
    const pending = heist.members.filter(m => m.role === role && m.status === 'pending');
    const share = heist.shares[role];

    const slots = [];
    for (let i = 0; i < required; i++) {
      const joinedMember = heist.members.filter(m => m.role === role && m.status === 'joined')[i];
      const myPendingMember = heist.members.find(m => m.role === role && m.status === 'pending' && m.userId === user?.uid);
      
      if (joinedMember) {
        const isLeader = heist.leaderId === user?.uid;
        const isSelf = joinedMember.userId === user?.uid;

        // Get gear name
        let gearName = '';
        if (joinedMember.gear) {
          if (role === 'driver' && joinedMember.gear.vehicle) {
            gearName = t(`items.${joinedMember.gear.vehicle}`);
          } else if (role === 'lockpicker' && joinedMember.gear.weapon) { // Using weapon field for tool ID to keep interface simple
            gearName = t(`items.${joinedMember.gear.weapon}`);
          } else if (role === 'armed' && joinedMember.gear.weapon) {
            gearName = t(`items.${joinedMember.gear.weapon}`);
          }
        }

        slots.push(
          <div key={`${role}-${i}`} className="flex flex-col bg-zinc-800/50 p-2 rounded border border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm font-medium">{joinedMember.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400">{share}%</span>
                {isLeader && !isSelf && (
                  <button 
                    onClick={() => handleRemoveMember(heist.id, joinedMember.userId)}
                    className="p-1 text-zinc-500 hover:text-red-500 transition-colors"
                    title={t('heists.removeMember')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            {gearName && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 italic">
                <ShieldAlert size={10} />
                <span>{gearName}</span>
              </div>
            )}
          </div>
        );
      } else if (myPendingMember && i === joined) {
        slots.push(
          <div key={`${role}-${i}`} className="flex items-center justify-between bg-zinc-800/30 p-2 rounded border border-zinc-700 border-dashed">
            <div className="flex items-center gap-2 text-zinc-400">
              {icon}
              <span className="text-sm italic">{myPendingMember.name} ({t('heists.pending')})</span>
            </div>
            <span className="text-xs text-zinc-500">{share}%</span>
          </div>
        );
      } else {
        const isLeader = heist.leaderId === user?.uid;
        const canJoin = !isLeader && !heist.members.some(m => m.userId === user?.uid);

        slots.push(
          <div key={`${role}-${i}`} className="flex flex-col gap-2 bg-zinc-900/50 p-2 rounded border border-zinc-800 border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500">
                {icon}
                <span className="text-sm">{label}</span>
              </div>
              <span className="text-xs text-zinc-400">{share}%</span>
            </div>
            
            {isLeader && pending.length > 0 && i === joined && (
              <div className="mt-2 space-y-2">
                {pending.map(p => (
                  <div key={p.userId} className="flex items-center justify-between bg-zinc-800 p-2 rounded text-xs">
                    <span>{p.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleApproveMember(heist.id, p.userId)} className="p-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30">
                        <Check size={14} />
                      </button>
                      <button onClick={() => handleRejectMember(heist.id, p.userId)} className="p-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30">
                        <CloseIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isLeader && i === joined && (
              <div className="flex flex-col gap-1 mt-1">
                <button 
                  onClick={() => setShowInviteModal({ heistId: heist.id, role, share })}
                  className="w-full py-1 text-xs bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded transition-colors"
                >
                  {t('heists.sendInvite')}
                </button>
                <button 
                  onClick={() => handleAddDummyPlayer(heist.id, role, share)}
                  className="w-full py-1 text-xs bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 rounded transition-colors"
                >
                  {t('heists.addDummy')}
                </button>
              </div>
            )}

            {canJoin && i === joined && (
              <button 
                onClick={() => setShowGearModal({ heistId: heist.id, role, share })}
                className="w-full py-1 mt-1 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors"
              >
                {t('heists.join')}
              </button>
            )}
          </div>
        );
      }
    }
    return slots;
  };

  const InviteModal = () => {
    if (!showInviteModal) return null;
    return (
      <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{t('heists.sendInvite')}</h2>
            <button onClick={() => setShowInviteModal(null)} className="text-zinc-500 hover:text-white">
              <CloseIcon size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('heists.searchPlayer')}
                className="w-full bg-black border border-zinc-800 rounded-xl ps-10 pe-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
              {isSearching && (
                <div className="absolute end-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      handleInvitePlayer(showInviteModal.heistId, player.id, showInviteModal.role, showInviteModal.share);
                      setShowInviteModal(null);
                      setSearchTerm('');
                      setSearchResults([]);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                        <img src={player.photoURL || `https://picsum.photos/seed/${player.id}/32/32`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold player-name-script">{player.displayName}</span>
                    </div>
                    <span className="text-xs text-red-500 font-bold uppercase tracking-widest">{t('heists.invite')}</span>
                  </button>
                ))
              ) : searchTerm.trim().length > 0 && !isSearching ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  {t('heists.noPlayersFound')}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm italic">
                  {t('heists.startTypingToSearch')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <InviteModal />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 flex items-center gap-3">
            <VenetianMask className="text-red-500" size={32} />
            {t('heists.title')}
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
        >
          <Plus size={20} />
          {t('heists.createTeam')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-red-500" />
            {t('heists.activeTeams')}
          </h2>
          
          {heists.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              {t('heists.noTeams')}
            </div>
          ) : (
            <div className="grid gap-4">
              {heists.map(heist => {
                const totalJoined = heist.members.filter(m => m.status === 'joined').length;
                const requiredMembers = heist.type === 'small' ? 5 : 8;
                const isLeader = heist.leaderId === user?.uid;
                const isMember = heist.members.some(m => m.userId === user?.uid && m.status === 'joined');
                const totalPower = heist.members.filter(m => m.status === 'joined').reduce((sum, m) => sum + m.power, 0);
                const maxPower = heist.type === 'small' ? 12760 : 35450;
                let successChance = Math.floor((totalPower / maxPower) * 100);
                if (successChance > 100) successChance = 100;
                const powerDisplay = `${totalPower}/${maxPower}`;

                return (
                  <div key={heist.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {t('heists.teamName', { name: heist.leaderName })}
                          <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">
                            {t('heists.membersCount', { count: heist.type === 'small' ? 5 : 8 })}
                          </span>
                        </h3>
                        <div className="text-sm text-zinc-500 mt-1">
                          {totalJoined} / {requiredMembers} {t('heists.members')}
                        </div>
                      </div>
                      {(isLeader || isMember) && (
                        <div className="flex gap-2">
                          {isLeader && (
                            <button
                              onClick={() => handleDisbandTeam(heist.id)}
                              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-500 rounded-lg font-bold transition-colors"
                            >
                              {t('heists.disbandTeam')}
                            </button>
                          )}
                          {totalJoined >= 1 && (
                            <button
                              onClick={() => handleStartHeist(heist.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors animate-pulse"
                            >
                              <Play size={18} />
                              {t('heists.startHeist')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Leader Slot */}
                      <div className="flex items-center justify-between bg-red-500/10 p-2 rounded border border-red-500/20">
                        <div className="flex items-center gap-2">
                          <Target size={16} className="text-red-500" />
                          <span className="text-sm font-bold text-red-500">{heist.leaderName} ({t('heists.leader')})</span>
                        </div>
                        <span className="text-xs text-green-400 font-bold">{heist.members.find(m => m.role === 'leader')?.share}%</span>
                      </div>

                      {renderRoleSlot(heist, 'driver', <Car size={16} />, t('heists.driver'))}
                      {renderRoleSlot(heist, 'lockpicker', <Key size={16} />, t('heists.lockpicker'))}
                      {renderRoleSlot(heist, 'armed', <Crosshair size={16} />, t('heists.armed'))}
                    </div>

                    {(isLeader || isMember) && (
                      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-sm">
                        <div className="text-zinc-400">
                          {t('heists.power', { power: powerDisplay, required: '' })}
                        </div>
                        <div className={clsx(
                          "font-bold",
                          successChance >= 80 ? "text-green-500" : successChance >= 50 ? "text-yellow-500" : "text-red-500"
                        )}>
                          {successChance}% {t('heists.success')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <AlertCircle className="text-blue-500" />
              {t('heists.instructions')}
            </h2>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                {t('heists.inst1')}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                {t('heists.inst2')}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                {t('heists.inst3')}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                {t('heists.inst4')}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                {t('heists.inst5')}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Heist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t('heists.createTeam')}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                <CloseIcon size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('heists.type')}</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setHeistType('small')}
                      className={clsx(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        heistType === 'small' ? "border-red-500 bg-red-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      )}
                    >
                      <div className="font-bold">{t('heists.smallHeist')}</div>
                      <div className="text-xs text-zinc-500">{t('heists.smallHeistDesc')}</div>
                    </button>
                    <button
                      onClick={() => setHeistType('large')}
                      className={clsx(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        heistType === 'large' ? "border-red-500 bg-red-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      )}
                    >
                      <div className="font-bold">{t('heists.largeHeist')}</div>
                      <div className="text-xs text-zinc-500">{t('heists.largeHeistDesc')}</div>
                    </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-zinc-400">{t('heists.shares')}</label>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-sm">{t('heists.driverShare')}</span>
                    <input
                      type="number"
                      value={shares.driver}
                      onChange={(e) => setShares({ ...shares, driver: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-black border border-zinc-700 rounded px-2 py-1 text-sm text-center"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-sm">{t('heists.lockpickerShare')}</span>
                    <input
                      type="number"
                      value={shares.lockpicker}
                      onChange={(e) => setShares({ ...shares, lockpicker: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-black border border-zinc-700 rounded px-2 py-1 text-sm text-center"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <span className="text-sm">{t('heists.armedShare')}</span>
                    <input
                      type="number"
                      value={shares.armed}
                      onChange={(e) => setShares({ ...shares, armed: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-black border border-zinc-700 rounded px-2 py-1 text-sm text-center"
                    />
                  </div>
                </div>
                <div className="text-xs text-zinc-500 text-center">
                  {t('heists.leaderShare')} <span className="text-red-500 font-bold">{calculateLeaderShare()}%</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const leaderShare = calculateLeaderShare();
                  setShowGearModal({ heistId: 'new', role: 'leader', share: leaderShare, isLeader: true });
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20"
              >
                {t('heists.createTeam')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gear Selection Modal */}
      {showGearModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">{t('heists.selectGear')}</h2>
                <p className="text-sm text-zinc-500">{t('heists.selectGearDesc')}</p>
              </div>
              <button onClick={() => setShowGearModal(null)} className="text-zinc-500 hover:text-white">
                <CloseIcon size={24} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Role Specific Gear */}
              {showGearModal.role === 'armed' && (
                <section>
                  <h3 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <Crosshair size={16} className="text-red-500" />
                    {t('heists.weaponsArsenal')}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MARKET_ITEMS.weapons.map(item => {
                      const isOwned = (profile?.inventory?.weapons?.[item.id] || 0) > 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedGear(prev => ({ ...prev, weapon: item.id }))}
                          className={clsx(
                            "p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                            selectedGear.weapon === item.id ? "border-red-500 bg-red-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                          )}
                        >
                          <div className="font-bold text-sm truncate">{t(`items.${item.id}`)}</div>
                          <div className="text-[10px] text-zinc-500">{t('heists.powerValue', { power: item.power })}</div>
                          {!isOwned && !showGearModal.isDummy && (
                            <div className="text-[10px] text-green-500">${formatMoney(item.price)} ({t('heists.buy')})</div>
                          )}
                          {isOwned && !showGearModal.isDummy && (
                            <div className="text-[10px] text-blue-500">({t('heists.owned')})</div>
                          )}
                          {showGearModal.isDummy && (
                            <div className="text-[10px] text-green-500">${formatMoney(item.price)}</div>
                          )}
                          {selectedGear.weapon === item.id && <div className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5"><Check size={10} /></div>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {showGearModal.role === 'driver' && (
                <section>
                  <h3 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <Car size={16} className="text-blue-500" />
                    {t('heists.armorEquipment')}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MARKET_ITEMS.cars.map(item => {
                      const isOwned = (profile?.inventory?.cars?.[item.id] || 0) > 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedGear(prev => ({ ...prev, vehicle: item.id }))}
                          className={clsx(
                            "p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                            selectedGear.vehicle === item.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                          )}
                        >
                          <div className="font-bold text-sm truncate">{t(`items.${item.id}`)}</div>
                          <div className="text-[10px] text-zinc-500">{t('heists.powerValue', { power: item.power })}</div>
                          {!isOwned && !showGearModal.isDummy && (
                            <div className="text-[10px] text-green-500">${formatMoney(item.price)} ({t('heists.buy')})</div>
                          )}
                          {isOwned && !showGearModal.isDummy && (
                            <div className="text-[10px] text-blue-500">({t('heists.owned')})</div>
                          )}
                          {showGearModal.isDummy && (
                            <div className="text-[10px] text-green-500">${formatMoney(item.price)}</div>
                          )}
                          {selectedGear.vehicle === item.id && <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5"><Check size={10} /></div>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {showGearModal.role === 'lockpicker' && (
                <section>
                  <h3 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <Key size={16} className="text-yellow-500" />
                    {t('heists.heistTools')}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MARKET_ITEMS.tools.map(item => {
                      const isOwned = (profile?.inventory?.tools?.[item.id] || 0) > 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedGear(prev => ({ ...prev, weapon: item.id }))} // Reusing weapon field for tool ID
                          className={clsx(
                            "p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                            selectedGear.weapon === item.id ? "border-yellow-500 bg-yellow-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                          )}
                        >
                          <div className="font-bold text-sm truncate">{t(`items.${item.id}`)}</div>
                          {!isOwned && !showGearModal.isDummy && (
                            <div className="text-[10px] text-green-500">${formatMoney(item.price)} ({t('heists.buy')})</div>
                          )}
                          {isOwned && !showGearModal.isDummy && (
                            <div className="text-[10px] text-blue-500">({t('heists.owned')})</div>
                          )}
                          {showGearModal.isDummy && (
                            <div className="text-[10px] text-green-500">${formatMoney(item.price)}</div>
                          )}
                          {selectedGear.weapon === item.id && <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-0.5"><Check size={10} /></div>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {showGearModal.role === 'leader' && (
                <>
                  {/* Leader can pick anything or just weapon/armor as default */}
                  <section>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <Crosshair size={16} className="text-red-500" />
                      {t('heists.weaponsArsenal')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {MARKET_ITEMS.weapons.map(item => {
                        const isOwned = (profile?.inventory?.weapons?.[item.id] || 0) > 0;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedGear(prev => ({ ...prev, weapon: item.id }))}
                            className={clsx(
                              "p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                              selectedGear.weapon === item.id ? "border-red-500 bg-red-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                            )}
                          >
                            <div className="font-bold text-sm truncate">{t(`items.${item.id}`)}</div>
                            <div className="text-[10px] text-zinc-500">{t('heists.powerValue', { power: item.power })}</div>
                            {!isOwned && (
                              <div className="text-[10px] text-green-500">${formatMoney(item.price)} ({t('heists.buy')})</div>
                            )}
                            {isOwned && (
                              <div className="text-[10px] text-blue-500">({t('heists.owned')})</div>
                            )}
                            {selectedGear.weapon === item.id && <div className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5"><Check size={10} /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <ShieldAlert size={16} className="text-green-500" />
                      {t('heists.armorEquipment')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {MARKET_ITEMS.armor.map(item => {
                        const isOwned = (profile?.inventory?.armor?.[item.id] || 0) > 0;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedGear(prev => ({ ...prev, armor: item.id }))}
                            className={clsx(
                              "p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                              selectedGear.armor === item.id ? "border-green-500 bg-green-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                            )}
                          >
                            <div className="font-bold text-sm truncate">{t(`items.${item.id}`)}</div>
                            <div className="text-[10px] text-zinc-500">{t('heists.powerValue', { power: item.power })}</div>
                            {!isOwned && (
                              <div className="text-[10px] text-green-500">${formatMoney(item.price)} ({t('heists.buy')})</div>
                            )}
                            {isOwned && (
                              <div className="text-[10px] text-blue-500">({t('heists.owned')})</div>
                            )}
                            {selectedGear.armor === item.id && <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><Check size={10} /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}

              <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex gap-8">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">{t('heists.estimatedPower')}</div>
                    <div className="text-2xl font-black text-white">{calculatePowerFromGear(selectedGear, showGearModal.isDummy)}</div>
                  </div>
                  {(showGearModal.isDummy || !showGearModal.isLeader) && (
                    <div>
                      <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">{t('heists.totalCost')}</div>
                      <div className="text-2xl font-black text-green-500">
                        ${formatMoney(
                          (() => {
                            let cost = 0;
                            const inventory = profile?.inventory || {};
                            if (showGearModal.isDummy) {
                              if (selectedGear.weapon) {
                                if (showGearModal.role === 'lockpicker') {
                                  cost += MARKET_ITEMS.tools.find(t => t.id === selectedGear.weapon)?.price || 0;
                                } else {
                                  cost += MARKET_ITEMS.weapons.find(w => w.id === selectedGear.weapon)?.price || 0;
                                }
                              }
                              if (selectedGear.vehicle) cost += MARKET_ITEMS.cars.find(c => c.id === selectedGear.vehicle)?.price || 0;
                              if (selectedGear.armor) cost += MARKET_ITEMS.armor.find(a => a.id === selectedGear.armor)?.price || 0;
                            } else {
                              // For real players, only count if not owned
                              const inventory = (profile?.inventory || {}) as any;
                              if (selectedGear.weapon && showGearModal.role === 'armed' && !(inventory.weapons?.[selectedGear.weapon] > 0)) {
                                cost += MARKET_ITEMS.weapons.find(w => w.id === selectedGear.weapon)?.price || 0;
                              }
                              if (selectedGear.weapon && showGearModal.role === 'lockpicker' && !(inventory.tools?.[selectedGear.weapon] > 0)) {
                                cost += MARKET_ITEMS.tools.find(t => t.id === selectedGear.weapon)?.price || 0;
                              }
                              if (selectedGear.vehicle && showGearModal.role === 'driver' && !(inventory.cars?.[selectedGear.vehicle] > 0)) {
                                cost += MARKET_ITEMS.cars.find(c => c.id === selectedGear.vehicle)?.price || 0;
                              }
                              if (selectedGear.armor && showGearModal.role === 'leader' && !(inventory.armor?.[selectedGear.armor] > 0)) {
                                cost += MARKET_ITEMS.armor.find(a => a.id === selectedGear.armor)?.price || 0;
                              }
                              if (selectedGear.weapon && showGearModal.role === 'leader' && !(inventory.weapons?.[selectedGear.weapon] > 0)) {
                                cost += MARKET_ITEMS.weapons.find(w => w.id === selectedGear.weapon)?.price || 0;
                              }
                            }
                            return cost;
                          })()
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (showGearModal.isDummy) {
                      handleConfirmDummyPlayer(showGearModal.heistId, showGearModal.role as 'driver' | 'lockpicker' | 'armed', showGearModal.share, selectedGear);
                    } else if (showGearModal.isLeader) {
                      handleCreateHeist();
                    } else {
                      handleJoinHeist(showGearModal.heistId, showGearModal.role, showGearModal.share, selectedGear);
                    }
                  }}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20"
                >
                  {showGearModal.isDummy ? t('heists.addDummy') : showGearModal.isLeader ? t('heists.createTeam') : t('heists.join')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
