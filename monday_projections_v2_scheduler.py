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
- PROJECTED FINISH CONSTRUCTION is derived from the full subitem timeline from UNFOLD DATE,
  including VARIANCE when VARIANCE NEEDED? is Yes.
- CONSTRUCTION TYPE does not affect projections.

Phase status logic:
- Ensure PHASE STATUS labels match the current subitem names on each item (best-effort).
- PHASE STATUS advances ONLY from actuals: it stays at the current value until someone fills
  ACTUAL START DATE / ACTUAL TIMELINE in subitems.

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
import re
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
COL_CONSTRUCTION_TYPE = "color_mm0ebzwz"  # CONSTRUCTION TYPE (no longer used for projections)
COL_VARIANCE_NEEDED = "color_mm0e96k4"  # VARIANCE NEEDED?
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

# Variance is optional. If its planned duration is 0/blank, it should not affect the schedule.
VARIANCE_PREFIX = "5- VARIANCE"
DEFAULT_VARIANCE_DURATION = 90

# Construction type -> construction phase planned duration.
# NOTE: Despite the column label showing "(WD)", Claudio's rule is that the CONSTRUCTION TYPE
# stipulates a month-based duration. Our projection math uses calendar days, so we map months to
# approximate calendar days (365/426/548) to avoid undercounting (e.g., 14mo ≠ 303 days).
CONSTRUCTION_TYPE_TO_WD: Dict[str, int] = {
    "Standard (12mo)": 365,
    "Luxury (14mo)": 426,
    "Multi-unit (18mo)": 548,
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
    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"
    page_no = 0
    q = """
    query ($bid: [ID!], $limit: Int!, $cursor: String) {
      boards(ids: $bid) {
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values(ids: ["%s", "%s", "%s", "%s", "%s", "%s", "%s"]) { id text value }
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
        COL_VARIANCE_NEEDED,
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
        page_no += 1
        items.extend(page["items"])
        if progress:
            print(f"Fetched page {page_no}: +{len(page['items'])} items (total {len(items)})", file=sys.stderr)
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


def archive_item(token: str, item_id: str) -> None:
    """Archive an item/subitem in monday (reversible vs hard delete)."""
    q = """
    mutation ($iid: ID!) {
      archive_item(item_id: $iid) { id }
    }
    """
    gql(token, q, {"iid": item_id})


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
    """Ensure the standard template subitems exist under a parent item.

    Older items may have only a partial set of subitems (e.g., just 1-4).
    We *add missing* template subitems but never delete or rename existing ones.

    Returns True if we created any.
    """

    if not template_subs:
        return False

    name = (parent_item.get("name") or "").strip()
    if name.upper().startswith("TEMPLATE"):
        return False

    subitems = parent_item.get("subitems") or []
    subitems = [s for s in subitems if (s.get("board") or {}).get("id") == SUBITEMS_BOARD_ID]

    existing_names = {(s.get("name") or "").strip() for s in subitems if (s.get("name") or "").strip()}

    created_any = False
    for sub_name, dur in template_subs:
        if sub_name in existing_names:
            continue
        try:
            create_subitem(token, parent_item["id"], sub_name, dur)
            created_any = True
        except Exception as e:
            print(f"WARN: could not create subitem '{sub_name}' under {name} ({parent_item['id']}): {e}", file=sys.stderr)

    return created_any


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


def pick_current_phase_from_actuals(today: dt.date, subitems: List[dict]) -> Optional[str]:
    """Pick current phase from actuals (ignoring future-dated actuals).

    Claudio's rule: phase should stay in "projected" until someone fills actuals in.

    We consider a subitem "started" if it has either:
    - ACTUAL START DATE <= today, or
    - ACTUAL TIMELINE with from <= today

    We return the highest-numbered phase among started phases.
    If nothing has actuals, returns None.
    """

    def is_placeholder(n: str) -> bool:
        n = (n or "").strip().upper()
        return n.startswith("0-") or "PLACEHOLDER" in n

    def phase_num(n: str) -> int:
        m = re.match(r"^(\d+)\s*-", (n or "").strip())
        return int(m.group(1)) if m else -1

    started: List[str] = []
    for s in subitems or []:
        name = (s.get("name") or "").strip()
        if not name or is_placeholder(name):
            continue

        cols = {cv.get("id"): cv for cv in (s.get("column_values") or [])}
        actual_start = parse_date((cols.get(SUB_COL_ACTUAL_START) or {}).get("value"))
        actual_tl = parse_timeline((cols.get(SUB_COL_ACTUAL_TIMELINE) or {}).get("value"))

        started_flag = False
        if actual_start and actual_start <= today:
            started_flag = True
        if actual_tl and actual_tl[0] <= today:
            started_flag = True

        if started_flag:
            started.append(name)

    if not started:
        return None

    started.sort(key=phase_num)
    return started[-1]


def main() -> int:
    token = load_token()
    today = dt.date.today()

    progress = os.environ.get("PROJECTIONS_PROGRESS") == "1"

    items = get_items_with_subitems(token)
    if progress:
        print(f"Total items fetched: {len(items)}", file=sys.stderr)

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

    for idx, it in enumerate(items, start=1):
        item_id = it["id"]
        item_name = it["name"]
        if progress and (idx == 1 or idx % 20 == 0):
            print(f"Processing item {idx}/{len(items)}: {item_name} ({item_id})", file=sys.stderr)
        colvals = {cv["id"]: cv for cv in it.get("column_values") or []}
        unfold_date = parse_date(colvals.get(COL_UNFOLD_DATE, {}).get("value"))
        phase_status = (colvals.get(COL_PHASE_STATUS, {}).get("text") or "").strip()
        construction_type = (colvals.get(COL_CONSTRUCTION_TYPE, {}).get("text") or "").strip()
        variance_needed = (colvals.get(COL_VARIANCE_NEEDED, {}).get("text") or "").strip()

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
        # Claudio rule: projections are always recalculated from UNFOLD DATE based on subitems.
        projected_frozen = False
        # Claudio rule: until PMs start entering actuals, keep ACTUAL in sync with PROJECTED.
        # If you ever want to stop syncing, set PROJECTIONS_SYNC_ACTUALS=0.
        sync_actuals = os.environ.get("PROJECTIONS_SYNC_ACTUALS", "1") != "0"
        projected_only = not sync_actuals

        # Recompute projections unless frozen (or forced)
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

            # CONSTRUCTION TYPE does not affect projections.

            # Variance handling:
            # - If VARIANCE NEEDED? = Yes: ensure VARIANCE consumes time (default to 90 if blank/0).
            # - If VARIANCE NEEDED? != Yes: force variance duration to 0 and clear its projected fields.
            is_variance = (sname or "").strip().upper().startswith(VARIANCE_PREFIX)
            if is_variance:
                var_yes = variance_needed.strip().lower() in {"yes", "y", "true"}
                if var_yes:
                    if dur <= 0:
                        dur = DEFAULT_VARIANCE_DURATION
                        try:
                            change_multiple_column_values(
                                token,
                                SUBITEMS_BOARD_ID,
                                sid,
                                {SUB_COL_PLANNED_DURATION: str(int(DEFAULT_VARIANCE_DURATION))},
                            )
                        except Exception as e:
                            print(
                                f"WARN: could not set variance duration for {item_name} ({item_id}) subitem {sid}: {e}",
                                file=sys.stderr,
                            )
                else:
                    # No variance needed: remove the variance subitem entirely (archive is safest).
                    try:
                        archive_item(token, sid)
                    except Exception as e:
                        print(
                            f"WARN: could not archive variance subitem for {item_name} ({item_id}) subitem {sid}: {e}",
                            file=sys.stderr,
                        )
                    continue

            start = cur_start
            end = add_days(start, dur)
            projected_ranges.append((sname, start, end))

            if not projected_frozen:
                vals = {
                    SUB_COL_PROJECTED_START: {"date": date_to_iso(start)},
                    SUB_COL_PROJECTED_TIMELINE: {"from": date_to_iso(start), "to": date_to_iso(end)},
                }

                # Keep ACTUAL dates in sync with PROJECTED (until manual tracking begins).
                if sync_actuals:
                    vals[SUB_COL_ACTUAL_START] = {"date": date_to_iso(start)}
                    vals[SUB_COL_ACTUAL_TIMELINE] = {"from": date_to_iso(start), "to": date_to_iso(end)}

                change_multiple_column_values(token, SUBITEMS_BOARD_ID, sid, vals)

            # Mirror ACTUAL timeline up to the parent.
            # Note: scols is stale after mutations, so when syncing actuals, use the just-computed range.
            if sync_actuals:
                actual_ranges.append((start, end))
            else:
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

        preferred_prefixes = [
            "8- END CONSTRUCTION",  # best
            "7- CONSTRUCTION",      # fallback if milestone missing
        ]

        # If we regenerated projections this run, prefer the freshly computed projected_ranges.
        # (The `subitems` list we fetched at the start is stale after mutations.)
        if not projected_frozen:
            for prefix in preferred_prefixes:
                for name, _start, end in projected_ranges:
                    if (name or "").strip().startswith(prefix):
                        end_construction_projected = end
                        break
                if end_construction_projected:
                    break

        # Otherwise (frozen), read from stored subitem PROJECTED TIMELINE.
        if not end_construction_projected:
            for prefix in preferred_prefixes:
                ends: List[dt.date] = []
                for s in subitems:
                    if (s.get("name") or "").strip().startswith(prefix):
                        scols = {cv["id"]: cv for cv in (s.get("column_values") or [])}
                        tl = parse_timeline(scols.get(SUB_COL_PROJECTED_TIMELINE, {}).get("value"))
                        if tl:
                            ends.append(tl[1])
                if ends:
                    end_construction_projected = min(ends)
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

        # PHASE STATUS only advances when someone fills ACTUALs in subitems.
        current_phase = pick_current_phase_from_actuals(today, subitems)
        if current_phase and current_phase != phase_status:
            # status column value expects {"label":"..."}
            try:
                change_column_value(token, MAIN_BOARD_ID, item_id, COL_PHASE_STATUS, {"label": current_phase})
            except Exception as e:
                print(f"WARN: could not set PHASE STATUS for {item_name} ({item_id}) -> {current_phase}: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
