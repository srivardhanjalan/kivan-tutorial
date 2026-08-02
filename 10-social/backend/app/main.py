from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.routes import (
    followers,
    health,
    life_events,
    loves,
    products,
    storefronts,
    upload,
    users,
    wishes,
    wishlists,
)

app = FastAPI(
    title="Kivan API",
    description="Backend API for Kivan app",
    version="1.0.0"
)

# Gzip for responses over 1 KB — the OpenAPI document, and now this step's
# list endpoints (a wishlist grid or the life-events taxonomy crosses it)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware. The wildcard origin is safe for THIS api: auth is a
# Bearer header, not a cookie, so there are no credentials to leak — which
# is also why allow_credentials is absent (with it, Starlette would mirror
# every Origin as a credentialed one).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers live in app/routes/, one domain per file; main.py only assembles
app.include_router(health.router)
app.include_router(users.router)
app.include_router(upload.router)
app.include_router(life_events.router)
app.include_router(wishlists.router)
app.include_router(wishes.router)
# The wishlist-scoped wishes listing lives on a second router under /wishlists
app.include_router(wishes.wishlist_wishes_router)
# The curated catalog: stores, plus the storefront-scoped product listing
app.include_router(storefronts.router)
app.include_router(products.router)
# Social (step 10): the follow graph and loves. followers and the loved-list
# hang off /users (their {user_id} paths are deeper than users.router's
# catch-all, so they never collide); the love actions hang off /wishlists.
app.include_router(followers.router)
app.include_router(loves.love_router)
app.include_router(loves.loved_router)


@app.get("/")
async def root():
    return {
        "message": "Kivan API",
        "version": app.version,
        "docs": "/docs"
    }
