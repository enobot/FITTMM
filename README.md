# Read Me Doc for Devs

# Fitness Web App: FITTMM

Full-stack fitness tracking web application built with:

- Backend: FastAPI (Python)
- Frontend: React (JavaScript)

## Features (so far)

- BMI Calculator

---

## Project Structure

fitness-web-app/
│
├── backend/
├── frontend/
└── README.md

---

## How to Run Backend

cd backend
python -m venv venv

# Activate environment
# Mac/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Then

pip install -r requirements.txt

uvicorn main:app --reload

Backend runs at:
http://127.0.0.1:8000

API docs:
http://127.0.0.1:8000/docs

---

## How to Run Frontend

cd frontend
npm install
npm start

Frontend runs at:
http://localhost:3000
