from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from google import genai

from database import init_db, get_connection
from models import UserCreate

import random
import os

from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

SPORT_GROUPS = {
    "football": 10,
    "basketball": 6,
    "tennis": 2,
    "running": 4
}

events = []

class Message(BaseModel):
    message: str

class CompatibilityRequest(BaseModel):
    user_id: int
    target_name: str
    target_desc: str

class EventCreate(BaseModel):
    creator: str
    sport: str
    location: str
    time: str

@app.get("/")
async def root():
    return {
        "status": "ShowUp2Move API Running"
    }

@app.post("/users")
async def create_user(user: UserCreate):

    try:

        conn = get_connection()

        cursor = conn.cursor()

        sports_str = ",".join(user.sports)

        cursor.execute(
            """
            INSERT INTO users
            (name, description, sports, skill_level, available)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user.name,
                user.description,
                sports_str,
                user.skill_level,
                user.available
            )
        )

        conn.commit()

        new_id = cursor.lastrowid

        conn.close()

        return {
            "id": new_id,
            "status": "success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/availability/{user_id}")
async def update_availability(user_id: int, available: int):

    try:

        conn = get_connection()

        cursor = conn.cursor()

        cursor.execute(
            "UPDATE users SET available = ? WHERE id = ?",
            (available, user_id)
        )

        conn.commit()

        conn.close()

        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/match/{sport}")
async def match_users(sport: str):

    try:

        conn = get_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT name, sports, available, description
            FROM users
            WHERE sports LIKE ?
            AND available = 1
            """,
            (f"%{sport}%",)
        )

        rows = cursor.fetchall()

        conn.close()

        return [
            {
                "name": row[0],
                "sports": row[1],
                "available": row[2],
                "description": row[3]
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/extract-sports")
async def extract_sports(description: str):

    try:

        prompt = f"""
        Extract ONLY sports from this text:

        "{description}"

        Return ONLY comma separated sports.
        Example:
        football, tennis

        If none found return:
        none
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return {
            "sports": response.text.strip().lower()
        }

    except Exception:

        known = [
            "football",
            "basketball",
            "tennis",
            "running",
            "yoga",
            "gym",
            "swimming",
            "cycling"
        ]

        found = [
            s for s in known
            if s in description.lower()
        ]

        return {
            "sports": ",".join(found) if found else "none"
        }

@app.post("/chat")
async def chat_with_assistant(msg: Message):

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"""
            You are an energetic sports assistant
            for ShowUp2Move.

            Keep answers short and friendly.

            User:
            {msg.message}
            """
        )

        return {
            "reply": response.text
        }

    except Exception:

        return {
            "reply": "Search for a sport and start matching with players nearby."
        }

@app.post("/ai/compatibility")
async def get_compatibility(req: CompatibilityRequest):

    try:

        conn = get_connection()

        c = conn.cursor()

        c.execute(
            """
            SELECT name, description, sports
            FROM users
            WHERE id = ?
            """,
            (req.user_id,)
        )

        current_user = c.fetchone()

        conn.close()

        if not current_user:
            return {
                "analysis": "Score: 0% | Create a profile first."
            }

        prompt = f"""
        Analyze compatibility between:

        USER 1:
        {current_user[0]}
        Bio: {current_user[1]}
        Sports: {current_user[2]}

        USER 2:
        {req.target_name}
        Bio: {req.target_desc}

        Return:
        Score: X% | Reason: short sentence
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return {
            "analysis": response.text
        }

    except Exception:

        score = random.randint(82, 98)

        reasons = [
            "Great energy and matching sports interests.",
            "Strong compatibility based on play style.",
            "Both users seem competitive and social.",
            "Excellent match for team activities."
        ]

        return {
            "analysis": f"Score: {score}% | Reason: {random.choice(reasons)}"
        }

@app.post("/groups/{sport}")
async def create_groups(sport: str):

    conn = get_connection()

    c = conn.cursor()

    c.execute(
        """
        SELECT id, name, sports
        FROM users
        WHERE sports LIKE ?
        AND available = 1
        """,
        (f"%{sport}%",)
    )

    users = c.fetchall()

    conn.close()

    needed = SPORT_GROUPS.get(sport, 4)

    if len(users) < needed:

        return {
            "status": "not_enough_players",
            "players_found": len(users),
            "needed": needed
        }

    random.shuffle(users)

    group = users[:needed]

    captain = random.choice(group)

    return {
        "sport": sport,
        "captain": captain[1],
        "players": [
            {
                "id": u[0],
                "name": u[1]
            }
            for u in group
        ]
    }

@app.post("/events")
async def create_event(event: EventCreate):

    events.append(event.dict())

    return {
        "status": "created",
        "event": event
    }

@app.get("/events")
async def get_events():
    return events

@app.post("/debug/reset")
async def reset_db():

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute("DELETE FROM users")

    demo_users = [
        (
            "Alex M.",
            "Marathon runner looking for teammates.",
            "running",
            "intermediate",
            1
        ),
        (
            "Sarah J.",
            "Competitive tennis player ready for matches.",
            "tennis",
            "advanced",
            1
        ),
        (
            "Mike T.",
            "Casual basketball player.",
            "basketball",
            "beginner",
            1
        )
    ]

    cursor.executemany(
        """
        INSERT INTO users
        (name, description, sports, skill_level, available)
        VALUES (?, ?, ?, ?, ?)
        """,
        demo_users
    )

    conn.commit()

    conn.close()

    return {
        "status": "Database seeded"
    }