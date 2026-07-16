from app.models.input_models import PileCapInput
from app.services.validation_service import validate_input
from app.services.geometry_service import compute_effective_depth, compute_centroid, compute_strut_geometry
from app.services.load_distribution_service import compute_pile_reactions
from app.services.strut_tie_service import compute_struts, compute_tie_force
from app.services.reinforcement_service import design_reinforcement
from app.services.punching_service import check_punching
from app.services.shear_service import check_one_way_shear


def run_pilecap_design(data: PileCapInput) -> dict:
    warnings = validate_input(data)

    g = data.geometry
    m = data.materials
    l = data.loads

    d = compute_effective_depth(g)
    if d <= 0:
        raise ValueError("La altura efectiva calculada es inválida.")

    xg, yg = compute_centroid(data.piles)

    reactions = compute_pile_reactions(data)
    for reaction in reactions:
        if reaction["status"] == "uplift":
            warnings.append(f"El pilote {reaction['id']} presenta reacción negativa (levantamiento).")
        elif reaction["status"] == "exceeds_allowable":
            warnings.append(f"El pilote {reaction['id']} excede la reacción admisible.")

    strut_geometries = [
        compute_strut_geometry(pile, g.column_x, g.column_y, d)
        for pile in data.piles
    ]

    struts = compute_struts(reactions, strut_geometries)
    tie_force = compute_tie_force(struts, pile_count=len(data.piles))

    reinforcement = design_reinforcement(
        tie_force_kN=tie_force,
        fy=m.fy,
        phi_steel=m.phi_steel,
        width_m=g.width,
        d_m=d
    )

    punching = check_punching(
        Pu_kN=l.Pu,
        column_width_m=g.column_width,
        column_length_m=g.column_length,
        d_m=d,
        fc_mpa=m.fc,
        phi_shear=m.phi_shear
    )

    Vu = max(abs(l.Vux), abs(l.Vuy))
    shear = check_one_way_shear(
        Vu_kN=Vu,
        width_m=g.width,
        d_m=d,
        fc_mpa=m.fc,
        phi_shear=m.phi_shear
    )

    return {
        "effective_depth_m": d,
        "centroid_x_m": xg,
        "centroid_y_m": yg,
        "reactions": reactions,
        "struts": struts,
        "reinforcement": reinforcement,
        "punching_check": punching,
        "shear_check": shear,
        "warnings": warnings,
        "summary": {
            "pile_count": len(data.piles),
            "design_code": data.project.design_code,
            "status": "completed"
        }
    }
