import { create } from 'zustand';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, Timestamp, collection, query, where, getDocs, increment } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { googleProvider } from '../lib/firebase';
import i18n from '../i18n/config';
import { getRealisticAvatar } from '../lib/utils';
import { MARKET_ITEMS } from '../lib/items';

export type Role = 'Boss' | 'Trader' | 'Thief' | 'Smuggler' | 'Criminal' | 'Admin' | 'Deputy';
export type Rank = 'None' | 'Silver' | 'Bronze' | 'Diamond';

export interface BuiltProperty {
  id: string;
  type: 'headquarters' | 'bank' | 'weapon_stash' | 'drug_factory' | 'safe_house' | 'laundromat' | 'garage' | 'casino' | 'hotel' | 'ammunition_factory';
  city: string;
  tileId: number;
  level: number;
  upgrades?: Record<string, number>;
  workers?: number;
  inventory?: Record<string, number>;
  lastProfitCollection?: number;
  managerId?: string; // ID of the family member managing this property
  lastAutomationRun?: number; // Timestamp of the last automation run
  activityLog?: string[]; // Log of recent activities
}

export interface GangMember {
  id: string;
  name: string;
  image: string;
  primaryWeapon: string | null;
  secondaryWeapon: string | null;
  armor: string | null;
  salary: number;
  power: number;
  health: number;
}

export type VisaType = 'None' | 'Classic' | 'Platinum' | 'Signature' | 'Infinite';

export interface Vehicle {
  id: string;
  name: string;
  image: string;
  armorLevel: number; // 0 to 5
  power: number;
}

