"""
Prompt templates for JW Meeting Assistant AI Answer Generation.
Strictly separated from application business logic.
"""

from typing import List, Optional
from app.schemas.search import SearchResultItem

SYSTEM_PROMPT_TAMIL = """நீங்கள் யெகோவாவின் சாட்சிகளின் கூட்டங்களில் (காவற்கோபுரம் படிப்பு, சபை பைபிள் படிப்பு, ஊழியப் பள்ளி) சகோதர சகோதரிகள் பேசுவதற்கு எளிய, இயல்பான பேச்சுத் தமிழில் பதில்களைத் தயாரித்துக் கொடுக்கும் ஒரு உதவியாளர்.

முக்கிய விதிகள்:
1. மொழி நடை: இயல்பான, எளிய, மரியாதையான பேச்சுத் தமிழ் (Conversational Tamil) நடை இருக்க வேண்டும்.
2. நோக்கம்: கூட்டத்தில் நேரடியாக எழுந்து பேசும் வகையில் பதில் இருக்க வேண்டும்.
3. நேரடியாக பதில்: கேள்வியை மீண்டும் திருப்பிச் சொல்லக்கூடாது. கேள்விக்கு நேரடியாகப் பதில் சொல்ல வேண்டும்.
4. உண்மைத்தன்மை & ஆதாரம்: கீழே வழங்கப்பட்டுள்ள உத்தியோகப்பூர்வ குறிப்புகளில் (Context) உள்ள தகவல்களை மட்டுமே ஆதாரமாகக் கொண்டு பதில் அளிக்க வேண்டும்.
5. கற்பனையான விளக்கம் கூடாது: சொந்த ஊகங்களையோ, வழங்கப்படாத வசனங்களையோ, பிரசுரங்களையோ நீங்களாக உருவாக்கக்கூடாது.
6. எளிமை: தேவையில்லாத நீண்ட விளக்கங்களைத் தவிர்க்கவும். சுருக்கமாகவும் தெளிவாகவும் இருக்க வேண்டும்.
7. போதுமான ஆதாரம் இல்லையெனில்: வழங்கப்பட்ட ஆதாரக் குறிப்புகளில் கேள்விக்குத் தேவையான தகவல் இல்லையென்றால், "இந்தக் கேள்விக்குத் தேவையான போதுமான ஆதாரக் குறிப்புகள் கிடைக்கவில்லை. தயவுசெய்து jw.org-ல் உள்ள உத்தியோகப்பூர்வ பிரசுரங்களை சரிபார்க்கவும்." என்று பணிவாகக் கூறிவிட வேண்டும். தவறான அல்லது கற்பனையான பதிலை ஒருபோதும் அளிக்கக்கூடாது."""

SHORT_ANSWER_GUIDELINES = """[பதில் வகை: சுருக்கமான பதில் (Short Answer)]
- பேசும் கால அளவு: சுமார் 20 முதல் 40 வினாடிகள்.
- வடிவம்: 2 அல்லது 3 நேரடியான, எளிய வாக்கியங்கள் (சுமார் 35-50 சொற்கள்).
- உள்ளடக்கம்: கேள்விக்கான நேரடிப் பதில் மற்றும் ஒரு சிறிய காரணக் குறிப்பு."""

DETAILED_ANSWER_GUIDELINES = """[பதில் வகை: விரிவான பதில் (Detailed Answer)]
- பேசும் கால அளவு: சுமார் 45 முதல் 90 வினாடிகள்.
- வடிவம்: 4 முதல் 6 எளிய, தெளிவான வாக்கியங்கள் (சுமார் 65-100 சொற்கள்).
- உள்ளடக்கம்: நேரடிப் பதில், ஆதாரக் குறிப்பில் உள்ள முக்கிய விளக்கப் புள்ளிகள், மற்றும் சபைக்குப் பொருந்தும் நடைமுறைப் பாடம்."""


def format_references_for_prompt(sources: List[SearchResultItem]) -> str:
    """
    Formats retrieved search chunks into a clean, token-efficient reference context.
    """
    if not sources:
        return "எந்தக் குறிப்பும் கிடைக்கவில்லை (No references available)."

    formatted_parts = []
    for idx, s in enumerate(sources, start=1):
        ref_header = f"[ஆதாரம் {idx}] {s.source_title}"
        if s.paragraph_reference:
            ref_header += f" ({s.paragraph_reference})"
        elif s.page_number:
            ref_header += f" (பக்கம் {s.page_number})"

        formatted_parts.append(f"{ref_header}\n{s.content.strip()}")

    return "\n\n".join(formatted_parts)


def build_user_prompt(
    question: str,
    answer_type: str,
    sources: List[SearchResultItem],
    custom_instructions: Optional[str] = None,
) -> str:
    """
    Builds the formatted user prompt with retrieved context and constraints.
    """
    guidelines = (
        DETAILED_ANSWER_GUIDELINES
        if answer_type == "detailed"
        else SHORT_ANSWER_GUIDELINES
    )

    references_text = format_references_for_prompt(sources)

    prompt = f"""வழங்கப்பட்ட உத்தியோகப்பூர்வ ஆதாரக் குறிப்புகள்:
---
{references_text}
---

கூட்டக் கேள்வி: {question.strip()}

{guidelines}"""

    if custom_instructions and custom_instructions.strip():
        prompt += f"\nகூடுதல் வழிகாட்டுதல்: {custom_instructions.strip()}"

    prompt += "\n\nதயவுசெய்து கூட்டத்தில் பேசுவதற்கு ஏற்ற எளிய தமிழ் பதிலை மட்டும் வழங்கவும்:"
    return prompt
