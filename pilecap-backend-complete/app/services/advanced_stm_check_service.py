from math import fabs


def evaluate_bidirectional_tie_behavior(struts: list[dict]) -> dict:
    """
    Evalúa si el sistema de componentes horizontales sugiere una distribución
    razonablemente balanceada o muy concentrada.
    """
    if not struts:
        return {
            "status": "fail",
            "message": "No existen bielas para evaluar comportamiento bidireccional."
        }

    horizontals = [abs(s["horizontal_component_kN"]) for s in struts]
    total = sum(horizontals)

    if total <= 0:
        return {
            "status": "fail",
            "message": "Las componentes horizontales son inválidas para evaluar el tirante."
        }

    max_component = max(horizontals)
    concentration_ratio = max_component / total

    status = "ok"
    if concentration_ratio > 0.45:
        status = "warning"
    if concentration_ratio > 0.60:
        status = "fail"

    return {
        "status": status,
        "concentration_ratio": concentration_ratio,
        "message": (
            f"La componente horizontal máxima representa el {concentration_ratio * 100:.1f}% "
            f"de la suma total de componentes horizontales."
        )
    }


def evaluate_stm_topology_quality(
    pile_count: int,
    struts: list[dict],
    stm_model_code: str
) -> dict:
    """
    Verifica si el número de bielas y la topología general son coherentes
    con el modelo STM seleccionado.
    """
    if not struts:
        return {
            "status": "fail",
            "message": "No existen bielas para evaluar la topología STM."
        }

    strut_count = len(struts)
    status = "ok"
    message = "La topología STM es coherente con el número de pilotes."

    if pile_count != strut_count:
        status = "warning"
        message = (
            f"El número de bielas ({strut_count}) no coincide exactamente con el número de pilotes ({pile_count})."
        )

    if pile_count <= 2 and "2P" not in stm_model_code:
        status = "fail"
        message = "El modelo STM seleccionado no corresponde a un cabezal de 2 pilotes."
    elif pile_count == 3 and "3P" not in stm_model_code:
        status = "fail"
        message = "El modelo STM seleccionado no corresponde a un cabezal de 3 pilotes."
    elif pile_count >= 4 and "4P" not in stm_model_code:
        status = "fail"
        message = "El modelo STM seleccionado no corresponde a un cabezal de 4 o más pilotes."

    return {
        "status": status,
        "message": message
    }


def evaluate_node_demand_uniformity(reactions: list[dict]) -> dict:
    """
    Evalúa dispersión entre reacciones como indicador indirecto de irregularidad
    en la transmisión hacia el nodo.
    """
    if not reactions:
        return {
            "status": "fail",
            "message": "No existen reacciones para evaluar uniformidad nodal."
        }

    values = [abs(r["reaction_kN"]) for r in reactions]
    avg = sum(values) / len(values)

    if avg <= 0:
        return {
            "status": "fail",
            "message": "Las reacciones no son válidas para evaluar uniformidad nodal."
        }

    max_dev = max(abs(v - avg) for v in values)
    ratio = max_dev / avg

    status = "ok"
    if ratio > 0.25:
        status = "warning"
    if ratio > 0.45:
        status = "fail"

    return {
        "status": status,
        "deviation_ratio": ratio,
        "message": (
            f"La dispersión máxima de reacciones respecto al promedio es {ratio * 100:.1f}%."
        )
    }


def build_global_compliance(
    punching_status: str,
    shear_status: str,
    node_status: str,
    equilibrium_status: str,
    rebar_fit_status: str,
    strut_geometry_status: str,
    topology_status: str,
    bidirectional_status: str,
    nodal_uniformity_status: str
) -> dict:
    statuses = [
        punching_status,
        shear_status,
        node_status,
        equilibrium_status,
        rebar_fit_status,
        strut_geometry_status,
        topology_status,
        bidirectional_status,
        nodal_uniformity_status,
    ]

    if "fail" in statuses:
        overall = "fail"
        message = "El diseño presenta al menos una verificación crítica no conforme."
    elif "warning" in statuses:
        overall = "warning"
        message = "El diseño cumple de forma condicionada, pero requiere revisión técnica."
    else:
        overall = "ok"
        message = "El diseño cumple de forma global con las verificaciones implementadas."

    return {
        "status": overall,
        "message": message
    }