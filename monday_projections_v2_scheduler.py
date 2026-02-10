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
COL_FINISH_CONSTRUCTION_DATE = "date_mm0ed0np"  # PROJECTED FINISH CONSTRUCTION
COL_PHASE_STATUS = "color_mm0e21ex"  # PHASE STATUS (AUTO)
COL_CONSTRUCTION_TYPE = "color_mm0ebzwz"  # CONSTRUCTION TYPE
COL_PROJECTED_TIMELINE_MAIN = "timerange_mm0e7x4g"  # PROJECTED TIMELINE
COL_ACTUAL_TIMELINE_MAIN = "timerange_mm0egs6a"  # ACTUAL TIMELINE
SUB_COL_PLANNED_DURATION = "numeric_mm0ezp5f"
SUB_COL_PROJECTED_START = "date0"
SUB_COL_PROJECTED_TIMELINE = "timerange_mm0e6s0k"
SUB_COL_ACTUAL_START = "date_mm0ex00"
SUB_COL_ACTUAL_TIMELINE = "timerange_mm0e4dmn"

TEMPLATE_ITEM_NAME = "TEMPLATE (DO NOT EDIT)"

# Fallback phase template (used if the monday "TEMPLATE" item is missing/archived).
DEFAULT_TEMPLATE_SUBS: List[Tuple[str, Optional[int]]] = [
    ("1- SURVEYS", 5),
    ("2- ARCHITECTURAL", 30),
    ("3- MEP", 30),
    ("4- STRUCTURAL", 30),
    ("5- VARIANCE (IF NEEDED)", 90),
    ("6- PERMITS", 45),
    ("7- CONSTRUCTION", 260),
    ("8- END CONSTRUCTION (MILESTONE)", 0),
    ("9- SALE (MILESTONE)", 0),
]
FREEZE_PHASE_NAME = "7- CONSTRUCTION"

# Construction type -> construction phase planned duration (workdays).
# Claudio: keep 12mo standard, but adjust if CONSTRUCTION TYPE changes.
CONSTRUCTION_TYPE_TO_WD: Dict[str, int] = {
    "Standard (12mo)": 260,
    "Luxury (14mo)": 303,
    "Multi-unit (18mo)": 390,
}

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
    """Parse monday date column value.

    Monday often returns date column "value" as a JSON string like:
      {"date":"YYYY-MM-DD","changed_at":"..."}
    but may also return a dict.
    """
    if not value:
        return None

    if isinstance(value, str):
        # Try ISO first (sometimes we already have a plain date string)
        try:
            return dt.date.fromisoformat(value)
        except ValueError:
            pass
        # Then try JSON string
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
    """Parse monday timeline value.

    Expects either None, a JSON string, or a dict like {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}.
    """
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


