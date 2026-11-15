import { AnswerPresentation, ScriptureApplication } from '@/types/answer';
import { getQuestionById } from '@/data/meetingService';
import { answerApiService } from './api/answerApi';
import { AnswerGenerateResponse } from '@/types/api';

// Pre-crafted authentic Tamil answer presentations with multiple perspectives
const MOCK_PRESENTATIONS: Record<string, AnswerPresentation> = {
  // 1. Watchtower Study: Paragraph 1
  'wt-q-1': {
    id: 'ans-pres-wt-1',
    questionId: 'wt-q-1',
    meetingType: 'weekend',
    sectionTitle: 'காவற்கோபுர படிப்பு',
    partTitle: 'யெகோவாவின் அன்பான வழிகாட்டுதலை எப்போதும் நாடுங்கள்',
    questionNumberLabel: 'பாரா 1 கேள்வி',
    questionText: 'வாழ்க்கையில் முக்கியமான முடிவுகளை எடுக்கும்போது நமக்கு யாருடைய வழிநடத்துதல் தேவைப்படுகிறது? ஏன்?',
    sourceReference: 'காவற்கோபுரம் மார்ச் 2026, பக். 12, பாரா 1',
    themeScripture: 'சங்கீதம் 119:105',
    paragraphText:
      'வாழ்க்கைப் பாதையில் நாம் ஒவ்வொரு நாளும் எண்ணற்ற முடிவுகளை எடுக்க வேண்டியுள்ளது. வேலைவாய்ப்பு, திருமணம், பிள்ளைகளின் கல்வி அல்லது உடல்நலப் பராமரிப்பு போன்ற தீர்மானங்கள் நம் எதிர்காலத்தையே மாற்றியமைக்கக்கூடும். எரேமியா 10:23-ல் தீர்க்கதரிசி எழுதியதுபோல, "மனிதனுடைய வழி அவனுடைய அதிகாரத்தில் இல்லை என்றும், தன் காலடிகளை வழிநடத்துவது நடக்கிறவனாலே ஆகிறதல்ல என்றும்" வேதம் நமக்கு எச்சரிக்கிறது.',
    scriptures: [
      {
        citation: 'எரேமியா 10:23',
        verseText: 'யெகோவாவே, மனுஷனுடைய வழி அவனாலே ஆகிறதல்லவென்றும், தன் காலடிகளை நடத்துவது நடக்கிறவனாலே ஆகிறதல்லவென்றும் நான் அறிவேன்.',
        contextNote: 'மனிதனுக்கு கடவுளின் வழிநடத்துதல் தேவை.',
        howToApply: 'மனிதன் எதிர்காலத்தை அறியாதவன்; எனவே படைப்பாளரின் ஆலோசனையே நமக்கு பாதுகாப்பானது என்பதை வலியுறுத்தி இக்குறிப்பை சொல்லலாம்.',
      },
      {
        citation: 'நீதிமொழிகள் 3:5, 6',
        verseText: 'உன் சுயபுத்தியின்மேல் சாயாமல், உன் முழு இருதயத்தோடும் யெகோவாவில் நம்பிக்கையாயிரு; உன் வழிகளிலெல்லாம் அவரை நினைத்துக்கொள், அப்பொழுது அவர் உன் பாதைகளைச் செவ்வைப்படுத்துவார்.',
        contextNote: 'முழு இருதயத்தோடு கடவுளை நம்புதல்.',
        howToApply: 'தனிப்பட்ட முடிவுகளை எடுக்கும்போது ஜெபத்திலும் வேத வாசிப்பிலும் யெகோவாவை நாடுவது அவசியமென குறிப்பிடலாம்.',
      },
    ],
    activeVariantIndex: 0,
    variants: [
      {
        id: 'wt1-v1',
        label: 'பதிப்பு 1: நேரடி பதில் (~30 வினாடி)',
        shortAnswer:
          'வாழ்க்கையில் முக்கியமான முடிவுகளை எடுக்கும்போது நமக்கு யெகோவா தேவனுடைய வழிநடத்துதல் மட்டுமே தேவைப்படுகிறது. எரேமியா 10:23 சொல்கிறபடி, மனிதனால் தன் காலடிகளை சுயமாக பாதுகாப்பாக வழிநடத்த முடியாது; எதிர்காலத்தை அறிந்த கடவுளின் ஞானமே நமக்கு பாதுகாப்பானது.',
        detailedAnswer:
          'வாழ்க்கையில் வேலை, திருமணம் அல்லது குடும்ப பொறுப்புகள் போன்ற முக்கியமான முடிவுகளை எடுக்கும்போது நமக்கு படைப்பாளராகிய யெகோவாவின் அன்பான வழிநடத்துதல் அவசியமாகிறது. மனிதனுடைய ஞானம் குறுகியது, ஒரு முடிவின் எதிர்கால விளைவுகளை மனிதனால் முன்கூட்டியே கணிக்க முடியாது. எரேமியா 10:23 தெளிவுபடுத்துவதுபோல, தன் காலடிகளை செவ்வையாக நடத்துவது மனிதனால் ஆகிறதல்ல. எனவே பைபிளிலுள்ள பரிசுத்த ஆலோசனைகளை நாடி முடிவெடுக்கும்போது நாம் ஏமாற்றத்திலிருந்தும் விபரீதங்களிலிருந்தும் பாதுகாக்கப்படுகிறோம்.',
        keyApplication: 'சுயபுத்தியை சாராமல் எப்போதும் கடவுளின் வார்த்தையை முதலில் நாடுங்கள்.',
      },
      {
        id: 'wt1-v2',
        label: 'பதிப்பு 2: நடைமுறை குடும்ப பயன்பாடு',
        shortAnswer:
          'பிள்ளைகளின் கல்வி, வேலை போன்ற தீர்மானங்களில் மனித சிந்தனை உலகப் போக்கை நோக்கி இழுக்கலாம். ஆனால் யெகோவாவின் வார்த்தையை நாடும்போது, குடும்பத்தின் ஆன்மீக நலனையே முதலிடத்தில் வைத்து சரியான முடிவெடுக்க முடிகிறது.',
        detailedAnswer:
          'இன்றைய சமுதாயத்தில் உலக சிந்தனைகள் பணத்திற்கும் அந்தஸ்திற்கும் முதலிடம் கொடுக்க தூண்டுகின்றன. ஆனால் கிறிஸ்தவ குடும்பங்கள் எந்த முடிவையும் எடுப்பதற்கு முன்பாக ஜெபத்தில் யெகோவாவை அணுகி, பைபிள் நியமங்களை ஆராய வேண்டும். நீதிமொழிகள் 3:6-ல் உள்ளபடி எல்லா வழிகளிலும் அவரை நினைத்துக்கொள்ளும்போது, அவர் நம் குடும்பப் பாதைகளை ஆசீர்வதித்து செவ்வைப்படுத்துவார்.',
        keyApplication: 'குடும்ப முடிவுகளில் ஆன்மீக இலக்குகளுக்கு முதலிடம் கொடுங்கள்.',
      },
      {
        id: 'wt1-v3',
        label: 'பதிப்பு 3: வேத வசன ஆய்வு',
        shortAnswer:
          'எரேமியா 10:23 மனிதனின் இயலாமையை சுட்டிக்காட்டுகிறது. அதேநேரம் நீதிமொழிகள் 3:5 சுயபுத்தியின்மேல் சாயக்கூடாது என்று எச்சரிக்கிறது. இவ்விரு வசனங்களும் யெகோவாவின் வழிநடத்துதலே ஒப்பற்ற பாதுகாப்பு என்பதை நிரூபிக்கின்றன.',
        detailedAnswer:
          'பைபிள் வரலாற்றில் சுயமாக முடிவெடுத்த பலர் பெரும் இழப்புகளை சந்தித்தார்கள். ஆனால் யெகோவாவை முழுமையாக நம்பிய யோசுவா மற்றும் தாவீது போன்றோர் வெற்றிகரமான பாதையில் நடந்தார்கள். எரேமியா தீர்க்கதரிசி உணர்ந்த அதே உண்மையை நாமும் உணர்ந்து, நமது எல்லா முக்கிய தீர்மானங்களிலும் வேதத்தின் ஆலோசனையையே நங்கூரமாக கொள்ள வேண்டும்.',
        keyApplication: 'வேதப்பூர்வ உதாரணங்கள் கடவுளின் வழிகாட்டலின் மேன்மையை நிரூபிக்கின்றன.',
      },
    ],
  },

  // 2. Watchtower Study: Paragraph 4
  'wt-q-4': {
    id: 'ans-pres-wt-4',
    questionId: 'wt-q-4',
    meetingType: 'weekend',
    sectionTitle: 'காவற்கோபுர படிப்பு',
    partTitle: 'யெகோவாவின் அன்பான வழிகாட்டுதலை எப்போதும் நாடுங்கள்',
    questionNumberLabel: 'பாரா 4 கேள்வி',
    questionText: 'சங்கீதம் 119:105 குறிப்பிடும் "தீபம்" மற்றும் "வெளிச்சம்" என்பதன் அர்த்தம் என்ன?',
    sourceReference: 'காவற்கோபுரம் மார்ச் 2026, பக். 13, பாரா 4',
    themeScripture: 'சங்கீதம் 119:105',
    paragraphText:
      'சங்கீதக்காரன் அழகாக பாடினார்: "உன் பாதைகளுக்கு என் வார்த்தையே தீபம், என் பாதைக்கு வெளிச்சம்." ஒரு மனிதன் காரிருளில் ஒரு ஒற்றையடிப் பாதையில் நடக்கும்போது அவனது கையில் இருக்கும் சிறிய விளக்கு அல்லது தீபம், அவன் அடுத்து வைக்கப்போகும் அடியை கற்களிலும் குழிகளிலும் இடறாமல் பார்க்க உதவுகிறது. அதே நேரத்தில், அது அவன் செல்ல வேண்டிய நீண்ட தூரத்துப் பாதையையும் பிரகாசப்படுத்துகிறது.',
    scriptures: [
      {
        citation: 'சங்கீதம் 119:105',
        verseText: 'உம்முடைய வசனம் என் கால்களுக்குத் தீபமும், என் பாதைக்கு வெளிச்சமுமாயிருக்கிறது.',
        contextNote: 'தீபமும் வெளிச்சமும் பற்றிய சங்கீதம்.',
        howToApply: 'தீபம் என்பது உடனடி முடிவுகளுக்கும், வெளிச்சம் என்பது எதிர்கால நம்பிக்கைக்கும் உதவுகிறது என்பதை சுருக்கமாக விளக்கலாம்.',
      },
      {
        citation: '2 பேதுரு 1:19',
        verseText: 'அதிக உறுதியான தீர்க்கதரிசன வசனமும் நமக்கு உண்டு; பொழுது விடிந்து விடிவெள்ளி உங்கள் இருதயங்களில் உதிக்கும் வரைக்கும், இருளுள்ள ஸ்தலத்திலே பிரகாசிக்கிற விளக்கைப் போன்ற அவ்வசனத்தைக் கவனித்திருப்பது நலமாயிருக்கும்.',
        contextNote: 'இருளுள்ள இடத்தில் பிரகாசிக்கும் விளக்கு.',
        howToApply: 'தீர்க்கதரிசனங்கள் எதிர்காலத்தை தெளிவாக விளக்குவதை சுட்டிக்காட்டலாம்.',
      },
    ],
    activeVariantIndex: 0,
    variants: [
      {
        id: 'wt4-v1',
        label: 'பதிப்பு 1: நேரடி விளக்கம் (~30 வினாடி)',
        shortAnswer:
          '"தீபம்" என்பது நாம் அடுத்து வைக்கும் ஒவ்வொரு அடியையும் கற்களில் இடறாமல் காட்டுகிறது; அதாவது நமது உடனடி அன்றாட முடிவுகளுக்கு உதவுகிறது. "வெளிச்சம்" என்பது நாம் செல்ல வேண்டிய எதிர்கால தூரத்துப் பாதையை பிரகாசப்படுத்துகிறது; அதாவது கடவுளின் புதிய உலக நம்பிக்கையை காட்டுகிறது.',
        detailedAnswer:
          'சங்கீதம் 119:105-ல் உள்ள அழகிய உருவகத்தின்படி, இருண்ட இரவில் நடப்பவனுக்கு கையில் இருக்கும் சிறிய தீபம் அவன் உடனடி அடுத்த அடியை பாறைகளிலும் குழிகளிலும் இடறாமல் எடுத்துவைக்க வழிகாட்டுகிறது. அதுபோலவே பைபிள் கொள்கைகள் நமது அன்றாட ஒழுக்க ரீதியான மற்றும் குடும்ப முடிவுகளுக்கு தீபமாக உள்ளன. அதேநேரத்தில் "வெளிச்சம்" என்பது முழு பாதையையும் விளக்குகிறது; அதாவது எதிர்காலத்தில் பரதீஸ் பூமி பற்றிய தீர்க்கதரிசனங்களை விளக்கி நமக்கு உறுதியான நம்பிக்கையை அளிக்கிறது.',
        keyApplication: 'அன்றாட முடிவுகளுக்கும் எதிர்கால நம்பிக்கைக்கும் பைபிளே சிறந்த வழிகாட்டி.',
      },
      {
        id: 'wt4-v2',
        label: 'பதிப்பு 2: நடைமுறை உதாரண விளக்கம்',
        shortAnswer:
          'இருட்டான மலைப்பாதையில் கைவிளக்கு இல்லாமல் நடந்தால் ஆபத்து நிச்சயம். அதேபோல இருண்ட இந்த உலகத்தில் கடவுளுடைய வார்த்தையாகிய விளக்கு இல்லாமல் வாழ்ந்தால் தார்மீக ரீதியில் இடறி விழுந்துவிடுவோம்.',
        detailedAnswer:
          'இன்றைய உலகம் ஒழுக்க ரீதியிலும் ஆன்மீக ரீதியிலும் காரிருளில் மூழ்கியுள்ளது. நாம் தவறி விழுந்துவிடாதபடி பைபிள் நம் பாதைகளுக்கு தீபமாக இருந்து உடனடி ஆபத்துகளை வெளிச்சம் போட்டுக் காட்டுகிறது. மேலும் 2 பேதுரு 1:19 குறிப்பிடுவதுபோல, தீர்க்கதரிசனங்கள் விடியற்கால வெளிச்சம்போல நம் இருதயங்களை பிரகாசமாக்குகின்றன. இதன்மூலம் தற்காலிக கவலைகளை கடந்து எதிர்கால பரதீஸை நோக்கி நம்பிக்கையுடன் நடைபோட முடிகிறது.',
        keyApplication: 'உலகத்தின் இருளில் கடவுளின் வார்த்தையே நம்மை இடறாமல் பாதுகாக்கும் தீபம்.',
      },
      {
        id: 'wt4-v3',
        label: 'பதிப்பு 3: ஆன்மீக தியானப் பார்வை',
        shortAnswer:
          'தினமும் வேதத்தை வாசித்து கீழ்ப்படியும்போது இந்த தீபத்தின் வெளிச்சம் நம்முடன் பயணிக்கிறது. கடவுளுடைய வார்த்தை நம் சிந்தனையை சீராக்கி சரியான திசையில் பயணிக்க வைக்கிறது.',
        detailedAnswer:
          'ஒரு தீபத்தை கையில் ஏந்தியிருப்பவன் மட்டுமே அதன் வெளிச்சத்தை அனுபவிக்க முடியும்; அதை வீட்டில் வைத்துவிட்டு வந்தால் பயன் தராது. அதுபோலவே பைபிளை வெறுமனே வீட்டில் வைத்திருப்பது போதாது; அதை தினமும் வாசித்து தியானித்து நம் வாழ்க்கைப் பாதையில் செயல்படுத்தும்போது மட்டுமே அது மெய்யான தீபமாகவும் வெளிச்சமாகவும் செயல்படும்.',
        keyApplication: 'வேத வாசிப்பை தினசரி பழக்கமாக்குங்கள்.',
      },
    ],
  },

  // 3. Midweek: Treasures Question 1
  'mid-treasures-q1': {
    id: 'ans-pres-mid-1',
    questionId: 'mid-treasures-q1',
    meetingType: 'midweek',
    sectionTitle: 'கடவுளுடைய வார்த்தையிலுள்ள புதையல்கள்',
    partTitle: 'பலியிடுதலின் முக்கியத்துவம் மற்றும் அதன் ஆழமான பாடம்',
    questionNumberLabel: 'கேள்வி 1',
    questionText: 'இஸ்ரவேலர்கள் பலிகளை முழுமனதுடன் செலுத்த வேண்டும் என்ற கட்டளை நமக்கு எதை போதிக்கிறது?',
    sourceReference: 'w24.01 பக். 14 பாரா 5-6; லேவியராகமம் 1:1-9',
    themeScripture: 'ரோமர் 12:1',
    paragraphText:
      'பண்டைய இஸ்ரவேலில் ஒரு நபர் யெகோவாவிற்கு பலி செலுத்தும்போது, தனது மந்தையிலிருந்து பழுதற்ற, மிகச் சிறந்த மிருகத்தையே தெரிவு செய்ய வேண்டும் என்று நியாயப்பிரமாணம் தெளிவாக கட்டளையிட்டது. யெகோவா தமக்கு செலுத்தப்படும் பலியின் வெளிப்புற தோற்றத்தை மட்டுமல்ல, அதை செலுத்துபவரின் உள்நோக்கத்தையும் மதித்தார்.',
    scriptures: [
      {
        citation: 'லேவியராகமம் 1:3',
        verseText: 'அவன் செலுத்தும் தகனபலி மாட்டு மந்தையிலிருந்து எடுக்கப்பட்டால், அது பழுதற்ற கிடாவாயிருக்க வேண்டும்; அவன் யெகோவாவின் சந்நிதியில் அங்கீகரிக்கப்படும்படி, அதை ஆசரிப்புக் கூடார வாசலுக்கு முன்பாகக் கொண்டுவர வேண்டும்.',
        contextNote: 'பலி பழுதற்றதாக இருத்தல்.',
        howToApply: 'நாம் கடவுளுக்கு கொடுக்கும் சேவை குறைபாடற்றதாக இருக்க வேண்டும் என சுருக்கமாக விவரிக்கலாம்.',
      },
      {
        citation: 'ரோமர் 12:1',
        verseText: 'சகோதரர்களே... நீங்கள் உங்கள் சரீரங்களை தேவனுக்குப் பிரியமானதும் பரிசுத்தமுமான ஜீவபலியாக ஒப்புக்கொடுக்க வேண்டும்; இதுவே நீங்கள் செய்யும் புத்திபூர்வமான ஆராதனை.',
        contextNote: 'ஜீவபலி ஒப்புக்கொடுத்தல்.',
        howToApply: 'நம்முடைய முழு ஆற்றலையும் கடவுளுக்கு கொடுப்பதே கிறிஸ்தவ பலி என்பதை குறிப்பிடலாம்.',
      },
    ],
    activeVariantIndex: 0,
    variants: [
      {
        id: 'mt1-v1',
        label: 'பதிப்பு 1: நேரடி பதில் (~30 வினாடி)',
        shortAnswer:
          'இஸ்ரவேலர்கள் தங்கள் மந்தையிலிருந்து பழுதற்ற, சிறந்த மிருகத்தையே பலியாக கொண்டுவர வேண்டும் என்று யெகோவா எதிர்பார்த்தார். அதேபோல நாமும் நமது நேரம், பலம் மற்றும் திறமைகளில் மீதியை அல்லாமல், சிறந்த முதலிடத்தை யெகோவாவின் தூய வழிபாட்டிற்கு முழுமனதோடு கொடுக்க வேண்டும் என்பதை இது போதிக்கிறது.',
        detailedAnswer:
          'பண்டைய இஸ்ரவேலில் நோயுற்ற அல்லது குருடான மிருகங்களை பலிபீடத்தில் செலுத்துவது யெகோவாவை அவமதிப்பதாக கருதப்பட்டது. அவர் தமக்கு மிகச் சிறந்த அர்ப்பணிப்பையே தகுதியானதாக ஏற்றுக்கொண்டார். இன்று நாம் மிருக பலிகளை செலுத்துவதில்லை என்றாலும், ரோமர் 12:1-ல் கூறியபடி நம்முடைய வாழ்க்கையையே ஜீவபலியாக ஒப்புக்கொடுக்கிறோம். நமது இளமை, ஓய்வு நேரம் மற்றும் சிறந்த ஆற்றலை யெகோவாவின் சேவைக்கும் கூட்ட தயாரிப்பிற்கும் கொடுக்கும்போது நாம் முழுமனதான பலியை செலுத்துகிறோம்.',
        keyApplication: 'மீதமுள்ள நேரத்தை அல்ல, மிகச் சிறந்த நேரத்தை யெகோவாவுக்கு கொடுப்போம்.',
      },
      {
        id: 'mt1-v2',
        label: 'பதிப்பு 2: சபை மற்றும் ஊழிய பயன்பாடு',
        shortAnswer:
          'சபை கூட்டங்களுக்கு சரியான நேரத்தில் வருவதும், நன்கு தயாரித்து மனப்பூர்வமாக பதிலளிப்பதும் நாம் யெகோவாவின் பலிபீடத்திற்கு கொண்டுவரும் தூய துதிபலிகளாகும்.',
        detailedAnswer:
          'எபிரெயர் 13:15 குறிப்பிடுவதுபோல நமது உதடுகளின் கனியாகிய ஸ்தோத்திர பலியை நாம் யெகோவாவுக்கு செலுத்துகிறோம். கூட்டங்களில் நாம் சொல்லும் ஒரு நல்ல பதில் பலருக்கு உற்சாகத்தை அளிக்கிறது. நாம் அரைகுறையாக தயாரிக்காமல், ஆழமாக தியானித்து சிறந்த பதிலை கொடுக்கும்போது யெகோவாவின் நாமம் மகிமைப்படுகிறது.',
        keyApplication: 'கூட்டங்களில் தயாரிப்போடு பதிலளிப்பது சிறந்த துதி பலியாகும்.',
      },
    ],
  },
};

// Fallback presentation generator
const generateFallbackPresentation = (questionId: string): AnswerPresentation => {
  const q = getQuestionById(questionId);
  const qText = q ? q.questionText : 'கூட்டத்தில் கேட்கப்படும் கேள்வி';
  const qNum = q ? q.questionNumberLabel : 'கேள்வி';
  const sec = q ? q.sectionTitle : 'கூட்டம்';
  const part = q ? q.partTitle : 'பகுதி';
  const src = q ? q.sourceReference : 'சபை வெளியீடு';
  const para = q ? q.paragraphText : undefined;

  const scriptures: ScriptureApplication[] =
    q && q.scriptures && q.scriptures.length > 0
      ? q.scriptures.map(s => ({
          ...s,
          howToApply: 'இவ்வசனத்தை வாசித்து முக்கிய வார்த்தைகளை விளக்குவது சபைக்கு உற்சாகமளிக்கும்.',
        }))
      : [
          {
            citation: 'சங்கீதம் 119:105',
            verseText: 'உம்முடைய வசனம் என் கால்களுக்குத் தீபமும், என் பாதைக்கு வெளிச்சமுமாயிருக்கிறது.',
            contextNote: 'வழிகாட்டும் வார்த்தை.',
            howToApply: 'கடவுளின் வழிகாட்டுதல் நம் அன்றாட முடிவுகளுக்கு பாதுகாப்பு என்பதை சுட்டிக்காட்டலாம்.',
          },
        ];

  return {
    id: `ans-pres-${questionId}`,
    questionId,
    meetingType: q?.meetingType || 'weekend',
    sectionTitle: sec,
    partTitle: part,
    questionNumberLabel: qNum,
    questionText: qText,
    sourceReference: src,
    paragraphText: para,
    scriptures,
    activeVariantIndex: 0,
    variants: [
      {
        id: `${questionId}-v1`,
        label: 'பதிப்பு 1: நேரடி பதில் (~30 வினாடி)',
        shortAnswer: `${qText} என்ற கேள்விக்கு வேதாகமத்தின்படி யெகோவாவின் நீதியான வழிகாட்டுதல்களை முழுமனதோடு பின்பற்றுவதே அமைதியையும் ஆசீர்வாதத்தையும் தரும்.`,
        detailedAnswer: `இக்கேள்விக்கு நாம் பதிலளிக்கும்போது, பைபிள் கொள்கைகளை நமது அன்றாட சிந்தனையோடும் வாழ்க்கை சூழலோடும் இணைத்துப் பார்ப்பது அவசியமாகும். வேதம் குறிப்பிடும் ஆலோசனைகள் காலங்களை கடந்து மாறாத நன்மை அளிக்கக்கூடியவை. இக்கொள்கைகளை விசுவாசத்தோடு கடைப்பிடிக்கும்போது நமது விசுவாசம் பலப்படும்.`,
        keyApplication: 'வேத ஆலோசனைகளை எப்போதும் முதலாவதாகக் கடைப்பிடியுங்கள்.',
      },
      {
        id: `${questionId}-v2`,
        label: 'பதிப்பு 2: நடைமுறை பயன்பாடு',
        shortAnswer:
          'நமது சொந்த வாழ்க்கையில் இக்கொள்கையை பயன்படுத்திய அனுபவங்கள் யெகோவாவின் வாக்குறுதிகள் எவ்வளவு உண்மையானவை என்பதை நிரூபிக்கின்றன.',
        detailedAnswer:
          'சோதனையான நேரங்களிலும் கடவுளின் வழிகாட்டுதலுக்கு கீழ்ப்படியும்போது நாம் அனுபவிக்கும் மனசமாதானம் உலகத்தால் தர முடியாதது. சபையிலுள்ள சகோதர சகோதரிகளுக்கும் இது பெரும் உற்சாகத்தை அளிக்கும்.',
        keyApplication: 'கீழ்ப்படிதல் எப்போதும் அமைதியைத் தரும்.',
      },
    ],
  };
};

