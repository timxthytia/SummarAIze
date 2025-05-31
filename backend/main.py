from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from docx import Document
from routers import summarizer  # later: add mindmap, test_mode
from utils.docx_generator import add_html_to_docx

import io

app = FastAPI()

origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(summarizer.router)

# later:
# app.include_router(mindmap.router)
# app.include_router(test_mode.router)

class DocxRequest(BaseModel):
    title: str
    html: str

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