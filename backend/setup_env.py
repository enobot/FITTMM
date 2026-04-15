import secrets
import os

env_path = os.path.join(os.path.dirname(__file__), ".env")

if os.path.exists(env_path):
    print(".env file already exists — skipping to avoid overwriting.")
else:
    secret_key = secrets.token_hex(32)

    db_password = input("Enter the MySQL password you chose during setup: ")

    with open(env_path, "w") as f:
        f.write(
            f"DATABASE_URL=mysql+mysqlconnector://fitness_user:{db_password}@localhost/fitness_app\n"
        )
        f.write(f"SECRET_KEY={secret_key}\n")

    print(".env file created successfully!")
