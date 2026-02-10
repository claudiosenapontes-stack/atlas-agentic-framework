#!/usr/bin/env python3
"""One-off cleanup for PROJECTIONS V2 variance subitems.

Goal (per Claudio): For projects that don't have variance, remove the VARIANCE impact.

Heuristic (conservative):
- Subitem name starts with "5- VARIANCE" (case-insensitive)
- PLANNED DURATION is the default template value (90)
- ACTUAL START / ACTUAL TIMELINE match PROJECTED START / PROJECTED TIMELINE
  (indicating they were auto-filled, not manually edited)

Action:
- Set PLANNED DURATION to 0
- Clear PROJECTED START / PROJECTED TIMELINE
- Clear ACTUAL START / ACTUAL TIMELINE (only because they matched projected)

This avoids shifting downstream phases.
"""

from __future__ import annotations

import json
import os
import datetime as dt
from typing import Any, Dict, Optional, Tuple, List

import requests

API_URL = "https://api.monday.com/v2"

MONDAY_TOKEN_PATHS = [
    "/root/.clawdbot/credentials/monday.token",
    "/root/.openclaw/credentials/monday.token",
]

SUBITEMS_BOARD_ID = "18399430647"  # Subitems of PROJECTIONS V2

VARIANCE_PREFIX = "5- VARIANCE"
DEFAULT_VARIANCE_DURATION = 90

SUB_COL_PLANNED_DURATION = "numeric_mm0ezp5f"
SUB_COL_PROJECTED_START = "date0"
SUB_COL_PROJECTED_TIMELINE = "timerange_mm0e6s0k"
SUB_COL_ACTUAL_START = "date_mm0ex00"
SUB_COL_ACTUAL_TIMELINE = "timerange_mm0e4dmn"


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


def change_multiple_column_values(token: str, board_id: str, item_id: str, values: dict) -> None:
    q = """
    mutation ($bid: ID!, $iid: ID!, $vals: JSON!) {
      change_multiple_column_values(board_id: $bid, item_id: $iid, column_values: $vals) { id }
    }
    """
    gql(token, q, {"bid": board_id, "iid": item_id, "vals": json.dumps(values)})


def iter_subitems(token: str, limit: int = 200):
    cursor = None
    q = """
    query ($bid:[ID!], $limit:Int!, $cursor:String) {
      boards(ids:$bid) {
        items_page(limit:$limit, cursor:$cursor) {
          cursor
          items {
            id
            name
            column_values(ids:["%s","%s","%s","%s","%s"]) { id text value }
          }
        }
      }
    }
    """ % (
        SUB_COL_PLANNED_DURATION,
        SUB_COL_PROJECTED_START,
        SUB_COL_PROJECTED_TIMELINE,
        SUB_COL_ACTUAL_START,
        SUB_COL_ACTUAL_TIMELINE,
    )

    while True:
        data = gql(token, q, {"bid": [SUBITEMS_BOARD_ID], "limit": limit, "cursor": cursor})
        page = data["boards"][0]["items_page"]
        for it in page["items"]:
            yield it
        cursor = page.get("cursor")
        if not cursor:
            break


def main() -> int:
    token = load_token()

    changed = 0
    scanned = 0

    for it in iter_subitems(token):
        scanned += 1
        name = (it.get("name") or "").strip()
        if not name.upper().startswith(VARIANCE_PREFIX):
            continue

        cols = {cv["id"]: cv for cv in (it.get("column_values") or [])}

        dur_txt = (cols.get(SUB_COL_PLANNED_DURATION, {}).get("text") or "").strip()
        try:
            dur = int(float(dur_txt)) if dur_txt else 0
        except ValueError:
            dur = 0

        if dur != DEFAULT_VARIANCE_DURATION:
            continue

        proj_start = parse_date((cols.get(SUB_COL_PROJECTED_START) or {}).get("value"))
        proj_tl = parse_timeline((cols.get(SUB_COL_PROJECTED_TIMELINE) or {}).get("value"))
        act_start = parse_date((cols.get(SUB_COL_ACTUAL_START) or {}).get("value"))
        act_tl = parse_timeline((cols.get(SUB_COL_ACTUAL_TIMELINE) or {}).get("value"))

        if not (proj_start and proj_tl and act_start and act_tl):
            continue

        if act_start != proj_start:
            continue
        if act_tl != proj_tl:
            continue

        # Looks auto-filled; safe to neutralize.
        vals = {
            SUB_COL_PLANNED_DURATION: "0",
            SUB_COL_PROJECTED_START: {"date": None},
            SUB_COL_PROJECTED_TIMELINE: {"from": None, "to": None},
            SUB_COL_ACTUAL_START: {"date": None},
            SUB_COL_ACTUAL_TIMELINE: {"from": None, "to": None},
        }

        change_multiple_column_values(token, SUBITEMS_BOARD_ID, it["id"], vals)
        changed += 1

        if changed % 25 == 0:
            print(f"changed {changed} variance subitems (scanned {scanned})")

    print(f"DONE: changed {changed} variance subitems (scanned {scanned})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
