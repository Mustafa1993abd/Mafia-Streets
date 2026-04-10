import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, Search, Sparkles, Star, 
  ChevronRight, ChevronLeft, Filter, 
  Zap, Trophy, Wallet, Info, Check,
  ArrowUpRight, CreditCard, Tag, Clock, TrendingUp, Plus, X, Crown
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, increment, onSnapshot, setDoc, collection, query, orderBy, limit, getDocs, where, getDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatMoney } from '../lib/utils';
import { toast } from 'sonner';
import clsx from 'clsx';
import { MALL_CATEGORIES, ALL_PRODUCTS } from '../lib/mallItems';

// --- Components ---

export default function CityMall() {
  const { profile, user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState(MALL_CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [personalizedDeal, setPersonalizedDeal] = useState<any>(null);
  const [customProducts, setCustomProducts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSetModal, setShowSetModal] = useState(false);
  const [setImageUrl, setSetImageUrl] = useState('');
  const [setAnalysisResults, setSetAnalysisResults] = useState<any[]>([]);
  const [isAnalyzingSet, setIsAnalyzingSet] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    image: '',
    slotType: 'clothing',
    categoryId: 'fashion_clothing',
    cost: 10000,
    prestige: 10,
  });

  const [setCategoryId, setSetCategoryId] = useState('fashion_clothing');

  const handleAnalyzeSet = async () => {
    if (!setImageUrl) return;
    setIsAnalyzingSet(true);
    // Simulate analysis delay
    setTimeout(() => {
      setSetAnalysisResults([
        { name: 'طقم كامل مخصص', slotType: 'clothing', image: setImageUrl }
      ]);
      setIsAnalyzingSet(false);
    }, 1500);
  };

  const handleImportSet = async () => {
    try {
      for (const item of setAnalysisResults) {
        const newDocRef = doc(collection(db, 'custom_products'));
        const productData = {
          id: newDocRef.id,
          name: item.name,
          image: item.image,
          layerImage: item.image,
          slotType: item.slotType,
          categoryId: setCategoryId,
          cost: 50000,
          prestige: 50,
          icon: 'Star',
          isExclusive: true // Make newly imported sets exclusive by default
        };
        await setDoc(newDocRef, productData);
      }
      toast.success('تم استيراد الطقم بنجاح');
      setShowSetModal(false);
      setSetImageUrl('');
      setSetAnalysisResults([]);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء استيراد الطقم');
    }
  };

  const handleAnalyzeImage = async () => {
    toast.info('هذه الميزة غير متوفرة حالياً.');
  };
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const isAdmin = profile?.role === 'Admin' || user?.email === 'mx779969@gmail.com' || user?.email === 'j7primemustafa@gmail.com' || user?.email === 'zoomnet5@gmail.com' || user?.email === 'm07821779969@gmail.com' || user?.email === 'nttn642@gmail.com' || user?.email === 'nwyyttt@gmail.com' || profile?.displayName?.toLowerCase() === 'mustafa';

  const toggleExclusive = async (product: any) => {
    try {
      if (customProducts.find(p => p.id === product.id)) {
        const docRef = doc(db, 'custom_products', product.id);
        await updateDoc(docRef, { isExclusive: !product.isExclusive });
        toast.success(product.isExclusive ? 'تم إزالة العرض الحصري' : 'تم تعيين كعرض حصري');
      } else {
        toast.error('يمكن تعيين المنتجات المخصصة فقط كعروض حصرية حالياً');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ');
    }
  };

  const [mallData, setMallData] = useState<any>({
    luxuryLevel: 1,
    totalSpent: 0,
    purchasedIds: [],
    loyaltyPoints: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'custom_products'));
    const unsub = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomProducts(products);
    }, (error) => {
      console.error("Error fetching custom products:", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = onSnapshot(doc(db, 'mall_data', profile.uid), (snapshot) => {
      if (snapshot.exists()) {
        setMallData(snapshot.data());
      } else {
        const initialData = {
          luxuryLevel: 1,
          totalSpent: 0,
          purchasedIds: [],
          loyaltyPoints: 0
        };
        setDoc(doc(db, 'mall_data', profile.uid), initialData);
        setMallData(initialData);
      }
    });
    return () => unsub();
  }, [profile?.uid]);

  const combinedProducts = useMemo(() => [...ALL_PRODUCTS, ...customProducts], [customProducts]);

  useEffect(() => {
    if (!profile || mallData.luxuryLevel <= 0) return;

    setPersonalizedDeal(currentDeal => {
      const exclusiveProducts = combinedProducts.filter(p => p.isExclusive && !mallData.purchasedIds.includes(p.id));
      
      if (exclusiveProducts.length > 0) {
        if (currentDeal && exclusiveProducts.some(p => 'deal_' + p.id === currentDeal.id)) {
          return currentDeal;
        }
        const product = exclusiveProducts[Math.floor(Math.random() * exclusiveProducts.length)];
        return { 
          ...product, 
          name: `عرض حصري: ${product.name}`,
          cost: Math.floor(product.cost * 0.8), // 20% discount
          id: 'deal_' + product.id 
        };
      }

      if (currentDeal) {
        const originalId = currentDeal.id.replace('deal_', '');
        if (!mallData.purchasedIds.includes(originalId)) {
          return currentDeal;
        }
      }

      const available = combinedProducts.filter(p => !mallData.purchasedIds.includes(p.id));
      if (available.length > 0) {
        const randomProduct = available[Math.floor(Math.random() * available.length)];
        return { 
          ...randomProduct, 
          name: `عرض خاص: ${randomProduct.name}`,
          cost: Math.floor(randomProduct.cost * 0.8), // 20% discount
          id: 'deal_' + randomProduct.id 
        };
      }

      return null;
    });
  }, [profile, mallData.luxuryLevel, mallData.purchasedIds, combinedProducts]);

  const filteredProducts = combinedProducts.filter(p => 
    p.categoryId === activeCategory.id && 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!p.isExclusive || profile?.vipLevel)
  ).slice(0, 24);

  const buyProduct = async (product: any) => {
    if (!profile) return;
    if ((profile.cleanMoney || 0) < product.cost) {
      toast.error('ليس لديك أموال نظيفة كافية!');
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const mallRef = doc(db, 'mall_data', profile.uid);

      await updateDoc(userRef, {
        cleanMoney: increment(-product.cost),
        prestige: increment(product.prestige || 0)
      });

      await updateDoc(mallRef, {
        purchasedIds: [...(mallData.purchasedIds || []), product.id],
        totalSpent: increment(product.cost),
        loyaltyPoints: increment(Math.floor(product.cost / 1000)),
        luxuryLevel: increment(1)
      });

      toast.success(`تم شراء ${product.name} بنجاح!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `mall_data/${profile.uid}`);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.image) {
      toast.error('يرجى إدخال اسم المنتج ورابط الصورة');
      return;
    }
    try {
      if (editingProductId) {
        const docRef = doc(db, 'custom_products', editingProductId);
        const productData = {
          ...newProduct,
          layerImage: newProduct.image,
        };
        await updateDoc(docRef, productData);
        toast.success('تم تعديل المنتج بنجاح');
      } else {
        const newDocRef = doc(collection(db, 'custom_products'));
        const productData = {
          ...newProduct,
          id: newDocRef.id,
          layerImage: newProduct.image,
          icon: 'Star',
        };
        await setDoc(newDocRef, productData);
        toast.success('تم إضافة المنتج بنجاح');
      }
      setShowAddModal(false);
      setEditingProductId(null);
      setNewProduct({
        name: '',
        image: '',
        slotType: 'clothing',
        categoryId: 'fashion_clothing',
        cost: 10000,
        prestige: 10,
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ المنتج');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'custom_products', productToDelete));
      toast.success('تم حذف المنتج بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حذف المنتج');
    } finally {
      setProductToDelete(null);
    }
  };

  const openEditModal = (product: any) => {
    setNewProduct({
      name: product.name || '',
      image: product.image || product.layerImage || '',
      slotType: product.slotType || 'clothing_upper',
      categoryId: product.categoryId || 'fashion_upper',
      cost: product.cost || 10000,
      prestige: product.prestige || 10,
    });
    setEditingProductId(product.id);
    setShowAddModal(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden flex flex-col font-sans relative" dir="rtl">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* Header */}
      <header className="bg-zinc-950/50 backdrop-blur-2xl border-b border-white/5 p-4 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-6 w-full lg:w-auto">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-500/20 ring-1 ring-white/20">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">مول المدينة الفاخر</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">Luxury Level {mallData.luxuryLevel}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="text-zinc-500 text-xs font-bold">{ALL_PRODUCTS.length}+ منتج حصري</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:gap-8 w-full lg:w-auto">
          <MallStat icon={Trophy} label="نقاط الولاء" value={mallData.loyaltyPoints?.toLocaleString()} color="text-yellow-500" />
          <MallStat icon={Wallet} label="إجمالي الإنفاق" value={formatMoney(mallData.totalSpent)} color="text-green-500" />
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* Categories Sidebar */}
        <aside className="w-full lg:w-80 border-e border-white/5 bg-zinc-950/30 backdrop-blur-xl p-4 lg:p-6 space-y-6 overflow-x-auto lg:overflow-y-auto flex lg:flex-col shrink-0">
          <div className="hidden lg:block">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-2">الأقسام الفاخرة</p>
          </div>
          <div className="flex lg:flex-col gap-2 w-full">
            {MALL_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat)}
                  className={clsx(
                    "flex items-center gap-4 p-4 rounded-2xl transition-all group relative overflow-hidden shrink-0 lg:w-full",
                    isActive ? "bg-white/10 text-white shadow-xl" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  )}
                >
                  {isActive && <motion.div layoutId="cat-active" className={clsx("absolute inset-0 bg-gradient-to-r opacity-10", cat.color)} />}
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isActive ? clsx("bg-gradient-to-br text-white shadow-lg", cat.color) : "bg-white/5 group-hover:bg-white/10"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm lg:text-base whitespace-nowrap">{cat.name}</span>
                  {isActive && <ChevronLeft className="hidden lg:block w-4 h-4 ms-auto" />}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block mt-auto pt-6 border-t border-white/5">
            <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all" />
              <TrendingUp className="w-8 h-8 text-blue-500 mb-4" />
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">الترقية القادمة</p>
              <p className="text-lg font-black text-white">عضوية VIP الماسية</p>
              <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-2/3 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Filter */}
          <div className="p-4 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج، علامة تجارية، أو قطعة نادرة..."
                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-4 px-12 font-bold focus:border-blue-500 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {isAdmin && (
                <>
                  <button 
                    onClick={() => setShowSetModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl border border-indigo-500/50 transition-all font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                  >
                    <Sparkles size={18} />
                    <span>استيراد طقم</span>
                  </button>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl border border-blue-500/50 transition-all font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                  >
                    <Plus size={18} />
                    <span>إضافة منتج</span>
                  </button>
                </>
              )}
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all font-bold">
                <Filter size={18} />
                <span>تصفية</span>
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            {personalizedDeal && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse" />
                <div className="relative bg-zinc-950 border border-yellow-500/30 rounded-[2.5rem] p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-12 overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Sparkles size={120} className="text-yellow-500" />
                  </div>
                  
                  <div className="w-full lg:w-1/2 h-64 lg:h-80 flex items-center justify-center relative rounded-3xl overflow-hidden bg-zinc-900">
                    <img 
                      src={personalizedDeal.image} 
                      alt={personalizedDeal.name}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-6 right-6">
                      <div className="px-4 py-2 bg-yellow-500 text-black font-black rounded-xl text-xs uppercase tracking-widest shadow-xl">عرض حصري</div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6 text-center lg:text-start">
                    <div className="space-y-2">
                      <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-200">
                        {personalizedDeal.name}
                      </h2>
                      <p className="text-zinc-400 text-lg font-medium leading-relaxed max-w-xl">
                        {personalizedDeal.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">القيمة الاستثمارية</span>
                        <span className="text-3xl font-black text-green-500">{formatMoney(personalizedDeal.cost)}</span>
                      </div>
                      <div className="w-px h-12 bg-white/10 hidden sm:block" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الجاه المكتسب</span>
                        <span className="text-3xl font-black text-yellow-500">+{personalizedDeal.prestige}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => buyProduct(personalizedDeal)}
                      className="w-full lg:w-fit bg-yellow-500 text-black px-12 py-5 rounded-2xl font-black text-lg hover:bg-yellow-400 transition-all shadow-2xl shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-3"
                    >
                      <CreditCard size={24} />
                      اقتناء الآن
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group bg-zinc-900/30 border border-white/5 rounded-[2rem] overflow-hidden hover:bg-zinc-900/50 hover:border-white/10 transition-all flex flex-col shadow-xl"
                  >
                    <div className="relative h-64 flex items-center justify-center bg-zinc-950/50 overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-yellow-500 flex items-center gap-1">
                        <Trophy size={10} />
                        +{product.prestige} جاه
                      </div>
                      {product.isExclusive && (
                        <div className="absolute top-12 right-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[10px] font-black rounded-full shadow-lg flex items-center gap-1 uppercase tracking-widest">
                          <Crown size={12} />
                          VIP
                        </div>
                      )}
                      {isAdmin && (
                        <div className="absolute top-4 left-4 flex gap-2">
                          {customProducts.find(cp => cp.id === product.id) && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleExclusive(product); }}
                              className={`p-2 backdrop-blur-md rounded-full text-white transition-colors ${product.isExclusive ? 'bg-yellow-500/80 hover:bg-yellow-500' : 'bg-zinc-500/80 hover:bg-zinc-500'}`}
                              title={product.isExclusive ? "إزالة من العروض الحصرية" : "تعيين كعرض حصري"}
                            >
                              <Star size={14} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditModal(product); }}
                            className="p-2 bg-blue-500/80 hover:bg-blue-500 backdrop-blur-md rounded-full text-white transition-colors"
                            title="تعديل"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setProductToDelete(product.id); }}
                            className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-colors"
                            title="حذف"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-black tracking-tight group-hover:text-blue-400 transition-colors">{product.name}</h3>
                        <span className="text-[10px] font-black text-zinc-600 uppercase">LVL {product.level}</span>
                      </div>
                      <p className="text-zinc-500 text-xs font-medium mb-6 line-clamp-2 leading-relaxed">{product.description}</p>
                      
                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">السعر</span>
                          <span className="text-lg font-black text-green-500">{formatMoney(product.cost)}</span>
                        </div>
                        {mallData.purchasedIds?.includes(product.id) ? (
                          <button 
                            disabled
                            className="bg-zinc-800 text-zinc-500 px-6 py-3 rounded-xl font-black text-sm cursor-not-allowed flex items-center gap-2"
                          >
                            <Check size={16} />
                            مملوك
                          </button>
                        ) : (
                          <button 
                            onClick={() => buyProduct(product)}
                            className="bg-white text-black px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                          >
                            <ShoppingCart size={16} />
                            شراء
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">{editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">اسم المنتج</label>
                  <input 
                    type="text" 
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                    placeholder="مثال: قميص أسود فاخر"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">رابط الصورة (Layer Image)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newProduct.image}
                      onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">يجب أن تكون الصورة بخلفية شفافة ومطابقة لقالب الشخصية (1024x2048)</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">القسم</label>
                  <select 
                    value={newProduct.categoryId}
                    onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                  >
                    {MALL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">مكان التركيب (Slot)</label>
                  <select 
                    value={newProduct.slotType}
                    onChange={e => setNewProduct({...newProduct, slotType: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="clothing">الملابس</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-400 mb-2">السعر</label>
                    <input 
                      type="number" 
                      value={newProduct.cost}
                      onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-400 mb-2">نقاط الجاه</label>
                    <input 
                      type="number" 
                      value={newProduct.prestige}
                      onChange={e => setNewProduct({...newProduct, prestige: Number(e.target.value)})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveProduct}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-4 transition-colors"
                >
                  {editingProductId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </div>
              <h2 className="text-xl font-black mb-2">تأكيد الحذف</h2>
              <p className="text-zinc-400 mb-6">هل أنت متأكد من رغبتك في حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  onClick={confirmDeleteProduct}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Set Importer Modal */}
      <AnimatePresence>
        {showSetModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-500">
                    <Sparkles size={24} />
                  </div>
                  <h2 className="text-2xl font-black">مستورد الأطقم الذكي</h2>
                </div>
                <button onClick={() => setShowSetModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">رابط صورة الطقم الكامل</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={setImageUrl}
                      onChange={e => setSetImageUrl(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none font-bold"
                      placeholder="أدخل رابط الصورة (1024x2048 شفافة)"
                    />
                    <button
                      onClick={handleAnalyzeSet}
                      disabled={isAnalyzingSet || !setImageUrl}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl transition-all font-bold flex items-center gap-2"
                    >
                      {isAnalyzingSet ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Search size={20} />
                      )}
                      تحليل الطقم
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">القسم (نسائي / رجالي)</label>
                  <select 
                    value={setCategoryId}
                    onChange={e => setSetCategoryId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none font-bold"
                  >
                    {MALL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {setAnalysisResults.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-zinc-400">القطع المكتشفة ({setAnalysisResults.length}):</p>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                      {setAnalysisResults.map((item, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                          <p className="font-black text-white text-sm">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold">{item.slotType}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleImportSet}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl mt-4 transition-all shadow-xl shadow-green-500/20"
                    >
                      تأكيد استيراد جميع القطع كمنتجات منفصلة
                    </button>
                  </div>
                )}

                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl">
                  <div className="flex gap-3">
                    <Info className="text-indigo-500 shrink-0" size={20} />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      سيقوم الذكاء الاصطناعي بتحليل الصورة وتحديد كل قطعة ملابس فيها. سيتم إنشاء منتج منفصل لكل قطعة باستخدام نفس الصورة كـ "Layer"، مما يسمح للاعبين بتجهيز القطع بشكل مستقل.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MallStat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
      <div className={clsx("p-2 rounded-xl bg-black/20", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <span className="block text-[8px] text-zinc-500 font-black uppercase tracking-widest">{label}</span>
        <span className={clsx("text-base font-black truncate block", color)}>{value}</span>
      </div>
    </div>
  );
}
