from math import radians, sin, cos


def check_strut_angle(angle_deg: float) -> dict:
    status = "ok"

    if angle_deg < 20 or angle_deg > 70:
        status = "fail"
    elif angle_deg < 25 or angle_deg > 65:
        status = "warning"

    return {
        "angle_deg": angle_deg,
        "status": status
    }


def compute_struts(reactions: list[dict], strut_geometries: list[dict]) -> list[dict]:
    struts = []

    for reaction, geo in zip(reactions, strut_geometries):
        angle_deg = geo["angle_deg"]
        angle_rad = radians(angle_deg)

        if sin(angle_rad) == 0:
            raise ValueError("Ángulo de biela inválido para el cálculo.")

        reaction_kN = abs(reaction["reaction_kN"])
        strut_force = reaction_kN / sin(angle_rad)
        horizontal_component = strut_force * cos(angle_rad)

        angle_check = check_strut_angle(angle_deg)

        struts.append({
            "pile_id": reaction["id"],
            "horizontal_projection_m": geo["horizontal_projection_m"],
            "strut_length_m": geo["strut_length_m"],
            "angle_deg": angle_deg,
            "reaction_kN": reaction["reaction_kN"],
            "strut_force_kN": strut_force,
            "horizontal_component_kN": horizontal_component,
            "angle_status": angle_check["status"]
        })

    return struts


def compute_tie_force(struts: list[dict], pile_count: int) -> float:
    if not struts:
        return 0.0

    horizontal_sum = sum(abs(s["horizontal_component_kN"]) for s in struts)

    if pile_count == 2:
        return horizontal_sum / 2.0

    if pile_count == 3:
        return horizontal_sum / 2.2

    if pile_count >= 4:
        return horizontal_sum / 2.5

    return horizontal_sum / 2.0