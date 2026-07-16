import re


def check_reaction_equilibrium(reactions: list[dict], pu_kN: float, tolerance_ratio: float = 0.05) -> dict:
    total_reaction = sum(float(r["reaction_kN"]) for r in reactions)
    if pu_kN == 0:
        return {
            "status": "fail",
            "total_reaction_kN": total_reaction,
            "difference_kN": total_reaction,
            "difference_ratio": 999.0,
            "message": "La carga axial Pu es inválida para verificar equilibrio."
        }

    difference = total_reaction - pu_kN
    difference_ratio = abs(difference) / abs(pu_kN)

    status = "ok"
    if difference_ratio > tolerance_ratio:
        status = "fail"
    elif difference_ratio > tolerance_ratio / 2.0:
        status = "warning"

    return {
        "status": status,
        "total_reaction_kN": total_reaction,
        "difference_kN": difference,
        "difference_ratio": difference_ratio,
        "message": f"Suma de reacciones = {total_reaction:.2f} kN; diferencia = {difference:.2f} kN."
    }


def parse_rebar_option(option_text: str) -> dict:
    if not option_text or not isinstance(option_text, str):
        return {"count": None, "diameter_mm": None}

    clean = option_text.replace(" ", "")
    match = re.match(r"^(\d+)(?:Ø|ø)(\d+(?:\.\d+)?)$", clean)

    if not match:
        return {"count": None, "diameter_mm": None}

    return {
        "count": int(match.group(1)),
        "diameter_mm": float(match.group(2))
    }


def check_reinforcement_fit(
    selected_option: str,
    width_m: float,
    cover_side_m: float,
    min_clear_spacing_mm: float = 25.0
) -> dict:
    parsed = parse_rebar_option(selected_option)
    count = parsed["count"]
    diameter_mm = parsed["diameter_mm"]

    if count is None or diameter_mm is None:
        return {
            "status": "warning",
            "available_width_mm": None,
            "required_width_mm": None,
            "message": "No fue posible interpretar la armadura adoptada para verificar espaciamiento."
        }

    available_width_mm = max((width_m - 2.0 * cover_side_m) * 1000.0, 0.0)
    required_width_mm = count * diameter_mm + (count - 1) * min_clear_spacing_mm

    status = "ok"
    if required_width_mm > available_width_mm:
        status = "fail"
    elif required_width_mm > 0.9 * available_width_mm:
        status = "warning"

    return {
        "status": status,
        "available_width_mm": available_width_mm,
        "required_width_mm": required_width_mm,
        "message": (
            f"Ancho útil disponible = {available_width_mm:.2f} mm; "
            f"ancho requerido estimado = {required_width_mm:.2f} mm."
        )
    }


def check_strut_geometry_consistency(struts: list[dict], d_m: float) -> dict:
    if d_m <= 0:
        return {
            "status": "fail",
            "message": "La altura efectiva es inválida para verificar consistencia geométrica del STM."
        }

    if not struts:
        return {
            "status": "fail",
            "message": "No existen bielas para verificar consistencia geométrica."
        }

    low_angles = [s for s in struts if s["angle_deg"] < 25.0]
    extreme_angles = [s for s in struts if s["angle_deg"] < 20.0 or s["angle_deg"] > 70.0]

    status = "ok"
    if extreme_angles:
        status = "fail"
    elif low_angles:
        status = "warning"

    return {
        "status": status,
        "message": (
            f"Se evaluaron {len(struts)} bielas. "
            f"Bielas en rango crítico: {len(extreme_angles)}. "
            f"Bielas en rango de advertencia: {len(low_angles)}."
        )
    }