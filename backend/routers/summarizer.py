# routers/summarizer.py
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from utils.openai_client import client
import fitz  
import docx2txt 

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
    content = ""

    if file.filename and file.filename.endswith(".pdf"):
        pdf_bytes = await file.read()
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_chunks = []
        for page in pdf:
            text_chunks.append(page.get_text())  # type: ignore
        content = "\n".join(text_chunks)
    elif file.filename and file.filename.endswith(".docx"):
        content = docx2txt.process(file.file)
    else:
        return {"error": "Unsupported file type"}

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