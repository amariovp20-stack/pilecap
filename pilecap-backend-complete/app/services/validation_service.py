from math import sqrt


def _get_pile_radius_or_half_side(pile) -> float:
    shape = getattr(pile, "shape", "circular")

    if shape == "circular":
        diameter = getattr(pile, "diameter", None)
        if diameter is None or diameter <= 0:
            return 0.0
        return diameter / 2.0

    side = getattr(pile, "side", None)
    if side is None or side <= 0:
        return 0.0
    return side / 2.0


def _pile_min_center_distance(p1, p2) -> float:
    r1 = _get_pile_radius_or_half_side(p1)
    r2 = _get_pile_radius_or_half_side(p2)
    return r1 + r2


def validate_input(data) -> list[str]:
    warnings: list[str] = []

    g = data.geometry
    piles = data.piles
    loads = data.loads
    materials = data.materials

    # 1. Validaciones geométricas básicas
    if g.length <= 0 or g.width <= 0 or g.height <= 0:
        raise ValueError("Las dimensiones del cabezal deben ser mayores que cero.")

    if g.column_width <= 0 or g.column_length <= 0:
        raise ValueError("Las dimensiones de la columna deben ser mayores que cero.")

    if len(piles) < 2:
        raise ValueError("El cabezal debe tener al menos 2 pilotes.")

    if loads.Pu <= 0:
        raise ValueError("La carga axial Pu debe ser mayor que cero.")

    if materials.fc <= 0 or materials.fy <= 0:
        raise ValueError("Las propiedades de materiales f'c y fy deben ser mayores que cero.")

    # 2. Columna dentro del cabezal
    col_left = g.column_x - g.column_width / 2.0
    col_right = g.column_x + g.column_width / 2.0
    col_bottom = g.column_y - g.column_length / 2.0
    col_top = g.column_y + g.column_length / 2.0

    if col_left < 0 or col_right > g.length or col_bottom < 0 or col_top > g.width:
        raise ValueError("La columna está parcial o totalmente fuera del cabezal.")

    # 3. Pilotes dentro del cabezal
    for pile in piles:
        margin = _get_pile_radius_or_half_side(pile)
        px = pile.x
        py = pile.y

        if px - margin < 0 or px + margin > g.length or py - margin < 0 or py + margin > g.width:
            raise ValueError(f"El pilote {pile.id} está parcial o totalmente fuera del cabezal.")

        allowable = getattr(pile, "allowable_reaction", None)
        if allowable is not None and allowable <= 0:
            raise ValueError(f"La reacción admisible del pilote {pile.id} debe ser mayor que cero.")

    # 4. Separación mínima entre pilotes
    for i in range(len(piles)):
        for j in range(i + 1, len(piles)):
            p1 = piles[i]
            p2 = piles[j]

            dx = p2.x - p1.x
            dy = p2.y - p1.y
            dist = sqrt(dx * dx + dy * dy)

            min_clear_centers = _pile_min_center_distance(p1, p2)
            if dist <= min_clear_centers:
                raise ValueError(
                    f"Los pilotes {p1.id} y {p2.id} se superponen o no tienen separación libre."
                )

            # Advertencia suave: separación reducida
            if dist < 2.5 * min_clear_centers:
                warnings.append(
                    f"Los pilotes {p1.id} y {p2.id} presentan separación reducida; revisar interferencia geométrica."
                )

    # 5. Revisión preliminar de recubrimientos y barras
    if g.cover_bottom <= 0 or g.cover_side < 0:
        raise ValueError("Los recubrimientos deben ser válidos y mayores o iguales a cero.")

    if g.main_bar_diameter <= 0:
        raise ValueError("El diámetro principal de barra debe ser mayor que cero.")

    # 6. Revisión preliminar de altura útil
    d_prelim = g.height - g.cover_bottom - g.main_bar_diameter / 2.0
    if d_prelim <= 0:
        raise ValueError("La altura efectiva preliminar es negativa o nula. Revisar h, recubrimiento y barra.")

    if d_prelim < 0.15:
        warnings.append(
            "La altura efectiva preliminar del cabezal es muy reducida; el modelo STM puede resultar poco confiable."
        )

    # 7. Excentricidad importante
    ex = abs(loads.Muy / loads.Pu) if loads.Pu != 0 else 0.0
    ey = abs(loads.Mux / loads.Pu) if loads.Pu != 0 else 0.0

    if ex > g.length / 4.0 or ey > g.width / 4.0:
        warnings.append(
            "La excentricidad de carga es importante respecto a las dimensiones del cabezal; revisar redistribución de reacciones."
        )

    return warnings