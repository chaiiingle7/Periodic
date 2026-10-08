"""
Scheduling engine for the Periodic timetable generator.

A heuristic constraint-satisfaction solver with randomized restarts — not a
guaranteed-optimal solver, but a "satisficing" one that tries many random
orderings and keeps the best result found.

Hard constraints (never broken):
  - A teacher is never double-booked.
  - A whole-class slot and a sub-batch's own slot never overlap for the same
    batch (see "Sub-batches" below for exactly what this means).
  - A teacher's weekly hour cap is never exceeded.
  - A teacher's declared unavailability is respected.
  - A lab block stays contiguous and never straddles a break.
  - Every subject's weekly tuition hours are (attempted to be) fully placed.

Soft constraints (avoided when possible, accepted only when unavoidable):
  - Back-to-back periods for the same teacher.
  - The same subject appearing twice in one day for the same batch/sub-batch.
  - A free period in the middle of the day (or a late start) for a batch or sub-batch, when config["noFreePeriods"] is set. This
    is a strong soft constraint, not a hard one, because zero gaps can be
    impossible alongside the hard constraints depending on the input.
    Finishing early (empty periods at the END of a day) is not a gap.

Optional hard rule:
  - config["labsAfterLunch"]: labs may only run after the last break, in fixed
    blocks (e.g. periods 5-6 and 7-8), like a real college timetable.

Sub-batches:
  A batch can be split into sub-batches (e.g. S1-S4). Each lab subject
  belongs to exactly one sub-batch (set via subject["subBatchIndex"]) with
  its own teacher and its own weekly hours — this matches how real
  institutions actually assign labs: different sub-batches often take
  different labs, with different teachers, for different numbers of hours,
  rather than every sub-batch rotating through one shared pool of labs.
  Multiple sub-batches CAN have a lab in the same slot at the same time
  (that's normal and expected — they're physically separate groups), but a
  whole-class lecture can only be scheduled when every sub-batch is free.
"""

import random
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def get_periods_for_day(config: dict, day: str) -> int:
    overrides = config.get("dayOverrides") or {}
    override = overrides.get(day)
    if override and override > 0:
        return override
    return config["periodsPerDay"]


def teacher_availability_score(teacher: dict, config: dict) -> int:
    total = sum(get_periods_for_day(config, d) for d in config["days"])
    blocked = len(teacher.get("unavailable") or [])
    return total - blocked


def contiguous_ok(start_period: int, size: int, break_after_set: set) -> bool:
    for p in range(start_period, start_period + size - 1):
        if p in break_after_set:
            return False
    return True


_uid_counter = [1]


def _uid(prefix: str) -> str:
    _uid_counter[0] += 1
    return f"{prefix}{_uid_counter[0]}"


# ---------------------------------------------------------------------------
# Turning config into "units" to be placed on the grid
# ---------------------------------------------------------------------------

def build_units(config: dict) -> List[dict]:
    units: List[dict] = []
    for batch in config.get("batches", []):
        for subj in batch.get("subjects", []):
            is_lab = bool(subj.get("isLab"))
            sub_batch_index = subj.get("subBatchIndex")
            if not is_lab:
                sub_batch_index = None
            block_size = (subj.get("labBlockSize") or config.get("labBlockSize") or 2) if is_lab else 1
            remaining = subj["periodsPerWeek"]
            session_index = 0
            while remaining > 0:
                size = min(block_size, remaining) if is_lab else 1
                units.append({
                    "id": _uid("u"),
                    "batchId": batch["id"],
                    "batchName": batch["name"],
                    "subjectId": subj["id"],
                    "subjectName": subj["name"],
                    "subjectAbbr": subj.get("abbr") or "",
                    "isLab": is_lab,
                    "teacherId": subj.get("teacherId"),
                    "subBatchIndex": sub_batch_index,
                    "size": size,
                    "sessionIndex": session_index,
                })
                session_index += 1
                remaining -= size
    return units


# ---------------------------------------------------------------------------
# The solver itself
# ---------------------------------------------------------------------------

