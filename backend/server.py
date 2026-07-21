from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import io
import logging
import mimetypes
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from azure.storage.blob import BlobServiceClient
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import StreamingResponse
from openai import AzureOpenAI
from pydantic import BaseModel, ConfigDict, EmailStr
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine, func
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from starlette.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("talent-platform")

DATABASE_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{ROOT_DIR / 'talent_platform.db'}"
JWT_SECRET = os.environ.get("JWT_SECRET", "development-only-super-long-secret-key-change-this-before-production-2026")
JWT_ALGORITHM = "HS256"
AZURE_CONTAINER_NAME = os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "app-assets")

engine_kwargs = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    focus_area = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)
    track = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    schedule = Column(String(120), nullable=False)
    capacity = Column(Integer, default=30, nullable=False)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False, index=True)
    status = Column(String(50), default="active", nullable=False)
    lead_role = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False, index=True)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(160), nullable=False)
    material_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    asset_path = Column(String(500), nullable=True)
    youtube_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class PracticeLog(Base):
    __tablename__ = "practice_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)
    mood = Column(String(80), nullable=True)
    notes = Column(Text, nullable=False)
    summary_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False, index=True)
    skill_label = Column(String(120), nullable=False)
    score = Column(Integer, nullable=False)
    coach_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(160), nullable=False)
    event_type = Column(String(80), nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(180), nullable=False)
    details = Column(Text, nullable=True)
    leader_student_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    tone = Column(String(80), default="blue", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False, index=True)
    title = Column(String(160), nullable=False)
    badge_label = Column(String(120), nullable=False)
    storage_path = Column(String(500), nullable=False)
    issued_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_shareable = Column(Boolean, default=True, nullable=False)


Base.metadata.create_all(bind=engine)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ActivityCreate(BaseModel):
    title: str
    category: str
    track: str
    description: str
    schedule: str
    capacity: int = 30
    coach_id: Optional[int] = None


class EnrollmentCreate(BaseModel):
    activity_id: int
    student_id: Optional[int] = None


class LeadRoleCreate(BaseModel):
    enrollment_id: int
    lead_role: str


class PracticeLogCreate(BaseModel):
    activity_id: int
    duration_minutes: int
    mood: str
    notes: str


class SummaryRequest(BaseModel):
    student_id: int
    activity_id: int
    notes: str
    achievements: str
    next_focus: str


class AssessmentCreate(BaseModel):
    student_id: int
    activity_id: int
    skill_label: str
    score: int
    coach_notes: str


class EventCreate(BaseModel):
    title: str
    event_type: str
    activity_id: Optional[int] = None
    event_date: str
    location: str
    details: str = ""
    leader_student_id: Optional[int] = None


class CertificateCreate(BaseModel):
    student_id: int
    activity_id: int
    title: str
    badge_label: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    parent_id: Optional[int] = None
    focus_area: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    user: UserOut


class AzureSummaryService:
    def __init__(self):
        self.endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        self.api_version = os.environ.get("AZURE_OPENAI_API_VERSION")
        self.deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME")
        self.client = None

        if self.endpoint and self.api_key and self.api_version and self.deployment_name:
            try:
                self.client = AzureOpenAI(
                    api_key=self.api_key,
                    api_version=self.api_version,
                    azure_endpoint=self.endpoint,
                )
            except Exception as exc:
                logger.warning("Azure OpenAI init failed, using local fallback: %s", exc)
                self.client = None

    @property
    def configured(self) -> bool:
        return self.client is not None

    def summarize_parent_update(self, student_name: str, activity_title: str, notes: str, achievements: str, next_focus: str) -> str:
        if not self.client:
            return (
                f"{student_name} completed {activity_title} with strong momentum. "
                f"Highlights: {achievements or notes[:80]}. "
                f"Next focus: {next_focus or 'consistency, confidence, and technique refinement'}."
            )

        system_prompt = (
            "You create concise, encouraging parent updates for a school sports and music talent platform. "
            "Keep it clear, warm, and actionable in 3 short sentences."
        )
        user_prompt = (
            f"Student: {student_name}\n"
            f"Activity: {activity_title}\n"
            f"Practice notes: {notes}\n"
            f"Achievements: {achievements}\n"
            f"Next focus: {next_focus}"
        )
        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.35,
            max_tokens=180,
        )
        return (response.choices[0].message.content or "").strip()


class AssetStorageService:
    def __init__(self):
        self.connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = AZURE_CONTAINER_NAME
        self.local_root = ROOT_DIR / "local_assets"
        self.local_root.mkdir(parents=True, exist_ok=True)
        self.blob_client = None
        if self.connection_string:
            try:
                service = BlobServiceClient.from_connection_string(self.connection_string)
                container = service.get_container_client(self.container_name)
                try:
                    container.create_container()
                except Exception:
                    pass
                self.blob_client = container
            except Exception as exc:
                logger.warning("Azure Blob init failed, using local storage: %s", exc)
                self.blob_client = None

    @property
    def configured(self) -> bool:
        return self.blob_client is not None

    def upload_bytes(self, folder: str, filename: str, data: bytes, content_type: str) -> str:
        safe_name = sanitize_filename(filename)
        stamped_name = f"{secrets.token_hex(8)}-{safe_name}"
        storage_path = f"{folder}/{stamped_name}"

        if self.blob_client:
            blob = self.blob_client.get_blob_client(storage_path)
            blob.upload_blob(data, overwrite=True, content_type=content_type)
            return storage_path

        local_path = self.local_root / storage_path
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(data)
        return storage_path

    def read_bytes(self, storage_path: str) -> bytes:
        if self.blob_client:
            blob = self.blob_client.get_blob_client(storage_path)
            return blob.download_blob().readall()

        local_path = self.local_root / storage_path
        if not local_path.exists():
            raise FileNotFoundError(storage_path)
        return local_path.read_bytes()

    def delete_file(self, storage_path: str) -> None:
        if self.blob_client:
            try:
                blob = self.blob_client.get_blob_client(storage_path)
                blob.delete_blob()
            except Exception:
                pass
        else:
            local_path = self.local_root / storage_path
            if local_path.exists():
                try:
                    local_path.unlink()
                except Exception:
                    pass


