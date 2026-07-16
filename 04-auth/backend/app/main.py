from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.routes import health, users

app = FastAPI(
    title="Kivan API",
    description="Backend API for Kivan app",
    version="1.0.0"
)

# Gzip compression middleware (70-90% payload reduction)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware. The wildcard origin is safe for THIS api: nothing is
# cookie-authenticated (auth arrives in step 04 as a Bearer header), so
# there are no credentials to leak — which is also why allow_credentials
# is absent (with it, Starlette would mirror every Origin as a
# credentialed one).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers live in app/routes/, one domain per file; main.py only assembles
app.include_router(health.router)
app.include_router(users.router)


@app.get("/")
async def root():
    return {
        "message": "Kivan API",
        "version": "1.0.0",
        "docs": "/docs"
    }
