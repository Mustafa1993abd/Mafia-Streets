import { MARKET_ITEMS } from './items';

export interface WealthyRewardItem {
  id: string;
  name: string;
  image: string;
  type: 'cars' | 'weapons' | 'phones' | 'money';
  power?: number;
  quantity: number;
}

export const WEALTHY_SPECIAL_ITEMS: Record<string, WealthyRewardItem> = {
  lamborghini: {
    id: 'special_lamborghini',
    name: 'لامبورغيني',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCGE3QRQ5jRP0_zsA1v9_2tG_ZepvYwOO5paA20YSQIlAXoSkdwEr_BIES&s=10',
    type: 'cars',
    power: 5000,
    quantity: 1
  },
  ferrari: {
    id: 'special_ferrari',
    name: 'فيراري',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUqr2ORrv0Rs3Y4Wlc202kNHjCPG4h3_Yu0B_a5_TicQ&s=10',
    type: 'cars',
    power: 7000,
    quantity: 1
  },
  iphone_gold: {
    id: 'special_iphone_gold',
    name: 'iPhone 17 Pro max ذهبي',
    image: 'https://cdn.shopify.com/s/files/1/0327/9585/2937/files/img-1_f4181ee7-c8cf-4176-a4ed-05a4aa5b121f.png?v=1758207630',
    type: 'phones',
    power: 5000,
    quantity: 1
  },
  glock_gold: {
    id: 'special_glock_gold',
    name: 'غلوك 19 ذهبي',
    image: 'https://wallpapers.com/images/hd/mafia-iphone-g070y4m2l3no8qg7.jpg',
    type: 'weapons',
    power: 10000,
    quantity: 1
  },
  ak47_gold: {
    id: 'special_ak47_gold',
    name: 'إيه كيه-47 ذهبي',
    image: 'https://wallpapers.com/images/hd/mafia-iphone-g070y4m2l3no8qg7.jpg',
    type: 'weapons',
    power: 15000,
    quantity: 1
  }
};

export const getWealthyReward = (characterId: string) => {
  const result: { money: number; items: WealthyRewardItem[] } = {
    money: 0,
    items: []
  };

  switch (characterId) {
    case 'jackson':
      // 20M to 70M
      result.money = Math.floor(Math.random() * (70000000 - 20000000 + 1)) + 20000000;
      // Golden weapons or normal cars
      const jacksonRand = Math.random();
      if (jacksonRand < 0.4) {
        result.items.push(WEALTHY_SPECIAL_ITEMS.glock_gold);
      } else if (jacksonRand < 0.7) {
        result.items.push(WEALTHY_SPECIAL_ITEMS.ak47_gold);
      } else {
        // Normal car from MARKET_ITEMS
        const normalCars = MARKET_ITEMS.cars.filter(c => c.type === 'normal');
        const car = normalCars[Math.floor(Math.random() * normalCars.length)];
        result.items.push({ ...car, quantity: 1 } as any);
      }
      break;

    case 'natalia':
      // 100M
      result.money = 100000000;
      // Golden weapons
      result.items.push(WEALTHY_SPECIAL_ITEMS.ak47_gold);
      break;

    case 'jawaher':
      // 20M to 70M
      result.money = Math.floor(Math.random() * (70000000 - 20000000 + 1)) + 20000000;
      // Sports cars or latest phones
      const jawaherRand = Math.random();
      if (jawaherRand < 0.3) {
        result.items.push(WEALTHY_SPECIAL_ITEMS.lamborghini);
      } else if (jawaherRand < 0.6) {
        result.items.push(WEALTHY_SPECIAL_ITEMS.ferrari);
      } else {
        // Latest phone from MARKET_ITEMS
        const phone = MARKET_ITEMS.phones[Math.floor(Math.random() * MARKET_ITEMS.phones.length)];
        result.items.push({ ...phone, quantity: 1 } as any);
      }
      break;

    case 'elizabeth':
      // 30M to 80M
      result.money = Math.floor(Math.random() * (80000000 - 30000000 + 1)) + 30000000;
      // Luxury cars or Golden phone
      const elizabethRand = Math.random();
      if (elizabethRand < 0.4) {
        result.items.push(WEALTHY_SPECIAL_ITEMS.iphone_gold);
      } else {
        // Luxury car from MARKET_ITEMS
        const luxuryCars = MARKET_ITEMS.cars.filter(c => c.type === 'luxury');
        const car = luxuryCars[Math.floor(Math.random() * luxuryCars.length)];
        result.items.push({ ...car, quantity: 1 } as any);
      }
      break;
  }

  return result;
};