summary_service = AzureSummaryService()
storage_service = AssetStorageService()

app = FastAPI(title="School Sports & Music Talent Development Platform")
api_router = APIRouter(prefix="/api")

cors_origins = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": utc_now() + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def parse_datetime(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid datetime: {exc}")


def sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "-", filename or "asset")
    return cleaned[:120] or "asset"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "parent_id": user.parent_id,
        "focus_area": user.focus_area,
    }


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if token is None:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = db.get(User, int(payload["sub"]))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*roles: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission for this action")
        return current_user

    return dependency


def visible_student_ids(db: Session, user: User) -> list[int]:
    if user.role == "admin":
        return [item[0] for item in db.query(User.id).filter(User.role == "student").all()]
    if user.role == "student":
        return [user.id]
    if user.role == "parent":
        return [item[0] for item in db.query(User.id).filter(User.parent_id == user.id, User.role == "student").all()]
    coached_activity_ids = [item[0] for item in db.query(Activity.id).filter(Activity.coach_id == user.id).all()]
    if not coached_activity_ids:
        return []
    return list({item[0] for item in db.query(Enrollment.student_id).filter(Enrollment.activity_id.in_(coached_activity_ids)).all()})


def visible_activity_ids(db: Session, user: User) -> list[int]:
    if user.role == "admin":
        return [item[0] for item in db.query(Activity.id).all()]
    if user.role == "coach":
        return [item[0] for item in db.query(Activity.id).filter(Activity.coach_id == user.id).all()]
    if user.role == "student":
        return [item[0] for item in db.query(Enrollment.activity_id).filter(Enrollment.student_id == user.id).all()]
    child_ids = visible_student_ids(db, user)
    if not child_ids:
        return []
    return list({item[0] for item in db.query(Enrollment.activity_id).filter(Enrollment.student_id.in_(child_ids)).all()})


