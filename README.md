# FITTMM

A fitness app for planning a training week, recording what you actually lifted, and watching your training volume grow. It started as a three-person team project for a software engineering course: a React and FastAPI web app backed by MySQL. I've since rebuilt the accounts, added an exercise library with photos and tutorial videos, volume tracking and a settings page, and made it deployable. The Android app (Kotlin and Java) uses the same accounts and the same API, so a workout logged on the phone shows up on the website and the other way around.

## Overview

I came up with the idea and led the team. I wanted something simpler than most workout apps: decide which exercises go on which days, follow that plan, log your sets, and see your progress, without wading through a giant exercise library first. It's meant for people who lift and want a light weekly structure. The library is there when you need it: if you don't know a lift, open it to see photos, steps, form pointers and a video.

## Features

**Accounts**

- **Sign up with Google, Apple or email.** Sign-in runs on Firebase Authentication, so the web and Android apps share one account.
- **Email verification.** Email accounts must confirm their address before the app or API will load their data. The verify page notices the click on its own, even from another tab.
- **Forgot password, two ways.** Get a reset link by email, or a 6-digit code by text to a recovery phone you added in Settings, then choose a new password.
- **Stay signed in.** "Keep me signed in on this device" keeps you logged in across visits; unticked, you're signed out when the browser closes.
- **Sign-up sheet** with Google and Apple buttons, a password strength meter, a 13+ age check, and a welcome step for height, weight and units.

**Training**

- **Weekly plan builder.** Choose exercises for each day, now with photos, from the full library or your own exercises.
- **Recording workouts** set by set, in lb or kg, with a 1 to 5 rating per exercise.
- **Volume tracking.** Volume is reps × weight. The Volume page shows totals for 7 days to a year, week-over-week change, volume per week and per day, a body-part split, and each exercise's best set and estimated one-rep max (Epley).
- **Homepage** led by this week's volume drawn as a loaded barbell (one plate per training day, thicker for more volume), the week's plan with logged days ticked, today's breakdown with photos, the progress chart, body stats and the plate calculator.

**Exercise library**

- **876 exercises with photos and step-by-step instructions**, filterable by body part, equipment and level, plus any custom exercises you add.
- **Tutorial videos.** Each exercise page searches YouTube for "how to do … proper form", lets you pick from several videos and refine the search, and plays the one you choose next to the steps, form pointers (written for each movement pattern) and the muscles worked.

**Settings**

- Profile: name, birthday (age is calculated), gender, height, current and goal weight, and imperial or metric units.
- BMI with its category, and a weight history with a trend chart; logging a new weigh-in keeps the previous one.
- Sign-in methods: connect or disconnect Google and Apple, change your password (or add one to a Google or Apple account), add or change your recovery phone.
- Light or dark theme, remove all training data, or delete the account entirely.

**Tools:** the plate calculator (lb or kg, details in [docs/plate-calculator.md](docs/plate-calculator.md)) and BMI.

**Android app**

- Same account and data as the website: sign in with Google, Apple or email, email verification, reset by email or by text to a recovery phone.
- Home with this week's volume, today's plan and the week; plan builder with the photo library; recording workouts; history.
- Exercise library with photos, steps, form pointers and tutorial videos that open in the YouTube app.
- Volume page (totals, weekly bars, body parts, per-exercise bests) and Settings (profile, BMI, weight history, sign-in methods, recovery phone, theme, remove data, delete account).

## Technologies

| Part | Built with |
|---|---|
| Frontend | React 19 (Create React App), React Router 6, Firebase Auth JS SDK, Recharts, self-hosted Big Shoulders Display and Barlow fonts |
| Backend | FastAPI, SQLAlchemy, Alembic, MySQL or MariaDB, firebase-admin (ID token verification), httpx (YouTube Data API) |
| Exercise data | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain), photos served from the jsDelivr CDN at a pinned commit |
| Android | Kotlin for the screens, Java for the data and logic layer, Firebase Auth, Credential Manager (one-tap Google), Coil for photos; talks to the same FITTMM API |
| Hosting | Firebase Hosting for the web app; the API is a Docker image (Railway, Render, Fly.io, Cloud Run or a VPS with Docker Compose) |
| Tests | pytest with FastAPI's TestClient on SQLite, Jest with React Testing Library, the Firebase Auth emulator for end-to-end runs |

## Architecture

