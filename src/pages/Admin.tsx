import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp, runTransaction, writeBatch, increment, addDoc, arrayRemove } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore, UserProfile } from '../store/useAuthStore';
import { ShieldCheck, Edit2, Trash2, X, Save, Plus, Vote, Power, Timer, CheckCircle, Megaphone, Send, Users, UserMinus, Database, RefreshCw, Download, Search, Activity, BarChart3, Eye, Upload, Link, AlertTriangle, MoreVertical, UserPlus, ShieldAlert, Ban, Check, Globe, Calendar, Camera, CreditCard, Award, Siren, ChevronRight, Edit3, Dumbbell, Wind, FileText, Shield, User, DollarSign, Building2, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney, formatDate, getRealisticAvatar } from '../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { COUNTRIES } from '../constants/countries';

export default function Admin() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [govData, setGovData] = useState<any>(null);
  const [gangs, setGangs] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [targetPMId, setTargetPMId] = useState('');
  const [distStatus, setDistStatus] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'government' | 'gangs' | 'database'>('overview');
  const [startingMoney, setStartingMoney] = useState<number>(5000000);
  const [isSavingMoney, setIsSavingMoney] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'basic' | 'financial' | 'combat' | 'properties' | 'stats' | 'family'>('basic');
  const [viewingGangMembers, setViewingGangMembers] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [databaseRestoreFile, setDatabaseRestoreFile] = useState<File | null>(null);
  const [resetGangUser, setResetGangUser] = useState<UserProfile | null>(null);
  const [deletingGang, setDeletingGang] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<{gangId: string, memberId: string, memberName: string} | null>(null);
  const [linkingUser, setLinkingUser] = useState<UserProfile | null>(null);
  const [messagingUser, setMessagingUser] = useState<UserProfile | null>(null);
  const [directMessage, setDirectMessage] = useState('');
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [gangSearch, setGangSearch] = useState('');
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);

  const isAdmin = profile?.role === 'Admin' && (user?.email === 'm07821779969@gmail.com' || user?.email === 'soft4net2016@gmail.com' || user?.email === 'imvu2024k@gmail.com');

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(usersData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  const fetchGangs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'gangs'));
      const gangsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGangs(gangsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'gangs');
    }
  };

  const fetchGovData = async () => {
    try {
      const docRef = doc(db, 'government', 'current');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGovData(docSnap.data());
      } else {
        // Initialize if not exists
        const initialGov = {
          primeMinisterId: '',
          primeMinisterName: '',
          primeMinisterGangId: '',
          parliamentSeats: 100,
          gangSeats: {},
          electionTimestamp: new Date().toISOString(),
          electionActive: false,
          candidates: [],
          electedMPs: []
        };
        await setDoc(docRef, initialGov);
        setGovData(initialGov);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const docRef = doc(db, 'server_settings', 'backup');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSyncStatus(data);
        if (data.startingMoney !== undefined) {
          setStartingMoney(data.startingMoney);
        }
      } else {
        setSyncStatus({ needsInitialSync: true });
      }
    } catch (error) {
      console.error("Error fetching sync status", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchGovData();
      fetchGangs();
      fetchSyncStatus();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !govData) return;
    
    const updateDistStatus = () => {
      const now = new Date();
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadNow = new Date(now.getTime() + baghdadOffset);
      const todayBaghdad = baghdadNow.toISOString().split('T')[0];
      const baghdadTime = baghdadNow.toISOString().split('T')[1].split('.')[0];
      
      setDistStatus({
        lastDistribution: govData.lastDistributionDate,
        forceDistribution: govData.forceDistribution,
        baghdadTime,
        shouldRun: govData.lastDistributionDate !== todayBaghdad || govData.forceDistribution === true
      });
    };

    updateDistStatus();
    const interval = setInterval(updateDistStatus, 1000);
    return () => clearInterval(interval);
  }, [isAdmin, govData]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    toast.info('جاري تحديث ومزامنة جميع بيانات اللعبة...');
    try {
      const now = new Date();
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadNow = new Date(now.getTime() + baghdadOffset);
      const todayBaghdad = baghdadNow.toISOString().split('T')[0];
      const baghdadTime = baghdadNow.toISOString().split('T')[1].split('.')[0];

      // 1. Sync all public profiles to ensure consistency
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id })) as UserProfile[];
      
      let batch = writeBatch(db);
      let opCount = 0;

      for (const u of allUsers) {
        const wealth = (u.cleanMoney || 0) + (u.dirtyMoney || 0) + (u.bankBalance || 0) + (u.dirtyVaultBalance || 0);
        const publicData = {
          uid: u.uid,
          displayName: u.displayName || 'Unknown',
          photoURL: u.photoURL || null,
          level: u.level || 1,
          role: u.role || 'User',
          reputation: u.reputation || 0,
          gangId: u.gangId || null,
          gangName: u.gangName || null,
          gangRole: u.gangRole || null,
          city: u.city || 'baghdad',
          wealth: wealth,
          kills: u.crimes?.kills || 0,
          hospitalizedUntil: u.hospitalizedUntil || null,
          createdAt: u.createdAt || null,
          ownedTiles: u.ownedTiles || {},
          land: u.land || {},
          isImprisoned: u.isImprisoned || false,
          jailTimeEnd: u.jailTimeEnd || null,
          wantedStars: u.wantedStars || 0,
          country: u.country || 'iq'
        };
        batch.set(doc(db, 'users_public', u.uid), publicData, { merge: true });
        opCount++;

        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      const syncData = {
        lastSync: serverTimestamp(),
        lastSyncTimeMs: now.getTime(),
        lastSyncString: `${todayBaghdad} ${baghdadTime}`,
        totalUsers: allUsers.length,
        totalGangs: gangs.length,
        status: 'Full Sync Completed'
      };

      await setDoc(doc(db, 'server_settings', 'backup'), syncData);
      setSyncStatus(syncData);
      
      // Also trigger a full backup export automatically if requested
      // handleExportDatabase(); // This would trigger a download, maybe not automatic?
      
      toast.success('تم تحديث ومزامنة جميع بيانات اللعبة بنجاح');
      fetchUsers();
      fetchGangs();
    } catch (error) {
      console.error("Error syncing database", error);
      toast.error('حدث خطأ أثناء تحديث قاعدة البيانات');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreOldAccount = async () => {
    const currentAdminEmail = auth.currentUser?.email;
    const currentAdminUid = profile?.uid;

    if (!currentAdminEmail || !currentAdminUid) {
      toast.error('لم يتم العثور على بيانات حسابك الحالي.');
      return;
    }

    // Try to find by email first (case insensitive)
    const oldAccount = users.find(u => 
      u.email?.toLowerCase() === currentAdminEmail.toLowerCase() && 
      u.uid !== currentAdminUid
    );

    if (!oldAccount) {
      toast.info('لم يتم العثور على حساب قديم بنفس البريد الإلكتروني. يمكنك ربط حسابك يدوياً من قائمة اللاعبين.');
      return;
    }

    setShowRestoreConfirm(true);
  };

  const handleLinkToMyAccount = async (targetUser: UserProfile) => {
    const currentAdminUid = profile?.uid;
    if (!currentAdminUid) {
      toast.error('لم يتم العثور على بيانات حسابك الحالي.');
      return;
    }

    if (targetUser.uid === currentAdminUid) {
      toast.info('هذا هو حسابك الحالي بالفعل.');
      return;
    }

    setLinkingUser(targetUser);
  };

  const executeLinkAccount = async () => {
    if (!linkingUser) return;
    setLinkingUser(null);
    
    const currentAdminUid = profile?.uid;
    if (!currentAdminUid) return;

    setIsSyncing(true);
    toast.info('جاري ربط الحساب...');

    try {
      const oldUid = linkingUser.uid;
      const batch = writeBatch(db);

      // 1. Copy old account data to current account
      const { uid, ...oldData } = linkingUser;
      batch.set(doc(db, 'users', currentAdminUid), { ...oldData, uid: currentAdminUid });

      // 2. Update users_public for current account
      const publicData = {
        displayName: oldData.displayName || 'Unknown',
        level: oldData.level || 1,
        role: oldData.role || 'User',
        photoURL: oldData.photoURL || null,
        gangId: oldData.gangId || null,
        gangName: oldData.gangName || null,
        gangRole: oldData.gangRole || null,
        reputation: oldData.reputation || 0,
        city: oldData.city || 'baghdad',
        isImprisoned: oldData.isImprisoned || false,
        jailTimeEnd: oldData.jailTimeEnd || null,
        wantedStars: oldData.wantedStars || 0,
        ownedTiles: oldData.ownedTiles || {},
        land: oldData.land || {},
        cleanMoney: oldData.cleanMoney || 0,
        dirtyMoney: oldData.dirtyMoney || 0
      };
      batch.set(doc(db, 'users_public', currentAdminUid), publicData, { merge: true });

      // 3. Delete old account
      batch.delete(doc(db, 'users', oldUid));
      batch.delete(doc(db, 'users_public', oldUid));

      // 4. Update Gangs
      for (const gang of gangs) {
        let gangUpdated = false;
        const gangUpdates: any = {};

        if (gang.leaderId === oldUid) {
          gangUpdates.leaderId = currentAdminUid;
          gangUpdates.leaderName = oldData.displayName || 'Unknown';
          gangUpdated = true;
        }

        if (gang.members?.includes(oldUid)) {
          gangUpdates.members = gang.members.map((m: string) => m === oldUid ? currentAdminUid : m);
          gangUpdated = true;
        }

        if (gang.memberRanks && gang.memberRanks[oldUid]) {
          const newRanks = { ...gang.memberRanks };
          const rank = newRanks[oldUid];
          delete newRanks[oldUid];
          newRanks[currentAdminUid] = rank;
          gangUpdates.memberRanks = newRanks;
          gangUpdated = true;
        }

        if (gangUpdated) {
          batch.update(doc(db, 'gangs', gang.id), gangUpdates);
        }
      }

      // 5. Update Government
      if (govData) {
        let govUpdated = false;
        const govUpdates: any = {};

        if (govData.presidentId === oldUid) {
          govUpdates.presidentId = currentAdminUid;
          govUpdated = true;
        }

        if (govData.ministers) {
          const newMinisters = { ...govData.ministers };
          let ministersChanged = false;
          for (const [role, ministerUid] of Object.entries(newMinisters)) {
            if (ministerUid === oldUid) {
              newMinisters[role] = currentAdminUid;
              ministersChanged = true;
            }
          }
          if (ministersChanged) {
            govUpdates.ministers = newMinisters;
            govUpdated = true;
          }
        }

        if (govUpdated) {
          batch.update(doc(db, 'government', 'current'), govUpdates);
        }
      }

      // 6. Update Bounties
      const bountiesSnapshot = await getDocs(collection(db, 'bounties'));
      bountiesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let updated = false;
        const updates: any = {};
        if (data.targetId === oldUid) {
          updates.targetId = currentAdminUid;
          updated = true;
        }
        if (data.posterId === oldUid) {
          updates.posterId = currentAdminUid;
          updated = true;
        }
        if (updated) {
          batch.update(doc.ref, updates);
        }
      });

      // 7. Update Messages
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      messagesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let updated = false;
        const updates: any = {};
        if (data.senderId === oldUid) {
          updates.senderId = currentAdminUid;
          updated = true;
        }
        if (data.receiverId === oldUid) {
          updates.receiverId = currentAdminUid;
          updated = true;
        }
        if (updated) {
          batch.update(doc.ref, updates);
        }
      });

      // 8. Update Heists
      const heistsSnapshot = await getDocs(collection(db, 'heists'));
      heistsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let updated = false;
        const updates: any = {};
        if (data.leaderId === oldUid) {
          updates.leaderId = currentAdminUid;
          updated = true;
        }
        if (data.members) {
          const newMembers = data.members.map((m: any) => m.userId === oldUid ? { ...m, userId: currentAdminUid } : m);
          if (JSON.stringify(newMembers) !== JSON.stringify(data.members)) {
            updates.members = newMembers;
            updated = true;
          }
        }
        if (updated) {
          batch.update(doc.ref, updates);
        }
      });

      await batch.commit();
      toast.success('تم ربط الحساب بنجاح. يرجى تحديث الصفحة.');
      
      // Update local state
      setUsers(users.map(u => u.uid === currentAdminUid ? { ...u, ...oldData, uid: currentAdminUid } : u).filter(u => u.uid !== oldUid));

    } catch (error) {
      console.error("Error linking account", error);
      toast.error('حدث خطأ أثناء ربط الحساب.');
    } finally {
      setIsSyncing(false);
    }
  };

  const executeRestoreOldAccount = async () => {
    setShowRestoreConfirm(false);
    const currentAdminEmail = auth.currentUser?.email;
    const currentAdminUid = profile?.uid;

    if (!currentAdminEmail || !currentAdminUid) return;

    const oldAccount = users.find(u => u.email === currentAdminEmail && u.uid !== currentAdminUid);
    if (!oldAccount) return;

    setIsSyncing(true);
    toast.info('جاري استعادة الحساب القديم...');

    try {
      const oldUid = oldAccount.uid;
      const batch = writeBatch(db);

      // 1. Copy old account data to current account
      const { uid, ...oldData } = oldAccount;
      batch.set(doc(db, 'users', currentAdminUid), { ...oldData, uid: currentAdminUid });

      // 2. Update users_public for current account
      const publicData = {
        displayName: oldData.displayName || 'Unknown',
        level: oldData.level || 1,
        role: oldData.role || 'User',
        photoURL: oldData.photoURL || null,
        gangId: oldData.gangId || null,
        gangName: oldData.gangName || null,
        gangRole: oldData.gangRole || null,
        reputation: oldData.reputation || 0,
        city: oldData.city || 'baghdad',
        isImprisoned: oldData.isImprisoned || false,
        jailTimeEnd: oldData.jailTimeEnd || null,
        wantedStars: oldData.wantedStars || 0,
        ownedTiles: oldData.ownedTiles || {},
        land: oldData.land || {},
        cleanMoney: oldData.cleanMoney || 0,
        dirtyMoney: oldData.dirtyMoney || 0
      };
      batch.set(doc(db, 'users_public', currentAdminUid), publicData, { merge: true });

      // 3. Delete old account
      batch.delete(doc(db, 'users', oldUid));
      batch.delete(doc(db, 'users_public', oldUid));

      // 4. Update Gangs
      for (const gang of gangs) {
        let gangUpdated = false;
        const gangUpdates: any = {};

        if (gang.leaderId === oldUid) {
          gangUpdates.leaderId = currentAdminUid;
          gangUpdates.leaderName = oldData.displayName || 'Unknown';
          gangUpdated = true;
        }

        if (gang.members?.includes(oldUid)) {
          gangUpdates.members = gang.members.map((m: string) => m === oldUid ? currentAdminUid : m);
          gangUpdated = true;
        }

        if (gang.memberRanks && gang.memberRanks[oldUid]) {
          const newRanks = { ...gang.memberRanks };
          const rank = newRanks[oldUid];
          delete newRanks[oldUid];
          newRanks[currentAdminUid] = rank;
          gangUpdates.memberRanks = newRanks;
          gangUpdated = true;
        }

        if (gangUpdated) {
          batch.update(doc(db, 'gangs', gang.id), gangUpdates);
        }
      }

      // 5. Update Government
      if (govData) {
        let govUpdated = false;
        const govUpdates: any = {};

        if (govData.presidentId === oldUid) {
          govUpdates.presidentId = currentAdminUid;
          govUpdated = true;
        }

        if (govData.ministers) {
          const newMinisters = { ...govData.ministers };
          let ministersChanged = false;
          for (const [role, ministerUid] of Object.entries(newMinisters)) {
            if (ministerUid === oldUid) {
              newMinisters[role] = currentAdminUid;
              ministersChanged = true;
            }
          }
          if (ministersChanged) {
            govUpdates.ministers = newMinisters;
            govUpdated = true;
          }
        }

        if (govUpdated) {
          batch.update(doc(db, 'government', 'current'), govUpdates);
        }
      }

      // 6. Update Bounties
      const bountiesSnapshot = await getDocs(collection(db, 'bounties'));
      bountiesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let updated = false;
        const updates: any = {};
        if (data.targetId === oldUid) {
          updates.targetId = currentAdminUid;
          updated = true;
        }
        if (data.posterId === oldUid) {
          updates.posterId = currentAdminUid;
          updated = true;
        }
        if (updated) {
          batch.update(doc.ref, updates);
        }
      });

      // 7. Update Messages
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      messagesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let updated = false;
        const updates: any = {};
        if (data.senderId === oldUid) {
          updates.senderId = currentAdminUid;
          updated = true;
        }
        if (data.receiverId === oldUid) {
          updates.receiverId = currentAdminUid;
          updated = true;
        }
        if (updated) {
          batch.update(doc.ref, updates);
        }
      });

      // 8. Update Heists
      const heistsSnapshot = await getDocs(collection(db, 'heists'));
      heistsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let updated = false;
        const updates: any = {};
        if (data.leaderId === oldUid) {
          updates.leaderId = currentAdminUid;
          updated = true;
        }
        if (data.members) {
          const newMembers = data.members.map((m: any) => m.userId === oldUid ? { ...m, userId: currentAdminUid } : m);
          if (JSON.stringify(newMembers) !== JSON.stringify(data.members)) {
            updates.members = newMembers;
            updated = true;
          }
        }
        if (updated) {
          batch.update(doc.ref, updates);
        }
      });

      await batch.commit();
      toast.success('تم استعادة الحساب القديم بنجاح. يرجى تحديث الصفحة.');
      
      // Update local state
      setUsers(users.map(u => u.uid === currentAdminUid ? { ...u, ...oldData, uid: currentAdminUid } : u).filter(u => u.uid !== oldUid));

    } catch (error) {
      console.error("Error restoring old account", error);
      toast.error('حدث خطأ أثناء استعادة الحساب.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportDatabase = async () => {
    setIsSyncing(true);
    toast.info('جاري تحضير نسخة احتياطية كاملة للعبة...');
    try {
      const collectionsToBackup = [
        'users',
        'users_public',
        'gangs',
        'government',
        'messages',
        'bounties',
        'heists',
        'kills',
        'transfer_history',
        'ministry_logs',
        'market_overrides',
        'city_overrides',
        'prison_messages',
        'constitution',
        'global_chat',
        'server_settings',
        'custom_products',
        'mall_data'
      ];

      const fullBackup: any = {
        exportDate: new Date().toISOString(),
        gameVersion: '1.0.0',
        collections: {}
      };

      for (const colName of collectionsToBackup) {
        const snap = await getDocs(collection(db, colName));
        fullBackup.collections[colName] = snap.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }));
      }

      // Legacy support for older import logic if needed
      fullBackup.users = users;
      fullBackup.gangs = gangs;
      fullBackup.government = govData;

      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", `mafia_streets_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
      
      toast.success('تم تصدير نسخة احتياطية كاملة للعبة بنجاح');
    } catch (error) {
      console.error("Error exporting database", error);
      toast.error('حدث خطأ أثناء تصدير قاعدة البيانات');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDatabaseRestoreFile(file);
    if (event.target) event.target.value = ''; // Reset input
  };

  const executeDatabaseRestore = async () => {
    if (!databaseRestoreFile) return;

    setIsSyncing(true);
    const file = databaseRestoreFile;
    setDatabaseRestoreFile(null);
    toast.info('جاري استعادة النسخة الاحتياطية الكاملة...');

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      if (!data.collections && (!data.users || !data.gangs)) {
        throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف.');
      }

      // 1. Handle Full Backup Format (collections object)
      if (data.collections) {
        for (const [colName, docs] of Object.entries(data.collections)) {
          let batch = writeBatch(db);
          let opCount = 0;
          
          const documents = docs as any[];
          for (const docItem of documents) {
            batch.set(doc(db, colName, docItem.id), docItem.data);
            opCount++;
            
            if (opCount >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              opCount = 0;
            }
          }
          
          if (opCount > 0) {
            await batch.commit();
          }
          console.log(`Restored collection: ${colName}`);
        }
      } 
      // 2. Handle Legacy Format
      else {
        // Restore Users
        let batch = writeBatch(db);
        let opCount = 0;
        
        for (const user of data.users) {
          const { uid, ...userData } = user;
          batch.set(doc(db, 'users', uid), { ...userData, uid });
          opCount++;
          if (opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
        }
        if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0; }

        // Restore Gangs
        for (const gang of data.gangs) {
          const { id, ...gangData } = gang;
          batch.set(doc(db, 'gangs', id), gangData);
          opCount++;
          if (opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
        }
        if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0; }

        // Restore Government
        if (data.government) {
          batch.set(doc(db, 'government', 'current'), data.government);
          await batch.commit();
        }
      }

      toast.success('تم استعادة كامل بيانات اللعبة بنجاح!');
      fetchUsers();
      fetchGangs();
      fetchGovData();
      
    } catch (error) {
      console.error("Error reading/restoring file", error);
      toast.error('حدث خطأ أثناء استعادة قاعدة البيانات. تأكد من صحة الملف.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || !syncStatus || isSyncing) return;

    const checkSync = () => {
      const lastSyncTimeMs = syncStatus.lastSyncTimeMs || (syncStatus.lastSync?.toDate?.()?.getTime()) || 0;
      const now = new Date();
      const diffInHours = (now.getTime() - lastSyncTimeMs) / (1000 * 60 * 60);
      
      if (diffInHours >= 1 || syncStatus.needsInitialSync) {
        handleForceSync();
      }
    };

    checkSync();
    const interval = setInterval(checkSync, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAdmin, syncStatus, isSyncing]);

  const handleToggleElection = async () => {
    if (govData?.electionActive) {
      await handleFinalizeElection();
    } else {
      await handleStartElection();
    }
  };

  const handleStartElection = async () => {
    try {
      const startTime = Date.now();
      const duration = 24 * 60 * 60 * 1000; // 24 hours
      const endTime = startTime + duration;

      const updatedData = {
        electionActive: true,
        electionStartTime: new Date(startTime).toISOString(),
        electionEndTime: new Date(endTime).toISOString(),
        candidates: [],
        results: null,
        gangSeats: {},
        gangVotes: {},
        electedMPs: []
      };
      await updateDoc(doc(db, 'government', 'current'), updatedData);
      setGovData({ ...govData, ...updatedData });
      toast.success(t('admin.electionStarted'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'government/current');
      toast.error(t('common.failed'));
    }
  };

  const handleFinalizeElection = async () => {
    try {
      const govRef = doc(db, 'government', 'current');
      
      await runTransaction(db, async (transaction) => {
        const freshGovDoc = await transaction.get(govRef);
        if (!freshGovDoc.exists()) return;
        const freshData = freshGovDoc.data();
        if (!freshData.electionActive) return;

        const candidates = freshData.candidates || [];
        const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);

        const results: any = {
          speakerId: sortedCandidates[0]?.uid || null,
          deputy1Id: sortedCandidates[1]?.uid || null,
          deputy2Id: sortedCandidates[2]?.uid || null
        };

        const MAX_SEATS = 329;
        const gangSeats: Record<string, number> = {};
        const gangVotes = freshData.gangVotes || {};
        
        // 1. Each candidate with votes gets 1 seat (up to 329)
        const candidatesWithSeats = sortedCandidates.filter(c => c.votes > 0).slice(0, MAX_SEATS);
        candidatesWithSeats.forEach(c => {
          c.seats = 1;
          c.position = 'Member'; // Default
          if (c.uid === results.speakerId) c.position = 'Speaker';
          else if (c.uid === results.deputy1Id) c.position = 'Deputy1';
          else if (c.uid === results.deputy2Id) c.position = 'Deputy2';

          if (c.gangId) {
            gangSeats[c.gangId] = (gangSeats[c.gangId] || 0) + 1;
          }
        });

        // 2. Distribute remaining seats among gangs based on 1000 votes = 1 seat
        let remainingSeats = MAX_SEATS - candidatesWithSeats.length;
        if (remainingSeats > 0) {
          const gangExtraSeats: Record<string, number> = {};
          let totalExtraRequested = 0;

          Object.entries(gangVotes).forEach(([gangId, votes]: [string, any]) => {
            const extra = Math.floor(votes / 1000);
            gangExtraSeats[gangId] = extra;
            totalExtraRequested += extra;
          });

          // If we have more extra seats requested than available, scale down
          if (totalExtraRequested > remainingSeats) {
            const scale = remainingSeats / totalExtraRequested;
            let assigned = 0;
            Object.keys(gangExtraSeats).forEach(gangId => {
              gangExtraSeats[gangId] = Math.floor(gangExtraSeats[gangId] * scale);
              assigned += gangExtraSeats[gangId];
            });
            
            // Distribute remainder to top gangs
            let remainder = remainingSeats - assigned;
            const sortedGangsByVotes = Object.entries(gangVotes).sort(([, a]: any, [, b]: any) => b - a);
            for (let i = 0; i < remainder; i++) {
              const gangId = sortedGangsByVotes[i % sortedGangsByVotes.length][0];
              gangExtraSeats[gangId] = (gangExtraSeats[gangId] || 0) + 1;
            }
          } else if (totalExtraRequested < remainingSeats && totalExtraRequested > 0) {
            let remainder = remainingSeats - totalExtraRequested;
            const sortedGangsByVotes = Object.entries(gangVotes).sort(([, a]: any, [, b]: any) => b - a);
            for (let i = 0; i < remainder; i++) {
              const gangId = sortedGangsByVotes[i % sortedGangsByVotes.length][0];
              gangExtraSeats[gangId] = (gangExtraSeats[gangId] || 0) + 1;
            }
          } else if (totalExtraRequested === 0 && remainingSeats > 0) {
            // No votes bought, but seats remaining? Distribute to gangs with candidates or just all gangs?
            const gangsWithCandidates = Array.from(new Set(candidates.map((c: any) => c.gangId).filter(Boolean)));
            let targetGangs = gangsWithCandidates.length > 0 ? gangsWithCandidates : Object.keys(gangVotes);
            
            // If still no target gangs, use all gangs from the gangs array
            if (targetGangs.length === 0 && gangs.length > 0) {
              targetGangs = gangs.map(g => g.id);
            }

            if (targetGangs.length > 0) {
              for (let i = 0; i < remainingSeats; i++) {
                const gangId = targetGangs[i % targetGangs.length] as string;
                gangExtraSeats[gangId] = (gangExtraSeats[gangId] || 0) + 1;
              }
            }
          }

          Object.entries(gangExtraSeats).forEach(([gangId, extra]) => {
            gangSeats[gangId] = (gangSeats[gangId] || 0) + extra;
          });
        }

        transaction.update(govRef, {
          electionActive: false,
          candidates: sortedCandidates,
          results,
          gangSeats,
          lastFinalized: serverTimestamp()
        });

        if (sortedCandidates[0]) {
          const newPostRef = doc(collection(db, 'news_posts'));
          transaction.set(newPostRef, {
            title: 'عاجل: انتخاب رئيس مجلس النواب',
            content: `تم رسمياً انتخاب اللاعب (${sortedCandidates[0].displayName || 'Unknown'}) رئيساً لمجلس النواب. نبارك له هذا المنصب ونتمنى له التوفيق.`,
            type: 'news',
            timestamp: serverTimestamp(),
            image: sortedCandidates[0].photoURL || 'https://picsum.photos/seed/speaker/400/300'
          });
        }

        for (const [gangId, seats] of Object.entries(gangSeats)) {
          const gangRef = doc(db, 'gangs', gangId);
          transaction.update(gangRef, { 
            seats,
            corruptionOpportunities: seats * 10 
          });
        }
      });
      
      toast.success(t('admin.electionFinalized'));
      fetchGovData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'government/current');
      toast.error(t('common.failed'));
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    try {
      const messageId = 'broadcast_' + Date.now();
      await setDoc(doc(db, 'messages', messageId), {
        senderId: 'system',
        senderName: 'Admin',
        receiverId: 'all',
        content: broadcastMessage,
        type: 'broadcast',
        read: false,
        timestamp: serverTimestamp()
      });
      setBroadcastMessage('');
      toast.success(t('messages.broadcastSuccess'));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      toast.error(t('common.failed'));
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleStartPMNomination = async () => {
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        'pmElection.isActive': true,
        'pmElection.candidates': [],
        'pmElection.startTime': serverTimestamp()
      });
      toast.success('تم بدء ترشيح رئيس الوزراء');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'government/current');
      toast.error(t('common.failed'));
    }
  };

  const handleFinalizePMNomination = async () => {
    try {
      const govRef = doc(db, 'government', 'current');
      let winnerFound = false;
      await runTransaction(db, async (transaction) => {
        const govDoc = await transaction.get(govRef);
        if (!govDoc.exists()) return;
        const data = govDoc.data();
        
        const pmCandidates = data.pmElection?.candidates || [];
        if (pmCandidates.length === 0) {
          transaction.update(govRef, {
            'pmElection.isActive': false,
            'pmElection.candidates': []
          });
          return;
        }

        winnerFound = true;
        const winner = [...pmCandidates].sort((a, b) => b.votes - a.votes)[0];
        
        transaction.update(govRef, {
          primeMinisterId: winner.uid,
          primeMinisterName: winner.name,
          primeMinisterPhoto: winner.photoURL,
          'pmElection.isActive': false,
          'pmElection.candidates': []
        });
      });
      
      if (winnerFound) {
        toast.success('تم إنهاء ترشيح رئيس الوزراء وإعلان الفائز');
      } else {
        toast.info('تم إنهاء الترشيح (لا يوجد مرشحون)');
      }
      fetchGovData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'government/current');
      toast.error(t('common.failed'));
    }
  };

  const handleFirePM = async () => {
    try {
      await updateDoc(doc(db, 'government', 'current'), {
        primeMinisterId: '',
        primeMinisterName: '',
        primeMinisterPhoto: ''
      });
      setGovData({ ...govData, primeMinisterId: '', primeMinisterName: '', primeMinisterPhoto: '' });
      toast.success('تم طرد رئيس الوزراء');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'government/current');
      toast.error(t('common.failed'));
    }
  };

  const handleAppointPM = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error('المستخدم غير موجود');
      const userData = userDoc.data();

      await updateDoc(doc(db, 'government', 'current'), {
        primeMinisterId: uid,
        primeMinisterName: userData.displayName || userData.nickname || 'Unknown',
        primeMinisterPhoto: userData.photoURL || ''
      });
      
      // Grant immunity
      await updateDoc(userRef, {
        immunity: 'diamond',
        immunityExpires: 'permanent'
      });
      
      // Send message
      await addDoc(collection(db, 'messages'), {
        senderId: 'system',
        senderName: t('politics.councilName'),
        receiverId: uid,
        content: t('government.office.immunityMessage'),
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });

      // Add Facebook post for PM appointment
      await addDoc(collection(db, 'news_posts'), {
        title: 'عاجل: تعيين رئيس وزراء جديد',
        content: `تم رسمياً تعيين اللاعب (${userData.displayName || 'Unknown'}) في منصب رئيس الوزراء. نتمنى له التوفيق في مهامه الجديدة لخدمة الوطن.`,
        type: 'news',
        timestamp: serverTimestamp(),
        image: userData.photoURL || 'https://picsum.photos/seed/pm/400/300'
      });

      setGovData({ ...govData, primeMinisterId: uid, primeMinisterName: userData.displayName, primeMinisterPhoto: userData.photoURL });
      toast.success('تم تعيين رئيس الوزراء');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'government/current');
      toast.error(t('common.failed'));
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteDoc(doc(db, 'users', deletingUser));
      await deleteDoc(doc(db, 'users_public', deletingUser));
      setUsers(users.filter(u => u.uid !== deletingUser));
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${deletingUser}`);
      toast.error(t('common.failed'));
    } finally {
      setDeletingUser(null);
    }
  };

  const handleEditClick = (u: UserProfile) => {
    setEditingUser(u);
    setActiveEditTab('basic');
    setFormData({
      displayName: u.displayName || '',
      email: u.email || '',
      role: u.role || 'Criminal',
      city: u.city || 'baghdad',
      country: u.country || 'iq',
      birthdate: u.birthdate || '',
      photoURL: u.photoURL || '',
      alias: u.alias || '',
      nickname: u.nickname || '',
      level: u.level || 1,
      reputation: u.reputation || 0,
      cleanMoney: u.cleanMoney || 0,
      dirtyMoney: u.dirtyMoney || 0,
      bankBalance: u.bankBalance || 0,
      gold: u.gold || 0,
      gangMembers: u.gangMembers || 0,
      familyMembers: u.familyMembers || 0,
      theft: u.crimes?.theft || 0,
      kills: u.crimes?.kills || 0,
      operations: u.crimes?.operations || 0,
      strength: u.gymStats?.strength || 0,
      endurance: u.gymStats?.endurance || 0,
      speed: u.gymStats?.speed || 0,
      toughness: u.gymStats?.toughness || 0,
      gangId: u.gangId || '',
      gangName: u.gangName || '',
      gangRank: u.gangRank || 'عضو',
      gangRole: u.gangRole || '',
      health: u.health || 100,
      energy: u.energy || 100,
      maxEnergy: u.maxEnergy || 100,
      fatigue: u.fatigue || 0,
      wantedStars: u.wantedStars || 0,
      bounty: u.bounty || 0,
      isImprisoned: u.isImprisoned || false,
      documents: {
        idCard: u.documents?.idCard || u.documents?.clearance || false,
        passport: u.documents?.passport || false,
        driverLicense: u.documents?.driverLicense || u.documents?.license || false,
        weaponLicense: u.documents?.weaponLicense || u.documents?.weapon || false,
        clearance: u.documents?.clearance || false,
      },
      ownedTiles: u.ownedTiles || {},
      land: u.land || {},
      builtProperties: u.builtProperties || [],
      family: u.family || { wives: [] }
    });
  };

  const addProperty = () => {
    const newProp = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'headquarters',
      city: 'baghdad',
      level: 1,
      tileId: 0
    };
    setFormData({ ...formData, builtProperties: [...(formData.builtProperties || []), newProp] });
  };

  const removeProperty = (id: string) => {
    setFormData({ ...formData, builtProperties: formData.builtProperties.filter((p: any) => p.id !== id) });
  };

  const updateProperty = (id: string, field: string, value: any) => {
    setFormData({
      ...formData,
      builtProperties: formData.builtProperties.map((p: any) => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const addLand = (city: string) => {
    const currentLand = formData.land || {};
    setFormData({ ...formData, land: { ...currentLand, [city]: (currentLand[city] || 0) + 1 } });
  };

  const removeLand = (city: string) => {
    const currentLand = formData.land || {};
    if (currentLand[city] > 0) {
      setFormData({ ...formData, land: { ...currentLand, [city]: currentLand[city] - 1 } });
    }
  };

  const addWife = () => {
    const newWife = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Wife',
      age: 20,
      country: 'iq',
      traits: [],
      health: 100,
      image: getRealisticAvatar(Math.random().toString(), 'female', 20),
      children: []
    };
    setFormData({ ...formData, family: { ...formData.family, wives: [...(formData.family?.wives || []), newWife] } });
  };

  const removeWife = (id: string) => {
    setFormData({ ...formData, family: { ...formData.family, wives: formData.family.wives.filter((w: any) => w.id !== id) } });
  };

  const updateWife = (id: string, field: string, value: any) => {
    setFormData({
      ...formData,
      family: {
        ...formData.family,
        wives: formData.family.wives.map((w: any) => w.id === id ? { ...w, [field]: value } : w)
      }
    });
  };

  const addChild = (wifeId: string) => {
    const newChild = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Child',
      gender: 'boy',
      health: 100,
      birthTimestamp: Date.now()
    };
    setFormData({
      ...formData,
      family: {
        ...formData.family,
        wives: formData.family.wives.map((w: any) => w.id === wifeId ? { ...w, children: [...(w.children || []), newChild] } : w)
      }
    });
  };

  const removeChild = (wifeId: string, childId: string) => {
    setFormData({
      ...formData,
      family: {
        ...formData.family,
        wives: formData.family.wives.map((w: any) => w.id === wifeId ? { ...w, children: w.children.filter((c: any) => c.id !== childId) } : w)
      }
    });
  };

  const updateChild = (wifeId: string, childId: string, field: string, value: any) => {
    setFormData({
      ...formData,
      family: {
        ...formData.family,
        wives: formData.family.wives.map((w: any) => w.id === wifeId ? {
          ...w,
          children: w.children.map((c: any) => c.id === childId ? { ...c, [field]: value } : c)
        } : w)
      }
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      const updatedData = {
        displayName: formData.displayName,
        email: formData.email,
        role: formData.role,
        city: formData.city,
        country: formData.country,
        birthdate: formData.birthdate,
        photoURL: formData.photoURL,
        alias: formData.alias,
        nickname: formData.nickname,
        vipLevel: formData.vipLevel || null,
        level: Number(formData.level),
        reputation: Number(formData.reputation),
        cleanMoney: Number(formData.cleanMoney),
        dirtyMoney: Number(formData.dirtyMoney),
        bankBalance: Number(formData.bankBalance),
        gold: Number(formData.gold),
        inventory: {
          ...(editingUser.inventory || {}),
          gold: Number(formData.gold)
        },
        gangMembers: Number(formData.gangMembers),
        familyMembers: Number(formData.familyMembers),
        health: Number(formData.health),
        energy: Number(formData.energy),
        maxEnergy: Number(formData.maxEnergy),
        fatigue: Number(formData.fatigue),
        wantedStars: Number(formData.wantedStars),
        bounty: Number(formData.bounty),
        isImprisoned: formData.isImprisoned,
        gangId: formData.gangId,
        gangName: formData.gangName,
        gangRank: formData.gangRank,
        gangRole: formData.gangRole,
        gymStats: {
          strength: Number(formData.strength),
          endurance: Number(formData.endurance),
          speed: Number(formData.speed),
          toughness: Number(formData.toughness),
        },
        crimes: {
          theft: Number(formData.theft),
          kills: Number(formData.kills),
          operations: Number(formData.operations),
        },
        documents: formData.documents,
        ownedTiles: formData.ownedTiles,
        land: formData.land,
        builtProperties: formData.builtProperties,
        family: formData.family
      };

      await updateDoc(doc(db, 'users', editingUser.uid), updatedData);
      
      // Also update users_public for relevant fields
      const publicUpdates: any = {};
      const publicFields = ['displayName', 'photoURL', 'level', 'role', 'reputation', 'gangId', 'gangName', 'gangRank', 'gangRole', 'city', 'isImprisoned', 'jailTimeEnd', 'wantedStars', 'country', 'vipLevel'];
      for (const field of publicFields) {
        if (field in updatedData) {
          publicUpdates[field] = (updatedData as any)[field];
        }
      }
      if (Object.keys(publicUpdates).length > 0) {
        await updateDoc(doc(db, 'users_public', editingUser.uid), publicUpdates);
      }

      setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, ...updatedData } as UserProfile : u));
      setEditingUser(null);
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
      toast.error(t('common.failed'));
    }
  };

  const handleGrantSpecial = async (u: UserProfile) => {
    try {
      const wifeId = 'wife_' + Date.now();
      const children = Array.from({ length: 15 }).map((_, i) => ({
        id: 'child_' + Date.now() + '_' + i,
        name: 'ابن ' + (i + 1),
        birthTimestamp: Date.now(),
        health: 100,
        education: 100,
        gymLevel: 100,
        gender: i % 2 === 0 ? 'boy' : 'girl'
      }));

      const family = {
        wives: [{
          id: wifeId,
          name: 'الزوجة الأولى',
          image: 'https://picsum.photos/seed/wife/200/200',
          age: 25,
          traits: [],
          country: 'iq',
          education: 100,
          gymLevel: 100,
          health: 100,
          children: children
        }]
      };

      const inventoryUpdates = {
        'inventory.cars.special_ferrari': increment(2),
        'inventory.cars.special_lamborghini': increment(2),
        'inventory.weapons.special_glock_gold': increment(2),
        'inventory.weapons.special_ak47_gold': increment(2),
        'inventory.phones.special_iphone_gold_1TB_eSIM': increment(1)
      };

      await updateDoc(doc(db, 'users', u.uid), {
        family: family,
        cleanMoney: increment(100000000),
        dirtyMoney: increment(100000000),
        ...inventoryUpdates
      });

      toast.success('تم منح المميزات بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${u.uid}`);
      toast.error(t('common.failed'));
    }
  };

  const handleGrantDocuments = async (u: UserProfile) => {
    try {
      const updatedDocuments = {
        idCard: true,
        passport: true,
        driverLicense: true,
        weaponLicense: true,
        clearance: true,
      };
      await updateDoc(doc(db, 'users', u.uid), { documents: updatedDocuments });
      
      setUsers(users.map(user => user.uid === u.uid ? { ...user, documents: updatedDocuments } : user));
      toast.success(`تم منح جميع الوثائق للاعب ${u.displayName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${u.uid}`);
      toast.error(t('common.failed'));
    }
  };

  const handleAddDummyPlayer = async () => {
    const dummyId = 'player_' + Date.now();
    
    const wifeId = 'wife_' + Date.now();
    const children = Array.from({ length: 15 }).map((_, i) => ({
      id: 'child_' + Date.now() + '_' + i,
      name: 'ابن ' + (i + 1),
      birthTimestamp: Date.now(),
      health: 100,
      education: 100,
      gymLevel: 100,
      gender: i % 2 === 0 ? 'boy' : 'girl'
    }));

    const newProfile = {
      uid: dummyId,
      displayName: 'لاعب جديد ' + Math.floor(Math.random() * 1000),
      email: `player${Date.now()}@example.com`,
      role: 'Criminal',
      level: 1,
      reputation: 0,
      cleanMoney: 100000000,
      dirtyMoney: 100000000,
      bankBalance: 0,
      crimes: { theft: 0, kills: 0, operations: 0 },
      properties: [],
      gangMembers: 0,
      familyMembers: 16,
      city: 'baghdad',
      vehicles: [],
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      family: {
        wives: [{
          id: wifeId,
          name: 'الزوجة الأولى',
          image: 'https://picsum.photos/seed/wife/200/200',
          age: 25,
          traits: [],
          country: 'iq',
          education: 100,
          gymLevel: 100,
          health: 100,
          children: children
        }]
      },
      inventory: {
        cars: {
          'special_ferrari': 2,
          'special_lamborghini': 2
        },
        bikes: 0,
        weapons: {
          'special_glock_gold': 2,
          'special_ak47_gold': 2
        },
        drugs: {},
        transportedDrugs: {},
        armor: {},
        tools: {},
        gold: 0,
        antiques: 0,
        electronics: 0,
        supplements: {},
        phones: {
          'special_iphone_gold_1TB_eSIM': 1
        }
      }
    };
    try {
      await setDoc(doc(db, 'users', dummyId), newProfile);
      
      // Also create users_public entry
      const publicProfile = {
        uid: dummyId,
        displayName: newProfile.displayName,
        level: newProfile.level,
        role: newProfile.role,
        gangName: null,
        gangColor: null,
        photoURL: null
      };
      await setDoc(doc(db, 'users_public', dummyId), publicProfile);
      
      setUsers([...users, newProfile as any]);
      toast.success('تم إضافة اللاعب بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${dummyId}`);
      toast.error(t('common.failed'));
    }
  };

  useEffect(() => {
    if (!govData?.electionActive || !govData?.electionEndTime) {
      setTimeLeft('00:00:00');
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(govData.electionEndTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        clearInterval(timer);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [govData?.electionActive, govData?.electionEndTime]);

  useEffect(() => {
    if (!govData || !users || users.length === 0) return;

      const checkAndDistribute = async () => {
        const now = new Date();
        const baghdadOffset = 3 * 60 * 60 * 1000;
        const baghdadNow = new Date(now.getTime() + baghdadOffset);
        const hour = baghdadNow.getHours();
        const todayBaghdad = baghdadNow.toISOString().split('T')[0];

        if (hour === 8 && govData.lastDistributionDate !== todayBaghdad) {
          console.log('Auto-triggering distribution...');
          await handleForceDistribution();
        }
      };

    checkAndDistribute();
  }, [govData, users]);

  const handleForceDistribution = async () => {
    if (!govData) return;
    
    console.log('Starting manual distribution...');
    setIsSubmitting(true);
    setDistStatus((prev: any) => prev ? { ...prev, forceDistribution: true, shouldRun: true } : null);
    toast.info('بدأ توزيع الميزانية يدوياً، يرجى الانتظار...');

    try {
      const ministerialRoles = [
        'interior', 'defense', 'foreign', 'finance', 'health', 
        'industry', 'oil', 'electricity', 'labor', 'intelligence', 'security'
      ];

      const humorousMessages = [
        "الوزارة تگولك هاي مليون مكرمة،\nاصرفها بالعافية (تم إيداع 1,000,000$ في حسابكم)",
        "هاي مليون من ميزانية الوزارة،\nلتگول الحكومة مقصرة (تم إيداع 1,000,000$ في حسابكم)",
        "السيد الوزير يگولك هاي مليون هدية،\nاشتري بيها صمون حار (تم إيداع 1,000,000$ في حسابكم)",
        "الوزارة دزتلك مليون،\nاصرفها وسكت لا تطلع مظاهرات (تم إيداع 1,000,000$ في حسابكم)",
        "استلم مليون من الوزارة،\nدير بالك تسأل عن المصدر (تم إيداع 1,000,000$ في حسابكم)",
        "الوزير يگولك هاي مليون،\nلتگول ماكو تعيينات (تم إيداع 1,000,000$ في حسابكم)",
        "هاي مليون من الوزارة،\nاصرفها وانسى الوعود (تم إيداع 1,000,000$ في حسابكم)",
        "الوزارة تگولك هاي مليون،\nلتگول الحكومة بس تاخذ (تم إيداع 1,000,000$ في حسابكم)"
      ];

      let eligibleUsers = users.filter((u: any) => (u.cleanMoney || 0) < 10000000);
      console.log('Eligible users count:', eligibleUsers.length);
      
      if (eligibleUsers.length === 0) {
        eligibleUsers = [...users]; // Fallback to all users if no one is under 10M
      }

      if (eligibleUsers.length > 0) {
        for (const role of ministerialRoles) {
          const cabinet = govData.cabinet || {};
          const minister = cabinet[role];

          // Pick 10 random users
          const shuffled = [...eligibleUsers].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 10);
          console.log(`Distributing for role: ${role}, selected ${selected.length} users.`);

          if (selected.length > 0) {
            const batch = writeBatch(db);
            
            for (const user of selected) {
              const randomMsg = humorousMessages[Math.floor(Math.random() * humorousMessages.length)];
              const ministerName = minister?.displayName;
              const senderName = ministerName ? `وزير ${role === 'interior' ? 'الداخلية' : role === 'defense' ? 'الدفاع' : role === 'foreign' ? 'الخارجية' : role === 'finance' ? 'المالية' : role === 'health' ? 'الصحة' : role === 'industry' ? 'الصناعة' : role === 'oil' ? 'النفط' : role === 'electricity' ? 'الكهرباء' : role === 'labor' ? 'العمل' : role === 'intelligence' ? 'الاستخبارات' : 'الأمن'} (${ministerName})` : `وزارة ${role === 'interior' ? 'الداخلية' : role === 'defense' ? 'الدفاع' : role === 'foreign' ? 'الخارجية' : role === 'finance' ? 'المالية' : role === 'health' ? 'الصحة' : role === 'industry' ? 'الصناعة' : role === 'oil' ? 'النفط' : role === 'electricity' ? 'الكهرباء' : role === 'labor' ? 'العمل' : role === 'intelligence' ? 'الاستخبارات' : 'الأمن'}`;
              const ministerId = minister?.uid || 'system';

              const userRef = doc(db, 'users', user.uid);
              const msgRef = doc(collection(db, 'messages'));
              const logRef = doc(collection(db, 'ministry_logs'));

              batch.update(userRef, {
                cleanMoney: increment(1000000)
              });

              batch.set(msgRef, {
                senderId: 'system',
                senderName: senderName,
                receiverId: user.uid,
                content: ministerName ? `[السيد الوزير ${ministerName}]: ${randomMsg}` : `[وزارة ${role}]: ${randomMsg}`,
                timestamp: serverTimestamp(),
                read: false,
                type: 'system',
                subject: 'مكرمة وزارية'
              });

              batch.set(logRef, {
                ministerId: ministerId,
                ministerName: ministerName || 'الوزارة',
                role: role,
                action: 'auto_distribution',
                targetUserId: user.uid,
                targetUserName: user.displayName || 'Unknown',
                amount: 1000000,
                remainingBudget: govData.budgets?.[role] || 0,
                timestamp: serverTimestamp()
              });
            }
            
            await batch.commit();
            console.log(`Batch committed for role: ${role}`);
          }
        }
      }

      const now = new Date();
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadNow = new Date(now.getTime() + baghdadOffset);
      const todayBaghdad = baghdadNow.toISOString().split('T')[0];

      const govRef = doc(db, 'government', 'current');
      await updateDoc(govRef, {
        lastDistributionDate: todayBaghdad,
        forceDistribution: false
      });

      setGovData((prev: any) => ({ ...prev, lastDistributionDate: todayBaghdad, forceDistribution: false }));
      setDistStatus((prev: any) => prev ? { ...prev, forceDistribution: false, lastDistribution: todayBaghdad } : null);
      toast.success('تم توزيع الميزانية بنجاح على اللاعبين المستحقين!');
      
      fetchUsers();
      fetchGovData();
    } catch (error) {
      console.error('Error forcing distribution:', error);
      toast.error('حدث خطأ أثناء التوزيع');
      setDistStatus((prev: any) => prev ? { ...prev, forceDistribution: false } : null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncDatabase = async () => {
    setIsSyncing(true);
    try {
      await fetchUsers();
      await fetchGangs();
      toast.success('تمت مزامنة قاعدة البيانات بنجاح');
    } catch (error) {
      console.error('Error syncing database:', error);
      toast.error('حدث خطأ أثناء المزامنة');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMaintenance = async (type: 'clean' | 'reset' | 'integrity') => {
    if (type === 'reset') {
      if (!window.confirm('خطر جداً: هل أنت متأكد من تصفير اقتصاد اللعبة بالكامل؟ سيتم تصفير أموال جميع اللاعبين.')) return;
      const confirmText = window.prompt('اكتب "RESET" للتأكيد:');
      if (confirmText !== 'RESET') return;
    }

    setIsSyncing(true);
    try {
      if (type === 'clean') {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const inactiveUsers = users.filter(u => (u.lastActive || 0) < thirtyDaysAgo);
        for (const u of inactiveUsers) {
          await deleteDoc(doc(db, 'users', u.uid));
        }
        toast.success(`تم حذف ${inactiveUsers.length} لاعب غير نشط`);
      } else if (type === 'reset') {
        for (const u of users) {
          await updateDoc(doc(db, 'users', u.uid), {
            cleanMoney: 10000,
            dirtyMoney: 0,
            gold: 10
          });
        }
        toast.success('تم إعادة تعيين الاقتصاد بنجاح');
      } else if (type === 'integrity') {
        const suspicious = users.filter(u => (u.cleanMoney || 0) > 1000000000 || (u.dirtyMoney || 0) > 1000000000);
        if (suspicious.length > 0) {
          toast.warning(`تم العثور على ${suspicious.length} حساب مشبوه`);
          console.log('Suspicious accounts:', suspicious);
        } else {
          toast.success('لم يتم العثور على تلاعب في البيانات');
        }
      }
      fetchUsers();
    } catch (error) {
      toast.error('فشل تنفيذ العملية');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendDirectMessage = async () => {
    if (!messagingUser || !directMessage.trim()) return;
    setSendingDirectMessage(true);
    try {
      const messageId = 'msg_' + Date.now();
      await setDoc(doc(db, 'messages', messageId), {
        senderId: 'system',
        senderName: 'Admin',
        receiverId: messagingUser.uid,
        content: directMessage,
        type: 'system',
        read: false,
        timestamp: serverTimestamp()
      });
      setDirectMessage('');
      setMessagingUser(null);
      toast.success('تم إرسال الرسالة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      toast.error(t('common.failed'));
    } finally {
      setSendingDirectMessage(false);
    }
  };

  const handleAdminDeleteGang = (gangId: string) => {
    setDeletingGang(gangId);
  };

  const executeAdminDeleteGang = async () => {
    if (!deletingGang) return;
    const gangId = deletingGang;
    
    setDeletingGang(null);
    try {
      const gang = gangs.find(g => g.id === gangId);
      if (!gang) return;

      const batch = writeBatch(db);
      
      // Remove all members from the gang
      if (gang.members && gang.members.length > 0) {
        for (const memberId of gang.members) {
          const userRef = doc(db, 'users', memberId);
          batch.update(userRef, {
            gangId: null,
            gangRole: null
          });
        }
      }

      // Delete the gang document
      const gangRef = doc(db, 'gangs', gangId);
      batch.delete(gangRef);

      await batch.commit();
      toast.success('تم حذف العصابة بنجاح');
      fetchGangs();
      fetchUsers(); // Refresh users to reflect removed gang associations
    } catch (error) {
      console.error('Error deleting gang:', error);
      toast.error('حدث خطأ أثناء حذف العصابة');
    }
  };

  const handleAdminRemoveMember = (gangId: string, memberId: string, memberName: string) => {
    setRemovingMember({ gangId, memberId, memberName });
  };

  const executeAdminRemoveMember = async () => {
    if (!removingMember) return;
    const { gangId, memberId } = removingMember;
    
    setRemovingMember(null);
    try {
      const gang = gangs.find(g => g.id === gangId);
      if (!gang) return;

      const batch = writeBatch(db);
      
      // Update gang members list
      const gangRef = doc(db, 'gangs', gangId);
      batch.update(gangRef, {
        members: arrayRemove(memberId)
      });

      // Update user profile
      const userRef = doc(db, 'users', memberId);
      batch.update(userRef, {
        gangId: null,
        gangRole: null
      });

      await batch.commit();
      toast.success('تم إزالة العضو بنجاح');
      fetchGangs();
      fetchUsers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('حدث خطأ أثناء إزالة العضو');
    }
  };

  const handleResetUserGang = (user: UserProfile) => {
    setResetGangUser(user);
  };

  const executeResetUserGang = async () => {
    if (!resetGangUser) return;
    const userId = resetGangUser.uid;
    
    setIsSyncing(true);
    setResetGangUser(null);
    try {
      const batch = writeBatch(db);
      
      // Update user profile
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        gangId: null,
        gangName: null,
        gangRole: null,
        gangSymbol: null,
        gangColor: null,
        gangMembers: 0
      });

      // Update public profile
      const publicRef = doc(db, 'users_public', userId);
      batch.update(publicRef, {
        gangId: null,
        gangName: null,
        gangRole: null,
        gangSymbol: null,
        gangColor: null
      });

      await batch.commit();
      toast.success('تم تصفير بيانات العصابة للاعب بنجاح');
      fetchUsers();
    } catch (error) {
      console.error('Error resetting user gang:', error);
      toast.error('حدث خطأ أثناء تصفير بيانات العصابة');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isAdmin) {
    return <div className="text-white p-8 text-center text-xl font-bold">{t('admin.accessDenied')}</div>;
  }

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-5 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              {t('admin.title')}
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">ADMIN ACCESS</span>
            </h2>
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">نظام إدارة شؤون المافيا العليا</p>
          </div>
        </div>
        <button 
          onClick={handleAddDummyPlayer}
          className="relative z-10 bg-white text-black hover:bg-red-600 hover:text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl hover:shadow-red-600/40 active:scale-95 uppercase tracking-widest text-xs"
        >
          <UserPlus size={20} />
          إضافة لاعب
        </button>
      </div>

      <div className="bg-zinc-900/40 p-2 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl mb-10 flex flex-wrap md:flex-nowrap gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', icon: BarChart3, label: 'نظرة عامة' },
          { id: 'users', icon: Users, label: 'اللاعبين' },
          { id: 'government', icon: Vote, label: 'الحكومة' },
          { id: 'gangs', icon: ShieldCheck, label: 'العصابات' },
          { id: 'database', icon: Database, label: 'قاعدة البيانات' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            className={clsx(
              "flex-1 px-6 py-4 rounded-2xl font-black transition-all whitespace-nowrap flex items-center justify-center gap-3 border-2 uppercase tracking-widest text-[10px]",
              activeAdminTab === tab.id 
                ? "bg-red-600 border-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] scale-[1.02] z-10" 
                : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeAdminTab === 'overview' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'إجمالي اللاعبين', value: formatNumber(users.length), icon: Users, color: 'from-blue-600 to-blue-900', shadow: 'shadow-blue-900/20' },
              { label: 'إجمالي العصابات', value: formatNumber(gangs.length), icon: ShieldCheck, color: 'from-red-600 to-red-900', shadow: 'shadow-red-900/20' },
              { label: 'الأموال النظيفة', value: formatMoney(users.reduce((acc, u) => acc + (u.cleanMoney || 0), 0)), icon: Database, color: 'from-emerald-600 to-emerald-900', shadow: 'shadow-emerald-900/20' },
              { label: 'الأموال القذرة', value: formatMoney(users.reduce((acc, u) => acc + (u.dirtyMoney || 0), 0)), icon: Activity, color: 'from-orange-600 to-orange-900', shadow: 'shadow-orange-900/20' }
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group hover:border-zinc-700 transition-all duration-500">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-5 blur-3xl group-hover:opacity-20 transition-opacity duration-700`} />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className={`p-4 bg-gradient-to-br ${stat.color} rounded-2xl text-white ${stat.shadow} transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <stat.icon size={28} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</div>
                  <div className="text-3xl font-black text-white tracking-tighter">{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 p-10 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent opacity-30" />
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-600/10 text-emerald-600 rounded-xl">
                <DollarSign size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">إعدادات البداية</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">تحديد المبلغ الأولي للاعبين الجدد</p>
              </div>
            </div>
            <div className="space-y-6">
              <input
                type="number"
                value={startingMoney}
                onChange={(e) => setStartingMoney(Number(e.target.value))}
                className="w-full bg-zinc-950/50 border-2 border-zinc-800 rounded-2xl p-6 text-white focus:border-emerald-600 focus:outline-none transition-all font-bold"
              />
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    setIsSavingMoney(true);
                    try {
                      await updateDoc(doc(db, 'server_settings', 'backup'), { startingMoney });
                      toast.success('تم حفظ المبلغ الأولي بنجاح');
                    } catch (error) {
                      toast.error('حدث خطأ أثناء حفظ الإعدادات');
                    } finally {
                      setIsSavingMoney(false);
                    }
                  }}
                  disabled={isSavingMoney}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 uppercase tracking-widest text-xs"
                >
                  {isSavingMoney ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 p-10 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent opacity-30" />
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-purple-600/10 text-purple-600 rounded-xl">
                <Megaphone size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t('messages.broadcastTitle')}</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t('messages.broadcastDesc')}</p>
              </div>
            </div>
            <div className="space-y-6">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder={t('messages.broadcastPlaceholder')}
                className="w-full bg-zinc-950/50 border-2 border-zinc-800 rounded-2xl p-6 text-white focus:border-purple-600 focus:outline-none transition-all font-bold placeholder:text-zinc-700 min-h-[150px] resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSendBroadcast}
                  disabled={sendingBroadcast || !broadcastMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-lg shadow-purple-600/20 active:scale-95 uppercase tracking-widest text-xs"
                >
                  {sendingBroadcast ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  {t('messages.sendBroadcast')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'government' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Election Management */}
            <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-600/10 text-emerald-600 rounded-2xl">
                  <Vote size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">إدارة الانتخابات</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">التحكم في العملية الديمقراطية</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-950/50 p-6 rounded-3xl border border-zinc-800/50 flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">حالة الانتخابات</div>
                    <div className={`text-lg font-black uppercase tracking-tight ${govData?.electionActive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {govData?.electionActive ? 'جارية الآن' : 'متوقفة'}
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleElection}
                    className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                      govData?.electionActive 
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {govData?.electionActive ? 'إيقاف الانتخابات' : 'بدء الانتخابات'}
                  </button>
                </div>

                <div className="bg-zinc-950/50 p-6 rounded-3xl border border-zinc-800/50">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">المرشحون الحاليون</div>
                  <div className="space-y-3">
                    {govData?.candidates?.map((c: any) => {
                      return (
                        <div key={c.uid} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                          <div className="flex items-center gap-3">
                            <img src={users.find(u => u.uid === c.uid)?.photoURL || getRealisticAvatar(c.uid, 'male', 25)} className="w-8 h-8 rounded-lg object-cover" />
                            <span className="text-xs font-black text-white">{c.name || 'مجهول'}</span>
                          </div>
                          <div className="text-blue-400 font-black text-xs">{formatNumber(c.votes || 0)} صوت</div>
                        </div>
                      );
                    })}
                    {(!govData?.candidates || govData.candidates.length === 0) && (
                      <div className="text-center py-4 text-zinc-600 text-[10px] font-black uppercase tracking-widest">لا يوجد مرشحون</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Budget & Distribution */}
            <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">ميزانية الدولة</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">توزيع الثروات والضرائب</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950/50 p-6 rounded-3xl border border-zinc-800/50">
                    <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">الخزينة العامة</div>
                    <div className="text-xl font-black text-emerald-500">{formatMoney(govData?.budget || 0)}</div>
                  </div>
                  <div className="bg-zinc-950/50 p-6 rounded-3xl border border-zinc-800/50">
                    <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">آخر توزيع</div>
                    <div className="text-xl font-black text-white">{govData?.lastDistributionDate || 'غير متوفر'}</div>
                  </div>
                </div>

                <div className="bg-zinc-950/50 p-6 rounded-3xl border border-zinc-800/50">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">توزيع الرواتب</div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs font-black text-white uppercase tracking-widest">
                      <span>إجمالي الرواتب:</span>
                      <span className="text-emerald-500">{formatMoney(users.length * 5000)}</span>
                    </div>
                    <button 
                      onClick={handleForceDistribution}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      توزيع الرواتب يدوياً الآن
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-black text-xl flex items-center gap-3 text-white">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="text-blue-500" size={20} />
              </div>
              قائمة اللاعبين
              <span className="text-sm font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md">{users.length}</span>
            </h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="ابحث عن اسم، بريد، أو معرف..." 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-4 py-3 text-sm text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
              <div className="text-zinc-500 font-bold animate-pulse">جاري تحميل سجلات المافيا...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence mode="popLayout">
                {users
                  .filter(u => 
                    (u.displayName || '').toLowerCase().includes((userSearch || '').toLowerCase()) || 
                    (u.uid || '').includes(userSearch || '') ||
                    (u.email || '').toLowerCase().includes((userSearch || '').toLowerCase())
                  )
                  .map((u) => {
                    const country = COUNTRIES.find(c => c.code === u.country);
                    return (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={u.uid} 
                        className={clsx(
                          "group bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/50 hover:border-red-600/30 rounded-2xl p-4 transition-all duration-300 relative",
                          activeUserMenu === u.uid ? "z-50" : "z-10"
                        )}
                      >
                        {/* Background Mafia Hint */}
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                          <Shield size={120} />
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img 
                                src={u.photoURL || getRealisticAvatar(u.uid, 'male', 25)} 
                                alt={u.displayName}
                                className="w-14 h-14 rounded-full border-2 border-zinc-800 group-hover:border-red-600/50 transition-colors object-cover"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-800 rounded-full p-1">
                                {country ? (
                                  <img 
                                    src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} 
                                    alt={country.name}
                                    className="w-4 h-3 object-cover rounded-sm"
                                  />
                                ) : (
                                  <Globe size={12} className="text-zinc-500" />
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-white group-hover:text-red-500 transition-colors player-name-script text-lg">{u.displayName}</h4>
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter">LVL {u.level}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <ShieldAlert size={12} className="text-red-500" />
                                  <span>{t(`roles.${u.role}`)}</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <Database size={12} className="text-emerald-500" />
                                  <span className="text-emerald-500/80">{formatMoney(u.cleanMoney || 0)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Quick Stats for Admin */}
                            <div className="hidden md:flex items-center gap-6 mr-8">
                              <div className="text-center">
                                <div className="text-[10px] text-zinc-600 uppercase font-black">الاحترام</div>
                                <div className="text-sm font-bold text-yellow-500">{formatNumber(u.reputation || 0)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-zinc-600 uppercase font-black">القوة</div>
                                <div className="text-sm font-bold text-blue-500">{u.gymStats?.strength || 0}</div>
                              </div>
                            </div>

                            {/* Actions Menu */}
                            <div className="relative">
                              <button 
                                onClick={() => setActiveUserMenu(activeUserMenu === u.uid ? null : u.uid)}
                                className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-red-600 transition-all active:scale-95"
                              >
                                <MoreVertical size={20} />
                              </button>

                              <AnimatePresence>
                                {activeUserMenu === u.uid && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setActiveUserMenu(null)}
                                    />
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                      className="absolute left-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                                    >
                                      <button 
                                        onClick={() => { handleGrantSpecial(u); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-black hover:bg-gray-100 hover:text-amber-600 flex items-center justify-between transition-colors font-bold"
                                      >
                                        <span>منح مميز ⭐️</span>
                                        <Award size={16} />
                                      </button>
                                      <div className="h-px bg-gray-200 my-1 mx-2" />
                                      <button 
                                        onClick={() => { setViewingUser(u); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-black hover:bg-gray-100 hover:text-emerald-600 flex items-center justify-between transition-colors"
                                      >
                                        <span>عرض التفاصيل</span>
                                        <Eye size={16} />
                                      </button>
                                      <button 
                                        onClick={() => { setMessagingUser(u); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-black hover:bg-gray-100 hover:text-purple-600 flex items-center justify-between transition-colors"
                                      >
                                        <span>إرسال رسالة</span>
                                        <Send size={16} />
                                      </button>
                                      <button 
                                        onClick={() => { handleEditClick(u); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-black hover:bg-gray-100 hover:text-blue-600 flex items-center justify-between transition-colors"
                                      >
                                        <span>تعديل البيانات</span>
                                        <Edit2 size={16} />
                                      </button>
                                      <div className="h-px bg-gray-200 my-1 mx-2" />
                                      <button 
                                        onClick={() => { handleGrantDocuments(u); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-black hover:bg-gray-100 hover:text-yellow-600 flex items-center justify-between transition-colors"
                                      >
                                        <span>منح الوثائق</span>
                                        <ShieldCheck size={16} />
                                      </button>
                                      <button 
                                        onClick={() => { handleLinkToMyAccount(u); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-black hover:bg-gray-100 hover:text-green-600 flex items-center justify-between transition-colors"
                                      >
                                        <span>ربط بالحساب</span>
                                        <Link size={16} />
                                      </button>
                                      <button 
                                        onClick={() => { handleResetUserGang(u); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-black hover:bg-gray-100 hover:text-orange-600 flex items-center justify-between transition-colors"
                                      >
                                        <span>تصفير العصابة</span>
                                        <RefreshCw size={16} />
                                      </button>
                                      <div className="h-px bg-gray-200 my-1 mx-2" />
                                      <button 
                                        onClick={() => { setDeletingUser(u.uid); setActiveUserMenu(null); }}
                                        className="w-full px-4 py-2.5 text-right text-sm text-red-600 hover:bg-red-50 flex items-center justify-between transition-colors"
                                      >
                                        <span>حذف اللاعب</span>
                                        <Trash2 size={16} />
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {activeAdminTab === 'gangs' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-600/10 text-red-600 rounded-xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">قائمة العصابات ({gangs.length})</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">إدارة شؤون العائلات الإجرامية</p>
              </div>
            </div>
            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-red-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="البحث عن عصابة..." 
                value={gangSearch}
                onChange={(e) => setGangSearch(e.target.value)}
                className="w-full bg-zinc-950/50 border-2 border-zinc-800 rounded-2xl pl-12 pr-6 py-3 text-white focus:border-red-600 focus:outline-none transition-all font-bold placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gangs
              .filter(g => (g.name || '').toLowerCase().includes((gangSearch || '').toLowerCase()))
              .map((gang) => (
                <div key={gang.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] overflow-hidden group hover:border-red-600/50 transition-all duration-500 relative backdrop-blur-xl p-8">
                  <div className="absolute inset-0 bg-gradient-to-b from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-2xl border-2 border-zinc-800 flex items-center justify-center group-hover:border-red-600 transition-colors shadow-xl">
                        <ShieldCheck size={32} className="text-red-600" />
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">الاحترام</div>
                        <div className="text-xl font-black text-yellow-500">{formatNumber(gang.respect || 0)}</div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h4 className="text-2xl font-black text-white truncate mb-1 group-hover:text-red-500 transition-colors uppercase tracking-tight">{gang.name}</h4>
                      <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        <User size={12} className="text-red-600" />
                        <span>القائد: {users.find(u => u.uid === gang.leaderId)?.displayName || 'غير معروف'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">الأعضاء</div>
                        <div className="text-lg font-black text-white">{gang.members?.length || 0}</div>
                      </div>
                      <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">المستوى</div>
                        <div className="text-lg font-black text-white">{gang.level || 1}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setViewingGangMembers(gang.id)}
                        className="flex-1 bg-zinc-950/50 border-2 border-zinc-800 hover:border-zinc-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                      >
                        عرض الأعضاء
                      </button>
                      <button 
                        onClick={() => handleAdminDeleteGang(gang.id)}
                        className="p-3 bg-red-600/10 border-2 border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 rounded-2xl transition-all active:scale-95"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            {gangs.length === 0 && (
              <div className="col-span-full py-20 text-center bg-zinc-900/20 rounded-[2.5rem] border-2 border-dashed border-zinc-800">
                <ShieldCheck size={48} className="text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-black uppercase tracking-widest">لا توجد عصابات مسجلة في السجلات</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeAdminTab === 'database' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <Database size={200} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-6 mb-10">
                <div className="p-5 bg-blue-600/10 text-blue-600 rounded-3xl border border-blue-600/20 shadow-xl shadow-blue-600/5">
                  <Database size={40} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight">مزامنة وإدارة قاعدة البيانات</h3>
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">التحكم المركزي في سجلات الجريمة والفساد</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-zinc-950/50 p-8 rounded-3xl border border-zinc-800/50 flex flex-col items-center text-center group hover:border-blue-600/30 transition-all">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3">آخر تحديث شامل</div>
                  <div className="text-2xl font-black text-white group-hover:text-blue-500 transition-colors">{syncStatus?.lastSyncString || 'لم يتم بعد'}</div>
                </div>
                <div className="bg-zinc-950/50 p-8 rounded-3xl border border-zinc-800/50 flex flex-col items-center text-center group hover:border-emerald-600/30 transition-all">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3">حالة المزامنة</div>
                  <div className="text-2xl font-black text-emerald-500 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    نشط وتلقائي
                  </div>
                </div>
                <div className="bg-zinc-950/50 p-8 rounded-3xl border border-zinc-800/50 flex flex-col items-center text-center group hover:border-amber-600/30 transition-all">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-3">حجم البيانات</div>
                  <div className="text-2xl font-black text-white group-hover:text-amber-500 transition-colors">~{formatNumber(users.length + gangs.length)} سجل</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleSyncDatabase}
                  disabled={isSyncing}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'جاري المزامنة...' : 'مزامنة البيانات الآن'}
                </button>
                <button 
                  onClick={handleExportDatabase}
                  disabled={isSyncing}
                  className="flex-1 bg-zinc-950/50 border-2 border-zinc-800 hover:border-zinc-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Download size={20} />
                  تصدير نسخة احتياطية
                </button>
                <div className="flex-1">
                  <input
                    type="file"
                    id="database-import"
                    className="hidden"
                    accept=".json"
                    onChange={handleImportDatabase}
                  />
                  <label 
                    htmlFor="database-import"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Upload size={20} />
                    استيراد وتحديث
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-xl">
              <h4 className="text-xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <ShieldAlert className="text-red-600" />
                عمليات الصيانة
              </h4>
              <div className="space-y-4">
                {[
                  { id: 'clean', label: 'تنظيف السجلات القديمة', desc: 'حذف بيانات اللاعبين غير النشطين لأكثر من 30 يوم', icon: Trash2, color: 'text-zinc-400' },
                  { id: 'reset', label: 'إعادة تعيين الاقتصاد', desc: 'تصفير جميع الأموال والذهب في اللعبة (خيار خطر)', icon: RefreshCw, color: 'text-red-500' },
                  { id: 'integrity', label: 'فحص النزاهة', desc: 'التأكد من عدم وجود تلاعب في قيم اللاعبين', icon: ShieldCheck, color: 'text-emerald-500' }
                ].map((op) => (
                  <button 
                    key={op.id} 
                    onClick={() => handleMaintenance(op.id as any)}
                    className="w-full bg-zinc-950/50 p-5 rounded-3xl border border-zinc-800/50 hover:border-zinc-600 transition-all text-right group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <op.icon size={18} className={op.color} />
                      <span className="font-black text-white group-hover:text-red-500 transition-colors uppercase tracking-tight">{op.label}</span>
                    </div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{op.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-xl">
              <h4 className="text-xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <Activity className="text-blue-600" />
                سجل النشاطات
              </h4>
              <div className="space-y-4">
                {[
                  { user: 'Admin', action: 'قام بمزامنة قاعدة البيانات', time: 'منذ دقيقتين' },
                  { user: 'System', action: 'تم حفظ نسخة احتياطية تلقائية', time: 'منذ ساعة' },
                  { user: 'Admin', action: 'تم تعديل بيانات لاعب: صقر', time: 'منذ 3 ساعات' }
                ].map((log, i) => (
                  <div key={i} className="bg-zinc-950/30 p-4 rounded-2xl border border-zinc-800/30 flex items-center justify-between">
                    <span className="text-[10px] font-black text-zinc-600 uppercase">{log.time}</span>
                    <div className="text-right">
                      <div className="text-xs font-black text-white uppercase">{log.user}</div>
                      <div className="text-[10px] text-zinc-500 font-bold">{log.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gang Members Modal */}
      {viewingGangMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-blue-500" />
                أعضاء العصابة
              </h3>
              <button onClick={() => setViewingGangMembers(null)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {(() => {
                const gang = gangs.find(g => g.id === viewingGangMembers);
                if (!gang) return <div className="text-center text-zinc-500">عصابة غير موجودة</div>;
                
                const members = users.filter(u => gang.members?.includes(u.uid));
                
                if (members.length === 0) {
                  return <div className="text-center text-zinc-500 py-8">لا يوجد أعضاء في هذه العصابة</div>;
                }

                return (
                  <div className="space-y-3">
                    {members.map(member => (
                      <div key={member.uid} className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-800/50">
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="player-name-script">{member.displayName}</span>
                            {member.uid === gang.leaderId && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">الزعيم</span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">المستوى: {member.level} | الاحترام: {formatNumber(member.reputation || 0)}</div>
                        </div>
                        {member.uid !== gang.leaderId && (
                          <button
                            onClick={() => handleAdminRemoveMember(gang.id, member.uid, member.displayName)}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                            title="إزالة العضو"
                          >
                            <UserMinus size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Eye className="text-emerald-500" />
                تفاصيل اللاعب: {viewingUser.displayName}
              </h3>
              <button onClick={() => setViewingUser(null)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={viewingUser.photoURL || getRealisticAvatar(viewingUser.uid, viewingUser.gender || 'male', viewingUser.age || 25)} 
                  alt={viewingUser.displayName} 
                  className="w-24 h-24 rounded-full border-4 border-zinc-800 object-cover"
                />
                <div>
                  <h4 className="text-2xl font-black text-white player-name-script">{viewingUser.displayName}</h4>
                  <p className="text-zinc-400">{viewingUser.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">{t(`roles.${viewingUser.role}`)}</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">مستوى {viewingUser.level}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* المعلومات الشخصية */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <h5 className="font-bold text-white mb-3 border-b border-zinc-800 pb-2">المعلومات الشخصية</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-zinc-400">البلد:</span> <span className="text-white">{viewingUser.country || 'غير محدد'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">تاريخ الميلاد:</span> <span className="text-white">{viewingUser.birthdate || 'غير محدد'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">اللقب:</span> <span className="text-white">{viewingUser.alias || 'لا يوجد'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">الاسم المستعار:</span> <span className="text-white">{viewingUser.nickname || 'لا يوجد'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">المدينة الحالية:</span> <span className="text-white">{viewingUser.city ? t(`map.cities.${viewingUser.city}`) : 'غير محدد'}</span></div>
                  </div>
                </div>

                {/* الوثائق الرسمية */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <h5 className="font-bold text-white mb-3 border-b border-zinc-800 pb-2">الوثائق الرسمية</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-zinc-400">هوية شخصية:</span> <span className={(viewingUser.documents?.idCard || viewingUser.documents?.clearance) ? "text-green-400" : "text-red-400"}>{(viewingUser.documents?.idCard || viewingUser.documents?.clearance) ? 'يمتلك' : 'لا يمتلك'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">جواز سفر:</span> <span className={viewingUser.documents?.passport ? "text-green-400" : "text-red-400"}>{viewingUser.documents?.passport ? 'يمتلك' : 'لا يمتلك'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">رخصة قيادة:</span> <span className={(viewingUser.documents?.driverLicense || viewingUser.documents?.license) ? "text-green-400" : "text-red-400"}>{(viewingUser.documents?.driverLicense || viewingUser.documents?.license) ? 'يمتلك' : 'لا يمتلك'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">رخصة سلاح:</span> <span className={(viewingUser.documents?.weaponLicense || viewingUser.documents?.weapon) ? "text-green-400" : "text-red-400"}>{(viewingUser.documents?.weaponLicense || viewingUser.documents?.weapon) ? 'يمتلك' : 'لا يمتلك'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">براءة ذمة:</span> <span className={viewingUser.documents?.clearance ? "text-green-400" : "text-red-400"}>{viewingUser.documents?.clearance ? 'يمتلك' : 'لا يمتلك'}</span></div>
                  </div>
                </div>

                {/* الحالة البدنية والصحية */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <h5 className="font-bold text-white mb-3 border-b border-zinc-800 pb-2">الحالة البدنية والصحية</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-zinc-400">الصحة:</span> <span className="text-green-400">{viewingUser.health || 100}%</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">الطاقة:</span> <span className="text-yellow-400">{viewingUser.energy || 100}/{viewingUser.maxEnergy || 100}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">القوة:</span> <span className="text-white">{viewingUser.gymStats?.strength || 0}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">التحمل:</span> <span className="text-white">{viewingUser.gymStats?.endurance || 0}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">السرعة:</span> <span className="text-white">{viewingUser.gymStats?.speed || 0}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">الصلابة:</span> <span className="text-white">{viewingUser.gymStats?.toughness || 0}</span></div>
                  </div>
                </div>

                {/* الأموال والممتلكات */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <h5 className="font-bold text-white mb-3 border-b border-zinc-800 pb-2">الأموال والممتلكات</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-zinc-400">المال النظيف:</span> <span className="text-green-400">{formatMoney(viewingUser.cleanMoney || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">المال القذر:</span> <span className="text-orange-400">{formatMoney(viewingUser.dirtyMoney || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">رصيد البنك:</span> <span className="text-blue-400">{formatMoney(viewingUser.bankBalance || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">عدد العقارات:</span> <span className="text-white">{viewingUser.builtProperties?.length || 0}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">عدد المركبات:</span> <span className="text-white">{Object.keys(viewingUser.inventory?.cars || {}).length || 0}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">الرصاص:</span> <span className="text-yellow-400">{formatNumber(viewingUser.inventory?.tools?.bullets || 0)}</span></div>
                  </div>
                </div>

                {/* الإحصائيات الإجرامية */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <h5 className="font-bold text-white mb-3 border-b border-zinc-800 pb-2">الإحصائيات الإجرامية</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-zinc-400">السرقات:</span> <span className="text-white">{formatNumber(viewingUser.crimes?.theft || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">جرائم القتل:</span> <span className="text-red-400">{formatNumber(viewingUser.crimes?.kills || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">العمليات:</span> <span className="text-blue-400">{formatNumber(viewingUser.crimes?.operations || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">مستوى المطلوبين:</span> <span className="text-yellow-400">{viewingUser.wantedStars || 0} نجوم</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">المكافأة:</span> <span className="text-green-400">{formatMoney(viewingUser.bounty || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">في السجن:</span> <span className={viewingUser.isImprisoned ? "text-red-400" : "text-green-400"}>{viewingUser.isImprisoned ? 'نعم' : 'لا'}</span></div>
                  </div>
                </div>

                {/* العائلة */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <h5 className="font-bold text-white mb-3 border-b border-zinc-800 pb-2">العائلة</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">عدد الزوجات:</span> 
                      <span className="text-white">{viewingUser.family?.wives?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">عدد الأبناء:</span> 
                      <span className="text-white">
                        {viewingUser.family?.wives?.reduce((acc: number, wife: any) => acc + (wife.children?.length || 0), 0) || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* العصابة */}
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <h5 className="font-bold text-white mb-3 border-b border-zinc-800 pb-2">العصابة</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">اسم العصابة:</span> 
                      <span className="text-white">{viewingUser.gangName || 'لا ينتمي لعصابة'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">رتبة العصابة:</span> 
                      <span className="text-white">{viewingUser.gangRank || 'عضو'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto py-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-3xl shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col my-auto"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/20 rounded-t-[2.5rem]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600/20 rounded-2xl">
                    <Edit3 className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t('admin.editPlayer')}</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-0.5">تعديل سجلات المافيا الكاملة</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingUser(null)} 
                  className="w-12 h-12 flex items-center justify-center bg-zinc-900 hover:bg-red-600/20 text-zinc-400 hover:text-red-600 rounded-2xl transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex overflow-x-auto no-scrollbar bg-zinc-900/50 p-1 mx-8 mt-4 rounded-xl border border-zinc-800">
                {[
                  { id: 'basic', label: 'الأساسية', icon: User },
                  { id: 'financial', label: 'المالية', icon: DollarSign },
                  { id: 'combat', label: 'القتالية', icon: Activity },
                  { id: 'properties', label: 'الممتلكات', icon: Database },
                  { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
                  { id: 'family', label: 'العصابة والعائلة', icon: Users }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveEditTab(tab.id as any)}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      activeEditTab === tab.id 
                        ? "bg-red-600 text-white shadow-lg" 
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                {activeEditTab === 'basic' && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">الاسم المستعار</label>
                        <input type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">البريد الإلكتروني</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">الرتبة</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold appearance-none">
                          <option value="Boss">{t('roles.Boss')}</option>
                          <option value="Trader">{t('roles.Trader')}</option>
                          <option value="Thief">{t('roles.Thief')}</option>
                          <option value="Smuggler">{t('roles.Smuggler')}</option>
                          <option value="Criminal">{t('roles.Criminal')}</option>
                          <option value="Admin">{t('roles.Admin')}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">منح VIP</label>
                        <select value={formData.vipLevel || ''} onChange={e => setFormData({...formData, vipLevel: e.target.value || null})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold appearance-none">
                          <option value="">بدون VIP</option>
                          <option value="silver">VIP فضي</option>
                          <option value="gold">VIP ذهبي</option>
                          <option value="diamond">VIP ماسي</option>
                          <option value="demon">VIP ديمون</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">المدينة</label>
                        <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold appearance-none">
                          <option value="baghdad">{t('map.cities.baghdad')}</option>
                          <option value="damascus">{t('map.cities.damascus')}</option>
                          <option value="beirut">{t('map.cities.beirut')}</option>
                          <option value="cairo">{t('map.cities.cairo')}</option>
                          <option value="dubai">{t('map.cities.dubai')}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">البلد (كود)</label>
                        <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" placeholder="iq, sy, eg..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">تاريخ الميلاد</label>
                        <input type="text" value={formData.birthdate} onChange={e => setFormData({...formData, birthdate: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" placeholder="YYYY-MM-DD" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">رابط الصورة</label>
                        <input type="text" value={formData.photoURL} onChange={e => setFormData({...formData, photoURL: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">اللقب</label>
                        <input type="text" value={formData.alias} onChange={e => setFormData({...formData, alias: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">الاسم الحركي</label>
                        <input type="text" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                    </div>
                  </section>
                )}

                {activeEditTab === 'financial' && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">المستوى</label>
                        <input type="number" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">الاحترام (Reputation)</label>
                        <input type="number" value={formData.reputation} onChange={e => setFormData({...formData, reputation: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2">المال النظيف</label>
                        <input type="number" value={formData.cleanMoney} onChange={e => setFormData({...formData, cleanMoney: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-emerald-500 focus:border-emerald-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-2">المال القذر</label>
                        <input type="number" value={formData.dirtyMoney} onChange={e => setFormData({...formData, dirtyMoney: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-orange-500 focus:border-orange-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2">رصيد البنك</label>
                        <input type="number" value={formData.bankBalance} onChange={e => setFormData({...formData, bankBalance: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-blue-500 focus:border-blue-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest ml-2">الذهب</label>
                        <input type="number" value={formData.gold} onChange={e => setFormData({...formData, gold: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-yellow-500 focus:border-yellow-600 focus:outline-none transition-all font-bold" />
                      </div>
                    </div>
                  </section>
                )}

                {activeEditTab === 'combat' && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">الصحة</label>
                        <input type="number" value={formData.health} onChange={e => setFormData({...formData, health: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest ml-2">الطاقة</label>
                        <input type="number" value={formData.energy} onChange={e => setFormData({...formData, energy: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">الطاقة القصوى</label>
                        <input type="number" value={formData.maxEnergy} onChange={e => setFormData({...formData, maxEnergy: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">التعب</label>
                        <input type="number" value={formData.fatigue} onChange={e => setFormData({...formData, fatigue: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2">القوة (Strength)</label>
                        <input type="number" value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2">التحمل (Endurance)</label>
                        <input type="number" value={formData.endurance} onChange={e => setFormData({...formData, endurance: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest ml-2">السرعة (Speed)</label>
                        <input type="number" value={formData.speed} onChange={e => setFormData({...formData, speed: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-2">الصلابة (Toughness)</label>
                        <input type="number" value={formData.toughness} onChange={e => setFormData({...formData, toughness: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-yellow-600 uppercase tracking-widest ml-2">نجوم الملاحقة</label>
                        <input type="number" value={formData.wantedStars} onChange={e => setFormData({...formData, wantedStars: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-yellow-500 focus:border-yellow-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="flex items-end pb-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              checked={formData.isImprisoned} 
                              onChange={e => setFormData({...formData, isImprisoned: e.target.checked})}
                              className="sr-only"
                            />
                            <div className={`w-12 h-6 rounded-full transition-colors ${formData.isImprisoned ? 'bg-red-600' : 'bg-zinc-800'}`} />
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isImprisoned ? 'translate-x-7' : 'translate-x-1'}`} />
                          </div>
                          <span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-widest transition-colors">مسجون</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Documents */}
                    <div className="pt-6 border-t border-zinc-800">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2 mb-4 block">الوثائق الرسمية</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { key: 'idCard', label: 'هوية شخصية' },
                          { key: 'passport', label: 'جواز سفر' },
                          { key: 'driverLicense', label: 'رخصة قيادة' },
                          { key: 'weaponLicense', label: 'رخصة سلاح' },
                          { key: 'clearance', label: 'براءة ذمة' },
                        ].map(doc => (
                          <label key={doc.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${formData.documents?.[doc.key] ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                            <span className="text-xs font-bold">{doc.label}</span>
                            <input 
                              type="checkbox" 
                              checked={formData.documents?.[doc.key] || false} 
                              onChange={e => setFormData({
                                ...formData, 
                                documents: {
                                  ...formData.documents,
                                  [doc.key]: e.target.checked
                                }
                              })}
                              className="w-5 h-5 rounded-lg border-zinc-700 bg-zinc-800 text-yellow-500 focus:ring-yellow-500/20"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {activeEditTab === 'properties' && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                    {/* Buildings Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">المباني والعقارات</label>
                        <button 
                          onClick={addProperty}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <Plus size={14} />
                          إضافة مبنى
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {(formData.builtProperties || []).map((prop: any) => {
                          const familyMembers = [
                            ...(formData.family?.wives || []).map((w: any) => ({ id: w.id, name: w.name, type: 'wife' })),
                            ...(formData.family?.wives || []).flatMap((w: any) => (w.children || []).map((c: any) => ({ id: c.id, name: c.name, type: 'child' })))
                          ];

                          return (
                            <div key={prop.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                              <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">النوع</label>
                                <select 
                                  value={prop.type} 
                                  onChange={e => updateProperty(prop.id, 'type', e.target.value)}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:outline-none"
                                >
                                  <option value="headquarters">المقر الرئيسي</option>
                                  <option value="bank">بنك</option>
                                  <option value="weapon_stash">مخزن أسلحة</option>
                                  <option value="drug_factory">مصنع سموم</option>
                                  <option value="safe_house">منزل آمن</option>
                                  <option value="laundromat">مغسلة أموال</option>
                                  <option value="garage">كراج</option>
                                  <option value="casino">كازينو</option>
                                  <option value="hotel">فندق</option>
                                  <option value="ammunition_factory">مصنع ذخيرة</option>
                                </select>
                              </div>
                              <div className="w-32 space-y-1">
                                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">المدينة</label>
                                <select 
                                  value={prop.city} 
                                  onChange={e => updateProperty(prop.id, 'city', e.target.value)}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:outline-none"
                                >
                                  <option value="baghdad">بغداد</option>
                                  <option value="damascus">دمشق</option>
                                  <option value="beirut">بيروت</option>
                                  <option value="cairo">القاهرة</option>
                                  <option value="dubai">دبي</option>
                                </select>
                              </div>
                              <div className="w-32 space-y-1">
                                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">المدير (إدارة المنشأة)</label>
                                <select 
                                  value={prop.managerId || ''} 
                                  onChange={e => updateProperty(prop.id, 'managerId', e.target.value)}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-[10px] font-bold focus:outline-none"
                                >
                                  <option value="">بدون مدير (إدارة يدوية)</option>
                                  {familyMembers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.type === 'wife' ? 'زوجة' : 'ابن/ابنة'})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-16 space-y-1">
                                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">المستوى</label>
                                <input 
                                  type="number" 
                                  value={prop.level} 
                                  onChange={e => updateProperty(prop.id, 'level', Number(e.target.value))}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:outline-none"
                                />
                              </div>
                              <button 
                                onClick={() => removeProperty(prop.id)}
                                className="p-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all self-end"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                        {(formData.builtProperties || []).length === 0 && (
                          <div className="text-center py-8 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl">
                            <p className="text-zinc-500 text-xs font-bold">لا توجد مبانٍ حالياً</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lands Section */}
                    <div className="space-y-4 pt-6 border-t border-zinc-800">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">الأراضي والمدن</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {['baghdad', 'damascus', 'beirut', 'cairo', 'dubai'].map(city => (
                          <div key={city} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-tight">{t(`map.cities.${city}`)}</p>
                              <p className="text-[10px] text-zinc-500 font-bold">الأراضي: {formData.land?.[city] || 0}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => removeLand(city)}
                                className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all"
                              >
                                -
                              </button>
                              <button 
                                onClick={() => addLand(city)}
                                className="w-8 h-8 flex items-center justify-center bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {activeEditTab === 'stats' && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">السرقات</label>
                        <input type="number" value={formData.theft} onChange={e => setFormData({...formData, theft: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">جرائم القتل</label>
                        <input type="number" value={formData.kills} onChange={e => setFormData({...formData, kills: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2">العمليات</label>
                        <input type="number" value={formData.operations} onChange={e => setFormData({...formData, operations: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-2">المكافأة (Bounty)</label>
                        <input type="number" value={formData.bounty} onChange={e => setFormData({...formData, bounty: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                    </div>
                  </section>
                )}

                {activeEditTab === 'family' && (
                  <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">معرف العصابة (Gang ID)</label>
                        <input type="text" value={formData.gangId} onChange={e => setFormData({...formData, gangId: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">اسم العصابة</label>
                        <input type="text" value={formData.gangName} onChange={e => setFormData({...formData, gangName: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">رتبة العصابة</label>
                        <input type="text" value={formData.gangRank} onChange={e => setFormData({...formData, gangRank: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">دور العصابة</label>
                        <input type="text" value={formData.gangRole} onChange={e => setFormData({...formData, gangRole: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:outline-none transition-all font-bold" />
                      </div>
                    </div>

                    {/* Family Section */}
                    <div className="space-y-6 pt-6 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">إدارة العائلة (الزوجات والأبناء)</label>
                        <button 
                          onClick={addWife}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <Plus size={14} />
                          إضافة زوجة
                        </button>
                      </div>

                      <div className="space-y-6">
                        {(formData.family?.wives || []).map((wife: any) => (
                          <div key={wife.id} className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                            
                            <div className="flex flex-wrap items-start gap-6 relative z-10">
                              <img 
                                src={wife.image || getRealisticAvatar(wife.id, 'female', wife.age)} 
                                alt={wife.name}
                                className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-800 shadow-xl"
                              />
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">الاسم</label>
                                  <input 
                                    type="text" 
                                    value={wife.name} 
                                    onChange={e => updateWife(wife.id, 'name', e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">العمر</label>
                                  <input 
                                    type="number" 
                                    value={wife.age} 
                                    onChange={e => updateWife(wife.id, 'age', Number(e.target.value))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">البلد</label>
                                  <input 
                                    type="text" 
                                    value={wife.country} 
                                    onChange={e => updateWife(wife.id, 'country', e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:outline-none"
                                  />
                                </div>
                                <div className="flex items-end justify-end gap-2">
                                  <button 
                                    onClick={() => removeWife(wife.id)}
                                    className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all"
                                    title="حذف الزوجة"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => addChild(wife.id)}
                                    className="flex items-center gap-2 px-4 py-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                  >
                                    <Plus size={14} />
                                    إضافة ابن
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Children List */}
                            <div className="space-y-3 pl-4 border-l-2 border-zinc-800 ml-10">
                              {(wife.children || []).map((child: any) => (
                                <div key={child.id} className="bg-zinc-800/30 border border-zinc-800/50 rounded-xl p-3 flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                                    <User size={14} />
                                  </div>
                                  <div className="flex-1 grid grid-cols-2 gap-3">
                                    <input 
                                      type="text" 
                                      value={child.name} 
                                      onChange={e => updateChild(wife.id, child.id, 'name', e.target.value)}
                                      className="bg-transparent border-b border-zinc-700 text-white text-xs font-bold focus:outline-none focus:border-red-600 transition-all"
                                      placeholder="اسم الابن"
                                    />
                                    <select 
                                      value={child.gender} 
                                      onChange={e => updateChild(wife.id, child.id, 'gender', e.target.value)}
                                      className="bg-transparent border-b border-zinc-700 text-white text-[10px] font-bold focus:outline-none focus:border-red-600 transition-all"
                                    >
                                      <option value="boy">ولد</option>
                                      <option value="girl">بنت</option>
                                    </select>
                                  </div>
                                  <button 
                                    onClick={() => removeChild(wife.id, child.id)}
                                    className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              {(wife.children || []).length === 0 && (
                                <p className="text-[10px] text-zinc-600 font-bold italic">لا يوجد أبناء لهذه الزوجة</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {(formData.family?.wives || []).length === 0 && (
                          <div className="text-center py-12 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem]">
                            <Users size={48} className="mx-auto text-zinc-800 mb-4" />
                            <p className="text-zinc-500 text-sm font-bold">لا توجد عائلة مسجلة لهذا اللاعب</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="p-8 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-4 shrink-0 bg-zinc-900/20 rounded-b-[2.5rem]">
                <button 
                  onClick={() => setEditingUser(null)} 
                  className="px-8 py-4 rounded-2xl font-black text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-widest text-xs"
                >
                  {t('admin.cancel')}
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-600/20 active:scale-95 uppercase tracking-widest text-xs"
                >
                  <Save size={18} />
                  {t('admin.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('admin.confirmDelete')}</h3>
            <p className="text-zinc-400 mb-6">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeletingUser(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                {t('admin.cancel')}
              </button>
              <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors">
                {t('admin.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Gang Confirmation Modal */}
      {resetGangUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-orange-500">تصفير بيانات العصابة</h3>
            <p className="text-zinc-400 mb-6">
              هل أنت متأكد من تصفير بيانات العصابة للاعب <span className="font-bold text-white">{resetGangUser.displayName}</span>؟
              <br/><br/>
              سيتمكن بعدها من الانضمام أو إنشاء عصابة جديدة.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setResetGangUser(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                {t('admin.cancel')}
              </button>
              <button onClick={executeResetUserGang} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-colors">
                تأكيد التصفير
              </button>
            </div>
          </div>
        </div>
      )}
      {deletingGang && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-red-500">حذف العصابة</h3>
            <p className="text-zinc-400 mb-6">
              هل أنت متأكد من حذف هذه العصابة؟ سيتم تصفير بيانات جميع أعضائها.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeletingGang(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                {t('admin.cancel')}
              </button>
              <button onClick={executeAdminDeleteGang} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors">
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {removingMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserMinus size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-red-500">إزالة عضو</h3>
            <p className="text-zinc-400 mb-6">
              هل أنت متأكد من إزالة <span className="font-bold text-white">{removingMember.memberName}</span> من العصابة؟
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setRemovingMember(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                {t('admin.cancel')}
              </button>
              <button onClick={executeAdminRemoveMember} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors">
                تأكيد الإزالة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Restore Confirmation Modal */}
      {databaseRestoreFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-red-500">تحذير حرج!</h3>
            <p className="text-zinc-400 mb-6">
              هذه العملية ستقوم باستبدال جميع بيانات اللعبة بالكامل (اللاعبين، العصابات، الرسائل، السجلات، إلخ) بالبيانات الموجودة في الملف ({databaseRestoreFile.name}). 
              <br/><br/>
              <strong>هل أنت متأكد من رغبتك في المتابعة؟ لا يمكن التراجع عن هذه العملية!</strong>
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDatabaseRestoreFile(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                {t('admin.cancel')}
              </button>
              <button onClick={executeDatabaseRestore} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors">
                تأكيد الاستعادة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Old Account Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">استعادة الحساب القديم</h3>
            <p className="text-zinc-400 mb-6">هل أنت متأكد من رغبتك في استعادة حسابك القديم؟ سيتم نقل جميع البيانات إلى حسابك الحالي وحذف الحساب القديم.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowRestoreConfirm(false)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                {t('admin.cancel')}
              </button>
              <button onClick={executeRestoreOldAccount} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold transition-colors">
                تأكيد الاستعادة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Account Confirmation Modal */}
      {linkingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">ربط الحساب</h3>
            <p className="text-zinc-400 mb-6">هل أنت متأكد من رغبتك في ربط حسابك الحالي باللاعب <span className="text-white font-bold">"{linkingUser.displayName}"</span>؟ سيتم نقل جميع بيانات هذا اللاعب إلى حسابك الحالي وحذفه من القائمة.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setLinkingUser(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                {t('admin.cancel')}
              </button>
              <button onClick={executeLinkAccount} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors">
                تأكيد الربط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Message Modal */}
      {messagingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Send className="text-purple-500" />
                إرسال رسالة إلى {messagingUser.displayName}
              </h3>
              <button onClick={() => setMessagingUser(null)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={directMessage}
                onChange={(e) => setDirectMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:border-purple-500 focus:outline-none min-h-[120px] resize-none"
              />
            </div>
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 shrink-0">
              <button onClick={() => setMessagingUser(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                إلغاء
              </button>
              <button 
                onClick={handleSendDirectMessage} 
                disabled={sendingDirectMessage || !directMessage.trim()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-2 transition-colors"
              >
                {sendingDirectMessage ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
