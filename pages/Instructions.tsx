import React, { useEffect, useState } from 'react';
import { useI18n } from '../src/contexts/LanguageContext';
import { subscribeToSettings, subscribeToEvents } from '../services/sheetService';
import { GlobalSettings, EventData, BillingEngineConfig } from '../types';
import { ArrowLeft, BookOpen, AlertCircle, CalendarCheck, Shirt, Bus, CreditCard, Info, Home, MapPin, Train, FileText, List, ArrowRight, Book, MessageSquare, Target, Users, ClipboardCheck, Clock, UserCheck, Calendar, Edit, ExternalLink, ShieldCheck } from 'lucide-react';
import { CalculatorOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { FeeExplanationSection } from '../components/stake/fee-config/FeeExplanationSection';
import { FeeCalculationModal } from '../components/stake/fee-config/FeeCalculationModal';
import { Modal, Button } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import MarkdownDocViewer from '../src/components/MarkdownDocViewer';

type TabType = 'eventRules' | 'general' | 'housing' | 'driving' | 'transit' | 'handbook' | 'privacy' | 'terms';

interface InstructionsProps {
    onBack: () => void;
    onGoRegister?: () => void;
    onGoFeedback?: () => void;
    activeTab?: TabType;
    onTabChange?: (tab: TabType) => void;
}

// Standardized Section Header: text-lg on mobile, text-xl on desktop
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
    <div className="flex items-center border-b-2 border-amber-200 pb-2 mb-4 mt-8 first:mt-0">
        <div className="bg-gradient-to-r from-amber-200 to-yellow-400 p-2 rounded mr-3 shadow-sm">
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-slate-900" />
        </div>
        <h2 className="text-lg md:text-xl font-bold text-slate-800">{title}</h2>
    </div>
);

// Standardized Body Text: text-sm on mobile, text-base on desktop
const BulletPoint = ({ children }: React.PropsWithChildren<{}>) => (
    <li className="flex items-start mb-2 text-gray-700 leading-relaxed text-sm md:text-base">
        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 md:mt-2.5 mr-3 shrink-0"></div>
        <div className="flex-1">{children}</div>
    </li>
);

