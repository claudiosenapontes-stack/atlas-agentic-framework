#!/usr/bin/env python3
"""PROJECTIONS V2: variance rules by year.

Per Claudio (2026-02-11):
- Keep Year One variance exactly as it was (only D2 + D6 had variance = Yes).
- Assume NO variance for Year 2 and Year 3.

Actions:
1) For YR2 + YR3 items:
   - set main column VARIANCE NEEDED? = No
   - set variance subitem "5- VARIANCE" planned duration = 0
   - clear its projected/actual fields (best-effort)

2) For Year One items:
   - project_id in {D2, D6} => set VARIANCE NEEDED? = Yes and ensure variance duration=90
   - all other Year One => leave as-is (we do NOT force anything)

3) After restoring D2/D6 variance, re-project those items' subitems from their current UNFOLD DATE.
   (We only touch D2/D6 schedules to reintroduce variance time.)

Board IDs:
- Main: 18399430614
- Subitems: 18399430647
"""

from __future__ import annotations

import datetime as dt
import json
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import requests

API_URL = "https://api.monday.com/v2"

MONDAY_TOKEN_PATHS = [
    "/root/.clawdbot/credentials/monday.token",
    "/root/.openclaw/credentials/monday.token",
]

BOARD_ID = "18399430614"
SUBITEMS_BOARD_ID = "18399430647"

# Groups
GROUP_Y1 = "ACTIVE PROJECTS YEAR ONE"
GROUP_Y2 = "YR2"
GROUP_Y3 = "YR3"

# Main columns
COL_PROJECT_ID = "dropdown_mm0f8mwn"  # PROJECT ID
COL_UNFOLD_DATE = "date_mm0e9cvp"
COL_VARIANCE_NEEDED = "color_mm0e96k4"  # status

# Sub columns
SUB_COL_PLANNED_DURATION = "numeric_mm0ezp5f"
SUB_COL_PROJECTED_START = "date0"
SUB_COL_PROJECTED_TIMELINE = "timerange_mm0e6s0k"
SUB_COL_ACTUAL_START = "date_mm0ex00"
SUB_COL_ACTUAL_TIMELINE = "timerange_mm0e4dmn"

VARIANCE_PREFIX = "5- VARIANCE"
DEFAULT_VARIANCE_DURATION = 90

# Construction type logic not needed here; we just re-run projection based on existing durations.


def load_token() -> str:
    for p in MONDAY_TOKEN_PATHS:
        if os.path.exists(p):
            return open(p, "r", encoding="utf-8").read().strip()
    raise FileNotFoundError("monday token not found")


def gql(token: str, query: str, variables: Optional[dict] = None) -> dict:
    last = None
    for attempt in range(1, 8):
        try:
            r = requests.post(
                API_URL,
                json={"query": query, "variables": variables or {}},
                headers={"Authorization": token},
                timeout=90,
            )
            if r.status_code in {429, 500, 502, 503, 504}:
                raise requests.HTTPError(f"HTTP {r.status_code}", response=r)
            r.raise_for_status()
            data = r.json()
            if "errors" in data:
                raise RuntimeError(json.dumps(data["errors"], indent=2))
            return data["data"]
        except Exception as e:
            last = e
            time.sleep(min(1.2 * (2 ** (attempt - 1)), 20))
    raise last  # type: ignore


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


def add_days(d: dt.date, days: int) -> dt.date:
    return d + dt.timedelta(days=days)


def date_to_iso(d: dt.date) -> str:
    return d.isoformat()


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


def iter_items_with_subitems(token: str, limit: int = 50):
    cursor = None
    q = f"""
    query ($bid:[ID!], $limit:Int!, $cursor:String) {{
      boards(ids:$bid) {{
        items_page(limit:$limit, cursor:$cursor) {{
          cursor
          items {{
            id
            name
            group {{ title }}
            column_values(ids:[\"{COL_PROJECT_ID}\",\"{COL_UNFOLD_DATE}\",\"{COL_VARIANCE_NEEDED}\"]) {{ id text value }}
            subitems {{
              id
              name
              board {{ id }}
              column_values(ids:[\"{SUB_COL_PLANNED_DURATION}\",\"{SUB_COL_PROJECTED_START}\",\"{SUB_COL_PROJECTED_TIMELINE}\",\"{SUB_COL_ACTUAL_START}\",\"{SUB_COL_ACTUAL_TIMELINE}\"]) {{ id text value }}
            }}
          }}
        }}
      }}
    }}
    """

    while True:
        data = gql(token, q, {"bid": [BOARD_ID], "limit": limit, "cursor": cursor})
        page = data["boards"][0]["items_page"]
        for it in page["items"]:
            yield it
        cursor = page.get("cursor")
        if not cursor:
            break


