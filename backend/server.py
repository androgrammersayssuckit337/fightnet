from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'fightnet-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="FightNet API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    first_name: str
    fighter_type: str = "MMA"  # MMA, Boxing, Muay Thai, etc.
    gym: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: str
    first_name: str
    fighter_type: str
    gym: Optional[str] = None
    profile_photo: Optional[str] = None
    wins: int = 0
    losses: int = 0
    kos: int = 0
    created_at: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    fighter_type: Optional[str] = None
    gym: Optional[str] = None
    bio: Optional[str] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    kos: Optional[int] = None

class PostCreate(BaseModel):
    caption: str
    video_url: Optional[str] = None

class PostResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    username: str
    user_photo: Optional[str] = None
    caption: str
    media_url: Optional[str] = None
    media_type: str = "text"
    gloves: List[str] = []  # user_ids who liked
    kos: List[str] = []  # user_ids who KO'd
    comment_count: int = 0
    created_at: str

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    post_id: str
    user_id: str
    username: str
    user_photo: Optional[str] = None
    content: str
    created_at: str

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_username: str
    sender_photo: Optional[str] = None
    receiver_id: str
    content: str
    read: bool = False
    created_at: str

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    user_photo: Optional[str] = None
    last_message: str
    last_message_time: str
    unread_count: int = 0

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"$or": [{"email": user.email}, {"username": user.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user.username,
        "email": user.email,
        "password": hash_password(user.password),
        "first_name": user.first_name,
        "fighter_type": user.fighter_type,
        "gym": user.gym,
        "profile_photo": None,
        "bio": "",
        "wins": 0,
        "losses": 0,
        "kos": 0,
        "followers": [],
        "following": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "fighter_type": user.fighter_type,
            "gym": user.gym,
            "profile_photo": None,
            "wins": 0,
            "losses": 0,
            "kos": 0,
            "created_at": user_doc["created_at"]
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "first_name": user["first_name"],
            "fighter_type": user["fighter_type"],
            "gym": user.get("gym"),
            "profile_photo": user.get("profile_photo"),
            "wins": user.get("wins", 0),
            "losses": user.get("losses", 0),
            "kos": user.get("kos", 0),
            "created_at": user["created_at"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============== USER ROUTES ==============

@api_router.get("/users/{user_id}", response_model=dict)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get post count
    post_count = await db.posts.count_documents({"user_id": user_id})
    user["post_count"] = post_count
    user["follower_count"] = len(user.get("followers", []))
    user["following_count"] = len(user.get("following", []))
    user["is_following"] = current_user["id"] in user.get("followers", [])
    
    return user

@api_router.put("/users/profile", response_model=dict)
async def update_profile(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated_user

@api_router.post("/users/{user_id}/follow", response_model=dict)
async def follow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add to following list
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"following": user_id}}
    )
    # Add to followers list
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"followers": current_user["id"]}}
    )
    
    return {"message": "Followed successfully"}

@api_router.post("/users/{user_id}/unfollow", response_model=dict)
async def unfollow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # Remove from following list
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"following": user_id}}
    )
    # Remove from followers list
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"followers": current_user["id"]}}
    )
    
    return {"message": "Unfollowed successfully"}

@api_router.get("/users/search/{query}", response_model=List[dict])
async def search_users(query: str, current_user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"$or": [
            {"username": {"$regex": query, "$options": "i"}},
            {"first_name": {"$regex": query, "$options": "i"}}
        ]},
        {"_id": 0, "password": 0}
    ).limit(20).to_list(20)
    return users

# ============== POST ROUTES ==============

