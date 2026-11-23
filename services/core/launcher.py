import os
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.getenv("TIGER_HOST", "127.0.0.1"),
        port=int(os.getenv("TIGER_PORT", "8765")),
        log_level="warning",
    )
