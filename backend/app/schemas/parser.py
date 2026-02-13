from pydantic import BaseModel, HttpUrl
from typing import List


class ParseProductRequest(BaseModel):
    url: HttpUrl


class ParsedProductData(BaseModel):
    title: str
    price: float | None = None
    images: List[str] = []
    description: str | None = None
