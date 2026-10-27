from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import core.schemas as schemas
from core.database import get_db, User, WeightEntry
from core.security import get_current_user

router = APIRouter()


def age_on(birthday: date | None, today: date | None = None) -> int | None:
    if birthday is None or birthday.year <= 1900:
        return None
    today = today or date.today()
    return today.year - birthday.year - ((today.month, today.day) < (birthday.month, birthday.day))


def bmi_for(weight_lb: float | None, height_in: float | None) -> float | None:
    if not weight_lb or not height_in:
        return None
    return round(703 * weight_lb / (height_in ** 2), 1)


def bmi_category(bmi: float | None) -> str | None:
    if bmi is None:
        return None
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Healthy weight"
    if bmi < 30:
        return "Overweight"
    return "Obesity"


def _entries_newest_first(db: Session, user_id: int):
    return (
        db.query(WeightEntry)
        .filter(WeightEntry.userid == user_id)
        .order_by(WeightEntry.recorded_on.desc(), WeightEntry.id.desc())
        .all()
    )


def _sync_current_weight(db: Session, user: User):
    """users.weight always mirrors the newest weight entry."""
    entries = _entries_newest_first(db, user.id)
    if entries:
        user.weight = entries[0].weight


def profile_out(db: Session, user: User) -> schemas.ProfileOut:
    entries = _entries_newest_first(db, user.id)
    previous = entries[1].weight if len(entries) > 1 else None
    bmi = bmi_for(user.weight, user.height)
    return schemas.ProfileOut(
        id=user.id,
        email=user.email,
        fname=user.fname or "",
        lname=user.lname or "",
        date_of_birth=user.date_of_birth if age_on(user.date_of_birth) is not None else None,
        age=age_on(user.date_of_birth),
        gender=user.gender,
        height=user.height,
        weight=user.weight,
        previous_weight=previous,
        goal_weight=user.goal_weight,
        unit_system=user.unit_system or "imperial",
        bmi=bmi,
        bmi_category=bmi_category(bmi),
        profile_complete=bool(user.fname and age_on(user.date_of_birth) is not None
                              and user.height and user.weight),
    )


@router.get("", response_model=schemas.ProfileOut)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return profile_out(db, current_user)


@router.patch("", response_model=schemas.ProfileOut)
def update_profile(
    data: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    changes = data.model_dump(exclude_unset=True)
    new_weight = changes.pop("weight", None)
    for field, value in changes.items():
        setattr(current_user, field, value)

    # A new weight from the profile form is today's weigh-in
    if new_weight is not None and new_weight != current_user.weight:
        today_entry = (
            db.query(WeightEntry)
            .filter(WeightEntry.userid == current_user.id, WeightEntry.recorded_on == date.today())
            .first()
        )
        if today_entry:
            today_entry.weight = new_weight
        else:
            db.add(WeightEntry(userid=current_user.id, weight=new_weight, recorded_on=date.today()))
        db.flush()
        _sync_current_weight(db, current_user)

    db.commit()
    db.refresh(current_user)
    return profile_out(db, current_user)


@router.get("/weights", response_model=list[schemas.WeightEntryOut])
def list_weights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _entries_newest_first(db, current_user.id)


@router.post("/weights", response_model=schemas.WeightEntryOut)
def add_weight(
    data: schemas.WeightEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = WeightEntry(
        userid=current_user.id,
        weight=data.weight,
        recorded_on=data.recorded_on or date.today(),
    )
    db.add(entry)
    db.flush()
    _sync_current_weight(db, current_user)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/weights/{entry_id}")
def delete_weight(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = (
        db.query(WeightEntry)
        .filter(WeightEntry.id == entry_id, WeightEntry.userid == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    db.delete(entry)
    db.flush()
    remaining = _entries_newest_first(db, current_user.id)
    current_user.weight = remaining[0].weight if remaining else None
    db.commit()
    return {"ok": True}
