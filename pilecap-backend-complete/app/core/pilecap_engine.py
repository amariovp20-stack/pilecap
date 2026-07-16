from app.models.input_models import PileCapInput
from app.services.validation_service import validate_input
from app.services.geometry_service import (
    compute_effective_depth,
    compute_centroid,
    compute_strut_geometry
)
from app.services.load_distribution_service import compute_pile_reactions
from app.services.strut_tie_service import compute_struts
from app.services.reinforcement_service import design_reinforcement
from app.services.punching_service import check_punching
from app.services.shear_service import check_one_way_shear
from app.services.stm_model_service import (
    select_stm_model,
    evaluate_stm_variants,
)
from app.services.global_check_service import (
    check_reaction_equilibrium,
    check_reinforcement_fit,
    check_strut_geometry_consistency,
)
from app.services.advanced_stm_check_service import (
    evaluate_bidirectional_tie_behavior,
    evaluate_stm_topology_quality,
    evaluate_node_demand_uniformity,
    build_global_compliance,
)


def get_node_beta(design_code: str, user_beta_n: float) -> float:
    code = (design_code or "").upper()
    if "EURO" in code or "EC2" in code:
        return 0.75
    return user_beta_n


def get_phi_shear(design_code: str, user_phi_shear: float) -> float:
    code = (design_code or "").upper()
    if "EURO" in code or "EC2" in code:
        return 1.00
    return user_phi_shear


def get_phi_steel(design_code: str, user_phi_steel: float) -> float:
    code = (design_code or "").upper()
    if "EURO" in code or "EC2" in code:
        return 1.00
    return user_phi_steel


def check_node_capacity(fc: float, beta_n: float, An_m2: float, force_kN: float) -> dict:
    Fn_kN = 0.85 * beta_n * fc * 1000.0 * An_m2
    ratio = force_kN / Fn_kN if Fn_kN > 0 else 999.0

    status = "ok"
    if ratio > 1.0:
        status = "fail"
    elif ratio > 0.75:
        status = "warning"

    return {
        "Fn_kN": Fn_kN,
        "ratio": ratio,
        "status": status
    }