def ensure_student_visible(db: Session, current_user: User, student_id: int) -> User:
    student = db.get(User, student_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
    if student_id not in visible_student_ids(db, current_user):
        raise HTTPException(status_code=404, detail="Student not visible to this account")
    return student


def ensure_activity_visible(db: Session, current_user: User, activity_id: int) -> Activity:
    activity = db.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if current_user.role == "admin":
        return activity
    if activity_id not in visible_activity_ids(db, current_user) and not (
        current_user.role in {"coach"} and activity.coach_id == current_user.id
    ):
        raise HTTPException(status_code=404, detail="Activity not visible to this account")
    return activity


def build_parent_summary(student_name: str, activity_title: str, notes: str, duration_minutes: int) -> str:
    return summary_service.summarize_parent_update(
        student_name,
        activity_title,
        notes,
        f"Completed {duration_minutes} focused minutes with improved discipline and rhythm.",
        "keep building consistency and refine execution under match/performance pressure",
    )


def make_certificate_pdf(student: User, activity: Activity, title: str, badge_label: str, badges: list[Badge]) -> bytes:
    buffer = io.BytesIO()
    page_width, page_height = landscape(A4)
    pdf = canvas.Canvas(buffer, pagesize=landscape(A4))

    pdf.setFillColor(colors.HexColor("#F3F7FF"))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#DDEAFD"))
    pdf.roundRect(32, 32, page_width - 64, page_height - 64, 28, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.roundRect(56, 56, page_width - 112, page_height - 112, 24, fill=1, stroke=0)

    pdf.setStrokeColor(colors.HexColor("#4F6AF4"))
    pdf.setLineWidth(2)
    pdf.roundRect(68, 68, page_width - 136, page_height - 136, 20, fill=0, stroke=1)

    pdf.setFillColor(colors.HexColor("#3B4F9E"))
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(page_width / 2, page_height - 90, "School Sports & Music Talent Development Platform")

    pdf.setFillColor(colors.HexColor("#181C37"))
    pdf.setFont("Helvetica-Bold", 30)
    pdf.drawCentredString(page_width / 2, page_height - 135, title)

    pdf.setFillColor(colors.HexColor("#5D678F"))
    pdf.setFont("Helvetica", 15)
    pdf.drawCentredString(page_width / 2, page_height - 170, "Awarded in recognition of dedication, discipline, and creative growth")

    pdf.setFillColor(colors.HexColor("#0E2F67"))
    pdf.setFont("Helvetica-Bold", 26)
    pdf.drawCentredString(page_width / 2, page_height - 230, student.name)

    pdf.setFillColor(colors.HexColor("#24355A"))
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(page_width / 2, page_height - 260, f"For outstanding progress in {activity.title} • Focus track: {activity.track}")
    pdf.drawCentredString(page_width / 2, page_height - 282, f"Badge highlight: {badge_label}")

    pdf.setFillColor(colors.HexColor("#EEF4FF"))
    pdf.roundRect(120, page_height - 365, page_width - 240, 72, 20, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#2F4274"))
    pdf.setFont("Helvetica", 12)
    pdf.drawCentredString(page_width / 2, page_height - 324, "This certificate confirms participation, skill development, and portfolio-ready achievement status.")

    palette = ["#4F6AF4", "#1FA47B", "#7D56C2", "#3E7CB1", "#2FB67B"]
    badge_x = 135
    badge_y = page_height - 420
    pdf.setFont("Helvetica-Bold", 11)
    for index, badge in enumerate((badges or [])[:4]):
        width = 118 + min(len(badge.title) * 3, 60)
        pdf.setFillColor(colors.HexColor(palette[index % len(palette)]))
        pdf.roundRect(badge_x, badge_y, width, 28, 14, fill=1, stroke=0)
        pdf.setFillColor(colors.white)
        pdf.drawString(badge_x + 14, badge_y + 10, badge.title[:24])
        badge_x += width + 10

    pdf.setStrokeColor(colors.HexColor("#D0D8F2"))
    pdf.line(125, 110, 305, 110)
    pdf.line(page_width - 305, 110, page_width - 125, 110)
    pdf.setFillColor(colors.HexColor("#1C2852"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(126, 94, "Program Director")
    pdf.drawRightString(page_width - 126, 94, utc_now().strftime("Issued %d %b %Y"))

    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#5F6D95"))
    pdf.drawCentredString(page_width / 2, 54, "Portfolio-ready digital certificate • Downloadable and shareable")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def write_test_credentials_file(demo_accounts: dict[str, dict[str, str]]) -> None:
    memory_dir = ROOT_DIR.parent / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    content = """# Demo Accounts\n\n"""
    for role, account in demo_accounts.items():
        content += f"- {role.title()}: {account['email']} / {account['password']}\n"
    content += "\n# Auth Endpoints\n- POST /api/auth/login\n- GET /api/auth/me\n- POST /api/auth/logout\n- GET /api/dashboard\n"
    (memory_dir / "test_credentials.md").write_text(content)


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        demo_accounts = {
            "admin": {
                "name": "Avery Brooks",
                "email": os.environ.get("DEMO_ADMIN_EMAIL", "admin@talentdemo.com").lower(),
                "password": os.environ.get("DEMO_ADMIN_PASSWORD", "Admin123!"),
                "focus": "Operations & school oversight",
            },
            "coach": {
                "name": "Jordan Lee",
                "email": os.environ.get("DEMO_COACH_EMAIL", "coach@talentdemo.com").lower(),
                "password": os.environ.get("DEMO_COACH_PASSWORD", "Coach123!"),
                "focus": "Basketball & performance coaching",
            },
            "student": {
                "name": "Maya Chen",
                "email": os.environ.get("DEMO_STUDENT_EMAIL", "student@talentdemo.com").lower(),
                "password": os.environ.get("DEMO_STUDENT_PASSWORD", "Student123!"),
                "focus": "Basketball point guard • Choir alto",
            },
            "parent": {
                "name": "Elena Chen",
                "email": os.environ.get("DEMO_PARENT_EMAIL", "parent@talentdemo.com").lower(),
                "password": os.environ.get("DEMO_PARENT_PASSWORD", "Parent123!"),
                "focus": "Guardian & progress supporter",
            },
        }

        seeded_users: dict[str, User] = {}
        for role, account in demo_accounts.items():
            user = db.query(User).filter(func.lower(User.email) == account["email"]).first()
            if not user:
                user = User(
                    name=account["name"],
                    email=account["email"],
                    password_hash=hash_password(account["password"]),
                    role=role,
                    focus_area=account["focus"],
                )
                db.add(user)
                db.flush()
            else:
                user.name = account["name"]
                user.role = role
                user.focus_area = account["focus"]
                if not verify_password(account["password"], user.password_hash):
                    user.password_hash = hash_password(account["password"])
            seeded_users[role] = user

        seeded_users["student"].parent_id = seeded_users["parent"].id
        db.commit()

        coach = seeded_users["coach"]
        student = seeded_users["student"]

        activity_specs = [
            {
                "title": "Basketball Elite Squad",
                "category": "sports",
                "track": "Team Play",
                "description": "Footwork, tactical awareness, transition defense, and leadership reps.",
                "schedule": "Mon • Wed • Fri • 16:00",
                "capacity": 20,
            },
            {
                "title": "Choir Performance Lab",
                "category": "music",
                "track": "Choral Harmony",
                "description": "Breath control, stage presence, harmony blending, and concert prep.",
                "schedule": "Tue • Thu • 15:30",
                "capacity": 35,
            },
            {
                "title": "Guitar Technique Studio",
                "category": "music",
                "track": "Solo Technique",
                "description": "Fingerstyle precision, dynamic phrasing, and recital readiness.",
                "schedule": "Sat • 10:00",
                "capacity": 16,
            },
        ]

        activity_map: dict[str, Activity] = {}
        for spec in activity_specs:
            activity = db.query(Activity).filter(Activity.title == spec["title"]).first()
            if not activity:
                activity = Activity(**spec, coach_id=coach.id)
                db.add(activity)
                db.flush()
            else:
                activity.category = spec["category"]
                activity.track = spec["track"]
                activity.description = spec["description"]
                activity.schedule = spec["schedule"]
                activity.capacity = spec["capacity"]
                activity.coach_id = coach.id
            activity_map[spec["title"]] = activity
        db.commit()

        enrollment_specs = [
            ("Basketball Elite Squad", "captain"),
            ("Choir Performance Lab", "section lead"),
        ]
        for activity_title, lead_role in enrollment_specs:
            activity = activity_map[activity_title]
            enrollment = db.query(Enrollment).filter(Enrollment.student_id == student.id, Enrollment.activity_id == activity.id).first()
            if not enrollment:
                db.add(Enrollment(student_id=student.id, activity_id=activity.id, lead_role=lead_role))
            else:
                enrollment.status = "active"
                enrollment.lead_role = lead_role
        db.commit()

        material_specs = [
            {
                "title": "Transition Defense Film Study",
                "activity_title": "Basketball Elite Squad",
                "material_type": "youtube",
                "description": "Review spacing and recovery angles before the next scrimmage.",
                "youtube_url": "https://www.youtube.com/watch?v=J---aiyznGQ",
            },
            {
                "title": "Choir Warmup Structure",
                "activity_title": "Choir Performance Lab",
                "material_type": "lesson-plan",
                "description": "Vocal ladder drills, resonance work, and articulation routine for rehearsal days.",
                "youtube_url": None,
            },
        ]
        for spec in material_specs:
            activity = activity_map[spec["activity_title"]]
            material = db.query(Material).filter(Material.title == spec["title"]).first()
            if not material:
                material = Material(
                    activity_id=activity.id,
                    coach_id=coach.id,
                    title=spec["title"],
                    material_type=spec["material_type"],
                    description=spec["description"],
                    youtube_url=spec["youtube_url"],
                )
                db.add(material)
            else:
                material.activity_id = activity.id
                material.coach_id = coach.id
                material.material_type = spec["material_type"]
                material.description = spec["description"]
                material.youtube_url = spec["youtube_url"]
        db.commit()

        practice_specs = [
            {
                "activity_title": "Basketball Elite Squad",
                "duration_minutes": 85,
                "mood": "Focused",
                "notes": "Worked on ball protection, transition reads, and communication in the press break.",
            },
            {
                "activity_title": "Choir Performance Lab",
                "duration_minutes": 60,
                "mood": "Confident",
                "notes": "Improved breath pacing and entry timing in the alto section with strong posture.",
            },
        ]
        for spec in practice_specs:
            activity = activity_map[spec["activity_title"]]
            practice_log = (
                db.query(PracticeLog)
                .filter(PracticeLog.student_id == student.id, PracticeLog.activity_id == activity.id)
                .order_by(PracticeLog.created_at.asc())
                .first()
            )
            summary_text = build_parent_summary(student.name, activity.title, spec["notes"], spec["duration_minutes"])
            if not practice_log:
                db.add(
                    PracticeLog(
                        student_id=student.id,
                        activity_id=activity.id,
                        duration_minutes=spec["duration_minutes"],
                        mood=spec["mood"],
                        notes=spec["notes"],
                        summary_text=summary_text,
                    )
                )
            else:
                practice_log.duration_minutes = spec["duration_minutes"]
                practice_log.mood = spec["mood"]
                practice_log.notes = spec["notes"]
                practice_log.summary_text = summary_text
        db.commit()

        assessment_specs = [
            {
                "activity_title": "Basketball Elite Squad",
                "skill_label": "Decision making",
                "score": 88,
                "coach_notes": "Reading the weak-side help faster and keeping teammates organized.",
            },
            {
                "activity_title": "Choir Performance Lab",
                "skill_label": "Stage presence",
                "score": 91,
                "coach_notes": "Very steady projection with confident body language across the set.",
            },
        ]
        for spec in assessment_specs:
            activity = activity_map[spec["activity_title"]]
            assessment = (
                db.query(Assessment)
                .filter(
                    Assessment.student_id == student.id,
                    Assessment.activity_id == activity.id,
                    Assessment.skill_label == spec["skill_label"],
                )
                .first()
            )
            if not assessment:
                db.add(
                    Assessment(
                        student_id=student.id,
                        activity_id=activity.id,
                        skill_label=spec["skill_label"],
                        score=spec["score"],
                        coach_notes=spec["coach_notes"],
                    )
                )
            else:
                assessment.score = spec["score"]
                assessment.coach_notes = spec["coach_notes"]
        db.commit()

        event_specs = [
            {
                "title": "Regional Basketball Showcase",
                "event_type": "tournament",
                "activity_title": "Basketball Elite Squad",
                "event_date": utc_now() + timedelta(days=7),
                "location": "North Hall Arena",
                "details": "Warm-up check-in 45 minutes early. Press break and transition sets in focus.",
            },
            {
                "title": "Spring Harmony Concert",
                "event_type": "concert",
                "activity_title": "Choir Performance Lab",
                "event_date": utc_now() + timedelta(days=12),
                "location": "City Performing Arts Center",
                "details": "Full dress rehearsal one day before. Alto section leading opening chorus.",
            },
        ]
        for spec in event_specs:
            activity = activity_map[spec["activity_title"]]
            event = db.query(Event).filter(Event.title == spec["title"]).first()
            if not event:
                db.add(
                    Event(
                        title=spec["title"],
                        event_type=spec["event_type"],
                        activity_id=activity.id,
                        event_date=spec["event_date"],
                        location=spec["location"],
                        details=spec["details"],
                        leader_student_id=student.id,
                    )
                )
            else:
                event.event_type = spec["event_type"]
                event.activity_id = activity.id
                event.event_date = spec["event_date"]
                event.location = spec["location"]
                event.details = spec["details"]
                event.leader_student_id = student.id
        db.commit()

        badge_specs = [
            ("Consistency Star", "Logged practice across both sport and music tracks.", "blue"),
            ("Stage Presence", "Demonstrated strong confidence during choir rehearsal.", "purple"),
            ("Captain's Voice", "Led teammates with clear communication during drills.", "green"),
        ]
        for title, description, tone in badge_specs:
            badge = db.query(Badge).filter(Badge.student_id == student.id, Badge.title == title).first()
            if not badge:
                db.add(Badge(student_id=student.id, title=title, description=description, tone=tone))
            else:
                badge.description = description
                badge.tone = tone
        db.commit()

        basketball = activity_map["Basketball Elite Squad"]
        certificate = db.query(Certificate).filter(Certificate.student_id == student.id, Certificate.activity_id == basketball.id, Certificate.title == "Certificate of Achievement").first()
        if not certificate:
            badges = db.query(Badge).filter(Badge.student_id == student.id).all()
            pdf_bytes = make_certificate_pdf(student, basketball, "Certificate of Achievement", "Consistency Star", badges)
            storage_path = storage_service.upload_bytes(
                "certificates",
                f"{student.name.replace(' ', '_').lower()}-basketball-certificate.pdf",
                pdf_bytes,
                "application/pdf",
            )
            db.add(
                Certificate(
                    student_id=student.id,
                    activity_id=basketball.id,
                    title="Certificate of Achievement",
                    badge_label="Consistency Star",
                    storage_path=storage_path,
                )
            )
            db.commit()

        write_test_credentials_file(demo_accounts)
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    seed_demo_data()


@api_router.get("/")
def root():
    return {"message": "School Sports & Music Talent Development Platform API"}


@api_router.get("/health")
def health_check():
    database_mode = "sqlserver" if os.environ.get("DATABASE_URL") else "sqlite-demo"
    return {
        "database_mode": database_mode,
        "summary_mode": "azure-openai" if summary_service.configured else "local-demo",
        "storage_mode": "azure-blob" if storage_service.configured else "local-demo",
        "container": AZURE_CONTAINER_NAME,
    }


@api_router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", secure=False, max_age=43200)
    return {"token": token, "user": serialize_user(user)}


@api_router.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


@api_router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


@api_router.get("/activities")
def list_activities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    activity_ids = visible_activity_ids(db, current_user)
    query = db.query(Activity)
    if current_user.role != "admin":
        if not activity_ids:
            return []
        query = query.filter(Activity.id.in_(activity_ids))
    activities = query.order_by(Activity.title.asc()).all()
    coaches = {coach.id: coach for coach in db.query(User).filter(User.role == "coach").all()}
    enrollment_counts = {
        activity_id: count
        for activity_id, count in db.query(Enrollment.activity_id, func.count(Enrollment.id)).group_by(Enrollment.activity_id).all()
    }
    return [
        {
            "id": activity.id,
            "title": activity.title,
            "category": activity.category,
            "track": activity.track,
            "description": activity.description,
            "schedule": activity.schedule,
            "capacity": activity.capacity,
            "coach_id": activity.coach_id,
            "coach_name": coaches.get(activity.coach_id).name if coaches.get(activity.coach_id) else "TBD",
            "enrollment_count": enrollment_counts.get(activity.id, 0),
        }
        for activity in activities
    ]


@api_router.post("/activities")
def create_activity(
    payload: ActivityCreate,
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    coach_id = payload.coach_id if current_user.role == "admin" and payload.coach_id else current_user.id
    coach = db.get(User, coach_id)
    if not coach or coach.role != "coach":
        raise HTTPException(status_code=404, detail="Coach not found")
    activity = Activity(
        title=payload.title,
        category=payload.category,
        track=payload.track,
        description=payload.description,
        schedule=payload.schedule,
        capacity=payload.capacity,
        coach_id=coach_id,
    )
    db.add(activity)
    db.commit()
    return {"message": "Activity created", "id": activity.id}


@api_router.post("/enrollments")
def create_enrollment(
    payload: EnrollmentCreate,
    current_user: User = Depends(require_roles("admin", "student", "parent")),
    db: Session = Depends(get_db),
):
    activity = db.get(Activity, payload.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    student_id = payload.student_id or current_user.id
    if current_user.role == "student":
        student_id = current_user.id
    else:
        ensure_student_visible(db, current_user, student_id)

    existing = db.query(Enrollment).filter(Enrollment.student_id == student_id, Enrollment.activity_id == payload.activity_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student is already enrolled in this activity")

    enrollment = Enrollment(student_id=student_id, activity_id=payload.activity_id)
    db.add(enrollment)
    db.commit()
    return {"message": "Enrollment created", "id": enrollment.id}


@api_router.post("/roster/lead")
def set_roster_lead(
    payload: LeadRoleCreate,
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    enrollment = db.get(Enrollment, payload.enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    activity = db.get(Activity, enrollment.activity_id)
    if current_user.role == "coach" and activity.coach_id != current_user.id:
        raise HTTPException(status_code=404, detail="Enrollment not visible to this coach")
    enrollment.lead_role = payload.lead_role
    db.commit()
    return {"message": "Lead role updated"}


@api_router.get("/materials")
def list_materials(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    activity_ids = visible_activity_ids(db, current_user)
    if current_user.role != "admin" and not activity_ids:
        return []
    query = db.query(Material)
    if current_user.role != "admin":
        query = query.filter(Material.activity_id.in_(activity_ids))
    materials = query.order_by(Material.created_at.desc()).all()
    activity_map = {activity.id: activity for activity in db.query(Activity).all()}
    return [serialize_material(material, activity_map) for material in materials]


@api_router.post("/materials")
async def create_material(
    activity_id: int = Form(...),
    title: str = Form(...),
    material_type: str = Form(...),
    description: str = Form(""),
    youtube_url: str = Form(""),
    file: Optional[UploadFile] = File(default=None),
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    activity = db.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if current_user.role == "coach" and activity.coach_id != current_user.id:
        raise HTTPException(status_code=404, detail="Activity not visible to this coach")

    asset_path = None
    material_type = material_type.strip().lower()
    if material_type == "youtube":
        if not youtube_url:
            raise HTTPException(status_code=400, detail="YouTube URL is required")
    else:
        if file is None:
            raise HTTPException(status_code=400, detail="File upload is required for this material type")
        file_bytes = await file.read()
        asset_path = storage_service.upload_bytes(
            "videos" if material_type == "video-upload" else "uploads",
            file.filename or f"{title}.bin",
            file_bytes,
            file.content_type or "application/octet-stream",
        )

    material = Material(
        activity_id=activity_id,
        coach_id=current_user.id,
        title=title,
        material_type=material_type,
        description=description,
        youtube_url=youtube_url or None,
        asset_path=asset_path,
    )
    db.add(material)
    db.commit()
    return {"message": "Material created", "id": material.id}


@api_router.get("/materials/{material_id}/stream")
def stream_material(material_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    material = db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    ensure_activity_visible(db, current_user, material.activity_id)
    if not material.asset_path:
        raise HTTPException(status_code=400, detail="This material does not have a file asset")
    try:
        payload = storage_service.read_bytes(material.asset_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File asset not found")
    media_type = mimetypes.guess_type(material.asset_path)[0] or "application/octet-stream"
    return StreamingResponse(iter([payload]), media_type=media_type)


@api_router.delete("/materials/{material_id}")
def delete_material(
    material_id: int,
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    material = db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    if current_user.role == "coach" and material.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this material")

    if material.asset_path:
        storage_service.delete_file(material.asset_path)

    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}


@api_router.post("/practice-logs")
def create_practice_log(
    payload: PracticeLogCreate,
    current_user: User = Depends(require_roles("admin", "student")),
    db: Session = Depends(get_db),
):
    student = current_user if current_user.role == "student" else ensure_student_visible(db, current_user, current_user.id)
    activity = db.get(Activity, payload.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if current_user.role == "student":
        enrolled = db.query(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.activity_id == payload.activity_id).first()
        if not enrolled:
            raise HTTPException(status_code=404, detail="Student is not enrolled in this activity")
    summary = build_parent_summary(student.name, activity.title, payload.notes, payload.duration_minutes)
    log = PracticeLog(
        student_id=student.id,
        activity_id=payload.activity_id,
        duration_minutes=payload.duration_minutes,
        mood=payload.mood,
        notes=payload.notes,
        summary_text=summary,
    )
    db.add(log)
    db.commit()
    return {"message": "Practice log recorded", "id": log.id, "summary": summary}


@api_router.post("/ai/parent-summary")
def generate_parent_summary(
    payload: SummaryRequest,
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    student = ensure_student_visible(db, current_user, payload.student_id)
    activity = ensure_activity_visible(db, current_user, payload.activity_id)
    summary = summary_service.summarize_parent_update(
        student.name,
        activity.title,
        payload.notes,
        payload.achievements,
        payload.next_focus,
    )
    return {"summary": summary}


@api_router.post("/assessments")
def create_assessment(
    payload: AssessmentCreate,
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    student = ensure_student_visible(db, current_user, payload.student_id)
    activity = ensure_activity_visible(db, current_user, payload.activity_id)
    assessment = Assessment(
        student_id=student.id,
        activity_id=activity.id,
        skill_label=payload.skill_label,
        score=payload.score,
        coach_notes=payload.coach_notes,
    )
    db.add(assessment)
    db.commit()
    return {"message": "Assessment recorded", "id": assessment.id}


@api_router.get("/events")
def list_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    activity_ids = visible_activity_ids(db, current_user)
    query = db.query(Event)
    if current_user.role != "admin":
        if activity_ids:
            query = query.filter((Event.activity_id.is_(None)) | (Event.activity_id.in_(activity_ids)))
        else:
            query = query.filter(Event.activity_id.is_(None))
    events = query.order_by(Event.event_date.asc()).all()
    return build_event_payloads(db, events)


@api_router.post("/events")
def create_event(
    payload: EventCreate,
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    if payload.activity_id:
        activity = db.get(Activity, payload.activity_id)
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        if current_user.role == "coach" and activity.coach_id != current_user.id:
            raise HTTPException(status_code=404, detail="Activity not visible to this coach")
    if payload.leader_student_id:
        ensure_student_visible(db, current_user, payload.leader_student_id)
    event = Event(
        title=payload.title,
        event_type=payload.event_type,
        activity_id=payload.activity_id,
        event_date=parse_datetime(payload.event_date),
        location=payload.location,
        details=payload.details,
        leader_student_id=payload.leader_student_id,
    )
    db.add(event)
    db.commit()
    return {"message": "Event created", "id": event.id}


@api_router.post("/certificates/generate")
def generate_certificate(
    payload: CertificateCreate,
    current_user: User = Depends(require_roles("admin", "coach")),
    db: Session = Depends(get_db),
):
    student = ensure_student_visible(db, current_user, payload.student_id)
    activity = ensure_activity_visible(db, current_user, payload.activity_id)
    badges = db.query(Badge).filter(Badge.student_id == student.id).order_by(Badge.created_at.desc()).all()
    if payload.badge_label and payload.badge_label not in [badge.title for badge in badges]:
        new_badge = Badge(student_id=student.id, title=payload.badge_label, description="Recognized during certificate issuance.", tone="green")
        db.add(new_badge)
        db.flush()
        badges = [new_badge] + badges
    pdf_bytes = make_certificate_pdf(student, activity, payload.title, payload.badge_label, badges)
    storage_path = storage_service.upload_bytes(
        "certificates",
        f"{student.name.replace(' ', '_').lower()}-{activity.title.replace(' ', '_').lower()}-certificate.pdf",
        pdf_bytes,
        "application/pdf",
    )
    certificate = Certificate(
        student_id=student.id,
        activity_id=activity.id,
        title=payload.title,
        badge_label=payload.badge_label,
        storage_path=storage_path,
    )
    db.add(certificate)
    db.commit()
    return {"message": "Certificate generated", "id": certificate.id, "download_url": f"/api/certificates/{certificate.id}/download"}


@api_router.get("/certificates/{certificate_id}/download")
def download_certificate(certificate_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    certificate = db.get(Certificate, certificate_id)
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    ensure_student_visible(db, current_user, certificate.student_id)
    try:
        pdf_bytes = storage_service.read_bytes(certificate.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Certificate file missing")
    filename = certificate.storage_path.split("/")[-1]
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api_router.get("/dashboard")
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_dashboard_payload(db, current_user)


@app.get("/")
def app_root():
    return {"message": "Talent Development Platform is live"}


def serialize_material(material: Material, activity_map: dict[int, Activity]) -> dict:
    activity = activity_map.get(material.activity_id)
    return {
        "id": material.id,
        "activity_id": material.activity_id,
        "activity_title": activity.title if activity else "Unknown activity",
        "title": material.title,
        "material_type": material.material_type,
        "description": material.description or "",
        "asset_path": material.asset_path,
        "youtube_url": material.youtube_url,
        "download_url": f"/api/materials/{material.id}/stream" if material.asset_path else None,
        "created_at": material.created_at.isoformat(),
    }


def build_event_payloads(db: Session, events: list[Event]) -> list[dict]:
    activity_map = {activity.id: activity for activity in db.query(Activity).all()}
    student_map = {student.id: student for student in db.query(User).filter(User.role == "student").all()}
    return [
        {
            "id": event.id,
            "title": event.title,
            "event_type": event.event_type,
            "activity_id": event.activity_id,
            "activity_title": activity_map.get(event.activity_id).title if activity_map.get(event.activity_id) else "All programs",
            "event_date": event.event_date.isoformat(),
            "location": event.location,
            "details": event.details or "",
            "leader_name": student_map.get(event.leader_student_id).name if student_map.get(event.leader_student_id) else "TBD",
        }
        for event in events
    ]


def build_dashboard_payload(db: Session, current_user: User) -> dict:
    user_map = {user.id: user for user in db.query(User).all()}
    students_ids = visible_student_ids(db, current_user)
    activity_ids = visible_activity_ids(db, current_user)

    activities_query = db.query(Activity)
    if current_user.role != "admin":
        if activity_ids:
            activities_query = activities_query.filter(Activity.id.in_(activity_ids))
        else:
            activities_query = activities_query.filter(Activity.id == -1)
    activities = activities_query.order_by(Activity.title.asc()).all()

    students_query = db.query(User).filter(User.role == "student")
    if current_user.role != "admin":
        if students_ids:
            students_query = students_query.filter(User.id.in_(students_ids))
        else:
            students_query = students_query.filter(User.id == -1)
    students = students_query.order_by(User.name.asc()).all()

    enrollments_query = db.query(Enrollment)
    if current_user.role != "admin":
        if students_ids:
            enrollments_query = enrollments_query.filter(Enrollment.student_id.in_(students_ids))
        else:
            enrollments_query = enrollments_query.filter(Enrollment.id == -1)
    enrollments = enrollments_query.all()

    materials_query = db.query(Material)
    if current_user.role != "admin":
        if activity_ids:
            materials_query = materials_query.filter(Material.activity_id.in_(activity_ids))
        else:
            materials_query = materials_query.filter(Material.id == -1)
    materials = materials_query.order_by(Material.created_at.desc()).all()

    practice_query = db.query(PracticeLog)
    if current_user.role != "admin":
        if students_ids:
            practice_query = practice_query.filter(PracticeLog.student_id.in_(students_ids))
        else:
            practice_query = practice_query.filter(PracticeLog.id == -1)
    practice_logs = practice_query.order_by(PracticeLog.created_at.desc()).all()

    assessments_query = db.query(Assessment)
    if current_user.role != "admin":
        if students_ids:
            assessments_query = assessments_query.filter(Assessment.student_id.in_(students_ids))
        else:
            assessments_query = assessments_query.filter(Assessment.id == -1)
    assessments = assessments_query.order_by(Assessment.created_at.desc()).all()

    events_query = db.query(Event)
    if current_user.role != "admin":
        if activity_ids:
            events_query = events_query.filter((Event.activity_id.is_(None)) | (Event.activity_id.in_(activity_ids)))
        else:
            events_query = events_query.filter(Event.activity_id.is_(None))
    events = events_query.order_by(Event.event_date.asc()).all()

    badges_query = db.query(Badge)
    if current_user.role != "admin":
        if students_ids:
            badges_query = badges_query.filter(Badge.student_id.in_(students_ids))
        else:
            badges_query = badges_query.filter(Badge.id == -1)
    badges = badges_query.order_by(Badge.created_at.desc()).all()

    certificates_query = db.query(Certificate)
    if current_user.role != "admin":
        if students_ids:
            certificates_query = certificates_query.filter(Certificate.student_id.in_(students_ids))
        else:
            certificates_query = certificates_query.filter(Certificate.id == -1)
    certificates = certificates_query.order_by(Certificate.issued_at.desc()).all()

    activity_map = {activity.id: activity for activity in db.query(Activity).all()}
    enrollment_activity_map = {}
    for enrollment in enrollments:
        enrollment_activity_map.setdefault(enrollment.student_id, []).append(enrollment)

    roster = []
    for student in students:
        student_enrollments = enrollment_activity_map.get(student.id, [])
        roster.append(
            {
                "student_id": student.id,
                "student_name": student.name,
                "parent_name": user_map.get(student.parent_id).name if user_map.get(student.parent_id) else "Unassigned",
                "activities": [activity_map[item.activity_id].title for item in student_enrollments if activity_map.get(item.activity_id)],
                "lead_roles": [item.lead_role for item in student_enrollments if item.lead_role],
                "enrollment_ids": [item.id for item in student_enrollments],
            }
        )

    materials_payload = [serialize_material(material, activity_map) for material in materials]
    practice_payload = [
        {
            "id": log.id,
            "student_id": log.student_id,
            "student_name": user_map.get(log.student_id).name if user_map.get(log.student_id) else "Unknown",
            "activity_id": log.activity_id,
            "activity_title": activity_map.get(log.activity_id).title if activity_map.get(log.activity_id) else "Unknown",
            "duration_minutes": log.duration_minutes,
            "mood": log.mood or "Focused",
            "notes": log.notes,
            "summary_text": log.summary_text or "",
            "created_at": log.created_at.isoformat(),
        }
        for log in practice_logs
    ]
    assessment_payload = [
        {
            "id": item.id,
            "student_id": item.student_id,
            "student_name": user_map.get(item.student_id).name if user_map.get(item.student_id) else "Unknown",
            "activity_title": activity_map.get(item.activity_id).title if activity_map.get(item.activity_id) else "Unknown",
            "skill_label": item.skill_label,
            "score": item.score,
            "coach_notes": item.coach_notes or "",
            "created_at": item.created_at.isoformat(),
        }
        for item in assessments
    ]
    event_payload = build_event_payloads(db, events)
    badge_payload = [
        {
            "id": badge.id,
            "student_id": badge.student_id,
            "student_name": user_map.get(badge.student_id).name if user_map.get(badge.student_id) else "Unknown",
            "title": badge.title,
            "description": badge.description,
            "tone": badge.tone,
            "created_at": badge.created_at.isoformat(),
        }
        for badge in badges
    ]
    certificate_payload = [
        {
            "id": certificate.id,
            "student_id": certificate.student_id,
            "student_name": user_map.get(certificate.student_id).name if user_map.get(certificate.student_id) else "Unknown",
            "activity_title": activity_map.get(certificate.activity_id).title if activity_map.get(certificate.activity_id) else "Unknown",
            "title": certificate.title,
            "badge_label": certificate.badge_label,
            "download_url": f"/api/certificates/{certificate.id}/download",
            "issued_at": certificate.issued_at.isoformat(),
        }
        for certificate in certificates
    ]

    total_minutes = sum(item.duration_minutes for item in practice_logs)
    practice_chart = []
    for activity in activities:
        minutes = sum(item.duration_minutes for item in practice_logs if item.activity_id == activity.id)
        practice_chart.append({"name": activity.track[:16], "minutes": minutes})

    assessment_chart = []
    for skill in sorted({item.skill_label for item in assessments}):
        skill_scores = [item.score for item in assessments if item.skill_label == skill]
        if skill_scores:
            assessment_chart.append({"name": skill[:16], "score": round(sum(skill_scores) / len(skill_scores), 1)})

    stats = []
    if current_user.role == "admin":
        stats = [
            {"label": "Active programs", "value": len(activities), "detail": "Sports + music pathways"},
            {"label": "Student roster", "value": len(students), "detail": "Tracked for progress and certificates"},
            {"label": "Practice hours", "value": round(total_minutes / 60, 1), "detail": "Across all logged sessions"},
            {"label": "Upcoming events", "value": len(event_payload), "detail": "Unified calendar visibility"},
        ]
    elif current_user.role == "coach":
        stats = [
            {"label": "Assigned squads", "value": len(activities), "detail": "Programs you lead"},
            {"label": "Roster members", "value": len(students), "detail": "Students currently visible"},
            {"label": "Avg skill score", "value": round(sum(item.score for item in assessments) / len(assessments), 1) if assessments else 0, "detail": "Latest assessment average"},
            {"label": "Parent updates", "value": len([item for item in practice_logs if item.summary_text]), "detail": "AI-assisted summaries ready"},
        ]
    elif current_user.role == "student":
        stats = [
            {"label": "Enrolled tracks", "value": len(activities), "detail": "Sport + music opportunities"},
            {"label": "Practice hours", "value": round(total_minutes / 60, 1), "detail": "Logged by you"},
            {"label": "Skill badges", "value": len(badge_payload), "detail": "Portfolio highlights"},
            {"label": "Certificates", "value": len(certificate_payload), "detail": "Downloadable achievements"},
        ]
    else:
        stats = [
            {"label": "Linked students", "value": len(students), "detail": "Children attached to your account"},
            {"label": "Progress logs", "value": len(practice_payload), "detail": "Recent updates from practice"},
            {"label": "Badges earned", "value": len(badge_payload), "detail": "Visible portfolio achievements"},
            {"label": "Upcoming events", "value": len(event_payload), "detail": "Concerts and tournaments"},
        ]

    coach_options = [
        {"id": user.id, "name": user.name}
        for user in db.query(User).filter(User.role == "coach").order_by(User.name.asc()).all()
    ]

    return {
        "current_user": serialize_user(current_user),
        "stats": stats,
        "activities": [
            {
                "id": activity.id,
                "title": activity.title,
                "category": activity.category,
                "track": activity.track,
                "description": activity.description,
                "schedule": activity.schedule,
                "capacity": activity.capacity,
                "coach_id": activity.coach_id,
                "coach_name": user_map.get(activity.coach_id).name if user_map.get(activity.coach_id) else "TBD",
                "enrollment_count": len([item for item in enrollments if item.activity_id == activity.id]),
            }
            for activity in activities
        ],
        "students": [
            {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "parent_name": user_map.get(student.parent_id).name if user_map.get(student.parent_id) else "Unassigned",
                "focus_area": student.focus_area,
            }
            for student in students
        ],
        "roster": roster,
        "materials": materials_payload,
        "practice_logs": practice_payload,
        "assessments": assessment_payload,
        "events": event_payload,
        "badges": badge_payload,
        "certificates": certificate_payload,
        "practice_chart": practice_chart,
        "assessment_chart": assessment_chart,
        "options": {
            "students": [{"id": student.id, "name": student.name} for student in students],
            "activities": [{"id": activity.id, "name": activity.title} for activity in activities],
            "coaches": coach_options,
            "enrollments": [{"id": item.id, "label": f"{user_map.get(item.student_id).name} • {activity_map.get(item.activity_id).title}"} for item in enrollments if user_map.get(item.student_id) and activity_map.get(item.activity_id)],
        },
        "service_status": {
            "database_mode": "sqlserver" if os.environ.get("DATABASE_URL") else "sqlite-demo",
            "summary_mode": "azure-openai" if summary_service.configured else "local-demo",
            "storage_mode": "azure-blob" if storage_service.configured else "local-demo",
            "container": AZURE_CONTAINER_NAME,
        },
    }


app.include_router(api_router)
