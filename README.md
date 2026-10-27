# FITTMM

A fitness app for planning a training week and recording what you actually lifted. It started as a three-person team project for a software engineering course: a React and FastAPI web app backed by MySQL. I later added an Android version (Kotlin and Java on Firebase), which is still in progress.

## Overview

I came up with the idea and led the team. I wanted something simpler than most workout apps: decide which exercises go on which days, follow that plan, log your sets, and see your progress, without wading through a giant exercise library first. It's meant for people who lift and want a light weekly structure.

## Features

**Web app, working on `main`**

- **Accounts.** Sign up and log in. Passwords are hashed with Argon2 (`pwdlib`), and the API issues 30-minute JWT access tokens.
- **Weekly plan builder.** A multi-step flow: choose exercises, double-check the plan, then save it to the API.
- **Following the plan.** A monthly calendar and a breakdown of today's workout.
- **Exercise catalog,** including custom exercises.
- **Plate calculator.** Loads a barbell in lb or kg and draws it (details in [docs/plate-calculator.md](docs/plate-calculator.md)).
- **BMI calculator.**

**Partly done**

- **Recording workouts and the progress chart.** The frontend on `main` calls `GET/POST /workout/sessions`. Those endpoints, plus exercise body parts and an account data wipe, are on the `finalUpdate` branch and haven't been merged into `main` yet. On `main`, recording a workout won't save to the server.

**Android app, in progress**

Sign-in, a week board, plan building, workout recording, progress history, and the BMI and plate calculators, on Firebase Auth and Cloud Firestore. It isn't published anywhere.

## Technologies

| Part | Built with |
|---|---|
| Frontend | React 19 (Create React App), React Router 6, Recharts for the progress chart, react-calendar |
| Backend | FastAPI, SQLAlchemy, Alembic migrations, MySQL, PyJWT, `pwdlib` with Argon2 |
| Android | Kotlin for the screens, Java for the data and logic layer, Firebase Auth and Cloud Firestore |
| Tests | pytest with FastAPI's TestClient on SQLite, Jest with React Testing Library |

## Architecture

```
React frontend (:3000) ──fetch + Bearer token──▶ FastAPI (:8000) ──SQLAlchemy──▶ MySQL
  pages/, components/                             routers/ auth, workout, bmi
  api/workoutApi.js                               core/ database models, security
  token in localStorage                           Alembic migrations

Android app ──Firebase SDK──▶ Firebase Auth + Cloud Firestore
  Kotlin UI → Java repositories (plans, sessions, profiles)
```

- **Signing in.** The frontend posts to `/auth/login`, stores the returned JWT in `localStorage`, and sends it as a Bearer token on workout requests. The backend checks it with `OAuth2PasswordBearer` and PyJWT.
- **Saving a plan.** `CreateAPlan` → `ListOfExercises` → `DoubleCheck` builds the plan in React state. `buildPlanCreatePayload` maps exercise names to IDs (creating custom ones if needed), and `savePlan` sends it with `PUT /workout/plan`. The backend stores it across `workout_plans`, `workouts` and `workout_exercises`.
- **Cross-origin access.** CORS allows only `http://localhost:3000`.

Database tables: `users`, `workout_plans`, `workouts`, `exercises`, `workout_exercises`, `user_progress`.

## Project structure

```
frontend/src/
  pages/          Login, Signup, Homepage
  components/     plan flow, MonthlyCalendar, TodaysBreakdown, RecordWorkout,
                  MyProgress, PlateCalculator, BMICalculator (+ tests)
  api/            workoutApi.js: every call to the backend
  hooks/          useWorkoutPlan.js
  utils/          fittmmStorage.js: per-user local storage helpers
backend/
  main.py         app setup, CORS, routers
  routers/        auth.py, workout.py, bmi.py
  core/           database.py (models), security.py (hashing, JWT), crud.py, schemas.py
  alembic/        migrations
  tests/          auth tests (SQLite)
android/app/src/main/
  kotlin/         activities and view models
  java/           repositories, Firebase access, plate math, units, BMI
docs/             plate calculator guide
```

## Setup

**Prerequisites:** Python 3.12, Node.js, MySQL 8, and Android Studio for the app.

```bash
git clone https://github.com/enobot/FITTMM.git
cd FITTMM
```

### Backend

