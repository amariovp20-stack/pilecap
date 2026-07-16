from math import sqrt, atan, degrees
from app.models.input_models import GeometryModel, PileModel


def compute_effective_depth(geometry: GeometryModel) -> float:
    return (
        geometry.height
        - geometry.cover_bottom
        - geometry.stirrup_diameter
        - geometry.main_bar_diameter / 2
    )


def compute_centroid(piles: list[PileModel]) -> tuple[float, float]:
    xg = sum(p.x for p in piles) / len(piles)
    yg = sum(p.y for p in piles) / len(piles)
    return xg, yg


def compute_strut_geometry(
    pile: PileModel,
    column_x: float,
    column_y: float,
    d: float
) -> dict:
    lh = sqrt((pile.x - column_x) ** 2 + (pile.y - column_y) ** 2)
    lb = sqrt(lh ** 2 + d ** 2)

    angle_deg = 90.0 if lh == 0 else degrees(atan(d / lh))

    return {
        "horizontal_projection_m": lh,
        "strut_length_m": lb,
        "angle_deg": angle_deg
    }