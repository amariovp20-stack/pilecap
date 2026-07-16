from math import sqrt


def get_shear_base_factor(design_code: str) -> float:
    code = (design_code or "").upper()

    if "EURO" in code or "EC2" in code:
        return 0.12
    return 0.17  # ACI base simplificada


def check_one_way_shear(
    Vu_kN: float,
    width_m: float,
    d_m: float,
    fc_mpa: float,
    phi_shear: float,
    design_code: str = "ACI318"
) -> dict:
    bw_mm = width_m * 1000.0
    d_mm = d_m * 1000.0

    base_factor = get_shear_base_factor(design_code)

    vc_n = base_factor * sqrt(fc_mpa) * bw_mm * d_mm
    vc_kN = vc_n / 1000.0
    capacity_kN = phi_shear * vc_kN
    ratio = Vu_kN / capacity_kN if capacity_kN > 0 else 999.0

    return {
        "status": "ok" if ratio <= 1.0 else "fail",
        "demand": Vu_kN,
        "capacity": capacity_kN,
        "ratio": ratio,
        "message": f"Verificación simplificada de cortante unidireccional según {design_code}"
    }