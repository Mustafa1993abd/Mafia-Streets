import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, Users, Car, Info, FlaskConical, Sword, CheckCircle2, Wrench, Smartphone, Shield, Zap, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';
import clsx from 'clsx';
import { MARKET_ITEMS } from '../lib/items';
import { MafiasSection } from '../components/MafiasSection';
import { WealthySection } from '../components/WealthySection';

interface Mission {
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
}

const MafiaStreets = () => {
  const { profile, updateActiveMission } = useAuthStore();
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [subSection, setSubSection] = useState<Mission['type'] | null>(null);
  const [localMissionText, setLocalMissionText] = useState<string>('');

  const activeMission = profile?.activeMission;

  const generateRandomWelcomeMessage = (level: number) => {
    let part1, part2, part3;
    if (level < 10) {
      part1 = ['أهلاً بالجديد،', 'هلا بيك،', 'نورت الشارع،', 'يا هلا،', 'مرحباً بيك،', 'هلا بالبطل،', 'يا هلا بالذيب،', 'نورتنا،', 'حي الله من جانا،', 'أهلاً وسهلاً،'];
      part2 = ['الساحة تحتاج إثبات وجود،', 'الطريق طويل بس الفلوس تسوى،', 'جاي تدور شغل؟', 'نشوف إذا تكدر تصمد،', 'الشوارع صعبة بالبداية،', 'الفرص هواي هنا،', 'السوق محتاج ناس مثلك،', 'الشغل متوفر للي يدور،', 'العيون عليك اليوم،', 'المافيا تدور وجوه جديدة،'];
      part3 = ['راوينا شطارتك.', 'ركز ولا تستعجل.', 'خليك ذكي وتنجح.', 'الفرص هواي استغلها.', 'اثبت جدارتك للكل.', 'لا تضيع وقتك.', 'العبها صح.', 'خليك حذر.', 'الشارع يعلمك.', 'نشوف مهاراتك.'];
    } else if (level < 20) {
      part1 = ['هلا بالبطل،', 'منور يا محترف،', 'يا هلا بالذيب،', 'حي الله السبع،', 'نورتنا،', 'يا هلا بالغالي،', 'مرحباً بالمحترف،', 'أهلاً بالكبير،', 'نورت الشارع يا بطل،', 'هلا باللي اسمه معروف،'];
      part2 = ['اسمك صار ينذكر بالشوارع،', 'الشغل الزين يجيب فلوس زينة،', 'الساحة ساحتتك اليوم،', 'شغلك صار معروف،', 'الكل ينتظر حركاتك،', 'السوق يطلبك بالاسم،', 'خبرتك مطلوبة هنا،', 'المافيا تحترم شغلك،', 'الطريق انفتح كدامك،', 'الكل يحسبلك حساب،'];
      part3 = ['استمر بالابداع.', 'لا توقف هسه.', 'راوينا مهاراتك.', 'القمة قريبة.', 'حافظ على مستواك.', 'الشغل النظيف يرفعك.', 'العبها بذكاء.', 'الفرص الكبيرة بانتظارك.', 'الشارع يحتاجك.', 'استغل خبرتك.'];
    } else {
      part1 = ['يا هلا بالزعيم،', 'نورت مملكتك،', 'الزعيم وصل،', 'يا أسطورة،', 'مرحباً بالكبير،', 'أهلاً بسيد الشارع،', 'يا هلا بالرقم واحد،', 'نورت يا كبير المافيا،', 'مرحباً بالأسطورة،', 'يا هلا باللي الكل يهابه،'];
      part2 = ['الشارع كله تحت أمرك،', 'الكل ينتظر أوامرك،', 'الشوارع توكف احترام الك،', 'محد يكدر ينافسك بعد،', 'الساحة كلها الك،', 'السوق كله يشتغل الك،', 'المافيا كلها تعرفك،', 'اسمك يهز الشوارع،', 'الكل يتمنى يشتغل وياك،', 'تاريخك يحجي عنك،'];
      part3 = ['أمر وتدلل.', 'الكلمة كلمتك.', 'محد يوصل لمستواك.', 'أنت الرقم واحد.', 'تاريخك يحجي عنك.', 'الساحة ساحتتك.', 'العبها براحتك.', 'الكل رهن اشارتك.', 'انت اللي تمشي الشارع.', 'القمة الك وبس.'];
    }
    return `${part1[Math.floor(Math.random() * part1.length)]} ${part2[Math.floor(Math.random() * part2.length)]} ${part3[Math.floor(Math.random() * part3.length)]}`;
  };

  const generateMissionOfferText = (itemName: string, level: number) => {
    let part1, part2, part3;
    if (level < 10) {
      part1 = ['اسمع يا جديد،', 'ركز وياي،', 'فرصتك تثبت نفسك،', 'عوف اللعب،', 'اذا تريد تصير غني،', 'يا بطل،', 'شوف يا غالي،', 'المافيا ما تنتظر،', 'شغلة سريعة الك،', 'اسمعني زين،'];
      part2 = [`محتاجين ${itemName} بسرعة،`, `اكو طلب على ${itemName}،`, `دبرلنا ${itemName}،`, `روح جيب ${itemName}،`, `السوق طالب ${itemName}،`, `عدنا نقص بـ ${itemName}،`, `اكو طلبية مستعجلة على ${itemName}،`, `جيبلي ${itemName}،`, `اريد اشوف شطارتك وتجيب ${itemName}،`, `الزبائن يريدون ${itemName}،`];
      part3 = ['راوينا شطارتك.', 'لا تضيع الفرصة.', 'خليك سريع وذكي.', 'نشوف تكدرلها لو لا.', 'اثبت جدارتك.', 'واطيك خوش مبلغ.', 'لا تتأخر علينا.', 'خليك ذيب وجيبها.', 'اريد اشوف افعالك.', 'يالله تحرك.'];
    } else if (level < 20) {
      part1 = ['يا بطل،', 'يا محترف،', 'شغلك معروف،', 'الساحة محتاجتك،', 'اسمعني زين،', 'يا غالي،', 'يا كبير،', 'المافيا تعتمد عليك،', 'شغلة تناسب خبرتك،', 'فرصة جديدة الك،'];
      part2 = [`عدنا طلبية ${itemName}،`, `الزبائن يريدون ${itemName}،`, `دبر ${itemName} كالعادة،`, `محتاجين خبرتك بـ ${itemName}،`, `السوق واكف على ${itemName}،`, `الطلب زاد على ${itemName}،`, `اريدك توفر ${itemName}،`, `جيب ${itemName} بسرعة،`, `محتاجين ${itemName} ضروري،`, `السوق يطلب ${itemName}،`];
      part3 = ['ونعرفك ما تقصر.', 'والفلوس جاهزة.', 'العبها صح كالعادة.', 'لا تخلي احد يسبقك.', 'وناطرين ابداعك.', 'المبلغ محرز.', 'شغلك دائماً نظيف.', 'الكل يثق بيك.', 'لا تتأخر يا بطل.', 'راوينا مهاراتك.'];
    } else {
      part1 = ['يا زعيم،', 'يا أسطورة،', 'الكل ينتظر أوامرك،', 'يا كبير الشارع،', 'الساحة ساحتتك،', 'سيد المافيا،', 'يا رقم واحد،', 'الكل يحسبلك حساب،', 'يا كبيرنا،', 'أمر يا زعيم،'];
      part2 = [`طلبوا من عندنا ${itemName}،`, `محد يكدر يجيب ${itemName} غيرك،`, `الكل يعتمد عليك بـ ${itemName}،`, `السوق يطلب ${itemName} من ايدك،`, `محتاجين لمستك بـ ${itemName}،`, `الزعماء يريدون ${itemName}،`, `السوق كله ينتظر ${itemName} منك،`, `اكو طلب خاص على ${itemName}،`, `وفرلنا ${itemName} يا كبير،`, `محتاجين ${itemName} بأسرع وقت،`];
      part3 = ['والسعر اللي يعجبك.', 'الكلمة كلمتك.', 'محد ينافسك بيها.', 'الكل يعرف انك الأفضل.', 'أمر وتدلل.', 'الساحة الك.', 'الفلوس مو مشكلة.', 'الكل رهن اشارتك.', 'تاريخك يشهدلك.', 'أنت اللي تمشي السوق.'];
    }
    return `${part1[Math.floor(Math.random() * part1.length)]} ${part2[Math.floor(Math.random() * part2.length)]} ${part3[Math.floor(Math.random() * part3.length)]}`;
  };

  const generateMissionAcceptText = (itemName: string, level: number) => {
    let part1, part2, part3;
    if (level < 10) {
      part1 = ['يالله توكل،', 'حلو،', 'زين سويت،', 'اختيار موفق،', 'بطل،', 'عفية عليك،', 'خوش اختيار،', 'اي هيج اريدك،', 'تحرك بسرعة،', 'العداد كاعد يحسب،'];
      part2 = [`روح جيب ${itemName}،`, `دبر ${itemName}،`, `ننتظر ${itemName}،`, `ركز على ${itemName}،`, `خلص شغل ${itemName}،`, `طير جيبلي ${itemName}،`, `اريد ${itemName} تصير بيدي،`, `جيب ${itemName} وتعال،`, `اريد اسمع خبر حلو عن ${itemName}،`, `خلص شغلك وي ${itemName}،`];
      part3 = ['وناطرين نشوف مهاراتك.', 'ولا تتأخر علينا.', 'راوينا شطارتك.', 'خليك سريع.', 'اثبت نفسك.', 'ولا ترجع وايدك فارغة.', 'خليك حذر.', 'العبها صح.', 'يالله طير.', 'نشوف شطارتك.'];
    } else if (level < 20) {
      part1 = ['عفية عليك،', 'اختيار ذكي،', 'اي هيج اريدك،', 'بطل كالعادة،', 'ممتاز،', 'يا محترف،', 'شغل معلمين،', 'زين سويت،', 'اختيار موفق،', 'بطل الشوارع،'];
      part2 = [`جيب ${itemName} وتعال،`, `ناطرين ${itemName} بفارغ الصبر،`, `روح خلص موضوع ${itemName}،`, `العبها صح وجيب ${itemName}،`, `دبر ${itemName} بسرعة،`, `وفر ${itemName} للسوق،`, `ننتظر ${itemName} منك،`, `خلص شغل ${itemName}،`, `جيب ${itemName} كالعادة،`, `اريد ${itemName} جاهزة،`];
      part3 = ['الشغل وياك مريح.', 'ونعرفك ما تقصر.', 'الساحة تنتظرك.', 'لا تخلي احد يسبقك.', 'وناطرين ابداعك.', 'شغلك دائماً نظيف.', 'الكل يثق بيك.', 'استمر بالابداع.', 'مكافأتك جاهزة.', 'راوينا مهاراتك.'];
    } else {
      part1 = ['أكيد راح تنجح،', 'كلمتك سيف،', 'يا زعيم،', 'اختيار المعلم،', 'أسطورة،', 'يا كبير،', 'سيد الساحة،', 'يا رقم واحد،', 'أمر وتدلل،', 'يا كبير المافيا،'];
      part2 = [`راح تجيب ${itemName} بلمح البصر،`, `روح جيب ${itemName} والكل بانتظارك،`, `موضوع ${itemName} صار منتهي،`, `تكدر تجيب ${itemName} بسهولة،`, `الكل يعتمد عليك بـ ${itemName}،`, `السوق ينتظر ${itemName} منك،`, `وفر ${itemName} يا زعيم،`, `خلص موضوع ${itemName}،`, `ننتظر ${itemName} من ايدك،`, `جيب ${itemName} والساحة الك،`];
      part3 = ['ناطريك يا كبير.', 'الكلمة كلمتك.', 'محد ينافسك.', 'أنت الأفضل.', 'الساحة الك.', 'تاريخك يشهدلك.', 'الفلوس مو مشكلة.', 'الكل رهن اشارتك.', 'أمر وتدلل.', 'أنت اللي تمشي السوق.'];
    }
    return `${part1[Math.floor(Math.random() * part1.length)]} ${part2[Math.floor(Math.random() * part2.length)]} ${part3[Math.floor(Math.random() * part3.length)]}`;
  };

  const generateMissionCompleteText = (reward: number, reputation: number | undefined, level: number) => {
    let part1, part2, part3;
    if (level < 10) {
      part1 = ['عاش ايدك،', 'بداية موفقة،', 'شغل حلو،', 'بطل،', 'زين سويت،', 'والله وطلعت كدها،', 'شغل نظيف،', 'بطل الشوارع،', 'كفو منك،', 'شغل مرتب،'];
      part2 = [`هاي ${reward.toLocaleString()} دولار،`, `استلم ${reward.toLocaleString()} دولار،`, `نصيبك ${reward.toLocaleString()} دولار،`, `تفضل ${reward.toLocaleString()} دولار،`, `مكافأتك ${reward.toLocaleString()} دولار،`, `اخذ ${reward.toLocaleString()} دولار،`, `حسبتلك ${reward.toLocaleString()} دولار،`, `هاي فلوسك ${reward.toLocaleString()} دولار،`, `استلم مكافأتك ${reward.toLocaleString()} دولار،`, `نصيبك محفوظ ${reward.toLocaleString()} دولار،`];
      part3 = ['استمر.', 'الجاي أفضل.', 'تستاهل.', 'بطل الشوارع القادم.', 'طور من نفسك.', 'روح اشتري بيها شي يفيدك.', 'ارتاح هسه.', 'ضمها لليوم الاسود.', 'استعد للمهمة الجاية.', 'اثبتت جدارتك.'];
    } else if (level < 20) {
      part1 = ['بطل مثل ما تعودنا،', 'شغل نظيف ومرتب،', 'كفو منك،', 'وحش،', 'عمل احترافي،', 'يا محترف،', 'شغل معلمين،', 'ما خيبت ظني بيك،', 'إبداع متواصل،', 'بطل الساحة،'];
      part2 = [`مكافأتك ${reward.toLocaleString()} دولار حلال عليك،`, `هاي ${reward.toLocaleString()} دولار تستاهلها،`, `استلم ${reward.toLocaleString()} دولار عن جدارة،`, `نصيبك ${reward.toLocaleString()} دولار،`, `تفضل ${reward.toLocaleString()} دولار،`, `هاي فلوسك ${reward.toLocaleString()} دولار،`, `استلم مكافأتك ${reward.toLocaleString()} دولار،`, `نصيبك محفوظ ${reward.toLocaleString()} دولار،`, `اخذ ${reward.toLocaleString()} دولار،`, `حسبتلك ${reward.toLocaleString()} دولار،`];
      part3 = ['استمر بالابداع.', 'الساحة فخورة بيك.', 'شغلك دائماً مميز.', 'لا توقف هسه.', 'حافظ على مستواك.', 'روح احتفل.', 'استعد للشغل الاثكل.', 'الكل يثق بيك.', 'مكافأتك جاهزة.', 'راوينا مهاراتك.'];
    } else {
      part1 = ['أسطورة الشوارع،', 'ما خيبت ظننا يا زعيم،', 'شغل معلمين،', 'يا كبير،', 'إبداع متواصل،', 'يا رقم واحد،', 'سيد الساحة،', 'يا كبير المافيا،', 'أمر وتدلل،', 'يا أسطورة،'];
      part2 = [`${reward.toLocaleString()} دولار مبلغ بسيط بحقك،`, `استلم ${reward.toLocaleString()} دولار والكلمة كلمتك،`, `هاي ${reward.toLocaleString()} دولار لعيونك،`, `مكافأتك ${reward.toLocaleString()} دولار يا أسطورة،`, `نصيبك ${reward.toLocaleString()} دولار يا زعيم،`, `هاي فلوسك ${reward.toLocaleString()} دولار،`, `استلم مكافأتك ${reward.toLocaleString()} دولار،`, `نصيبك محفوظ ${reward.toLocaleString()} دولار،`, `اخذ ${reward.toLocaleString()} دولار،`, `حسبتلك ${reward.toLocaleString()} دولار،`];
      part3 = ['الساحة كلها الك.', 'محد يوصل لمستواك.', 'أنت الرقم واحد.', 'تاريخك يحجي عنك.', 'أمر وتدلل.', 'الكلمة كلمتك.', 'محد ينافسك.', 'أنت الأفضل.', 'الكل رهن اشارتك.', 'أنت اللي تمشي السوق.'];
    }
    
    let text = `${part1[Math.floor(Math.random() * part1.length)]} ${part2[Math.floor(Math.random() * part2.length)]} ${part3[Math.floor(Math.random() * part3.length)]}`;
    if (reputation) {
      text += ` وحصلت على ${reputation} نقطة خبرة!`;
    }
    return text;
  };

  const generateMissionMissingItemText = (level: number) => {
    let part1, part2, part3;
    if (level < 10) {
      part1 = ['وين الغرض؟', 'الظاهر نسيت تجيبه،', 'المخزن فارغ،', 'وين البضاعة؟', 'شنو السالفة؟', 'جاي وايدك فارغة؟', 'وين الشغل؟', 'المخزن ما بيه شي،', 'نسيت الغرض؟', 'تأكدت من المخزن؟'];
      part2 = ['روح دبره وتعال،', 'ركز شوية وروح جيبه،', 'ارجع جيبه بسرعة،', 'تأكد من مخزنك،', 'لا تستعجل وروح جيبه،', 'روح جيبه وتعال،', 'ارجع منين ما اجيت،', 'دبره بسرعة،', 'طير جيبه،', 'روح دور عليه،'];
      part3 = ['بعدك جديد وتنسى؟', 'شلون تريد تصير غني وانت مخزنك فارغ؟', 'التركيز مطلوب.', 'الفرصة بعدها موجودة.', 'ننتظرك.', 'المافيا ما ترحم.', 'المره الجاية ركز.', 'لا تضيع وقتنا.', 'ننتظر البضاعة.', 'تأكد قبل لا تجي.'];
    } else if (level < 20) {
      part1 = ['غريبة منك تنسى الغرض،', 'وين البضاعة يا بطل؟', 'المخزن ما بيه الغرض،', 'نسيت البضاعة؟', 'تأكدت من المخزن؟', 'يا محترف وين الغرض؟', 'شنو القصة يا بطل؟', 'المخزن فارغ يا غالي،', 'وين الشغل يا محترف؟', 'نسيت البضاعة يا بطل؟'];
      part2 = ['تأكد من مخزنك وارجع،', 'روح جيبها لا تضيع وقتنا،', 'ارجع جيب الغرض،', 'دبر البضاعة وتعال،', 'نحتاج الغرض بسرعة،', 'تأكد من مخزنك،', 'روح جيب البضاعة،', 'ننتظر الغرض منك،', 'راجع مخزنك،', 'جيب البضاعة وتعال،'];
      part3 = ['معقولة المحترف ينسى البضاعة؟', 'الفلوس ما تجي للنايمين.', 'شغلك نظيف بس ركز.', 'الساحة ما ترحم الغلط.', 'ناطرينك.', 'التركيز مطلوب يا بطل.', 'لا تضيع وقتك.', 'ننتظر ابداعك.', 'تأكد قبل لا تجي.', 'الفرصة بعدها موجودة.'];
    } else {
      part1 = ['يا زعيم، الغرض مو موجود،', 'الظاهر نسيت تجيب البضاعة يا أسطورة،', 'المخزن فارغ يا كبير،', 'وين الغرض يا معلم؟', 'أكو خطأ بسيط بالمخزن،', 'يا أسطورة وين البضاعة؟', 'يا كبير المخزن فارغ،', 'شنو السالفة يا زعيم؟', 'نسيت الغرض يا كبير؟', 'تأكدت من المخزن يا أسطورة؟'];
      part2 = ['أكيد اكو خطأ بسيط، تأكد منه،', 'ناطريك ترجع بيها،', 'راجع مخزنك يا زعيم،', 'ننتظر البضاعة من ايدك،', 'تأكد من الأغراض،', 'تأكد من مخزنك يا كبير،', 'ننتظر الغرض منك يا أسطورة،', 'راجع مخزنك يا معلم،', 'جيب البضاعة يا زعيم،', 'نحتاج الغرض يا كبير،'];
      part3 = ['حتى الزعيم ينسى مرات؟', 'الظاهر الفلوس الكثيرة نستك الشغل.', 'الساحة تعذرك يا كبير.', 'محد يحاسبك بس نحتاج الغرض.', 'أمر وتدلل ننتظرك.', 'تاريخك يشفعلك.', 'الكل يغلط يا زعيم.', 'ننتظر البضاعة.', 'الساحة الك.', 'أنت الأفضل.'];
    }
    return `${part1[Math.floor(Math.random() * part1.length)]} ${part2[Math.floor(Math.random() * part2.length)]} ${part3[Math.floor(Math.random() * part3.length)]}`;
  };

  useEffect(() => {
    if (!activeMission && !localMissionText && profile) {
      setLocalMissionText(generateRandomWelcomeMessage(profile.level));
    }
  }, [activeMission, localMissionText, profile]);

  useEffect(() => {
    if (activeMission && activeMission.status === 'accepted') {
      if (activeMission.characterId || activeMission.type === 'kill') {
        setActiveButton(3); // Wealthy Section
      } else {
        setActiveButton(1); // Streets Section
        setSubSection(activeMission.type);
      }
    }
  }, [activeMission]);

  const missionText = activeMission?.missionText || localMissionText;

  const mainButtons = [
    {
      id: 1,
      title: 'الشوارع',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=400',
      icon: MapIcon,
    },
    {
      id: 2,
      title: 'المافيات',
      image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=400',
      icon: Users,
    },
    {
      id: 3,
      title: 'الاغنياء',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400',
      icon: Car,
    },
  ];

  const getSubButtons = () => {
    if (activeButton === 1) {
      return [
        { id: 'weapons', title: 'الاسلحة', icon: Sword },
        { id: 'drugs', title: 'السموم', icon: FlaskConical },
        { id: 'cars', title: 'السيارات', icon: Car },
        { id: 'phones', title: 'الهواتف', icon: Smartphone },
        { id: 'tools', title: 'ادوات السطو', icon: Wrench },
        { id: 'armor', title: 'الدروع', icon: Shield },
        { id: 'supplements', title: 'المكملات', icon: Zap },
      ];
    }
    return [];
  };

  const subButtons = getSubButtons();

  const generateMission = async (type: Mission['type']) => {
    const level = profile?.level || 1;
    let randomItem;
    let reward = 0;
    let reputation = 0;

    const categoryItems = MARKET_ITEMS[type as keyof typeof MARKET_ITEMS];
    if (!categoryItems || categoryItems.length === 0) return;

    randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
    
    const originalPrice = randomItem.price;
    const profitPercentage = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
    reward = Math.floor(originalPrice * (1 + profitPercentage / 100));
    reputation = Math.floor(Math.random() * (300 - 100 + 1)) + 100;
    
    const text = generateMissionOfferText(randomItem.name, level);

    const mission: Mission & { missionText: string } = {
      type,
      targetId: randomItem.id,
      targetName: randomItem.name,
      reward,
      reputation,
      status: 'pending',
      missionText: text,
    };

    await updateActiveMission(mission);
  };

  const handleSubButtonClick = (type: Mission['type']) => {
    if (activeMission && activeMission.status === 'accepted') {
      if (activeMission.type !== type) {
        const text = `خلص شغلك الاول على ${activeMission.targetName} وبعدين تعال دور غيره!`;
        setLocalMissionText(text);
        toast.error('عندك مهمة فعالة حالياً!');
      }
      return;
    }
    setSubSection(type);
    generateMission(type);
  };

  // Ensure subSection matches active accepted mission
  useEffect(() => {
    if (activeMission?.status === 'accepted' && subSection !== activeMission.type) {
      setSubSection(activeMission.type);
    }
  }, [activeMission, subSection]);

  const acceptMission = async () => {
    if (!activeMission || !profile) return;
    const text = generateMissionAcceptText(activeMission.targetName, profile.level);
    await updateActiveMission({ ...activeMission, status: 'accepted', missionText: text });
  };

  const deliverMission = async () => {
    if (!activeMission || !profile) return;

    const inventory = profile.inventory || {};
    const categoryItems = inventory[activeMission.type as keyof typeof inventory] as Record<string, number> || {};
    const count = categoryItems[activeMission.targetId] || 0;

    if (count <= 0) {
      const text = generateMissionMissingItemText(profile.level);
      await updateActiveMission({ ...activeMission, missionText: text });
      toast.error('ما عندك الغرض المطلوب بمخزنك!');
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.uid);
      const updates: any = {
        [`inventory.${activeMission.type}.${activeMission.targetId}`]: increment(-1),
        cleanMoney: increment(activeMission.reward),
      };

      if (activeMission.reputation) {
        updates.reputation = increment(activeMission.reputation);
      }

      await updateDoc(userRef, updates);

      const successText = generateMissionCompleteText(activeMission.reward, activeMission.reputation, profile.level);
      await updateActiveMission({ ...activeMission, status: 'completed', missionText: successText });
      toast.success('تم تسليم المهمة بنجاح!');
      
      setTimeout(async () => {
        await updateActiveMission(null);
        setSubSection(null);
        setLocalMissionText(generateRandomWelcomeMessage(profile.level));
      }, 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('فشل في تسليم المهمة');
    }
  };

  const characterImage = activeButton === 1 
    ? "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDEwOTM4NjMwODE5MWI1NWZlN2Y1MDVmOTIxNTk6ZmlsZV8wMDAwMDAwMDdmNjg3MjQ2YjFjMjcwMzBiNmY0NjFiYyIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjE4N2M4ZTQwZDljZTc5NTNjY2MwODRhZDZlMWIzNWMxNGFjM2JlMjQ1MDNhYWM4ZDM5MTZkYmI1NWU5NjE3ZjAiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9"
    : "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDBkYTlkNTA0ODE5MWJkOWE4NjY4YWQxZDg4YzI6ZmlsZV8wMDAwMDAwMDhiMTQ3MjQ2ODUxYWZiZmZhMmE2MDY3ZiIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjM5MjIyOGRiN2MzOTQ0ZTY3YTJmMjc1M2RmZDgwNTUxODk0YWI5NzQ5Y2NjNGJjMGY4NTI5M2M5MDg4YTkwYmEiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9";

  return (
    <div className="relative min-h-[calc(100vh-120px)] w-full overflow-hidden bg-black font-sans" dir="rtl">
      <div className="absolute inset-0 z-0">
        <img
          src={activeButton === 2 ? "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDFmNjA2ODY4ODE5MThjMWYyMTFlNzU4YzI3N2U6ZmlsZV8wMDAwMDAwMDNjYjg3MjQzOGM1MjE2NTllY2NiNjI0MSIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjM4NzY2YmViZjZhZTM3Njg1YWU1YTA2NWI1MzBjYjFhNGUwMDNmODk5ZWQwMTI3MWM1MmFkZjYzNWU2MWIwM2QiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9" : "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDFlOWE4ZGQ0ODE5MWJiYzcwNTIwMDdiYTExNzQ6ZmlsZV8wMDAwMDAwMDZlNjA3MjQ2YmMxODY3YzliMGQwYjJiZCIsInRzIjoiMjA1NDYiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjM1OGYzZDU0OThkYjY5OGU3ZWU5MDFkMDAyZGM1NDhjMjM0MGQ3MzNiNmI3MzhjNTM0MjI3MzU2MGY2ZDBkZGEiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9"}
          className={clsx(
            "h-full w-full object-cover contrast-125 transition-all duration-1000",
            activeButton === 2 ? "opacity-80 brightness-100" : "opacity-40 brightness-75"
          )}
          alt="Mafia Streets Background"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
      </div>

      <AnimatePresence>
        {activeButton === 2 && (
          <MafiasSection onBack={() => setActiveButton(null)} />
        )}
        {activeButton === 3 && (
          <WealthySection onBack={() => setActiveButton(null)} />
        )}
      </AnimatePresence>

      <div className={clsx("relative z-10 flex h-full min-h-full flex-col lg:flex-row items-center lg:items-start lg:justify-center pt-[10vh] px-4 gap-8 lg:gap-16", (activeButton === 2 || activeButton === 3) && "hidden")}>
        <div className="flex flex-row flex-wrap lg:flex-col justify-center gap-4 order-2 lg:order-1">
          <AnimatePresence mode="wait">
            {activeButton === 1 ? (
              <motion.div
                key="sub-buttons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-row flex-wrap lg:flex-col justify-center gap-4"
              >
                {subButtons.map((btn) => (
                  <motion.button
                    key={btn.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSubButtonClick(btn.id as any)}
                    className={clsx(
                      "group relative h-20 w-20 overflow-hidden rounded-xl border-2 transition-all duration-500 lg:h-24 lg:w-24",
                      subSection === btn.id
                        ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                        : "border-black/40 shadow-[0_0_10px_rgba(0,0,0,0.3)]",
                      activeMission?.status === 'accepted' && activeMission.type !== btn.id && "opacity-50 grayscale"
                    )}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative flex h-full flex-col items-center justify-center gap-1 p-2">
                      <btn.icon className={clsx(
                        "h-6 w-6 transition-colors",
                        subSection === btn.id ? "text-yellow-500" : "text-zinc-400"
                      )} />
                      <span className={clsx(
                        "text-[10px] font-bold lg:text-xs",
                        subSection === btn.id ? "text-yellow-500" : "text-zinc-400"
                      )}>
                        {btn.title}
                      </span>
                    </div>
                  </motion.button>
                ))}
                
                {activeMission?.status === 'accepted' && (
                  <div className="flex flex-col gap-2 mt-4">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={deliverMission}
                      className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      تسليم
                    </motion.button>
                    
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={async () => {
                        await updateActiveMission(null);
                        setSubSection(null);
                        if (profile) {
                          setLocalMissionText(generateRandomWelcomeMessage(profile.level));
                        }
                        toast.info('تم إلغاء المهمة.');
                      }}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-2 rounded-xl border border-white/5 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs"
                    >
                      <X className="w-4 h-4" />
                      إلغاء المهمة
                    </motion.button>
                  </div>
                )}

                <button 
                  onClick={() => { 
                    setActiveButton(null); 
                    setSubSection(null); 
                    if (activeMission?.status !== 'accepted') {
                      updateActiveMission(null);
                      if (profile) {
                        setLocalMissionText(generateRandomWelcomeMessage(profile.level));
                      }
                    }
                  }}
                  className="mt-2 text-xs text-zinc-500 hover:text-white underline"
                >
                  رجوع للقائمة الرئيسية
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="main-buttons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-row flex-wrap lg:flex-col justify-center gap-6"
              >
                {mainButtons.map((btn) => (
                  <motion.button
                    key={btn.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setActiveButton(btn.id);
                      if (btn.id === 1 && profile) {
                        const text = generateRandomWelcomeMessage(profile.level);
                        setLocalMissionText(text);
                      }
                    }}
                    className={clsx(
                      "group relative h-24 w-24 overflow-hidden rounded-xl border-2 transition-all duration-500 lg:h-32 lg:w-32",
                      activeButton === btn.id
                        ? "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.6)]"
                        : "border-black/40 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                    )}
                  >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity group-hover:bg-black/40" />
                    <img
                      src={btn.image}
                      className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60 transition-transform duration-700 group-hover:scale-110"
                      alt={btn.title}
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative flex h-full flex-col items-center justify-center gap-2 p-2">
                      <btn.icon className={clsx(
                        "h-8 w-8 transition-colors duration-300 lg:h-10 lg:w-10",
                        activeButton === btn.id ? "text-yellow-500" : "text-zinc-400 group-hover:text-white"
                      )} />
                      <span className={clsx(
                        "text-xs font-bold lg:text-sm",
                        activeButton === btn.id ? "text-yellow-500" : "text-zinc-400 group-hover:text-white"
                      )}>
                        {btn.title}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center order-1 lg:order-2">
          {/* Mafia Character */}
          <div className="relative h-[350px] w-[200px] lg:h-[450px] lg:w-[280px] z-10">
            <div className="absolute inset-0 z-0">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute bottom-1/4 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
                  animate={{
                    y: [-20, -100],
                    x: [-20, 20],
                    scale: [1, 2],
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{
                    duration: 4 + i,
                    repeat: Infinity,
                    delay: i * 0.8,
                  }}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={characterImage}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 h-full w-full"
              >
                <motion.img
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  src={characterImage}
                  className="h-full w-full object-contain [mask-image:linear-gradient(to_bottom,black_95%,transparent_100%)]"
                  alt="Mafia Character"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sarcastic Text (Speech Bubble) - Floating below with overlap */}
          <div className="relative max-w-md w-full -mt-20 z-20">
            <motion.div
              key={missionText}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="relative p-6 rounded-3xl w-fit mx-auto"
            >
              <div className="space-y-3 text-center min-w-[200px] h-auto">
                <p className="text-sm font-black leading-relaxed text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] lg:text-base" style={{ fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' }}>
                  {missionText}
                </p>
                
                {activeMission?.status === 'completed' && (
                  <p className="text-2xl font-black text-green-500 animate-pulse drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    +${activeMission.reward.toLocaleString()}
                  </p>
                )}

                {activeMission?.status === 'pending' && (
                  <button
                    onClick={acceptMission}
                    className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors active:scale-95"
                  >
                    قبول المهمة
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MafiaStreets;

