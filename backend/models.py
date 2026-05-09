from pydantic import BaseModel
from typing import List

class UserCreate(BaseModel):
    name: str
    description: str
    sports: List[str]
    skill_level: str = "intermediate"
    available: int = 0

class AvailabilityUpdate(BaseModel):
    user_id: int
    available: bool

class MatchRequest(BaseModel):
    sport: str