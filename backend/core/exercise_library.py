"""The global exercise library: seeding from data/exercise_library.json,
photo URLs, and form pointers shown next to tutorial videos.

Run `python -m core.exercise_library` from backend/ to seed by hand.
"""
import json
import logging
import os
import re

from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from core.database import Exercise

logger = logging.getLogger(__name__)

LIBRARY_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "exercise_library.json")

BODY_PARTS = ["chest", "back", "shoulders", "bicep", "triceps", "forearms",
              "abs", "glutes", "legs", "neck"]


def load_library() -> list[dict]:
    with open(LIBRARY_PATH, encoding="utf-8") as f:
        return json.load(f)["exercises"]


def seed_exercise_library(db: Session) -> int:
    """Insert or refresh the global library. Returns how many rows were added.

    Matches on slug first, then on a global exercise with the same name that
    predates the library, so re-running never duplicates anything.
    """
    entries = load_library()
    existing_slugs = {s for (s,) in db.query(Exercise.slug).filter(Exercise.slug != None).all()}  # noqa: E711
    if len(existing_slugs) >= len(entries):
        return 0

    globals_by_name = {
        e.name.strip().lower(): e
        for e in db.query(Exercise).filter(Exercise.userid == None, Exercise.slug == None).all()  # noqa: E711
    }
    added = 0
    for entry in entries:
        if entry["slug"] in existing_slugs:
            continue
        row = globals_by_name.get(entry["name"].lower())
        if row is None:
            row = Exercise(userid=None, name=entry["name"], description="", image="")
            db.add(row)
            added += 1
        row.slug = entry["slug"]
        row.body_part = entry["body_part"]
        row.category = entry["category"]
        row.equipment = entry["equipment"]
        row.level = entry["level"]
        row.force = entry["force"]
        row.mechanic = entry["mechanic"]
        row.primary_muscles = entry["primary_muscles"]
        row.secondary_muscles = entry["secondary_muscles"]
        row.instructions = entry["instructions"]
        row.images = entry["images"]
    db.commit()
    if added:
        logger.info("Seeded %d exercises into the library", added)
    return added


def image_url(path: str) -> str:
    if not path:
        return ""
    if re.match(r"^(https?:)?//", path) or path.startswith("/"):
        return path
    return settings.EXERCISE_IMAGE_BASE_URL + path


def exercise_images(ex: Exercise) -> list[str]:
    urls = [image_url(p) for p in (ex.images or []) if p]
    if not urls and ex.image:
        urls = [image_url(ex.image)]
    return urls


def find_visible_exercise(db: Session, name: str, user_id: int):
    return (
        db.query(Exercise)
        .filter(func.lower(Exercise.name) == name.strip().lower())
        .filter((Exercise.userid == None) | (Exercise.userid == user_id))  # noqa: E711
        .order_by(Exercise.userid.isnot(None))   # global entry first
        .first()
    )


