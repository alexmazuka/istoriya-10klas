#!/usr/bin/env python3
"""Збирає data/plan.json з календаря та планів предметів (data/plan/<subj>.json).
На відміну від zoshyt-4klas (10 предметів, гнучкий розклад-DSL), тут лише 2 предмети
з простим фіксованим правилом — тому слоти обчислюються прямо в коді, без DSL:
  - Всесвітня історія (world): щовівторка (день 2) — 1 год/тиждень, 35 уроків/рік.
  - Історія України (ukr): щочетверга (день 4) — плюс щопонеділка (день 1) на ПАРНИХ
    тижнях — разом 1,5 год/тиждень у середньому, 52 уроки/рік.
  - Якщо в конкретному тижні "свого" дня немає (тиждень 1 без понеділка, тиждень 16
    без четверга — обидва скорочені), використовується запасний день (середа, день 3).
id уроку = <subj>-w<WW>-d<D>. Запуск: python3 tools/build_plan.py
"""
import json, os, sys, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cal = json.load(open(f"{ROOT}/data/calendar.json", encoding="utf-8"))

world_slots, ukr_slots = [], []
for w in cal["weeks"]:
    wk, days = w["week"], set(w["days"])
    if 2 in days:
        world_slots.append((wk, 2, 1))
    elif 3 in days:
        world_slots.append((wk, 3, 1))
    if 4 in days:
        ukr_slots.append((wk, 4, 1))
    elif 3 in days and (wk, 3, 1) not in world_slots:
        ukr_slots.append((wk, 3, 1))
    if wk % 2 == 0 and 1 in days:
        ukr_slots.append((wk, 1, 1))
slots = {"world": world_slots, "ukr": ukr_slots}

lessons, errors = [], []
for sid in ("ukr", "world"):
    plan = json.load(open(f"{ROOT}/data/plan/{sid}.json", encoding="utf-8"))
    flat = [(sec["name"], l) for sec in plan["sections"] for l in sec["lessons"]]
    have, need = len(flat), len(slots[sid])
    if have != need:
        errors.append(f"{sid}: у плані {have} уроків, а слотів у розкладі {need}")
        continue
    for n, ((week, day, pos), (secname, l)) in enumerate(zip(slots[sid], flat), start=1):
        lid = f"{sid}-w{week:02d}-d{day}"
        lessons.append({
            "id": lid, "subject": sid, "week": week, "day": day, "pos": pos, "n": n,
            "section": secname, "title": l["t"], "brief": l.get("b", ""),
            "file": f"data/lessons/{sid}/{lid}.json",
            "exists": os.path.exists(f"{ROOT}/data/lessons/{sid}/{lid}.json"),
        })

if errors:
    print("ПОМИЛКИ:\n  " + "\n  ".join(errors)); sys.exit(1)

lessons.sort(key=lambda x: (x["week"], x["day"], x["pos"]))
out = {
    "generated": datetime.date.today().isoformat(),
    "total": len(lessons),
    "written": sum(1 for l in lessons if l["exists"]),
    "lessons": lessons,
}
json.dump(out, open(f"{ROOT}/data/plan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"plan.json: {out['total']} уроків, готових файлів: {out['written']}")
missing = [l["id"] for l in lessons if not l["exists"]]
if missing and "-v" in sys.argv:
    print("Немає файлів:", " ".join(missing))