def get_items_with_subitems(token: str, limit: int = 200) -> List[dict]:
    """Fetch main-board items + their relevant columns and subitems."""
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
            column_values(ids: ["%s", "%s", "%s", "%s", "%s", "%s"]) { id text value }
            subitems {
              id
              name
              board { id }
              column_values(ids: ["%s", "%s", "%s", "%s", "%s"]) { id text value }
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
        COL_PROJECTED_TIMELINE_MAIN,
        COL_ACTUAL_TIMELINE_MAIN,
        SUB_COL_PLANNED_DURATION,
        SUB_COL_PROJECTED_START,
        SUB_COL_PROJECTED_TIMELINE,
        SUB_COL_ACTUAL_START,
        SUB_COL_ACTUAL_TIMELINE,
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


def change_multiple_column_values(token: str, board_id: str, item_id: str, values: dict) -> None:
    q = """
    mutation ($bid: ID!, $iid: ID!, $vals: JSON!) {
      change_multiple_column_values(board_id: $bid, item_id: $iid, column_values: $vals) {
        id
      }
    }
    """
    gql(token, q, {"bid": board_id, "iid": item_id, "vals": json.dumps(values)})


def create_subitem(token: str, parent_item_id: str, name: str, planned_duration: Optional[int]) -> str:
    q = """
    mutation ($pid: ID!, $name: String!, $vals: JSON) {
      create_subitem(parent_item_id: $pid, item_name: $name, column_values: $vals) { id }
    }
    """

    colvals: Dict[str, Any] = {}
    if planned_duration is not None:
        # Numbers column: sending as string is accepted by monday (and matches what the API returns).
        colvals[SUB_COL_PLANNED_DURATION] = str(int(planned_duration))

    data = gql(token, q, {"pid": parent_item_id, "name": name, "vals": json.dumps(colvals) if colvals else None})
    return data["create_subitem"]["id"]


def find_template_item_id(token: str) -> Optional[str]:
    # Find by exact name match (best effort). If not found, return None.
    items = get_items_with_subitems(token)
    for it in items:
        if (it.get("name") or "").strip() == TEMPLATE_ITEM_NAME:
            return it["id"]
    return None


def get_template_subitems(token: str, template_item_id: str) -> List[Tuple[str, Optional[int]]]:
    q = """
    query ($id:[ID!]) {
      items(ids:$id) {
        id
        name
        subitems {
          id
          name
          board { id }
          column_values(ids:["%s"]) { id text value }
        }
      }
    }
    """ % (SUB_COL_PLANNED_DURATION,)

    data = gql(token, q, {"id": [template_item_id]})
    subs = data["items"][0].get("subitems") or []
    subs = [s for s in subs if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]

    out: List[Tuple[str, Optional[int]]] = []
    for s in subs:
        name = (s.get("name") or "").strip()
        scols = {cv["id"]: cv for cv in (s.get("column_values") or [])}
        dur_txt = (scols.get(SUB_COL_PLANNED_DURATION, {}).get("text") or "").strip()
        dur: Optional[int]
        try:
            dur = int(float(dur_txt)) if dur_txt else None
        except ValueError:
            dur = None
        if name:
            out.append((name, dur))
    return out


def ensure_subitems_exist(token: str, parent_item: dict, template_subs: List[Tuple[str, Optional[int]]]) -> bool:
    """If parent_item has no relevant subitems, create them from the template.

    Returns True if we created any.
    """

    if not template_subs:
        return False

    name = (parent_item.get("name") or "").strip()
    if name.upper().startswith("TEMPLATE"):
        return False

    subitems = parent_item.get("subitems") or []
    subitems = [s for s in subitems if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]
    if subitems:
        return False

    for sub_name, dur in template_subs:
        try:
            create_subitem(token, parent_item["id"], sub_name, dur)
        except Exception as e:
            print(f"WARN: could not create subitem '{sub_name}' under {name} ({parent_item['id']}): {e}", file=sys.stderr)

    return True


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

    template_subs: List[Tuple[str, Optional[int]]] = []
    try:
        template_id = find_template_item_id(token)
        if template_id:
            template_subs = get_template_subitems(token, template_id)
    except Exception as e:
        print(f"WARN: could not load template subitems (non-fatal): {e}", file=sys.stderr)

    if not template_subs:
        template_subs = DEFAULT_TEMPLATE_SUBS

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

    # Ensure PHASE STATUS label set includes all phase names we use (so setting {"label": ...} works).
    # We use the template phase list as source-of-truth.
    if template_subs:
        ensure_status_labels_match_subitems(token, [n for n, _ in template_subs])

    for it in items:
        item_id = it["id"]
        item_name = it["name"]
        colvals = {cv["id"]: cv for cv in it.get("column_values") or []}
        unfold_date = parse_date(colvals.get(COL_UNFOLD_DATE, {}).get("value"))
        phase_status = (colvals.get(COL_PHASE_STATUS, {}).get("text") or "").strip()
        construction_type = (colvals.get(COL_CONSTRUCTION_TYPE, {}).get("text") or "").strip()

        # 1) Always ensure subitems exist (so creating a new pulse auto-populates phases).
        if template_subs:
            created = ensure_subitems_exist(token, it, template_subs)
            if created:
                # Subitems were just created; let the next cron run pick them up for schedule generation.
                continue

        # 2) Only generate dates/schedule once UNFOLD DATE is set.
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

            # Subitem guideline: CONSTRUCTION duration is dictated by the parent item's CONSTRUCTION TYPE.
            desired_construction_wd = CONSTRUCTION_TYPE_TO_WD.get(construction_type)
            if sname == FREEZE_PHASE_NAME and desired_construction_wd is not None:
                # Keep projections frozen once we hit Construction, but keep PLANNED DURATION aligned.
                if dur != desired_construction_wd:
                    try:
                        change_multiple_column_values(
                            token,
                            SUBITEMS_BOARD_ID,
                            sid,
                            {SUB_COL_PLANNED_DURATION: str(int(desired_construction_wd))},
                        )
                    except Exception as e:
                        print(
                            f"WARN: could not update CONSTRUCTION planned duration for {item_name} ({item_id}): {e}",
                            file=sys.stderr,
                        )

                # Only use the desired duration in projection math if we're not frozen.
                if not frozen:
                    dur = desired_construction_wd

            start = cur_start
            end = add_days(start, dur)
            projected_ranges.append((sname, start, end))

            if not frozen:
                vals = {
                    SUB_COL_PROJECTED_START: {"date": date_to_iso(start)},
                    SUB_COL_PROJECTED_TIMELINE: {"from": date_to_iso(start), "to": date_to_iso(end)},
                }

                # Set ACTUAL dates to match PROJECTED initially, but never overwrite PM edits.
                actual_start_val = scols.get(SUB_COL_ACTUAL_START, {}).get("value")
                actual_tl_val = scols.get(SUB_COL_ACTUAL_TIMELINE, {}).get("value")
                if not actual_start_val:
                    vals[SUB_COL_ACTUAL_START] = {"date": date_to_iso(start)}
                if not actual_tl_val:
                    vals[SUB_COL_ACTUAL_TIMELINE] = {"from": date_to_iso(start), "to": date_to_iso(end)}

                change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, vals)

            # Always mirror ACTUAL timeline up to the parent once populated on the subitem.
            tl = parse_timeline(scols.get(SUB_COL_ACTUAL_TIMELINE, {}).get("value"))
            if tl:
                actual_ranges.append(tl)

            cur_start = end

        # Mirror timelines to parent pulse (these are empty until we set them from subitems).
        parent_updates: Dict[str, Any] = {}
        if projected_ranges:
            parent_updates[COL_PROJECTED_TIMELINE_MAIN] = {
                "from": date_to_iso(projected_ranges[0][1]),
                "to": date_to_iso(projected_ranges[-1][2]),
            }
        if actual_ranges:
            parent_updates[COL_ACTUAL_TIMELINE_MAIN] = {
                "from": date_to_iso(min(a for a, _ in actual_ranges)),
                "to": date_to_iso(max(b for _, b in actual_ranges)),
            }

        # PROJECTED FINISH CONSTRUCTION (main board): set from the projected end date of
        # "8- END CONSTRUCTION (MILESTONE)" as soon as we have projections.
        end_construction_projected: Optional[dt.date] = None

        # Prefer reading the subitem's PROJECTED TIMELINE (works even if projections are frozen).
        preferred_prefixes = [
            "8- END CONSTRUCTION",  # best
            "7- CONSTRUCTION",      # fallback if milestone missing
        ]
        for prefix in preferred_prefixes:
            for s in subitems:
                if (s.get("name") or "").strip().startswith(prefix):
                    scols = {cv["id"]: cv for cv in (s.get("column_values") or [])}
                    tl = parse_timeline(scols.get(SUB_COL_PROJECTED_TIMELINE, {}).get("value"))
                    if tl:
                        end_construction_projected = tl[1]
                    break
            if end_construction_projected:
                break

        # Fallback: use the freshly computed projected_ranges list.
        if not end_construction_projected:
            for prefix in preferred_prefixes:
                for name, _start, end in projected_ranges:
                    if (name or "").strip().startswith(prefix):
                        end_construction_projected = end
                        break
                if end_construction_projected:
                    break

        # Final fallback: last projected phase end.
        if not end_construction_projected and projected_ranges:
            end_construction_projected = projected_ranges[-1][2]

        if end_construction_projected:
            parent_updates[COL_FINISH_CONSTRUCTION_DATE] = {"date": date_to_iso(end_construction_projected)}

        if parent_updates:
            try:
                change_multiple_column_values(token, MAIN_BOARD_ID, item_id, parent_updates)
            except Exception as e:
                print(f"WARN: could not mirror parent timelines for {item_name} ({item_id}): {e}", file=sys.stderr)

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
