#!/usr/bin/env python3
"""Fixed-target production metadata audit. No document/user/object contents read.

Run only inside the owner's existing Cloud Shell. Output is sanitized metadata;
tokens stay in memory. No mutation, backup, project selector or IAM workaround.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone

PROJECT = "caravana-af306"
PRINCIPAL = "nexus7devstudio@gmail.com"
BASE = f"projects/{PROJECT}"
URLS = {
    "identity": "https://openidconnect.googleapis.com/v1/userinfo",
    "project": f"https://firebase.googleapis.com/v1beta1/{BASE}",
    "billing": f"https://cloudbilling.googleapis.com/v1/{BASE}/billingInfo",
    "database": f"https://firestore.googleapis.com/v1/{BASE}/databases/(default)",
    "rulesRelease": f"https://firebaserules.googleapis.com/v1/{BASE}/releases/cloud.firestore",
    "indexes": f"https://firestore.googleapis.com/v1/{BASE}/databases/(default)/collectionGroups/-/indexes",
    "authConfig": f"https://identitytoolkit.googleapis.com/admin/v2/{BASE}/config",
    "storageBuckets": f"https://firebasestorage.googleapis.com/v1beta/{BASE}/buckets",
}


class Blocked(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def allowed(url):
    return url in URLS.values() or bool(re.fullmatch(
        rf"https://firebaserules\.googleapis\.com/v1/{BASE}/rulesets/[A-Za-z0-9_-]{{1,128}}", url))


def managed_token():
    if any(os.environ.get(k) for k in ["FIREBASE_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]):
        raise Blocked("manual_credentials_or_emulators_rejected")
    def command(args):
        try:
            return subprocess.run(["gcloud", *args, "--quiet", f"--project={PROJECT}"], capture_output=True, text=True, check=True, timeout=30).stdout.strip()
        except Exception:
            raise Blocked("managed_session_unavailable") from None
    if command(["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]) != PRINCIPAL:
        raise Blocked("production_google_identity_mismatch")
    return command(["auth", "print-access-token", f"--account={PRINCIPAL}"])


class Reader:
    def __init__(self, token, opener=None):
        self.token = token
        self.opener = opener or urllib.request.build_opener(NoRedirect)
        self.calls = []

    def read(self, resource, url):
        if not allowed(url):
            raise Blocked("production_metadata_allowlist_rejected")
        self.calls.append(resource)
        request = urllib.request.Request(url, headers={"Authorization": "Bearer " + self.token}, method="GET")
        try:
            with self.opener.open(request, timeout=30) as response:
                data = response.read(2_000_001)
                if response.status != 200 or len(data) > 2_000_000:
                    raise Blocked(resource + "_unexpected_response")
                return json.loads(data)
        except urllib.error.HTTPError as error:
            raise Blocked(resource + "_http_" + str(error.code)) from None
        except Blocked:
            raise
        except Exception:
            raise Blocked(resource + "_transport_error_raw_details_suppressed") from None


def preflight(reader, report):
    identity = reader.read("identity", URLS["identity"])
    if identity.get("email") != PRINCIPAL or identity.get("email_verified") is not True:
        raise Blocked("production_verified_identity_mismatch")
    report["identityVerified"] = True
    project = reader.read("project", URLS["project"])
    if project.get("projectId") != PROJECT or project.get("state") != "ACTIVE" or not str(project.get("projectNumber", "")).isdigit():
        raise Blocked("production_project_identity_mismatch")
    report["projectNumber"] = str(project["projectNumber"])
    billing = reader.read("billing", URLS["billing"])
    report["billingEnabled"] = billing.get("billingEnabled")
    report["billingAccountLinked"] = bool(billing.get("billingAccountName"))
    database = reader.read("database", URLS["database"])
    if database.get("name") != f"{BASE}/databases/(default)":
        raise Blocked("production_database_identity_mismatch")
    report["database"] = {"edition": database.get("databaseEdition"), "freeTier": database.get("freeTier"), "type": database.get("type")}
    for key in ["rulesRelease", "indexes", "authConfig", "storageBuckets"]:
        try:
            value = reader.read(key, URLS[key])
            if key == "rulesRelease":
                name = value.get("rulesetName", "")
                rules = reader.read("ruleset", "https://firebaserules.googleapis.com/v1/" + name)
                files = rules.get("source", {}).get("files", [])
                report["rules"] = {"rulesetName": name, "files": [{"sha256": hashlib.sha256(f["content"].encode()).hexdigest(), "bytes": len(f["content"].encode())} for f in files]}
            elif key == "indexes":
                report["indexes"] = {"count": len(value.get("indexes", [])), "ready": sum(i.get("state") == "READY" for i in value.get("indexes", [])), "complete": not bool(value.get("nextPageToken"))}
            elif key == "authConfig":
                report["auth"] = {"emailPasswordEnabled": value.get("signIn", {}).get("email", {}).get("enabled") is True,
                                  "anonymousEnabled": value.get("signIn", {}).get("anonymous", {}).get("enabled") is True,
                                  "enumerationProtection": value.get("emailPrivacyConfig", {}).get("enableImprovedEmailPrivacy") is True}
            else:
                report["storage"] = {"bucketCount": len(value.get("buckets", [])), "complete": not bool(value.get("nextPageToken"))}
        except Blocked as error:
            report[key] = {"status": "BLOCKED", "reason": str(error)}
    report["allMetadataReadsPassed"] = not any(isinstance(v, dict) and v.get("status") == "BLOCKED" for v in report.values())
    report["status"] = "PASS_PRODUCTION_METADATA_PREFLIGHT" if report["allMetadataReadsPassed"] else "PARTIAL_PRODUCTION_METADATA_PREFLIGHT"


if __name__ == "__main__":
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "projectId": PROJECT,
              "operation": "production_metadata_preflight", "identity": "managed_exact_account", "classification": "GET",
              "projectWrites": 0, "businessDocumentsRead": False, "authUsersRead": False, "objectsRead": False, "backupCreated": False}
    reader = None
    try:
        reader = Reader(managed_token())
        preflight(reader, report)
    except Blocked as error:
        report.update(status="BLOCKED", reason=str(error))
    except Exception:
        report.update(status="BLOCKED", reason="unexpected_error_raw_details_suppressed")
    report["requests"] = reader.calls if reader else []
    print(json.dumps(report, separators=(",", ":")))
    raise SystemExit(0 if report.get("status") == "PASS_PRODUCTION_METADATA_PREFLIGHT" else 1)
