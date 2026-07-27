#!/usr/bin/env python3
"""Populate a Brigade member directory from a member JSON file.

Usage:  python3 scripts/seed-directory.py scripts/directory-members.json

Goes through the app's own public endpoints — signup, then edit-your-own-profile
— so it needs no database credentials and can target any deployment by changing
BASE. Idempotent: an email that already exists is skipped (409 from signup).

Accounts are created under demo.joinbrigade.co so they are identifiable and
removable. Note that Cloudflare answers python-urllib's default User-Agent with
403 "error code: 1010", hence the UA below.
"""
import json
import secrets
import sys
import urllib.request
import urllib.error

BASE = "https://www.joinbrigade.co"
UA = "curl/8.7.1"
DOMAIN = "demo.joinbrigade.co"
SKIP = {"Debug Administrator", "Onboard Tester", "Port Tester"}

members = json.load(open(sys.argv[1]))


def post(path, payload, cookie=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA},
        method="POST",
    )
    if cookie:
        req.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}"), r.headers.get_all("Set-Cookie") or []
    except urllib.error.HTTPError as e:
        raw = e.read() or b""
        try:
            return e.code, json.loads(raw or b"{}"), []
        except ValueError:
            return e.code, {"raw": raw[:200].decode("utf-8", "replace")}, []
    except Exception as e:  # transient network/timeouts
        return 0, {"raw": repr(e)}, []


def put(path, payload, cookie):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Cookie": cookie, "User-Agent": UA},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read() or b""
        try:
            return e.code, json.loads(raw or b"{}")
        except ValueError:
            return e.code, {"raw": raw[:200].decode("utf-8", "replace")}
    except Exception as e:
        return 0, {"raw": repr(e)}


created = skipped = failed = 0
for m in members:
    name = f"{m['first_name']} {m['last_name']}"
    if name in SKIP:
        continue
    email = f"{m['first_name']}.{m['last_name']}".lower().replace(" ", "") + "@" + DOMAIN
    status, data, cookies = post(
        "/api/auth/signup",
        {
            "email": email,
            "password": secrets.token_urlsafe(24) + "Aa1!",
            "firstName": m["first_name"],
            "lastName": m["last_name"],
        },
    )
    if status == 409:
        print(f"skip   {name} (exists)")
        skipped += 1
        continue
    if status != 201:
        print(f"FAIL   {name}: {status} {data}")
        failed += 1
        continue

    cookie = "; ".join(c.split(";")[0] for c in cookies)
    patch = {
        "headline": m["headline"],
        "about": m["about"],
        "role": m["role"],
        "city": m["city"],
        "state": m["state"],
        "country": m["country"],
        "currentPosition": m["current_position"],
        "currentEmployer": m["current_employer"],
        "expertiseAreas": m["expertise_areas"],
        "yearsExperience": m["years_experience"],
        "openToOpportunities": m["open_to_opportunities"],
        "availablePrivateEvents": m["available_private_events"],
        "availableContractWork": m["available_contract_work"],
        "availableEmergencyStaffing": m["available_emergency_staffing"],
        "visibleInDirectory": True,
        "onboardingStep": 5,
        "onboardingCompleted": True,
    }
    pstatus, pdata = put(f"/api/users/{data['userId']}", patch, cookie)
    if pstatus != 200:
        print(f"FAIL   {name} profile: {pstatus} {pdata}")
        failed += 1
        continue
    print(f"seeded {name} ({m['role']}, {m['city']})")
    created += 1

print(f"\ncreated={created} skipped={skipped} failed={failed}")
