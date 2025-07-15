# routers/summarizer.py
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from utils.openai_client import client
import fitz  
import docx2txt
import tempfile
import pytesseract
pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"
import os
print("PYTESSERACT CMD:", pytesseract.pytesseract.tesseract_cmd)
print("PATH:", os.environ.get("PATH"))
from PIL import Image
import io
import traceback

router = APIRouter()

class SummarizeRequest(BaseModel):
    text: str
    type: str 

@router.post("/summarize")
async def summarize(request: SummarizeRequest):
    prompt_map = {
        "short": "Summarize the following in a short paragraph:",
        "long": "Summarize the following in a long, detailed paragraph:",
        "bullet": "Summarize the following using bullet points:",
    }

    prompt = f"{prompt_map[request.type]}\n\n{request.text}"

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful academic summarizer."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.5,
        max_tokens=500
    )

    return {"summary": response.choices[0].message.content}


@router.post("/summarize-file")
async def summarize_file(file: UploadFile = File(...), type: str = Form(...)):
    try:
        content = ""
        # PDf Extraction
        if file.filename and file.filename.endswith(".pdf"):
            pdf_bytes = await file.read()
            pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_chunks = []
            for page in pdf:
                text_chunks.append(page.get_text())  # type: ignore
            content = "\n".join(text_chunks)
        # DOCX Extraction
        elif file.filename and file.filename.endswith(".docx"):
            docx_bytes = await file.read()
            with tempfile.NamedTemporaryFile(suffix=".docx", delete=True) as tmp:
                tmp.write(docx_bytes)
                tmp.flush()
                content = docx2txt.process(tmp.name)
        # Image Extraction
        elif file.filename and file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            print("PYTESSERACT CMD (runtime):", pytesseract.pytesseract.tesseract_cmd)
            print("PATH (runtime):", os.environ.get("PATH"))
            print("FILE EXISTS:", os.path.exists(pytesseract.pytesseract.tesseract_cmd))
            import subprocess
            try:
                version = subprocess.check_output([pytesseract.pytesseract.tesseract_cmd, "--version"])
                print("Tesseract CLI version (runtime):", version.decode())
            except Exception as ex:
                print("Error running tesseract --version at runtime:", ex)
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))
            content = pytesseract.image_to_string(image)
        else:
            return {"error": "Unsupported file type. Please upload a PDF, DOCX or Image File."}

        prompt_map = {
            "short": "Summarize the following in a short paragraph:",
            "long": "Summarize the following in a long, detailed paragraph:",
            "bullet": "Summarize the following using bullet points:",
        }

        prompt = f"{prompt_map[type]}\n\n{content}"

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful academic summarizer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=500
        )

        return {"summary": response.choices[0].message.content}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}")