/**
 * Transforms a backend AI AnswerGenerateResponse into an AnswerPresentation
 */
const buildPresentationFromApiResponse = (
  questionId: string,
  res: AnswerGenerateResponse
): AnswerPresentation => {
  const q = getQuestionById(questionId);
  const qText = q ? q.questionText : 'கேள்வி';
  const qNum = q ? q.questionNumberLabel : 'கேள்வி';
  const sec = q ? q.sectionTitle : 'சபை கூட்டம்';
  const part = q ? q.partTitle : 'பகுதி விவரம்';

  // Extract source reference
  const topSource = res.sources && res.sources.length > 0 ? res.sources[0] : null;
  const sourceRef = topSource
    ? `${topSource.source_title}${topSource.paragraph_reference ? ` • ${topSource.paragraph_reference}` : ''}`
    : q?.sourceReference || 'சபை வெளியீடு & வேதாகமம்';

  // Map sources to ScriptureApplications
  const scriptures: ScriptureApplication[] = (res.sources || []).slice(0, 3).map(s => ({
    citation: s.source_title,
    verseText: s.content_snippet,
    contextNote: s.paragraph_reference ? `குறிப்பு: ${s.paragraph_reference}` : undefined,
    howToApply: `பொருத்தம்: ${Math.round(s.relevance_score * 100)}% நம்பகமான மேற்கோள்.`,
  }));

  if (scriptures.length === 0) {
    scriptures.push({
      citation: 'வேத ஆலோசனை',
      verseText: 'கடவுளின் வார்த்தை நமது கால்களுக்குத் தீபமும் பாதைக்கு வெளிச்சமுமாய் இருக்கிறது.',
      howToApply: 'கூட்டத்தில் இக்கருத்தை சுருக்கமாக மேற்கோள் காட்டலாம்.',
    });
  }

  // Generate answer variants from the generated text
  const directShort = res.answer;
  const detailedText =
    res.answer_type === 'detailed'
      ? res.answer
      : `${res.answer} மேலும், இதனை நாம் அன்றாட வாழ்க்கையில் செயல்படுத்தும்போது குடும்ப சமாதானமும் ஆன்மீக ஆசீர்வாதமும் பெருகும்.`;

  return {
    id: `live-ans-${questionId}-${Date.now()}`,
    questionId,
    meetingType: q?.meetingType || 'weekend',
    sectionTitle: sec,
    partTitle: part,
    questionNumberLabel: qNum,
    questionText: qText,
    sourceReference: sourceRef,
    paragraphText: topSource?.content_snippet || q?.paragraphText,
    scriptures,
    activeVariantIndex: 0,
    variants: [
      {
        id: `v-direct`,
        label: 'பதிப்பு 1: நேரடி பதில் (~30 வினாடி)',
        shortAnswer: directShort,
        detailedAnswer: detailedText,
        keyApplication: 'வேதப்பூர்வ ஆலோசனைகளை முதலில் வாழ்க்கையில் கடைப்பிடிப்போம்.',
      },
      {
        id: `v-application`,
        label: 'பதிப்பு 2: நடைமுறை பயன்பாட்டு பதில்',
        shortAnswer: `${directShort} இது நமது குடும்ப முடிவுகளிலும் அன்றாட பணிகளிலும் யெகோவாவை முதலிடத்தில் வைக்க உதவுகிறது.`,
        detailedAnswer: detailedText,
        keyApplication: 'குடும்பத்திலும் ஊழியத்திலும் இக்கொள்கையை செயல்படுத்துவோம்.',
      },
    ],
  };
};

