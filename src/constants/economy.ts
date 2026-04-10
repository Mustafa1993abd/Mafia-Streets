import { 
  Box, Droplets, Zap, Shield, Car, Target, 
  Package, FlaskConical, Cpu, Battery, 
  Wind, Hammer, Radio, Lock, Activity,
  Gem, Flame, Layers, DollarSign
} from 'lucide-react';

export type Rarity = 'common' | 'rare' | 'very_rare' | 'legendary';
export type Quality = 'normal' | 'good' | 'rare' | 'legendary';

export interface RawMaterial {
  id: string;
  name: string;
  category: 'metals' | 'chemicals' | 'tech' | 'general';
  basePrice: number;
  rarity: Rarity;
  weight: number;
  description: string;
  color: string;
  icon: any;
  imageUrl: string;
}

export interface ProductRecipe {
  [materialId: string]: number;
}

export interface Product {
  id: string;
  name: string;
  category: 'weapons' | 'cars' | 'illegal' | 'tools';
  recipe: ProductRecipe;
  basePrice: number;
  weight: number;
  description: string;
  color: string;
  icon: any;
  imageUrl: string;
  craftingTime: number; // in milliseconds
}

export const RAW_MATERIALS: Record<string, RawMaterial> = {
  iron: {
    id: 'iron',
    name: 'حديد',
    category: 'metals',
    basePrice: 100,
    rarity: 'common',
    weight: 10,
    description: 'حديد خام عالي الجودة للبناء والتصنيع.',
    color: '#94a3b8',
    icon: Hammer,
    imageUrl: 'https://picsum.photos/seed/iron-ore/400/400'
  },
  copper: {
    id: 'copper',
    name: 'نحاس',
    category: 'metals',
    basePrice: 250,
    rarity: 'common',
    weight: 8,
    description: 'نحاس موصل للكهرباء، ضروري للقطع التقنية.',
    color: '#b45309',
    icon: Zap,
    imageUrl: 'https://picsum.photos/seed/copper-wire/400/400'
  },
  aluminum: {
    id: 'aluminum',
    name: 'ألومنيوم',
    category: 'metals',
    basePrice: 150,
    rarity: 'common',
    weight: 4,
    description: 'معدن خفيف وقوي، يستخدم في هياكل السيارات.',
    color: '#cbd5e1',
    icon: Layers,
    imageUrl: 'https://picsum.photos/seed/aluminum/400/400'
  },
  raw_drugs: {
    id: 'raw_drugs',
    name: 'مواد مخدرة خام',
    category: 'chemicals',
    basePrice: 1000,
    rarity: 'rare',
    weight: 2,
    description: 'مواد نباتية خام تحتاج لمعالجة كيميائية.',
    color: '#16a34a',
    icon: FlaskConical,
    imageUrl: 'https://picsum.photos/seed/herbs/400/400'
  },
  chemical_liquids: {
    id: 'chemical_liquids',
    name: 'سوائل كيميائية',
    category: 'chemicals',
    basePrice: 600,
    rarity: 'common',
    weight: 5,
    description: 'محاليل كيميائية تستخدم في المختبرات والتصنيع.',
    color: '#2563eb',
    icon: Droplets,
    imageUrl: 'https://picsum.photos/seed/chemicals/400/400'
  },
  manufacturing_powder: {
    id: 'manufacturing_powder',
    name: 'بودرة تصنيع',
    category: 'chemicals',
    basePrice: 400,
    rarity: 'common',
    weight: 3,
    description: 'مسحوق كيميائي أساسي للعديد من المنتجات.',
    color: '#f8fafc',
    icon: Box,
    imageUrl: 'https://picsum.photos/seed/powder/400/400'
  },
  electronic_chips: {
    id: 'electronic_chips',
    name: 'رقائق إلكترونية',
    category: 'tech',
    basePrice: 2000,
    rarity: 'rare',
    weight: 0.5,
    description: 'دوائر متكاملة متطورة للأسلحة والأدوات.',
    color: '#9333ea',
    icon: Cpu,
    imageUrl: 'https://picsum.photos/seed/microchip/400/400'
  },
  wires: {
    id: 'wires',
    name: 'أسلاك',
    category: 'tech',
    basePrice: 100,
    rarity: 'common',
    weight: 1,
    description: 'أسلاك توصيل نحاسية معزولة.',
    color: '#eab308',
    icon: Activity,
    imageUrl: 'https://picsum.photos/seed/wires/400/400'
  },
  batteries: {
    id: 'batteries',
    name: 'بطاريات',
    category: 'tech',
    basePrice: 300,
    rarity: 'common',
    weight: 2,
    description: 'خلايا طاقة عالية الكثافة.',
    color: '#dc2626',
    icon: Battery,
    imageUrl: 'https://picsum.photos/seed/battery/400/400'
  },
  fuel: {
    id: 'fuel',
    name: 'وقود',
    category: 'general',
    basePrice: 200,
    rarity: 'common',
    weight: 15,
    description: 'وقود عالي الأوكتان للمحركات.',
    color: '#18181b',
    icon: Flame,
    imageUrl: 'https://picsum.photos/seed/fuel/400/400'
  },
  wood: {
    id: 'wood',
    name: 'خشب',
    category: 'general',
    basePrice: 100,
    rarity: 'common',
    weight: 12,
    description: 'خشب صلب للصناديق والأثاث.',
    color: '#78350f',
    icon: Box,
    imageUrl: 'https://picsum.photos/seed/wood/400/400'
  },
  plastic: {
    id: 'plastic',
    name: 'بلاستيك',
    category: 'general',
    basePrice: 100,
    rarity: 'common',
    weight: 3,
    description: 'بوليمرات بلاستيكية متعددة الاستخدامات.',
    color: '#f1f5f9',
    icon: Box,
    imageUrl: 'https://picsum.photos/seed/plastic/400/400'
  },
  snapdragon_8_elite: {
    id: 'snapdragon_8_elite',
    name: 'معالج Snapdragon 8 Elite',
    category: 'tech',
    basePrice: 5000,
    rarity: 'very_rare',
    weight: 0.1,
    description: 'أقوى معالج للهواتف الذكية في العالم.',
    color: '#ef4444',
    icon: Cpu,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  },
  camera_200mp: {
    id: 'camera_200mp',
    name: 'كاميرا 200MP',
    category: 'tech',
    basePrice: 3000,
    rarity: 'rare',
    weight: 0.2,
    description: 'مستشعر تصوير فائق الدقة مع زوم بصري.',
    color: '#3b82f6',
    icon: Target,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  },
  battery_5000mah: {
    id: 'battery_5000mah',
    name: 'بطارية 5000mAh',
    category: 'tech',
    basePrice: 1000,
    rarity: 'common',
    weight: 0.3,
    description: 'بطارية ليثيوم عالية الكثافة للشحن السريع.',
    color: '#10b981',
    icon: Battery,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  },
  screen_6_9_amoled: {
    id: 'screen_6_9_amoled',
    name: 'شاشة 6.9 إنش AMOLED',
    category: 'tech',
    basePrice: 4000,
    rarity: 'rare',
    weight: 0.4,
    description: 'شاشة AMOLED بتردد 120Hz وألوان مبهرة.',
    color: '#f59e0b',
    icon: Layers,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcP_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  },
  memory_1tb: {
    id: 'memory_1tb',
    name: 'ذاكرة 1TB UFS 4.0',
    category: 'tech',
    basePrice: 2000,
    rarity: 'rare',
    weight: 0.1,
    description: 'ذاكرة تخزين فائقة السرعة بسعة ضخمة.',
    color: '#6366f1',
    icon: Cpu,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  },
  sim_chip: {
    id: 'sim_chip',
    name: 'رقاقة SIM',
    category: 'tech',
    basePrice: 500,
    rarity: 'common',
    weight: 0.01,
    description: 'رقاقة اتصال أساسية للشبكات الخلوية.',
    color: '#ec4899',
    icon: Cpu,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  },
  esim_module: {
    id: 'esim_module',
    name: 'وحدة eSIM',
    category: 'tech',
    basePrice: 1500,
    rarity: 'rare',
    weight: 0.01,
    description: 'وحدة شريحة إلكترونية مدمجة متطورة.',
    color: '#8b5cf6',
    icon: Cpu,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  },
  credit_card_base: {
    id: 'credit_card_base',
    name: 'قاعدة بطاقة رصيد',
    category: 'general',
    basePrice: 100,
    rarity: 'common',
    weight: 0.05,
    description: 'بطاقة بلاستيكية خام لطباعة الرصيد.',
    color: '#94a3b8',
    icon: Box,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10'
  }
};

