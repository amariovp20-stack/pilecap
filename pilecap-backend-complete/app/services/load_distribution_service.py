from app.models.input_models import PileCapInput


def compute_pile_reactions(data: PileCapInput) -> list[dict]:
    piles = data.piles
    loads = data.loads

    n = len(piles)
    xg = sum(p.x for p in piles) / n
    yg = sum(p.y for p in piles) / n

    x_rel = [p.x - xg for p in piles]
    y_rel = [p.y - yg for p in piles]

    sum_x2 = sum(x ** 2 for x in x_rel)
    sum_y2 = sum(y ** 2 for y in y_rel)

    results = []

    for i, pile in enumerate(piles):
        reaction = loads.Pu / n

        if sum_y2 > 0:
            reaction += (loads.Mux * y_rel[i]) / sum_y2

        if sum_x2 > 0:
            reaction += (loads.Muy * x_rel[i]) / sum_x2

        status = "ok"

        if reaction < 0:
            status = "uplift"
        elif pile.allowable_reaction is not None and reaction > pile.allowable_reaction:
            status = "exceeds_allowable"

        results.append({
            "id": pile.id,
            "x": pile.x,
            "y": pile.y,
            "reaction_kN": reaction,
            "status": status
        })

    return results