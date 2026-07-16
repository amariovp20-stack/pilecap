from app.utils.rebar_catalog import REBARS_MM2
from app.utils.units import kn_to_n, mpa_to_n_per_mm2


def compute_min_steel_mm2(width_m: float, d_m: float, rho_min: float = 0.0018) -> float:
    b_mm = width_m * 1000.0
    d_mm = d_m * 1000.0
    return rho_min * b_mm * d_mm


def compute_required_steel_mm2(tie_force_kN: float, fy_mpa: float, phi_steel: float) -> float:
    tie_force_n = kn_to_n(tie_force_kN)
    fy_n_per_mm2 = mpa_to_n_per_mm2(fy_mpa)
    return tie_force_n / (phi_steel * fy_n_per_mm2)


def generate_rebar_options(as_design_mm2: float, min_bars: int = 2, max_bars: int = 30) -> list[dict]:
    options: list[dict] = []

    for label, bar_area in REBARS_MM2.items():
        for bar_count in range(min_bars, max_bars + 1):
            as_provided = bar_count * bar_area

            if as_provided >= as_design_mm2:
                excess = as_provided - as_design_mm2
                efficiency_ratio = as_design_mm2 / as_provided if as_provided > 0 else 0.0

                options.append({
                    "label": f"{bar_count}{label}",
                    "bar_area_mm2": bar_area,
                    "bar_count": bar_count,
                    "As_provided_mm2": as_provided,
                    "excess_mm2": excess,
                    "efficiency_ratio": efficiency_ratio,
                })
                break

    options.sort(key=lambda x: (x["excess_mm2"], -x["efficiency_ratio"], x["bar_count"]))
    return options


def design_reinforcement(
    tie_force_kN: float,
    fy: float,
    phi_steel: float,
    width_m: float,
    d_m: float
) -> dict:
    as_req = compute_required_steel_mm2(tie_force_kN, fy, phi_steel)
    as_min = compute_min_steel_mm2(width_m, d_m)
    as_design = max(as_req, as_min)

    options = generate_rebar_options(as_design)

    if not options:
      raise ValueError("No se encontraron opciones de armadura que cumplan.")

    best = options[0]

    return {
        "tie_force_kN": tie_force_kN,
        "As_required_mm2": as_req,
        "As_min_mm2": as_min,
        "As_design_mm2": as_design,
        "selected_option": best["label"],
        "As_provided_mm2": best["As_provided_mm2"],
        "optimization_ratio": best["efficiency_ratio"],
        "top_options": options[:5],
    }