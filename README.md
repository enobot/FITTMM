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

GRANT ALL PRIVILEGES ON fitness_app.* TO 'fitness_user'@'localhost';
FLUSH PRIVILEGES;
```

## Create .env and set Database URL

In backend folder create a .env file.

Open and add:

```
DATABASE_URL=mysql+mysqlconnector://fitness_user:somepassword@localhost/fitness_app

Replace 'somepassword' with the password you created in the previous step


SECRET_KEY= use command below to create a secret key and paste here

python -c "import secrets; print(secrets.token_hex(32))"
```

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



# Plate Calculator

The **Plate Calculator** is a tool that helps users determine how to load a barbell.  
It shows which plates should go on each side of the bar and calculates the **total weight (bar + plates)**.

---

## Units

Users can switch between **pounds (lb)** and **kilograms (kg)** using the **lb/kg toggle** at the top.

- Switching units clears the current plates.
- Bar weight automatically changes based on the unit:
  - **45 lb** when using pounds
  - **20 kg** when using kilograms

---

## Plate Options

Available plate sizes depend on the selected unit.

**Pounds (lb):**
- 2.5
- 5
- 10
- 25
- 35
- 45

**Kilograms (kg):**
- 2.5
- 5
- 10
- 15
- 20
- 25

Each plate weight has a **fixed color and size** on the bar (for example, **45 lb = blue**, **25 kg = red**).

---

## Adding and Removing Plates

Each plate has **+ and − buttons**.

- **+ button**
  - Adds **one plate per side**
  - Total weight increases by **2 × plate weight**

- **− button**
  - Removes **one plate per side**

- A number between the buttons shows **how many plates of that weight are on one side** (only displayed when the count is greater than 0).

Plates appear on the bar **in order from heaviest to lightest**:
- Heaviest plates are placed **closest to the bar**
- Lighter plates appear **toward the outside**

---

## Barbell Visualization

The interface includes a **visual barbell**.

- A horizontal bar represents the barbell in the center.
- Colored segments on both sides represent the plates.
- Plates are displayed symmetrically on both sides.

The bar has a **maximum width**. Only the number of plates that fit within that width will be drawn.

If more plates are added than can fit visually, the message appears:

> “Wow our barbell cannot keep up with your plates... you're so strong!”

The **total weight calculation still includes all plates**, even if some are not drawn.

---

## Weight Totals

Two totals are displayed:

**Per Side**
- Sum of all plates on one side.

**Total Weight**

This represents the **fully loaded barbell weight**.

---

## Remove All

A **Remove All** button resets the bar.

- Clears every plate
- Returns the bar to its default state
- Disabled when there are no plates loaded

---

## Accessibility and Theming

The component includes accessibility and theming features.

- Buttons use **aria-labels** for screen readers  
  - Example: `"Add 45 lb"` or `"Remove 25 kg"`
- Supports **dark mode** using the `isDark` prop so it matches the rest of the application.