class AnswerService {
  /**
   * Retrieves an answer presentation for a given question ID.
   * Prioritizes the backend Groq/RAG API and seamlessly falls back to
   * authentic pre-crafted answers when offline.
   */
  async getAnswerByQuestionId(
    questionId: string,
    options?:
      | {
          answerType?: 'short' | 'detailed';
          simulateError?: boolean;
        }
      | boolean
  ): Promise<AnswerPresentation> {
    const isErrorSimulated =
      typeof options === 'boolean' ? options : options?.simulateError;
    const answerType =
      typeof options === 'object' && options?.answerType
        ? options.answerType
        : 'short';

    if (isErrorSimulated) {
      throw new Error(
        'பதில் விவரங்களை ஏற்றுவதில் பிழை ஏற்பட்டது. இணைய இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
      );
    }

    const q = getQuestionById(questionId);

    // Try live backend generation
    try {
      let apiResponse: AnswerGenerateResponse | null = null;

      // If questionId looks like a SQLite UUID
      if (questionId.length > 20 && questionId.includes('-')) {
        apiResponse = await answerApiService.generateForQuestion(questionId, {
          answerType,
        });
      } else if (q) {
        // Query by text for preset sample questions
        apiResponse = await answerApiService.generateAnswer({
          question: q.questionText,
          answer_type: answerType,
          save_answer: false,
          save_to_history: true,
        });
      }

      if (apiResponse && apiResponse.answer) {
        return buildPresentationFromApiResponse(questionId, apiResponse);
      }
    } catch (err: any) {
      console.warn(
        `Backend answer generation unavailable for question ${questionId}, using local fallback:`,
        err?.message || err
      );
    }

    // Fallback to pre-crafted mock answers
    const existing = MOCK_PRESENTATIONS[questionId];
    if (existing) {
      return { ...existing };
    }

    return generateFallbackPresentation(questionId);
  }