```
Browser (React) ──Firebase JS SDK──▶ Firebase Auth (Google, Apple, email, phone)
      │                                      │ ID token (refreshed hourly)
      └──fetch + Bearer <Firebase ID token>──▶ FastAPI ──SQLAlchemy──▶ MySQL / MariaDB
                                                  │
                                                  └──httpx──▶ YouTube Data API (cached)
Android app ──Firebase SDK──▶ Firebase Auth
      └──HTTPS + Bearer <Firebase ID token>──▶ the same FastAPI
```

- **Signing in.** The web app signs in with Firebase and stores the current ID token as the Bearer token for API calls; Firebase refreshes it automatically. The API verifies it with firebase-admin. The first request from a new account creates its database row; an older email/password row is linked only when Firebase says the email is verified, so nobody can claim someone else's data by signing up with their address.
- **Email verification** is enforced twice: the app sends unverified email accounts to the verify page, and the API refuses their tokens (403).
- **Phone recovery.** Firebase phone sign-in would normally create a new account for an unknown number, so the app deletes any account created that way and tells the person to reset by email instead.
- **Legacy tokens.** `/auth/register` and `/auth/login` (the original HS256 JWT login) still work for API clients and the original tests. Production turns them off with `ENABLE_LEGACY_PASSWORD_AUTH=false`.
- **Exercise library.** On startup the API seeds `backend/data/exercise_library.json` into the `exercises` table (idempotent). The list endpoint returns compact rows; the detail endpoint adds instructions, form pointers and the video search query.
- **Videos.** A YouTube search costs 100 of the free 10,000 daily quota units, so results are cached per query for a week and each user gets 30 uncached searches a day. Without an API key, the page offers a plain "Search YouTube" link instead.
- **Volume** is computed on the server from logged sessions, using the date the workout happened on the user's own calendar.

Database tables: `users`, `weight_entries`, `workout_plans`, `workouts`, `exercises`, `workout_exercises`, `workout_sessions`, `user_progress`, `video_cache`.

## Project structure

```
frontend/src/
  auth/           Firebase setup, sign-in helpers, auth context and route guard, auth layout
  pages/          Login, Signup, VerifyEmail, ForgotPassword, AuthAction (email links), Welcome,
                  Homepage, ExerciseLibrary, ExerciseDetail, Volume, Settings (+ tests)
  components/     TopNav, PlateStack, ProfileForm, plan flow, RecordWorkout, TodaysBreakdown,
                  MyProgress, PlateCalculator (+ tests)
  api/            workoutApi.js (plans, sessions), accountApi.js (profile, weights, volume, videos)
  hooks/          useWorkoutPlan, useExerciseCatalog
  styles/         design tokens (colors, type scale, light and dark themes)
backend/
  main.py         app setup, CORS, gzip, startup seeding, /health
  routers/        auth.py, profile.py, workout.py (plans, exercises, videos, sessions, volume), bmi.py
  core/           database models, security (JWT + Firebase), firebase_auth, exercise_library,
                  volume, youtube, crud, schemas
  data/           exercise_library.json (876 exercises)
  alembic/        migrations
  tests/          pytest suites (SQLite)
android/          Android app (see below)
firebase.json     Firebase Hosting config and the local Auth emulator
docker-compose.yml  self-hosted API + MariaDB
```

## Running it locally

**Prerequisites:** Python 3.12, Node.js 20+, MySQL 8 or MariaDB, the Firebase CLI (`npm install -g firebase-tools`), and Android Studio for the app. Local development uses the Firebase Auth **emulator**, so you don't need a Firebase project, Google or Apple developer accounts, or SMS credits.

```bash
git clone https://github.com/enobot/FITTMM.git
cd FITTMM
```

### 1. Auth emulator

From the repo root:

```bash
firebase emulators:start --only auth --project demo-fittmm
```

It runs on port 9099. Verification emails, reset links and texted codes aren't sent anywhere; read them from the emulator:

- Emails: http://127.0.0.1:9099/emulator/v1/projects/demo-fittmm/oobCodes
- Text codes: http://127.0.0.1:9099/emulator/v1/projects/demo-fittmm/verificationCodes

### 2. Backend

1. Create the database and a user in MySQL or MariaDB (replace the password):

   ```sql
   CREATE DATABASE fitness_app;
   CREATE USER 'fitness_user'@'localhost' IDENTIFIED BY 'somepassword';
   GRANT ALL PRIVILEGES ON fitness_app.* TO 'fitness_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. From `backend/`, set up Python and the `.env` file:

   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```

   On Mac or Linux, activate with `source venv/bin/activate` and use `cp`. Fill in `DATABASE_URL` and `SECRET_KEY` (`.env.example` explains each setting). Keep `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` for local work. Never commit `.env`.