# --------------- Form pointers ---------------
# Matched against the lowercased exercise name, most specific first.
_PATTERN_TIPS = [
    (("romanian", "stiff-legged", "stiff leg", "good morning"), [
        "Push your hips back with a soft knee bend; stop when you feel a strong hamstring stretch.",
        "Keep the weight close to your legs and your back flat the whole time.",
    ]),
    (("deadlift", "rack pull"), [
        "Brace your core and keep a neutral spine; your back shouldn't round as the weight leaves the floor.",
        "Push the floor away with your legs and keep the bar close, dragging it up your shins and thighs.",
        "Lock out by squeezing your glutes, not by leaning back.",
    ]),
    (("bulgarian", "split squat", "lunge", "step-up", "step up"), [
        "Keep your front knee tracking over your toes and your torso tall.",
        "Lower under control until your back knee nearly touches the floor, then drive through your front heel.",
        "Start lighter than you think; balance is the limiting factor at first.",
    ]),
    (("squat",), [
        "Brace your core before each rep and keep your chest up.",
        "Push your knees out in line with your toes and keep your whole foot on the floor.",
        "Go as deep as you can while your lower back stays neutral, then drive up through mid-foot.",
    ]),
    (("hip thrust", "glute bridge", "bridge"), [
        "Tuck your chin and keep your ribs down so the movement comes from your hips, not your lower back.",
        "Drive through your heels and pause for a second with your glutes squeezed at the top.",
    ]),
    (("bench press", "floor press", "chest press", "push-up", "pushup", "push up"), [
        "Set your shoulder blades back and down before the first rep and keep them there.",
        "Keep your elbows about 45 degrees from your body rather than flared straight out.",
        "Lower under control to your mid-chest; don't bounce the weight.",
    ]),
    (("fly", "flye", "crossover"), [
        "Keep a slight, fixed bend in your elbows; the movement is a hug, not a press.",
        "Only lower as far as your shoulders feel comfortable, and control the stretch.",
    ]),
    (("overhead press", "military press", "shoulder press", "arnold", "push press"), [
        "Squeeze your glutes and brace so your lower back doesn't arch.",
        "Press in a straight line and move your head back slightly to let the weight pass.",
        "Finish with the weight stacked over your mid-foot and your arms locked out.",
    ]),
    (("lateral raise", "front raise", "rear delt"), [
        "Use a light weight and lead with your elbows, stopping around shoulder height.",
        "Don't swing; if you need momentum, the weight is too heavy.",
    ]),
    (("pull-up", "pullup", "chin-up", "chinup", "pulldown"), [
        "Start each rep by pulling your shoulder blades down, then drive your elbows toward your ribs.",
        "Control the way down to a full stretch instead of dropping.",
    ]),
    (("row",), [
        "Keep your back flat and your torso still; pull with your elbows, not your hands.",
        "Squeeze your shoulder blades together at the top and lower slowly.",
    ]),
    (("curl",), [
        "Keep your elbows pinned at your sides and avoid swinging your torso.",
        "Lower the weight slowly; the way down builds strength too.",
    ]),
    (("extension", "pushdown", "skullcrusher", "kickback", "dip"), [
        "Keep your upper arms still so the work stays on the target muscle.",
        "Move through a full range of motion without locking out hard at the joint.",
    ]),
    (("calf raise",), [
        "Pause at the bottom stretch and at the top squeeze; avoid bouncing.",
    ]),
    (("plank", "crunch", "sit-up", "situp", "leg raise", "ab"), [
        "Keep your lower back from arching; brace like you're about to be poked in the stomach.",
        "Breathe steadily and stop the set when your form slips.",
    ]),
]

_CATEGORY_TIPS = {
    "stretching": [
        "Ease into the stretch and hold it; never bounce.",
        "You should feel tension, not pain. Back off if anything pinches.",
    ],
    "plyometrics": [
        "Land softly with bent knees, absorbing the impact through your hips.",
        "Rest fully between sets; jumps are about quality, not fatigue.",
    ],
    "cardio": [
        "Warm up at an easy pace for a few minutes before pushing the intensity.",
    ],
    "olympic weightlifting": [
        "Learn the movement with a light bar or PVC pipe first; these lifts are technical.",
        "Consider a coach to check your technique before adding heavy weight.",
    ],
}

_GENERAL_TIPS = [
    "Warm up with a lighter set before your working sets.",
    "Pick a weight you can move with good form for every rep; stop a set when form breaks down.",
]

_EQUIPMENT_TIPS = {
    "barbell": "Use collars on the bar, and set safety pins or spotter arms for heavy sets.",
    "machine": "Adjust the seat and pads so the machine's pivot lines up with your joint.",
    "cable": "Stand where the cable stays under tension for the whole rep.",
    "kettlebells": "Keep a firm grip and a neutral wrist; let your hips do the work on swings.",
}


def _mentions(name: str, keyword: str) -> bool:
    # Match at a word start so "row" doesn't hit "throw"; "ab" must be a whole word.
    tail = r"\b" if keyword == "ab" else ""
    return re.search(r"\b" + re.escape(keyword) + tail, name) is not None


def form_tips(ex: Exercise) -> list[str]:
    name = ex.name.lower()
    tips: list[str] = []
    for keywords, pattern_tips in _PATTERN_TIPS:
        if any(_mentions(name, k) for k in keywords):
            tips.extend(pattern_tips)
            break
    tips.extend(_CATEGORY_TIPS.get((ex.category or "").lower(), []))
    equipment_tip = _EQUIPMENT_TIPS.get((ex.equipment or "").lower())
    if equipment_tip:
        tips.append(equipment_tip)
    if len(tips) < 4:
        tips.extend(_GENERAL_TIPS)
    return tips[:6]


if __name__ == "__main__":
    from core.database import SessionLocal, Base, engine
    logging.basicConfig(level=logging.INFO)
    Base.metadata.create_all(bind=engine, checkfirst=True)
    with SessionLocal() as session:
        print("added", seed_exercise_library(session))
