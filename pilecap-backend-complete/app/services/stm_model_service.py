from app.services.reinforcement_service import design_reinforcement


def select_stm_model(pile_count: int) -> dict:
    if pile_count <= 2:
        return {
            "model_code": "STM-LINEAL-2P",
            "model_name": "Biela simple lineal",
            "pile_count": pile_count,
            "description": (
                "Modelo STM lineal para cabezal con dos pilotes. "
                "La transferencia principal ocurre mediante dos bielas comprimidas "
                "y un tirante inferior principal."
            ),
            "tie_force_rule": "T ≈ suma de componentes horizontales / 2.0",
            "recommended_detailing": (
                "Concentrar armadura principal inferior en la dirección entre pilotes "
                "y revisar anclaje bajo columna."
            ),
            "default_divisor": 2.0,
            "variants": [
                {"variant_code": "LINEAL-CONS", "variant_name": "Lineal conservador", "divisor": 1.9},
                {"variant_code": "LINEAL-BASE", "variant_name": "Lineal base", "divisor": 2.0},
                {"variant_code": "LINEAL-EFIC", "variant_name": "Lineal eficiente", "divisor": 2.1},
            ],
        }

    if pile_count == 3:
        return {
            "model_code": "STM-TRIANGULAR-3P",
            "model_name": "Modelo triangular de bielas",
            "pile_count": pile_count,
            "description": (
                "Modelo STM triangular para cabezal con tres pilotes. "
                "La carga se distribuye hacia tres bielas comprimidas con "
                "tirante resultante inferior."
            ),
            "tie_force_rule": "T ≈ suma de componentes horizontales / 2.2",
            "recommended_detailing": (
                "Distribuir armadura inferior en dos direcciones principales "
                "y revisar simetría geométrica de la disposición."
            ),
            "default_divisor": 2.2,
            "variants": [
                {"variant_code": "TRI-CONS", "variant_name": "Triangular conservador", "divisor": 2.0},
                {"variant_code": "TRI-BASE", "variant_name": "Triangular base", "divisor": 2.2},
                {"variant_code": "TRI-EFIC", "variant_name": "Triangular eficiente", "divisor": 2.35},
            ],
        }

    return {
        "model_code": "STM-RETICULADO-4P",
        "model_name": "Modelo reticulado de bielas y tirantes",
        "pile_count": pile_count,
        "description": (
            "Modelo STM reticulado para cabezales con cuatro o más pilotes. "
            "La transferencia de carga se interpreta como una red de bielas "
            "comprimidas y tirantes distribuidos."
        ),
        "tie_force_rule": "T ≈ suma de componentes horizontales / 2.5",
        "recommended_detailing": (
            "Usar armadura inferior distribuida en dos direcciones, "
            "controlar concentración de esfuerzos en torno al nodo de columna "
            "y verificar compatibilidad geométrica del reticulado."
        ),
        "default_divisor": 2.5,
        "variants": [
            {"variant_code": "RET-CONS", "variant_name": "Reticulado conservador", "divisor": 2.3},
            {"variant_code": "RET-BASE", "variant_name": "Reticulado base", "divisor": 2.5},
            {"variant_code": "RET-EFIC", "variant_name": "Reticulado eficiente", "divisor": 2.7},
        ],
    }


def compute_tie_force_from_divisor(struts: list[dict], divisor: float) -> float:
    if not struts or divisor <= 0:
        return 0.0

    horizontal_sum = sum(abs(s["horizontal_component_kN"]) for s in struts)
    return horizontal_sum / divisor


def classify_efficiency_band(ratio: float) -> str:
    if ratio >= 0.90:
        return "muy alta"
    if ratio >= 0.80:
        return "alta"
    if ratio >= 0.70:
        return "media"
    return "baja"


def classify_design_profile(variant_code: str) -> str:
    upper = variant_code.upper()
    if upper.endswith("CONS"):
        return "conservador"
    if upper.endswith("BASE"):
        return "balanceado"
    if upper.endswith("EFIC"):
        return "económico"
    return "balanceado"


def build_recommendation(profile: str, band: str, selected_option: str) -> str:
    if profile == "económico":
        return (
            f"La variante seleccionada prioriza menor demanda de tirante y mejor aprovechamiento del acero. "
            f"Se recomienda como alternativa económica con armadura {selected_option}, verificando detallado final."
        )
    if profile == "conservador":
        return (
            f"La variante seleccionada prioriza seguridad y menor sensibilidad geométrica. "
            f"Se recomienda como opción robusta con armadura {selected_option}."
        )
    return (
        f"La variante seleccionada ofrece un equilibrio entre consumo de acero y desempeño estructural, "
        f"con eficiencia {band} y armadura {selected_option}."
    )


def evaluate_stm_variants(
    stm_model: dict,
    struts: list[dict],
    fy: float,
    phi_steel: float,
    width_m: float,
    d_m: float
) -> dict:
    results = []

    for variant in stm_model["variants"]:
        tie_force = compute_tie_force_from_divisor(struts, variant["divisor"])

        reinforcement = design_reinforcement(
            tie_force_kN=tie_force,
            fy=fy,
            phi_steel=phi_steel,
            width_m=width_m,
            d_m=d_m
        )

        results.append({
            "variant_code": variant["variant_code"],
            "variant_name": variant["variant_name"],
            "divisor_used": variant["divisor"],
            "tie_force_kN": tie_force,
            "As_required_mm2": reinforcement["As_required_mm2"],
            "As_provided_mm2": reinforcement["As_provided_mm2"],
            "selected_option": reinforcement["selected_option"],
            "optimization_ratio": reinforcement["optimization_ratio"],
        })

    results.sort(key=lambda x: (x["As_provided_mm2"], -x["optimization_ratio"]))

    ranked = []
    for idx, item in enumerate(results, start=1):
        item["rank"] = idx
        ranked.append(item)

    best = ranked[0]
    profile = classify_design_profile(best["variant_code"])
    band = classify_efficiency_band(best["optimization_ratio"])
    recommendation = build_recommendation(profile, band, best["selected_option"])

    return {
        "selected_variant_code": best["variant_code"],
        "selected_variant_name": best["variant_name"],
        "criterion": "Menor As provista y mejor eficiencia de optimización",
        "variants": ranked,
        "best_divisor": best["divisor_used"],
        "best_tie_force_kN": best["tie_force_kN"],
        "design_profile": profile,
        "efficiency_band": band,
        "recommendation": recommendation,
    }