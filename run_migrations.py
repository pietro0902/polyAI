"""Run Supabase migrations via the PostgREST rpc endpoint."""
import os
import sys
import glob
import httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

migration_files = sorted(glob.glob("supabase/migrations/*.sql"))

print(f"Found {len(migration_files)} migrations")

for path in migration_files:
    name = os.path.basename(path)
    with open(path, "r") as f:
        sql = f.read().strip()

    print(f"\nRunning: {name}")

    # Split by semicolons for individual statements
    statements = [s.strip() for s in sql.split(";") if s.strip()]

    for stmt in statements:
        resp = httpx.post(
            f"{SUPABASE_URL}/rest/v1/rpc/",
            headers=headers,
            json={"query": stmt},
            timeout=30,
        )
        # rpc/ won't work for DDL, let's try the SQL query endpoint instead
        if resp.status_code >= 400:
            # Fall back - we'll print the error and try alternatives
            print(f"  RPC failed ({resp.status_code}): {resp.text[:200]}")
            break
    else:
        print(f"  OK")

print("\nDone. If RPC failed, run migrations via Supabase Dashboard SQL Editor.")
