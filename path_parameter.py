from fastapi import FastAPI
from pydantic import BaseModel
app=FastAPI()
@app.get("/notes/{s_no}")
def get_note(s_no: int):
    return {"message": f"Note with ID {s_no} retrieved successfully."}

