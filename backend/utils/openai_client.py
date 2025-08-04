import os
from dotenv import load_dotenv
import openai

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

client = openai.OpenAI(api_key=api_key)