#!/usr/bin/env python3
"""PROJECTIONS V2 scheduler

Rules (per Claudio):
- Main board: PROJECTIONS V2 (board_id=18399430614)
  - UNFOLD DATE: date_mm0e9cvp (date)
  - PHASE STATUS: color_mm0eg5xv (status)
- Subitems live on "Subitems of PROJECTIONS V2" (board_id=18399430647)
  - PLANNED DURATION (WD): numeric_mm0ezp5f (numbers)
  - PROJECTED START DATE: date0 (date)
  - PROJECTED TIMELINE: timerange_mm0e6s0k (timeline)

Projection logic:
- Subitem1 projected start = UNFOLD DATE
- Each subitem projected end = start + PLANNED DURATION days (calendar days; includes weekends)
- Next subitem projected start = previous projected end

Phase status logic:
- Ensure PHASE STATUS labels match the current subitem names on each item (best-effort).
- Auto-advance PHASE STATUS based on today's date relative to projected timeline.

Freeze logic:
- Once the item reaches the "Construction" phase (or any phase after it in that item’s subitem order),
  stop regenerating projected dates/timelines (but still allow PHASE STATUS auto-advance).

NOTE: Monday timeline end date semantics can be inclusive in the UI; Claudio’s rule explicitly says
end = start + duration, so we implement that literally.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import sys
from typing import Any, Dict, List, Optional, Tuple

import requests

MONDAY_TOKEN_PATHS = [
    "/root/.clawdbot/credentials/monday.token",
    "/root/.openclaw/credentials/monday.token",
]

MAIN_BOARD_ID = "18399430614"
SUBITEMS_BOARD_ID = "18399430647"

COL_UNFOLD_DATE = "date_mm0e9cvp"
COL_PHASE_STATUS = "color_mm0eg5xv"

SUB_COL_PLANNED_DURATION = "numeric_mm0ezp5f"
SUB_COL_PROJECTED_START = "date0"
SUB_COL_PROJECTED_TIMELINE = "timerange_mm0e6s0k"

FREEZE_PHASE_NAME = "Construction"

API_URL = "https://api.monday.com/v2"


def load_token() -> str:
    for p in MONDAY_TOKEN_PATHS:
        if os.path.exists(p):
            return open(p, "r", encoding="utf-8").read().strip()
    raise FileNotFoundError("monday token not found in expected paths")


def gql(token: str, query: str, variables: Optional[dict] = None) -> dict:
    r = requests.post(
        API_URL,
        json={"query": query, "variables": variables or {}},
        headers={"Authorization": token},
        timeout=60,
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
            return None
    if isinstance(value, dict) and value.get("date"):
        try:
            return dt.date.fromisoformat(value["date"])
        except ValueError:
            return None
    return None


def date_to_iso(d: dt.date) -> str:
    return d.isoformat()


def add_days(d: dt.date, days: int) -> dt.date:
    return d + dt.timedelta(days=days)


def get_items_with_subitems(token: str, limit: int = 200) -> List[dict]:
    # items_page is the modern way; we page until done.
    items: List[dict] = []
    cursor = None
    q = """
    query ($bid: [ID!], $limit: Int!, $cursor: String) {
      boards(ids: $bid) {
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values(ids: ["%s", "%s"]) { id text value }
            subitems {
              id
              name
              board { id }
              column_values(ids: ["%s", "%s", "%s"]) { id text value }
            }
          }
        }
      }
    }
    """ % (
        COL_UNFOLD_DATE,
        COL_PHASE_STATUS,
        SUB_COL_PLANNED_DURATION,
        SUB_COL_PROJECTED_START,
        SUB_COL_PROJECTED_TIMELINE,
    )

    while True:
        data = gql(token, q, {"bid": [MAIN_BOARD_ID], "limit": limit, "cursor": cursor})
        page = data["boards"][0]["items_page"]
        items.extend(page["items"])
        cursor = page.get("cursor")
        if not cursor:
            break
    return items


def change_column_value(token: str, board_id: str, item_id: str, column_id: str, value: dict) -> None:
    q = """
    mutation ($bid: ID!, $iid: ID!, $cid: String!, $val: JSON!) {
      change_column_value(board_id: $bid, item_id: $iid, column_id: $cid, value: $val) {
        id
      }
    }
    """
    gql(token, q, {"bid": board_id, "iid": item_id, "cid": column_id, "val": json.dumps(value)})


def ensure_status_labels_match_subitems(token: str, subitem_names_in_order: List[str]) -> None:
    """Best-effort: update PHASE STATUS labels to exactly the subitem names.

    This is global to the board column (not per-item), so we compute a superset across items.
    We only *add/rename* if needed; no deletions.

    If the mutation isn't supported/allowed, we fail softly.
    """

    # Fetch existing labels
    q_get = """
    query ($bid:[ID!]) {
      boards(ids:$bid) { columns(ids:["%s"]) { id title type settings_str } }
    }
    """ % (COL_PHASE_STATUS,)
    data = gql(token, q_get, {"bid": [MAIN_BOARD_ID]})
    col = data["boards"][0]["columns"][0]
    settings = json.loads(col.get("settings_str") or "{}")
    labels = settings.get("labels", {})  # {"0":"Done",...}

    existing = set(labels.values())
    desired = [n for n in subitem_names_in_order if n and n not in existing]
    if not desired:
        return

    # Add new labels at the end with new numeric keys
    used_keys = [int(k) for k in labels.keys() if str(k).isdigit()]
    next_key = (max(used_keys) + 1) if used_keys else 0
    for name in desired:
        labels[str(next_key)] = name
        next_key += 1

    settings["labels"] = labels

    q_set = """
    mutation ($bid: ID!, $cid: String!, $settings: JSON!) {
      change_column_settings(board_id: $bid, column_id: $cid, settings_str: $settings) {
        id
      }
    }
    """

    try:
        gql(token, q_set, {"bid": MAIN_BOARD_ID, "cid": COL_PHASE_STATUS, "settings": json.dumps(settings)})
    except Exception as e:
        print(f"WARN: could not update PHASE STATUS labels (non-fatal): {e}", file=sys.stderr)


def compute_freeze(subitem_names: List[str], phase_status: str) -> bool:
    """Freeze if current phase is Construction OR any phase after it in the subitem order."""
    try:
        construction_idx = subitem_names.index(FREEZE_PHASE_NAME)
    except ValueError:
        return False
    if not phase_status:
        return False
    try:
        cur_idx = subitem_names.index(phase_status)
    except ValueError:
        return False
    return cur_idx >= construction_idx


def pick_current_phase(today: dt.date, projected_ranges: List[Tuple[str, dt.date, dt.date]]) -> Optional[str]:
    # projected_ranges entries are (name, start, end)
    for name, start, end in projected_ranges:
        if today < start:
            return name
        if start <= today <= end:
            return name
    return projected_ranges[-1][0] if projected_ranges else None


def main() -> int:
    token = load_token()
    today = dt.date.today()

    items = get_items_with_subitems(token)

    # Build a global superset of subitem names in first-seen order to populate PHASE STATUS labels.
    global_phase_names: List[str] = []
    seen = set()

    for it in items:
        subs = it.get("subitems") or []
        for s in subs:
            n = (s.get("name") or "").strip()
            if n and n not in seen:
                global_phase_names.append(n)
                seen.add(n)

    # NOTE: monday's public API doesn't reliably support editing Status column labels on an existing column.
    # We'll still attempt to *set* PHASE STATUS to subitem names; if a label is missing, we warn and move on.
    # if global_phase_names:
    #     ensure_status_labels_match_subitems(token, global_phase_names)

    for it in items:
        item_id = it["id"]
        item_name = it["name"]
        colvals = {cv["id"]: cv for cv in it.get("column_values") or []}
        unfold_date = parse_date(colvals.get(COL_UNFOLD_DATE, {}).get("value"))
        phase_status = (colvals.get(COL_PHASE_STATUS, {}).get("text") or "").strip()

        if not unfold_date:
            continue

        subitems = it.get("subitems") or []
        # Ensure we're only handling subitems on the expected subitems board.
        subitems = [s for s in subitems if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]
        if not subitems:
            continue

        sub_names = [(s.get("name") or "").strip() for s in subitems]
        frozen = compute_freeze(sub_names, phase_status)

        # Recompute projections unless frozen
        projected_ranges: List[Tuple[str, dt.date, dt.date]] = []
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

            start = cur_start
            end = add_days(start, dur)
            projected_ranges.append((sname, start, end))

            if not frozen:
                change_column_value(token, SUBITEMS_BOARD_ID, sid, SUB_COL_PROJECTED_START, {"date": date_to_iso(start)})
                change_column_value(token, SUBITEMS_BOARD_ID, sid, SUB_COL_PROJECTED_TIMELINE, {"from": date_to_iso(start), "to": date_to_iso(end)})

            cur_start = end

        # Auto-advance PHASE STATUS based on today's date + computed projections
        current_phase = pick_current_phase(today, projected_ranges)
        if current_phase and current_phase != phase_status:
            # status column value expects {"label":"..."}
            try:
                change_column_value(token, MAIN_BOARD_ID, item_id, COL_PHASE_STATUS, {"label": current_phase})
            except Exception as e:
                print(f"WARN: could not set PHASE STATUS for {item_name} ({item_id}) -> {current_phase}: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
