from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
from openai import OpenAI
from utils.openai_client import client
import re
import traceback


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
        "From the following text, extract a set of concepts and how they relate to each other. "
        "Return the result as a JSON with `nodes` and `edges` arrays.\n\n"
        f"Text:\n{request.text}\n\n"
        "Format:\n{\n  \"nodes\": [ {\"id\": \"1\", \"label\": \"...\"} ],\n  "
        "\"edges\": [ {\"source\": \"1\", \"target\": \"2\", \"label\": \"...\"} ]\n}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        content = extract_json(response.choices[0].message.content or "")
        print("Raw OpenAI response:\n", content)
        if content is None:
            raise HTTPException(status_code=500, detail="OpenAI returned no content.")

        data = json.loads(content)

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