#!/usr/bin/env python3
"""PROJECTIONS V2: set Year 2 and Year 3 projects as "Planning Phases".

Per Claudio (2026-02-11): "please set year 2 and 3 as Planning Phases".

Implementation:
- On board 18399430614, create/get a tag named "Planning Phases".
- For every item in group title "YR2" or "YR3":
    set the Tags column "PROECT YEAR" (tag_mm0eqq4z) to contain ONLY that tag.

This leaves YR1 items unchanged.
"""

from __future__ import annotations

import json
import os
import sys
from typing import List, Optional

import requests

API_URL = "https://api.monday.com/v2"

MONDAY_TOKEN_PATHS = [
    "/root/.clawdbot/credentials/monday.token",
    "/root/.openclaw/credentials/monday.token",
]

BOARD_ID = "18399430614"
COL_PROJECT_YEAR_TAGS = "tag_mm0eqq4z"  # PROECT YEAR (tags)


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


def create_or_get_tag(token: str, name: str) -> str:
    q = """
    mutation ($bid: ID!, $name: String!) {
      create_or_get_tag(board_id: $bid, tag_name: $name) { id name }
    }
    """
    data = gql(token, q, {"bid": BOARD_ID, "name": name})
    return data["create_or_get_tag"]["id"]


def iter_items(token: str, limit: int = 200):
    cursor = None
    q = f"""
    query ($bid: [ID!], $limit: Int!, $cursor: String) {{
      boards(ids: $bid) {{
        items_page(limit: $limit, cursor: $cursor) {{
          cursor
          items {{
            id
            name
            group {{ id title }}
            column_values(ids:[\"{COL_PROJECT_YEAR_TAGS}\"]) {{ id text value }}
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


def change_column_value(token: str, item_id: str, column_id: str, value: dict) -> None:
    q = """
    mutation ($bid: ID!, $iid: ID!, $cid: String!, $val: JSON!) {
      change_column_value(board_id: $bid, item_id: $iid, column_id: $cid, value: $val) { id }
    }
    """
    gql(token, q, {"bid": BOARD_ID, "iid": item_id, "cid": column_id, "val": json.dumps(value)})


def main() -> int:
    token = load_token()
    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"

    tag_id = create_or_get_tag(token, "Planning Phases")
    if progress:
        print(f"Planning Phases tag_id={tag_id}", file=sys.stderr)

    updated = 0
    for it in iter_items(token):
        gtitle = ((it.get("group") or {}).get("title") or "").strip().upper()
        if gtitle not in {"YR2", "YR3"}:
            continue

        change_column_value(token, it["id"], COL_PROJECT_YEAR_TAGS, {"tag_ids": [int(tag_id)]})
        updated += 1
        if progress:
            print(f"Updated {gtitle}: {it['name']} ({it['id']})", file=sys.stderr)

    if progress:
        print(f"Done. Updated {updated} items in YR2/YR3.", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
