"""
FITTMM Backend – Accounts, profile, exercise library, volume and video tests
============================================================================
TC-10  Firebase token creates the user on first request
TC-11  Unverified email/password Firebase account is refused (403)
TC-12  Verified Firebase email links an existing password account
TC-13  Unverified Firebase email can't take over an existing account
TC-14  Profile returns age, BMI and BMI category
TC-15  Profile rejects a future birthday and users under 13
TC-16  Weight history keeps the current and previous weight in sync
TC-17  Exercise library is seeded with photos, instructions and pointers
TC-18  Library filters by body part and search text
TC-19  Two users can each add a custom exercise with the same name
TC-20  Volume summary totals, per-exercise bests and body parts
TC-21  Volume uses the client's timezone to pick the workout day
TC-22  Video search without an API key returns a YouTube search link
TC-23  Video search with a key returns results and caches them
TC-24  Legacy password endpoints can be switched off
TC-25  Remove all data clears weights; delete account removes the user
TC-26  Form pointers match the movement, not substrings
TC-27  An unreadable password hash is a failed login (401), not a crash

Run from the backend/ directory:
    pytest tests/ -v
"""
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import jwt
import pytest

from config import settings
from core import youtube
from core.database import Exercise
from core.exercise_library import form_tips
from core.volume import compute_volume, estimated_1rm, session_date

USER = {
    "email": "lifter@example.com",
    "password": "SecurePass123",
    "fname": "Lee",
    "lname": "Lifter",
    "date_of_birth": "1995-06-01",
    "gender": "female",
    "weight": 150.0,
    "height": 65,
}


def legacy_token(client, user=USER):
    client.post("/auth/register", json=user)
    res = client.post("/auth/login", data={"username": user["email"], "password": user["password"]})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def firebase_headers():
    # Any non-HS256 token goes to Firebase verification, which the tests patch.
    token = jwt.encode({"sub": "ignored"}, None, algorithm="none")
    return {"Authorization": f"Bearer {token}"}


def claims(uid="fb-uid-1", email="new.user@example.com", verified=True,
           provider="password", name="New User"):
    return {"uid": uid, "email": email, "email_verified": verified, "name": name,
            "firebase": {"sign_in_provider": provider}}


# ---------------------------------------------------------------------------
# Firebase accounts
# ---------------------------------------------------------------------------
def test_TC10_firebase_token_provisions_user(client):
    with patch("core.firebase_auth.verify_id_token", return_value=claims(provider="google.com")):
        res = client.get("/auth/me", headers=firebase_headers())
        again = client.get("/auth/me", headers=firebase_headers())
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["email"] == "new.user@example.com"
    assert body["fname"] == "New" and body["lname"] == "User"
    assert again.json()["id"] == body["id"], "second request must reuse the same user row"


def test_TC11_unverified_password_account_refused(client):
    with patch("core.firebase_auth.verify_id_token", return_value=claims(verified=False)):
        res = client.get("/auth/me", headers=firebase_headers())
    assert res.status_code == 403
    assert "verify your email" in res.json()["detail"]


def test_TC12_verified_email_links_existing_account(client):
    headers = legacy_token(client)
    legacy_id = client.get("/auth/me", headers=headers).json()["id"]
    with patch("core.firebase_auth.verify_id_token",
               return_value=claims(uid="fb-linked", email=USER["email"], provider="google.com")):
        res = client.get("/auth/me", headers=firebase_headers())
    assert res.status_code == 200, res.text
    assert res.json()["id"] == legacy_id


def test_TC13_unverified_email_cannot_take_over(client, monkeypatch):
    legacy_token(client)
    monkeypatch.setattr(settings, "REQUIRE_EMAIL_VERIFICATION", False)
    with patch("core.firebase_auth.verify_id_token",
               return_value=claims(uid="attacker", email=USER["email"], verified=False)):
        res = client.get("/auth/me", headers=firebase_headers())
    assert res.status_code == 409


