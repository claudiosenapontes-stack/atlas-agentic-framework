#!/usr/bin/env python3
"""PROJECTIONS V2: force NO variance across all projects.

Per Claudio (2026-02-11): assume all projects do NOT need variance.

Actions:
- On main board (18399430614): set "VARIANCE NEEDED?" to "No" (best-effort)
- On subitems board (18399430647): for any subitem whose name starts with "5- VARIANCE":
    - set PLANNED DURATION (WD) to 0
    - clear PROJECTED START / PROJECTED TIMELINE
    - clear ACTUAL START / ACTUAL TIMELINE

Note: Clearing date/timeline columns can be finicky; we attempt clear values and fall back to just duration=0.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List, Optional

import requests

API_URL = "https://api.monday.com/v2"

MONDAY_TOKEN_PATHS = [
    "/root/.clawdbot/credentials/monday.token",
    "/root/.openclaw/credentials/monday.token",
]

MAIN_BOARD_ID = "18399430614"
SUBITEMS_BOARD_ID = "18399430647"

COL_VARIANCE_NEEDED = "color_mm0e96k4"  # status

VARIANCE_PREFIX = "5- VARIANCE"

SUB_COL_PLANNED_DURATION = "numeric_mm0ezp5f"
SUB_COL_PROJECTED_START = "date0"
SUB_COL_PROJECTED_TIMELINE = "timerange_mm0e6s0k"
SUB_COL_ACTUAL_START = "date_mm0ex00"
SUB_COL_ACTUAL_TIMELINE = "timerange_mm0e4dmn"


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


def iter_items(token: str, limit: int = 200):
    cursor = None
    q = f"""
    query ($bid:[ID!], $limit:Int!, $cursor:String) {{
      boards(ids:$bid) {{
        items_page(limit:$limit, cursor:$cursor) {{
          cursor
          items {{
            id
            name
            column_values(ids:[\"{COL_VARIANCE_NEEDED}\"]) {{ id text value }}
            subitems {{
              id
              name
              board {{ id }}
            }}
          }}
        }}
      }}
    }}
    """
    while True:
        data = gql(token, q, {"bid": [MAIN_BOARD_ID], "limit": limit, "cursor": cursor})
        page = data["boards"][0]["items_page"]
        for it in page["items"]:
            yield it
        cursor = page.get("cursor")
        if not cursor:
            break


def iter_subitems(token: str, item_id: str):
    q = f"""
    query ($iid:[ID!]) {{
      items(ids:$iid) {{
        id
        subitems {{
          id
          name
          board {{ id }}
          column_values(ids:[\"{SUB_COL_PLANNED_DURATION}\",\"{SUB_COL_PROJECTED_START}\",\"{SUB_COL_PROJECTED_TIMELINE}\",\"{SUB_COL_ACTUAL_START}\",\"{SUB_COL_ACTUAL_TIMELINE}\"]) {{ id text value }}
        }}
      }}
    }}
    """
    data = gql(token, q, {"iid": [item_id]})
    return data["items"][0].get("subitems") or []


def main() -> int:
    token = load_token()
    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"

    n_items = 0
    n_main_updates = 0
    n_sub_updates = 0

    for it in iter_items(token):
        n_items += 1
        iid = it["id"]
        name = it["name"]

        # Set main variance flag to No (best-effort)
        try:
            change_column_value(token, MAIN_BOARD_ID, iid, COL_VARIANCE_NEEDED, {"label": "No"})
            n_main_updates += 1
        except Exception as e:
            if progress:
                print(f"WARN: could not set VARIANCE NEEDED?=No for {name} ({iid}): {e}", file=sys.stderr)

        # Update variance subitems
        subs = iter_subitems(token, iid)
        for s in subs:
            if (s.get("board") or {}).get("id") != SUBITEMS_BOARD_ID:
                continue
            sname = (s.get("name") or "").strip()
            if not sname.upper().startswith(VARIANCE_PREFIX.upper()):
                continue
            sid = s["id"]
            vals = {
                SUB_COL_PLANNED_DURATION: "0",
                # Attempt clears:
                SUB_COL_PROJECTED_START: None,
                SUB_COL_PROJECTED_TIMELINE: None,
                SUB_COL_ACTUAL_START: None,
                SUB_COL_ACTUAL_TIMELINE: None,
            }
            try:
                change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, vals)
                n_sub_updates += 1
            except Exception:
                # Fallback to just duration=0
                try:
                    change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, {SUB_COL_PLANNED_DURATION: "0"})
                    n_sub_updates += 1
                except Exception as e:
                    if progress:
                        print(f"WARN: could not zero variance subitem for {name} subitem {sid}: {e}", file=sys.stderr)

        if progress and n_items % 10 == 0:
            print(f"Processed {n_items} items...", file=sys.stderr)

    if progress:
        print(f"Done. Items={n_items} main_updates={n_main_updates} variance_sub_updates={n_sub_updates}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
