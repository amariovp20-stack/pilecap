from pydantic import BaseModel
from typing import List, Dict, Any


class ReactionResult(BaseModel):
    id: str
    x: float
    y: float
    reaction_kN: float
    status: str


class StrutResult(BaseModel):
    pile_id: str
    horizontal_projection_m: float
    strut_length_m: float
    angle_deg: float
    reaction_kN: float
    strut_force_kN: float
    horizontal_component_kN: float
    angle_status: str


class RebarOptionResult(BaseModel):
    label: str
    bar_area_mm2: float
    bar_count: int
    As_provided_mm2: float
    excess_mm2: float
    efficiency_ratio: float


class ReinforcementResult(BaseModel):
    tie_force_kN: float
    As_required_mm2: float
    As_min_mm2: float
    As_design_mm2: float
    selected_option: str
    As_provided_mm2: float
    optimization_ratio: float
    top_options: list[RebarOptionResult]


class CheckResult(BaseModel):
    status: str
    demand: float
    capacity: float
    ratio: float
    message: str


class NodeCheckResult(BaseModel):
    Fn_kN: float
    ratio: float
    status: str


class STMModelResult(BaseModel):
    model_code: str
    model_name: str
    pile_count: int
    description: str
    tie_force_rule: str
    recommended_detailing: str


class STMVariantResult(BaseModel):
    variant_code: str
    variant_name: str
    divisor_used: float
    tie_force_kN: float
    As_required_mm2: float
    As_provided_mm2: float
    selected_option: str
    optimization_ratio: float
    rank: int


class OptimalSTMSelectionResult(BaseModel):
    selected_variant_code: str
    selected_variant_name: str
    criterion: str
    variants: list[STMVariantResult]
    design_profile: str
    efficiency_band: str
    recommendation: str


class PileCapOutput(BaseModel):
    effective_depth_m: float
    centroid_x_m: float
    centroid_y_m: float
    reactions: list[ReactionResult]
    struts: list[StrutResult]
    reinforcement: ReinforcementResult
    punching_check: CheckResult
    shear_check: CheckResult
    node_check: NodeCheckResult
    stm_model: STMModelResult
    optimal_stm_selection: OptimalSTMSelectionResult
    warnings: list[str]
    summary: Dict[str, Any]