def test_TC_invalid_firebase_token_is_401(client):
    from core.firebase_auth import InvalidFirebaseToken
    with patch("core.firebase_auth.verify_id_token", side_effect=InvalidFirebaseToken("bad")):
        res = client.get("/auth/me", headers=firebase_headers())
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Profile and weight history
# ---------------------------------------------------------------------------
def test_TC14_profile_age_and_bmi(client):
    headers = legacy_token(client)
    res = client.get("/profile", headers=headers)
    assert res.status_code == 200, res.text
    p = res.json()
    today = date.today()
    expected_age = today.year - 1995 - ((today.month, today.day) < (6, 1))
    assert p["age"] == expected_age
    assert p["bmi"] == round(703 * 150 / 65 ** 2, 1)   # 25.0
    assert p["bmi_category"] == "Overweight"
    assert p["profile_complete"] is True

    res = client.patch("/profile", headers=headers,
                       json={"height": 70, "unit_system": "metric", "goal_weight": 140})
    p = res.json()
    assert p["bmi"] == round(703 * 150 / 70 ** 2, 1)
    assert p["bmi_category"] == "Healthy weight"
    assert p["unit_system"] == "metric" and p["goal_weight"] == 140


def test_TC15_profile_rejects_bad_birthdays(client):
    headers = legacy_token(client)
    future = (date.today() + timedelta(days=1)).isoformat()
    assert client.patch("/profile", headers=headers, json={"date_of_birth": future}).status_code == 422
    too_young = date(date.today().year - 10, 1, 1).isoformat()
    assert client.patch("/profile", headers=headers, json={"date_of_birth": too_young}).status_code == 422
    assert client.patch("/profile", headers=headers, json={"unit_system": "furlongs"}).status_code == 422


def test_TC16_weight_history(client):
    headers = legacy_token(client)
    old = (date.today() - timedelta(days=30)).isoformat()
    client.post("/profile/weights", headers=headers, json={"weight": 160, "recorded_on": old})
    p = client.get("/profile", headers=headers).json()
    assert p["weight"] == 150, "an older entry must not replace today's weight"
    assert p["previous_weight"] == 160

    client.patch("/profile", headers=headers, json={"weight": 148})
    entries = client.get("/profile/weights", headers=headers).json()
    assert [e["weight"] for e in entries] == [148, 160], "same-day update replaces today's entry"
    assert client.get("/profile", headers=headers).json()["weight"] == 148

    client.delete(f"/profile/weights/{entries[0]['id']}", headers=headers)
    assert client.get("/profile", headers=headers).json()["weight"] == 160
    assert client.post("/profile/weights", headers=headers,
                       json={"weight": 150, "recorded_on": (date.today() + timedelta(days=2)).isoformat()}
                       ).status_code == 422


# ---------------------------------------------------------------------------
# Exercise library
# ---------------------------------------------------------------------------
def test_TC17_library_seeded_with_photos_and_pointers(client):
    headers = legacy_token(client)
    res = client.get("/workout/exercises", headers=headers)
    assert res.status_code == 200
    library = [e for e in res.json() if e["slug"]]
    assert len(library) == 876
    squat = next(e for e in library if e["name"] == "Barbell Squat")
    assert squat["image"].startswith(settings.EXERCISE_IMAGE_BASE_URL)
    assert squat["image"].endswith(".jpg") and len(squat["images"]) == 2
    assert squat["body_part"] == "legs"

    detail = client.get(f"/workout/exercises/{squat['id']}", headers=headers).json()
    assert len(detail["instructions"]) >= 3
    assert any("knees" in t for t in detail["tips"])
    assert detail["video_query"] == "how to do Barbell Squat proper form"


def test_TC18_library_filters(client):
    headers = legacy_token(client)
    chest = client.get("/workout/exercises?body_part=chest", headers=headers).json()
    assert chest and all(e["body_part"] == "chest" for e in chest)
    found = client.get("/workout/exercises?q=bench press", headers=headers).json()
    assert found and all("bench press" in e["name"].lower() for e in found)