def attempt_schedule(config: dict, seed: int) -> dict:
    rng = random.Random(seed)
    break_after_set = set(b["afterPeriod"] for b in config.get("breaks", []))
    days = config["days"]
    no_free_periods = bool(config.get("noFreePeriods"))
    labs_after_lunch = bool(config.get("labsAfterLunch"))
    last_break = max(break_after_set) if break_after_set else 0
    teachers_by_id = {t["id"]: t for t in config["teachers"]}
    batches_by_id = {b["id"]: b for b in config["batches"]}

    batch_whole: Dict[str, Dict[str, Dict[int, dict]]] = {
        b["id"]: {d: {} for d in days} for b in config["batches"]
    }
    batch_subs: Dict[str, Dict[str, Dict[int, Dict[int, dict]]]] = {
        b["id"]: {d: {} for d in days} for b in config["batches"]
    }
    teacher_slot: Dict[str, Dict[str, Dict[int, dict]]] = {
        t["id"]: {d: {} for d in days} for t in config["teachers"]
    }
    teacher_weekly_count = {t["id"]: 0 for t in config["teachers"]}
    subject_day_used: Dict[str, bool] = {}

    unavailable_set = {
        t["id"]: set(f'{u["day"]}-{u["period"]}' for u in (t.get("unavailable") or []))
        for t in config["teachers"]
    }

    def sb_keys(batch_id: str) -> list:
        k = batches_by_id[batch_id].get("subBatches") or 0
        return list(range(k)) if k >= 2 else [None]

    def occupied_set(batch_id: str, day: str, sb) -> set:
        occ = set()
        for p in range(1, get_periods_for_day(config, day) + 1):
            if batch_whole[batch_id][day].get(p):
                occ.add(p)
            elif sb is not None and sb in (batch_subs[batch_id][day].get(p) or {}):
                occ.add(p)
        return occ

    def count_gaps(occ: set) -> int:
        # Empty periods from the start of the day up to the last session (a late
        # start counts too). Empty periods after the last session do not.
        return 0 if not occ else (max(occ) - len(occ))

    units = build_units(config)

    def unit_avail(u: dict) -> float:
        teacher = teachers_by_id.get(u.get("teacherId"))
        return teacher_availability_score(teacher, config) if teacher else 0

    keyed = [(u, unit_avail(u), rng.random()) for u in units]
    keyed.sort(key=lambda x: (-int(x[0]["isLab"]), x[1], x[2]))
    units = [u for u, _, _ in keyed]

    unplaced: List[dict] = []
    back_to_back_count = 0

    def day_order() -> List[str]:
        d = list(days)
        rng.shuffle(d)
        return d

    for unit in units:
        teacher = teachers_by_id.get(unit.get("teacherId"))
        if teacher is None:
            unplaced.append({**unit, "reason": "No teacher assigned"})
            continue

        sb_index = unit.get("subBatchIndex")
        batch_id = unit["batchId"]

        candidates = []
        for day in day_order():
            periods_this_day = get_periods_for_day(config, day)
            for start in range(1, periods_this_day - unit["size"] + 2):
                if unit["isLab"] and not contiguous_ok(start, unit["size"], break_after_set):
                    continue
                if unit["isLab"] and labs_after_lunch:
                    if start <= last_break:
                        continue
                    if (start - (last_break + 1)) % unit["size"] != 0:
                        continue  # keep lab blocks aligned to fixed slots

                free = True
                for p in range(start, start + unit["size"]):
                    if batch_whole[batch_id][day].get(p):
                        free = False
                        break
                    if sb_index is None:
                        if batch_subs[batch_id][day].get(p):
                            free = False
                            break
                    else:
                        subs_here = batch_subs[batch_id][day].get(p) or {}
                        if sb_index in subs_here:
                            free = False
                            break
                    if teacher_slot[teacher["id"]][day].get(p):
                        free = False
                        break
                    if f"{day}-{p}" in unavailable_set[teacher["id"]]:
                        free = False
                        break
                if not free:
                    continue
                if teacher_weekly_count[teacher["id"]] + unit["size"] > (teacher.get("maxWeeklyHours") or float("inf")):
                    continue

                penalty = 0.0
                before = teacher_slot[teacher["id"]][day].get(start - 1)
                after = teacher_slot[teacher["id"]][day].get(start + unit["size"])
                if before:
                    penalty += 3
                if after:
                    penalty += 3

                dedup_key = f'{unit["subjectId"]}-{day}' + (f'-{sb_index}' if sb_index is not None else '')
                if subject_day_used.get(dedup_key):
                    penalty += 2

                if sb_index is not None and batch_subs[batch_id][day].get(start):
                    penalty -= 1.5  # bonus for clustering with other sub-batches' labs

                if no_free_periods:
                    affected = [sb_index] if sb_index is not None else sb_keys(batch_id)
                    new_cells = set(range(start, start + unit["size"]))
                    delta = 0
                    for sb in affected:
                        occ = occupied_set(batch_id, day, sb)
                        delta += count_gaps(occ | new_cells) - count_gaps(occ)
                    penalty += 4 * delta

                penalty += rng.random()
                candidates.append((day, start, penalty))

        if not candidates:
            unplaced.append({**unit, "reason": "No free slot without breaking a hard constraint"})
            continue

        candidates.sort(key=lambda c: c[2])
        chosen_day, chosen_start, chosen_penalty = candidates[0]
        if chosen_penalty >= 3:
            back_to_back_count += 1

        for p in range(chosen_start, chosen_start + unit["size"]):
            part = p - chosen_start + 1
            if sb_index is None:
                batch_whole[batch_id][chosen_day][p] = {**unit, "part": part}
            else:
                batch_subs[batch_id][chosen_day].setdefault(p, {})[sb_index] = {**unit, "part": part}
            teacher_slot[teacher["id"]][chosen_day][p] = {**unit, "part": part}

        teacher_weekly_count[teacher["id"]] += unit["size"]
        dedup_key = f'{unit["subjectId"]}-{chosen_day}' + (f'-{sb_index}' if sb_index is not None else '')
        subject_day_used[dedup_key] = True

    batch_slot: Dict[str, Dict[str, Dict[int, dict]]] = {}
    free_period_count = 0
    for batch in config["batches"]:
        bid = batch["id"]
        batch_slot[bid] = {}
        for day in days:
            batch_slot[bid][day] = {}
            periods_this_day = get_periods_for_day(config, day)
            for p in range(1, periods_this_day + 1):
                whole = batch_whole[bid][day].get(p)
                if whole:
                    batch_slot[bid][day][p] = whole
                    continue
                subs = batch_subs[bid][day].get(p)
                if subs:
                    assignments = [
                        {
                            "subBatchIndex": sb_idx,
                            "subjectId": u["subjectId"],
                            "subjectName": u["subjectName"],
                            "subjectAbbr": u.get("subjectAbbr") or "",
                            "teacherId": u["teacherId"],
                        }
                        for sb_idx, u in sorted(subs.items())
                    ]
                    batch_slot[bid][day][p] = {
                        "isRotation": True,
                        "isLab": True,
                        "batchId": bid,
                        "batchName": batch["name"],
                        "assignments": assignments,
                    }
                    continue

    for batch in config["batches"]:
        for day in days:
            for sb in sb_keys(batch["id"]):
                free_period_count += count_gaps(occupied_set(batch["id"], day, sb))

    over_cap = [
        t for t in config["teachers"]
        if teacher_weekly_count[t["id"]] > (t.get("maxWeeklyHours") or float("inf"))
    ]
    under_cap = [
        t for t in config["teachers"]
        if (t.get("maxWeeklyHours") or 0) > 0 and teacher_weekly_count[t["id"]] < t["maxWeeklyHours"] * 0.6
    ]

    return {
        "batchSlot": batch_slot,
        "teacherSlot": teacher_slot,
        "teacherWeeklyCount": teacher_weekly_count,
        "unplaced": unplaced,
        "backToBackCount": back_to_back_count,
        "freePeriodCount": free_period_count,
        "overCap": over_cap,
        "underCap": under_cap,
        "seed": seed,
    }


