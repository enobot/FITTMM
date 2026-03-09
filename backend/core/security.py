from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

# Hash a given password and return the new hash
def hash_password(password: str) -> str:
    return password_hash.hash(password)

# Verify the input password with a stored hash
def verify_password(password: str, hash: str) -> bool:
    return password_hash.verify(password, hash)