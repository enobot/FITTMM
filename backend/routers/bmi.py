from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class BMIRequest(BaseModel):
    weight: float
    height: float

@router.post("/calculate-bmi")
def calculate_bmi(data: BMIRequest):
    bmi = data.weight / (data.height ** 2)
    return {
        "bmi": round(bmi, 2)
    }
