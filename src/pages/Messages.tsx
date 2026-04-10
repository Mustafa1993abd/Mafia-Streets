import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { MARKET_ITEMS } from '../lib/items';
import clsx from 'clsx';
import { 
  MessageCircle, 
  Bell, 
  Phone, 
  User, 
  Shield, 
  Zap, 
  Crosshair, 
  Trash2, 
  CheckCircle,
  Send,
  ChevronRight,
  ChevronLeft,
  Signal,
  Wifi,
  Battery,
  Search,
  X as CloseIcon,
  LayoutGrid,
  CreditCard,
  Smartphone,
  Globe,
  Newspaper,
  ArrowRightLeft,
  Plus,
  History,
  MoreHorizontal,
  Camera,
  Settings,
  Mail,
  Facebook,
  Home,
  Image as ImageIcon,
  MicOff,
  Volume2,
  Ban,
  Info,
  Video,
  ArrowUp,
  Mic,
  Delete
} from 'lucide-react';
import { safeFetch, safeToDate, safeToMillis } from '../lib/utils';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  deleteDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  getDocs,
  or,
  getDoc,
  runTransaction,
  limit,
  and
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router-dom';
import i18n from '../i18n/config';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  text?: string;
  type: 'private' | 'system' | 'broadcast' | 'battle' | 'target' | 'heist_invite';
  read: boolean;
  timestamp: any;
  heistId?: string;
  role?: string;
  share?: number;
}

