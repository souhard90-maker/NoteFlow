from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, func
from sqlalchemy.exc import IntegrityError
from database import SessionLocal, engine, Base
from models import Note, User
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer
from hashlib import pbkdf2_hmac
from hmac import compare_digest
from secrets import token_hex

app = FastAPI()
SECRET_KEY = "my_secret_key"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def hash_password(password: str) -> str:
    salt = token_hex(16)
    digest = pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("pbkdf2_sha256$"):
        try:
            _, salt, digest = stored.split("$", 2)
            candidate = pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310_000).hex()
            return compare_digest(candidate, digest)
        except ValueError:
            return False
    # Existing plaintext passwords remain usable and are upgraded at login.
    return compare_digest(password, stored)


def create_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)

    data = {
        "user_id": user_id,
        "exp": expire
    }

    token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

    return token
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# create_all does not add columns to an existing SQLite table.
with engine.begin() as connection:
    columns = {row[1] for row in connection.execute(text("PRAGMA table_info(notes)"))}
    if "user_id" not in columns:
        connection.execute(text("ALTER TABLE notes ADD COLUMN user_id INTEGER"))
        first_user_id = connection.execute(text("SELECT id FROM users ORDER BY id LIMIT 1")).scalar()
        if first_user_id is not None:
            connection.execute(text("UPDATE notes SET user_id = :user_id"), {"user_id": first_user_id})


class NoteCreate(BaseModel):
    s_no: int | None = None
    title: str
    content: str

class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_error
    return user
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    username = user.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Username already exists")
    new_user = User(username=username, password=hash_password(user.password))
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username already exists")

    return {
        "message": "User registered successfully",
        "username": new_user.username
    }
@app.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username.strip()).first()
    if not existing_user:
        raise HTTPException(status_code=401, detail="Username or password is incorrect")
    if not verify_password(user.password, existing_user.password):
        raise HTTPException(status_code=401, detail="Username or password is incorrect")
    if not existing_user.password.startswith("pbkdf2_sha256$"):
        existing_user.password = hash_password(user.password)
        db.commit()

    token = create_token(existing_user.id)

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer"
    }


# CREATE
@app.post("/notes")
def create_note(note: NoteCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    next_s_no = (db.query(func.max(Note.s_no)).scalar() or 0) + 1
    new_note = Note(
        s_no=next_s_no,
        title=note.title,
        content=note.content,
        user_id=user.id,
    )

    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return new_note


# READ ALL
@app.get("/notes")
def get_notes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    return notes


# READ ONE
@app.get("/notes/{s_no}")
def get_note(s_no: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    note = db.query(Note).filter(Note.s_no == s_no, Note.user_id == user.id).first()

    if note is None:
        raise HTTPException(
            status_code=404,
            detail="Note not found"
        )

    return note


# UPDATE
@app.put("/notes/{s_no}")
def update_note(
    s_no: int,
    note_data: NoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(Note).filter(Note.s_no == s_no, Note.user_id == user.id).first()

    if note is None:
        raise HTTPException(
            status_code=404,
            detail="Note not found"
        )

    note.title = note_data.title
    note.content = note_data.content

    db.commit()
    db.refresh(note)

    return note


# DELETE
@app.delete("/notes/{s_no}")
def delete_note(s_no: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    note = db.query(Note).filter(Note.s_no == s_no, Note.user_id == user.id).first()

    if note is None:
        raise HTTPException(
            status_code=404,
            detail="Note not found"
        )

    db.delete(note)
    db.commit()

    return {"message": "Note deleted successfully"}