def test_TC19_custom_exercise_names_are_per_user(client):
    a = legacy_token(client)
    b = legacy_token(client, {**USER, "email": "second@example.com"})
    body = {"name": "My Cable Thing", "body_part": "back"}
    assert client.post("/workout/exercises", headers=a, json=body).status_code == 200
    assert client.post("/workout/exercises", headers=b, json=body).status_code == 200
    assert client.post("/workout/exercises", headers=a, json=body).status_code == 400
    # A library name still counts as taken
    assert client.post("/workout/exercises", headers=b,
                       json={"name": "barbell squat"}).status_code == 400
    names_for_b = [e["name"] for e in client.get("/workout/exercises", headers=b).json() if e["userid"]]
    assert names_for_b == ["My Cable Thing"]


# ---------------------------------------------------------------------------
# Volume
# ---------------------------------------------------------------------------
def workout(day: date, exercises):
    return {"payload": {
        "day": day.strftime("%A"),
        "date": datetime(day.year, day.month, day.day, 18, tzinfo=timezone.utc).isoformat(),
        "local_date": day.isoformat(),
        "exercises": [{"name": n, "sets": [{"set": i + 1, "reps": r, "weightLbs": w}
                                           for i, (r, w) in enumerate(sets)]}
                      for n, sets in exercises],
    }}


def test_TC20_volume_summary(client):
    headers = legacy_token(client)
    today = date(2026, 10, 27)          # a Tuesday
    client.post("/workout/sessions", headers=headers, json=workout(today, [
        ("Barbell Squat", [(5, 200), (5, 200)]),        # 2000
        ("Pushups", [(20, 0)]),                         # bodyweight: sets count, no volume
    ]))
    client.post("/workout/sessions", headers=headers, json=workout(today - timedelta(days=7), [
        ("Barbell Squat", [(3, 225)]),                  # 675, last week
    ]))
    res = client.get(f"/workout/volume?days=30&today={today.isoformat()}", headers=headers)
    assert res.status_code == 200, res.text
    v = res.json()
    assert v["total_volume"] == 2675
    assert v["workouts"] == 2 and v["sets"] == 4 and v["reps"] == 33
    assert v["this_week"] == 2000 and v["last_week"] == 675
    squat = next(e for e in v["by_exercise"] if e["name"] == "Barbell Squat")
    assert squat["best_weight"] == 225 and squat["best_set_reps"] == 3
    assert squat["estimated_1rm"] == round(225 * (1 + 3 / 30), 1)
    assert squat["body_part"] == "legs"
    assert v["by_body_part"][0] == {"body_part": "legs", "volume": 2675, "sets": 3}
    assert len(v["daily"]) == 30 and v["daily"][-1] == {"date": today.isoformat(), "volume": 2000}


def test_TC21_volume_timezone():
    # 03:30 UTC on Oct 28 is 8:30 pm on Oct 27 in California (UTC-7, offset 420)
    payload = {"date": "2026-10-28T03:30:00.000Z"}
    assert session_date(payload, None, 420) == date(2026, 10, 27)
    assert session_date(payload, None, 0) == date(2026, 10, 28)
    assert session_date({"local_date": "2026-10-20", **payload}, None, 420) == date(2026, 10, 20)
    assert estimated_1rm(100, 1) == 100 and estimated_1rm(100, 0) == 0
    summary = compute_volume([(payload, None)], lambda n: None, 7, date(2026, 10, 27), 420)
    assert summary["workouts"] == 0, "a session with no sets is not a workout"