@api_router.post("/posts", response_model=PostResponse)
async def create_post(
    caption: str = Form(...),
    media: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    post_id = str(uuid.uuid4())
    media_url = None
    media_type = "text"
    
    if media:
        # Save file
        file_ext = media.filename.split('.')[-1] if media.filename else 'mp4'
        filename = f"{post_id}.{file_ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(media.file, buffer)
        
        media_url = f"/api/uploads/{filename}"
        media_type = "video" if file_ext in ['mp4', 'mov', 'avi', 'webm'] else "image"
    
    post_doc = {
        "id": post_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "user_photo": current_user.get("profile_photo"),
        "caption": caption,
        "media_url": media_url,
        "media_type": media_type,
        "gloves": [],
        "kos": [],
        "comment_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(post_doc)
    
    return PostResponse(**post_doc)

@api_router.get("/posts", response_model=List[PostResponse])
async def get_posts(skip: int = 0, limit: int = 20, current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [PostResponse(**post) for post in posts]

@api_router.get("/posts/user/{user_id}", response_model=List[PostResponse])
async def get_user_posts(user_id: str, skip: int = 0, limit: int = 20, current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [PostResponse(**post) for post in posts]

@api_router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse(**post)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.posts.delete_one({"id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    
    return {"message": "Post deleted"}

@api_router.post("/posts/{post_id}/glove", response_model=dict)
async def toggle_glove(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user_id = current_user["id"]
    if user_id in post.get("gloves", []):
        await db.posts.update_one({"id": post_id}, {"$pull": {"gloves": user_id}})
        action = "removed"
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"gloves": user_id}})
        action = "added"
    
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return {"action": action, "glove_count": len(updated_post.get("gloves", []))}

@api_router.post("/posts/{post_id}/ko", response_model=dict)
async def toggle_ko(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user_id = current_user["id"]
    if user_id in post.get("kos", []):
        await db.posts.update_one({"id": post_id}, {"$pull": {"kos": user_id}})
        action = "removed"
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"kos": user_id}})
        action = "added"
    
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return {"action": action, "ko_count": len(updated_post.get("kos", []))}

# ============== COMMENT ROUTES ==============

@api_router.post("/posts/{post_id}/comments", response_model=CommentResponse)
async def create_comment(post_id: str, comment: CommentCreate, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment_id = str(uuid.uuid4())
    comment_doc = {
        "id": comment_id,
        "post_id": post_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "user_photo": current_user.get("profile_photo"),
        "content": comment.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(comment_doc)
    await db.posts.update_one({"id": post_id}, {"$inc": {"comment_count": 1}})
    
    return CommentResponse(**comment_doc)

@api_router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(post_id: str, current_user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [CommentResponse(**c) for c in comments]

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.comments.delete_one({"id": comment_id})
    await db.posts.update_one({"id": comment["post_id"]}, {"$inc": {"comment_count": -1}})
    
    return {"message": "Comment deleted"}

# ============== MESSAGE ROUTES ==============

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(message: MessageCreate, current_user: dict = Depends(get_current_user)):
    receiver = await db.users.find_one({"id": message.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    message_id = str(uuid.uuid4())
    message_doc = {
        "id": message_id,
        "sender_id": current_user["id"],
        "sender_username": current_user["username"],
        "sender_photo": current_user.get("profile_photo"),
        "receiver_id": message.receiver_id,
        "content": message.content,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message_doc)
    
    return MessageResponse(**message_doc)

@api_router.get("/messages/conversations", response_model=List[ConversationResponse])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Get all messages involving the user
    messages = await db.messages.find(
        {"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    if not messages:
        return []
    
    # Collect unique partner IDs first (avoiding N+1 query)
    partner_ids = list(set([
        msg["receiver_id"] if msg["sender_id"] == user_id else msg["sender_id"]
        for msg in messages
    ]))
    
    # Batch fetch all partners in single query
    partners_list = await db.users.find(
        {"id": {"$in": partner_ids}},
        {"_id": 0, "password": 0}
    ).to_list(len(partner_ids))
    partners = {p["id"]: p for p in partners_list}
    
    # Batch fetch unread counts using aggregation
    unread_pipeline = [
        {"$match": {
            "receiver_id": user_id,
            "sender_id": {"$in": partner_ids},
            "read": False
        }},
        {"$group": {"_id": "$sender_id", "count": {"$sum": 1}}}
    ]
    unread_results = await db.messages.aggregate(unread_pipeline).to_list(len(partner_ids))
    unread_counts = {r["_id"]: r["count"] for r in unread_results}
    
    # Group by conversation partner
    conversations = {}
    for msg in messages:
        partner_id = msg["receiver_id"] if msg["sender_id"] == user_id else msg["sender_id"]
        if partner_id not in conversations and partner_id in partners:
            partner = partners[partner_id]
            conversations[partner_id] = {
                "user_id": partner_id,
                "username": partner["username"],
                "user_photo": partner.get("profile_photo"),
                "last_message": msg["content"],
                "last_message_time": msg["created_at"],
                "unread_count": unread_counts.get(partner_id, 0)
            }
    
    return [ConversationResponse(**c) for c in conversations.values()]

@api_router.get("/messages/{user_id}", response_model=List[MessageResponse])
async def get_messages(user_id: str, current_user: dict = Depends(get_current_user)):
    current_id = current_user["id"]
    
    messages = await db.messages.find(
        {"$or": [
            {"sender_id": current_id, "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_id}
        ]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": user_id, "receiver_id": current_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return [MessageResponse(**m) for m in messages]

# ============== UPLOAD ROUTES ==============

@api_router.post("/upload/profile-photo", response_model=dict)
async def upload_profile_photo(
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    file_ext = photo.filename.split('.')[-1] if photo.filename else 'jpg'
    filename = f"profile_{current_user['id']}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    
    photo_url = f"/api/uploads/{filename}"
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"profile_photo": photo_url}})
    
    # Update all posts by this user
    await db.posts.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"user_photo": photo_url}}
    )
    
    return {"photo_url": photo_url}

# ============== STATIC FILES ==============

# Mount uploads directory
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "FightNet API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