// Handbook Data
const getHandbookSections = (t: any, tString: any) => {
    const sections = [
        {
            title: t('stake.instructions.handbook_data.section14_2_1_3.title', "14.2.1.3 活動"),
            content: tString('stake.instructions.handbook_data.section14_2_1_3.content', "在支會或支聯會領袖的指導下，年輕單身成人可以策劃與參與特別為他們舉辦的活動。這些活動可以在支會或支聯會層級舉辦。範例可包括：聖殿旅行團，家譜事工。")
        },
        {
            title: t('stake.instructions.handbook_data.section20_2_6.title', "20.2.6 活動的經費來源"),
            content: tString('stake.instructions.handbook_data.section20_2_6.content', "大部分的活動應當簡單且花費少或沒有花費。任何支出都必須事先獲得主教團或支聯會會長團的核准。\n成員參加活動通常不應付費。有關活動經費來源的政策和指導方針，見20.6。")
        },
        {
            title: t('stake.instructions.handbook_data.section20_5_7.title', "20.5.7 活動中的祈禱和祈禱會"),
            content: tString('stake.instructions.handbook_data.section20_5_7.content', "所有的活動都應該以祈禱開始，適當的話，也以祈禱結束。可以包括一首聖詩、一個靈修，或一位領袖或參與者的演講。")
        },
        {
            title: t('stake.instructions.handbook_data.section20_6_1.title', "20.6.1 以支會或支聯會經費支付的活動"),
            content: tString('stake.instructions.handbook_data.section20_6_1.content', "支會或支聯會的經費應當用來支付所有的活動，可能的例外情形列於20.6.2。\n成員不應自付材料、用品、租金或入場費，或是長途交通費。在不會造成負擔的情況下，成員可以提供食物。")
        },
        {
            title: t('stake.instructions.handbook_data.section20_7_4.title', "20.7.4 父母同意"),
            content: tString('stake.instructions.handbook_data.section20_7_4.content', "未經父母或監護人許可，兒童和青少年不得參加教會活動。若教會活動需要過夜、長途旅行，或有高於一般的風險，則必須取得書面同意。有些活動可能需要更多的規劃以降低風險。安全始終都應該是重要的考量因素，見20.7.6.1。\n父母或監護人要簽署同意書及醫療授權書，以表示同意。帶領活動的人應取得每位參與者所提供的簽名同意書。")
        },
        {
            title: t('stake.instructions.handbook_data.section25_1.title', "25.1 成員和領袖參與聖殿和家譜事工"),
            content: tString('stake.instructions.handbook_data.section25_1.content', "教會成員有此特權和責任，要協助使自己的家人永遠結合在一起。他們要作好準備，在接受聖殿教儀時訂立聖約，並且努力遵守所立的聖約。\n教會成員受到鼓勵，要找出尚未接受聖殿教儀的已逝親人，然後代替這些親人執行教儀（見教義和聖約128：18）。已逝者在靈的世界中，可以選擇接受或拒絕為他們執行的教儀。")
        },
        {
            title: t('stake.instructions.handbook_data.section25_1_1.title', "25.1.1 聖殿出席的個人責任"),
            content: tString('stake.instructions.handbook_data.section25_1_1.content', "成員要自行決定去聖殿崇拜的時間和頻率。領袖不可為成員的聖殿出席情況設定配額或回報機制。")
        },
        {
            title: t('stake.instructions.handbook_data.section25_1_2.title', "25.1.2 支會和支聯會聖殿旅行團"),
            content: tString('stake.instructions.handbook_data.section25_1_2.content', "教會的每個單位都有指定的聖殿地區。教會不鼓勵支會或支聯會規劃在指定的聖殿地區以外進行聖殿旅行團。\n所有支會和支聯會的聖殿旅行團都應與聖殿預約教儀時間。每座聖殿的聯絡資訊，見temples.ChurchofJesusChrist.org")
        },
        {
            title: t('stake.instructions.handbook_data.section25_5.title', "25.5 推薦和召喚聖殿工作人員"),
            content: tString('stake.instructions.handbook_data.section25_5.content', "聖殿工作人員協助執行教儀，或支援聖殿的運作，例如在辦公室、洗衣房、與會者住宿或庭院維護等方面的服務。被召喚擔任聖殿工作人員的成員，是擔任不支薪的義工。\n\n25.5.1 推薦聖殿工作人員\n以下方法能找出有潛力擔任聖殿工作人員的人：\n主教或支會其他領袖找出的成員\n找主教表明願意服務的成員\n由聖殿會長、女監護或聖殿其他領袖推薦的成員\n準備去傳教或剛結束傳教返鄉的成員（見第24章）\n有潛力擔任聖殿工作人員者的姓名，要用「推薦聖殿工作人員」工具來提交。主教、支聯會會長和聖殿會長團都可以使用此項工具。提交姓名的流程概述如下。\n當聖殿會長團成員發現一位有潛力擔任聖殿工作人員的人，他們要用「推薦聖殿工作人員」工具，將此人的姓名提交給主教。\n當主教發現一位有潛力擔任聖殿工作人員的人，或從聖殿會長那裡收到推薦資料時，就要與該成員討論這個服務機會。他要審閱擔任聖殿工作人員的條件（見25.5.2）。如果主教和該成員都覺得這是個適合的機會，主教就要用「推薦聖殿工作人員」工具，填妥並提交推薦資料。該成員應當要了解，將推薦資料提交出去，並不保證會被召喚或被指派擔任聖殿工作人員。\n接下來，由支聯會會長審閱推薦資料。如果支聯會會長核准此項推薦，就要用「推薦聖殿工作人員」工具，將推薦資料提交給聖殿會長審閱。\n被召喚擔任聖殿工作人員的成員，通常會承諾每週於固定時間在聖殿裡服務。領袖應避免發出會妨礙成員到聖殿服務的其他召喚。\n「推薦聖殿工作人員」工具也會讓主教和支聯會會長看到一份清單，上面列出他們的支會或支聯會中，目前擔任聖殿工作人員的所有成員。\n\n25.5.2 擔任聖殿工作人員的條件\n成員若要被推薦擔任聖殿工作人員，必須符合以下資格：\n居住在即將服務的聖殿之聖殿地區內。\n接受過恩道門，遵行聖殿聖約，並持有有效的聖殿推薦書。\n對耶穌基督的復興福音有堅強的見證。\n體能上可以在聖殿中執行受指派的工作. 為與會者服務或主理教儀的工作人員，必須在體能上可以勝任而無需協助。\n在教會和社區值得受人敬重。\n與人合作融洽。\n可靠、健康。\n其教籍紀錄目前沒有附註。\n此外，主教應確保下列事項：\n如果一個人的教會成員身分受到正式限制，在這些限制被移除至少五年後，此人才可被推薦擔任聖殿工作人員。（見32.11.3和32.16.1。）\n如果未接受恩道門之人的教會成員身分被取消，或是此人放棄成員身分，他／她要在重新加入教會至少五年後，才可被推薦擔任聖殿工作人員。（見32.11.4、32.14.9、32.16.1和32.16.2。）\n如果接受過恩道門之人的教會成員身分被取消，或是此人放棄成員身分，他／她要在接受恢復祝福至少五年後，才可被推薦擔任聖殿工作人員。（見32.11.4、32.14.9和32.17.2。）\n\n25.5.3 召喚和按手選派聖殿工作人員\n聖殿會長收到推薦某人擔任聖殿工作人員的推薦資料後，由聖殿會長團的一員或他指定的一人與此人面談。主持面談的人受到聖靈啟發時，就要召喚那些能夠服務的人擔任聖殿工作人員，並按手選派他們。")
        },
        {
            title: t('stake.instructions.handbook_data.section26_4_2.title', "26.4.2 新受洗成員的聖殿推薦書"),
            content: tString('stake.instructions.handbook_data.section26_4_2.content', "主教要與適齡的新成員面談，讓他們取得聖殿推薦書，可以代理死者接受洗禮和證實。他要在該成員接受證實後不久，通常在一個星期內，進行這項面談（見26.4.1）。對於弟兄來說，這項面談可以作為接受亞倫聖職面談的一部分。")
        },
        {
            title: t('stake.instructions.handbook_data.section27_0.title', "27.0 導言"),
            content: tString('stake.instructions.handbook_data.section27_0.content', "聖殿是主的屋宇，指引我們歸向救主耶穌基督。我們在聖殿裡參與神神教儀，並與天父立下聖約，使我們與祂和救主緊密相連。這些聖約和教儀幫助我們準備好回到天父身邊，並印證在一起成為永恆家庭。\n在聖殿的各項聖約和教儀中，「都顯示了神性的能力」（教義和聖約約84：20）。\n聖殿的聖約和教儀是神聖的。與聖殿聖約有關的象徵，不應該在聖殿以外的地方討論。我們也不該討論我們在聖殿內承諾不會透露的神聖資料。然而，我們可以討論聖殿聖約和教儀的基本目的和教義，以及我們在聖殿裡所享有的靈性感覺。")
        },
        {
            title: t('stake.instructions.handbook_data.section27_1_7.title', "27.1.7 在成員接受聖殿教儀後與他們見面"),
            content: tString('stake.instructions.handbook_data.section27_1_7.content', "成員在接受聖殿教儀後，往往會有些疑問。接受過恩道門的家人、主教、支會其他領袖、弟兄施助者和姊妹施助者，可以和成員見面，討論他們的聖殿經驗。\n協助解答問題的資源，可在temples.ChurchofJesusChrist.org取得。")
        },
        {
            title: t('stake.instructions.handbook_data.section27_2_1_1.title', "27.2.1.1 新受洗的成員"),
            content: tString('stake.instructions.handbook_data.section27_2_1_1.content', "配稱的成年新成員，要在他們接受證實的日期至少滿一年後，才可以接受個人恩道門。")
        },
        {
            title: t('stake.instructions.handbook_data.section27_2_3_3.title', "27.2.3.3 接受恩道門成員的伴隨者"),
            content: tString('stake.instructions.handbook_data.section27_2_3_3.content', "接受個人恩道門的成員，可以邀請一位相同性別且已接受恩道門的成員擔任伴隨者，在恩道門場次裡給予協助。伴隨者必須持有有效的聖殿推薦書。必要時，聖殿可以提供伴隨者。")
        },
        {
            title: t('stake.instructions.handbook_data.section20_5_10.title', "20.5.10 聖殿旅行團"),
            content: tString('stake.instructions.handbook_data.section20_5_10.content', "支會或支聯會可以規劃在指定的聖殿地區內進行聖殿旅行團。\n教會不鼓勵支會或支聯會規劃在指定的聖殿地區以外進行聖殿旅行團，這類行程需獲得支聯會會長團的核准。需要過夜的聖殿旅行團也需獲得支聯會會長團的核准。\n聖殿旅行團必須遵守20.7.7裡的旅行政策。需過夜的聖殿旅行團也必須遵守20.5.5裡的政策。")
        },
        {
            title: t('stake.instructions.handbook_data.section20_7_7.title', "20.7.7 旅行"),
            content: tString('stake.instructions.handbook_data.section20_7_7.content', "教會活動的交通旅行應由主教或支聯會會長核准，這類交通旅行不應對成員造成過多負擔。\n參與者不應為參加活動作長途旅行（超過幾個小時），任何例外情形都須取得區域會長團的核准；若區域會長團核准這樣的旅行，則成員不應自付旅費（見20.6）。\n對於旅行的做法和應用本節內指導方針的方式，同一個區域或參加同一個協調議會的各單位應當一致。支聯會會長們可以在協調議會會議中討論對於旅行的做法，並達成共識。\n領袖要為需要長途旅行的活動填寫活動計畫書。\n教會的青少年活動若需要長途旅行或過夜，父母或監護人必須提供書面同意才能讓子女參與（見20.7.4）。必須有負責可靠的成人隨同督導（見20.7.1）。\n可行的話，教會團體應搭乘商業運輸工具進行長途旅行，該運輸工具應有執照，並已投保責任險。\n教會團體搭乘私人車輛旅行時，每輛車都必須處於安全的運作狀態。每位乘客都應繫上安全帶。每位駕駛員都應當持有駕照，而且是負責可靠的成人。所有的車輛與駕駛員都應投保合理額度的汽車責任保險。應訂立計畫，確保駕駛員保持清醒和警覺。要盡可能地做到，一位成人不應單獨與一位青少年在車上，除非該名青少年是其子女。\n教會組織不可擁有或購置汽車或巴士作為團體旅行之用。\n除非是夫妻或彼此皆為單身，否則一男一女不應單獨結伴同行，參加教會活動、聚會或從事指派工作。\n如需更多資料，見ChurchofJesusChrist.org上的「常見問題——我該怎麼辦？」。")
        }
    ];

    // Numeric sorting logic based on the title prefix (e.g., "14.2.1.3")
    return sections.sort((a, b) => {
        const aTitle = String(a.title);
        const bTitle = String(b.title);
        const aMatch = aTitle.match(/^[\d.]+/);
        const bMatch = bTitle.match(/^[\d.]+/);
        
        if (aMatch && bMatch) {
            const aParts = aMatch[0].split('.').map(Number);
            const bParts = bMatch[0].split('.').map(Number);
            
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aVal = aParts[i] || 0;
                const bVal = bParts[i] || 0;
                if (aVal !== bVal) return aVal - bVal;
            }
        }
        return aTitle.localeCompare(bTitle);
    });
};

interface HandbookSection {
    title: string;
    content: string;
}

interface RuleSection {
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
}