const Messages: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<'home' | 'messages' | 'notifications' | 'dialer' | 'chat' | 'superkey' | 'esim' | 'fb' | 'contacts' | 'settings' | 'calls'>('home');
  const [activeChatUser, setActiveChatUser] = useState<{id: string, name: string, photoURL?: string} | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNewMessageMode, setIsNewMessageMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // SuperKey State
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferRecipientName, setTransferRecipientName] = useState('');
  const [transferSearchResults, setTransferSearchResults] = useState<any[]>([]);
  const [isSearchingTransfer, setIsSearchingTransfer] = useState(false);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);

  // Settings State
  const [phoneWallpaper, setPhoneWallpaper] = useState(profile?.phoneWallpaper || 'https://picsum.photos/seed/ios/1000/2000');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [foundContact, setFoundContact] = useState<any>(null);
  const [isSearchingContact, setIsSearchingContact] = useState(false);

  useEffect(() => {
    const searchPhone = async () => {
      // Convert Arabic numerals to English numerals
      const englishPhone = newContactPhone.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
      const trimmedPhone = englishPhone.trim();
      
      if (trimmedPhone.length >= 3) {
        setIsSearchingContact(true);
        try {
          const q = query(collection(db, 'users_public'), where('phoneNumber', '==', trimmedPhone), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setFoundContact({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
          } else {
            setFoundContact(null);
          }
        } catch (error) {
          console.error('Error searching phone:', error);
        } finally {
          setIsSearchingContact(false);
        }
      } else {
        setFoundContact(null);
      }
    };
    
    const timeoutId = setTimeout(searchPhone, 500);
    return () => clearTimeout(timeoutId);
  }, [newContactPhone]);
  const [userCache, setUserCache] = useState<Record<string, { name: string, photoURL?: string }>>({});

  // FB News State
  const [newsPosts, setNewsPosts] = useState<any[]>([]);

  // eSIM State
  const [isBuyingESim, setIsBuyingESim] = useState(false);
  const [isCalling, setIsCalling] = useState<{name: string, id: string, callId?: string, photoURL?: string} | null>(null);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // Listen to blocked users
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'blocked_users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlockedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error listening to blocked users:', error);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to incoming calls
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'active_calls'), where('receiverId', '==', user.uid), where('status', '==', 'calling'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setIncomingCall({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setIncomingCall(null);
      }
    }, (error) => {
      console.error('Error listening to incoming calls:', error);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'call_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCallLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/call_logs`);
    });
    return () => unsubscribe();
  }, [user]);

  const initiateCall = async (targetId: string, targetName: string) => {
    if (blockedUsers.some(b => b.blockedId === targetId)) {
      toast.error('لا يمكنك الاتصال بشخص قمت بحظره');
      return;
    }

    try {
      const callRef = await addDoc(collection(db, 'active_calls'), {
        callerId: user?.uid,
        callerName: profile?.displayName || 'مجهول',
        callerPhoto: profile?.photoURL || null,
        receiverId: targetId,
        status: 'calling',
        timestamp: serverTimestamp()
      });

      setIsCalling({ name: targetName, id: targetId, callId: callRef.id });
      
      setTimeout(async () => {
        const callDoc = await getDoc(callRef);
        if (callDoc.exists() && callDoc.data().status === 'calling') {
          await updateDoc(callRef, { status: 'missed' });
          setIsCalling(null);
          toast.error('لم يتم الرد');
          
          // Add to receiver's call logs
          try {
            await addDoc(collection(db, 'users', targetId, 'call_logs'), {
              callerId: user?.uid,
              callerName: profile?.displayName || 'مجهول',
              timestamp: serverTimestamp(),
              type: 'missed'
            });
          } catch (e) {
            console.error('Error adding call log:', e);
          }

          // Add to my call logs
          try {
            await addDoc(collection(db, 'users', user!.uid, 'call_logs'), {
              callerId: targetId,
              callerName: targetName,
              timestamp: serverTimestamp(),
              type: 'outgoing_unanswered'
            });
          } catch (e) {
            console.error('Error adding call log:', e);
          }
        }
      }, 5000);
    } catch (e) {
      console.error('Error initiating call:', e);
      toast.error('فشل في بدء المكالمة');
    }
  };

  const handleAnswerCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'active_calls', incomingCall.id), { status: 'answered' });
      setIncomingCall(null);
      toast.success('تم الرد على المكالمة');
      setActiveChatUser({ id: incomingCall.callerId, name: incomingCall.callerName, photoURL: incomingCall.callerPhoto });
      setView('chat');
    } catch (e) {
      console.error('Error answering call:', e);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'active_calls', incomingCall.id), { status: 'rejected' });
      setIncomingCall(null);
    } catch (e) {
      console.error('Error rejecting call:', e);
    }
  };

  const handleBlockUser = async (contact: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'blocked_users', contact.contactUid), {
        blockedId: contact.contactUid,
        blockedName: contact.name,
        timestamp: serverTimestamp()
      });
      toast.success('تم حظر المستخدم');
    } catch (e) {
      console.error('Error blocking user:', e);
      toast.error('فشل في حظر المستخدم');
    }
  };

  const handleUnblockUser = async (blockedId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'blocked_users', blockedId));
      toast.success('تم فك الحظر');
    } catch (e) {
      console.error('Error unblocking user:', e);
      toast.error('فشل في فك الحظر');
    }
  };

  const handleAdd50Posts = async () => {
    if (!profile || profile.role !== 'Admin') return;
    toast.info('جاري حذف المنشورات السابقة وإضافة 50 منشور جديد...');
    try {
      // Delete existing posts
      const postsSnapshot = await getDocs(collection(db, 'news_posts'));
      for (const postDoc of postsSnapshot.docs) {
        await deleteDoc(doc(db, 'news_posts', postDoc.id));
      }

      const iraqiTemplates = [
        { title: 'عاجل: سطو مسلح', content: 'قبل شوية صار سطو مسلح على بنك بالكرادة، والشرطة طوقت المكان والوضع متوتر.', seed: 'robbery' },
        { title: 'خبر مفجع: مقتل شخص', content: 'للاسف تم العثور على جثة شخص مقتول بظروف غامضة باطراف بغداد، والتحقيقات مستمرة.', seed: 'crime' },
        { title: 'الشرطة تلقي القبض', content: 'مكافحة الاجرام تكدر تلقي القبض على عصابة متخصصة بسرقة السيارات بعد مطاردة عنيفة.', seed: 'police' },
        { title: 'شجار عنيف', content: 'عركة قوية صارت بسوق الشورجة بين مجموعة شباب وانتهت بتدخل قوات الشغب.', seed: 'fight' },
        { title: 'سرقة محل ذهب', content: 'بوضح النهار، عصابة تبوك محل ذهب بالمنصور وتنهزم لجهة مجهولة.', seed: 'gold' },
        { title: 'خبر عاجل: انفجار', content: 'صوت انفجار قوي انسمع قبل دقايق، تبين انه عبوة ناسفة استهدفت رتل، بدون اصابات.', seed: 'explosion' },
        { title: 'عملية نوعية', content: 'القوات الامنية تنفذ عملية نوعية وتطيح باكبر تاجر مخدرات بالبصرة.', seed: 'arrest' },
        { title: 'حريق هائل', content: 'حريق جبير التهم مخازن تجارية بالجميلة وفرق الدفاع المدني تحاول تسيطر عليه.', seed: 'fire' },
        { title: 'هروب سجين', content: 'انباء عن هروب سجين خطير من احد السجون، واستنفار امني للبحث عنه.', seed: 'prison' },
        { title: 'اشتباكات مسلحة', content: 'اشتباكات مسلحة بين عشيرتين بمحافظة ميسان والوضع خارج السيطرة حالياً.', seed: 'gunfight' }
      ];

      const mockPosts = Array.from({ length: 50 }).map((_, i) => {
        const template = iraqiTemplates[Math.floor(Math.random() * iraqiTemplates.length)];
        return {
          title: template.title,
          content: template.content,
          type: i % 3 === 0 ? "kill" : i % 3 === 1 ? "new_player" : "news",
          timestamp: serverTimestamp(),
          image: `https://picsum.photos/seed/${template.seed}${Math.floor(Math.random() * 1000)}/400/300`
        };
      });
      
      for (const post of mockPosts) {
        await addDoc(collection(db, 'news_posts'), post);
      }
      toast.success('تمت العملية بنجاح');
    } catch (error) {
      toast.error('فشل في العملية');
    }
  };

  useEffect(() => {
    if (!activeChatUser?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'users_public', activeChatUser.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setActiveChatUser(prev => prev ? { ...prev, name: data.displayName, photoURL: data.photoURL } : null);
      }
    }, (error) => {
      console.error('Error listening to recipient profile:', error);
    });
    return () => unsubscribe();
  }, [activeChatUser?.id]);

  const dateLocale = i18n.language === 'ar' ? ar : enUS;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'messages'),
      or(
        where('receiverId', 'in', [user.uid, 'all']),
        where('senderId', '==', user.uid)
      ),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      const userIdsToFetch = new Set<string>();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({ id: doc.id, ...data } as Message);
        if (data.senderId && data.senderId !== user.uid && data.senderId !== 'system' && data.senderId !== 'bank_system') userIdsToFetch.add(data.senderId);
        if (data.receiverId && data.receiverId !== user.uid && data.receiverId !== 'all') userIdsToFetch.add(data.receiverId);
      });
      setMessages(msgs);

      // Fetch missing user profiles
      userIdsToFetch.forEach(async (id) => {
        if (!userCache[id]) {
          try {
            const userDoc = await getDoc(doc(db, 'users_public', id));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserCache(prev => ({ ...prev, [id]: { name: data.displayName, photoURL: data.photoURL } }));
            }
          } catch (e) {
            console.error('Error fetching user profile', e);
          }
        }
      });

    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'contacts'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/contacts`);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'news_posts'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty && profile?.role === 'Admin') {
        // Add 50 mock news posts
        const mockPosts = Array.from({ length: 50 }).map((_, i) => ({
          title: `خبر عاجل ${i + 1}`,
          content: `هذا هو المنشور رقم ${i + 1} من المنشورات العشوائية التي تم إنشاؤها تلقائياً.`,
          type: i % 3 === 0 ? "kill" : i % 3 === 1 ? "new_player" : "news",
          timestamp: serverTimestamp(),
          image: `https://picsum.photos/seed/${i}/400/300`
        }));
        mockPosts.forEach(post => addDoc(collection(db, 'news_posts'), post));
      } else {
        setNewsPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'news_posts');
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transfer_history'),
      or(where('fromId', '==', user.uid), where('toId', '==', user.uid)),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransferHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transfer_history');
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddContact = async () => {
    if (!user || !newContactPhone.trim() || !foundContact) {
      toast.error('الرجاء إدخال رقم هاتف صحيح');
      return;
    }
    try {
      await addDoc(collection(db, 'users', user.uid, 'contacts'), {
        name: foundContact.displayName || newContactName.trim() || 'بدون اسم',
        phoneNumber: newContactPhone.trim(),
        photoURL: foundContact.photoURL || null,
        contactUid: foundContact.id,
        timestamp: serverTimestamp()
      });
      setNewContactName('');
      setNewContactPhone('');
      setFoundContact(null);
      setIsAddingContact(false);
      toast.success('تمت إضافة الجهة بنجاح');
    } catch (error) {
      toast.error('فشل في إضافة الجهة');
    }
  };

  const handleDeleteConversation = async (otherId: string) => {
    const msgsToDelete = messages.filter(m => 
      (m.senderId === user?.uid && m.receiverId === otherId) || 
      (m.senderId === otherId && m.receiverId === user?.uid)
    );
    
    try {
      await Promise.all(msgsToDelete.map(m => deleteDoc(doc(db, 'messages', m.id))));
      toast.success('تم حذف المراسلة');
    } catch (error) {
      toast.error('فشل في حذف المراسلة');
    }
  };

  const handleTransferMoney = async () => {
    if (!user || !profile || !transferAmount || !transferRecipient) return;
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (profile.bankBalance < amount) {
      toast.error('رصيد البنك غير كافي');
      return;
    }

    if (transferRecipient === profile.uid) {
      toast.error('لا يمكنك تحويل الأموال لنفسك');
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const fromRef = doc(db, 'users', profile.uid);
        const toRef = doc(db, 'users', transferRecipient);
        
        const fromDoc = await transaction.get(fromRef);
        const toDoc = await transaction.get(toRef);

        if (!fromDoc.exists()) throw new Error('بياناتك غير موجودة');
        if (!toDoc.exists()) throw new Error('المستلم غير موجود');

        const currentFromBalance = fromDoc.data().bankBalance || 0;
        if (currentFromBalance < amount) throw new Error('رصيدك في البنك غير كافي');

        transaction.update(fromRef, { bankBalance: currentFromBalance - amount });
        transaction.update(toRef, { bankBalance: (toDoc.data().bankBalance || 0) + amount });
        
        transaction.set(doc(collection(db, 'transfer_history')), {
          fromId: profile.uid,
          fromName: profile.displayName,
          toId: transferRecipient,
          toName: toDoc.data().displayName,
          amount,
          timestamp: serverTimestamp()
        });

        // Add notification for recipient
        transaction.set(doc(collection(db, 'messages')), {
          senderId: 'bank_system',
          senderName: 'البنك',
          receiverId: transferRecipient,
          content: `لقد استلمت مبلغ $${amount.toLocaleString()} من ${profile.displayName}`,
          type: 'system',
          read: false,
          timestamp: serverTimestamp()
        });

        // Add private message for recipient
        transaction.set(doc(collection(db, 'messages')), {
          senderId: 'bank_system',
          senderName: 'البنك',
          receiverId: transferRecipient,
          content: `لقد استلمت مبلغ $${amount.toLocaleString()} من ${profile.displayName}`,
          type: 'private',
          read: false,
          timestamp: serverTimestamp()
        });
      });
      setTransferAmount('');
      setTransferRecipient('');
      setTransferRecipientName('');
      toast.success('تم التحويل بنجاح');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `bank_transfer/${transferRecipient}`);
      toast.error(error.message || 'فشل في التحويل');
    }
  };

  const handleESimAction = async (action: 'activate' | 'buy' | 'remove') => {
    if (!user || !profile) return;
    try {
      if (action === 'buy') {
        if (profile.cleanMoney < 100000) {
          toast.error('المال النظيف غير كافي (100,000)');
          return;
        }
        await updateDoc(doc(db, 'users', profile.uid), {
          cleanMoney: profile.cleanMoney - 100000,
          hasESim: true,
          phoneNumber: Math.floor(10000000 + Math.random() * 90000000).toString()
        });
        toast.success('تم شراء eSIM بنجاح');
      } else if (action === 'remove') {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasESim: false,
          phoneNumber: null
        });
        toast.success('تمت إزالة eSIM');
      }
    } catch (error) {
      toast.error('فشل في تنفيذ العملية');
    }
  };

  useEffect(() => {
    if (location.state?.recipientId && location.state?.recipientName) {
      setActiveChatUser({ id: location.state.recipientId, name: location.state.recipientName });
      setView('chat');
    }
  }, [location.state]);

  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [view, messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !activeChatUser || !messageContent.trim()) return;

    if (!profile) {
      toast.error(t('جاري تحميل بيانات الملف الشخصي... يرجى المحاولة مرة أخرى'));
      return;
    }

    const content = messageContent.trim();
    setMessageContent('');
    setLoading(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: profile.displayName,
        senderPhotoURL: profile.photoURL || null,
        receiverId: activeChatUser.id,
        receiverName: activeChatUser.name,
        receiverPhotoURL: activeChatUser.photoURL || null,
        content: content,
        type: 'private',
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read when entering chat
  useEffect(() => {
    if (view === 'chat' && activeChatUser && user) {
      const unreadMsgs = messages.filter(m => 
        m.senderId === activeChatUser.id && 
        m.receiverId === user.uid && 
        !m.read
      );

      unreadMsgs.forEach(async (msg) => {
        try {
          await updateDoc(doc(db, 'messages', msg.id), { read: true });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });
    }
  }, [view, activeChatUser, messages, user]);

  useEffect(() => {
    const searchTransferUsers = async () => {
      if (!transferRecipientName.trim() || transferRecipientName.length < 1) {
        setTransferSearchResults([]);
        return;
      }
      setIsSearchingTransfer(true);
      try {
        const searchTerm = transferRecipientName.toLowerCase();
        const q = query(
          collection(db, 'users_public'),
          where('displayNameLower', '>=', searchTerm),
          where('displayNameLower', '<=', searchTerm + '\uf8ff'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        setTransferSearchResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Transfer search error:', error);
      } finally {
        setIsSearchingTransfer(false);
      }
    };

    const debounce = setTimeout(searchTransferUsers, 300);
    return () => clearTimeout(debounce);
  }, [transferRecipientName]);

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', msgId));
      toast.success(t('common.success'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${msgId}`);
      toast.error(t('common.error'));
    }
  };

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        // Search in users_public directly
        const q = query(
          collection(db, 'users_public'),
          or(
            and(where('displayNameLower', '>=', searchTerm.toLowerCase()), where('displayNameLower', '<=', searchTerm.toLowerCase() + '\uf8ff')),
            where('phoneNumber', '==', searchTerm)
          ),
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        const users = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => u.id !== user?.uid);
          
        setSearchResults(users);
      } catch (error) {
        console.error('Search error:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, user]);

  const renderCallLogs = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 pt-12 pb-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <button className="text-blue-600 font-medium text-lg">تحرير</button>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button className="px-4 py-1 text-xs font-bold bg-white rounded-md shadow-sm text-slate-900">الكل</button>
            <button className="px-4 py-1 text-xs font-bold text-slate-500">لم يرد عليها</button>
          </div>
          <div className="w-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">الأخيرة</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {callLogs.map((log) => {
          const isIncoming = log.receiverId === user?.uid;
          const otherName = isIncoming ? log.callerName : log.receiverName;
          const otherPhoto = isIncoming ? log.callerPhoto : log.receiverPhoto;
          const isMissed = isIncoming && log.status === 'rejected';

          return (
            <div key={log.id} className="px-6 py-3 border-b border-slate-50 flex items-center gap-4 active:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {otherPhoto ? (
                  <img src={otherPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className={clsx("font-bold truncate", isMissed ? "text-red-500" : "text-slate-900")}>
                    {otherName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {log.timestamp ? format(safeToDate(log.timestamp), 'HH:mm') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Phone className="w-3 h-3" />
                  <span>{isIncoming ? 'واردة' : 'صادرة'}</span>
                </div>
              </div>
              <button className="p-2 text-slate-300">
                <Info className="w-5 h-5" />
              </button>
            </div>
          );
        })}
        {callLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <History className="w-16 h-16 opacity-10" />
            <p className="text-sm mt-4">لا توجد مكالمات أخيرة</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 bg-white border-b flex items-center gap-3">
        <Settings className="w-6 h-6 text-slate-600" />
        <h2 className="text-xl font-bold text-slate-800">الإعدادات</h2>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">المظهر</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-slate-800">خلفية الشاشة</span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  'https://picsum.photos/seed/ios/1000/2000',
                  'https://picsum.photos/seed/nature/1000/2000',
                  'https://picsum.photos/seed/city/1000/2000',
                  'https://picsum.photos/seed/abstract/1000/2000',
                  'https://picsum.photos/seed/dark/1000/2000',
                  'https://picsum.photos/seed/space/1000/2000',
                ].map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhoneWallpaper(url)}
                    className={`aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all ${phoneWallpaper === url ? 'border-blue-500 scale-95' : 'border-transparent'}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">رابط خلفية مخصص</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={phoneWallpaper}
                    onChange={(e) => setPhoneWallpaper(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 p-2 bg-slate-100 rounded-lg text-xs focus:outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">قائمة المحظورين</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {blockedUsers.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">لا يوجد مستخدمين محظورين</p>
            ) : (
              blockedUsers.map(b => (
                <div key={b.id} className="flex justify-between items-center p-4 border-b last:border-0">
                  <span className="font-bold text-slate-800">{b.blockedName}</span>
                  <button onClick={() => handleUnblockUser(b.blockedId)} className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">فك الحظر</button>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={async () => {
            if (!user) return;
            setIsUpdatingSettings(true);
            try {
              await updateDoc(doc(db, 'users', profile.uid), {
                phoneWallpaper: phoneWallpaper
              });
              toast.success('تم حفظ الإعدادات');
            } catch (error) {
              toast.error('فشل حفظ الإعدادات');
            } finally {
              setIsUpdatingSettings(false);
            }
          }}
          disabled={isUpdatingSettings}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:opacity-50"
        >
          {isUpdatingSettings ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );

  const renderHome = () => {
    const unreadMessagesCount = messages.filter(m => m.receiverId === user?.uid && !m.read && m.type === 'private').length;
    const unreadNotificationsCount = messages.filter(m => (m.receiverId === user?.uid || m.receiverId === 'all') && !m.read && m.type !== 'private').length;

    const apps = [
      { id: 'messages', name: 'الرسائل', icon: <MessageCircle className="w-8 h-8 text-white drop-shadow-md" />, color: 'bg-gradient-to-b from-[#62ef81] to-[#34c759] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]', badge: unreadMessagesCount },
      { id: 'contacts', name: 'جهات الاتصال', icon: <User className="w-8 h-8 text-white drop-shadow-md" />, color: 'bg-gradient-to-b from-[#929292] to-[#5a5a5a] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' },
      { id: 'dialer', name: 'الهاتف', icon: <Phone className="w-8 h-8 text-white drop-shadow-md" />, color: 'bg-gradient-to-b from-[#58d764] to-[#28cd41] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' },
      { id: 'superkey', name: 'البنك', icon: <img src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png" alt="Bank" className="w-full h-full object-cover rounded-2xl" />, color: 'bg-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]' },
      { id: 'esim', name: 'eSIM', icon: <Smartphone className="w-8 h-8 text-white drop-shadow-md" />, color: 'bg-gradient-to-b from-[#bf5af2] to-[#af52de] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' },
      { id: 'fb', name: 'FB', icon: <Facebook className="w-8 h-8 text-white drop-shadow-md" />, color: 'bg-gradient-to-b from-[#0a84ff] to-[#007aff] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' },
      { id: 'settings', name: 'الإعدادات', icon: <Settings className="w-8 h-8 text-white drop-shadow-md" />, color: 'bg-gradient-to-b from-[#8e8e93] to-[#636366] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' },
      { id: 'notifications', name: 'التنبيهات', icon: <Bell className="w-8 h-8 text-white drop-shadow-md" />, color: 'bg-gradient-to-b from-[#ff453a] to-[#ff3b30] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]', badge: unreadNotificationsCount },
    ];

    return (
      <div className="p-6 grid grid-cols-4 gap-6">
        {apps.map((app) => (
          <motion.button
            key={app.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setView(app.id as any)}
            className="flex flex-col items-center gap-1.5 relative"
          >
            <div className={`${app.color} w-[60px] h-[60px] rounded-[14px] flex items-center justify-center shadow-lg relative border border-white/10 overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
              {app.icon}
              {app.badge !== undefined && app.badge > 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md z-10"
                >
                  {app.badge > 99 ? '99+' : app.badge}
                </motion.div>
              )}
            </div>
            <span className="text-[11px] font-semibold text-white text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight">{app.name}</span>
          </motion.button>
        ))}
      </div>
    );
  };

  const renderSuperKey = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 bg-blue-600 text-white rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">البنك</h2>
          <img src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png" alt="Bank" className="w-8 h-8 object-contain drop-shadow-md" />
        </div>
        <div className="space-y-4">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
            <p className="text-sm opacity-80">الرصيد البنكي</p>
            <p className="text-3xl font-bold">${profile?.bankBalance?.toLocaleString() || 0}</p>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-white/10 p-3 rounded-xl backdrop-blur-md">
              <p className="text-xs opacity-80">المال النظيف</p>
              <p className="text-lg font-semibold">${profile?.cleanMoney?.toLocaleString() || 0}</p>
            </div>
            <div className="flex-1 bg-white/10 p-3 rounded-xl backdrop-blur-md">
              <p className="text-xs opacity-80">الفيزا</p>
              <p className="text-lg font-semibold">نشطة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800">
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            تحويل أموال
          </h3>
          <div className="space-y-3 relative">
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن اسم المستلم..."
                value={transferRecipientName}
                onChange={(e) => {
                  setTransferRecipientName(e.target.value);
                  if (transferRecipient) setTransferRecipient('');
                }}
                className="w-full p-3 pr-10 pl-10 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
              {transferRecipientName.length > 0 && (
                <button
                  onClick={() => {
                    setTransferRecipientName('');
                    setTransferRecipient('');
                    setTransferSearchResults([]);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
              {isSearchingTransfer && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {transferSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                  {transferSearchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => {
                        setTransferRecipient(res.id);
                        setTransferRecipientName(res.displayName);
                        setTransferSearchResults([]);
                      }}
                      className="w-full p-3 text-right hover:bg-slate-50 flex items-center gap-3 border-b last:border-0 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden border border-slate-100">
                        {res.photoURL ? (
                          <img src={res.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                            {res.displayName?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{res.displayName}</p>
                        <p className="text-[10px] text-slate-400 truncate">ID: {res.id.slice(0, 8)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {transferRecipientName.trim().length > 0 && !isSearchingTransfer && transferSearchResults.length === 0 && !transferRecipient && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 text-center text-slate-400 text-sm">
                  لا يوجد لاعب بهذا الاسم
                </div>
              )}
            </div>
            <input
              type="number"
              placeholder="المبلغ"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full p-3 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
            <button
              onClick={handleTransferMoney}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              تحويل الآن
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2 px-2 text-slate-800">
            <History className="w-4 h-4 text-slate-400" />
            آخر العمليات
          </h3>
          {transferHistory.map((h) => (
            <div key={h.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-50">
              <div>
                <p className="font-bold text-sm text-slate-800">{h.fromId === user?.uid ? `إلى: ${h.toName}` : `من: ${h.fromName}`}</p>
                <p className="text-[10px] text-slate-400">{safeToDate(h.timestamp).toLocaleString()}</p>
              </div>
              <p className={`font-bold ${h.fromId === user?.uid ? 'text-red-500' : 'text-green-500'}`}>
                {h.fromId === user?.uid ? '-' : '+'}${h.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderESim = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-8 bg-purple-600 text-white rounded-b-3xl text-center">
        <Smartphone className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">مركز eSIM</h2>
        <p className="text-sm opacity-80">إدارة اتصالاتك الرقمية</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
          <p className="text-slate-400 text-sm mb-2">حالة الشريحة</p>
          {profile?.hasESim ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                <CheckCircle className="w-3 h-3" />
                نشطة
              </div>
              <p className="text-3xl font-mono font-bold tracking-widest text-slate-800">{profile.phoneNumber}</p>
              <button 
                onClick={() => handleESimAction('remove')}
                className="w-full py-3 border-2 border-red-100 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition-colors"
              >
                إزالة الشريحة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-bold">
                غير متوفرة
              </div>
              <p className="text-slate-400 text-sm">لا توجد شريحة نشطة حالياً</p>
              <button 
                onClick={() => handleESimAction('buy')}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors"
              >
                شراء شريحة جديدة ($100,000)
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            <span className="text-xs font-bold text-slate-800">تنشيط</span>
          </button>
          <button className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-bold text-slate-800">استبدال</span>
          </button>
        </div>
      </div>
    </div>
  );

  const handleLikePost = async (postId: string) => {
    try {
      const postRef = doc(db, 'news_posts', postId);
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const currentLikes = postDoc.data().likes || 0;
        const likedBy = postDoc.data().likedBy || [];
        
        if (likedBy.includes(user?.uid)) {
          await updateDoc(postRef, {
            likes: Math.max(0, currentLikes - 1),
            likedBy: likedBy.filter((id: string) => id !== user?.uid)
          });
        } else {
          await updateDoc(postRef, {
            likes: currentLikes + 1,
            likedBy: [...likedBy, user?.uid]
          });
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const renderFB = () => (
    <div className="flex flex-col h-full bg-slate-100">
      <div className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-2xl font-extrabold text-blue-600 tracking-tight">facebook</h2>
        <div className="flex gap-2">
          {profile?.role === 'Admin' && (
            <button onClick={handleAdd50Posts} className="p-2 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
              +50
            </button>
          )}
          <div className="p-2 bg-slate-100 rounded-full"><Search className="w-5 h-5 text-slate-600" /></div>
          <div className="p-2 bg-slate-100 rounded-full"><MessageCircle className="w-5 h-5 text-slate-600" /></div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 space-y-2">
        {newsPosts.map((post) => (
          <div key={post.id} className="bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {post.type === 'kill' ? <Shield className="w-5 h-5" /> : <Newspaper className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">{post.title}</p>
                <p className="text-[10px] text-slate-400">{safeToDate(post.timestamp).toLocaleString('ar-IQ')}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{post.content}</p>
            {post.image && (
              <img src={post.image} alt="" className="w-full h-48 object-cover rounded-xl" referrerPolicy="no-referrer" />
            )}
            <div className="flex border-t pt-3 gap-4">
              <button 
                onClick={() => handleLikePost(post.id)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 text-xs font-bold transition-colors",
                  post.likedBy?.includes(user?.uid) ? "text-blue-600" : "text-slate-500"
                )}
              >
                <MoreHorizontal className="w-4 h-4" /> 
                {post.likes || 0} إعجاب
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 text-slate-500 text-xs font-bold"><MessageCircle className="w-4 h-4" /> تعليق</button>
              <button className="flex-1 flex items-center justify-center gap-2 text-slate-500 text-xs font-bold"><ArrowRightLeft className="w-4 h-4" /> مشاركة</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 pt-12 pb-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <button className="text-blue-600 font-medium text-lg">المجموعات</button>
          <button 
            onClick={() => setIsAddingContact(true)}
            className="p-1 text-blue-600 active:scale-90 transition-transform"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">جهات الاتصال</h1>
        
        <div className="relative mt-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input 
            type="text" 
            placeholder="بحث"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-900"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* My Profile Section */}
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{profile?.displayName}</p>
            <p className="text-sm text-slate-400">بطاقتي</p>
          </div>
        </div>

        {contacts.map((contact) => (
          <div key={contact.id} className="px-6 py-3 border-b border-slate-50 flex items-center justify-between active:bg-slate-50 transition-colors">
            <p className="font-bold text-slate-900">{contact.name}</p>
            <div className="flex gap-4">
              <button onClick={() => initiateCall(contact.contactUid || '', contact.name)} className="text-blue-600">
                <Phone className="w-5 h-5" />
              </button>
              <button 
                onClick={async () => {
                  const q = query(collection(db, 'users_public'), where('phoneNumber', '==', contact.phoneNumber), limit(1));
                  const snapshot = await getDocs(q);
                  if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    setActiveChatUser({ id: snapshot.docs[0].id, name: userData.displayName, photoURL: userData.photoURL });
                    setView('chat');
                  } else {
                    toast.error('هذا الرقم غير مرتبط بحساب لاعب');
                  }
                }}
                className="text-blue-600"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAddingContact && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full rounded-3xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">إضافة جهة اتصال</h3>
            <input 
              type="text" 
              placeholder="رقم الهاتف (eSIM)" 
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="w-full p-3 bg-slate-100 rounded-xl focus:outline-none text-slate-800"
              autoFocus
            />
            
            {isSearchingContact ? (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : foundContact ? (
              <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-4 border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                  {foundContact.photoURL ? (
                    <img src={foundContact.photoURL} alt={foundContact.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{foundContact.displayName}</p>
                  <p className="text-xs text-slate-500">eSIM: {foundContact.phoneNumber}</p>
                </div>
              </div>
            ) : newContactPhone.length >= 3 ? (
              <div className="text-center p-4 text-red-500 text-sm font-bold">
                لم يتم العثور على لاعب بهذا الرقم
              </div>
            ) : null}

            <input 
              type="text" 
              placeholder="الاسم (اختياري)" 
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="w-full p-3 bg-slate-100 rounded-xl focus:outline-none text-slate-800"
            />
            <div className="flex gap-3">
              <button 
                onClick={handleAddContact} 
                disabled={!foundContact}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors ${foundContact ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
              >
                حفظ
              </button>
              <button onClick={() => {
                setIsAddingContact(false);
                setNewContactPhone('');
                setNewContactName('');
                setFoundContact(null);
              }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">إلغاء</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  const renderMessages = () => {
    const filteredMessages = messages.filter(m => {
      const otherId = m.senderId === user.uid ? m.receiverId : m.senderId;
      return !blockedUsers.some(b => b.blockedId === otherId);
    });
    const conversations = filteredMessages.filter(m => m.type !== 'system').reduce((acc: any, msg) => {
      const otherId = msg.senderId === user?.uid ? msg.receiverId : msg.senderId;
      if (otherId === 'all') return acc;
      
      if (!acc[otherId] || safeToMillis(acc[otherId].timestamp) < safeToMillis(msg.timestamp)) {
        acc[otherId] = msg;
      }
      return acc;
    }, {});

    const filteredConversations = Object.entries(conversations).filter(([otherId, msg]: [string, any]) => {
      if (!searchTerm.trim()) return true;
      const otherName = userCache[otherId]?.name || (msg.senderId === user?.uid ? msg.receiverName : msg.senderName);
      const content = msg.content || msg.text || '';
      return otherName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
             content.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a: any, b: any) => safeToMillis(a[1].timestamp) - safeToMillis(b[1].timestamp));

    const handleDeleteAllMessages = async () => {
      if (!isConfirmingDeleteAll) {
        setIsConfirmingDeleteAll(true);
        setTimeout(() => setIsConfirmingDeleteAll(false), 3000);
        return;
      }
      
      try {
        const msgsToDelete = messages.filter(m => m.senderId === user.uid || m.receiverId === user.uid);
        
        const chunks = [];
        for (let i = 0; i < msgsToDelete.length; i += 500) {
          chunks.push(msgsToDelete.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(m => batch.delete(doc(db, 'messages', m.id)));
          await batch.commit();
        }
        
        toast.success('تم حذف جميع الدردشات');
        setIsConfirmingDeleteAll(false);
      } catch (error) {
        toast.error('حدث خطأ أثناء الحذف');
        setIsConfirmingDeleteAll(false);
      }
    };

    return (
      <div className="flex flex-col h-full bg-white">
        {/* iOS Header */}
        <div className="px-6 pt-12 pb-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={handleDeleteAllMessages} 
              className={`font-medium text-sm px-3 py-1 rounded-full transition-colors ${isConfirmingDeleteAll ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50'}`}
            >
              {isConfirmingDeleteAll ? 'تأكيد الحذف؟' : 'حذف الكل'}
            </button>
            <h1 className="text-xl font-bold text-slate-900">الرسائل</h1>
            <button 
              onClick={() => {
                setIsNewMessageMode(!isNewMessageMode);
                setSearchTerm('');
              }}
              className="p-1 text-blue-600 active:scale-90 transition-transform"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="بحث"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-900"
            />
          </div>
        </div>

        {isNewMessageMode && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2">نتائج البحث</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {searchResults.map((res) => (
                <button 
                  key={res.id} 
                  onClick={() => {
                    setActiveChatUser({ id: res.id, name: res.displayName, photoURL: res.photoURL });
                    setIsNewMessageMode(false);
                    setSearchTerm('');
                    setView('chat');
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors active:bg-slate-200"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 overflow-hidden">
                    {res.photoURL ? (
                      <img src={res.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      res.displayName?.[0] || 'U'
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800 text-sm">{res.displayName}</p>
                    <p className="text-[10px] text-slate-400">{res.phoneNumber || 'بدون رقم'}</p>
                  </div>
                </button>
              ))}
              {isSearching && <p className="text-center text-slate-400 text-[10px] py-4">جاري البحث...</p>}
              {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-slate-400 text-[10px] py-4">لا توجد نتائج</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(([otherId, msg]: [string, any]) => {
            const isUnread = msg.receiverId === user.uid && !msg.read;
            return (
              <motion.div 
                key={otherId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative overflow-hidden border-b border-slate-50"
              >
                {/* Delete Action Background */}
                <div className="absolute inset-0 bg-red-500 flex justify-start items-center px-6">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>

                <motion.div 
                  drag="x"
                  dragConstraints={{ left: 0, right: 80 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 50) {
                      handleDeleteConversation(otherId);
                    }
                  }}
                  className={clsx(
                    "relative z-10 px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-slate-100 transition-colors bg-white",
                    isUnread && "bg-blue-50/20"
                  )}
                  onClick={() => {
                    setActiveChatUser({ 
                      id: otherId, 
                      name: userCache[otherId]?.name || (msg.senderId === user?.uid ? msg.receiverName : msg.senderName),
                      photoURL: userCache[otherId]?.photoURL || (msg.senderId === user?.uid ? msg.receiverPhotoURL : msg.senderPhotoURL)
                    });
                    setView('chat');
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400 overflow-hidden border border-slate-100">
                      {(userCache[otherId]?.photoURL || (msg.senderId === user?.uid ? msg.receiverPhotoURL : msg.senderPhotoURL)) ? (
                        <img 
                          src={userCache[otherId]?.photoURL || (msg.senderId === user?.uid ? msg.receiverPhotoURL : msg.senderPhotoURL)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        (userCache[otherId]?.name || (msg.senderId === user?.uid ? msg.receiverName : msg.senderName))?.[0] || 'U'
                      )}
                    </div>
                    {isUnread && <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className={clsx("truncate text-slate-900 text-base", isUnread ? "font-black" : "font-bold")}>
                        {userCache[otherId]?.name || (msg.senderId === user?.uid ? msg.receiverName : msg.senderName)}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {msg.timestamp ? formatDistanceToNow(safeToDate(msg.timestamp), { addSuffix: false, locale: ar }) : ''}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={clsx("text-sm truncate flex-1 leading-tight", isUnread ? "text-slate-900 font-semibold" : "text-slate-500")}>
                        {msg.text || msg.content}
                      </p>
                      <ChevronLeft className="w-4 h-4 text-slate-300 ml-1" />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
          
          {filteredConversations.length === 0 && !isNewMessageMode && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-4 px-10 text-center">
              <MessageCircle className="w-16 h-16 opacity-10" />
              <p className="text-sm font-medium">لا توجد محادثات</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans" dir="rtl">
      {/* iPhone 17 Pro Max Frame */}
      <div className="relative w-[430px] h-[746px] bg-black rounded-[60px] shadow-2xl border-[8px] border-slate-800 overflow-hidden flex flex-col">
        {/* Status Bar */}
        <div className="h-12 flex justify-between items-center px-8 pt-4 z-50">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/')}
              className="p-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <CloseIcon className="w-4 h-4 text-white" />
            </button>
            <span className="text-sm font-bold text-white">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Signal className="w-4 h-4 text-white" />
            <Wifi className="w-4 h-4 text-white" />
            <Battery className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-full z-[100] flex items-center justify-center overflow-hidden shadow-2xl border border-white/5">
          <div className="flex items-center gap-3 px-4 w-full justify-between">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              />
            </div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {/* Background for Home Screen */}
          <AnimatePresence>
            {view === 'home' && (
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 z-0"
              >
                <img 
                  src={phoneWallpaper} 
                  className="w-full h-full object-cover opacity-80" 
                  alt="" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 h-full flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="flex-1 overflow-hidden h-full"
              >
                {view === 'home' && renderHome()}
                {view === 'messages' && renderMessages()}

                {view === 'chat' && (
                  <div className="flex flex-col h-full bg-white">
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b flex items-center gap-3 bg-white/90 backdrop-blur-xl sticky top-0 z-20">
                      <button onClick={() => setView('messages')} className="p-1 text-blue-600 active:scale-90 transition-transform">
                        <ChevronRight className="w-7 h-7" />
                      </button>
                      
                      <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => setView('contacts')}>
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 overflow-hidden border border-slate-100">
                          {activeChatUser?.photoURL ? (
                            <img src={activeChatUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            activeChatUser?.name?.[0] || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-900 truncate leading-tight">{activeChatUser?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-green-500 font-bold">متصل الآن</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => initiateCall(activeChatUser?.id || '', activeChatUser?.name || '')} className="p-2 text-blue-600 active:scale-90 transition-transform">
                          <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-blue-600 active:scale-90 transition-transform">
                          <Video className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#f2f2f7]">
                      {messages
                        .filter(m => {
                          const otherId = m.senderId === user.uid ? m.receiverId : m.senderId;
                          return !blockedUsers.some(b => b.blockedId === otherId);
                        })
                        .filter(m => (m.senderId === user?.uid && m.receiverId === activeChatUser?.id) || (m.senderId === activeChatUser?.id && m.receiverId === user?.uid))
                        .sort((a, b) => safeToMillis(a.timestamp) - safeToMillis(b.timestamp))
                        .map((msg, idx, arr) => {
                          const isMe = msg.senderId === user?.uid;
                          const prevMsg = arr[idx - 1];
                          const nextMsg = arr[idx + 1];
                          const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;
                          const isSameSenderAsNext = nextMsg && nextMsg.senderId === msg.senderId;
                          
                          return (
                            <motion.div 
                              key={msg.id}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSameSenderAsPrev ? 'mt-0.5' : 'mt-4'}`}
                            >
                              <div className={clsx(
                                "relative max-w-[75%] px-4 py-2 text-sm shadow-sm transition-all",
                                isMe 
                                  ? "bg-[#007aff] text-white rounded-[20px]" 
                                  : "bg-white text-slate-900 rounded-[20px] border border-slate-100",
                                isMe && !isSameSenderAsNext && "rounded-br-[4px]",
                                !isMe && !isSameSenderAsNext && "rounded-bl-[4px]"
                              )}>
                                <p className="leading-tight font-medium">{msg.content || msg.text}</p>
                                <p className={clsx(
                                  "text-[8px] mt-1 text-right opacity-60",
                                  isMe ? "text-blue-100" : "text-slate-400"
                                )}>
                                  {msg.timestamp ? format(safeToDate(msg.timestamp), 'HH:mm') : ''}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 bg-white border-t flex items-center gap-2 pb-8">
                      <button className="p-2 text-blue-600 active:scale-90 transition-transform"><Plus className="w-6 h-6" /></button>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="iMessage"
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="w-full bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none text-slate-900 focus:bg-white transition-all"
                        />
                        {messageContent.trim() && (
                          <button 
                            onClick={handleSendMessage}
                            disabled={loading}
                            className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-full shadow-md active:scale-90 transition-transform"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {!messageContent.trim() && (
                        <button className="p-2 text-slate-400 active:scale-90 transition-transform">
                          <Mic className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {view === 'notifications' && (
                  <div className="flex flex-col h-full bg-white">
                    <div className="p-6 border-b flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-slate-800">التنبيهات</h2>
                      <button 
                        onClick={async () => {
                          const unreadNotifs = messages.filter(m => (m.receiverId === user?.uid || m.receiverId === 'all') && !m.read && m.type !== 'private');
                          await Promise.all(unreadNotifs.map(m => updateDoc(doc(db, 'messages', m.id), { read: true })));
                          toast.success('تم تحديد الكل كمقروء');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        تحديد الكل كمقروء
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {messages.filter(m => m.receiverId === 'all' || m.receiverId === user?.uid).filter(m => m.type !== 'private').map((msg) => (
                        <div key={msg.id} className={clsx(
                          "p-4 border-b flex gap-4 items-start hover:bg-slate-50 transition-colors group",
                          !msg.read && "bg-blue-50/30"
                        )}>
                          <div className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            msg.type === 'battle' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {msg.type === 'battle' ? <Zap className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={clsx("text-sm text-slate-800", !msg.read ? "font-bold" : "font-medium")}>{msg.content}</p>
                              {!msg.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {msg.timestamp ? formatDistanceToNow(safeToDate(msg.timestamp), { addSuffix: true, locale: i18n.language === 'ar' ? ar : undefined }) : ''}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {!msg.read && (
                              <button 
                                onClick={() => updateDoc(doc(db, 'messages', msg.id), { read: true })}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                                title="تحديد كمقروء"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteDoc(doc(db, 'messages', msg.id))}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {messages.filter(m => (m.receiverId === 'all' || m.receiverId === user?.uid) && m.type !== 'private').length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                          <Bell className="w-12 h-12 opacity-20" />
                          <p className="text-sm">لا توجد تنبيهات حالياً</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {view === 'dialer' && (
                  <div className="flex flex-col h-full bg-white">
                    <div className="flex-1 flex flex-col justify-center items-center px-10">
                      <div className="text-center mb-8">
                        <p className="text-3xl font-medium text-slate-900 h-10 tracking-widest">
                          {searchTerm || ' '}
                        </p>
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')}
                            className="text-blue-600 text-xs font-bold mt-2"
                          >
                            إضافة رقم
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                        {[
                          { n: '1', l: '' }, { n: '2', l: 'ABC' }, { n: '3', l: 'DEF' },
                          { n: '4', l: 'GHI' }, { n: '5', l: 'JKL' }, { n: '6', l: 'MNO' },
                          { n: '7', l: 'PQRS' }, { n: '8', l: 'TUV' }, { n: '9', l: 'WXYZ' },
                          { n: '*', l: '' }, { n: '0', l: '+' }, { n: '#', l: '' }
                        ].map((key) => (
                          <button 
                            key={key.n}
                            onClick={() => setSearchTerm(prev => prev + key.n)}
                            className="w-16 h-16 rounded-full bg-slate-100 flex flex-col items-center justify-center active:bg-slate-200 transition-colors"
                          >
                            <span className="text-2xl font-medium text-slate-900">{key.n}</span>
                            <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">{key.l}</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-10 flex items-center gap-8">
                        <div className="w-16 h-16" /> {/* Spacer */}
                        <button 
                          onClick={() => {
                            // Find user by phone number or just call the number
                            const found = searchResults.find(r => r.phoneNumber === searchTerm);
                            initiateCall(found?.id || 'unknown', found?.displayName || searchTerm);
                          }}
                          className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                        >
                          <Phone className="w-7 h-7 fill-current" />
                        </button>
                        <button 
                          onClick={() => setSearchTerm(prev => prev.slice(0, -1))}
                          className="w-16 h-16 flex items-center justify-center text-slate-400 active:text-slate-600"
                        >
                          <Delete className="w-7 h-7" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {view === 'superkey' && renderSuperKey()}
                {view === 'esim' && renderESim()}
                {view === 'fb' && renderFB()}
                {view === 'settings' && renderSettings()}
                {view === 'contacts' && renderContacts()}
                {view === 'calls' && renderCallLogs()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="h-20 bg-white/80 backdrop-blur-xl border-t flex justify-around items-center px-6 pb-4">
          <button onClick={() => setView('home')} className={`p-2 rounded-xl transition-colors ${view === 'home' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <Home className="w-6 h-6" />
          </button>
          <button onClick={() => setView('messages')} className={`p-2 rounded-xl transition-colors ${view === 'messages' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <MessageCircle className="w-6 h-6" />
          </button>
          <button onClick={() => setView('dialer')} className={`p-2 rounded-xl transition-colors ${view === 'dialer' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <Phone className="w-6 h-6" />
          </button>
          <button onClick={() => setView('calls')} className={`p-2 rounded-xl transition-colors ${view === 'calls' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <History className="w-6 h-6" />
          </button>
          <button onClick={() => setView('notifications')} className={`p-2 rounded-xl transition-colors ${view === 'notifications' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <Bell className="w-6 h-6" />
          </button>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-300 rounded-full" />

        {/* Calling Overlay */}
        <AnimatePresence>
          {isCalling && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-between py-20 px-10"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-4xl font-bold text-slate-400 overflow-hidden border-4 border-slate-700">
                  {isCalling.photoURL ? (
                    <img src={isCalling.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    isCalling.name[0]
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">{isCalling.name}</h2>
                  <p className="text-slate-400 animate-pulse">جاري الاتصال...</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-white"><MicOff className="w-6 h-6" /></div>
                  <span className="text-xs text-slate-400">كتم</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-white"><LayoutGrid className="w-6 h-6" /></div>
                  <span className="text-xs text-slate-400">لوحة المفاتيح</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-white"><Volume2 className="w-6 h-6" /></div>
                  <span className="text-xs text-slate-400">مكبر الصوت</span>
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (isCalling.callId) {
                    await updateDoc(doc(db, 'active_calls', isCalling.callId), { status: 'rejected' });
                  }
                  setIsCalling(null);
                }}
                className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl shadow-red-900/20"
              >
                <Phone className="w-8 h-8 rotate-[135deg]" />
              </button>
            </motion.div>
          )}

          {incomingCall && (
            <motion.div 
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              className="absolute top-4 left-4 right-4 z-[110] bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400 overflow-hidden border-2 border-slate-700">
                  {incomingCall.callerPhoto ? (
                    <img src={incomingCall.callerPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    incomingCall.callerName[0]
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold">{incomingCall.callerName}</h3>
                  <p className="text-slate-400 text-xs animate-pulse">مكالمة واردة...</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleRejectCall}
                  className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white"
                >
                  <Phone className="w-5 h-5 rotate-[135deg]" />
                </button>
                <button 
                  onClick={handleAnswerCall}
                  className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white animate-bounce"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Messages;
