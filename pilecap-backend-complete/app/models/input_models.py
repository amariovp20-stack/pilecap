from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ProjectModel(BaseModel):
    name: str
    code: Optional[str] = None
    design_code: str = "ACI318"


class GeometryModel(BaseModel):
    length: float = Field(..., gt=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    cover_bottom: float = Field(..., gt=0)
    cover_side: float = Field(..., gt=0)
    column_x: float
    column_y: float
    column_width: float = Field(..., gt=0)
    column_length: float = Field(..., gt=0)
    main_bar_diameter: float = Field(0.016, gt=0)
    stirrup_diameter: float = Field(0.0, ge=0)


class PileModel(BaseModel):
    id: str
    x: float
    y: float
    shape: Literal["circular", "square"]
    diameter: Optional[float] = None
    side: Optional[float] = None
    allowable_reaction: Optional[float] = None


class MaterialsModel(BaseModel):
    fc: float = Field(..., gt=0)
    fy: float = Field(..., gt=0)
    phi_steel: float = Field(0.90, gt=0, le=1)
    phi_shear: float = Field(0.75, gt=0, le=1)
    beta_s: float = Field(0.75, gt=0, le=1)
    beta_n: float = Field(0.80, gt=0, le=1)


class LoadsModel(BaseModel):
    Pu: float = Field(..., gt=0)
    Mux: float = Field(0.0)
    Muy: float = Field(0.0)
    Vux: float = Field(0.0)
    Vuy: float = Field(0.0)


class PileCapInput(BaseModel):
    project: ProjectModel
    geometry: GeometryModel
    piles: List[PileModel]
    materials: MaterialsModel
    loads: LoadsModel