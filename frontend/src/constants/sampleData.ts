import { MidweekMeetingData, WeekendMeetingData, SavedAnswer, UserSettings } from '@/types';

// Tamil Month Names Mapping
const TAMIL_MONTHS: Record<number, string> = {
  0: 'ஜனவரி',
  1: 'பிப்ரவரி',
  2: 'மார்ச்',
  3: 'ஏப்ரல்',
  4: 'மே',
  5: 'ஜூன்',
  6: 'ஜூலை',
  7: 'ஆகஸ்ட்',
  8: 'செப்டம்பர்',
  9: 'அக்டோபர்',
  10: 'நவம்பர்',
  11: 'டிசம்பர்',
};

/**
 * Dynamically computes the active meeting week dates in Tamil.
 * If today is Sunday afternoon/evening, advances to the upcoming week so users prepare for active meetings!
 */
export function getCurrentWeekMeetingDates(): {
  weekDateRange: string;
  midweekDate: string;
  weekendMeetingDate: string;
} {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0: Sunday, 1: Monday, ...
  const adjustDays = (dayOfWeek === 0 && now.getHours() >= 12) ? 1 : 0;

  const targetDate = new Date(now.getTime() + adjustDays * 86400000);
  const currentDay = targetDate.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(targetDate.getTime() + distanceToMonday * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const wednesday = new Date(monday.getTime() + 2 * 86400000);

  const monMonthName = TAMIL_MONTHS[monday.getMonth()] || 'நவம்பர்';
  const sunMonthName = TAMIL_MONTHS[sunday.getMonth()] || 'நவம்பர்';

  let weekDateRange: string;
  if (monday.getMonth() === sunday.getMonth()) {
    weekDateRange = `${monMonthName} ${monday.getDate()}-${sunday.getDate()}, ${monday.getFullYear()}`;
  } else {
    weekDateRange = `${monMonthName} ${monday.getDate()} – ${sunMonthName} ${sunday.getDate()}, ${monday.getFullYear()}`;
  }

  const weekendMeetingDate = `${sunMonthName} ${sunday.getDate()}, ${sunday.getFullYear()} (ஞாயிற்றுக்கிழமை)`;
  const midweekDate = `${TAMIL_MONTHS[wednesday.getMonth()] || 'நவம்பர்'} ${wednesday.getDate()}, ${wednesday.getFullYear()} (புதன்கிழமை)`;

  return { weekDateRange, midweekDate, weekendMeetingDate };
}

const initialDates = getCurrentWeekMeetingDates();

export const INITIAL_USER_SETTINGS: UserSettings = {
  theme: 'system',
  fontScale: 'normal',
  language: 'tamil_only',
  congregationName: 'சென்னை மத்திய சபை',
  midweekSchedule: 'வியாழக்கிழமை மாலை 7:00',
  weekendSchedule: 'ஞாயிற்றுக்கிழமை காலை 10:00',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://100.100.100.100:8000/api/v1',
};

export const SAMPLE_MIDWEEK_DATA: MidweekMeetingData = {
  weekDateRange: initialDates.weekDateRange,
  bibleReadingRange: 'லேவியராகமம் 1-4',
  theme: 'யெகோவாவின் பலிபீடத்திற்கு சிறந்ததை கொண்டுவாருங்கள்',
  openingSong: {
    number: 45,
    title: 'முழு மனதோடு சேவை செய்வோம்',
  },
  treasures: [
    {
      id: 'm-t-1',
      section: 'treasures',
      title: 'பலியிடுதலின் முக்கியத்துவம் மற்றும் அதன் ஆழமான பாடம்',
      duration: '10 நிமி',
      scripture: 'லேவியராகமம் 1:1-9',
      presenter: 'மூப்பர்',
      description: 'பழைய ஏற்பாட்டு பலிகள் இயேசுவின் பலியை சுட்டிக்காட்டிய விதம் மற்றும் நாம் கடவுளுக்கு சிறந்ததை கொடுப்பதன் மதிப்பு.',
      source: 'w24.01 பக். 14 பாரா 5-8',
    },
    {
      id: 'm-t-2',
      section: 'treasures',
      title: 'ஆன்மீகப் புதையல்கள் — லேவியராகமம் 1-4',
      duration: '10 நிமி',
      description: 'இந்த வார பைபிள் வாசிப்பிலிருந்து யெகோவாவைப் பற்றியும், ஊழியத்தைப் பற்றியும் நீங்கள் கண்டறிந்த முத்துக்கள்.',
      questions: [
        'லேவியராகமம் 1:3 — பலி குறைபாடற்றதாக இருக்க வேண்டும் என்பது நம்முடைய சேவைக்கு எவ்வாறு பொருந்துகிறது?',
        'லேவியராகமம் 2:13 — உப்பிட்ட பலி யெகோவாவுடனான உடன்படிக்கையை எவ்வாறு குறிக்கிறது?',
      ],
    },
    {
      id: 'm-t-3',
      section: 'treasures',
      title: 'பைபிள் வாசிப்பு',
      duration: '4 நிமி',
      scripture: 'லேவியராகமம் 2:1-16',
      presenter: 'மாணவர் நியமிப்பு',
      description: 'தானிய காணிக்கையை யெகோவாவின் சந்நிதியில் செலுத்துதல் பற்றிய வாசிப்பு.',
    },
  ],
  ministry: [
    {
      id: 'm-min-1',
      section: 'ministry',
      title: 'கலந்துரையாடலைத் தொடங்குதல்',
      duration: '3 நிமி',
      presenter: 'இரு சகோதரிகள்',
      description: 'துன்பங்கள் ஏன் ஏற்படுகின்றன என்ற மனிதனின் பொதுவான கேள்விக்கு சான்றுகளோடு பேசுதல்.',
      source: 'மாதிரி உரையாடல் காணொளி விவாதம்',
    },
    {
      id: 'm-min-2',
      section: 'ministry',
      title: 'மறுசந்திப்பு செய்தல்',
      duration: '4 நிமி',
      presenter: 'இரு சகோதரர்கள்',
      description: 'முந்தைய விஜயத்தில் ஆர்வம்காட்டிய நபருக்கு கடவுளின் அரசாங்கம் எவ்வாறு நிரந்தர தீர்வு தரும் என்பதை சுருக்கமாக விளக்குதல்.',
      scripture: 'வெளிப்படுத்துதல் 21:3, 4',
    },
    {
      id: 'm-min-3',
      section: 'ministry',
      title: 'சீஷராக்குதல் — பைபிள் படிப்பு நடத்துதல்',
      duration: '5 நிமி',
      presenter: 'சகோதரர்',
      description: 'என்றென்றும் வாழ்ந்து மகிழுங்கள்! சிற்றேடு பாடம் 04: "கடவுளுக்கு ஒரு பெயர் இருக்கிறதா?" என்ற பகுதியை விளக்குதல்.',
      source: 'lffi பாடம் 04',
    },
  ],
  livingSong: {
    number: 78,
    title: 'அர்ப்பணிக்கப்பட்ட இருதயம்',
  },
  living: [
    {
      id: 'm-liv-1',
      section: 'living',
      title: 'உள்ளூர் தேவைகள்: கூட்டங்களில் உற்சாகத்துடன் கலந்துகொள்ளுதல்',
      duration: '15 நிமி',
      presenter: 'சபை ஒருங்கிணைப்பாளர்',
      description: 'குடும்பமாக கூட்டங்களுக்கு சரியான நேரத்தில் வருதல் மற்றும் தயாரிப்போடு பதிலளிப்பதன் ஆசீர்வாதங்கள்.',
      source: 'சபை மூப்பர்கள் குழு',
    },
    {
      id: 'm-liv-2',
      section: 'living',
      title: 'சபை பைபிள் படிப்பு: தூய வழிபாடு புத்தகம்',
      duration: '30 நிமி',
      presenter: 'மூப்பர் & வாசிப்பவர்',
      description: 'அதிகாரம் 12: "யெகோவாவின் மகிமையான ஆலய தரிசனம்", பாராக்கள் 1-9 மற்றும் பக்க பெட்டி 12A.',
      source: 'rr அதி. 12 பாரா 1-9',
      questions: [
        'எசேக்கியேலின் ஆலய தரிசனம் அக்கால சிறைபிடிக்கப்பட்ட யூதர்களுக்கு எவ்வாறு ஆறுதல் அளித்தது?',
        'இன்று நாம் செலுத்தும் தூய வழிபாட்டிற்கு இது எவ்வாறு பொருந்துகிறது?',
      ],
    },
  ],
  concludingSong: {
    number: 139,
    title: 'யெகோவாவின் அன்பை நாளும் போற்றுவோம்',
  },
};

export const SAMPLE_WEEKEND_DATA: WeekendMeetingData = {
  meetingDate: initialDates.weekendMeetingDate,
  publicTalk: {
    song: {
      number: 22,
      title: 'யெகோவாவின் மகிமை வானங்களை எட்டுகிறது',
    },
    title: 'கடவுளுடைய புதிய உலகம்—அதில் யார் வாழ்வார்கள்?',
    speaker: 'சகோ. ஜெ. அருண்குமார்',
    congregation: 'வட சென்னை சபை (விருந்தினர் பேச்சாளர்)',
    scriptures: [
      'வெளிப்படுத்துதல் 21:3, 4',
      'ஏசாயா 65:21-25',
      'சங்கீதம் 37:11, 29',
    ],
    summary: 'கடவுள் மனிதகுலத்திற்காக ஆதியில் வைத்திருந்த பூமி பரதீஸாகும் நோக்கம் விரைவில் நிறைவேறும். நீதிமான்களும் மனத்தாழ்மையுள்ளவர்களும் அதில் என்றென்றும் வாழ்வார்கள் என்று பைபிள் வாக்குறுதி அளிக்கிறது.',
  },
  watchtowerStudy: {
    song: {
      number: 110,
      title: 'தேவனின் வார்த்தை நம் வழிகாட்டி',
    },
    articleTitle: 'யெகோவாவின் அன்பான வழிகாட்டுதலை எப்போதும் நாடுங்கள்',
    themeScripture: 'உன் பாதைகளுக்கு என் வார்த்தையே தீபம், என் பாதைக்கு வெளிச்சம். — சங்கீதம் 119:105',
    paragraphs: [
      {
        paragraphNumber: 1,
        subheading: 'வாழ்க்கையின் முக்கிய முடிவுகள்',
        question: 'வாழ்க்கையில் முக்கியமான முடிவுகளை எடுக்கும்போது நமக்கு யாருடைய வழிநடத்துதல் தேவைப்படுகிறது? ஏன்?',
        scripture: 'எரேமியா 10:23',
        sampleAnswer: 'மனிதனால் தன் காலடிகளை தானே வழிநடத்த முடியாது என்று எரேமியா 10:23 சொல்கிறது. எனவே வானத்தையும் பூமியையும் படைத்த யெகோவாவின் ஞானமுள்ள ஆலோசனைகளே நமக்கு பாதுகாப்பானவை.',
      },
      {
        paragraphNumber: 2,
        subheading: 'வாழ்க்கையின் முக்கிய முடிவுகள்',
        question: 'உலக ரீதியான சுய ஞானத்தை சார்ந்திருப்பது ஏன் ஏமாற்றத்திற்கு வழிவகுக்கும்?',
        scripture: 'நீதிமொழிகள் 14:12',
        sampleAnswer: 'மனித பார்வைக்கு சரியாய் தோன்றுகிற வழிகள் பல சமயங்களில் அழிவுக்கு வழிவகுக்கும். மனிதர்களின் அறிவு குறுகியது; ஆனால் கடவுளின் ஆலோசனைகள் காலங்களை கடந்து மாறாத நன்மை அளிக்கக்கூடியவை.',
      },
      {
        paragraphNumber: 3,
        subheading: 'பைபிள் ஆலோசனைகளின் மதிப்பு',
        question: 'தினமும் பைபிளை வாசிப்பது நம்முடைய சிந்தனையை எவ்வாறு சீராக்குகிறது?',
        scripture: 'யோசுவா 1:8',
        sampleAnswer: 'தினமும் பைபிளை தியானிக்கும்போது யெகோவாவின் சிந்தனையை நாம் பிரதிபலிக்க தொடங்குகிறோம். இதனால் எந்த சூழ்நிலையிலும் விவேகமாகவும் சமாதானமாகவும் செயல்பட முடிகிறது.',
      },
      {
        paragraphNumber: 4,
        subheading: 'பைபிள் ஆலோசனைகளின் மதிப்பு',
        question: 'சங்கீதம் 119:105 குறிப்பிடும் "தீபம்" மற்றும் "வெளிச்சம்" என்பதன் பொருள் என்ன?',
        scripture: 'சங்கீதம் 119:105',
        sampleAnswer: 'தீபம் என்பது நாம் அடுத்து வைக்கும் ஒவ்வொரு அடியையும் தெளிவாகக் காட்டுகிறது; வெளிச்சம் என்பது நாம் செல்ல வேண்டிய எதிர்கால தூரத்துப் பாதையை பிரகாசப்படுத்துகிறது.',
      },
      {
        paragraphNumber: 5,
        subheading: 'முதிர்ச்சியுள்ள கிறிஸ்தவர்களின் ஆலோசனைகள்',
        question: 'சபையிலுள்ள மூப்பர்களின் அன்பான ஆலோசனைகளை நாம் எவ்வாறு மனப்பூர்வமாக ஏற்றுக்கொள்ளலாம்?',
        scripture: 'எபிரெயர் 13:17',
        sampleAnswer: 'மூப்பர்கள் நம் ஆத்துமாக்களுக்காக விழித்திருக்கிறார்கள் என்பதை நினைவில் கொள்ள வேண்டும். அவர்கள் சுட்டிக்காட்டும் வேத ஆலோசனைகள் நமது ஆன்மீக வளர்ச்சிக்காகவே கொடுக்கப்படுகின்றன.',
      },
      {
        paragraphNumber: 6,
        subheading: 'முதிர்ச்சியுள்ள கிறிஸ்தவர்களின் ஆலோசனைகள்',
        question: 'குடும்பத்தில் பெற்றோர் கொடுக்கும் ஆன்மீக வழிகாட்டுதல் பிள்ளைகளுக்கு என்ன பலனைத் தரும்?',
        scripture: 'எபேசியர் 6:1-4',
        sampleAnswer: 'பெற்றோர் யெகோவாவின் வழியில் பிள்ளைகளை வளர்க்கும்போது, பிள்ளைகள் இளம் வயதிலிருந்தே சரியான தீர்மானங்களை எடுக்கவும் ஆன்மீக பாதுகாப்பை பெறவும் முடிகிறது.',
      },
    ],
    concludingSong: {
      number: 85,
      title: 'உண்மையோடு யெகோவாவுடன் நடப்போம்',
    },
  },
};

export const INITIAL_SAVED_ANSWERS: SavedAnswer[] = [
  {
    id: 'ans-1',
    meetingType: 'weekend',
    sectionLabel: 'காவற்கோபுர படிப்பு',
    itemReference: 'பாரா 4',
    question: 'சங்கீதம் 119:105 குறிப்பிடும் "தீபம்" மற்றும் "வெளிச்சம்" என்பதன் பொருள் என்ன?',
    answerText: 'தீபம் என்பது நம்முடைய உடனடி அன்றாட முடிவுகளுக்கு வழிகாட்டுகிறது; வெளிச்சம் என்பது எதிர்காலத்தை பற்றிய தெளிவான நம்பிக்கையை அளிக்கிறது. யெகோவாவின் வார்த்தை இருண்ட இந்த உலகத்தில் நமக்கு தெளிவான வழியை காண்பிக்கிறது.',
    scripture: 'சங்கீதம் 119:105; 2 பேதுரு 1:19',
    updatedAt: 'மார்ச் 5, 2026',
    isFavorite: true,
  },
  {
    id: 'ans-2',
    meetingType: 'midweek',
    sectionLabel: 'ஆன்மீகப் புதையல்கள்',
    itemReference: 'லேவியராகமம் 1:3',
    question: 'பலி குறைபாடற்றதாக இருக்க வேண்டும் என்பது நம்முடைய சேவைக்கு எவ்வாறு பொருந்துகிறது?',
    answerText: 'இஸ்ரவேலர்கள் பலிகளை கொடுத்தபோது சிறந்ததை யெகோவாவுக்கு கொடுத்தார்கள். இன்று நாமும் நமது நேரம், பலம் மற்றும் திறமைகளில் மீதியை அல்லாமல் முதலிடத்தை யெகோவாவின் வழிபாட்டிற்கு அர்ப்பணிக்க வேண்டும்.',
    scripture: 'லேவியராகமம் 1:3; கொலோசெயர் 3:23',
    updatedAt: 'மார்ச் 4, 2026',
    isFavorite: true,
  },
  {
    id: 'ans-3',
    meetingType: 'midweek',
    sectionLabel: 'சபை பைபிள் படிப்பு',
    itemReference: 'தூய வழிபாடு அதி. 12 பாரா 3',
    question: 'எசேக்கியேலின் ஆலய தரிசனம் நமக்கு என்ன பாடத்தை கற்பிக்கிறது?',
    answerText: 'தூய வழிபாட்டிற்கு நாம் கொடுக்கும் முக்கியத்துவத்தை இது சுட்டிக்காட்டுகிறது. நமது சபை கூட்டங்கள் மற்றும் வழிபாட்டின் பரிசுத்த தராதரங்களை நாம் எப்போதும் உயர்வாக மதிக்க வேண்டும்.',
    scripture: 'எசேக்கியேல் 40:4',
    updatedAt: 'மார்ச் 3, 2026',
    isFavorite: false,
  },
  {
    id: 'ans-4',
    meetingType: 'weekend',
    sectionLabel: 'பொதுப் பேச்சு குறிப்புகள்',
    itemReference: 'வெளிப்படுத்துதல் 21:3, 4',
    question: 'புதிய உலகத்தில் மனிதகுலத்திற்கான கடவுளின் வாக்குறுதி என்ன?',
    answerText: 'கண்ணீர், மரணம், துக்கம், அலறுதல் ஆகியவை இனி இராது. முந்தைய காரியங்கள் ஒழிந்துபோம் என்று கடவுளே உறுதியளிக்கிறார்.',
    scripture: 'வெளிப்படுத்துதல் 21:3, 4',
    updatedAt: 'மார்ச் 2, 2026',
    isFavorite: false,
  },
];

