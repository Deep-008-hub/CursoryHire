import os
import tempfile
from typing import Optional

def extract_text_from_pdf(file_path: str) -> str:
    try:
        import pdfplumber
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
        return text.strip()
    except Exception as e:
        print(f"PDF parse error: {e}")
        return ""

def extract_text_from_docx(file_path: str) -> str:
    try:
        import docx
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs).strip()
    except Exception as e:
        print(f"DOCX parse error: {e}")
        return ""

def parse_resume_file(file_path: str, filename: str) -> dict:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    elif ext in (".docx", ".doc"):
        text = extract_text_from_docx(file_path)
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    else:
        text = ""
    return {"filename": filename, "text": text.strip()}

def validate_resume_text(text: str) -> bool:
    return len(text.split()) > 30

async def save_upload_temp(file) -> tuple[str, str]:
    """Save UploadFile to temp dir, return (temp_path, filename)"""
    filename = file.filename or "resume.pdf"
    ext = os.path.splitext(filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        return tmp.name, filename
