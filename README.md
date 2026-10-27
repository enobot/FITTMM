# FITTMM

A fitness app for planning a training week and recording what you actually lifted. There's a web version (React + FastAPI + MySQL) and an Android version in progress (Kotlin and Java on Firebase), both in this repository.

## What it does

**Web app**

- **Accounts.** Sign up and log in. Passwords are stored hashed, and the API issues JWT access tokens.
- **Build a weekly plan.** A multi-step flow: choose exercises, double-check the plan, then save it.
- **Follow the plan.** A monthly calendar and a breakdown of today's workout.
- **Record workouts** and review progress over time.
- **Plate calculator** with lb/kg switching and a drawn barbell (details in [docs/plate-calculator.md](docs/plate-calculator.md)).
- **BMI calculator.**

**Android app (in progress):** sign-in, a week board, plan building, workout recording, progress history, and the BMI and plate calculators, on Firebase Auth and Cloud Firestore.

## How it fits together

```
React frontend ──HTTP/JSON──▶ FastAPI backend ──SQLAlchemy──▶ MySQL
 (frontend/)                   (backend/)                      (Alembic migrations)

Android app ──Firebase SDK──▶ Firebase Auth + Cloud Firestore
 (android/)
```

| Part | Where | Notes |
|---|---|---|
| Pages | `frontend/src/pages/` | Login, Signup, Homepage |
| Plan flow and tools | `frontend/src/components/` | CreateAPlan → ListOfExercises → DoubleCheck → DoneCreating, plus MonthlyCalendar, TodaysBreakdown, RecordWorkout, MyProgress, PlateCalculator, BMICalculator |
| API calls | `frontend/src/api/workoutApi.js`, `frontend/src/hooks/useWorkoutPlan.js` | |
| Routes | `backend/routers/` | `auth.py`: `/login`, `/register`. `workout.py`: plans, exercises and workout exercises. `bmi.py`: `/calculate-bmi` |
| Data model | `backend/core/database.py` | users, workout_plans, workouts, exercises, workout_exercises, user_progress |
| Auth | `backend/core/security.py` | Password hashing, JWT creation and checking |
| Android UI | `android/app/src/main/kotlin/` | Activities and view models |
| Android data and logic | `android/app/src/main/java/` | Repositories for auth, plans, sessions, profiles and exercises; plate math, units and BMI |

## Team

- **Tracy Tran ([@enobot](https://github.com/enobot)):** project lead and repository owner, React frontend, Android app
- **[@IsaacMorrell13](https://github.com/IsaacMorrell13)** and **[@g-mora5](https://github.com/g-mora5):** FastAPI backend and MySQL database

## Run it locally

### Backend (FastAPI + MySQL)

1. Install MySQL, then create the database and a user (replace the password):

   ```sql
   CREATE DATABASE fitness_app;
   CREATE USER 'fitness_user'@'localhost' IDENTIFIED BY 'somepassword';
   GRANT ALL PRIVILEGES ON fitness_app.* TO 'fitness_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. Set up Python and the `.env` file, from `backend/`:

   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python setup_env.py
   ```

   On Mac or Linux, activate with `source venv/bin/activate`. Only run `setup_env.py` the first time, or after deleting `.env`: it writes the database URL and secret key.

3. Create the tables and start the server:

   ```bash
   alembic upgrade head
   uvicorn main:app --reload
   ```

   The API runs at http://127.0.0.1:8000, with interactive docs at http://127.0.0.1:8000/docs.

### Frontend (React)

From `frontend/`:

```bash
npm install
npm start
```

The app runs at http://localhost:3000.

### Android

Open `android/` in Android Studio (compile SDK 35, min SDK 24). Copy `android/app/google-services.json.example` to `google-services.json` and fill it in from your own Firebase project; the real file is gitignored.

## Tests

Backend, from `backend/` with `.env` set up:

```bash
pip install -r requirements_test.txt
pytest tests/ -v
```

Frontend, from `frontend/`:

```bash
npm install react-router-dom@6 --legacy-peer-deps
npm test -- --watchAll=false
```
