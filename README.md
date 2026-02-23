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

# How to Run Backend

cd backend

python -m venv venv

## Activate environment:

## Mac/Linux:

source venv/bin/activate

## Windows:

venv\Scripts\activate

## Install Requirements

pip install -r requirements.txt

## MySQL Local Database Setup

Install MySQL: https://dev.mysql.com/downloads/mysql/

Choose Full Installation

During configuration set a root user password

## Create Database & User

In MySQL Workbench run to create the database:

```
CREATE DATABASE fitness_app;
```

Then run to create the database user and grant privileges

Replace 'somepassword' with any password you choose

```
CREATE USER 'fitness_user'@'localhost' IDENTIFIED BY 'somepassword';

GRANT ALL PRIVILEGES ON fitness_app.\* TO 'fitness_user'@'localhost';
FLUSH PRIVILEGES;
```

## Create .env and set Database URL

In backend folder create a .env file.

Open and add:

```
DATABASE_URL=mysql+mysqlconnector://fitness_user:somepassword@localhost/fitness_app
```

Replace 'somepassword' with the password you created in the previous step

## Run Alembic to create/update tables

```
alembic upgrade head
```

## Test Database

In MySQL Workbench run:

```
USE fitness_app;
SHOW TABLES;
DESCRIBE users;
```

You should see the users database fields id, name, email, password_hash, age, weight, and height

## To run the backend

uvicorn main:app --reload

Backend runs at:
http://127.0.0.1:8000

API docs:
http://127.0.0.1:8000/docs

---

# How to Run Frontend

cd frontend
npm install
npm start

Frontend runs at:
http://localhost:3000
