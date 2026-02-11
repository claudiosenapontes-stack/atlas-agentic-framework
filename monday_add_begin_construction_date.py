#!/usr/bin/env python3
"""PROJECTIONS V2: add "BEGIN CONSTRUCTION" date column and populate it.

Per Claudio (2026-02-11): add a column with begin construction date for all projects.

Logic:
- Create (or reuse) a Date column titled: "BEGIN CONSTRUCTION" on board 18399430614.
- For each item:
    - Find subitem "7- CONSTRUCTION" (name startswith)
    - Prefer ACTUAL TIMELINE from-date, else PROJECTED TIMELINE from-date
    - Write that date into BEGIN CONSTRUCTION column on the parent item

Board IDs:
- Main: 18399430614 (PROJECTIONS V2)
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

COL_TITLE = "BEGIN CONSTRUCTION"

SUB_COL_PROJECTED_TIMELINE = "timerange_mm0e6s0k"
SUB_COL_ACTUAL_TIMELINE = "timerange_mm0e4dmn"

PHASE_PREFIX = "7- CONSTRUCTION"


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


def ensure_begin_construction_column(token: str) -> str:
    # See if it exists
    q_cols = """
    query ($bid:[ID!]) { boards(ids:$bid) { columns { id title type } } }
    """
    data = gql(token, q_cols, {"bid": [BOARD_ID]})
    cols = data["boards"][0]["columns"]
    for c in cols:
        if (c.get("title") or "").strip().upper() == COL_TITLE.upper():
            return c["id"]

    # Create it
    q_create = """
    mutation ($bid: ID!, $title: String!, $type: ColumnType!) {
      create_column(board_id: $bid, title: $title, column_type: $type) { id title }
    }
    """
    data = gql(token, q_create, {"bid": BOARD_ID, "title": COL_TITLE, "type": "date"})
    return data["create_column"]["id"]


def iter_items(token: str, limit: int = 200):
    cursor = None
    q = """
    query ($bid:[ID!], $limit:Int!, $cursor:String) {
      boards(ids:$bid) {
        items_page(limit:$limit, cursor:$cursor) {
          cursor
          items {
            id
            name
            subitems {
              id
              name
              board { id }
              column_values(ids:["%s","%s"]) { id text value }
            }
          }
        }
      }
    }
    """ % (SUB_COL_PROJECTED_TIMELINE, SUB_COL_ACTUAL_TIMELINE)

    while True:
        data = gql(token, q, {"bid": [BOARD_ID], "limit": limit, "cursor": cursor})
        page = data["boards"][0]["items_page"]
        for it in page["items"]:
            yield it
        cursor = page.get("cursor")
        if not cursor:
            break


def change_date(token: str, item_id: str, col_id: str, d: dt.date) -> None:
    q = """
    mutation ($bid: ID!, $iid: ID!, $cid: String!, $val: JSON!) {
      change_column_value(board_id: $bid, item_id: $iid, column_id: $cid, value: $val) { id }
    }
    """
    gql(token, q, {"bid": BOARD_ID, "iid": item_id, "cid": col_id, "val": json.dumps({"date": d.isoformat()})})


def main() -> int:
    token = load_token()
    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"

    col_id = ensure_begin_construction_column(token)
    if progress:
        print(f"BEGIN CONSTRUCTION column_id={col_id}")

    updated = 0
    missing = 0

    for it in iter_items(token):
        subs = it.get("subitems") or []
        subs = [s for s in subs if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]

        start_date: Optional[dt.date] = None
        for s in subs:
            sname = (s.get("name") or "").strip()
            if not sname.upper().startswith(PHASE_PREFIX.upper()):
                continue
            scols = {cv.get("id"): cv for cv in (s.get("column_values") or [])}
            tl = parse_timeline((scols.get(SUB_COL_ACTUAL_TIMELINE) or {}).get("value"))
            if tl:
                start_date = tl[0]
            else:
                tl = parse_timeline((scols.get(SUB_COL_PROJECTED_TIMELINE) or {}).get("value"))
                if tl:
                    start_date = tl[0]
            break

        if start_date:
            change_date(token, it["id"], col_id, start_date)
            updated += 1
            if progress:
                print(f"{it['name']} -> {start_date}")
        else:
            missing += 1
            if progress:
                print(f"WARN: no 7- CONSTRUCTION timeline for {it['name']} ({it['id']})")

    if progress:
        print(f"Done. Updated={updated}, missing={missing}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