const Instructions: React.FC<InstructionsProps> = ({ onBack, onGoRegister, onGoFeedback, activeTab: propsActiveTab, onTabChange }) => {
    const { t, tString } = useI18n();

    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [activeEvent, setActiveEvent] = useState<EventData | undefined>(undefined);
    const [internalActiveTab, setInternalActiveTab] = useState<TabType>('eventRules');
    const activeTab = propsActiveTab || internalActiveTab;
    const setActiveTab = onTabChange || setInternalActiveTab;
    const [sandboxVisible, setSandboxVisible] = useState(false);
    const [billingConfig, setBillingConfig] = useState<BillingEngineConfig | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        'rules': false,
        'fee': false
    });

    const toggleSection = (id: string) => {
        setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        const unsubSettings = subscribeToSettings((s) => {
            setSettings(s);
            if (s.billingConfig) {
                setBillingConfig(s.billingConfig);
            }
        });
        const unsubEvents = subscribeToEvents((events) => {
            const active = events.find(e => e.is_active);
            setActiveEvent(active);
        });
        return () => {
            unsubSettings();
            unsubEvents();
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleTabChange = (tabId: TabType) => {
        setActiveTab(tabId);
        scrollToTop();
    };

    const rainbowColors = [
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', accent: 'bg-red-100', hover: 'hover:bg-red-100' },
        { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', accent: 'bg-orange-100', hover: 'hover:bg-orange-100' },
        { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', accent: 'bg-yellow-100', hover: 'hover:bg-yellow-100' },
        { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', accent: 'bg-green-100', hover: 'hover:bg-green-100' },
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', accent: 'bg-blue-100', hover: 'hover:bg-blue-100' },
        { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', accent: 'bg-indigo-100', hover: 'hover:bg-indigo-100' },
        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', accent: 'bg-purple-100', hover: 'hover:bg-purple-100' },
    ];

    const ruleSections: RuleSection[] = [
        {
            title: "一、目標與對策",
            icon: Target,
            content: (
                <div className="space-y-4">
                    <div>
                        <p className="font-bold mb-1">1. 讓新成員儘快到聖殿</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>支聯會：新成員免車資，伴隨者半價。</li>
                            <li>支分會：協助新成員儘速取得聖殿推薦書，並報名聖殿旅行團。</li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-bold mb-1">2. 提升聖殿外的服務品質</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>支聯會：改進聖殿旅行團報名方式及搭車服務品質。</li>
                            <li>支分會：提升聖殿推薦書持有率及成員自帶家檔的比例。</li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-bold mb-1">3. 提升聖殿內的服務品質</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>支聯會：聖殿工作人員及服務人員車資半價。</li>
                            <li>支分會：推薦更多成員擔任聖殿工作人員。</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: "二、職責分工",
            icon: Users,
            content: (
                <ul className="space-y-2">
                    <li><span className="font-bold">督導人：</span>支聯會會長團諮理（督導整體聖殿旅行團）。</li>
                    <li><span className="font-bold">主辦人：</span>支聯會聖殿與家譜顧問（負責活動執行）。</li>
                    <li><span className="font-bold">領隊人：</span>關心司機狀況、報路、代墊司機餐費、代繳遊覽車停車費。</li>
                    <li><span className="font-bold">服務人：</span>擔任聖殿教儀的服務工作人員。</li>
                    <li><span className="font-bold">報名人：</span>參與支聯會聖殿日活動的教會成員。</li>
                </ul>
            )
        },
        {
            title: "三、報名方式",
            icon: ClipboardCheck,
            content: (
                <ul className="space-y-2">
                    <li><span className="font-bold">管理：</span>由主辦人管理線上報名系統，並發送至各單位群組。</li>
                    <li><span className="font-bold">報名：</span>報名人透過報名系統進行登記、修改、取消及查詢。</li>
                </ul>
            )
        },
        {
            title: "四、收費辦法",
            icon: CreditCard,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wider text-current/60 mb-1">A. 新營/太保/嘉義/民雄</p>
                            <ul className="text-sm space-y-1">
                                <li>成人：600元 (單趟480元)</li>
                                <li>青少年：250元 (單趟不折)</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wider text-current/60 mb-1">B. 虎尾/斗六</p>
                            <ul className="text-sm space-y-1">
                                <li>成人：500元 (單趟400元)</li>
                                <li>青少年：200元 (單趟不折)</li>
                            </ul>
                        </div>
                    </div>
                    <div className="bg-white/40 p-3 rounded text-xs space-y-1">
                        <p><span className="font-bold">C. 半價：</span>服務人員、工作人員；首訪成員伴隨者。</p>
                        <p><span className="font-bold">D. 免費：</span>0-3歲、新成員首訪、傳教首訪、受訓期。</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded text-xs border border-current/10">
                        <p className="font-bold mb-1 underline">E. 其他規定</p>
                        <ul className="space-y-1 list-disc pl-4">
                            <li>繳款後不退費。當日未上車可保留一次。</li>
                            <li>轉帳：2026年6月起，不再於車上收費。</li>
                            <li>保險：100萬意外+10萬醫療 (活動當日)。</li>
                            <li>欠費：補繳前暫停報名權利。</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: "五、教儀時間",
            icon: Clock,
            content: (
                <div className="space-y-2 text-sm">
                    <p><span className="font-bold">洗禮及證實：</span>10:50~12:00 (上限20人)</p>
                    <p><span className="font-bold">恩道門：</span>11:00 (32人) / 11:30 (22人)</p>
                    <p><span className="font-bold">先行禮與印證：</span>請洽聖殿工作人員</p>
                    <p className="text-xs opacity-70 mt-2">＊服務人員不計入名額上限。</p>
                </div>
            )
        },
        {
            title: "六、報名及訂車原則",
            icon: Bus,
            content: (
                <div className="space-y-2 text-sm">
                    <p>依兩區人數合計決定出車：</p>
                    <ul className="list-disc pl-5 text-xs space-y-1">
                        <li>35-42人：1台車 (43-69人候補)</li>
                        <li>70-84人：2台車 (85-104人候補)</li>
                        <li>105-126人：3台車 (127人後候補)</li>
                    </ul>
                    <p className="text-xs bg-white/40 p-2 rounded">教堂逾15人由遊覽車接送，低於15人統一至交流道上車。</p>
                </div>
            )
        },
        {
            title: "七、服務人員委派",
            icon: UserCheck,
            content: (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <p>A. 協調員</p><p>G. 照顧兒童</p>
                    <p>B. 洗禮記錄員</p><p>H. 施洗者(10:50)</p>
                    <p>C. 證實者</p><p>I. 施洗者(11:20)</p>
                    <p>D. 證實記錄員</p><p>J. 新營車領車</p>
                    <p>E. 發衣服</p><p>K. 嘉義車領車</p>
                    <p>F. 發毛巾</p><p>L. 雲林車領車</p>
                </div>
            )
        },
        {
            title: "八、日程進度表",
            icon: Calendar,
            content: (
                <div className="space-y-3">
                    <div className="text-[10px] grid grid-cols-1 gap-1">
                        <div className="flex justify-between border-b border-current/10 pb-1"><span>13天前 (日)</span><span>統計人數/決定訂車</span></div>
                        <div className="flex justify-between border-b border-current/10 pb-1"><span>12天前 (一)</span><span>訂車並公告收費</span></div>
                        <div className="flex justify-between border-b border-current/10 pb-1"><span>6天前 (日)</span><span>完成轉帳繳費</span></div>
                        <div className="flex justify-between border-b border-current/10 pb-1"><span>5天前 (一)</span><span>提供保險名單</span></div>
                        <div className="flex justify-between border-b border-current/10 pb-1"><span>4天前 (二)</span><span>送聖殿核備教儀</span></div>
                        <div className="flex justify-between border-b border-current/10 pb-1"><span>3天前 (三)</span><span>公布名單與場次</span></div>
                        <div className="flex justify-between border-b border-current/10 pb-1"><span>前2天 (四)</span><span>提供車號/司機資訊</span></div>
                    </div>
                </div>
            )
        },
        {
            title: "九、辦法修訂",
            icon: Edit,
            content: (
                <p>若活動辦法有不周詳之處，歡迎各位成員反映意見，由支聯會會長團討論後決定修訂內容。</p>
            )
        }
    ];

    // Updated Colors & Grid for Responsive Layout
    const tabs: { id: TabType; label: string; icon: React.ElementType; colorClass: string; activeClass: string }[] = [
        { 
            id: 'eventRules', 
            label: t('stake.instructions.tabs.event_rules', '活動辦法'), 
            icon: FileText, 
            colorClass: 'bg-orange-100 text-orange-900 border-orange-400 hover:bg-orange-200',
            activeClass: 'bg-orange-300 text-orange-900 border-orange-400 shadow-md ring-orange-300'
        },
        { 
            id: 'general', 
            label: t('stake.instructions.tabs.general', '報名須知'), 
            icon: List, 
            colorClass: 'bg-red-100 text-red-900 border-red-400 hover:bg-red-200',
            activeClass: 'bg-red-300 text-red-900 border-red-400 shadow-md ring-red-300'
        },
        { 
            id: 'housing', 
            label: t('stake.instructions.tabs.housing', '副殿住宿'), 
            icon: Home, 
            colorClass: 'bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200',
            activeClass: 'bg-amber-300 text-amber-900 border-amber-400 shadow-md ring-amber-300'
        },
        { 
            id: 'driving', 
            label: t('stake.instructions.tabs.driving', '開車前往'), 
            icon: MapPin, 
            colorClass: 'bg-green-100 text-green-900 border-green-400 hover:bg-green-200',
            activeClass: 'bg-green-300 text-green-900 border-green-400 shadow-md ring-green-300'
        },
        { 
            id: 'transit', 
            label: t('stake.instructions.tabs.transit', '大眾運輸'), 
            icon: Train, 
            colorClass: 'bg-blue-100 text-blue-900 border-blue-400 hover:bg-blue-200',
            activeClass: 'bg-blue-300 text-blue-900 border-blue-400 shadow-md ring-blue-300'
        },
        { 
            id: 'handbook', 
            label: t('stake.instructions.tabs.handbook', '手冊擷選'), 
            icon: Book, 
            colorClass: 'bg-indigo-100 text-indigo-900 border-indigo-400 hover:bg-indigo-200',
            activeClass: 'bg-indigo-300 text-indigo-900 border-indigo-400 shadow-md ring-indigo-300'
        },
        { 
            id: 'privacy', 
            label: t('stake.instructions.tabs.privacy', '隱私權利'), 
            icon: ShieldCheck, 
            colorClass: 'bg-slate-100 text-slate-900 border-slate-400 hover:bg-slate-200',
            activeClass: 'bg-slate-300 text-slate-900 border-slate-400 shadow-md ring-slate-300'
        },
        { 
            id: 'terms', 
            label: t('stake.instructions.tabs.terms', '服務條款'), 
            icon: FileText, 
            colorClass: 'bg-gray-100 text-gray-900 border-gray-400 hover:bg-gray-200',
            activeClass: 'bg-gray-300 text-gray-900 border-gray-400 shadow-md ring-gray-300'
        },
    ];

    return (
        <div className="p-2 md:p-6 bg-gray-50 min-h-screen relative pb-24">
            
            {/* Main Content */}
            <div className="w-full p-2 md:p-0 max-w-5xl mx-auto space-y-6 animate-fade-in">
                
                {/* Top Header Section */}
                <div className="flex flex-row justify-between items-center gap-2 mb-2">
                    <div className="flex items-center">
                        <Info className="w-6 h-6 mr-2 text-amber-600" />
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                            {activeTab === 'eventRules' ? '活動辦法' : 
                             activeTab === 'general' ? '報名須知' : 
                             activeTab === 'housing' ? '副殿住宿' : 
                             activeTab === 'driving' ? '開車前往' : 
                             activeTab === 'transit' ? '大眾運輸' : 
                             activeTab === 'handbook' ? '手冊擷選' : 
                             activeTab === 'privacy' ? '隱私權利' : 
                             activeTab === 'terms' ? '服務條款' : 
                             t('stake.instructions.title', '說明')}
                        </h2>
                    </div>
                </div>

                {/* Tab Navigation - Responsive Grid: Mobile 2, Tablet 3, Desktop 6 */}
                {!propsActiveTab && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`
                                    py-3 px-2 md:px-4 rounded font-bold text-center transition-all flex items-center justify-center border text-sm touch-manipulation shadow-sm
                                    ${activeTab === tab.id ? `${tab.activeClass} scale-[1.02]` : `${tab.colorClass}`}
                                `}
                            >
                                <tab.icon className="w-4 h-4 mr-1 md:mr-2 flex-shrink-0" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Sections */}
                <div className="bg-white p-5 md:p-10 rounded shadow-sm border border-gray-100 min-h-[400px]">
                    
                    {/* TAB 0: Event Rules (Synced with backend) */}
                    {activeTab === 'eventRules' && (
                        <div className="animate-fade-in">
                            <div 
                                className="flex items-center justify-between cursor-pointer select-none py-4 border-b-2 border-orange-100 mb-6"
                                onClick={() => toggleSection('rules')}
                            >
                                <SectionHeader icon={FileText} title={tString('stake.instructions.eventRules.header', '辦法內容')} />
                                <div className="text-orange-400">
                                    {collapsedSections['rules'] ? <DownOutlined className="text-lg" /> : <UpOutlined className="text-lg" />}
                                </div>
                            </div>
                            
                            <AnimatePresence>
                                {!collapsedSections['rules'] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mb-12">
                                            <div className="text-center mb-8">
                                                <h1 className="text-2xl md:text-3xl font-extrabold text-orange-900 mb-2">2026 嘉義支聯會 聖殿旅行團 活動辦法</h1>
                                                <p className="text-orange-700 font-bold">實施日期：2026年7月1日起</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                {ruleSections.map((section, index) => {
                                                    const color = rainbowColors[index % rainbowColors.length];
                                                    return (
                                                        <div 
                                                            key={index} 
                                                            className={`${color.bg} ${color.border} ${color.text} p-5 md:p-6 rounded border-2 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col`}
                                                        >
                                                            <div className="flex items-center mb-4 border-b border-current/10 pb-3">
                                                                <div className={`${color.accent} p-2 rounded mr-3`}>
                                                                    <section.icon className="w-5 h-5 md:w-6 md:h-6" />
                                                                </div>
                                                                <h3 className="font-bold text-lg md:text-xl">{section.title}</h3>
                                                            </div>
                                                            <div className="flex-1 text-sm md:text-base leading-relaxed opacity-90">
                                                                {section.content}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {settings?.rules_content && settings.rules_content.length > 50 && (
                                                <div className="mt-8 bg-gray-50 p-6 rounded border border-gray-200">
                                                    <p className="text-gray-500 text-xs mb-4 uppercase tracking-widest font-bold">其他補充說明</p>
                                                    <div 
                                                        className="markdown-body text-gray-700"
                                                        dangerouslySetInnerHTML={{ __html: settings.rules_content }} 
                                                    />
                                                </div>
                                            )}

                                            <div className="mt-12 text-center space-y-2 border-t border-orange-100 pt-8">
                                                <p className="text-orange-900 font-bold text-lg md:text-xl">祝福大家在聖殿旅行團中獲得豐盛的祝福！</p>
                                                <p className="text-orange-600 text-sm">如有任何問題，請洽主辦人或督導人。</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {billingConfig ? (
                                <FeeExplanationSection 
                                    billingConfig={billingConfig} 
                                    onOpenCalcModal={() => setSandboxVisible(true)}
                                    defaultCollapsed={false}
                                />
                            ) : (
                                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                                    {t('stake.instructions.loading_billing', '載入收費資訊中...')}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* TAB 1: General Info */}
                    {activeTab === 'general' && (
                        <div className="animate-fade-in">
                            {/* 1. Registration */}
                            <SectionHeader icon={CalendarCheck} title={tString('stake.instructions.general.registration.header', '如何報名')} />
                            <ul className="mb-8">
                                <BulletPoint>{t('stake.instructions.general.registration.point1', '請以「家庭」為單位進行報名，並推派一位家庭代表人負責填寫資料。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.registration.point2', '請務必確認所有報名成員的姓名、身分證字號及出生年月日正確無誤，以便辦理旅遊平安險。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.registration.point3', '報名後若需取消或變更，請盡早使用「修改」功能或聯繫各單位負責人，以免影響車輛調度。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.registration.point4', '系統設有報名截止日期，請務必在期限內完成報名程序。')}</BulletPoint>
                            </ul>

                            {/* 2. Recommend */}
                            <SectionHeader icon={BookOpen} title={tString('stake.instructions.general.recommend.header', '聖殿推薦書')} />
                            <ul className="mb-8">
                                <BulletPoint>
                                    <span className="font-bold text-slate-900">{t('stake.instructions.general.recommend.adult_label', '成人成員：')}</span>{t('stake.instructions.general.recommend.adult_desc', '需持有有效的聖殿推薦書。請提前檢查推薦書是否過期，若已過期，請儘早與主教/分會會長面談。')}
                                </BulletPoint>
                                <BulletPoint>
                                    <span className="font-bold text-slate-900">{t('stake.instructions.general.recommend.youth_label', '青少年 (12歲以上)：')}</span>{t('stake.instructions.general.recommend.youth_desc', '需持有有效的「限用途」聖殿推薦書，方可參與代替死者洗禮教儀。')}
                                </BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.recommend.new_member_hint', '新成員或首次前往聖殿者，請先與聖職領袖諮詢相關準備事項。')}</BulletPoint>
                            </ul>

                            {/* 3. Clothing */}
                            <SectionHeader icon={Shirt} title={tString('stake.instructions.general.clothing.header', '服裝與儀容')} />
                            <ul className="mb-8">
                                <BulletPoint>{t('stake.instructions.general.clothing.point1', '前往聖殿時，請穿著安息日服裝（弟兄穿著白襯衫、領帶；姊妹穿著裙裝或端莊褲裝）。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.clothing.point2', '參與洗禮教儀者，請自備一套換洗衣物（內衣褲），聖殿提供連身洗禮服。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.clothing.point3', '參與恩道門或印證教儀者，請攜帶完整的聖殿服裝。若租借，請確認聖殿服裝租借處的開放狀況。')}</BulletPoint>
                            </ul>

                            {/* 4. Transportation */}
                            <SectionHeader icon={Bus} title={tString('stake.instructions.general.transport.header', '交通與集合')} />
                            <ul className="mb-8">
                                <BulletPoint>{t('stake.instructions.general.transport.point1', '請依照各車次公告的集合時間準時抵達上車地點，逾時不候。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.transport.point2', '各車設有領車人員，請配合領車人員的引導與點名。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.transport.point3', '遊覽車座位依系統分配或現場協調，請發揮愛心，優先禮讓長輩或有需要的成員。')}</BulletPoint>
                                <BulletPoint>{t('stake.instructions.general.transport.point4', '車上冷氣較強，建議攜帶薄外套。')}</BulletPoint>
                            </ul>

                            {/* 5. Fees */}
                            <SectionHeader icon={CreditCard} title={tString('stake.instructions.general.fees.header', '費用與繳費')} />
                            <ul className="mb-0">
                                <BulletPoint>{t('stake.instructions.general.fees.point1', '請依據您的身分（成人、青少年、兒童等）繳交相應的報名費。')}</BulletPoint>
                                <BulletPoint>
                                    {t('stake.instructions.general.fees.payment_methods', '付款方式：')}
                                    <div className="mt-3 block w-full bg-red-100 p-4 md:p-6 rounded border border-red-200 text-red-900 text-sm md:text-base font-medium leading-relaxed shadow-sm">
                                        <div className="mb-2 md:mb-4">
                                            1. <span className="font-bold">{t('stake.instructions.general.fees.cash_label', '現金：')}</span>{t('stake.instructions.general.fees.cash_desc', '請將車資交給各單位的負責人。')}
                                        </div>
                                        <div className="mb-2 md:mb-4">
                                            2. <span className="font-bold">{t('stake.instructions.general.fees.transfer_label', '轉帳：')}</span>{t('stake.instructions.general.fees.transfer_desc', '請轉帳或匯款至指定帳號，並在填寫或修改報名中填寫 帳號末五碼。')}
                                        </div>
                                        <div className="mb-2 md:mb-4">
                                            3. <span className="font-bold">{t('stake.instructions.general.fees.rollover_label', '留用：')}</span>{t('stake.instructions.general.fees.rollover_desc', '若您已繳費 但無法參加 或 來不及上車，請選擇此項，可將您的費用 保留 到下次使用，僅限一次。')}
                                        </div>
                                        <div>
                                            4. <span className="font-bold">{t('stake.instructions.general.fees.arrears_label', '欠費：')}</span>{t('stake.instructions.general.fees.arrears_desc', '報名成功後，不繳費也不取消，補繳之前會被暫停報名的權利。')}
                                        </div>
                                    </div>
                                </BulletPoint>
                            </ul>
                        </div>
                    )}

                    {/* TAB 3: Handbook Extracts - NEW Indigo Theme (Now Last Tab) */}
                    {activeTab === 'handbook' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-indigo-50 p-4 rounded border border-indigo-200 mb-6">
                                <h3 className="font-bold text-indigo-900 flex items-center mb-2">
                                    <Book className="w-5 h-5 mr-2" /> {t('stake.instructions.handbook_data.header_title', '總指導手冊')}
                                </h3>
                                <p className="text-indigo-800 text-sm">
                                    {t('stake.instructions.handbook_data.header_desc', '以下內容擷取自《總指導手冊：在耶穌基督後期聖徒教會裡服務》，供成員與領袖參考。')}
                                </p>
                                <div className="mt-4 pt-4 border-t border-indigo-100">
                                    <a 
                                        href="https://www.churchofjesuschrist.org/study/manual/general-handbook?lang=zho" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-indigo-700 hover:text-indigo-900 font-bold bg-white px-4 py-2 rounded border border-indigo-200 shadow-sm transition-all hover:shadow-md"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {t('stake.instructions.handbook_data.source_url_label', '查詢原文出處內容')}
                                    </a>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {getHandbookSections(t, tString).map((section: HandbookSection, idx: number) => {
                                    const sectionId = `handbook_${idx}`;
                                    const isCollapsed = collapsedSections[sectionId] ?? false;
                                    const color = rainbowColors[idx % rainbowColors.length];
                                    
                                    return (
                                        <div key={idx} className={`${color.bg} rounded border ${color.border} shadow-sm overflow-hidden`}>
                                            <div 
                                                className={`flex items-center justify-between p-4 cursor-pointer select-none ${color.hover} transition-colors`}
                                                onClick={() => toggleSection(sectionId)}
                                            >
                                                <h4 className={`font-bold text-lg ${color.text} flex-1`}>
                                                    {section.title}
                                                </h4>
                                                <div className={color.text}>
                                                    {isCollapsed ? <DownOutlined className="text-lg" /> : <UpOutlined className="text-lg" />}
                                                </div>
                                            </div>
                                            
                                            <AnimatePresence>
                                                {!isCollapsed && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        <div className="p-5 bg-white/50 border-t border-inherit">
                                                            <div className={`${color.text} leading-relaxed text-sm md:text-base opacity-90 whitespace-pre-wrap`}>
                                                                {String(section.content).split('\n').map((paragraph: string, pIdx: number) => (
                                                                    <p key={pIdx} className="mb-2 last:mb-0">
                                                                        {paragraph}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="text-center text-xs text-gray-400 mt-8">
                                {t('stake.instructions.handbook_data.source', '資料來源：General Handbook: Serving in The Church of Jesus Christ of Latter-day Saints')}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Housing - Updated Colors: Light Yellow / Dark Yellow */}
                    {activeTab === 'housing' && (
                        <div className="animate-fade-in">
                            <SectionHeader icon={Home} title={tString('stake.instructions.housing.header', '副殿住宿規定')} />
                            <div className="bg-yellow-50 p-4 md:p-6 rounded border border-yellow-200 mb-6 text-yellow-900 leading-relaxed text-sm md:text-base">
                                <h4 className="font-bold text-base md:text-lg mb-4 text-center">{t('stake.instructions.housing.subheader', '台灣台北聖殿與會者住房住宿規定')}<br/><span className="text-xs md:text-sm font-normal">{t('stake.instructions.housing.effective_date', '(2023年9月1日起開始實施)')}</span></h4>
                                
                                <p className="mb-4">{t('stake.instructions.housing.intro_greeting', '親愛的弟兄姊姊：')}</p>
                                <p className="mb-4">{t('stake.instructions.housing.intro_welcome', '歡迎入住副殿，請您留意：')}</p>
                                <p className="mb-6">{t('stake.instructions.housing.intro_purpose', '與會者住房的服務是為了讓前來聖殿的人們能感受到聖靈和美好的聖殿經驗，並專注在參與聖殿教儀。因此，副殿主要是讓每日有意參與聖殿教儀的與會者入住。如需咨詢附近住宿資訊，可詢問副殿以供參考。')}</p>

                                {/* Section 1 */}
                                <h5 className="font-bold text-base md:text-lg mb-2">{t('stake.instructions.housing.section1.title', '1. 訂房事宜')}</h5>
                                <ul className="list-none space-y-2 mb-6 pl-0 md:pl-4">
                                    <li><span className="font-bold">{t('stake.instructions.housing.section1.pointA_label', 'A. 聖殿推薦書：')}</span>{t('stake.instructions.housing.section1.pointA_desc', '須持有效聖殿推薦書方可入住。除參與印證教儀外，與會者住房不提供12歲以下兒童住宿。12 歲以下的兒童在聖殿廣場的任何地方活動，或是在使用副殿設施時，都必須一直有一位負責的成人全程在場。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section1.pointB_label', 'B. 預約訂房：')}</span>{t('stake.instructions.housing.section1.pointB_desc', '服務人員、年長者及行動不便者，與遠道而來的成員與家庭將優先安排。由於床位有限及特殊情況的需求，聖殿保留取消預約的權利，如需調整副殿會於七日前通知。訂房預約專線：02-2322-4246 或 E-mail: taipe-tho@churchofjesuschrist.org，務必註明姓名、電話、性別 及住宿日期。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section1.pointC_label', 'C. 確認訂房：')}</span>{t('stake.instructions.housing.section1.pointC_desc', '副殿將會在入住日當天下午四點半前再次與您確認入住與否，如果您臨時無法入住，或是需要調整，請提前告知，若副殿當天聯絡不到您，我們將取消您的訂房。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section1.pointD_label', 'D. 費用：')}</span>{t('stake.instructions.housing.section1.pointD_desc', '自 2021 年 12 月 6 日起不收取住宿費用，不提供盥洗用具、沐浴乳和洗髮精。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section1.pointE_label', 'E. 床位：')}</span>{t('stake.instructions.housing.section1.pointE_desc', '請依照排定的床位號碼住宿，勿隨意更換。')}</li>
                                </ul>

                                {/* Section 2 */}
                                <h5 className="font-bold text-base md:text-lg mb-2">{t('stake.instructions.housing.section2.title', '2. 生活環境')}</h5>
                                <ul className="list-none space-y-2 mb-6 pl-0 md:pl-4">
                                    <li><span className="font-bold">{t('stake.instructions.housing.section2.pointA_label', 'A. 飲食：')}</span>{t('stake.instructions.housing.section2.pointA_desc', '請在一樓餐廳開放時間內（每日6:00-20:00）用餐，勿在客廳或寢室用餐。使用廚房設備後，請清潔並將物品歸位。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section2.pointB_label', 'B. 冰箱：')}</span>{t('stake.instructions.housing.section2.pointB_desc', '退房時請將個人物品帶走，未貼標籤物品（未註明擁有人）將定時清除。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section2.pointC_label', 'C. 清潔：')}</span>{t('stake.instructions.housing.section2.pointC_desc', '住宿時請使用床單、床罩和枕頭套；退房前請取下枕頭套、床單和床罩，依照分類放在一樓餐廳後方洗衣籃內，並將枕頭及被子放回衣櫃內，房間及廁所請保持整潔。垃圾請放置在一樓客廳垃圾桶。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section2.pointD_label', 'D. 洗衣房：')}</span>{t('stake.instructions.housing.section2.pointD_desc', '僅做公務使用。櫃檯有鄰近洗衣房或自助洗衣店的資訊可提供查詢。')}</li>
                                </ul>

                                {/* Section 3 */}
                                <h5 className="font-bold text-base md:text-lg mb-2">{t('stake.instructions.housing.section3.title', '3. 安全規範')}</h5>
                                <ul className="list-none space-y-2 mb-6 pl-0 md:pl-4">
                                    <li><span className="font-bold">{t('stake.instructions.housing.section3.pointA_label', 'A. ')}</span>{t('stake.instructions.housing.section3.pointA_desc', '副殿不負責個人物品和財物保管的責任，務必妥善保管貴重物品與個人財物。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section3.pointB_label', 'B. ')}</span>{t('stake.instructions.housing.section3.pointB_desc', '請妥善保管鑰匙（若遺失需負擔換鎖工本費NT$500）。基於安全考量鑰匙請勿外借，退房時將鑰匙歸還櫃檯；並注意個人衣櫃及門戶，隨手關門及上鎖。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section3.pointC_label', 'C. ')}</span>{t('stake.instructions.housing.section3.pointC_desc', '安全考量下請勿邀請未登記住宿的人員進入或使用與會者住宿的房間和設施。')}</li>
                                </ul>

                                {/* Section 4 */}
                                <h5 className="font-bold text-base md:text-lg mb-2">{t('stake.instructions.housing.section4.title', '4. 其他')}</h5>
                                <ul className="list-none space-y-2 mb-6 pl-0 md:pl-4">
                                    <li><span className="font-bold">{t('stake.instructions.housing.section4.pointA_label', 'A. ')}</span>{t('stake.instructions.housing.section4.pointA_desc', '辦理入住登記時間為 14:00 到 21:00 之間，逾時不候；退房時間為當日上午 11:00 前。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section4.pointB_label', 'B. ')}</span>{t('stake.instructions.housing.section4.pointB_desc', '外出請在 22:30 以前返回。晚上 22:30 到早上 6:00，如需交談或處理事務請輕聲細語。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section4.pointC_label', 'C. ')}</span>{t('stake.instructions.housing.section4.pointC_desc', '節約能源，隨手關燈、關水、關冷氣。')}</li>
                                    <li><span className="font-bold">{t('stake.instructions.housing.section4.pointD_label', 'D. ')}</span>{t('stake.instructions.housing.section4.pointD_desc', '先知勸告我們在舉止和穿著要端莊。儀表整潔、行為和穿著端莊就可邀請聖靈同在。去聖殿時，請穿著安息日服裝。')}</li>
                                </ul>

                                <div className="mt-8 text-right font-bold">{t('stake.instructions.housing.signature', '台灣台北聖殿 謹啟')}</div>

                                {/* Footer Info Block */}
                                <div className="mt-8 pt-6 border-t border-yellow-200">
                                    <h5 className="font-bold text-base md:text-lg mb-2">{t('stake.instructions.housing.booking_footer.title', '預約台北聖殿 副殿住宿')}</h5>
                                    <ul className="space-y-2 mb-4">
                                        <li>{t('stake.instructions.housing.booking_footer.step1', '在聖殿網站預約好要執行的教儀後')}</li>
                                        <li>{t('stake.instructions.housing.booking_footer.step2', '下午 14:00 後打電話到副殿 02-2322-4246 預約住宿')}</li>
                                        <li>{t('stake.instructions.housing.booking_footer.step3', '辦理入住登記時間為 14:00 到 21:00 之間，逾時不候；退房時間為隔日上午 11:00 前。')}</li>
                                        <li>{t('stake.instructions.housing.booking_footer.step4', '外出請在 22:30 以前返回。晚上 22:30 到早上 6:00，請保持安靜不要影響他人的睡眠。')}</li>
                                    </ul>
                                    <div>
                                        <a href="https://tw.churchofjesuschrist.org/temple-patron-housing?lang=zho" target="_blank" rel="noopener noreferrer" className="text-yellow-700 hover:underline break-all font-bold">
                                            https://tw.churchofjesuschrist.org/temple-patron-housing?lang=zho
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Driving - Updated Colors: Light Green / Dark Green */}
                    {activeTab === 'driving' && (
                        <div className="animate-fade-in">
                            <SectionHeader icon={MapPin} title={tString('stake.instructions.driving.header', '路線停車')} />
                            
                            <div className="space-y-6">
                                <div className="bg-green-50 p-4 md:p-6 rounded border border-green-200">
                                    <h4 className="font-bold text-green-900 mb-2 text-base md:text-lg">📍 {t('stake.instructions.driving.address_title', '聖殿地址')}</h4>
                                    <p className="text-green-800 text-lg md:text-xl font-mono select-all">{t('stake.instructions.driving.address', '台北市大安區愛國東路256號')}</p>
                                    <div className="mt-4">
                                        <a 
                                            href="https://www.google.com/maps/search/?api=1&query=台北聖殿" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center bg-green-100 text-green-800 px-6 py-3 rounded font-bold hover:bg-green-200 transition-colors shadow-sm text-sm md:text-base"
                                        >
                                            <MapPin className="w-5 h-5 mr-2" /> {t('stake.instructions.driving.google_maps_btn', '開啟 Google Maps 導航')}
                                        </a>
                                    </div>
                                </div>

                                <div className="bg-green-50 p-4 md:p-6 rounded border border-green-200 text-green-900 leading-relaxed text-sm md:text-base">
                                    <h4 className="font-bold text-base md:text-lg mb-4">{t('stake.instructions.driving.parking.header', '停車資訊')}</h4>
                                    
                                    <p className="mb-4">
                                        {t('stake.instructions.driving.parking.intro', '教會的台北綜合大樓（Taipei Service Center）設有地下停車場，主要提供給前來參加教會活動、聖殿教儀或前往發行中心的成員與訪客使用。')}
                                    </p>

                                    <h5 className="font-bold text-sm md:text-base mb-2 mt-4 bg-green-200 px-2 py-1 rounded inline-block text-green-900">{t('stake.instructions.driving.parking.center_parking_title', '台北綜合大樓 停車場資訊')}</h5>
                                    <ul className="list-disc pl-5 space-y-2 mb-6">
                                        <li><span className="font-bold">{t('stake.instructions.driving.parking.location_label', '地點：')}</span>{t('stake.instructions.driving.parking.location_desc', '台北市大安區金華街 193 與 199 巷 的交叉路口（地下停車場入口位於大樓內部）。')}</li>
                                        <li>
                                            <span className="font-bold">{t('stake.instructions.driving.parking.hours_label', '開放時間：')}</span>
                                            <ul className="list-circle pl-5 mt-1">
                                                <li>{t('stake.instructions.driving.parking.hours_tue_sun', '週二至週日：05:30 – 22:30。')}</li>
                                                <li>{t('stake.instructions.driving.parking.hours_mon', '週一：05:30 – 18:00（配合教會辦公時間提早關閉）。')}</li>
                                            </ul>
                                        </li>
                                        <li>
                                            <span className="font-bold">{t('stake.instructions.driving.parking.rules_label', '停車規範：')}</span>
                                            <ul className="list-circle pl-5 mt-1">
                                                <li><span className="font-bold">{t('stake.instructions.driving.parking.rules_member_label', '成員：')}</span>{t('stake.instructions.driving.parking.rules_member_desc', '需向主教或分會會長申請並張貼「停車許可證」方可進入。')}</li>
                                                <li><span className="font-bold">{t('stake.instructions.driving.parking.rules_visitor_label', '訪客/教友：')}</span>{t('stake.instructions.driving.parking.rules_visitor_desc', '若無許可證，需在入口處以「駕照」換取臨時停車證並簽名登記。')}</li>
                                            </ul>
                                        </li>
                                        <li><span className="font-bold">{t('stake.instructions.driving.parking.limit_label', '限制：')}</span>{t('stake.instructions.driving.parking.limit_desc', '禁止隔夜停車（除事先申請核准之公務車外）。')}</li>
                                    </ul>

                                    <h5 className="font-bold text-sm md:text-base mb-2 mt-4 bg-green-200 px-2 py-1 rounded inline-block text-green-900">{t('stake.instructions.driving.parking.nearby_title', '周邊替代停車場建議')}</h5>
                                    <p className="mb-2">{t('stake.instructions.driving.parking.nearby_intro', '若大樓停車位已滿，附近金山南路二段及永康街周邊有數個付費停車場：')}</p>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div className="bg-white p-3 rounded border border-green-200">
                                            <div className="font-bold text-green-800">1. {t('stake.instructions.driving.parking.nearby_option1_title', '金山停車場 (Jinshan Parking)')}</div>
                                            <div className="text-xs md:text-sm pl-2">
                                                <div>{t('stake.instructions.driving.parking.nearby_option1_addr', '地址：台北市大安區金山南路二段 33 號。')}</div>
                                                <div>{t('stake.instructions.driving.parking.nearby_option1_rate', '費率：每小時約 80 元（假日 24 小時營業，最高上限 240 元）。')}</div>
                                                <div>{t('stake.instructions.driving.parking.nearby_option1_feature', '特色：電梯式平面停車，距離教堂步行約 3-5 分鐘。')}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white p-3 rounded border border-green-200">
                                            <div className="font-bold text-green-800">2. {t('stake.instructions.driving.parking.nearby_option2_title', 'Times 金山南路停車場')}</div>
                                            <div className="text-xs md:text-sm pl-2">
                                                <div>{t('stake.instructions.driving.parking.nearby_option2_addr', '地址：台北市大安區金山南路二段 31 巷 25 號。')}</div>
                                                <div>{t('stake.instructions.driving.parking.nearby_option2_rate', '費率：每 30 分鐘 70 元（費率較高，每小時約 140 元）。')}</div>
                                                <div>{t('stake.instructions.driving.parking.nearby_option2_note', '備註：採車牌辨識，無柵欄設計。')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-green-100 p-4 rounded border border-green-200">
                                        <span className="font-bold">{t('stake.instructions.driving.parking.reminder_label', '💡 交通提醒：')}</span>
                                        {t('stake.instructions.driving.parking.reminder_desc', '該區域位於熱鬧的東門/永康商圈，巷弄較窄且車位競爭激烈。建議多利用大眾運輸，從捷運東門站步行約 3-5 分鐘即可抵達綜合大樓。')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: Transit */}
                    {activeTab === 'transit' && (
                        <div className="animate-fade-in">
                            <SectionHeader icon={Train} title={tString('stake.instructions.transit.header', '轉乘指南')} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-blue-50 p-4 md:p-6 rounded border border-blue-100 text-blue-900 leading-relaxed">
                                    <h4 className="font-bold text-blue-900 mb-4 text-base md:text-lg flex items-center">
                                        <Train className="w-5 h-5 md:w-6 md:h-6 mr-2" /> {t('stake.instructions.transit.mrt.title', '捷運 (MRT)')}
                                    </h4>
                                    <div className="space-y-4 text-sm md:text-base">
                                        <div>
                                            <h5 className="font-bold text-blue-800 mb-1">{t('stake.instructions.transit.mrt.route_label', '搭乘路線：')}</h5>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>{t('stake.instructions.transit.mrt.route_line', '於捷運台北車站搭乘 淡水信義線（紅線），往「象山」或「廣慈/奉天宮」方向。')}</li>
                                                <li>{t('stake.instructions.transit.mrt.route_stop', '在 東門站 下車。')}</li>
                                            </ul>
                                        </div>
                                        
                                        <div>
                                            <h5 className="font-bold text-blue-800 mb-1">{t('stake.instructions.transit.mrt.walk_label', '步行指南：')}</h5>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>{t('stake.instructions.transit.mrt.walk_point1', '從 3 號 或 5 號 出口 出站。')}</li>
                                                <li>{t('stake.instructions.transit.mrt.walk_point2', '沿著金山南路二段步行，到愛國東路，步行約 4-6 分鐘即可抵達聖殿。')}</li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-100 p-3 rounded border border-blue-200 text-xs md:text-sm">
                                            <span className="font-bold">{t('stake.instructions.transit.mrt.note_label', '備註：')}</span> {t('stake.instructions.transit.mrt.note_desc', '若您從 台北捷運 M8 入口 進入捷運站會比較接近 紅線月台。')}
                                        </div>

                                        <div className="bg-white p-3 rounded border border-blue-200 text-xs md:text-sm shadow-sm">
                                            <span className="font-bold block mb-1">{t('stake.instructions.transit.mrt.alert_2026_label', '📢 2026 年最新提醒：')}</span>
                                            <p className="mb-1">{t('stake.instructions.transit.mrt.alert_2026_p1', '捷運信義線東延段（廣慈/奉天宮站）預計於 2026 年第一季通車，屆時搭乘紅線往東向的班次將更加頻繁。')}</p>
                                            <p>{t('stake.instructions.transit.mrt.alert_2026_p2', '台北捷運營運時間為每日 06:00 至 24:00。')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50 p-4 md:p-6 rounded border border-indigo-100 text-indigo-900 leading-relaxed">
                                    <h4 className="font-bold text-indigo-900 mb-4 text-base md:text-lg flex items-center">
                                        <Bus className="w-5 h-5 md:w-6 md:h-6 mr-2" /> {t('stake.instructions.transit.bus.title', '公車 (Bus)')}
                                    </h4>
                                    <div className="space-y-4 text-sm md:text-base">
                                        <p className="font-medium mb-2">{t('stake.instructions.transit.bus.intro', '若您想搭乘公車，可由台北車站周邊搭乘以下路線：')}</p>
                                        
                                        <div className="bg-white p-3 rounded border border-indigo-200 shadow-sm">
                                            <h5 className="font-bold text-indigo-800 mb-1 text-base md:text-lg">{t('stake.instructions.transit.bus.line606_title', '606 路')}</h5>
                                            <p className="text-indigo-700">
                                                {t('stake.instructions.transit.bus.line606_desc', '於「台北車站(忠孝)」站牌搭乘，至「金山潮州街口」站下車，下車後步行約 2 分鐘即可抵達。')}
                                            </p>
                                        </div>

                                        <div className="bg-white p-3 rounded border border-indigo-200 shadow-sm">
                                            <h5 className="font-bold text-indigo-800 mb-1 text-base md:text-lg">{t('stake.instructions.transit.bus.line237_title', '237 路')}</h5>
                                            <p className="text-indigo-700">
                                                {t('stake.instructions.transit.bus.line237_desc', '於「台北車站(忠孝)」搭乘，至「金山南路站」或「公教住宅站」下車。')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* New Bus Rules Section */}
                            <div className="mt-6 bg-amber-50 p-4 md:p-6 rounded border border-amber-200 text-amber-900 leading-relaxed">
                                <h4 className="font-bold text-amber-900 mb-4 text-base md:text-lg flex items-center">
                                    <AlertCircle className="w-5 h-5 md:w-6 md:h-6 mr-2" /> {t('stake.instructions.busRules.header', '遊覽車司機工時規定')}
                                </h4>
                                <div className="text-sm md:text-base font-medium mb-3">{t('stake.instructions.busRules.subheader', '租用遊覽車使用應注意重要安全規定事項')}</div>
                                <ul className="space-y-2 mb-4">
                                    <BulletPoint>{t('stake.instructions.busRules.point1', '遊覽車駕駛員每日駕駛車輛時間不可超過10小時，駕車4小時應休息30分鐘以上。')}</BulletPoint>
                                    <BulletPoint>{t('stake.instructions.busRules.point2', '單日出租車輛自車輛報到起至行程結束，調派單一駕駛人勤務不得逾11小時。')}</BulletPoint>
                                    <BulletPoint>{t('stake.instructions.busRules.point3', '到達各旅遊景點或目的地下車結束後，應屬駕駛員休息時間，務必讓駕駛員充分休息，不可隨意打擾駕駛員。')}</BulletPoint>
                                    <BulletPoint>{t('stake.instructions.busRules.point4', '駕駛員必須遵守交通安全規範行駛；未經與遊覽車公司協調同意，旅客不可任意變更或增加行程，避免造成駕駛員疲勞駕駛或工時超過規定，也不得要求駕駛員違規超速趕行程。')}</BulletPoint>
                                    <BulletPoint>{t('stake.instructions.busRules.point5', '兩日以上行程，駕駛員隔日出勤需休息10 小時以上，請提供駕駛員1人1室妥善的夜間休息環境。')}</BulletPoint>
                                    <BulletPoint>{t('stake.instructions.busRules.point6', '違反工時規定者，公路主管機關可依規定處分業者，最高可處新臺幣 9 萬元罰鍰。')}</BulletPoint>
                                </ul>
                                <div className="text-xs md:text-sm text-gray-600 bg-amber-100 p-3 rounded border border-amber-200">
                                    {t('stake.instructions.busRules.footer_note', '＊再次提醒租車消費者，唯有注意及遵守使用遊覽車安全規定事項，才能保障旅遊品質與行程安全，不要讓遊覽車公司及駕駛員因您違反規定而受罰。 規劃行程時應將駕駛休息時間納入，避免要求司機超時工作，保障旅遊安全。')}
                                </div>
                            </div>

                            <div className="mt-6 bg-purple-50 p-4 rounded border border-purple-200 text-purple-900">
                                <p className="text-sm font-bold mb-1">{t('stake.instructions.transit.warm_tip_label', '💡 溫馨提醒：')}</p>
                                <p className="text-sm">{t('stake.instructions.transit.warm_tip_desc', '台北市區交通繁忙，建議優先使用捷運前往，以免塞車延誤教儀時間。')}</p>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Privacy Policy */}
                    {activeTab === 'privacy' && (
                        <div className="animate-fade-in">
                            <MarkdownDocViewer 
                                titleKey="privacy_title" 
                                docIdKey="privacy_doc_id"
                                defaultDocId="privacy"
                            />
                        </div>
                    )}

                    {/* TAB 5: Terms of Service */}
                    {activeTab === 'terms' && (
                        <div className="animate-fade-in">
                            <MarkdownDocViewer 
                                titleKey="terms_title" 
                                docIdKey="terms_doc_id"
                                defaultDocId="terms"
                            />
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                {/* Subtle Call to Action - Modern Style */}
                <div className="mt-8 flex flex-col md:flex-row gap-6 items-center justify-center border-t border-slate-100 pt-12 pb-8">
                    <div className="text-center md:text-left">
                        <p className="text-slate-900 font-bold text-lg">準備好出發了嗎？</p>
                        <p className="text-slate-500 text-sm">點擊按鈕開始報名本次聖殿旅行團</p>
                    </div>
                    <button 
                        onClick={onGoRegister}
                        className="w-full md:w-auto h-12 px-10 bg-indigo-600 text-white font-bold rounded shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 group active:scale-95"
                    >
                        <span>立即前往報名</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <Modal
                    title={
                        <div className="flex items-center text-amber-900">
                            <CalculatorOutlined className="mr-2" /> {t('stake.instructions.footer.fee_sandbox_title', '收費試算 (Fee Calculation Sandbox)')}
                        </div>
                    }
                    open={sandboxVisible}
                    onCancel={() => setSandboxVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setSandboxVisible(false)}>{t('stake.instructions.footer.btn_close', '關閉 (Close)')}</Button>
                    ]}
                    width={500}
                    styles={{ body: { padding: '24px', backgroundColor: '#FFFBE6' } }}
                >
                    {billingConfig && <FeeCalculationModal billingConfig={billingConfig} />}
                </Modal>
            </div>
        </div>
    );
};

export default Instructions;