3. Create the tables and start the API:

   ```bash
   alembic upgrade head
   uvicorn main:app --reload
   ```

   The API runs at http://127.0.0.1:8000 with interactive docs at `/docs`. The first start seeds the exercise library.

### 3. Frontend

From `frontend/`:

```bash
npm install --legacy-peer-deps
npm start
```

`--legacy-peer-deps` is required: without it, npm tries to add peer packages that aren't in `package-lock.json` and the install fails. The app runs at http://localhost:3000 and, through `.env.development`, signs in against the emulator. With the emulator, "Continue with Google" and "Continue with Apple" open a stand-in sign-in page where you make up an account.

### Android

Open `android/` in Android Studio (compile SDK 35, min SDK 24, JDK 17).

- **Local development:** with no `google-services.json`, the app signs in against the Auth emulator and calls the API at `http://10.0.2.2:8000`, which is your computer as seen from the Android emulator. Start the emulator and the backend first (steps 1 and 2). To use a phone on your Wi-Fi instead, build with `-PfittmmDebugApiUrl=http://<your-computer's-IP>:8000` and run uvicorn with `--host 0.0.0.0`.
- **Real Firebase project:** copy `android/app/google-services.json.example` to `google-services.json` and fill it in from your project (the real file is gitignored). Add your app's SHA-1 fingerprint in the Firebase console so Google sign-in and phone codes work.
- **Release builds** call `https://api.example.com` unless you pass `-PfittmmApiUrl=https://your-api` (or set `fittmmApiUrl` in `android/gradle.properties`).
- Unit tests: `gradlew testDebugUnitTest` from `android/`.

## Deploying

The web app goes to Firebase Hosting; the API and database go anywhere that runs a Docker image.

### 1. Firebase project

