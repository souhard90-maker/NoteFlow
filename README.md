# 📝 NoteFlow

A full-stack notes application built with **FastAPI, React, SQLAlchemy, SQLite, and JWT authentication**.

NoteFlow allows users to create an account, log in, and manage their personal notes through a clean web interface connected to a FastAPI backend.

This is my **first full-stack application**, built to learn and apply backend, database, authentication, and frontend development concepts together.

## 🚀 Features

* User registration
* User login
* JWT-based authentication
* Create notes
* View notes
* Delete notes
* Search notes
* Personal note history
* React-based frontend
* FastAPI REST API
* SQLite database
* SQLAlchemy ORM
* Frontend-backend integration

## 🛠️ Tech Stack

### Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite
* Pydantic
* JWT (`python-jose`)

### Frontend

* React
* Vite
* JavaScript
* Axios
* CSS

## 📂 Project Structure

```text
NoteFlow/
│
├── database.py
├── models.py
├── main.py
│
├── notes_frontend/
│   └── frontend/
│       ├── src/
│       │   ├── App.jsx
│       │   ├── App.css
│       │   └── ...
│       ├── package.json
│       └── vite.config.js
│
├── .gitignore
└── README.md
```

## ⚙️ Running the Backend

Clone the repository:

```bash
git clone https://github.com/souhard90-maker/NoteFlow.git
cd NoteFlow
```

Create a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the dependencies:

```bash
pip install fastapi uvicorn sqlalchemy pydantic "python-jose[cryptography]"
```

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The API will run at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

## 💻 Running the Frontend

Open another terminal:

```bash
cd notes_frontend/frontend
npm install
npm run dev
```

The frontend will normally run at:

```text
http://localhost:5173
```

## 🔐 Authentication

NoteFlow uses JWT authentication to protect user-specific notes.

After login, the frontend receives an access token and sends it with authenticated API requests.

```text
Authorization: Bearer <token>
```

The backend uses the token to identify the authenticated user.

## 🎯 What I Learned

Building NoteFlow helped me practice:

* Building REST APIs with FastAPI
* Working with databases using SQLAlchemy
* Designing database models
* Creating CRUD operations
* User authentication
* JWT tokens
* Connecting React with a backend API
* Sending requests using Axios
* Managing frontend state with React
* Using Git and GitHub
* Connecting multiple technologies into one application

## 👨‍💻 Author

**Souhard Chawla**

GitHub: https://github.com/souhard90-maker
