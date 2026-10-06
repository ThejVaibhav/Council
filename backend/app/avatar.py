"""The character a user designs. Unknown values fall back to defaults so old clients never break rendering."""
from typing import Literal

from pydantic import BaseModel, Field, field_validator

PET_BREEDS = {
    "dog": ["Indie", "Labrador", "Golden Retriever", "Beagle", "Pug", "German Shepherd", "Husky", "Shih Tzu", "Dachshund", "Pomeranian"],
    "cat": ["Indie", "Persian", "Siamese", "Maine Coon", "Bengal", "British Shorthair"],
    "rabbit": ["Lop", "Lionhead", "Dutch"],
}


class Pet(BaseModel):
    kind: Literal["none", "dog", "cat", "rabbit"] = "none"
    breed: str = ""
    name: str = Field(default="", max_length=20)

    @field_validator("breed")
    @classmethod
    def known_breed(cls, v, info):
        kind = info.data.get("kind", "none")
        if kind == "none":
            return ""
        return v if v in PET_BREEDS[kind] else PET_BREEDS[kind][0]


class Avatar(BaseModel):
    body: Literal["female", "male", "neutral"] = "neutral"
    skin: int = Field(default=2, ge=0, le=7)
    hair: Literal["short", "long", "bun", "curly", "bob", "buzz", "ponytail", "afro", "waves", "bald"] = "short"
    hairColor: int = Field(default=0, ge=0, le=9)
    eyes: Literal["dots", "happy", "lashes", "sleepy"] = "dots"
    brows: Literal["none", "soft", "bold"] = "soft"
    facialHair: Literal["none", "stubble", "beard", "mustache"] = "none"
    glasses: Literal["none", "round", "square", "shades"] = "none"
    headwear: Literal["none", "cap", "beanie", "bucket", "headband"] = "none"
    top: Literal["tee", "hoodie", "shirt", "jacket", "dress"] = "tee"
    topColor: int = Field(default=0, ge=0, le=11)
    bottom: Literal["pants", "shorts", "skirt"] = "pants"
    bottomColor: int = Field(default=0, ge=0, le=7)
    shoeColor: int = Field(default=0, ge=0, le=5)
    pet: Pet = Pet()
