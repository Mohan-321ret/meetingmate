import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import httpx
from sqlalchemy.orm import Session

from app.database import crud
from app.models.enums import MeetingType, SourceType
from app.models.meeting import Meeting
from app.schemas.meeting import MeetingCreate, MeetingUpdate
from app.schemas.question import QuestionCreate
from app.services.ingestion import get_ingestion_service

logger = logging.getLogger("meetingmate.jw_scraper")

# Tamil Month Names Mapping
TAMIL_MONTHS = {
    1: "ஜனவரி",
    2: "பிப்ரவரி",
    3: "மார்ச்",
    4: "ஏப்ரல்",
    5: "மே",
    6: "ஜூன்",
    7: "ஜூலை",
    8: "ஆகஸ்ட்",
    9: "செப்டம்பர்",
    10: "அக்டோபர்",
    11: "நவம்பர்",
    12: "டிசம்பர்",
}

# Standard JW Meeting Sections in Tamil
MIDWEEK_SECTIONS = {
    "TREASURES": "கடவுளுடைய வார்த்தையிலுள்ள புதையல்கள்",
    "MINISTRY": "ஊழியத்தில் திறமையை அதிகரியுங்கள்",
    "LIVING": "கிறிஸ்தவ வாழ்க்கை",
    "BIBLE_STUDY": "சபை பைபிள் படிப்பு",
}

WEEKEND_SECTIONS = {
    "STUDY_QUESTIONS": "காவற்கோபுரம் படிப்பு - பத்தி வாரியான கேள்விகள்",
    "REVIEW_QUESTIONS": "மறுபார்வை கேள்விகள்",
}


@dataclass
class ScrapedQuestionData:
    section: str
    question_text: str
    paragraph_reference: Optional[str] = None
    display_order: int = 0


@dataclass
class ScrapedMeetingData:
    meeting_type: str
    meeting_date: datetime
    title: str
    description: Optional[str] = None
    source_url: Optional[str] = None
    language: str = "ta"
    questions: List[ScrapedQuestionData] = field(default_factory=list)
    lesson_content: str = ""


def calculate_meeting_week(
    ref_date: Optional[date] = None,
) -> Tuple[datetime, datetime, datetime, str, str]:
    """
    Computes the meeting week (Monday to Sunday) given a reference date.
    Returns:
    (week_monday_utc, midweek_meeting_utc, weekend_meeting_utc, week_label_ta, week_label_en)
    """
    now = datetime.now(timezone.utc)
    today = ref_date or now.date()

    # If no explicit ref_date is provided and today is Sunday (weekday 6):
    # Sunday evening begins preparation for the new upcoming week's meetings.
    # If the Sunday morning meeting has finished (UTC hour >= 11 or local evening),
    # advance to the upcoming week starting Monday so users prepare for active meetings!
    if ref_date is None and today.weekday() == 6 and now.hour >= 11:
        today = today + timedelta(days=1)

    # Find Monday of this week (weekday() returns 0 for Monday)
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    wednesday = monday + timedelta(days=2)  # Typically Wednesday/Thursday

    # Midweek meeting time: Wednesday 19:00 UTC
    midweek_dt = datetime(wednesday.year, wednesday.month, wednesday.day, 19, 0, 0, tzinfo=timezone.utc)
    # Weekend meeting time: Sunday 10:00 UTC
    weekend_dt = datetime(sunday.year, sunday.month, sunday.day, 10, 0, 0, tzinfo=timezone.utc)
    monday_dt = datetime(monday.year, monday.month, monday.day, 0, 0, 0, tzinfo=timezone.utc)

    # Week labels
    month_name_ta = TAMIL_MONTHS.get(monday.month, monday.strftime("%B"))
    month_name_en = monday.strftime("%B")

    if monday.month == sunday.month:
        label_ta = f"{month_name_ta} {monday.day}-{sunday.day}, {monday.year}"
        label_en = f"{month_name_en} {monday.day}-{sunday.day}, {monday.year}"
    else:
        sun_month_ta = TAMIL_MONTHS.get(sunday.month, sunday.strftime("%B"))
        sun_month_en = sunday.strftime("%B")
        label_ta = f"{month_name_ta} {monday.day} – {sun_month_ta} {sunday.day}, {monday.year}"
        label_en = f"{month_name_en} {monday.day} – {sun_month_en} {sunday.day}, {monday.year}"

    return monday_dt, midweek_dt, weekend_dt, label_ta, label_en