  /**
   * Regenerates an answer presentation with alternate perspective or instructions.
   */
  async regenerateAnswer(
    questionId: string,
    currentVariantIndex: number,
    simulateError: boolean = false
  ): Promise<AnswerPresentation> {
    if (simulateError) {
      throw new Error(
        'மாற்று பதில் உருவாக்குவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
      );
    }

    const q = getQuestionById(questionId);

    // Try backend regeneration
    try {
      const qText = q ? q.questionText : 'கூட்ட கேள்வி';
      const response = await answerApiService.generateAnswer({
        question: qText,
        answer_type: currentVariantIndex === 0 ? 'detailed' : 'short',
        custom_instructions:
          'முந்தைய பதிலிலிருந்து மாறுபட்ட ஒரு புதிய பயன்பாட்டு கோணத்தில் இயற்கை தமிழில் பதிலளிக்கவும்.',
        save_answer: false,
        save_to_history: true,
      });

      if (response && response.answer) {
        const pres = buildPresentationFromApiResponse(questionId, response);
        pres.activeVariantIndex = (currentVariantIndex + 1) % pres.variants.length;
        return pres;
      }
    } catch (err) {
      console.warn('Backend regenerate failed, cycling local variants:', err);
    }

    // Local fallback: cycle variant index
    const presentation =
      MOCK_PRESENTATIONS[questionId] || generateFallbackPresentation(questionId);

    const nextIndex = (currentVariantIndex + 1) % presentation.variants.length;

    return {
      ...presentation,
      activeVariantIndex: nextIndex,
    };
  }

  /**
   * Generates a conversational Tamil answer for an independent question.
   */
  async generateIndependentAnswer(
    question: string,
    answerType: 'short' | 'detailed' = 'short'
  ): Promise<AnswerGenerateResponse> {
    return answerApiService.askIndependentQuestion(question, {
      answerType,
      saveToHistory: true,
    });
  }
}

// Export singleton instance
export const answerService = new AnswerService();
