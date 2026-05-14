# api/app.py

from dotenv import load_dotenv
load_dotenv(override=True)   # doit être avant tout autre import

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router
from .auth_routes import router as auth_router
from .appointment_routes import router as appointment_router
from .evaluation_routes import router as evaluation_router

app = FastAPI(title="Attijari Chatbot API", version="1.0.0")

# CORS للـ frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
app.include_router(appointment_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")


@app.get("/")
async def health_check():
    return {"status": "ok", "service": "Attijari Chatbot API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)