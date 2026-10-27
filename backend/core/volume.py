"""Training volume (reps x weight, in pounds) from logged workout sessions.

Session payloads come from the apps' "record workout" screens:
    {"day": "Monday", "date": "<ISO datetime>", "local_date": "YYYY-MM-DD",
     "exercises": [{"name": ..., "sets": [{"reps": 8, "weightLbs": 135}, ...]}]}
Older payloads have no local_date, so the ISO datetime is shifted by the
client's UTC offset to find the day it happened.
"""
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone


def _number(value) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return 0.0
    return n if n == n and n >= 0 else 0.0   # drop NaN and negatives


def session_date(payload: dict, logged_at: datetime | None, tz_offset_minutes: int = 0) -> date | None:
    local = payload.get("local_date")
    if isinstance(local, str):
        try:
            return date.fromisoformat(local[:10])
        except ValueError:
            pass
    raw = payload.get("date")
    when = None
    if isinstance(raw, str):
        try:
            when = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            when = None
    if when is None:
        when = logged_at
    if when is None:
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    # JavaScript's getTimezoneOffset() is minutes *behind* UTC (PDT = 420)
    return (when.astimezone(timezone.utc) - timedelta(minutes=tz_offset_minutes)).date()


def week_start(d: date) -> date:
    # Weeks start on Sunday, matching the weekly plan
    return d - timedelta(days=(d.weekday() + 1) % 7)


def estimated_1rm(weight: float, reps: int) -> float:
    if weight <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return weight
    return weight * (1 + reps / 30)   # Epley


def compute_volume(sessions, body_part_of, days: int, today: date, tz_offset_minutes: int = 0) -> dict:
    """sessions: iterable of (payload dict, logged_at datetime).
    body_part_of: callable(exercise name) -> body part or None."""
    start = today - timedelta(days=days - 1)
    this_week_start = week_start(today)
    last_week_start = this_week_start - timedelta(days=7)

    daily = defaultdict(float)
    weekly_volume = defaultdict(float)
    weekly_workouts = defaultdict(int)
    by_exercise = {}
    by_part = defaultdict(lambda: {"volume": 0.0, "sets": 0})
    totals = {"volume": 0.0, "workouts": 0, "sets": 0, "reps": 0}
    this_week = last_week = 0.0

    for payload, logged_at in sessions:
        if not isinstance(payload, dict):
            continue
        d = session_date(payload, logged_at, tz_offset_minutes)
        if d is None or d > today:
            continue

        session_volume = 0.0
        session_rows = []
        for ex in payload.get("exercises") or []:
            if not isinstance(ex, dict):
                continue
            name = str(ex.get("name") or ex.get("exercise") or "Workout").strip() or "Workout"
            for row in ex.get("sets") or []:
                if not isinstance(row, dict):
                    continue
                reps = int(_number(row.get("reps")))
                weight = _number(row.get("weightLbs", row.get("weight")))
                if reps <= 0:
                    continue
                session_rows.append((name, reps, weight))
                session_volume += reps * weight

        if not session_rows:
            continue

        if d >= this_week_start:
            this_week += session_volume
        elif d >= last_week_start:
            last_week += session_volume

        if d < start:
            continue

        totals["workouts"] += 1
        totals["volume"] += session_volume
        daily[d] += session_volume
        weekly_volume[week_start(d)] += session_volume
        weekly_workouts[week_start(d)] += 1

        for name, reps, weight in session_rows:
            totals["sets"] += 1
            totals["reps"] += reps
            key = name.lower()
            stats = by_exercise.get(key)
            if stats is None:
                stats = by_exercise[key] = {
                    "name": name, "body_part": body_part_of(name), "volume": 0.0,
                    "sets": 0, "reps": 0, "best_weight": 0.0, "best_set_reps": 0,
                    "estimated_1rm": 0.0,
                }
            stats["volume"] += reps * weight
            stats["sets"] += 1
            stats["reps"] += reps
            if weight > stats["best_weight"] or (
                    weight == stats["best_weight"] and reps > stats["best_set_reps"]):
                stats["best_weight"] = weight
                stats["best_set_reps"] = reps
            stats["estimated_1rm"] = max(stats["estimated_1rm"], estimated_1rm(weight, reps))
            part = stats["body_part"] or "other"
            by_part[part]["volume"] += reps * weight
            by_part[part]["sets"] += 1

    first_week = week_start(start)
    weeks = []
    w = first_week
    while w <= this_week_start:
        weeks.append({"week_start": w, "volume": round(weekly_volume[w], 1),
                      "workouts": weekly_workouts[w]})
        w += timedelta(days=7)

    return {
        "days": days,
        "total_volume": round(totals["volume"], 1),
        "workouts": totals["workouts"],
        "sets": totals["sets"],
        "reps": totals["reps"],
        "this_week": round(this_week, 1),
        "last_week": round(last_week, 1),
        "daily": [{"date": start + timedelta(days=i),
                   "volume": round(daily[start + timedelta(days=i)], 1)} for i in range(days)],
        "weekly": weeks,
        "by_exercise": sorted(
            ({**s, "volume": round(s["volume"], 1), "estimated_1rm": round(s["estimated_1rm"], 1)}
             for s in by_exercise.values()),
            key=lambda s: s["volume"], reverse=True),
        "by_body_part": sorted(
            ({"body_part": k, "volume": round(v["volume"], 1), "sets": v["sets"]}
             for k, v in by_part.items()),
            key=lambda p: p["volume"], reverse=True),
    }
