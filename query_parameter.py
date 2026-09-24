from fastapi import FastAPI

app = FastAPI()


@app.get("/notes")
def get_notes(
    sort_by: str = "s_no",
    order: str = "date"
):

    return {
        "message": "Notes retrieved successfully."
    }