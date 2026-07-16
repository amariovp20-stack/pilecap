from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, pilecap

app = FastAPI(
    title="PileCap Design API",
    version="2.0.0",
    description="API para cálculo preliminar de cabezales de pilotes"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.(vercel\.app|onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(pilecap.router, prefix="/api/pilecap", tags=["PileCap"])
