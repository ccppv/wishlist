"""
Валидация загружаемых изображений: расширение, размер, magic bytes.
"""
from fastapi import UploadFile, HTTPException
from typing import Tuple, Optional

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

IMAGE_SIGNATURES = [
    (b"\xff\xd8\xff", {"jpg", "jpeg"}),
    (b"\x89PNG\r\n\x1a\n", {"png"}),
    (b"GIF87a", {"gif"}),
    (b"GIF89a", {"gif"}),
    (b"RIFF", {"webp"}),
]


def _check_webp(data: bytes) -> bool:
    if len(data) < 12:
        return False
    return data[:4] == b"RIFF" and data[8:12] == b"WEBP"


def _get_image_type_from_bytes(data: bytes) -> Optional[str]:
    if len(data) < 12:
        return None
    if _check_webp(data):
        return "webp"
    for sig, exts in IMAGE_SIGNATURES:
        if sig == b"RIFF":
            continue
        if data.startswith(sig):
            return next(iter(exts))
    return None


async def validate_image_upload(
    file: UploadFile,
    max_size: int = MAX_IMAGE_SIZE,
) -> Tuple[bytes, str]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail=f"Image must be less than {max_size // (1024*1024)}MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    real_type = _get_image_type_from_bytes(contents)
    if not real_type:
        raise HTTPException(status_code=400, detail="File is not a valid image")
    if ext not in (real_type, "jpg" if real_type == "jpeg" else real_type):
        raise HTTPException(status_code=400, detail="File content does not match extension")

    out_ext = "jpg" if real_type == "jpeg" else real_type
    return contents, out_ext