1. Create the database and a user in MySQL (replace the password):

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

   On Mac or Linux, activate with `source venv/bin/activate`. `setup_env.py` writes `.env` with `DATABASE_URL` and a generated `SECRET_KEY`. Run it only once, and never commit `.env`.

3. Create the tables and start the API:

   ```bash
   alembic upgrade head
   uvicorn main:app --reload
   ```

   The API runs at http://127.0.0.1:8000, with interactive docs at `/docs`.

### Frontend

From `frontend/`:

```bash
npm install --legacy-peer-deps
npm start
```

The `--legacy-peer-deps` flag is required: without it, npm tries to add peer packages that aren't in `package-lock.json` and the install fails. The app runs at http://localhost:3000.

### Android

Open `android/` in Android Studio (compile SDK 35, min SDK 24). Copy `android/app/google-services.json.example` to `google-services.json` and fill it in from your own Firebase project; the real file is gitignored.

## How to use

1. Sign up, then log in.
2. On the homepage, create a plan: pick exercises for each day, check them, and save.
3. Use the calendar and today's breakdown to follow it.
4. The plate calculator and BMI calculator work without saving anything.

## Testing and validation

I ran both suites on Oct 26, 2026, on Windows with Python 3.12.10 and Node 25.8.0.

| Suite | Command | Covers | Result |
|---|---|---|---|
| Backend | `pytest tests/ -v` (from `backend/`, after `pip install -r requirements_test.txt`) | Register: valid user, duplicate email, bad email format. Login: right password, wrong password. Runs against a temporary SQLite database, so MySQL isn't needed. | 5 of 5 passed |
| Frontend | `npm test -- --watchAll=false` (from `frontend/`) | Plate calculator: adding a plate, switching units clears plates, Remove All. Sign-up form: mismatched passwords show an error. | 4 of 4 passed, with harmless React Router v7 warnings |

**Not covered yet:** the workout and plan endpoints, the plan-building flow end to end, the Android app, and anything against a real MySQL database. The session endpoints on `finalUpdate` have no tests.

## Security and privacy

- **Passwords** are hashed with Argon2, never stored in plain text.
- **Tokens** are signed with a secret from `.env` and expire after 30 minutes.
- **Requests** are validated by Pydantic schemas; a malformed email is rejected with 422, which a test covers.
- **Cross-origin access** is limited to the local frontend.

Limitations:
- The JWT is kept in `localStorage`, which a cross-site scripting bug could read. An httpOnly cookie would be safer.
- There's no rate limiting on login.
- The CORS setting only covers local development.

## Challenges and what I learned

- **Leading a team through pull requests.** I owned the repository and merged 11 of the team's 16 merged PRs. That made keeping the frontend's API calls in step with the backend's routes part of my job. The unmerged `finalUpdate` branch shows how easily the two drift apart.
- **Building one feature twice.** The Android app reimplements the plate math, unit conversion and BMI logic as plain Java classes, separate from the Kotlin screens, so the logic doesn't depend on any one UI.

## Limitations and future work

- **Merge `finalUpdate`** so recording workouts and the progress chart work on `main`.
- **Tests** for plans, sessions and the full plan flow.
- **Tokens** moved to httpOnly cookies, plus login rate limiting.
- **Deployment:** nothing is deployed; the app only runs locally.
- **Android:** finish it and add tests.

## Team

| Who | What |
|---|---|
| **Tracy Tran ([@enobot](https://github.com/enobot))** | Project idea, team lead and repository owner; React frontend; Android app; later the session, body-part and account-wipe endpoints on `finalUpdate` |
| **[@IsaacMorrell13](https://github.com/IsaacMorrell13)** | FastAPI backend and MySQL schema |
| **[@g-mora5](https://github.com/g-mora5)** | FastAPI backend and MySQL schema |

## Development Transparency

The idea, the features, the user flow and the design of my parts of FITTMM are mine. I used AI-assisted development tools to support parts of my implementation, debugging, testing and documentation. I reviewed what they produced and remain responsible for my parts and the limitations listed above. This note covers my own work only; my teammates' parts are theirs.

## Author

Tracy Tran, Computer Science student at California State University, Fullerton (graduating May 2027).
[tracythutran.com](https://www.tracythutran.com) · [GitHub](https://github.com/enobot)
