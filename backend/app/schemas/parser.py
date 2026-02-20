from pydantic import BaseModel, field_validator
from typing import List, Optional


class ParseProductRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            return v
        if not v.startswith(("http://", "https://")):
            return "https://" + v
        return v


class ParsedProductData(BaseModel):
    title: str
    price: Optional[float] = None
    images: List[str] = []
    description: Optional[str] = None
