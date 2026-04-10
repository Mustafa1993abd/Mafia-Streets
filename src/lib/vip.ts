export type VIPLevel = 'silver' | 'gold' | 'diamond' | 'demon' | null | undefined;

export const VIP_CONFIG = {
  silver: {
    label: 'VIP فضي',
    color: 'text-slate-300',
    borderColor: 'border-slate-300',
    bg: 'bg-slate-300/20',
    gradient: 'from-slate-400 to-slate-200',
    shadow: 'shadow-slate-300/50',
    multiplier: 1.1,
    cooldownReduction: 0.9,
    discount: 0.9,
    icon: 'Star',
  },
  gold: {
    label: 'VIP ذهبي',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-400',
    bg: 'bg-yellow-400/20',
    gradient: 'from-yellow-500 to-amber-300',
    shadow: 'shadow-yellow-400/50',
    multiplier: 1.2,
    cooldownReduction: 0.8,
    discount: 0.8,
    icon: 'Crown',
  },
  diamond: {
    label: 'VIP ماسي',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-400',
    bg: 'bg-cyan-400/20',
    gradient: 'from-cyan-500 to-blue-400',
    shadow: 'shadow-cyan-400/50',
    multiplier: 1.3,
    cooldownReduction: 0.7,
    discount: 0.7,
    icon: 'Gem',
  },
  demon: {
    label: 'VIP ديمون',
    color: 'text-red-600',
    borderColor: 'border-red-600',
    bg: 'bg-red-600/20',
    gradient: 'from-red-700 to-orange-500',
    shadow: 'shadow-red-600/50',
    multiplier: 1.5,
    cooldownReduction: 0.5,
    discount: 0.5,
    icon: 'Flame',
  }
};

export const getVIPMultiplier = (level: VIPLevel) => {
  if (!level) return 1;
  return VIP_CONFIG[level]?.multiplier || 1;
};

export const getVIPCooldownReduction = (level: VIPLevel) => {
  if (!level) return 1;
  return VIP_CONFIG[level]?.cooldownReduction || 1;
};

export const getVIPDiscount = (level: VIPLevel) => {
  if (!level) return 1;
  return VIP_CONFIG[level]?.discount || 1;
};
