from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from assign import solve_assign
from binpack import solve_binpack
from knapsack import solve_knapsack
from solver import solve_all

app = FastAPI(title="Berth contract coloring demo")
MAX_SHIPS = 200


class Ship(BaseModel):
    name: str
    s: float
    e: float


class SolveIn(BaseModel):
    ships: list[Ship]
    pairs: list[list[int]] = Field(default_factory=list)
    F: float = 100
    r: float = 10


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/solve")
def solve(body: SolveIn):
    n = len(body.ships)
    if not 1 <= n <= MAX_SHIPS:
        raise HTTPException(422, f"Số tàu phải từ 1 đến {MAX_SHIPS}.")
    if body.F < 0 or body.r < 0:
        raise HTTPException(422, "F và r phải không âm.")
    for sh in body.ships:
        if not sh.e > sh.s:
            raise HTTPException(422, f"{sh.name}: giờ rời phải sau giờ đến.")
    for p in body.pairs:
        if len(p) != 2 or not all(0 <= x < n for x in p):
            raise HTTPException(422, "Cặp ràng buộc không hợp lệ.")
    return solve_all([s.model_dump() for s in body.ships], body.pairs, body.F, body.r)


class AShip(BaseModel):
    name: str
    s: float
    e: float
    need: list[str] = Field(default_factory=list)


class ATeam(BaseModel):
    name: str
    skills: list[str] = Field(default_factory=list)
    rate: float


class AssignIn(BaseModel):
    ships: list[AShip]
    teams: list[ATeam]
    pairs: list[list[int]] = Field(default_factory=list)


@app.post("/api/assign")
def assign(body: AssignIn):
    n, m = len(body.ships), len(body.teams)
    if not 1 <= n <= 60 or not 1 <= m <= 12:
        raise HTTPException(422, "Cần 1–60 tàu và 1–12 đội.")
    for sh in body.ships:
        if not sh.e > sh.s:
            raise HTTPException(422, f"{sh.name}: giờ rời phải sau giờ đến.")
    if any(t.rate < 0 for t in body.teams):
        raise HTTPException(422, "Đơn giá phải không âm.")
    for p in body.pairs:
        if len(p) != 2 or not all(0 <= x < n for x in p):
            raise HTTPException(422, "Cặp ràng buộc không hợp lệ.")
    return solve_assign([s.model_dump() for s in body.ships], [t.model_dump() for t in body.teams], body.pairs)


class KItem(BaseModel):
    name: str
    w: int
    v: float


class KnapIn(BaseModel):
    items: list[KItem]
    W: int


@app.post("/api/knapsack")
def knapsack(body: KnapIn):
    n = len(body.items)
    if not 1 <= n <= 25:
        raise HTTPException(422, "Cần 1–25 yêu cầu.")
    if not 0 <= body.W <= 200 or n * (body.W + 1) > 4000:
        raise HTTPException(422, "Quỹ giờ công từ 0 đến 200 và (số yêu cầu × quỹ) tối đa khoảng 4000 ô.")
    for it in body.items:
        if it.w < 1 or it.v < 0:
            raise HTTPException(422, f"{it.name}: số giờ phải là số nguyên ≥ 1 và giá trị ≥ 0.")
    return solve_knapsack([i.model_dump() for i in body.items], body.W)


class BItem(BaseModel):
    name: str
    w: float


class BinIn(BaseModel):
    items: list[BItem]
    C: float


@app.post("/api/binpack")
def binpack(body: BinIn):
    n = len(body.items)
    if not 1 <= n <= 60:
        raise HTTPException(422, "Cần 1–60 lô container.")
    if body.C <= 0:
        raise HTTPException(422, "Tải trọng phải dương.")
    for it in body.items:
        if not 0 < it.w <= body.C:
            raise HTTPException(422, f"{it.name}: khối lượng phải trong (0, {body.C}].")
    return solve_binpack([i.model_dump() for i in body.items], body.C)


# Chế độ một cổng: nếu đã build frontend (npm run build) thì phục vụ luôn tại "/"
_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _dist.is_dir():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="web")