def project_from_unfold(token: str, item: dict, unfold: dt.date) -> None:
    """Recompute projected (and actual) subitem timelines from UNFOLD DATE.

    This is the same simple rule: each phase starts when previous ends.
    It respects existing planned durations on each subitem.
    Variance subitem consumes time iff planned duration > 0.
    """

    subitems = [s for s in (item.get("subitems") or []) if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]
    cur = unfold
    for s in subitems:
        sname = (s.get("name") or "").strip()
        scols = {cv.get("id"): cv for cv in (s.get("column_values") or [])}

        dur_txt = (scols.get(SUB_COL_PLANNED_DURATION, {}).get("text") or "").strip()
        try:
            dur = int(float(dur_txt)) if dur_txt else 0
        except ValueError:
            dur = 0

        # If this is variance and duration is 0, keep it neutral and skip consuming time.
        if sname.upper().startswith(VARIANCE_PREFIX.upper()) and dur <= 0:
            continue

        start = cur
        end = add_days(start, dur)

        vals = {
            SUB_COL_PROJECTED_START: {"date": date_to_iso(start)},
            SUB_COL_PROJECTED_TIMELINE: {"from": date_to_iso(start), "to": date_to_iso(end)},
            SUB_COL_ACTUAL_START: {"date": date_to_iso(start)},
            SUB_COL_ACTUAL_TIMELINE: {"from": date_to_iso(start), "to": date_to_iso(end)},
        }
        change_multiple_column_values(token, SUBITEMS_BOARD_ID, s["id"], vals)
        cur = end


def main() -> int:
    token = load_token()
    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"

    # Year One variance exceptions to restore (kept as it was previously):
    # Historically these were labeled D2 and D6; on the current board they correspond to these items.
    y1_restore_name_prefixes = {
        "2011 SE 7TH ST",   # old: D2
        "2080 NORTHEAST 1ST STREET",  # old: D6
    }

    updated_y2y3 = 0
    restored_y1 = 0

    for it in iter_items_with_subitems(token):
        gtitle = ((it.get("group") or {}).get("title") or "").strip()
        colvals = {cv.get("id"): cv for cv in (it.get("column_values") or [])}
        proj_id = (colvals.get(COL_PROJECT_ID, {}).get("text") or "").strip()
        unfold = parse_date((colvals.get(COL_UNFOLD_DATE) or {}).get("value"))

        subs = [s for s in (it.get("subitems") or []) if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]

        # Year 2/3: force NO variance
        if gtitle.upper() in {GROUP_Y2, GROUP_Y3}:
            try:
                change_column_value(token, BOARD_ID, it["id"], COL_VARIANCE_NEEDED, {"label": "No"})
            except Exception:
                pass

            for s in subs:
                if not (s.get("name") or "").strip().upper().startswith(VARIANCE_PREFIX.upper()):
                    continue
                sid = s["id"]
                vals = {
                    SUB_COL_PLANNED_DURATION: "0",
                    SUB_COL_PROJECTED_START: None,
                    SUB_COL_PROJECTED_TIMELINE: None,
                    SUB_COL_ACTUAL_START: None,
                    SUB_COL_ACTUAL_TIMELINE: None,
                }
                try:
                    change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, vals)
                except Exception:
                    change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, {SUB_COL_PLANNED_DURATION: "0"})

            updated_y2y3 += 1
            continue

        # Year one: restore D2/D6 variance yes and duration=90
        if gtitle.upper() == GROUP_Y1 and any(it["name"].strip().upper().startswith(p) for p in y1_restore_name_prefixes):
            try:
                change_column_value(token, BOARD_ID, it["id"], COL_VARIANCE_NEEDED, {"label": "Yes"})
            except Exception:
                pass

            # Ensure variance duration 90
            for s in subs:
                if not (s.get("name") or "").strip().upper().startswith(VARIANCE_PREFIX.upper()):
                    continue
                change_multiple_column_values(token, SUBITEMS_BOARD_ID, s["id"], {SUB_COL_PLANNED_DURATION: str(DEFAULT_VARIANCE_DURATION)})

            # Re-project this item's schedule to reintroduce variance time
            if unfold:
                project_from_unfold(token, it, unfold)

            restored_y1 += 1

    if progress:
        print(f"Done. Forced no-variance on Y2/Y3 items: {updated_y2y3}. Restored variance for Y1 items (D2/D6): {restored_y1}.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
