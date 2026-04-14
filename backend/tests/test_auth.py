"""
FITTMM Backend – Authentication Test Cases
==========================================
TC-01  Register with valid data           → 200 + {id, email}
TC-02  Register duplicate email           → 400 "Email already registered"
TC-03  Register with malformed email      → 422 (Pydantic validation error)
TC-04  Login with correct credentials     → 200 + bearer token
TC-05  Login with wrong password          → 401

Run from the backend/ directory:
    pytest tests/test_auth.py -v
"""

# ---------------------------------------------------------------------------
# Shared test payload – a valid, complete user registration body
# ---------------------------------------------------------------------------
VALID_USER = {
    "email": "jane.smith@example.com",
    "password": "SecurePass123",
    "fname": "Jane",
    "lname": "Smith",
    "date_of_birth": "2000-05-15",
    "gender": "female",
    "weight": 140.0,
    "height": 65,
}


# ---------------------------------------------------------------------------
# TC-01: Register a brand-new user with fully valid data
# ---------------------------------------------------------------------------
def test_TC01_register_valid_user(client):
    """
    TC-01 | Register: valid new user
    ─────────────────────────────────
    Input:   Complete, valid UserCreate payload (see VALID_USER above).
    Expected: HTTP 200. Response body contains 'id' (integer) and 'email'
              matching the submitted email address.
    Pass:    status_code == 200 AND 'id' key present AND email matches.
    Fail:    Any other status code, or missing/wrong fields in response.

    Note: This test is expected to PASS once the /auth/register endpoint
          and database are correctly wired.
    """
    response = client.post("/auth/register", json=VALID_USER)

    assert response.status_code == 200, (
        f"Expected 200 but got {response.status_code}: {response.text}"
    )
    body = response.json()
    assert "id" in body, "Response is missing the 'id' field"
    assert isinstance(body["id"], int), "'id' should be an integer"
    assert body["email"] == VALID_USER["email"], (
        f"Returned email '{body['email']}' does not match submitted email"
    )


# ---------------------------------------------------------------------------
# TC-02: Register with an email that already exists in the database
# ---------------------------------------------------------------------------
def test_TC02_register_duplicate_email(client):
    """
    TC-02 | Register: duplicate email
    ───────────────────────────────────
    Input:   Same VALID_USER payload submitted twice in a row.
    Expected: Second request returns HTTP 400 with detail
              "Email already registered".
    Pass:    Second call status_code == 400 AND detail message matches.
    Fail:    Second call succeeds (200) or returns a different error code.

    Note: This test is expected to PASS; duplicate-email rejection is
          already implemented in routers/auth.py.
    """
    # First registration — should succeed
    client.post("/auth/register", json=VALID_USER)

    # Second registration with the same email — should be rejected
    response = client.post("/auth/register", json=VALID_USER)

    assert response.status_code == 400, (
        f"Expected 400 but got {response.status_code}: {response.text}"
    )
    assert response.json()["detail"] == "Email already registered", (
        f"Unexpected detail: {response.json().get('detail')}"
    )


# ---------------------------------------------------------------------------
# TC-03: Register with a malformed (non-email) email value
# ---------------------------------------------------------------------------
def test_TC03_register_invalid_email_format(client):
    """
    TC-03 | Register: invalid email format
    ────────────────────────────────────────
    Input:   Valid payload except email = "notanemail" (no @ sign).
    Expected: HTTP 422 — Pydantic's EmailStr validator rejects the value
              before the route handler even runs.
    Pass:    status_code == 422.
    Fail:    Status code 200 or 400 (would mean email validation is not
             enforced at the schema level).

    Note: This test is expected to PASS because the UserCreate schema uses
          pydantic's EmailStr type.
    """
    bad_payload = {**VALID_USER, "email": "notanemail"}
    response = client.post("/auth/register", json=bad_payload)

    assert response.status_code == 422, (
        f"Expected 422 (validation error) but got {response.status_code}: {response.text}"
    )


# ---------------------------------------------------------------------------
# TC-04: Login with correct email + password
# ---------------------------------------------------------------------------
def test_TC04_login_correct_credentials(client):
    """
    TC-04 | Login: correct credentials
    ────────────────────────────────────
    Setup:   Register VALID_USER first so the account exists.
    Input:   OAuth2 form data — username = VALID_USER email,
             password = VALID_USER password.
    Expected: HTTP 200. Response body contains 'access_token' (non-empty
              string) and token_type == "bearer".
    Pass:    status_code == 200 AND access_token present AND
             token_type == "bearer".
    Fail:    Any other status code, or token fields missing/wrong.

    Note: This test is expected to PASS once register + login are both
          working correctly.
    """
    # Register the user first
    client.post("/auth/register", json=VALID_USER)

    # Attempt login — FastAPI's OAuth2PasswordRequestForm reads form-encoded data
    response = client.post(
        "/auth/login",
        data={
            "username": VALID_USER["email"],
            "password": VALID_USER["password"],
        },
    )

    assert response.status_code == 200, (
        f"Expected 200 but got {response.status_code}: {response.text}"
    )
    body = response.json()
    assert "access_token" in body, "Response is missing 'access_token'"
    assert body["access_token"], "'access_token' should not be empty"
    assert body.get("token_type") == "bearer", (
        f"token_type should be 'bearer', got '{body.get('token_type')}'"
    )


# ---------------------------------------------------------------------------
# TC-05: Login with the correct email but the wrong password
# ---------------------------------------------------------------------------
def test_TC05_login_wrong_password(client):
    """
    TC-05 | Login: wrong password
    ──────────────────────────────
    Setup:   Register VALID_USER so the account exists.
    Input:   Same email, different (wrong) password.
    Expected: HTTP 401 "Incorrect email or password".
    Pass:    status_code == 401.
    Fail:    Status 200 (security failure) or any non-401 code.

    Note: This test is expected to PASS; incorrect-password rejection is
          implemented in routers/auth.py and core/crud.py.
    """
    client.post("/auth/register", json=VALID_USER)

    response = client.post(
        "/auth/login",
        data={
            "username": VALID_USER["email"],
            "password": "CompletelyWrongPassword!",
        },
    )

    assert response.status_code == 401, (
        f"Expected 401 but got {response.status_code}: {response.text}"
    )
