from fastapi import UploadFile, File
import fitz
import docx2txt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from openai import OpenAI
from utils.openai_client import client
import re
import traceback
import tempfile
import pytesseract
from PIL import Image
import io

router = APIRouter()

def extract_json(content: str) -> str:
    match = re.search(r"```json\n(.*?)```", content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return content.strip()

class MindMapRequest(BaseModel):
    text: str

@router.post("/generate-mindmap")
async def generate_mindmap(request: MindMapRequest):
    prompt = (
        "From the following input, extract a set of concepts and relationships as a mindmap. "
        "Return only valid JSON with two arrays: `nodes` and `edges`. No explanation, no markdown — just JSON.\n\n"
        f"Input:\n{request.text}\n\n"
        "Format:\n"
        "{\n  \"nodes\": [ {\"id\": \"1\", \"label\": \"...\"} ],\n"
        "  \"edges\": [ {\"source\": \"1\", \"target\": \"2\", \"label\": \"...\"} ]\n}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        content = extract_json(response.choices[0].message.content or "")
        # print("Raw OpenAI response:\n", content)
        if content is None:
            raise HTTPException(status_code=500, detail="OpenAI returned no content.")

        if not content.startswith("{"):
            raise HTTPException(status_code=500, detail="OpenAI did not return valid JSON.")

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="OpenAI returned invalid JSON.")

        edges_with_ids = []
        for i, edge in enumerate(data.get("edges", [])):
            edge_id = edge.get("id") or f"e{edge.get('source')}-{edge.get('target')}-{i}"
            edges_with_ids.append({
                "id": edge_id,
                "source": edge.get("source"),
                "target": edge.get("target"),
                "label": edge.get("label", "")
            })

        data["edges"] = edges_with_ids

        return data

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}")


# API endpoint for file uploads
@router.post("/generate-mindmap-file")
async def generate_mindmap_file(file: UploadFile = File(...)):
    try:
        # PDF extraction
        if file.filename and file.filename.lower().endswith(".pdf"):
            pdf_bytes = await file.read()
            pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_chunks = []
            for page in pdf:
                text_chunks.append(page.get_text()) # type: ignore
            content = "\n".join(text_chunks)
        # DOCX extraction
        elif file.filename and file.filename.lower().endswith(".docx"):
            docx_bytes = await file.read()
            with tempfile.NamedTemporaryFile(suffix=".docx", delete=True) as tmp:
                tmp.write(docx_bytes)
                tmp.flush()
                content = docx2txt.process(tmp.name)
         # Image Extraction
        elif file.filename and file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))
            content = pytesseract.image_to_string(image)
        else:
            return {"error": "Unsupported file type. Please upload a PDF, DOCX or Image File."}
        
        # Log extracted content for debugging
        # preview = content[:1000] + ('...[truncated]' if len(content) > 1000 else '')
        # print("\n========== FILE EXTRACTED ==========")
        # print(f"Filename: {file.filename}")
        # print(f"Extracted text preview:\n{preview}\n")
        # print("========== END OF EXTRACTED ==========\n")

        return await generate_mindmap(MindMapRequest(text=content))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}")