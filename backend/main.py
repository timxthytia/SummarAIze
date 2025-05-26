from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# delete below here
class SummarizeRequest(BaseModel):
    text: str
    type: str  # 'short', 'long', 'bullet'

@app.post("/summarize")
async def summarize(request: SummarizeRequest):
    prompt_map = {
        "short": "Summarize the following in a short paragraph:",
        "long": "Summarize the following in a long, detailed paragraph:",
        "bullet": "Summarize the following using bullet points:",
    }

    prompt = f"{prompt_map[request.type]}\n\n{request.text}"

    response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful academic summarizer."},
        {"role": "user", "content": prompt}
    ],
    temperature=0.5,
    max_tokens=500
    )
    summary_text = response.choices[0].message.content
    return {"summary": summary_text}