def generate_timetable(config: dict, attempts: int = 40) -> dict:
    if not config.get("batches") or not config.get("teachers"):
        return {"error": "Add at least one batch (with subjects) and one teacher before generating."}
    best: Optional[dict] = None
    for i in range(attempts):
        result = attempt_schedule(config, i * 7919 + 13)
        no_free_weight = 50 if config.get("noFreePeriods") else 0
        score = (
            len(result["unplaced"]) * 1000
            + result["freePeriodCount"] * no_free_weight
            + result["backToBackCount"]
        )
        if best is None or score < best["score"]:
            best = {**result, "score": score}
        if score == 0:
            break
    return best


# ---------------------------------------------------------------------------
# Substitute finder
# ---------------------------------------------------------------------------

def find_substitutes(config: dict, schedule: dict, teacher_id: str, day: str, period: Any) -> dict:
    if not schedule:
        return {"lecture": None, "candidates": []}

    def slot_at(tid: str, d: str, p: Any):
        day_map = schedule.get("teacherSlot", {}).get(tid, {}).get(d, {}) or {}
        if p in day_map:
            return day_map[p]
        if str(p) in day_map:
            return day_map[str(p)]
        try:
            ip = int(p)
        except (TypeError, ValueError):
            return None
        if ip in day_map:
            return day_map[ip]
        return day_map.get(str(ip))

    lecture = slot_at(teacher_id, day, period)
    if not lecture:
        return {"lecture": None, "candidates": []}

    candidates = [
        t for t in config["teachers"]
        if t["id"] != teacher_id
        and any(s["name"].lower() == lecture["subjectName"].lower() for s in (t.get("subjects") or []))
        and not slot_at(t["id"], day, period)
    ]

    scored = []
    for t in candidates:
        before = slot_at(t["id"], day, int(period) - 1)
        after = slot_at(t["id"], day, int(period) + 1)
        load = schedule.get("teacherWeeklyCount", {}).get(t["id"], 0)
        cap = t.get("maxWeeklyHours") or 1
        disruption = (1 if before else 0) + (1 if after else 0)
        load_ratio = load / cap
        score = disruption * 10 + load_ratio * 5
        scored.append({
            "teacher": t,
            "disruption": disruption,
            "loadRatio": load_ratio,
            "score": score,
            "wouldBeBackToBack": disruption > 0,
        })

    scored.sort(key=lambda x: x["score"])
    return {"lecture": lecture, "candidates": scored}
