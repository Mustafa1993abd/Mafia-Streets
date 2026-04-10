import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatMoney } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, collection, onSnapshot, setDoc, getDocs, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { Map as MapIcon, Plane, MapPin, Building, Building2, Factory, Home, Warehouse, Store, ArrowLeft, X, Sword, Edit2, Image as ImageIcon, Save, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEFAULT_CITIES = [
  { id: 'baghdad', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlxsZEqcKqofZjQbpuOG0dPoDONwvV8d7Bl_r2iHZyOrMSnN7J3DVFznQw&s=10' },
  { id: 'damascus', image: 'https://www.independentarabia.com/sites/default/files/styles/1368x911/public/article/mainimage/2025/01/29/1088297-616635319.jpg' },
  { id: 'beirut', image: 'https://static.srpcdigital.com/styles/1037xauto/public/2024-08/740062.jpeg.webp' },
  { id: 'cairo', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&q=80&w=1000' },
  { id: 'dubai', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1000' },
];

const GANGS = [
  { id: 'unowned', name: 'map.unowned', color: 'bg-slate-800/80', border: 'border-slate-700' },
  { id: 'vipers', name: 'map.gangs.vipers', color: 'bg-red-900/80', border: 'border-red-700' },
  { id: 'skulls', name: 'map.gangs.skulls', color: 'bg-gray-800/80', border: 'border-gray-600' },
  { id: 'cartel', name: 'map.gangs.cartel', color: 'bg-purple-900/80', border: 'border-purple-700' },
];

const ICONS = [
  { icon: Building2, name: 'map.buildings.skyscraper' },
  { icon: Factory, name: 'map.buildings.factory' },
  { icon: Home, name: 'map.buildings.house' },
  { icon: Warehouse, name: 'map.buildings.warehouse' },
  { icon: Store, name: 'map.buildings.store' }
];

const getTileData = (cityId: string, index: number) => {
  const seed = cityId.charCodeAt(0) * 100 + index;
  const price = 10000000 + (seed % 41) * 1000000; // 10M to 50M
  const gangIndex = seed % GANGS.length;
  const iconIndex = (seed * 7) % ICONS.length;
  
  return {
    id: index,
    price,
    owner: GANGS[gangIndex],
    Icon: ICONS[iconIndex].icon,
    buildingName: ICONS[iconIndex].name
  };
};

export default function InfluenceMap() {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [cityOverrides, setCityOverrides] = useState<Record<string, string>>({});
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [govData, setGovData] = useState<any>(null);
  const [buying, setBuying] = useState(false);

  const isAdmin = profile?.role === 'Admin' || user?.email === 'j7primemustafa@gmail.com' || user?.email === 'zoomnet5@gmail.com' || user?.email === 'm07821779969@gmail.com' || user?.email === 'nttn642@gmail.com' || user?.email === 'nwyyttt@gmail.com' || profile?.displayName?.toLowerCase() === 'mustafa';

  useEffect(() => {
    const unsubGov = onSnapshot(doc(db, 'government', 'current'), (doc) => {
      if (doc.exists()) setGovData(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'government/current');
    });
    return () => unsubGov();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const unsubscribe = onSnapshot(collection(db, 'city_overrides'), (snapshot) => {
      const data: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data().image;
      });
      setCityOverrides(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'city_overrides');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      // Fetch users once instead of listening to all updates
      getDocs(collection(db, 'users_public')).then(snapshot => {
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setAllUsers(usersData);
      }).catch(error => {
        console.error("Failed to fetch users", error);
      });
    }
  }, [selectedCity]);

  const cities = useMemo(() => {
    return DEFAULT_CITIES.map(city => ({
      ...city,
      image: cityOverrides[city.id] || city.image
    }));
  }, [cityOverrides]);

  const tileOwners = useMemo(() => {
    const map = new Map();
    allUsers.forEach(u => {
      const cityTiles = u.ownedTiles?.[selectedCity || ''] || [];
      cityTiles.forEach((tileId: number) => {
        map.set(tileId, u);
      });
    });
    
    // Override with current user's profile to ensure immediate updates for their own tiles
    if (profile) {
      const myTiles = profile.ownedTiles?.[selectedCity || ''] || [];
      myTiles.forEach((tileId: number) => {
        map.set(tileId, { uid: profile.uid, ...profile });
      });
    }
    
    return map;
  }, [allUsers, selectedCity, profile]);

  const handleUpdateCityImage = async (cityId: string) => {
    if (!isAdmin || !newImageUrl.trim()) return;
    try {
      await setDoc(doc(db, 'city_overrides', cityId), {
        image: newImageUrl.trim()
      });
      toast.success(t('common.success'));
      setEditingCity(null);
      setNewImageUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'city_overrides');
    }
  };

  const handleTravel = async (cityId: string) => {
    if (!profile) return;
    if (profile.city === cityId) return;

    if (!profile.documents?.passport) {
      toast.error(t('map.passportRequired'));
      return;
    }

    // Travel fees synced with airport
    const travelFees: Record<string, number> = {
      baghdad: 5000,
      damascus: 4500,
      beirut: 6000,
      cairo: 8000,
      dubai: 15000
    };

    const price = profile.hasPrivateJet ? 0 : (travelFees[cityId] || 1000);

    if (profile.cleanMoney < price) {
      toast.error(t('common.noMoney'));
      return;
    }

    // Check travel cooldown
    const now = Date.now();
    const lastTravel = profile.lastTravelAt || 0;
    
    let cooldownMinutes = 5; // Default 5 minutes
    if (profile.visaCard) {
      const { type } = profile.visaCard;
      if (type === 'Signature') cooldownMinutes = 4; // 20% faster (4 mins)
      if (type === 'Infinite') cooldownMinutes = 0; // Instant travel for Infinite
    }

    const cooldownMs = cooldownMinutes * 60 * 1000;
    if (now - lastTravel < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - (now - lastTravel)) / 1000);
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      toast.error(t('crimes.travelCooldown', { time: `${mins}:${secs.toString().padStart(2, '0')}` }));
      return;
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: profile.cleanMoney - price,
        city: cityId,
        lastTravelAt: now
      });
      toast.success(t('map.traveled', { city: t(`map.cities.${cityId}`) }));
    } catch (error) {
      console.error(error);
      toast.error(t('map.travelFailed'));
    }
  };

  const handleBuyTile = async () => {
    if (!profile || !selectedCity || !selectedTile || buying) return;
    
    let finalPrice = selectedTile.price;
    if (govData?.taxHoliday) {
      finalPrice = Math.floor(finalPrice * 0.90); // 10% discount
    }

    if (profile.cleanMoney < finalPrice) {
      toast.error(t('common.noMoney'));
      return;
    }

    const currentOwned = profile.ownedTiles?.[selectedCity] || [];
    if (currentOwned.includes(selectedTile.id)) {
      toast.error(t('map.alreadyOwn'));
      return;
    }

    setBuying(true);

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        cleanMoney: increment(-finalPrice),
        [`ownedTiles.${selectedCity}`]: [...currentOwned, selectedTile.id]
      });
      toast.success(t('map.buySuccess'));
      setSelectedTile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setBuying(false);
    }
  };

  if (selectedCity) {
    const ownedTiles = profile?.ownedTiles?.[selectedCity] || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button 
              onClick={() => setSelectedCity(null)}
              className="p-2 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white rtl:rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{t(`map.cities.${selectedCity}`)}</h1>
              <p className="text-gray-400">{t('map.landOwned', { count: ownedTiles.length })}</p>
            </div>
          </div>
        </div>

        <div className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl group">
          {/* Map Background - GPS Style */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
            <img 
              src={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/0,0,1/1000x1000?access_token=pk.eyJ1IjoiYWlzdHVkaW8iLCJhIjoiY2x1eHh4eHh4eHh4eHh4eHh4eHh4eHh4In0`} 
              alt="Satellite"
              className="w-full h-full object-cover grayscale"
              onError={(e) => {
                // Fallback if Mapbox token is invalid (which it likely is as it's a placeholder)
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2000';
              }}
            />
          </div>
          
          {/* Grid Overlay */}
          <div className="relative p-8 overflow-x-auto scrollbar-hide">
            <div className="min-w-[800px] grid grid-cols-10 gap-3 p-4 bg-black/20 backdrop-blur-[2px] rounded-xl border border-white/5">
              {Array.from({ length: 50 }).map((_, index) => {
                const tile = getTileData(selectedCity, index);
                const ownerUser = tileOwners.get(index);
                const isOwnedByMe = ownerUser?.uid === profile?.uid;
                const isOwnedByMyGang = ownerUser?.gangId && profile?.gangId && ownerUser.gangId === profile.gangId;
                const isOwnedByOtherPlayer = ownerUser && !isOwnedByMe;
                
                let tileColor = 'bg-slate-800/40 border-slate-700/50';
                let glowColor = '';
                
                if (isOwnedByMe) {
                  tileColor = 'bg-emerald-500/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                  glowColor = 'bg-emerald-400/20';
                } else if (isOwnedByMyGang) {
                  tileColor = 'bg-blue-500/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
                  glowColor = 'bg-blue-400/20';
                } else if (isOwnedByOtherPlayer) {
                  if (ownerUser.gangId) {
                    tileColor = 'bg-purple-500/40 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
                    glowColor = 'bg-purple-400/20';
                  } else {
                    tileColor = 'bg-yellow-500/40 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
                    glowColor = 'bg-yellow-400/20';
                  }
                } else if (tile.owner.id !== 'unowned') {
                  // NPC Gangs
                  const gangColors: Record<string, string> = {
                    vipers: 'bg-red-500/30 border-red-500/50',
                    skulls: 'bg-zinc-500/30 border-zinc-500/50',
                    cartel: 'bg-indigo-500/30 border-indigo-500/50'
                  };
                  tileColor = gangColors[tile.owner.id] || tileColor;
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedTile(tile)}
                    className={`relative aspect-square rounded-xl flex items-center justify-center border backdrop-blur-sm transition-all hover:scale-110 hover:z-10 group/tile ${tileColor}`}
                  >
                    {glowColor && <div className={`absolute inset-0 rounded-xl animate-pulse ${glowColor}`} />}
                    <tile.Icon className={`w-6 h-6 z-10 transition-transform group-hover/tile:scale-110 ${ownerUser ? 'text-white' : 'text-white/50'}`} />
                    
                    {/* Coordinate Label */}
                    <div className="absolute -bottom-1 -end-1 px-1 bg-black/60 rounded text-[8px] font-mono text-zinc-500 opacity-0 group-hover/tile:opacity-100 transition-opacity">
                      {Math.floor(index / 10)}:{index % 10}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GPS Elements */}
          <div className="absolute top-4 end-4 flex flex-col gap-2 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg text-[10px] font-mono text-emerald-500">
              LAT: 33.3152° N<br />
              LON: 44.3661° E
            </div>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg text-[10px] font-mono text-emerald-500 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              {t('map.liveSignal')}
            </div>
          </div>

          <div className="absolute bottom-4 start-4 flex gap-4 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              {t('map.player')}
            </div>
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              {t('gangs.title')}
            </div>
          </div>
        </div>

        {/* Tile Modal */}
        {selectedTile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${tileOwners.has(selectedTile.id) ? (tileOwners.get(selectedTile.id).uid === profile?.uid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500') : 'bg-white/10 text-white'}`}>
                      <selectedTile.Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t(selectedTile.buildingName)} #{selectedTile.id + 1}</h3>
                      <p className="text-gray-400">{t(`map.cities.${selectedCity}`)}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTile(null)} className="text-gray-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center p-4 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-gray-400">{t('map.owner')}</span>
                    <span className="font-bold text-white">
                      {tileOwners.has(selectedTile.id) ? (
                        tileOwners.get(selectedTile.id).uid === profile?.uid ? t('map.player') : tileOwners.get(selectedTile.id).displayName
                      ) : (
                        selectedTile.owner.id === 'unowned' ? t('map.unowned') : t(selectedTile.owner.name)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-gray-400">{t('map.price')}</span>
                    {govData?.taxHoliday ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">{formatMoney(Math.floor(selectedTile.price * 0.90))}</span>
                        <span className="text-zinc-500 line-through text-xs">{formatMoney(selectedTile.price)}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-emerald-400">{formatMoney(selectedTile.price)}</span>
                    )}
                  </div>
                </div>

                {tileOwners.has(selectedTile.id) ? (
                  tileOwners.get(selectedTile.id).uid === profile?.uid ? (
                    <div className="w-full py-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold text-center border border-emerald-500/20">
                      {t('map.youOwnThis')}
                    </div>
                  ) : (
                    (!tileOwners.get(selectedTile.id).gangId || tileOwners.get(selectedTile.id).gangId !== profile?.gangId) && (
                      <Link
                        to={`/attack/${tileOwners.get(selectedTile.id).uid}`}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                      >
                        <Sword className="w-5 h-5" />
                        {t('crimes.attack')}
                      </Link>
                    )
                  )
                ) : (
                  <button
                    onClick={handleBuyTile}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/20"
                  >
                    {t('map.buyProperty')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <div className="p-3 bg-emerald-500/20 rounded-lg">
          <MapIcon className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{t('map.title')}</h1>
          <p className="text-gray-400">{t('map.desc')}</p>
        </div>
      </div>

      {govData?.taxHoliday && (
        <div className="bg-emerald-900/40 border border-emerald-500/50 rounded-2xl p-6 flex items-start gap-4 animate-pulse">
          <Landmark className="text-emerald-500 shrink-0 mt-1" size={28} />
          <div>
            <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-2">{t('map.taxHolidayActive')}</h3>
            <p className="text-emerald-200/80 font-medium">
              {t('map.taxHolidayDesc')}
              <br/>
              <span className="text-emerald-400 font-bold">{t('map.effect')}</span> {t('map.taxHolidayEffect')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cities.map((city) => {
          const isCurrentCity = profile?.city === city.id;
          const ownedTiles = profile?.ownedTiles?.[city.id] || [];

          return (
            <div key={city.id} className={`bg-black/40 border ${isCurrentCity ? 'border-emerald-500/50' : 'border-white/10'} rounded-xl overflow-hidden relative group`}>
              <img src={city.image} alt={city.id} className="w-full h-48 object-cover opacity-60 group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
              
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                    <MapPin className={`w-5 h-5 ${isCurrentCity ? 'text-emerald-500' : 'text-white'}`} />
                    {t(`map.cities.${city.id}`)}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setEditingCity(city.id);
                          setNewImageUrl(city.image);
                        }}
                        className="p-2 bg-black/60 hover:bg-purple-600 text-white rounded-lg backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {isCurrentCity && (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full backdrop-blur-sm border border-emerald-500/20">
                        {t('map.currentCity')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex flex-col gap-2">
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setEditingCity(city.id);
                          setNewImageUrl(city.image);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                      >
                        <ImageIcon size={12} />
                        {t('admin.changeCityImage')}
                      </button>
                    )}
                    <div className="flex items-center gap-2 text-gray-200 bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                      <Building className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium">{t('map.landOwned', { count: ownedTiles.length })}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCity(city.id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-lg"
                    >
                      {t('map.viewMap')}
                    </button>
                    {!isCurrentCity && (
                      <Link
                        to="/airport"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-lg"
                      >
                        <Plane className="w-4 h-4" />
                        {t('map.travel')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Edit Modal */}
      {editingCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase flex items-center gap-2">
                  <ImageIcon size={20} className="text-purple-500" />
                  {t('admin.changeCityImage')}
                </h3>
                <button onClick={() => setEditingCity(null)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    {t('family.imageUrl')}
                  </label>
                  <input 
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800">
                  <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>

                <button
                  onClick={() => handleUpdateCityImage(editingCity)}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
