from fastapi import APIRouter, UploadFile, File, Form
from utils.parser import parse_test_paper 
import fitz
import docx2txt
import os
import uuid
import subprocess
from fastapi.responses import FileResponse
from fastapi import UploadFile, File
from utils.docx_to_pdf import convert_docx_to_pdf

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

    try:
        questions = parse_test_paper(content)
    except Exception as e:
        return {"error": f"Failed to parse test paper: {str(e)}"}

    return {"questions": questions, "title": title}


# DOCX to PDF conversion endpoint
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@router.post("/convert-docx-to-pdf")
async def convert_docx_endpoint(file: UploadFile = File(...)):
    try:
        UPLOAD_DIR = "uploads"
        PDF_DIR = "converted_pdfs"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        os.makedirs(PDF_DIR, exist_ok=True)

        file_id = str(uuid.uuid4())
        docx_path = os.path.join(UPLOAD_DIR, f"{file_id}.docx")

        with open(docx_path, "wb") as f:
            f.write(await file.read())

        pdf_path = convert_docx_to_pdf(docx_path, PDF_DIR)

        return FileResponse(pdf_path, media_type="application/pdf", filename=os.path.basename(pdf_path))
    except Exception as e:
        print(f"Error converting DOCX to PDF: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Failed to convert DOCX to PDF", "error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )