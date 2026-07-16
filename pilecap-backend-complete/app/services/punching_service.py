from math import sqrt


def get_punching_base_factor(design_code: str) -> float:
    code = (design_code or "").upper()

    if "EURO" in code or "EC2" in code:
        return 0.18
    return 0.33  # ACI base simplificada


def check_punching(
    Pu_kN: float,
    column_width_m: float,
    column_length_m: float,
    d_m: float,
    fc_mpa: float,
    phi_shear: float,
    design_code: str = "ACI318"
) -> dict:
    bo_m = 2.0 * ((column_width_m + d_m) + (column_length_m + d_m))

    demand_mpa = (Pu_kN * 1000.0) / (bo_m * 1000.0 * d_m * 1000.0)

    base_factor = get_punching_base_factor(design_code)
    vc_mpa = base_factor * sqrt(fc_mpa)

    capacity_mpa = phi_shear * vc_mpa
    ratio = demand_mpa / capacity_mpa if capacity_mpa > 0 else 999.0

    return {
        "status": "ok" if ratio <= 1.0 else "fail",
        "demand": demand_mpa,
        "capacity": capacity_mpa,
        "ratio": ratio,
        "message": f"Verificación simplificada de punzonamiento según {design_code}"
    }