def run_pilecap_design(data: PileCapInput) -> dict:
    warnings = validate_input(data)

    g = data.geometry
    m = data.materials
    l = data.loads
    code = data.project.design_code
    pile_count = len(data.piles)

    stm_model = select_stm_model(pile_count)

    phi_steel = get_phi_steel(code, m.phi_steel)
    phi_shear = get_phi_shear(code, m.phi_shear)
    beta_n = get_node_beta(code, m.beta_n)

    d = compute_effective_depth(g)
    if d <= 0:
        raise ValueError("La altura efectiva calculada es inválida.")

    if d < 0.15:
        warnings.append("La altura efectiva calculada del cabezal es muy pequeña para un STM confiable.")

    xg, yg = compute_centroid(data.piles)

    reactions = compute_pile_reactions(data)

    for reaction in reactions:
        if reaction["status"] == "uplift":
            warnings.append(f"El pilote {reaction['id']} presenta levantamiento.")
        elif reaction["status"] == "exceeds_allowable":
            warnings.append(f"El pilote {reaction['id']} excede la reacción admisible.")

    equilibrium_check = check_reaction_equilibrium(reactions, l.Pu)
    if equilibrium_check["status"] == "fail":
        raise ValueError(
            f"El equilibrio global de reacciones no es aceptable. {equilibrium_check['message']}"
        )
    elif equilibrium_check["status"] == "warning":
        warnings.append(
            f"El equilibrio global de reacciones está cercano al límite de tolerancia. {equilibrium_check['message']}"
        )

    strut_geometries = [
        compute_strut_geometry(pile, g.column_x, g.column_y, d)
        for pile in data.piles
    ]

    struts = compute_struts(reactions, strut_geometries)

    for s in struts:
        if s["angle_status"] == "fail":
            warnings.append(
                f"Biela en pilote {s['pile_id']} fuera de rango recomendado (θ={s['angle_deg']:.1f}°)."
            )
        elif s["angle_status"] == "warning":
            warnings.append(
                f"Biela en pilote {s['pile_id']} en límite recomendado (θ={s['angle_deg']:.1f}°)."
            )

    strut_consistency = check_strut_geometry_consistency(struts, d)
    if strut_consistency["status"] == "fail":
        warnings.append(
            f"La geometría del modelo STM presenta inconsistencias importantes. {strut_consistency['message']}"
        )
    elif strut_consistency["status"] == "warning":
        warnings.append(
            f"La geometría del modelo STM requiere revisión. {strut_consistency['message']}"
        )

    topology_check = evaluate_stm_topology_quality(
        pile_count=pile_count,
        struts=struts,
        stm_model_code=stm_model["model_code"]
    )
    if topology_check["status"] == "fail":
        warnings.append(f"Inconsistencia crítica en topología STM. {topology_check['message']}")
    elif topology_check["status"] == "warning":
        warnings.append(f"Revisar topología STM. {topology_check['message']}")

    bidirectional_check = evaluate_bidirectional_tie_behavior(struts)
    if bidirectional_check["status"] == "fail":
        warnings.append(
            f"La transmisión horizontal del STM está excesivamente concentrada. {bidirectional_check['message']}"
        )
    elif bidirectional_check["status"] == "warning":
        warnings.append(
            f"La transmisión horizontal del STM es poco uniforme. {bidirectional_check['message']}"
        )

    nodal_uniformity_check = evaluate_node_demand_uniformity(reactions)
    if nodal_uniformity_check["status"] == "fail":
        warnings.append(
            f"Las reacciones muestran fuerte irregularidad respecto al promedio. {nodal_uniformity_check['message']}"
        )
    elif nodal_uniformity_check["status"] == "warning":
        warnings.append(
            f"Las reacciones presentan dispersión apreciable. {nodal_uniformity_check['message']}"
        )

    stm_selection = evaluate_stm_variants(
        stm_model=stm_model,
        struts=struts,
        fy=m.fy,
        phi_steel=phi_steel,
        width_m=g.width,
        d_m=d
    )

    best_tie_force = stm_selection["best_tie_force_kN"]

    reinforcement = design_reinforcement(
        tie_force_kN=best_tie_force,
        fy=m.fy,
        phi_steel=phi_steel,
        width_m=g.width,
        d_m=d
    )

    rebar_fit_check = check_reinforcement_fit(
        selected_option=reinforcement["selected_option"],
        width_m=g.width,
        cover_side_m=g.cover_side
    )

    if rebar_fit_check["status"] == "fail":
        warnings.append(
            f"La armadura adoptada podría no caber físicamente en el ancho útil del cabezal. {rebar_fit_check['message']}"
        )
    elif rebar_fit_check["status"] == "warning":
        warnings.append(
            f"La armadura adoptada utiliza gran parte del ancho útil del cabezal. {rebar_fit_check['message']}"
        )

    punching = check_punching(
        Pu_kN=l.Pu,
        column_width_m=g.column_width,
        column_length_m=g.column_length,
        d_m=d,
        fc_mpa=m.fc,
        phi_shear=phi_shear,
        design_code=code
    )

    Vu = max(abs(l.Vux), abs(l.Vuy))
    shear = check_one_way_shear(
        Vu_kN=Vu,
        width_m=g.width,
        d_m=d,
        fc_mpa=m.fc,
        phi_shear=phi_shear,
        design_code=code
    )

    An_m2 = g.column_width * g.column_length
    node_check = check_node_capacity(
        fc=m.fc,
        beta_n=beta_n,
        An_m2=An_m2,
        force_kN=best_tie_force
    )

    if punching["status"] == "fail":
        warnings.append(f"El cabezal no cumple punzonamiento simplificado según {code}.")
    elif punching["status"] == "warning":
        warnings.append(f"El cabezal está próximo al límite de punzonamiento según {code}.")

    if shear["status"] == "fail":
        warnings.append(f"El cabezal no cumple cortante unidireccional simplificado según {code}.")
    elif shear["status"] == "warning":
        warnings.append(f"El cabezal está próximo al límite de cortante unidireccional según {code}.")

    if node_check["status"] == "fail":
        warnings.append(f"El nodo STM no cumple capacidad según {code}.")
    elif node_check["status"] == "warning":
        warnings.append(f"El nodo STM está cercano a su capacidad según {code}.")

    if reinforcement["optimization_ratio"] < 0.75:
        warnings.append("La opción de armadura seleccionada cumple, pero no es muy eficiente en consumo de acero.")

    global_compliance = build_global_compliance(
        punching_status=punching["status"],
        shear_status=shear["status"],
        node_status=node_check["status"],
        equilibrium_status=equilibrium_check["status"],
        rebar_fit_status=rebar_fit_check["status"],
        strut_geometry_status=strut_consistency["status"],
        topology_status=topology_check["status"],
        bidirectional_status=bidirectional_check["status"],
        nodal_uniformity_status=nodal_uniformity_check["status"],
    )

    warnings.append(f"Modelo óptimo seleccionado: {stm_selection['selected_variant_name']}.")
    warnings.append(
        f"Perfil del diseño: {stm_selection['design_profile']} con eficiencia {stm_selection['efficiency_band']}."
    )

    if global_compliance["status"] == "warning":
        warnings.append("Cumplimiento global condicionado: revisar advertencias antes de emitir diseño final.")
    elif global_compliance["status"] == "fail":
        warnings.append("Cumplimiento global no satisfactorio: el diseño requiere ajustes antes de su aceptación.")

    return {
        "effective_depth_m": d,
        "centroid_x_m": xg,
        "centroid_y_m": yg,
        "reactions": reactions,
        "struts": struts,
        "reinforcement": reinforcement,
        "punching_check": punching,
        "shear_check": shear,
        "node_check": node_check,
        "stm_model": {
            "model_code": stm_model["model_code"],
            "model_name": stm_model["model_name"],
            "pile_count": stm_model["pile_count"],
            "description": stm_model["description"],
            "tie_force_rule": stm_model["tie_force_rule"],
            "recommended_detailing": stm_model["recommended_detailing"],
        },
        "optimal_stm_selection": {
            "selected_variant_code": stm_selection["selected_variant_code"],
            "selected_variant_name": stm_selection["selected_variant_name"],
            "criterion": stm_selection["criterion"],
            "variants": stm_selection["variants"],
            "design_profile": stm_selection["design_profile"],
            "efficiency_band": stm_selection["efficiency_band"],
            "recommendation": stm_selection["recommendation"],
        },
        "warnings": warnings,
        "summary": {
            "pile_count": pile_count,
            "design_code": code,
            "status": "completed",
            "phi_steel_used": phi_steel,
            "phi_shear_used": phi_shear,
            "beta_n_used": beta_n,
            "stm_model_code": stm_model["model_code"],
            "stm_model_name": stm_model["model_name"],
            "optimal_variant_code": stm_selection["selected_variant_code"],
            "optimal_variant_name": stm_selection["selected_variant_name"],
            "equilibrium_status": equilibrium_check["status"],
            "equilibrium_message": equilibrium_check["message"],
            "rebar_fit_status": rebar_fit_check["status"],
            "rebar_fit_message": rebar_fit_check["message"],
            "strut_geometry_status": strut_consistency["status"],
            "strut_geometry_message": strut_consistency["message"],
            "topology_status": topology_check["status"],
            "topology_message": topology_check["message"],
            "bidirectional_status": bidirectional_check["status"],
            "bidirectional_message": bidirectional_check["message"],
            "nodal_uniformity_status": nodal_uniformity_check["status"],
            "nodal_uniformity_message": nodal_uniformity_check["message"],
            "global_compliance_status": global_compliance["status"],
            "global_compliance_message": global_compliance["message"],
        }
    }