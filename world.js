// Ki Realm shared world: who else is standing in the same area right now.
const BIOMES = ["home", "field", "waste", "namek"];
const RACES = ["earth", "saiyan", "namek"];
const STALE = 12000;

function num(v, lo, hi) {
  v = Number(v);
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

export function act(world, input) {
  const id = String(world.who.id || "x").replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 90);
  const kind = input && input.kind;
  if (kind === "leave") {
    for (const b of BIOMES) if (world.get("p:" + b + ":" + id)) world.remove("p:" + b + ":" + id);
    return { ok: true };
  }
  if (kind !== "pos") return { refused: "kind" };
  const b = BIOMES.includes(input.b) ? input.b : "field";
  for (const ob of BIOMES) {
    if (ob !== b && world.get("p:" + ob + ":" + id)) world.remove("p:" + ob + ":" + id);
  }
  const me = {
    n: String(world.who.name || "").slice(0, 24),
    r: RACES.includes(input.r) ? input.r : "earth",
    x: num(input.x, -50, 4000),
    y: num(input.y, -900, 600),
    f: input.f === -1 ? -1 : 1,
    lv: num(input.lv, 1, 999),
    a: num(input.a, 0, 7),
    s: input.s ? 1 : 0,
    t: world.now,
  };
  world.put("p:" + b + ":" + id, me);
  const others = [];
  let writes = 0;
  for (const rec of world.list("p:" + b + ":", "", 100)) {
    if (rec.key === "p:" + b + ":" + id) continue;
    const v = rec.value;
    if (!v || world.now - v.t > STALE) {
      if (writes < 20 && v && world.now - v.t > 60000) { world.remove(rec.key); writes++; }
      continue;
    }
    others.push({ id: rec.key.slice(b.length + 3), n: v.n, r: v.r, x: v.x, y: v.y, f: v.f, lv: v.lv, a: v.a, s: v.s });
  }
  return { others, now: world.now };
}
