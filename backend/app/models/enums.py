import enum


class MeetingType(str, enum.Enum):
    MIDWEEK = "midweek"
    WEEKEND = "weekend"


class AnswerType(str, enum.Enum):
    SHORT = "short"
    DETAILED = "detailed"
    SCRIPTURE_FOCUSED = "scripture_focused"
    USER_DRAFT = "user_draft"


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    INDEXED = "indexed"
    FAILED = "failed"
    ARCHIVED = "archived"


class SourceType(str, enum.Enum):
    WATCHTOWER = "watchtower"
    AWAKE = "awake"
    MEETING_WORKBOOK = "meeting_workbook"
    BIBLE = "bible"
    MANUAL = "manual"
    OTHER = "other"
