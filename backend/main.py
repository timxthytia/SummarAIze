from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import summarizer  # later: add mindmap, test_mode

app = FastAPI()

origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(summarizer.router)

# later:
# app.include_router(mindmap.router)
# app.include_router(test_mode.router)