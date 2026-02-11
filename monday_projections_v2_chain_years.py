#!/usr/bin/env python3
"""PROJECTIONS V2 (board 18399430614) — Year chaining + projections

Implements Claudio rules (2026-02-11):
- YR2 kickoff = latest END date of phase "3- MEP" across all Year One projects.
- YR2 projects unfold sequentially due to Architectural capacity:
    UNFOLD(YR2 project 1) = YR2 kickoff
    UNFOLD(YR2 project i) = END("2- ARCHITECTURAL") of previous YR2 project
- YR3 repeats the same structure:
    YR3 kickoff = latest END("3- MEP") across all YR2 projects (after YR2 projections)
    UNFOLD(YR3 project i) = END("2- ARCHITECTURAL") of previous YR3 project
- Use *current group order* (Monday group order as returned by items_page).

Projection logic (per prior scheduler):
- Subitem1 projected start = UNFOLD DATE
- Each subitem projected end = start + PLANNED DURATION days (calendar days; includes weekends)
- Next subitem projected start = previous projected end
- Mirror PROJECTED/ACTUAL timelines to parent (ACTUAL mirrors PROJECTED by default)

This script is scoped specifically to the PROJECTIONS V2 board.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

import requests

API_URL = "https://api.monday.com/v2"

MONDAY_TOKEN_PATHS = [
    "/root/.clawdbot/credentials/monday.token",
    "/root/.openclaw/credentials/monday.token",
]

# Board IDs
MAIN_BOARD_ID = "18399430614"  # PROJECTIONS V2
SUBITEMS_BOARD_ID = "18399430647"  # Subitems of PROJECTIONS V2

# Main columns
COL_UNFOLD_DATE = "date_mm0e9cvp"
COL_FINISH_CONSTRUCTION_DATE = "date_mm0ed0np"
COL_PHASE_STATUS = "color_mm0e21ex"  # status
COL_CONSTRUCTION_TYPE = "color_mm0ebzwz"  # status
COL_VARIANCE_NEEDED = "color_mm0e96k4"  # status
COL_PROJECTED_TIMELINE_MAIN = "timerange_mm0e7x4g"
COL_ACTUAL_TIMELINE_MAIN = "timerange_mm0egs6a"

# Subitem columns
SUB_COL_PLANNED_DURATION = "numeric_mm0ezp5f"
SUB_COL_PROJECTED_START = "date0"
SUB_COL_PROJECTED_TIMELINE = "timerange_mm0e6s0k"
SUB_COL_ACTUAL_START = "date_mm0ex00"
SUB_COL_ACTUAL_TIMELINE = "timerange_mm0e4dmn"

VARIANCE_PREFIX = "5- VARIANCE"
DEFAULT_VARIANCE_DURATION = 90

CONSTRUCTION_PREFIX = "7- CONSTRUCTION"
CONSTRUCTION_TYPE_TO_DAYS: Dict[str, int] = {
    "Standard (12mo)": 365,
    "medium(14mo)": 426,
    "large (18mo)": 548,
}


def load_token() -> str:
    for p in MONDAY_TOKEN_PATHS:
        if os.path.exists(p):
            return open(p, "r", encoding="utf-8").read().strip()
    raise FileNotFoundError("monday token not found")


def gql(token: str, query: str, variables: Optional[dict] = None) -> dict:
    r = requests.post(
        API_URL,
        json={"query": query, "variables": variables or {}},
        headers={"Authorization": token},
        timeout=90,
    )
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise RuntimeError(json.dumps(data["errors"], indent=2))
    return data["data"]


def parse_date(value: Any) -> Optional[dt.date]:
    if not value:
        return None
    if isinstance(value, str):
        try:
            return dt.date.fromisoformat(value)
        except ValueError:
            pass
        try:
            value = json.loads(value)
        except Exception:
            return None
    if isinstance(value, dict) and value.get("date"):
        try:
            return dt.date.fromisoformat(value["date"])
        except ValueError:
            return None
    return None


def parse_timeline(value: Any) -> Optional[Tuple[dt.date, dt.date]]:
    if not value:
        return None
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            return None
    if isinstance(value, dict) and value.get("from") and value.get("to"):
        try:
            return (dt.date.fromisoformat(value["from"]), dt.date.fromisoformat(value["to"]))
        except ValueError:
            return None
    return None


def date_to_iso(d: dt.date) -> str:
    return d.isoformat()


def add_days(d: dt.date, days: int) -> dt.date:
    return d + dt.timedelta(days=days)


def change_column_value(token: str, board_id: str, item_id: str, column_id: str, value: dict) -> None:
    q = """
    mutation ($bid: ID!, $iid: ID!, $cid: String!, $val: JSON!) {
      change_column_value(board_id: $bid, item_id: $iid, column_id: $cid, value: $val) { id }
    }
    """
    gql(token, q, {"bid": board_id, "iid": item_id, "cid": column_id, "val": json.dumps(value)})


def change_multiple_column_values(token: str, board_id: str, item_id: str, values: dict) -> None:
    q = """
    mutation ($bid: ID!, $iid: ID!, $vals: JSON!) {
      change_multiple_column_values(board_id: $bid, item_id: $iid, column_values: $vals) { id }
    }
    """
    gql(token, q, {"bid": board_id, "iid": item_id, "vals": json.dumps(values)})


def get_items_with_subitems(token: str, limit: int = 200) -> List[dict]:
    items: List[dict] = []
    cursor = None
    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"

    q = """
    query ($bid: [ID!], $limit: Int!, $cursor: String) {
      boards(ids: $bid) {
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            group { id title }
            column_values(ids: ["%s","%s","%s","%s","%s","%s","%s"]) { id text value }
            subitems {
              id
              name
              board { id }
              column_values(ids: ["%s","%s","%s","%s","%s"]) { id text value }
            }
          }
        }
      }
    }
    """ % (
        COL_UNFOLD_DATE,
        COL_FINISH_CONSTRUCTION_DATE,
        COL_PHASE_STATUS,
        COL_CONSTRUCTION_TYPE,
        COL_VARIANCE_NEEDED,
        COL_PROJECTED_TIMELINE_MAIN,
        COL_ACTUAL_TIMELINE_MAIN,
        SUB_COL_PLANNED_DURATION,
        SUB_COL_PROJECTED_START,
        SUB_COL_PROJECTED_TIMELINE,
        SUB_COL_ACTUAL_START,
        SUB_COL_ACTUAL_TIMELINE,
    )

    page_no = 0
    while True:
        data = gql(token, q, {"bid": [MAIN_BOARD_ID], "limit": limit, "cursor": cursor})
        page = data["boards"][0]["items_page"]
        page_no += 1
        items.extend(page["items"])
        if progress:
            print(f"Fetched page {page_no}: +{len(page['items'])} items (total {len(items)})", file=sys.stderr)
        cursor = page.get("cursor")
        if not cursor:
            break

    return items


def norm(s: str) -> str:
    return (s or "").strip().upper()


def is_group(title: str, want: str) -> bool:
    return norm(title) == norm(want)


def find_phase_end(subitems: List[dict], phase_prefix: str) -> Optional[dt.date]:
    """Return end date of phase (prefers ACTUAL timeline end, else PROJECTED timeline end)."""
    phase_prefix_u = norm(phase_prefix)
    ends: List[dt.date] = []
    for s in subitems or []:
        name = (s.get("name") or "").strip()
        if not norm(name).startswith(phase_prefix_u):
            continue
        scols = {cv.get("id"): cv for cv in (s.get("column_values") or [])}
        tl = parse_timeline((scols.get(SUB_COL_ACTUAL_TIMELINE) or {}).get("value"))
        if tl:
            ends.append(tl[1])
            continue
        tl = parse_timeline((scols.get(SUB_COL_PROJECTED_TIMELINE) or {}).get("value"))
        if tl:
            ends.append(tl[1])
    return max(ends) if ends else None


def project_item(token: str, item: dict, *, unfold_date: dt.date) -> Tuple[Optional[dt.date], Optional[dt.date]]:
    """Project subitems for item from unfold_date.

    Returns (architectural_end, mep_end) using projected ranges.
    """

    colvals = {cv["id"]: cv for cv in (item.get("column_values") or [])}
    construction_type = (colvals.get(COL_CONSTRUCTION_TYPE, {}).get("text") or "").strip()
    variance_needed = (colvals.get(COL_VARIANCE_NEEDED, {}).get("text") or "").strip().lower() in {"yes", "y", "true"}

    subitems = [s for s in (item.get("subitems") or []) if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]
    if not subitems:
        return (None, None)

    sync_actuals = os.environ.get("PROJECTIONS_SYNC_ACTUALS", "1") != "0"

    projected_ranges: List[Tuple[str, dt.date, dt.date]] = []
    actual_ranges: List[Tuple[dt.date, dt.date]] = []

    cur_start = unfold_date
    for s in subitems:
        sid = s["id"]
        sname = (s.get("name") or "").strip()
        scols = {cv["id"]: cv for cv in (s.get("column_values") or [])}

        dur_txt = (scols.get(SUB_COL_PLANNED_DURATION, {}).get("text") or "").strip()
        try:
            dur = int(float(dur_txt)) if dur_txt else 0
        except ValueError:
            dur = 0

        # Construction type adjustment
        if norm(sname).startswith(norm(CONSTRUCTION_PREFIX)):
            desired = CONSTRUCTION_TYPE_TO_DAYS.get(construction_type)
            if desired is not None and dur != desired:
                try:
                    change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, {SUB_COL_PLANNED_DURATION: str(int(desired))})
                except Exception as e:
                    print(f"WARN: could not update construction duration for {item['name']} subitem {sid}: {e}", file=sys.stderr)
                dur = desired

        # Variance handling
        if norm(sname).startswith(norm(VARIANCE_PREFIX)):
            if variance_needed:
                if dur <= 0:
                    dur = DEFAULT_VARIANCE_DURATION
                    try:
                        change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, {SUB_COL_PLANNED_DURATION: str(int(dur))})
                    except Exception as e:
                        print(f"WARN: could not set variance duration for {item['name']} subitem {sid}: {e}", file=sys.stderr)
            else:
                # No variance: neutralize it without shifting downstream.
                if dur != 0:
                    try:
                        change_multiple_column_values(
                            token,
                            SUBITEMS_BOARD_ID,
                            sid,
                            {
                                SUB_COL_PLANNED_DURATION: "0",
                                SUB_COL_PROJECTED_START: None,
                                SUB_COL_PROJECTED_TIMELINE: None,
                                SUB_COL_ACTUAL_START: None if sync_actuals else None,
                                SUB_COL_ACTUAL_TIMELINE: None if sync_actuals else None,
                            },
                        )
                    except Exception:
                        # If API rejects Nones, we just set duration 0 and continue.
                        try:
                            change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, {SUB_COL_PLANNED_DURATION: "0"})
                        except Exception:
                            pass
                # Skip consuming time
                continue

        start = cur_start
        end = add_days(start, dur)
        projected_ranges.append((sname, start, end))

        vals = {
            SUB_COL_PROJECTED_START: {"date": date_to_iso(start)},
            SUB_COL_PROJECTED_TIMELINE: {"from": date_to_iso(start), "to": date_to_iso(end)},
        }
        if sync_actuals:
            vals[SUB_COL_ACTUAL_START] = {"date": date_to_iso(start)}
            vals[SUB_COL_ACTUAL_TIMELINE] = {"from": date_to_iso(start), "to": date_to_iso(end)}

        change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, vals)

        if sync_actuals:
            actual_ranges.append((start, end))

        cur_start = end

    # Mirror timelines to parent
    parent_updates: Dict[str, Any] = {}
    if projected_ranges:
        parent_updates[COL_PROJECTED_TIMELINE_MAIN] = {"from": date_to_iso(projected_ranges[0][1]), "to": date_to_iso(projected_ranges[-1][2])}
    if actual_ranges:
        parent_updates[COL_ACTUAL_TIMELINE_MAIN] = {"from": date_to_iso(min(a for a, _ in actual_ranges)), "to": date_to_iso(max(b for _, b in actual_ranges))}

    # Projected finish construction = end of 8- END CONSTRUCTION milestone if present, else last phase end
    finish: Optional[dt.date] = None
    for nm, _st, en in projected_ranges:
        if norm(nm).startswith("8- END CONSTRUCTION"):
            finish = en
            break
    if not finish and projected_ranges:
        finish = projected_ranges[-1][2]
    if finish:
        parent_updates[COL_FINISH_CONSTRUCTION_DATE] = {"date": date_to_iso(finish)}

    if parent_updates:
        change_multiple_column_values(token, MAIN_BOARD_ID, item["id"], parent_updates)

    # Extract ends for chaining
    arch_end = None
    mep_end = None
    for nm, _st, en in projected_ranges:
        if norm(nm).startswith("2- ARCHITECTURAL"):
            arch_end = en
        if norm(nm).startswith("3- MEP"):
            mep_end = en

    # Fallback (if phases missing) to stored timelines
    if not arch_end:
        arch_end = find_phase_end(subitems, "2- ARCHITECTURAL")
    if not mep_end:
        mep_end = find_phase_end(subitems, "3- MEP")

    return (arch_end, mep_end)


def main() -> int:
    token = load_token()
    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"

    items = get_items_with_subitems(token)

    def gtitle(it: dict) -> str:
        return ((it.get("group") or {}).get("title") or "").strip()

    y1 = [it for it in items if is_group(gtitle(it), "ACTIVE PROJECTS YEAR ONE")]
    y2 = [it for it in items if is_group(gtitle(it), "YR2")]
    y3 = [it for it in items if is_group(gtitle(it), "YR3")]

    # 1) Y2 kickoff: latest Y1 MEP end
    y2_kickoff: Optional[dt.date] = None
    y1_mep_ends: List[dt.date] = []
    for it in y1:
        subs = [s for s in (it.get("subitems") or []) if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]
        mep_end = find_phase_end(subs, "3- MEP")
        if mep_end:
            y1_mep_ends.append(mep_end)
    if y1_mep_ends:
        y2_kickoff = max(y1_mep_ends)

    if not y2_kickoff:
        raise RuntimeError("Could not compute YR2 kickoff: no '3- MEP' timeline end found in Year One projects")

    if progress:
        print(f"Y2 kickoff = {y2_kickoff}", file=sys.stderr)

    # 2) Process YR2 sequentially
    next_unfold = y2_kickoff
    y2_mep_ends: List[dt.date] = []

    for i, it in enumerate(y2, start=1):
        if progress:
            print(f"YR2 #{i}: set UNFOLD={next_unfold} -> {it['name']} ({it['id']})", file=sys.stderr)
        change_column_value(token, MAIN_BOARD_ID, it["id"], COL_UNFOLD_DATE, {"date": date_to_iso(next_unfold)})
        arch_end, mep_end = project_item(token, it, unfold_date=next_unfold)
        if mep_end:
            y2_mep_ends.append(mep_end)
        if not arch_end:
            raise RuntimeError(f"YR2 chaining failed: could not get Architectural end for {it['name']}")
        next_unfold = arch_end

    # 3) Y3 kickoff: latest Y2 MEP end
    if not y2_mep_ends:
        raise RuntimeError("Could not compute YR3 kickoff: no YR2 MEP end dates found")
    y3_kickoff = max(y2_mep_ends)

    if progress:
        print(f"Y3 kickoff = {y3_kickoff}", file=sys.stderr)

    # 4) Process YR3 sequentially
    next_unfold = y3_kickoff
    for i, it in enumerate(y3, start=1):
        if progress:
            print(f"YR3 #{i}: set UNFOLD={next_unfold} -> {it['name']} ({it['id']})", file=sys.stderr)
        change_column_value(token, MAIN_BOARD_ID, it["id"], COL_UNFOLD_DATE, {"date": date_to_iso(next_unfold)})
        arch_end, _mep_end = project_item(token, it, unfold_date=next_unfold)
        if not arch_end:
            raise RuntimeError(f"YR3 chaining failed: could not get Architectural end for {it['name']}")
        next_unfold = arch_end

    print(
        f"Y2 kickoff {y2_kickoff} | YR2 scheduled {len(y2)} items, {len(y2)*len((y2[0].get('subitems') or [])) if y2 else 0} subitem writes (approx) | Y3 kickoff {y3_kickoff} | YR3 scheduled {len(y3)} items",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
