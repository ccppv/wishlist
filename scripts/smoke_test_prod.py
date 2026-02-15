#!/usr/bin/env python3
"""
Smoke tests against deployed API.
Usage: python scripts/smoke_test_prod.py [--base-url https://x1k.ru]
"""
import argparse
import sys
import httpx


def run_smoke_tests(base_url: str) -> bool:
    base_url = base_url.rstrip("/")
    passed = 0
    failed = 0

    with httpx.Client(timeout=15.0) as client:
        # 1. Health
        try:
            r = client.get(f"{base_url}/health")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            data = r.json()
            assert data.get("status") == "healthy", f"Bad status: {data}"
            print("  OK /health")
            passed += 1
        except Exception as e:
            print(f"  FAIL /health: {e}")
            failed += 1

        # 2. API docs
        try:
            r = client.get(f"{base_url}/api/v1/openapi.json")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            print("  OK /api/v1/openapi.json")
            passed += 1
        except Exception as e:
            print(f"  FAIL /api/v1/openapi.json: {e}")
            failed += 1

        # 3. /me without auth -> 401
        try:
            r = client.get(f"{base_url}/api/v1/users/me")
            assert r.status_code == 401, f"Expected 401, got {r.status_code}"
            print("  OK /api/v1/users/me (401 without auth)")
            passed += 1
        except Exception as e:
            print(f"  FAIL /api/v1/users/me: {e}")
            failed += 1

        # 4. Login empty -> 422
        try:
            r = client.post(f"{base_url}/api/v1/auth/login", data={})
            assert r.status_code == 422, f"Expected 422, got {r.status_code}"
            print("  OK /api/v1/auth/login (422 empty)")
            passed += 1
        except Exception as e:
            print(f"  FAIL /api/v1/auth/login: {e}")
            failed += 1

        # 5. Login wrong creds -> 401
        try:
            r = client.post(
                f"{base_url}/api/v1/auth/login",
                data={"username": "nonexistent_smoke_test_xyz", "password": "wrong"},
            )
            assert r.status_code == 401, f"Expected 401, got {r.status_code}"
            print("  OK /api/v1/auth/login (401 wrong creds)")
            passed += 1
        except Exception as e:
            print(f"  FAIL /api/v1/auth/login wrong creds: {e}")
            failed += 1

        # 6. Images (static)
        try:
            r = client.get(f"{base_url}/images/create_wishlist.png")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            assert "image" in r.headers.get("content-type", ""), "Not an image"
            print("  OK /images/create_wishlist.png")
            passed += 1
        except Exception as e:
            print(f"  FAIL /images: {e}")
            failed += 1

    return failed == 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url",
        default="https://x1k.ru",
        help="Base URL of deployed API",
    )
    args = parser.parse_args()

    print(f"Smoke tests: {args.base_url}\n")
    ok = run_smoke_tests(args.base_url)
    print(f"\nDone. {'All passed' if ok else 'Some failed'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
