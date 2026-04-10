import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import { Sword, Shield, Skull, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatNumberExact, formatMoney } from '../lib/utils';
import { getVIPMultiplier } from '../lib/vip';
import PlayerAvatar from '../components/PlayerAvatar';

export default function Attack() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, calculatePower, calculateDefense } = useAuthStore();
  const { t } = useTranslation();
  const [target, setTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAttacking, setIsAttacking] = useState(false);
  const [attackResult, setAttackResult] = useState<{
    isWin: boolean;
    stolenDirty: number;
    stolenClean: number;
    damageDealt: number;
    damagePercent: number;
  } | null>(null);

  useEffect(() => {
    if (!id || id === profile?.uid) {
      navigate('/');
      return;
    }

    const fetchTarget = async () => {
      try {
        const targetDoc = await getDoc(doc(db, 'users_public', id));
        if (targetDoc.exists()) {
          setTarget({ uid: targetDoc.id, ...targetDoc.data() });
        } else {
          toast.error(t('common.failed'));
          navigate('/');
        }
      } catch (error) {
        console.error(error);
        toast.error(t('common.failed'));
      } finally {
        setLoading(false);
      }
    };

    fetchTarget();
  }, [id, profile, navigate, t]);

  const handleAttack = async () => {
    console.log('handleAttack called', { profile: !!profile, target: !!target, isAttacking });
    if (!profile) { console.log('No profile'); return; }
    if (!target) { console.log('No target'); return; }
    if (isAttacking) { console.log('Already attacking'); return; }
    
    console.log('Starting attack logic...');
    
    if (profile.city === 'hospital' || (profile.hospitalizedUntil && profile.hospitalizedUntil > Date.now())) {
      console.log('Player is in hospital');
      toast.error('لا يمكنك الهجوم وأنت في المستشفى');
      return;
    }

    if (target.inSafeHouse) {
      console.log('Target is in safe house');
      toast.error('الهدف في المنزل الآمن، لا يمكنك مهاجمته');
      return;
    }
    
    const myPower = calculatePower(profile);
    const targetPower = calculatePower(target);
    const targetDefense = targetPower + calculateDefense(target);
    console.log('Powers:', { myPower, targetDefense });
    
    // Calculate damage percentage (0% to 100%)
    // Base damage is 50% if powers are equal, scaled by ratio
    const powerRatio = myPower / (targetDefense || 1);
    const randomFactor = Math.random() * 40 - 20; // -20% to +20% randomness
    let damagePercent = Math.floor((powerRatio * 50) + randomFactor);
    
    // Clamp between 0 and 100
    damagePercent = Math.max(0, Math.min(100, damagePercent));
    
    const isWin = damagePercent > 0;
    const damageDealt = Math.floor((target.health || 100) * (damagePercent / 100));

    setIsAttacking(true);
    console.log('isAttacking set to true');
    try {
      const userRef = doc(db, 'users', profile.uid);
      const targetRef = doc(db, 'users', target.uid);
      
      let stolenDirty = 0;
      let stolenClean = 0;

      // Check for bounties
      const bountiesQuery = query(collection(db, 'bounties'), where('targetId', '==', target.uid));
      const bountiesSnapshot = await getDocs(bountiesQuery);
      let totalBounty = 0;
      const bountyDocs: any[] = [];
      bountiesSnapshot.forEach(doc => {
        totalBounty += doc.data().bountyAmount;
        bountyDocs.push(doc);
      });

      console.log('Starting transaction...');
      await runTransaction(db, async (transaction) => {
        console.log('Inside transaction');
        const userDoc = await transaction.get(userRef);
        const targetDoc = await transaction.get(targetRef);
        
        if (!userDoc.exists() || !targetDoc.exists()) throw new Error('لم يتم العثور على اللاعب أو الهدف');

        const userData = userDoc.data();
        const targetData = targetDoc.data();

        if (targetData.city === 'hospital' || (targetData.hospitalizedUntil && targetData.hospitalizedUntil > Date.now())) {
          console.log('Target is in hospital');
          throw new Error('الهدف حالياً في المستشفى');
        }

        if (targetData.isImprisoned) {
          console.log('Target is in prison');
          throw new Error('الهدف حالياً في السجن');
        }

        if (isWin) {
          // Win: steal money (1000 to 4000), gain reputation
          const totalAvailable = (targetData.dirtyMoney || 0) + (targetData.cleanMoney || 0);
          const stolenTotal = Math.min(totalAvailable, Math.floor(Math.random() * (4000 - 1000 + 1)) + 1000);
          
          // Distribute stolenTotal between dirty and clean money
          const dirtyRatio = (targetData.dirtyMoney || 0) / (totalAvailable || 1);
          stolenDirty = Math.floor(stolenTotal * dirtyRatio);
          stolenClean = stolenTotal - stolenDirty;
          
          // Apply damage with armor logic
          let targetHealth = targetData.health || 100;
          let targetArmor = targetData.armorHealth || 0;

          // If damage is 100%, it's an instant kill regardless of armor
          if (damagePercent >= 100) {
            targetHealth = 0;
            targetArmor = 0;
          } else {
            if (targetArmor > 0) {
              if (targetArmor >= damageDealt) {
                targetArmor -= damageDealt;
              } else {
                const remainingDamage = damageDealt - targetArmor;
                targetArmor = 0;
                targetHealth = Math.max(0, targetHealth - remainingDamage);
              }
            } else {
              targetHealth = Math.max(0, targetHealth - damageDealt);
            }
          }
          
          // Apply VIP multiplier to stolen money
          stolenDirty = Math.floor(stolenDirty * getVIPMultiplier(userData.vipLevel));
          stolenClean = Math.floor(stolenClean * getVIPMultiplier(userData.vipLevel));

          transaction.update(userRef, {
            dirtyMoney: (userData.dirtyMoney || 0) + stolenDirty,
            cleanMoney: (userData.cleanMoney || 0) + stolenClean + totalBounty,
            reputation: (userData.reputation || 0) + 200,
            wantedStars: Math.min(5, (userData.wantedStars || 0) + 1),
            bounty: (userData.bounty || 0) + 5000
          });

          transaction.update(targetRef, {
            dirtyMoney: Math.max(0, (targetData.dirtyMoney || 0) - stolenDirty),
            cleanMoney: Math.max(0, (targetData.cleanMoney || 0) - stolenClean),
            health: targetHealth,
            armorHealth: targetArmor,
            city: targetHealth <= 0 ? 'hospital' : targetData.city,
            hospitalizedUntil: targetHealth <= 0 ? Date.now() + 3600000 : (targetData.hospitalizedUntil || null),
            killedBy: targetHealth <= 0 ? profile.displayName : (targetData.killedBy || null)
          });

          // Send notification to victim
          transaction.set(doc(collection(db, 'messages')), {
            senderId: profile.uid,
            senderName: t('messages.system'),
            receiverId: target.uid,
            content: t('messages.victimNotificationWin', { 
              name: profile.displayName, 
              health: (targetData.health || 100) - targetHealth,
              dirty: formatNumber(stolenDirty),
              clean: formatNumber(stolenClean)
            }),
            type: 'battle',
            read: false,
            timestamp: serverTimestamp(),
            subject: t('messages.battle')
          });

          // Send notification to attacker
          transaction.set(doc(collection(db, 'messages')), {
            senderId: profile.uid,
            senderName: t('messages.system'),
            receiverId: profile.uid,
            content: t('messages.attackerNotificationWin', {
              name: target.displayName,
              dirty: formatMoney(stolenDirty),
              clean: formatMoney(stolenClean),
              damage: damagePercent
            }),
            type: 'battle',
            read: false,
            timestamp: serverTimestamp(),
            subject: t('messages.battle')
          });
          
          // Delete claimed bounties
          bountyDocs.forEach(bountyDoc => {
            transaction.delete(bountyDoc.ref);
          });
          
          // Log kill if health is 0
          if (targetHealth <= 0) {
            transaction.set(doc(collection(db, 'kills')), {
              killerId: profile.uid,
              killerName: profile.displayName,
              victimId: target.uid,
              victimName: target.displayName,
              killerLevel: profile.level,
              victimLevel: target.level,
              timestamp: serverTimestamp()
            });

            // Increment killer's kills count
            transaction.update(userRef, {
              'crimes.kills': (userData.crimes?.kills || 0) + 1
            });
          }
        } else {
          // Lose: lose health (if damagePercent is 0)
          const myDamage = Math.floor(targetPower * 0.15);
          let myHealth = userData.health || 100;
          let myArmor = userData.armorHealth || 0;

          if (myArmor > 0) {
            if (myArmor >= myDamage) {
              myArmor -= myDamage;
            } else {
              const remainingDamage = myDamage - myArmor;
              myArmor = 0;
              myHealth = Math.max(1, myHealth - remainingDamage);
            }
          } else {
            myHealth = Math.max(1, myHealth - myDamage);
          }

          transaction.update(userRef, {
            health: myHealth,
            armorHealth: myArmor,
            city: myHealth <= 1 ? 'hospital' : userData.city,
            wantedStars: Math.min(5, (userData.wantedStars || 0) + 1),
            bounty: (userData.bounty || 0) + 2500
          });

          // Send notification to victim about successful defense
          transaction.set(doc(collection(db, 'messages')), {
            senderId: profile.uid,
            senderName: t('messages.system'),
            receiverId: target.uid,
            content: t('messages.victimNotificationLoss', { name: profile.displayName }),
            type: 'battle',
            read: false,
            timestamp: serverTimestamp(),
            subject: t('messages.battle')
          });
        }
      });
      console.log('Transaction completed');

      setAttackResult({ isWin, stolenDirty, stolenClean, damageDealt, damagePercent });

      if (isWin) {
        if (damagePercent >= 100) {
          toast.success(t('crimes.fatalBlow', { name: target.displayName }));
        } else {
          toast.success(t('crimes.attackSuccess', { damage: damagePercent, dirty: formatMoney(stolenDirty) }));
        }
        if (totalBounty > 0) {
          toast.success(t('crimes.bountyClaimed', { amount: formatMoney(totalBounty) }));
        }
      } else {
        toast.error('فشل الهجوم');
      }
      
    } catch (error) {
      console.error('Combat error:', error);
      const errorMessage = (error instanceof Error ? error.message : String(error)) || '';
      if (errorMessage.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, 'users');
        toast.error('خطأ: ليس لديك صلاحية كافية للقيام بهذا الهجوم');
      } else {
        toast.error(errorMessage || 'فشل القتال');
      }
    } finally {
      console.log('Setting isAttacking to false');
      setIsAttacking(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (!target) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
        <Sword className="text-red-500" size={40} />
        {t('crimes.attack')}
      </h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
        {attackResult ? (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className={`text-6xl font-black ${attackResult.isWin ? 'text-green-500' : 'text-red-500'}`}>
              {attackResult.isWin ? (attackResult.damagePercent >= 100 ? t('crimes.eliminated') : t('common.success')) : t('common.failed')}
            </div>
            
            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
              <div className="text-sm text-zinc-500 mb-2 uppercase font-bold tracking-widest">{t('crimes.strikePower')}</div>
              <div className="text-5xl font-black text-white">{attackResult.damagePercent}%</div>
              <div className="w-full bg-zinc-900 h-3 rounded-full mt-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${attackResult.damagePercent >= 100 ? 'bg-red-600' : 'bg-green-600'}`}
                  style={{ width: `${attackResult.damagePercent}%` }}
                />
              </div>
            </div>

            {attackResult.isWin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 mb-1">{t('header.dirtyMoney')}</div>
                  <div className="text-red-400 font-bold">{formatMoney(attackResult.stolenDirty)}</div>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="text-xs text-zinc-500 mb-1">{t('header.cleanMoney')}</div>
                  <div className="text-green-400 font-bold">{formatMoney(attackResult.stolenClean)}</div>
                </div>
              </div>
            )}
            
            <p className="text-zinc-500">{t('common.returningHome')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="text-center">
                <div className="mb-4">
                  <PlayerAvatar
                    photoURL={profile?.photoURL}
                    displayName={profile?.displayName}
                    vipLevel={profile?.vipLevel}
                    size="xl"
                  />
                </div>
                <h3 className="text-xl font-bold text-white">{profile?.displayName}</h3>
                <p className="text-sm text-zinc-400">{t('crimes.level', { lvl: profile?.level })}</p>
                <div className="mt-2 text-xs font-bold text-blue-400">{t('crimes.power')}: {formatNumberExact(calculatePower(profile || {} as any))}</div>
                <div className="mt-1 text-xs font-bold text-blue-400">الدفاع: {formatNumberExact(calculateDefense(profile || {} as any))}</div>
              </div>

              <div className="text-4xl font-black text-red-500">{t('crimes.vs')}</div>

              <div className="text-center">
                <div className="mb-4">
                  <PlayerAvatar
                    photoURL={target.photoURL}
                    displayName={target.displayName}
                    vipLevel={target.vipLevel}
                    size="xl"
                  />
                </div>
                <h3 className="text-xl font-bold text-white">{target.displayName}</h3>
                <p className="text-sm text-zinc-400">{t('crimes.level', { lvl: target.level })}</p>
                <div className="mt-2 text-xs font-bold text-red-400">{t('crimes.power')}: {formatNumberExact(calculatePower(target))}</div>
                <div className="mt-1 text-xs font-bold text-blue-400">الدفاع: {formatNumberExact(calculateDefense(target))}</div>
              </div>
            </div>

            <button
              onClick={handleAttack}
              disabled={isAttacking}
              className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            >
              {isAttacking ? t('crimes.attacking') : t('crimes.attack')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