export interface Crew {
  id: string;
  name: string;
  members: GangMember[]; // Up to 5
  vehicleId: string | null; // ID of the vehicle
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  role: Role;
  level: number;
  reputation: number;
  cleanMoney: number;
  dirtyMoney: number;
  dirtyVaultBalance?: number;
  bankBalance: number;
  gold?: number;
  country?: string;
  birthdate?: string;
  alias?: string;
  nickname?: string;
  motto?: string;
  visaCard?: {
    type: VisaType;
    number: string;
    issuedAt: number;
  };
  vipLevel?: 'silver' | 'gold' | 'diamond' | 'demon' | null;
  lastTravelAt?: number;
  travelingUntil?: number | null;
  documents?: {
    idCard?: boolean;
    passport?: boolean;
    driverLicense?: boolean;
    weaponLicense?: boolean;
    clearance?: boolean;
    license?: boolean;
    weapon?: boolean;
  };
  investments?: {
    amount: number;
    lastClaimed: number;
  };
  crimes: {
    theft: number;
    kills: number;
    operations: number;
  };
  equipped?: {
    weapon1?: string | null;
    weapon2?: string | null;
    armor?: string | null;
    vehicle?: string | null;
    stimulant?: string | null;
    phone?: string | null;
    sim?: string | null;
    hats?: string | null;
    glasses?: string | null;
    clothing?: string | null;
    shoes?: string | null;
    socks?: string | null;
    acc_head?: string | null;
    acc_neck?: string | null;
    acc_chest?: string | null;
    acc_arms?: string | null;
    acc_hands?: string | null;
    acc_waist?: string | null;
    acc_back?: string | null;
    acc_feet?: string | null;
    // Legacy/Other
    hat?: string | null;
    jacket?: string | null;
    shirt?: string | null;
    pants?: string | null;
    tie?: string | null;
    accessory?: string | null;
  };
  health?: number;
  gymStats?: {
    strength: number;
    endurance: number;
    speed: number;
    toughness: number;
  };
  power?: number;
  defense?: number;
  mafiaRelationships?: Record<string, number>;
  gymLevel?: number;
  energy?: number;
  maxEnergy?: number;
  lastEnergyUpdate?: number;
  fatigue?: number;
  armorHealth?: number;
  heat?: number;
  wanted?: boolean;
  wantedStars?: number;
  bounty?: number;
  isImprisoned?: boolean;
  jailTimeEnd?: number | null;
  lastTrainAt?: number | null;
  hospitalizedUntil?: number | null;
  lastActive?: number;
  killedBy?: string | null;
  bloodType?: string;
  hasPrivateDoctor?: boolean;
  privateDoctorUntil?: number | null;
  hasPrivateSurgeryRoom?: boolean;
  hasPrivateAmbulance?: boolean;
  hasMedicalInsurance?: boolean;
  warrants?: boolean;
  policeRank?: Rank;
  govRank?: Rank;
  education?: number;
  lastEducationTime?: number;
  familyGymLevel?: number;
  lastFamilyGymTime?: number;
  managedPropertyId?: string;
  salary?: number;
  age?: number;
  phoneNumber?: string;
  phoneWallpaper?: string;
  savedOutfits?: { id: string; name: string; items: Record<string, string> }[];
  inventory?: {
    cars: Record<string, number>;
    bikes: number;
    weapons: Record<string, number>;
    drugs: Record<string, number>;
    transportedDrugs?: Record<string, number>;
    armor: Record<string, number>;
    tools: Record<string, number>;
    supplements?: Record<string, number>;
    phones?: Record<string, number>;
    sims?: Record<string, number>;
    gold?: number;
    antiques?: number;
    electronics?: number;
  };
  family?: {
    lastCollection?: number;
    wives: {
      id: string;
      name: string;
      image: string;
      age: number;
      traits: string[];
      traitKey?: string;
      country: string;
      countryKey?: string;
      assignedVehicleId?: string;
      education?: number;
      lastEducationTime?: number;
      gymLevel?: number;
      lastGymTime?: number;
      health: number;
      mood?: number;
      items?: string[];
      managedPropertyId?: string;
      salary?: number;
      seedIndex?: number;
      children: {
        id: string;
        name: string;
        image?: string;
        birthTimestamp: number;
        health: number;
        mood?: number;
        education?: number;
        lastEducationTime?: number;
        gymLevel?: number;
        lastGymTime?: number;
        traits?: string[];
        managedPropertyId?: string;
        salary?: number;
        gender: 'boy' | 'girl';
        seedIndex?: number;
        assignedVehicleId?: string;
        items?: string[];
      }[];
    }[];
  };
  familyFinances?: {
    income: number;
    expenses: number;
    lastUpdate: number;
  };
  agents?: string[];
  land?: Record<string, number>;
  ownedTiles?: Record<string, number[]>;
  builtProperties?: BuiltProperty[];
  hasPrivateJet?: boolean;
  crew?: GangMember[]; // Legacy
  crews?: Crew[]; // New crew system
  gangLevel?: number;
  gangId?: string;
  gangName?: string;
  gangRank?: string;
  gangColor?: string;
  gangRole?: 'leader' | 'underboss' | 'captain' | 'soldier' | 'recruit';
  lastTradeTime?: number;
  properties: string[];
  gangMembers: number;
  familyMembers: number;
  city: string;
  currentCity?: string; // Add this to fix Admin.tsx error
  vehicles: Vehicle[]; // Updated to Vehicle[]
  ministerRole?: string;
  nameChangeHistory?: number[];
  countryChangeHistory?: number[];
  welcomeMessageSeen?: boolean;
  lastDailyRewardClaim?: string;
  dailyRewardDay?: number;
  lastBigChestClaim?: string;
  lastSpinDate?: string;
  influence?: {
    type: 'silver' | 'bronze' | 'diamond';
    expiresAt: number;
  };
  createdAt: any;
  lastLoginAt: any;
  inSafeHouse?: boolean;
  gender?: 'male' | 'female';
  generatedAvatarUrl?: string;
  isAvatarPinned?: boolean;
  hasESim?: boolean;
  activeMission?: {
    type: string;
    targetId?: string;
    targetName: string;
    quantity?: number;
    reward: number;
    reputation?: number;
    status: 'pending' | 'accepted' | 'completed';
    missionText?: string;
    description?: string;
    characterId?: string;
    title?: string;
    successChance?: number;
  } | null;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  createProfile: (role: Role, nickname: string) => Promise<void>;
  setWelcomeMessageSeen: () => Promise<void>;
  equipItem: (type: string, itemId: string) => Promise<void>;
  batchEquipItems: (items: { type: string; itemId: string }[]) => Promise<void>;
  saveOutfit: (name: string) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;
  unequipItem: (type: string) => Promise<void>;
  takeDamage: (amount: number) => Promise<void>;
  heal: (cost: number) => Promise<void>;
  repairArmor: (cost: number) => Promise<void>;
  hirePrivateDoctor: () => Promise<void>;
  buySurgeryRoom: () => Promise<void>;
  buyAmbulance: () => Promise<void>;
  calculatePower: (profile: UserProfile) => number;
  calculateDefense: (profile: UserProfile) => number;
  train: (stat: 'strength' | 'endurance' | 'speed' | 'toughness', cost: number, energyCost: number, gain: number) => Promise<void>;
  useSupplement: (itemId: string) => Promise<void>;
  buyAndUseSupplement: (itemId: string) => Promise<void>;
  setInSafeHouse: (inSafeHouse: boolean) => Promise<void>;
  updateActiveMission: (mission: UserProfile['activeMission']) => Promise<void>;
  processing: boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let unsubscribeProfile: (() => void) | null = null;
  let hasSyncedPublicProfile = false;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      set({ user, loading: true });
      hasSyncedPublicProfile = false;
      
