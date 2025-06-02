from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from docx import Document
from routers import summarizer 
from utils.docx_generator import add_html_to_docx

import io

app = FastAPI()

origins = ["http://localhost:5173", "https://orbital-summaraize.vercel.app",]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(summarizer.router)

class DocxRequest(BaseModel):
    title: str
    html: str

# Backend function to download docx with text-styles
@app.post("/generate-docx")
async def generate_docx(data: DocxRequest):
    try:
        doc = Document()
        doc.add_heading(data.title or "Summary", 0)
        add_html_to_docx(doc, data.html)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)

        headers = {
            "Content-Disposition": f"attachment; filename={data.title or 'summary'}.docx"
        }
        return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))