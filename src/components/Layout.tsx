import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Menu, X, Home, User, Map as MapIcon, Building2, 
  ShoppingCart, ShieldAlert, Briefcase, LogOut,
  Landmark, Dices, Users, Cross, ShieldCheck, Globe,
  Package, Siren, Heart, Lock, VenetianMask, Crown, ChevronDown, ChevronUp, Plane, Smartphone, Star, Gift, Dumbbell, Music, MessageCircle, BookOpen
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { formatMoney } from '../lib/utils';
import { ministerialRoles } from '../constants/ministerialRoles';
import PlayerAvatar from './PlayerAvatar';
import GlobalChat from './GlobalChat';
import DeathOverlay from './DeathOverlay';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPM, setIsPM] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, logout } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists() && profile) {
        setIsPM(doc.data().primeMinisterId === profile.uid);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });

    if (!profile) return;
    const q = query(
      collection(db, 'messages'),
      where('receiverId', 'in', [profile.uid, 'all']),
      where('read', '==', false)
    );

    let initialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
      
      if (!initialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const msg = change.doc.data();
            toast.custom((t) => (
              <div className="flex items-center gap-4 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-3xl p-4 w-full max-w-md cursor-pointer" onClick={() => { toast.dismiss(t); navigate('/messages'); }}>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{msg.senderName || 'إشعار جديد'}</p>
                  <p className="text-sm text-white/70 truncate">{msg.content || msg.text}</p>
                </div>
              </div>
            ), { duration: 4000 });
          }
        });
      }
      initialLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    const updateHeartbeat = async () => {
      if (profile) {
        try {
          await setDoc(doc(db, 'users_public', profile.uid), {
            lastActive: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users_public/${profile.uid}`);
        }
      }
    };

    updateHeartbeat();
    const heartbeatInterval = setInterval(updateHeartbeat, 60000);

    return () => {
      unsubscribe();
      unsubGov();
      clearInterval(heartbeatInterval);
    };
  }, [user]);

  const isRTL = true;

  const isOwner = user?.email === 'm07821779969@gmail.com' || user?.email === 'soft4net2016@gmail.com';
  const isAdmin = profile?.role === 'Admin' && isOwner;
  const isHospitalized = profile?.city === 'hospital' && profile?.hospitalizedUntil && profile.hospitalizedUntil > Date.now();
  const isDead = (profile?.health || 0) <= 0;

  const sections = [
    {
      id: 'character',
      name: t('nav.sections.character') || 'الشخصية',
      icon: User,
      items: [
        { name: profile?.displayName || t('nav.character') || 'الشخصية', path: '/character', icon: User, isGold: true },
        { name: t('nav.profile') || 'الملف الشخصي', path: '/profile', icon: User },
        { name: t('nav.family') || 'العائلة', path: '/family', icon: Heart },
        { name: t('nav.inventory') || 'المخزن', path: '/inventory', icon: Package },
      ]
    },
    {
      id: 'finance',
      name: t('nav.sections.finance') || 'المالية',
      icon: Landmark,
      items: [
        { name: t('nav.bank') || 'البنك', path: '/bank', icon: Landmark },
        { name: t('nav.market') || 'السوق', path: '/market', icon: ShoppingCart },
        { name: t('nav.casino') || 'الكازينو', path: '/casino', icon: Dices },
        { name: t('nav.properties') || 'المباني', path: '/properties', icon: Building2 },
      ]
    },
    {
      id: 'crime',
      name: t('nav.sections.crime') || 'الإجرام',
      icon: ShieldAlert,
      items: [
        { name: t('nav.crimes') || 'الجرائم', path: '/crimes', icon: ShieldAlert },
        { name: t('nav.gangs') || 'العصابات', path: '/gangs', icon: Users },
        { name: t('nav.heists') || 'السطو', path: '/heists', icon: VenetianMask },
        { name: t('nav.trade') || 'التهريب', path: '/trade', icon: Globe },
      ]
    },
    {
      id: 'city',
      name: t('nav.sections.city') || 'المدينة',
      icon: MapIcon,
      items: [
        { name: t('nav.map') || 'الخريطة', path: '/map', icon: MapIcon },
        { name: 'مول المدينة', path: '/city-mall', icon: ShoppingCart, isSpecial: true },
        { name: t('nav.airport') || 'المطار', path: '/airport', icon: Plane },
        { name: t('nav.gym') || 'الجيم', path: '/gym', icon: Dumbbell },
        { name: t('nav.hospital') || 'المقبرة', path: '/hospital', icon: Cross },
      ]
    },
    {
      id: 'government',
      name: t('nav.sections.government') || 'الحكومة',
      icon: Crown,
      items: [
        { name: t('nav.prison') || 'السجن', path: '/prison', icon: Lock },
        { name: t('nav.police') || 'الشرطة', path: '/police', icon: Siren },
        { name: t('nav.bounties') || 'المكافآت', path: '/bounties', icon: ShieldAlert },
        { name: t('nav.government') || 'الحكومة', path: '/government', icon: Landmark },
        ...(isPM || isAdmin ? [{ name: t('government.pm.title') || 'رئاسة الوزراء', path: '/pm-office', icon: Crown }] : []),
        ...(profile?.ministerRole ? [{ 
          name: t('nav.ministerOffice') || 'مكتب الوزير', 
          path: '/minister-office', 
          icon: Landmark,
          isSpecial: true 
        }] : []),
      ]
    }
  ];

  if (isOwner) {
    sections.push({
      id: 'admin',
      name: t('nav.admin') || 'الادارة',
      icon: ShieldCheck,
      items: [{ name: t('nav.admin') || 'الادارة', path: '/admin', icon: ShieldCheck }]
    });
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-row" dir="rtl">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={clsx(
        "fixed lg:sticky top-0 h-screen z-50 w-64 bg-zinc-950 border-e border-zinc-800 transition-transform duration-300 ease-in-out flex flex-col shrink-0 start-0",
        isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            {t('login.title') || 'MAFIA STREETS'}
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <button onClick={() => { navigate('/mafia-streets'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg border-2 border-red-600/50 bg-red-600/10 text-red-500 font-black shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:bg-red-600/20 transition-all group">
            <VenetianMask size={20} className="animate-pulse group-hover:scale-110 transition-transform" />
            <span className="drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">شوارع المافيا</span>
          </button>

          <button onClick={() => { navigate('/daily-reward'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 text-yellow-500 hover:from-yellow-500/20 hover:to-amber-500/20 transition-all border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
            <Gift size={20} className="animate-pulse" />
            <span className="font-bold">الجائزة اليومية</span>
          </button>

          <button onClick={() => { navigate('/'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all">
            <Home size={20} />
            <span>{t('nav.dashboard') || 'لوحة التحكم'}</span>
          </button>

          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = openSection === section.id;
            
            return (
              <div key={section.id} className="mb-1">
                <button
                  onClick={() => setOpenSection(isOpen ? null : section.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span className="font-semibold">{section.name}</span>
                  </div>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {isOpen && (
                  <ul className="mt-1 space-y-1 ps-4 border-s-2 border-zinc-800 ms-4">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = location.pathname === item.path;
                      const isDisabled = isHospitalized && (item.path === '/crimes' || item.path === '/airport' || item.path.includes('/attack'));
                      
                      return (
                        <li key={item.path}>
                          <button
                            onClick={() => {
                              if (isDisabled) {
                                toast.error('لا يمكنك القيام بهذا الإجراء وأنت قيد التعافي في المستشفى');
                                return;
                              }
                              navigate(item.path);
                              setIsSidebarOpen(false);
                            }}
                            className={clsx(
                              "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm relative overflow-hidden group",
                              isActive 
                                ? "bg-red-500/10 text-red-500 font-bold" 
                                : item.isGold
                                  ? "bg-gradient-to-r from-yellow-600/20 to-amber-600/10 text-yellow-500 border-s-4 border-yellow-500 font-black shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                                  : item.isSpecial 
                                    ? "bg-gradient-to-r from-amber-500/20 to-transparent text-amber-500 border-s-4 border-amber-500 font-black shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                    : "text-zinc-500 hover:text-white",
                              isDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {(item.isSpecial || item.isGold) && (
                              <div className={clsx(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                item.isGold ? "bg-yellow-500/5" : "bg-amber-500/5"
                              )} />
                            )}
                            <ItemIcon size={16} className={clsx(
                              (item.isSpecial || item.isGold) && "animate-pulse",
                              item.isGold ? "text-yellow-500" : item.isSpecial ? "text-amber-500" : ""
                            )} />
                            <span>{item.isSpecial && profile?.ministerRole ? (ministerialRoles.find(r => r.id === profile.ministerRole)?.label || item.name) : item.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="fixed top-4 start-4 end-4 lg:start-[calc(16rem+1rem)] lg:end-4 z-50 h-16 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl flex items-center justify-between px-4 lg:px-8 shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-zinc-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-zinc-400">{t('header.cleanMoney')}:</span>
                <span className="text-green-400">{formatMoney(profile?.cleanMoney || 0)}</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-zinc-400">{t('header.dirtyMoney')}:</span>
                <span className="text-red-400">{formatMoney(profile?.dirtyMoney || 0)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={14} 
                  className={clsx(
                    "transition-all duration-500",
                    i < (profile?.wantedStars || 0) 
                      ? "text-yellow-500 fill-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" 
                      : "text-zinc-800"
                  )} 
                />
              ))}
            </div>
            <button
              onClick={() => navigate('/messages')}
              className="relative flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white bg-zinc-900 rounded-full border border-zinc-800 transition-colors"
            >
              <Smartphone size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -start-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-zinc-950 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/players')}
              className="flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white bg-zinc-900 rounded-full border border-zinc-800 transition-colors"
              title="اللاعبين"
            >
              <Users size={18} />
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
            >
              <div className="text-end hidden sm:block">
                <div className="text-sm font-bold player-name-script group-hover:text-red-500 transition-colors">{profile?.displayName}</div>
                <div className="text-xs text-red-500">{t(`roles.${profile?.role}`)}</div>
              </div>
              <PlayerAvatar 
                photoURL={profile?.photoURL} 
                displayName={profile?.displayName} 
                vipLevel={profile?.vipLevel} 
                size="md"
              />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pt-24 lg:pt-28 bg-black relative">
          {isDead && location.pathname !== '/hospital' ? (
            <DeathOverlay killedBy={profile?.killedBy || null} />
          ) : (
            children
          )}
        </div>
        <GlobalChat />
      </main>
    </div>
  );
}
