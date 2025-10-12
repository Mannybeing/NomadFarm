# monthly_availability_dwd.py
# Requires: pip install google-api-python-client google-auth google-auth-httplib2 python-dateutil pytz

import json, calendar
from datetime import datetime, date, time, timedelta
from dateutil import parser as dtparser
import pytz

from googleapiclient.discovery import build
from google.oauth2 import service_account

# ---------- CONFIG ----------
SERVICE_ACCOUNT_FILE = "credentials.json"       # path to your SA key
IMPERSONATE_USER     = "m.salas@fractalhouse.co"    # exact primary email to impersonate
SCOPES = ["https://www.googleapis.com/auth/calendar"]   # match what you authorized in DWD

TZ          = "America/Santo_Domingo"  # IANA timezone for your working day
WORK_START  = "09:00"                  # daily window start (local time)
WORK_END    = "18:00"                  # daily window end   (local time)
SLOT_MIN    = 60                       # slot length (minutes)
CALENDAR_IDS = ["primary"]             # include others as needed (resource IDs, secondary calendars)
# ----------------------------

tz = pytz.timezone(TZ)

def get_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    ).with_subject(IMPERSONATE_USER)
    return build("calendar", "v3", credentials=creds)

def month_utc_window(year:int, month:int, tzname:str):
    tzinfo = pytz.timezone(tzname)
    last_day = calendar.monthrange(year, month)[1]
    start_local = tzinfo.localize(datetime(year, month, 1, 0, 0, 0))
    end_local   = tzinfo.localize(datetime(year, month, last_day, 23, 59, 59))
    return start_local.astimezone(pytz.UTC).isoformat(), end_local.astimezone(pytz.UTC).isoformat()

def merge_intervals(intervals):
    if not intervals: return []
    intervals = sorted(intervals, key=lambda x: x[0])
    merged = [intervals[0]]
    for s,e in intervals[1:]:
        ls, le = merged[-1]
        if s <= le:
            merged[-1] = (ls, max(le, e))
        else:
            merged.append((s,e))
    return merged

def generate_day_slots(busy_intervals_local, day_start_local, day_end_local, slot_minutes:int):
    """Aligned grid: step from WORK_START in slot increments and keep those that don't overlap busy."""
    # Merge only busy intervals that touch this day window
    overlaps = []
    for bs, be in busy_intervals_local:
        if bs < day_end_local and be > day_start_local:
            overlaps.append((max(bs, day_start_local), min(be, day_end_local)))
    busy = merge_intervals(overlaps)

    def overlaps_any(s, e):
        for bs, be in busy:
            if s < be and e > bs:
                return True
        return False

    slots = []
    step = timedelta(minutes=slot_minutes)
    cursor = day_start_local
    while cursor + step <= day_end_local:
        s, e = cursor, cursor + step
        if not overlaps_any(s, e):
            slots.append((s, e))
        cursor = e
    return slots

def monthly_availability_payload(service, year:int, month:int):
    # 1) FreeBusy for entire month (single call)
    time_min, time_max = month_utc_window(year, month, TZ)
    fb = service.freebusy().query(body={
        "timeMin": time_min,
        "timeMax": time_max,
        "timeZone": TZ,
        "items": [{"id": cid} for cid in CALENDAR_IDS]
    }).execute()

    # 2) Collect all busy intervals (in local tz) and merge
    busy_all = []
    for cid in CALENDAR_IDS:
        for b in fb["calendars"][cid]["busy"]:
            s = dtparser.isoparse(b["start"]).astimezone(tz)
            e = dtparser.isoparse(b["end"]).astimezone(tz)
            busy_all.append((s, e))
    busy_all = merge_intervals(busy_all)

    # 3) Build per-day slots within work window
    wh_s_h, wh_s_m = map(int, WORK_START.split(":"))
    wh_e_h, wh_e_m = map(int, WORK_END.split(":"))
    last_day = calendar.monthrange(year, month)[1]

    days_payload = []
    events = []  # FullCalendar / React Big Calendar friendly

    for d in range(1, last_day + 1):
        day = date(year, month, d)
        day_start = tz.localize(datetime.combine(day, time(wh_s_h, wh_s_m)))
        day_end   = tz.localize(datetime.combine(day, time(wh_e_h, wh_e_m)))

        slots = generate_day_slots(busy_all, day_start, day_end, SLOT_MIN)
        slot_objs = [{"start": s.isoformat(), "end": e.isoformat()} for s, e in slots]
        days_payload.append({"date": day.isoformat(), "slots": slot_objs})

        for s, e in slots:
            events.append({
                "title": "Available",
                "start": s.isoformat(),
                "end": e.isoformat(),
                "allDay": False,
                "extendedProps": {"type": "available"}
            })

    payload = {
        "timeZone": TZ,
        "slotMinutes": SLOT_MIN,
        "workWindow": {"start": WORK_START, "end": WORK_END},
        "calendarsQueried": CALENDAR_IDS,
        "month": f"{year:04d}-{month:02d}",
        "days": days_payload,
        "events": events
    }
    return payload

if __name__ == "__main__":
    svc = get_service()
    now_local = datetime.now(tz)
    data = monthly_availability_payload(svc, now_local.year, now_local.month)
    print(json.dumps(data, indent=2))
