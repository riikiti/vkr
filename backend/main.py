"""
FastAPI application for the Cryptanalysis Research Platform.

Run from the project root:
    uvicorn backend.main:app --reload --port 8000

Or from the backend/ directory:
    cd backend
    uvicorn main:app --reload --port 8000
"""
import sys
import os

# Ensure project root is on sys.path BEFORE any other imports,
# so that core/, data_generation/, analytics/, config.py are accessible.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Also ensure the backend directory itself is importable
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.experiments import router as experiments_router
from api.reports import router as reports_router

app = FastAPI(
    title="Cryptanalysis Research Platform API",
    description="Backend API for entropy-based cryptographic algorithm analysis",
    version="1.0.0",
)

# CORS configuration — allow Vite dev server and common local origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(experiments_router)
app.include_router(reports_router)


@app.get("/")
def root():
    return {
        "name": "Cryptanalysis Research Platform API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