# ---------------------------------------------------------------------------
# Tutorial videos
# ---------------------------------------------------------------------------
def test_TC22_videos_without_key(client, monkeypatch):
    monkeypatch.setattr(settings, "YOUTUBE_API_KEY", "")
    headers = legacy_token(client)
    squat_id = client.get("/workout/exercises?q=barbell squat", headers=headers).json()[0]["id"]
    res = client.get(f"/workout/exercises/{squat_id}/videos", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["configured"] is False and body["videos"] == []
    assert body["search_url"].startswith("https://www.youtube.com/results?search_query=how+to+do+barbell+squat")


class FakeResponse:
    def __init__(self, data, status=200):
        self._data, self.status_code, self.text = data, status, ""

    def json(self):
        return self._data


class FakeClient:
    calls = 0

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get(self, url, params=None):
        FakeClient.calls += 1
        if url == youtube.SEARCH_URL:
            return FakeResponse({"items": [{
                "id": {"videoId": "abc123"},
                "snippet": {"title": "How to Squat &amp; Stay Safe", "channelTitle": "Coach",
                            "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/abc123/mqdefault.jpg"}},
                            "publishedAt": "2024-01-01T00:00:00Z"}}]})
        return FakeResponse({"items": [{"id": "abc123",
                                        "contentDetails": {"duration": "PT8M15S"},
                                        "statistics": {"viewCount": "12345"}}]})


def test_TC23_videos_with_key_are_cached(client, monkeypatch):
    monkeypatch.setattr(settings, "YOUTUBE_API_KEY", "test-key")
    monkeypatch.setattr(youtube.httpx, "Client", FakeClient)
    FakeClient.calls = 0
    headers = legacy_token(client)
    first = client.get("/workout/videos?q=how to squat", headers=headers).json()
    second = client.get("/workout/videos?q=How  to SQUAT", headers=headers).json()
    assert first["configured"] is True
    v = first["videos"][0]
    assert v["title"] == "How to Squat & Stay Safe"
    assert v["duration_seconds"] == 495 and v["view_count"] == 12345
    assert second["videos"] == first["videos"]
    assert FakeClient.calls == 2, "the second search must come from the cache"


# ---------------------------------------------------------------------------
# Account controls
# ---------------------------------------------------------------------------
def test_TC24_legacy_auth_can_be_disabled(client, monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_LEGACY_PASSWORD_AUTH", False)
    assert client.post("/auth/register", json=USER).status_code == 403
    assert client.post("/auth/login", data={"username": USER["email"],
                                              "password": USER["password"]}).status_code == 403


def test_TC25_wipe_and_delete_account(client):
    headers = legacy_token(client)
    client.post("/profile/weights", headers=headers, json={"weight": 151})
    assert client.delete("/auth/me/data", headers=headers).status_code == 200
    assert client.get("/profile/weights", headers=headers).json() == []
    p = client.get("/profile", headers=headers).json()
    assert p["weight"] is None and p["age"] is None and p["profile_complete"] is False

    assert client.delete("/auth/me", headers=headers).status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_TC27_unreadable_password_hash_is_401(client):
    from tests.conftest import TestingSessionLocal
    from core.database import User
    legacy_token(client)
    with TestingSessionLocal() as db:
        db.query(User).filter(User.email == USER["email"]).update({"password_hash": "not-a-hash"})
        db.commit()
    res = client.post("/auth/login", data={"username": USER["email"], "password": USER["password"]})
    assert res.status_code == 401


def test_TC26_form_pointers_match_movements():
    def tips(name, category="strength", equipment="barbell"):
        return form_tips(Exercise(name=name, category=category, equipment=equipment))

    assert any("hamstring stretch" in t for t in tips("Romanian Deadlift"))
    assert any("Lock out" in t for t in tips("Barbell Deadlift"))
    assert not any("elbows, not your hands" in t for t in tips("Medicine Ball Throw", "plyometrics", "medicine ball"))
    assert any("Land softly" in t for t in tips("Box Jump", "plyometrics", "other"))
    assert 1 <= len(tips("Something Unusual", "strength", None)) <= 6