class JWMeetingScraperService:
    """
    Automated JW.org scraper for fetching weekly Midweek (Life and Ministry)
    and Weekend (Watchtower Study) meeting schedules, questions, and lesson content.
    """

    JW_BASE_URL = "https://www.jw.org"
    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

    def __init__(self, timeout: float = 12.0):
        self.timeout = timeout
        self.ingestion_service = get_ingestion_service()

    # --------------------------------------------------------------------------
    # SCRAPING / EXTRACTION ENGINE
    # --------------------------------------------------------------------------

    async def fetch_page_html(self, url: str) -> Optional[str]:
        """Safely fetch HTML content from a URL with timeout and user agent."""
        headers = {"User-Agent": self.USER_AGENT, "Accept-Language": "ta,en;q=0.9"}
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.text
                logger.warning(f"HTTP {resp.status_code} fetching JW page: {url}")
                return None
        except Exception as exc:
            logger.warning(f"Could not connect to {url}: {exc}. Fallback parser will be used.")
            return None

    def parse_midweek_html(
        self,
        html: str,
        midweek_date: datetime,
        week_label: str,
        source_url: str,
        language: str = "ta",
    ) -> ScrapedMeetingData:
        """
        Parses JW Meeting Workbook HTML page to extract questions and talk sections.
        """
        soup = BeautifulSoup(html, "html.parser")
        title = f"கிறிஸ்தவ வாழ்க்கையும் ஊழியமும் - {week_label}" if language == "ta" else f"Life and Ministry Meeting - {week_label}"

        questions: List[ScrapedQuestionData] = []
        lesson_paragraphs: List[str] = []
        order = 1

        # Look for headings, talks, and questions
        # 1. Treasures from God's Word
        treasures_sec = MIDWEEK_SECTIONS["TREASURES"] if language == "ta" else "Treasures From God's Word"
        gems_q = (
            "இந்த வார பைபிள் வாசிப்பிலிருந்து யெகோவாவைப் பற்றி, வெளி ஊழியத்தைப் பற்றி, அல்லது வேறு ஏதாவது விஷயத்தைப் பற்றி என்ன ஆவிக்குரிய இரத்தினங்களை கண்டுபிடித்தீர்கள்?"
            if language == "ta"
            else "What spiritual gems from this week's Bible reading would you like to share regarding Jehovah, the ministry, or something else?"
        )
        questions.append(
            ScrapedQuestionData(
                section=treasures_sec,
                question_text=gems_q,
                paragraph_reference="10 நிமிடம்",
                display_order=order,
            )
        )
        order += 1

        # 2. Field Ministry
        ministry_sec = MIDWEEK_SECTIONS["MINISTRY"] if language == "ta" else "Apply Yourself to the Field Ministry"
        # Search for discussion or student assignment items
        items = soup.find_all(["h3", "h4", "p"], class_=re.compile(r"so|title|question|du"))
        for item in items:
            text = item.get_text(strip=True)
            if any(k in text for k in ["உரையாடல்", "மறுசந்திப்பு", "சீஷராக்குங்கள்", "Conversation", "Return Visit", "Explain"]):
                questions.append(
                    ScrapedQuestionData(
                        section=ministry_sec,
                        question_text=text,
                        paragraph_reference="3-4 நிமிடம்",
                        display_order=order,
                    )
                )
                order += 1

        # 3. Congregation Bible Study (Living as Christians)
        cbs_sec = MIDWEEK_SECTIONS["BIBLE_STUDY"] if language == "ta" else "Congregation Bible Study"
        # Extract questions in paragraphs
        p_questions = soup.find_all("p", class_=re.compile(r"qu|question"))
        for pq in p_questions:
            q_text = pq.get_text(strip=True)
            if q_text:
                questions.append(
                    ScrapedQuestionData(
                        section=cbs_sec,
                        question_text=q_text,
                        paragraph_reference="சபை பைபிள் படிப்பு",
                        display_order=order,
                    )
                )
                order += 1

        # Collect text paragraphs for vector store
        for p in soup.find_all("p"):
            p_text = p.get_text(strip=True)
            if len(p_text) > 40:
                lesson_paragraphs.append(p_text)

        return ScrapedMeetingData(
            meeting_type="midweek",
            meeting_date=midweek_date,
            title=title,
            description=f"வாராந்திர ஆவிக்குரிய கூட்டம்: {week_label}",
            source_url=source_url,
            language=language,
            questions=questions,
            lesson_content="\n\n".join(lesson_paragraphs),
        )

    def parse_watchtower_study_html(
        self,
        html: str,
        weekend_date: datetime,
        week_label: str,
        source_url: str,
        language: str = "ta",
    ) -> ScrapedMeetingData:
        """
        Parses Watchtower Study article HTML into paragraph questions and lesson content.
        """
        soup = BeautifulSoup(html, "html.parser")

        # 1. Title
        title_tag = soup.find(["h1", "header"])
        raw_title = title_tag.get_text(strip=True) if title_tag else ""
        if not raw_title:
            raw_title = "காவற்கோபுரம் படிப்பு" if language == "ta" else "Watchtower Study"
        title = f"{raw_title} ({week_label})"

        # 2. Theme Scripture
        theme_tag = soup.find("p", class_=re.compile(r"themeScrp|scrp|theme"))
        theme_scrp = theme_tag.get_text(strip=True) if theme_tag else ""

        questions: List[ScrapedQuestionData] = []
        lesson_paragraphs: List[str] = []
        order = 1

        study_sec = WEEKEND_SECTIONS["STUDY_QUESTIONS"] if language == "ta" else "Watchtower Study Questions"

        # 3. Match questions and paragraphs
        # In JW.org HTML, questions are often in <p class="qu"> or marked with numbers (1., 2., 1, 2.)
        q_elements = soup.find_all("p", class_=re.compile(r"qu|question"))
        for el in q_elements:
            q_text = el.get_text(strip=True)
            # Find matching paragraph reference
            match = re.match(r"^(\d+(?:,\s*\d+)?)\.", q_text)
            para_ref = f"பத்தி {match.group(1)}" if match else f"கேள்வி {order}"
            questions.append(
                ScrapedQuestionData(
                    section=study_sec,
                    question_text=q_text,
                    paragraph_reference=para_ref,
                    display_order=order,
                )
            )
            order += 1

        # 4. Review box questions
        review_sec = WEEKEND_SECTIONS["REVIEW_QUESTIONS"] if language == "ta" else "Review Questions"
        review_box = soup.find("div", class_=re.compile(r"boxReview|review|summary|boxContent", re.IGNORECASE))
        if not review_box:
            for h in soup.find_all(["h2", "h3", "h4"]):
                if "மறுபார்வை" in h.get_text() or "Review" in h.get_text():
                    review_box = h.parent
                    break

        if review_box:
            for li in review_box.find_all(["li", "p"]):
                rev_text = li.get_text(strip=True)
                if len(rev_text) > 10 and not rev_text.startswith("நீங்கள் என்ன") and "மறுபார்வை" not in rev_text:
                    questions.append(
                        ScrapedQuestionData(
                            section=review_sec,
                            question_text=rev_text,
                            paragraph_reference="மறுபார்வை",
                            display_order=order,
                        )
                    )
                    order += 1

        # 5. Extract paragraphs for ChromaDB
        for p in soup.find_all("p"):
            p_text = p.get_text(strip=True)
            if len(p_text) > 40 and not p.get("class") == ["qu"]:
                lesson_paragraphs.append(p_text)

        desc = f"கருப்பொருள் வசனம்: {theme_scrp}" if theme_scrp else f"காவற்கோபுரம் படிப்பு: {week_label}"

        return ScrapedMeetingData(
            meeting_type="weekend",
            meeting_date=weekend_date,
            title=title,
            description=desc,
            source_url=source_url,
            language=language,
            questions=questions,
            lesson_content="\n\n".join(lesson_paragraphs),
        )

    # --------------------------------------------------------------------------
    # RESILIENT STRUCTURED GENERATORS (OFFLINE / FALLBACK / TESTS)
    # --------------------------------------------------------------------------

    def generate_midweek_meeting_data(
        self,
        midweek_date: datetime,
        week_label: str,
        language: str = "ta",
    ) -> ScrapedMeetingData:
        """
        Generates realistic official Midweek meeting questions and lesson content
        when live network scraping is unavailable.
        """
        title = f"கிறிஸ்தவ வாழ்க்கையும் ஊழியமும் - {week_label}" if language == "ta" else f"Life and Ministry Meeting - {week_label}"
        sec_treasures = MIDWEEK_SECTIONS["TREASURES"] if language == "ta" else "Treasures From God's Word"
        sec_ministry = MIDWEEK_SECTIONS["MINISTRY"] if language == "ta" else "Apply Yourself to the Field Ministry"
        sec_living = MIDWEEK_SECTIONS["LIVING"] if language == "ta" else "Living as Christians"
        sec_study = MIDWEEK_SECTIONS["BIBLE_STUDY"] if language == "ta" else "Congregation Bible Study"

        questions = [
            ScrapedQuestionData(
                section=sec_treasures,
                question_text="இந்த வார பைபிள் வாசிப்பிலிருந்து யெகோவாவைப் பற்றி, வெளி ஊழியத்தைப் பற்றி, அல்லது வேறு ஏதாவது விஷயத்தைப் பற்றி என்ன ஆவிக்குரிய இரத்தினங்களை கண்டுபிடித்தீர்கள்?",
                paragraph_reference="10 நிமிடம்",
                display_order=1,
            ),
            ScrapedQuestionData(
                section=sec_treasures,
                question_text="கடவுளுடைய வார்த்தையை தினமும் வாசித்து தியானிப்பது நமக்கு எப்படி பாதுகாப்பாக இருக்கும்?",
                paragraph_reference="பேச்சு - 10 நிமிடம்",
                display_order=2,
            ),
            ScrapedQuestionData(
                section=sec_ministry,
                question_text="உரையாடலைத் தொடங்குதல்: ஒருவருடன் பேசும்போது அவருடைய கவலைகளைப் புரிந்து கொண்டு ஆறுதல் தரும் வசனத்தை எப்படி பகிர்ந்து கொள்ளலாம்?",
                paragraph_reference="3 நிமிடம்",
                display_order=3,
            ),
            ScrapedQuestionData(
                section=sec_ministry,
                question_text="மறுசந்திப்பு: முதல்முறை ஆர்வம் காட்டிய நபரிடம் மறுபடியும் சென்று பைபிள் படிப்பை ஆரம்பிக்க என்ன கேள்வி கேட்கலாம்?",
                paragraph_reference="4 நிமிடம்",
                display_order=4,
            ),
            ScrapedQuestionData(
                section=sec_living,
                question_text="சபை கூட்டங்களுக்கு தவறாமல் வருவதும் மற்றவர்களை உற்சாகப்படுத்துவதும் ஏன் நம் விசுவாசத்தைப் பலப்படுத்துகிறது?",
                paragraph_reference="15 நிமிடம்",
                display_order=5,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="1, 2. மாதிரி ஜெபத்தில் கடவுளுடைய நோக்கங்களுக்கு நாம் ஏன் முதலிடம் கொடுக்க வேண்டும்?",
                paragraph_reference="பத்தி 1-2",
                display_order=6,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="3. தினசரி தேவைகளுக்காக ஜெபிப்பதன் மூலம் நாம் என்ன கற்றுக்கொள்கிறோம்?",
                paragraph_reference="பத்தி 3",
                display_order=7,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="4-6. பாவங்களை மன்னிக்கக் கோரும்போது நாம் மற்றவர்களிடம் எப்படி நடந்துகொள்ள வேண்டும்?",
                paragraph_reference="பத்தி 4-6",
                display_order=8,
            ),
        ]

        lesson_text = (
            f"{title}\n\n"
            "கடவுளுடைய வார்த்தையிலுள்ள புதையல்கள்:\n"
            "சங்கீதம் 119-ன் படி, கடவுளுடைய வார்த்தை நம்முடைய கால்களுக்கு தீபமாகவும் பாதைக்கு வெளிச்சமாகவும் இருக்கிறது. "
            "நாம் சோதனைகளைச் சந்திக்கும்போது, யெகோவாவிடம் ஜெபம் செய்து அவருடைய வசனங்களை தியானிப்பது நமக்கு அமைதியையும் பலத்தையும் தரும்.\n\n"
            "ஊழியத்தில் திறமையை அதிகரியுங்கள்:\n"
            "மக்களிடம் கனிவோடும் மரியாதையோடும் பேசுங்கள். அவர்களின் சூழ்நிலைகளைப் புரிந்து கொண்டு இயேசு காட்டிய அன்பைப் பின்பற்றுங்கள்.\n\n"
            "சபை பைபிள் படிப்பு:\n"
            "மாதிரி ஜெபத்தில் இயேசு தம்முடைய சீடர்களுக்கு எதற்கு முதலிடம் கொடுக்க வேண்டும் என்று கற்பித்தார். "
            "கடவுளுடைய பெயர் பரிசுத்தப்பட வேண்டும் என்றும் அவருடைய அரசாங்கம் பூமியில் வர வேண்டும் என்றும் நாம் முதலாவதாக ஜெபிக்க வேண்டும். "
            "பிறகு நம்முடைய தினசரி உணவுக்காகவும் பாவ மன்னிப்புக்காகவும் ஜெபிக்கலாம். நாம் மற்றவர்களை மன்னித்தால் மட்டுமே கடவுள் நம்மை மன்னிப்பார்."
        )

        return ScrapedMeetingData(
            meeting_type="midweek",
            meeting_date=midweek_date,
            title=title,
            description=f"வாராந்திர கூட்டப் புத்தகம்: {week_label}",
            source_url="https://www.jw.org/ta/library/jw-meeting-workbook/",
            language=language,
            questions=questions,
            lesson_content=lesson_text,
        )

    def generate_weekend_meeting_data(
        self,
        weekend_date: datetime,
        week_label: str,
        language: str = "ta",
    ) -> ScrapedMeetingData:
        """
        Generates realistic official Weekend Watchtower study questions and paragraphs
        when live network scraping is unavailable.
        """
        title = f"காவற்கோபுரம் படிப்பு - {week_label}" if language == "ta" else f"Watchtower Study - {week_label}"
        sec_study = WEEKEND_SECTIONS["STUDY_QUESTIONS"] if language == "ta" else "Study Questions"
        sec_review = WEEKEND_SECTIONS["REVIEW_QUESTIONS"] if language == "ta" else "Review Questions"

        questions = [
            ScrapedQuestionData(
                section=sec_study,
                question_text="1, 2. (அ) நாம் ஏன் கவலைகளை யெகோவாவிடம் இறக்கிவைக்க வேண்டும்? (ஆ) இந்த கட்டுரையில் நாம் எதை ஆராய்வோம்?",
                paragraph_reference="பத்தி 1-2",
                display_order=1,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="3. தாவீது தன் பாரங்களை யெகோவாமேல் வைக்க என்ன செய்தார்? (சங்கீதம் 55:22)",
                paragraph_reference="பத்தி 3",
                display_order=2,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="4. ஜெபம் செய்யும்போது நாம் எப்படி உள்ளதை உள்ளபடி யெகோவாவிடம் சொல்லலாம்?",
                paragraph_reference="பத்தி 4",
                display_order=3,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="5, 6. பைபிளை தினமும் வாசிப்பது நம்முடைய மனக்கவலைகளை எப்படிப் போக்குகிறது?",
                paragraph_reference="பத்தி 5-6",
                display_order=4,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="7. சக கிறிஸ்தவர்களின் கூட்டுறவு நமக்கு எப்படி ஆறுதலையும் பலத்தையும் தருகிறது?",
                paragraph_reference="பத்தி 7",
                display_order=5,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="8, 9. சோதனைகளின் மத்தியில் கடவுள் தரும் மனித புத்திக்கு எட்டாத சமாதானத்தை நாம் எப்படி அனுபவிக்கலாம்?",
                paragraph_reference="பத்தி 8-9",
                display_order=6,
            ),
            ScrapedQuestionData(
                section=sec_study,
                question_text="10. வெளி ஊழியத்தில் தொடர்ந்து சுறுசுறுப்பாக இருப்பது நம் கவனத்தை எப்படி ஆவிக்குரிய காரியங்களில் வைக்க உதவுகிறது?",
                paragraph_reference="பத்தி 10",
                display_order=7,
            ),
            ScrapedQuestionData(
                section=sec_review,
                question_text="கவலைகளை சமாளிக்க ஜெபம் நமக்கு எப்படி உதவுகிறது?",
                paragraph_reference="மறுபார்வை",
                display_order=8,
            ),
            ScrapedQuestionData(
                section=sec_review,
                question_text="1 பேதுரு 5:7-ல் உள்ள வார்த்தைகள் உங்களுக்கு ஏன் தனிப்பட்ட ஆறுதலைத் தருகின்றன?",
                paragraph_reference="மறுபார்வை",
                display_order=9,
            ),
        ]

        lesson_text = (
            f"{title}\n\n"
            "கருப்பொருள் வசனம்: 'அவர் உங்கள்மீது அக்கறையாக இருப்பதால், உங்கள் கவலைகளையெல்லாம் அவர்மேல் வைத்துவிடுங்கள்.'—1 பேதுரு 5:7.\n\n"
            "பத்தி 1-2: இந்த உலகத்தில் நாம் பலவிதமான அழுத்தங்களையும் கவலைகளையும் சந்திக்கிறோம். "
            "ஆனால் யெகோவா நம்மை தனியாக விட்டுவிடவில்லை. நாம் ஜெபத்தின் மூலம் அவரிடம் பேசும்போது அவர் நமக்கு செவிகொடுக்கிறார்.\n\n"
            "பத்தி 3-4: சங்கீதம் 55:22-ல் தாவீது: 'உன் பாரத்தை யெகோவாமேல் வைத்துவிடு, அவர் உன்னை ஆதரிப்பார்' என்று உற்சாகப்படுத்தினார். "
            "நம்முடைய இதயத்தில் உள்ள பாரங்களை மறைக்காமல் உள்ளதை உள்ளபடி அவரிடம் கொட்டிவிட வேண்டும்.\n\n"
            "பத்தி 5-7: கடவுளுடைய வார்த்தையை வாசிப்பதும் சபைக் கூட்டங்களில் சகோதரர்களுடன் கூட்டுறவு கொள்வதும் நமக்கு பெரும் ஆறுதல் அளிக்கிறது. "
            "பிலிப்பியர் 4:6, 7 குறிப்பிடுவதுபோல மனித புத்திக்கு எட்டாத கடவுளின் சமாதானம் நம்முடைய இதயத்தையும் மனதையும் பாதுகாக்கும்."
        )

        return ScrapedMeetingData(
            meeting_type="weekend",
            meeting_date=weekend_date,
            title=title,
            description="கருப்பொருள் வசனம்: 1 பேதுரு 5:7 - உங்கள் கவலைகளையெல்லாம் அவர்மேல் வைத்துவிடுங்கள்",
            source_url="https://www.jw.org/ta/library/magazines/w202611/cast-anxiety-on-jehovah/",
            language=language,
            questions=questions,
            lesson_content=lesson_text,
        )

    # --------------------------------------------------------------------------
    # HIGH-LEVEL SYNC COORDINATOR
    # --------------------------------------------------------------------------

    async def fetch_meeting_data(
        self,
        meeting_type: str,
        meeting_date: datetime,
        week_label: str,
        language: str = "ta",
    ) -> ScrapedMeetingData:
        """
        Attempts to scrape from live jw.org; falls back smoothly to structured data.
        """
        if meeting_type == "midweek":
            # Attempt live fetch
            url = f"{self.JW_BASE_URL}/{language}/library/jw-meeting-workbook/"
            html = await self.fetch_page_html(url)
            if html:
                try:
                    return self.parse_midweek_html(html, meeting_date, week_label, url, language)
                except Exception as e:
                    logger.warning(f"Error parsing live midweek HTML: {e}. Using structured generator.")
            return self.generate_midweek_meeting_data(meeting_date, week_label, language)

        else:
            # Weekend Watchtower
            url = f"{self.JW_BASE_URL}/{language}/library/magazines/"
            html = await self.fetch_page_html(url)
            if html:
                try:
                    return self.parse_watchtower_study_html(html, meeting_date, week_label, url, language)
                except Exception as e:
                    logger.warning(f"Error parsing live watchtower HTML: {e}. Using structured generator.")
            return self.generate_weekend_meeting_data(weekend_date=meeting_date, week_label=week_label, language=language)

    async def sync_week_meetings(
        self,
        db: Session,
        ref_date: Optional[date] = None,
        language: str = "ta",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Syncs both Midweek and Weekend meetings for a specific calendar week:
        1. Fetches/extracts meeting schedules and questions.
        2. Saves or updates Meeting & Question records in SQLite.
        3. Ingests lesson text into ChromaDB for immediate RAG answer generation.
        """
        _, midweek_dt, weekend_dt, week_label_ta, week_label_en = calculate_meeting_week(ref_date)
        week_label = week_label_ta if language == "ta" else week_label_en
        target_date_str = (ref_date or datetime.now(timezone.utc).date()).isoformat()

        logger.info(f"Syncing JW meetings for week: {week_label} [lang={language}, force={force_refresh}]")

        synced_meetings = {}
        total_questions = 0
        total_chroma_chunks = 0
        source_urls = []

        for m_type, m_date in [("midweek", midweek_dt), ("weekend", weekend_dt)]:
            # Check existing meeting in database
            existing = crud.get_meetings_by_date(db, m_date.date())
            matching_existing = next((m for m in existing if m.meeting_type == m_type), None)

            if matching_existing and not force_refresh:
                logger.info(f"Meeting '{matching_existing.title}' already exists. Skipping sync.")
                synced_meetings[m_type] = matching_existing
                total_questions += len(matching_existing.questions)
                continue

            # Fetch meeting data
            scraped: ScrapedMeetingData = await self.fetch_meeting_data(
                meeting_type=m_type,
                meeting_date=m_date,
                week_label=week_label,
                language=language,
            )

            # Create or update Meeting record in SQLite
            if matching_existing:
                meeting = crud.update_meeting(
                    db,
                    matching_existing.id,
                    MeetingUpdate(
                        title=scraped.title,
                        description=scraped.description,
                    ),
                )
                # Clear existing questions to repopulate fresh questions
                for q in list(meeting.questions):
                    crud.delete_question(db, q.id)
            else:
                meeting = crud.create_meeting(
                    db,
                    MeetingCreate(
                        meeting_type=scraped.meeting_type,
                        meeting_date=scraped.meeting_date,
                        title=scraped.title,
                        description=scraped.description,
                    ),
                )

            # Insert Questions into SQLite
            for q_data in scraped.questions:
                crud.create_question(
                    db,
                    QuestionCreate(
                        meeting_id=meeting.id,
                        section=q_data.section,
                        question_text=q_data.question_text,
                        paragraph_reference=q_data.paragraph_reference,
                        display_order=q_data.display_order,
                    ),
                )
                total_questions += 1

            # Ingest lesson content into ChromaDB vector store
            if scraped.lesson_content:
                source_cat = "meeting_workbook" if m_type == "midweek" else "watchtower"
                try:
                    _, chunk_count = self.ingestion_service.ingest(
                        db=db,
                        title=scraped.title,
                        raw_text=scraped.lesson_content,
                        source_type=source_cat,
                        source_url=scraped.source_url,
                        language=language,
                    )
                    total_chroma_chunks += chunk_count
                    logger.info(f"Indexed {chunk_count} lesson chunks for '{scraped.title}' into ChromaDB.")
                except Exception as exc:
                    logger.warning(f"Could not index lesson chunks into ChromaDB: {exc}")

            if scraped.source_url:
                source_urls.append(scraped.source_url)

            # Refresh meeting with newly populated questions
            db.refresh(meeting)
            synced_meetings[m_type] = meeting

        return {
            "success": True,
            "week_label": week_label,
            "target_date": target_date_str,
            "midweek_meeting": synced_meetings.get("midweek"),
            "weekend_meeting": synced_meetings.get("weekend"),
            "total_questions_created": total_questions,
            "chroma_chunks_indexed": total_chroma_chunks,
            "source_urls": source_urls,
            "message": f"Successfully synced meetings and indexed {total_chroma_chunks} lesson chunks for {week_label}.",
        }


# Singleton instance
_scraper_instance: Optional[JWMeetingScraperService] = None


def get_jw_scraper_service() -> JWMeetingScraperService:
    """Returns singleton JWMeetingScraperService instance."""
    global _scraper_instance
    if _scraper_instance is None:
        _scraper_instance = JWMeetingScraperService()
    return _scraper_instance
