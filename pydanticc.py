from fastapi import FastAPI
from pydantic import BaseModel
app=FastAPI()
class noes(BaseModel):
    s_no: int
    title: str
    content: str
@app.post("/notes")
def create_note(note: noes):#noes is just name for our class,but we can use any name for our class
    return {"message": "Note created successfully.", "note": note}