      let targetUid = user.uid;
      
      try {
        const initialDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (!initialDocSnap.exists() && user.email) {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            targetUid = querySnapshot.docs[0].id;
          }
        }
      } catch (error) {
        console.error("Error checking existing user by email:", error);
      }
      
      const docRef = doc(db, 'users', targetUid);
      
      unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          let data = docSnap.data() as UserProfile;
          
          // Energy & Fatigue Regeneration
          const now = Date.now();
          const lastUpdate = data.lastEnergyUpdate || now;
          const elapsedMinutes = Math.floor((now - lastUpdate) / (5 * 60 * 1000)); // 1 energy every 5 mins
          
          if (elapsedMinutes > 0) {
            const maxEnergy = data.maxEnergy || 100;
            const currentEnergy = data.energy || 0;
            const newEnergy = Math.min(maxEnergy, currentEnergy + elapsedMinutes);
            
            const fatigueReduction = elapsedMinutes * 2;
            const newFatigue = Math.max(0, (data.fatigue || 0) - fatigueReduction);

            data = {
              ...data,
              energy: newEnergy,
              fatigue: newFatigue,
              lastEnergyUpdate: now
            };
          }

          // Check for admin override
          if ((data.email === 'm07821779969@gmail.com' || data.email === 'soft4net2016@gmail.com' || data.email === 'imvu2024k@gmail.com' || data.email === 'zoomnet5@gmail.com') && (data.role !== 'Admin' || data.displayName !== '𝑀𝓊𝓈𝓉𝒶𝒻𝒶')) {
            try {
              await updateDoc(docRef, {
                role: 'Admin',
                displayName: '𝑀𝓊𝓈𝓉𝒶𝒻𝒶'
              });
              return;
            } catch (e) {
              console.error("Failed to auto-update admin profile:", e);
            }
          }

          // Check for jail time expiration
          const jailTime = (data.jailTimeEnd as any)?.toMillis?.() || data.jailTimeEnd;
          if (data.isImprisoned && jailTime && jailTime < Date.now()) {
            try {
              await updateDoc(docRef, {
                isImprisoned: false,
                jailTimeEnd: null
              });
              // The next snapshot will have the updated data
              return; 
            } catch (e) {
              console.error("Failed to release from jail:", e);
            }
          }

          // Check for hospitalization expiration & Automatic Healing
          const hospUntil = (data.hospitalizedUntil as any)?.toMillis?.() || data.hospitalizedUntil;
          if (data.city === 'hospital' && hospUntil) {
            const now = Date.now();
            if (now >= hospUntil) {
              try {
                await updateDoc(docRef, {
                  health: 100,
                  hospitalizedUntil: null,
                  killedBy: null,
                  city: 'baghdad'
                });
                return;
              } catch (e) {
                console.error("Failed to release from hospital:", e);
              }
            } else {
              // Calculate current health based on time remaining
              // Default: 2% per minute = 100% in 50 minutes
              // Private Doctor: 100% in 5 minutes (20% per minute)
              const remainingMinutes = (hospUntil - now) / 60000;
              const healingRate = data.hasPrivateDoctor ? 20 : 2;
              const currentHealth = Math.floor(100 - (remainingMinutes * healingRate));
              
              if (currentHealth !== data.health) {
                data = { ...data, health: Math.max(0, currentHealth) };
              }
            }
          }
          
          // Sync to users_public if needed (Debounced/Throttled)
          const wealth = (data.cleanMoney || 0) + (data.dirtyMoney || 0) + (data.bankBalance || 0) + (data.dirtyVaultBalance || 0);
          const currentPublicData = {
            uid: targetUid,
            displayName: data.displayName || 'Unknown',
            displayNameLower: (data.displayName || 'Unknown').toLowerCase(),
            photoURL: data.photoURL || null,
            level: data.level || 1,
            role: data.role || 'Criminal',
            reputation: data.reputation || 0,
            gangId: data.gangId || null,
            gangRole: data.gangRole || null,
            city: data.city || 'baghdad',
            wealth: wealth,
            kills: data.crimes?.kills || 0,
            hospitalizedUntil: data.hospitalizedUntil || null,
            createdAt: data.createdAt || null,
            ownedTiles: data.ownedTiles || {},
            isImprisoned: data.isImprisoned || false,
            jailTimeEnd: data.jailTimeEnd || null,
            wantedStars: data.wantedStars || 0,
            birthdate: data.birthdate || null,
            country: data.country || null,
            health: data.health || 100,
            phoneNumber: data.equipped?.sim || data.phoneNumber || null,
            hasESim: data.hasESim || false,
            inSafeHouse: data.inSafeHouse || false,
            defense: data.defense || 0,
            power: data.power || 0,
            equipped: data.equipped || {}
          };
          
          const prevProfile = get().profile;
          const prevWealth = (prevProfile?.cleanMoney || 0) + (prevProfile?.dirtyMoney || 0) + (prevProfile?.bankBalance || 0) + (prevProfile?.dirtyVaultBalance || 0);
          
          // Only sync wealth if it changed by more than 500,000 to prevent constant writes
          const wealthChangedSignificantly = Math.abs(prevWealth - wealth) > 500000;

          const needsSync = !hasSyncedPublicProfile || 
              prevProfile?.displayName !== currentPublicData.displayName ||
              prevProfile?.photoURL !== currentPublicData.photoURL ||
              prevProfile?.level !== currentPublicData.level ||
              prevProfile?.reputation !== currentPublicData.reputation ||
              prevProfile?.gangId !== currentPublicData.gangId ||
              prevProfile?.gangRole !== currentPublicData.gangRole ||
              prevProfile?.city !== currentPublicData.city ||
              wealthChangedSignificantly ||
              prevProfile?.hospitalizedUntil !== currentPublicData.hospitalizedUntil ||
              prevProfile?.crimes?.kills !== currentPublicData.kills ||
              prevProfile?.isImprisoned !== currentPublicData.isImprisoned ||
              prevProfile?.jailTimeEnd !== currentPublicData.jailTimeEnd ||
              prevProfile?.wantedStars !== currentPublicData.wantedStars ||
              prevProfile?.birthdate !== currentPublicData.birthdate ||
              prevProfile?.country !== currentPublicData.country ||
              prevProfile?.health !== currentPublicData.health ||
              prevProfile?.phoneNumber !== currentPublicData.phoneNumber ||
              prevProfile?.hasESim !== currentPublicData.hasESim ||
              prevProfile?.inSafeHouse !== currentPublicData.inSafeHouse ||
              prevProfile?.defense !== currentPublicData.defense ||
              prevProfile?.power !== currentPublicData.power ||
              JSON.stringify(prevProfile?.equipped) !== JSON.stringify(currentPublicData.equipped) ||
              JSON.stringify(prevProfile?.ownedTiles) !== JSON.stringify(currentPublicData.ownedTiles);

          if (needsSync) {
            // Use a small timeout to debounce syncs
            setTimeout(async () => {
              try {
                await setDoc(doc(db, 'users_public', targetUid), currentPublicData, { merge: true });
                hasSyncedPublicProfile = true;
              } catch (e) {
                console.error("Failed to sync users_public:", e);
              }
            }, 1000);
          }
          
          set({ profile: data, loading: false });
        } else {
          if (user.email === 'm07821779969@gmail.com' || user.email === 'soft4net2016@gmail.com' || user.email === 'imvu2024k@gmail.com' || user.email === 'zoomnet5@gmail.com') {
            get().createProfile('Admin', '𝑀𝓊𝓈𝓉𝒶𝒻𝒶').catch(console.error);
          } else {
            set({ profile: null, loading: false });
          }
        }
      }, (error) => {
        const errorMessage = (error instanceof Error ? error.message : String(error)) || '';
        if (errorMessage.includes('resource-exhausted') || errorMessage.includes('Quota limit exceeded')) {
          toast.error('Firebase Quota Exceeded: Daily read/write limit reached. Please wait for the reset.', {
            id: 'quota-error'
          });
        }
        handleFirestoreError(error, OperationType.GET, `users/${targetUid}`);
        set({ loading: false });
      });
    } else {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      set({ user: null, profile: null, loading: false });
    }
  });

  return {
    user: null,
    profile: null,
    loading: true,
    loggingIn: false,
    processing: false,
    login: async () => {
      const { loggingIn } = get();
      if (loggingIn) return;

      try {
        // Call popup first to maximize user gesture preservation in iframes
        const popupPromise = signInWithPopup(auth, googleProvider);
        set({ loggingIn: true });
        await popupPromise;
      } catch (error: any) {
        if (error.code === 'auth/popup-blocked') {
          // Don't log to console as error since we handle it gracefully in the UI
          // Set a custom error property so the UI can react
          throw new Error('POPUP_BLOCKED');
        }
        
        console.error("Login failed:", error);
        if (error.code === 'auth/popup-closed-by-user') {
          toast.error(i18n.t('errors.popupClosed'));
        } else if (error.code === 'auth/unauthorized-domain') {
          toast.error(i18n.t('errors.unauthorizedDomain'));
        } else if (error.code === 'auth/network-request-failed') {
          toast.error(i18n.t('errors.offline'));
        } else {
          toast.error(i18n.t('errors.loginError'));
        }
      } finally {
        set({ loggingIn: false });
      }
    },
    logout: async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    },
    createProfile: async (role: Role, nickname: string) => {
      const { user } = get();
      if (!user) return;

      const isAdmin = user.email === 'm07821779969@gmail.com' || user.email === 'soft4net2016@gmail.com' || user.email === 'imvu2024k@gmail.com' || user.email === 'zoomnet5@gmail.com';
      const requestedName = isAdmin ? '𝑀𝓊𝓈𝓉𝒶𝒻𝒶' : (nickname.trim() || user.displayName || 'Unknown Player');

      // Check if display name is already taken
      const nameQuery = query(collection(db, 'users_public'), where('displayName', '==', requestedName));
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        throw new Error('هذا الاسم موجود بالفعل');
      }

      const settingsDoc = await getDoc(doc(db, 'server_settings', 'backup'));
      const settingsData = settingsDoc.data();
      const startingMoney = settingsData?.startingMoney || 5000000;

      const newProfile: UserProfile = {
        uid: user.uid,
        displayName: requestedName,
        photoURL: user.photoURL || getRealisticAvatar(user.uid, 'male', 25),
        email: user.email || '',
        role: isAdmin ? 'Admin' : role,
        level: 1,
        reputation: 0,
        cleanMoney: startingMoney, // Starting money: 5M
        dirtyMoney: 0, // Starting money: 0
        bankBalance: 0,
        investments: {
          amount: 0,
          lastClaimed: Date.now()
        },
        crimes: {
          theft: 0,
          kills: 0,
          operations: 0,
        },
        health: 100,
        gymStats: {
          strength: 0,
          endurance: 0,
          speed: 0,
          toughness: 0
        },
        gymLevel: 5,
        energy: 100,
        maxEnergy: 100,
        lastEnergyUpdate: Date.now(),
        fatigue: 0,
        heat: 0,
        wanted: false,
        wantedStars: 0,
        bounty: 0,
        isImprisoned: false,
        jailTimeEnd: null,
        warrants: false,
        policeRank: 'None',
        govRank: 'None',
        familyGymLevel: 0,
        lastFamilyGymTime: 0,
        equipped: {
          weapon1: null,
          weapon2: null,
          armor: null,
          vehicle: null,
          stimulant: null,
          hat: null,
          jacket: null,
          shirt: null,
          pants: null,
          tie: null,
          shoes: null,
          accessory: null,
        },
        inventory: { cars: {}, bikes: 0, weapons: {}, drugs: {}, transportedDrugs: {}, armor: {}, tools: {}, gold: 0, antiques: 0, electronics: 0, supplements: {} },
        family: { wives: [] },
        agents: [],
        land: { baghdad: 0, damascus: 0, beirut: 0, cairo: 0, dubai: 0 },
        ownedTiles: { baghdad: [], damascus: [], beirut: [], cairo: [], dubai: [] },
        builtProperties: [],
        crew: [],
        gangLevel: 1,
        properties: [],
        gangMembers: 0,
        familyMembers: 0,
        city: 'baghdad',
        vehicles: [],
        nameChangeHistory: [],
        countryChangeHistory: [],
        welcomeMessageSeen: false,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        hasESim: false,
        gender: 'male'
      };

      try {
        await setDoc(doc(db, 'users', user.uid), newProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
      }
    },
    setWelcomeMessageSeen: async () => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, { welcomeMessageSeen: true });
    },
    equipItem: async (type, itemId) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const updates: any = {
        [`equipped.${type}`]: itemId
      };

      if (type === 'armor') {
        const armor = MARKET_ITEMS.armor.find(a => a.id === itemId);
        if (armor) {
          updates.armorHealth = armor.power;
        }
      }

      await updateDoc(docRef, updates);
    },
    batchEquipItems: async (items) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const updates: any = {};
      items.forEach(({ type, itemId }) => {
        updates[`equipped.${type}`] = itemId;
        
        if (type === 'armor') {
          const armor = MARKET_ITEMS.armor.find(a => a.id === itemId);
          if (armor) {
            updates.armorHealth = armor.power;
          }
        }
      });

      await updateDoc(docRef, updates);
    },
    saveOutfit: async (name) => {
      const { profile } = get();
      if (!profile || !profile.equipped) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const newOutfit = {
        id: Math.random().toString(36).substring(7),
        name,
        items: { ...profile.equipped }
      };

      const currentOutfits = profile.savedOutfits || [];
      await updateDoc(docRef, {
        savedOutfits: [...currentOutfits, newOutfit]
      });
    },
    deleteOutfit: async (id) => {
      const { profile } = get();
      if (!profile || !profile.savedOutfits) return;
      const docRef = doc(db, 'users', profile.uid);
      
      const updatedOutfits = profile.savedOutfits.filter(o => o.id !== id);
      await updateDoc(docRef, {
        savedOutfits: updatedOutfits
      });
    },
    unequipItem: async (type) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        [`equipped.${type}`]: null
      });
    },
    takeDamage: async (amount) => {
      const { profile } = get();
      if (!profile) return;
      
      let newHealth = profile.health || 100;
      let newArmorHealth = profile.armorHealth || 0;

      if (newArmorHealth > 0) {
        if (newArmorHealth >= amount) {
          newArmorHealth -= amount;
        } else {
          const remainingDamage = amount - newArmorHealth;
          newArmorHealth = 0;
          newHealth = Math.max(0, newHealth - remainingDamage);
        }
      } else {
        newHealth = Math.max(0, newHealth - amount);
      }

      const docRef = doc(db, 'users', profile.uid);
      const updates: any = {
        health: newHealth,
        armorHealth: newArmorHealth
      };
      
      if (newHealth <= 0) {
        updates.city = 'hospital';
        updates.health = 0;
        // 0 to 100% in 50 minutes (2% per minute)
        updates.hospitalizedUntil = Date.now() + (50 * 60 * 1000);
      } else {
        // If they take damage but aren't hospitalized, we might still want to set a recovery time
        // but for now let's only hospitalize at 0 health or if they choose to enter.
      }
      
      await updateDoc(docRef, updates);
    },
    heal: async (cost) => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.insufficientFunds'));
        return;
      }
      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(docRef, {
          health: 100,
          cleanMoney: increment(-cost),
          city: 'baghdad',
          hospitalizedUntil: null,
          killedBy: null
        });
        toast.success(i18n.t('hospital.healSuccess'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    repairArmor: async (cost) => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      
      const equippedArmor = MARKET_ITEMS.armor.find(a => a.id === profile.equipped?.armor);
      if (!equippedArmor) return;

      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(docRef, {
          armorHealth: equippedArmor.power,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('properties.repairArmorSuccess'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    hirePrivateDoctor: async () => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      const cost = 100000000;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.noMoney'));
        return;
      }
      set({ processing: true });
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasPrivateDoctor: true,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('common.success'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    buySurgeryRoom: async () => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      const cost = 100000000;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.noMoney'));
        return;
      }
      set({ processing: true });
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasPrivateSurgeryRoom: true,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('common.success'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    buyAmbulance: async () => {
      const { profile, processing } = get();
      if (!profile || processing) return;
      const cost = 10000000;
      if (profile.cleanMoney < cost) {
        toast.error(i18n.t('common.noMoney'));
        return;
      }
      set({ processing: true });
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasPrivateAmbulance: true,
          cleanMoney: increment(-cost)
        });
        toast.success(i18n.t('common.success'));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    calculatePower: (profile: UserProfile) => {
      if (!profile) return 0;
      let power = (profile.level || 1) * 10;
      
      // Add gym stats to power
      if (profile.gymStats) {
        power += (profile.gymStats.strength || 0) + 
                 (profile.gymStats.endurance || 0) + 
                 (profile.gymStats.speed || 0) + 
                 (profile.gymStats.toughness || 0);
      }

      // Add family gym strength
      const getGymStrengthGain = (level: number) => {
        const gains = [0, 10, 50, 100, 200, 500, 600, 700, 800, 900, 1500, 1600, 1700, 1800, 1900, 2500, 2600, 2770, 2800, 2900, 5000];
        return gains[level] || 0;
      };
      const calculateTotalGymStrength = (level: number) => {
        return getGymStrengthGain(level);
      };

      if (profile.familyGymLevel) {
        power += calculateTotalGymStrength(profile.familyGymLevel);
      }

      if (profile.family?.wives) {
        profile.family.wives.forEach(wife => {
          if (wife.gymLevel) {
            power += calculateTotalGymStrength(wife.gymLevel);
          }
          if (wife.children) {
            wife.children.forEach(child => {
              if (child.gymLevel) {
                power += calculateTotalGymStrength(child.gymLevel);
              }
            });
          }
        });
      }

      if (profile.equipped) {
        if (profile.equipped.weapon1) {
          const w = MARKET_ITEMS.weapons.find(i => i.id === profile.equipped?.weapon1);
          if (w) power += w.power;
          else power += 50;
        }
        if (profile.equipped.weapon2) {
          const w = MARKET_ITEMS.weapons.find(i => i.id === profile.equipped?.weapon2);
          if (w) power += w.power;
          else power += 30;
        }
        if (profile.equipped.armor) {
          const a = MARKET_ITEMS.armor.find(i => i.id === profile.equipped?.armor);
          if (a) power += a.power;
          else power += 100;
        }
        if (profile.equipped.vehicle) {
          const v = MARKET_ITEMS.cars.find(i => i.id === profile.equipped?.vehicle);
          if (v) power += v.power || 200;
          else power += 200;
        }
        if (profile.equipped.stimulant) {
          const d = MARKET_ITEMS.drugs.find(i => i.id === profile.equipped?.stimulant);
          if (d && d.power) power += d.power;
        }
      }
      
      return power;
    },
    calculateDefense: (profile: UserProfile) => {
      if (!profile) return 0;
      let defense = 0;
      
      if (profile.education) {
        defense += Math.min(profile.education * 1000, 5000);
      }
      
      if (profile.family?.wives) {
        profile.family.wives.forEach(wife => {
          if (wife.education) {
            defense += Math.min(wife.education * 1000, 5000);
          }
          if (wife.children) {
            wife.children.forEach(child => {
              if (child.education) {
                defense += Math.min(child.education * 1000, 5000);
              }
            });
          }
        });
      }
      
      return defense;
    },
    train: async (stat, cost, energyCost, gain) => {
      const { profile, processing } = get();
      if (!profile || processing) return;

      const now = Date.now();
      const lastTrain = profile.lastTrainAt || 0;
      const cooldown = 10 * 1000; // 10 seconds
      
      if (now - lastTrain < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastTrain)) / 1000);
        toast.error(i18n.t('gym.cooldown', { seconds: remaining }));
        return;
      }

      if ((profile.cleanMoney || 0) < cost) {
        toast.error(i18n.t('common.insufficientFunds'));
        return;
      }

      const currentEnergy = profile.energy || 0;
      if (currentEnergy < energyCost) {
        toast.error(i18n.t('gym.insufficientEnergy'));
        return;
      }

      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      const currentStatValue = profile.gymStats?.[stat] || 0;
      const newStatValue = currentStatValue + gain;
      
      const totalStats = (profile.gymStats?.strength || 0) + 
                         (profile.gymStats?.endurance || 0) + 
                         (profile.gymStats?.speed || 0) + 
                         (profile.gymStats?.toughness || 0) + gain;
      
      const newGymLevel = Math.min(20, 5 + Math.floor(totalStats / 100));
      const newFatigue = Math.min(100, (profile.fatigue || 0) + 5);
      
      let healthUpdate = profile.health || 100;
      if (newFatigue > 80 && Math.random() > 0.5) {
        healthUpdate = Math.max(0, healthUpdate - 10);
        toast.warning(i18n.t('gym.overtrained'));
      }

      try {
        await updateDoc(docRef, {
          cleanMoney: increment(-cost),
          energy: increment(-energyCost),
          fatigue: newFatigue,
          health: healthUpdate,
          [`gymStats.${stat}`]: newStatValue,
          gymLevel: newGymLevel,
          lastEnergyUpdate: now,
          lastTrainAt: now
        });
        toast.success(i18n.t('gym.trainSuccess', { stat: i18n.t(`gym.stats.${stat}`) }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    useSupplement: async (itemId) => {
      const { profile, processing } = get();
      if (!profile || !profile.inventory?.supplements || processing) return;

      const supplement = MARKET_ITEMS.supplements.find(s => s.id === itemId);
      if (!supplement) return;

      const quantity = profile.inventory.supplements[itemId] || 0;
      if (quantity <= 0) {
        toast.error(i18n.t('common.noItem'));
        return;
      }

      set({ processing: true });
      const docRef = doc(db, 'users', profile.uid);
      const newEnergy = Math.min(profile.maxEnergy || 100, (profile.energy || 0) + (supplement as any).energy);
      
      const newSupplements = { ...profile.inventory.supplements };
      if (newSupplements[itemId] > 1) {
        newSupplements[itemId] -= 1;
      } else {
        delete newSupplements[itemId];
      }

      try {
        await updateDoc(docRef, {
          energy: newEnergy,
          'inventory.supplements': newSupplements,
          lastEnergyUpdate: Date.now()
        });
        toast.success(i18n.t('gym.supplementSuccess', { name: supplement.name }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    buyAndUseSupplement: async (itemId) => {
      const { profile, processing } = get();
      if (!profile || processing) return;

      const supplement = MARKET_ITEMS.supplements.find(s => s.id === itemId);
      if (!supplement) return;

      const currentQuantity = profile.inventory?.supplements?.[itemId] || 0;
      const docRef = doc(db, 'users', profile.uid);
      const now = Date.now();

      set({ processing: true });

      try {
        if (currentQuantity > 0) {
          // Use existing
          const newEnergy = Math.min(profile.maxEnergy || 100, (profile.energy || 0) + (supplement as any).energy);
          const newSupplements = { ...(profile.inventory?.supplements || {}) };
          if (newSupplements[itemId] > 1) {
            newSupplements[itemId] -= 1;
          } else {
            delete newSupplements[itemId];
          }

          await updateDoc(docRef, {
            energy: newEnergy,
            'inventory.supplements': newSupplements,
            lastEnergyUpdate: now
          });
          toast.success(i18n.t('gym.supplementSuccess', { name: supplement.name }));
        } else {
          // Buy and use
          if ((profile.cleanMoney || 0) < supplement.price) {
            toast.error(i18n.t('common.insufficientFunds'));
            return;
          }

          const newEnergy = Math.min(profile.maxEnergy || 100, (profile.energy || 0) + (supplement as any).energy);
          await updateDoc(docRef, {
            cleanMoney: increment(-supplement.price),
            energy: newEnergy,
            lastEnergyUpdate: now
          });
          toast.success(i18n.t('gym.boughtAndUsed', { name: supplement.name }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      } finally {
        set({ processing: false });
      }
    },
    setInSafeHouse: async (inSafeHouse: boolean) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, { inSafeHouse });
    },
    updateActiveMission: async (mission: UserProfile['activeMission']) => {
      const { profile } = get();
      if (!profile) return;
      const docRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(docRef, { activeMission: mission });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }
    }
  };
});