1. Create a project at console.firebase.google.com and add a **Web app** (and the Android app, package `com.fittmm.app`).
2. **Authentication > Sign-in method:** enable Email/Password, Google, Apple and Phone.
   - **Apple** needs an Apple Developer Program membership ($99 a year): a Services ID, a Sign in with Apple key, and your domain registered with Apple. Firebase's Apple provider page lists each value.
   - **Phone** text messages need the pay-as-you-go **Blaze** plan and are billed per message (see Firebase's pricing page for current rates).
3. **Authentication > Settings > Authorized domains:** add your site's domain.
4. **Authentication > Templates:** for each email, choose *Customize action URL* and set `https://<your-site>/auth/action`, so links open FITTMM's own pages.

### 2. API and database

Use any MySQL 8 or MariaDB database (for example Railway, Aiven, Google Cloud SQL, or the Compose file below). Deploy `backend/` with its `Dockerfile`; it runs `alembic upgrade head` on start and listens on `$PORT`. Set these environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `mysql+mysqlconnector://user:password@host:3306/fitness_app` |
| `SECRET_KEY` | a long random string (`python -c "import secrets; print(secrets.token_hex(32))"`) |
| `FIREBASE_PROJECT_ID` | your Firebase project ID |
| `CORS_ORIGINS` | your site's origin(s), comma-separated, e.g. `https://fittmm.web.app` |
| `ENABLE_LEGACY_PASSWORD_AUTH` | `false` |
| `SEED_DEMO_USER` | `false` |
| `YOUTUBE_API_KEY` | optional; enable *YouTube Data API v3* in Google Cloud and create an API key restricted to it |

Don't set `FIREBASE_AUTH_EMULATOR_HOST` in production. The health check is `GET /health`.

**Self-hosting on one machine:** copy `.env.compose.example` to `.env`, fill it in, then run `docker compose up -d --build`. That starts MariaDB and the API on port 8000; put HTTPS in front of it (Caddy or nginx).

### 3. Web app

From `frontend/`, copy `.env.example` to `.env.production.local` and fill in the Firebase web config and `REACT_APP_API_URL` (your API's HTTPS address). Then, from the repo root:

```bash
npm --prefix frontend run build
firebase use --add
firebase deploy --only hosting
```

`firebase use --add` picks your real project instead of the `demo-fittmm` emulator project.

## How to use

1. Sign up with Google, Apple or email. Email accounts confirm their address, then everyone fills in a short profile (or skips it).
2. Build your weekly plan: pick exercises for each day and save.
3. Each training day, record your sets. The homepage, Volume page and progress chart update from what you log.
4. Don't know a lift? Open it in Exercises for photos, steps, form pointers and a video.
5. In Settings, log your weight, set a goal, add a recovery phone, and switch units or theme.

## Testing and validation

I ran everything on Oct 27, 2026, on Windows with Python 3.12.10, Node 25.8.0 and MariaDB 11.4.8.

| Suite | Command | Covers | Result |
|---|---|---|---|
| Backend | `pytest tests/ -v` (from `backend/`, after `pip install -r requirements_test.txt`) | The original register and login tests, plus: Firebase tokens (new user, unverified email refused, verified email links an old account, takeover blocked, bad token), profile age and BMI, birthday and unit validation, weight history, the seeded library and its filters, per-user custom exercise names, volume totals and timezone handling, everyday names' body parts, video search with and without a key (YouTube mocked, cache checked), legacy auth switch, data wipe and account deletion, unreadable password hashes, form pointers | 25 of 25 passed |
| Frontend | `npm test -- --watchAll=false` (from `frontend/`) | The original plate calculator and sign-up tests, plus password rules and strength, phone formatting, Firebase error messages, unit conversion and age, sign-up's Google/Apple buttons and age and password checks, log-in without Firebase settings, reset-page validation | 17 of 17 passed, with harmless React Router v7 warnings |
| Migrations | `alembic upgrade head` on MariaDB 11.4 | Upgraded a database holding older data to the new schema, then downgraded and upgraded again; the old user and global exercise survived, and the library adopted the existing "Romanian Deadlift" instead of duplicating it | Passed |
| Android | `gradlew testDebugUnitTest` (from `android/`) | Converting plans and workouts to and from the website's format (so both apps read each other's logs), parsing exercises, profile, weight history, volume and videos, API error messages, password and phone rules, age | 10 of 10 passed |
| Android end to end | Android 15 emulator against the same Auth emulator, API and MariaDB | Logging in with the account created on the website showed its plan and 5,180 lb week; library photos and an exercise page; a workout logged on the phone raised the website's weekly volume to 8,180 lb (checked in the database and on the website); Settings and Volume showed the same profile and totals | Passed |
| End to end | Browser against the Auth emulator, the API and MariaDB | Email sign-up, verification through `/auth/action`, the welcome step, building a plan, recording a workout (volume 5,180 lb, checked by hand), the Volume page, the library and an exercise page, logging weight history, adding a recovery phone, resetting the password by text and by email link, logging in with the new password, the old password refused, staying signed in after a reload, and phone-width layouts | Passed |

**Not covered yet:** Google and Apple through their real sign-in windows on either app (the test browser can't open pop-ups; the API side was checked with emulator-issued Google and Apple tokens), one-tap Google on Android (it needs a real Firebase project), the Android sign-up, verification, reset and phone screens on the emulator (the same flows were tested on the website), real SMS and email delivery, a live YouTube API key (the video picker was checked with stand-in results), and the Docker image itself (Docker wasn't installed; its entry script was run directly).

## Security and privacy

- **Passwords** are handled by Firebase Authentication; FITTMM's own database stores no passwords for Firebase accounts. Legacy accounts' passwords are hashed with Argon2.
- **Tokens** are Firebase ID tokens that expire after an hour and are verified on every API request.
- **Email verification** is required before an email account can use the API.
- **Phone recovery** never creates accounts, and changing the recovery phone only replaces the old number once the new code checks out.
- **Deleting the account** asks for your password (or Google or Apple) again before anything is removed.
- **Requests** are validated by Pydantic schemas; CORS is limited to the configured site in production.
- **The YouTube key** stays on the server, and searches are cached and capped per user.

Limitations:
- The Firebase ID token is kept in `localStorage`, which a cross-site scripting bug could read.
- There's no rate limiting on the API beyond what Firebase applies to sign-in.

## Challenges and what I learned

- **Leading a team through pull requests.** I owned the repository and merged 11 of the team's 16 merged PRs. That made keeping the frontend's API calls in step with the backend's routes part of my job. The `finalUpdate` branch, now merged, showed how easily the two drift apart.
- **Building one feature twice.** The Android app reimplements the plate math, unit conversion and BMI logic as plain Java classes, separate from the Kotlin screens, so the logic doesn't depend on any one UI.
- **Trusting a sign-in provider safely.** Linking old accounts only on a verified email, refusing unverified tokens on the server as well as in the app, and stopping phone recovery from quietly creating new accounts were the parts that needed the most care.

## Limitations and future work

- **Android:** UI tests for the sign-in screens, and a Play Store release build.
- **Images to review before going public:** `frontend/public/pictures/` holds anatomy illustrations of unknown origin (not used by the app) and `spongebob.jpeg` (Nickelodeon artwork, shown after saving a plan).
- **The original plan-flow pages** (create, pick exercises, review, record) still use their earlier styling.
- **Tokens** moved to httpOnly cookies, and API rate limiting.

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