export const PRODUCTS: Record<string, Product> = {
  pistol: {
    id: 'pistol',
    name: 'مسدس 9 ملم',
    category: 'weapons',
    recipe: { iron: 5, electronic_chips: 1, chemical_liquids: 1 },
    basePrice: 5000,
    weight: 2,
    description: 'سلاح ناري خفيف وسهل الإخفاء.',
    color: '#475569',
    icon: Target,
    imageUrl: 'https://picsum.photos/seed/pistol/400/400',
    craftingTime: 3600000 // 1 hour
  },
  machine_gun: {
    id: 'machine_gun',
    name: 'رشاش آلي',
    category: 'weapons',
    recipe: { iron: 15, electronic_chips: 3, chemical_liquids: 2, aluminum: 5 },
    basePrice: 20000,
    weight: 6,
    description: 'سلاح ذو قوة نارية هائلة.',
    color: '#1e293b',
    icon: Target,
    imageUrl: 'https://picsum.photos/seed/rifle/400/400',
    craftingTime: 7200000 // 2 hours
  },
  ammo: {
    id: 'ammo',
    name: 'صندوق ذخيرة',
    category: 'weapons',
    recipe: { copper: 10, manufacturing_powder: 5, chemical_liquids: 2 },
    basePrice: 8000,
    weight: 5,
    description: 'ذخيرة متنوعة لمختلف الأسلحة.',
    color: '#ca8a04',
    icon: Box,
    imageUrl: 'https://picsum.photos/seed/bullets/400/400',
    craftingTime: 1800000 // 30 mins
  },
  regular_car: {
    id: 'regular_car',
    name: 'سيارة عادية',
    category: 'cars',
    recipe: { aluminum: 20, fuel: 10, batteries: 5, iron: 10, wires: 10 },
    basePrice: 15000,
    weight: 1500,
    description: 'سيارة مدنية عادية للاستخدام اليومي.',
    color: '#334155',
    icon: Car,
    imageUrl: 'https://picsum.photos/seed/car/400/400',
    craftingTime: 14400000 // 4 hours
  },
  smuggled_car: {
    id: 'smuggled_car',
    name: 'سيارة مهربة',
    category: 'cars',
    recipe: { regular_car: 1, electronic_chips: 5, chemical_liquids: 5 },
    basePrice: 45000,
    weight: 1600,
    description: 'سيارة معدلة بمخابئ سرية ومحرك أقوى.',
    color: '#0f172a',
    icon: Car,
    imageUrl: 'https://picsum.photos/seed/modified-car/400/400',
    craftingTime: 21600000 // 6 hours
  },
  luxury_car: {
    id: 'luxury_car',
    name: 'سيارة فاخرة',
    category: 'cars',
    recipe: { aluminum: 40, electronic_chips: 10, batteries: 10, plastic: 20 },
    basePrice: 60000,
    weight: 2000,
    description: 'سيارة رياضية فاخرة تعكس الثراء والنفوذ.',
    color: '#dc2626',
    icon: Car,
    imageUrl: 'https://picsum.photos/seed/luxury-car/400/400',
    craftingTime: 43200000 // 12 hours
  },
  finished_drugs: {
    id: 'finished_drugs',
    name: 'مخدرات معالجة',
    category: 'illegal',
    recipe: { raw_drugs: 10, chemical_liquids: 5, manufacturing_powder: 5 },
    basePrice: 25000,
    weight: 1,
    description: 'منتجات مخدرة جاهزة للتوزيع في الشوارع.',
    color: '#15803d',
    icon: FlaskConical,
    imageUrl: 'https://picsum.photos/seed/pills/400/400',
    craftingTime: 3600000 // 1 hour
  },
  smuggled_goods: {
    id: 'smuggled_goods',
    name: 'بضائع مهربة',
    category: 'illegal',
    recipe: { wood: 10, plastic: 10, fuel: 5 },
    basePrice: 10000,
    weight: 50,
    description: 'صناديق تحتوي على بضائع متنوعة غير قانونية.',
    color: '#451a03',
    icon: Box,
    imageUrl: 'https://picsum.photos/seed/cargo/400/400',
    craftingTime: 1800000 // 30 mins
  },
  wiretapping_device: {
    id: 'wiretapping_device',
    name: 'جهاز تنصت',
    category: 'tools',
    recipe: { electronic_chips: 5, wires: 10, batteries: 2 },
    basePrice: 20000,
    weight: 0.5,
    description: 'أداة تجسس متطورة لالتقاط المحادثات.',
    color: '#2563eb',
    icon: Radio,
    imageUrl: 'https://picsum.photos/seed/spy-gadget/400/400',
    craftingTime: 7200000 // 2 hours
  },
  theft_tools: {
    id: 'theft_tools',
    name: 'أدوات سرقة',
    category: 'tools',
    recipe: { iron: 10, electronic_chips: 2, plastic: 5 },
    basePrice: 10000,
    weight: 3,
    description: 'مجموعة أدوات احترافية لفتح الأقفال والتعطيل.',
    color: '#4b5563',
    icon: Lock,
    imageUrl: 'https://picsum.photos/seed/tools/400/400',
    craftingTime: 3600000 // 1 hour
  },
  protection_gear: {
    id: 'protection_gear',
    name: 'معدات حماية',
    category: 'tools',
    recipe: { aluminum: 10, plastic: 10, iron: 5 },
    basePrice: 15000,
    weight: 10,
    description: 'دروع واقية ومعدات دفاعية للأفراد.',
    color: '#059669',
    icon: Shield,
    imageUrl: 'https://picsum.photos/seed/armor/400/400',
    craftingTime: 5400000 // 1.5 hours
  },
  samsung_s26_ultra: {
    id: 'samsung_s26_ultra',
    name: 'Samsung Galaxy S26 Ultra',
    category: 'tools',
    recipe: { snapdragon_8_elite: 1, camera_200mp: 1, battery_5000mah: 1, screen_6_9_amoled: 1, memory_1tb: 1, aluminum: 2 },
    basePrice: 15000,
    weight: 0.2,
    description: 'هاتف ذكي فائق التطور من إنتاج شركتك.',
    color: '#3b82f6',
    icon: Cpu,
    imageUrl: 'https://www.samsungplaza.com.np/public/files/80A34AE1B411235-037-galaxy-s26ultra-black-front-back-spen%20(1).jpg',
    craftingTime: 10800000 // 3 hours
  },
  sim_card_product: {
    id: 'sim_card_product',
    name: 'شريحة SIM',
    category: 'tools',
    recipe: { sim_chip: 1, plastic: 1 },
    basePrice: 500,
    weight: 0.01,
    description: 'شريحة اتصال نانو سيم.',
    color: '#ec4899',
    icon: Cpu,
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/5608/5608615.png',
    craftingTime: 600000 // 10 mins
  },
  dual_sim_card_product: {
    id: 'dual_sim_card_product',
    name: 'شريحة مزدوجة (Nano + eSIM)',
    category: 'tools',
    recipe: { sim_chip: 1, esim_module: 1, plastic: 1 },
    basePrice: 2000,
    weight: 0.01,
    description: 'شريحة اتصال مزدوجة تدعم التقنيات الحديثة.',
    color: '#8b5cf6',
    icon: Cpu,
    imageUrl: 'https://cdn-icons-png.flaticon.com/512/5608/5608615.png',
    craftingTime: 1200000 // 20 mins
  },
  credit_100: {
    id: 'credit_100',
    name: 'بطاقة رصيد 100$',
    category: 'tools',
    recipe: { credit_card_base: 1, manufacturing_powder: 1 },
    basePrice: 100,
    weight: 0.01,
    description: 'بطاقة رصيد اتصالات بقيمة 100 دولار.',
    color: '#10b981',
    icon: DollarSign,
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_p_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X&s=10',
    craftingTime: 300000 // 5 mins
  }
};

export const QUALITY_MODIFIERS = {
  normal: { price: 1, power: 1, label: 'عادي', color: 'text-zinc-400' },
  good: { price: 1.5, power: 1.2, label: 'جيد', color: 'text-emerald-400' },
  rare: { price: 3, power: 1.5, label: 'نادر', color: 'text-blue-400' },
  legendary: { price: 10, power: 2.5, label: 'أسطوري', color: 'text-amber-400' }
};
