from fastapi import APIRouter, HTTPException

from app.models.input_models import PileCapInput
from app.models.output_models import PileCapOutput
from app.core.pilecap_engine import run_pilecap_design

router = APIRouter()

@router.post("/design", response_model=PileCapOutput)
def design_pilecap(data: PileCapInput):
    try:
        return run_pilecap_design(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(exc)}")