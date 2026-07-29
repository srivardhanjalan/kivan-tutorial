import uvicorn

if __name__ == "__main__":
    print("Kivan API — http://localhost:8000  (docs: /docs)")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
