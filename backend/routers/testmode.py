# routers/testmode.py
from fastapi import APIRouter, UploadFile, File, Form
from utils.parser import parse_test_paper  # You will need to implement this function
import fitz
import docx2txt

router = APIRouter()

@router.post("/upload-test-paper")
async def upload_test_paper(file: UploadFile = File(...), title: str = Form(...)):
    content = ""

    if not file.filename:
        return {"error": "Invalid file"}

    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        pdf_bytes = await file.read()
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_chunks = [page.get_text() for page in pdf]  # type: ignore
        content = "\n".join(text_chunks)
    elif filename.endswith(".docx"):
        content = docx2txt.process(file.file)
    else:
        return {"error": "Unsupported file type"}

    # You will need a parsing function to structure the questions
    try:
        questions = parse_test_paper(content)
    except Exception as e:
        return {"error": f"Failed to parse test paper: {str(e)}"}

    return {"questions": questions, "title": title}