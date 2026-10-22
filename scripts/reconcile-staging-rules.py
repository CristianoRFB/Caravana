#!/usr/bin/env python3
"""Reconcile only the reviewed CRLF/LF staging artifact using managed Cloud Shell.

Default is read-only. --apply records the previous immutable release before
publishing the byte-exact LF candidate. --rollback restores that saved release.
No documents, Auth, indexes, IAM, billing or production endpoints are writable.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import urllib.request

SPEC = importlib.util.spec_from_file_location("staging_audit", Path(__file__).with_name("staging-readonly-audit.py"))
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)
OLD_HASH = "41388c5fced786f8adb6ae2eb60160d4244809beb00415f6a2959999442c6f81"
CREATE_URL = f"https://firebaserules.googleapis.com/v1/projects/{audit.PROJECT}/rulesets"
RELEASE_NAME = f"projects/{audit.PROJECT}/releases/cloud.firestore"


def sha(content):
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def candidate(source):
    files = source.get("files", [])
    if len(files) != 1 or files[0].get("name") != "firestore.rules":
        raise audit.Blocked("unexpected_rules_source")
    content = files[0].get("content")
    if not isinstance(content, str) or sha(content) not in {OLD_HASH, audit.RULES_SHA256}:
        raise audit.Blocked("unexpected_rules_bytes")
    normalized = content.replace("\r\n", "\n")
    if "\r" in normalized or sha(normalized) != audit.RULES_SHA256:
        raise audit.Blocked("rules_change_is_not_reviewed_line_endings_only")
    return {"files": [{"name": "firestore.rules", "content": normalized}]}


def require_preflight(report):
    auth = report.get("auth", {})
    indexes = report.get("compositeIndexes", {})
    if not (report.get("identityVerified") and report.get("projectIdentityVerified")
            and report.get("billingEnabled") is False and report.get("standardFreeTierVerified")
            and indexes.get("candidateMatch") and indexes.get("ready") == indexes.get("count") == 11
            and all(auth.get(k) is True for k in ["emailPasswordEnabled", "emailEnumerationProtection", "passwordPolicyEnforced", "stagingDomainAuthorized"])
            and auth.get("anonymousEnabled") is False and auth.get("passwordMinimumLength") == 12):
        raise audit.Blocked("configuration_preflight_incomplete")


def write_request(token, method, url, body):
    if not ((method == "POST" and url == CREATE_URL) or (method == "PATCH" and url == audit.ROUTES["release"])):
        raise audit.Blocked("write_outside_fixed_rules_scope")
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers={
        "Authorization": "Bearer " + token, "Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.build_opener(audit.NoRedirect).open(request, timeout=30) as response:
            data = response.read(2_000_001)
            if response.status != 200 or len(data) > 2_000_000:
                raise audit.Blocked("rules_write_unexpected_response")
            return json.loads(data)
    except audit.Blocked:
        raise
    except Exception:
        raise audit.Blocked("rules_write_failed_raw_details_suppressed") from None


def point_release(token, reader, expected, target):
    audit.ruleset_url(expected)
    audit.ruleset_url(target)
    if reader.read("release", audit.ROUTES["release"]).get("rulesetName") != expected:
        raise audit.Blocked("release_changed_stop_without_overwrite")
    write_request(token, "PATCH", audit.ROUTES["release"], {
        "release": {"name": RELEASE_NAME, "rulesetName": target}, "updateMask": "ruleset_name"})
    if reader.read("release", audit.ROUTES["release"]).get("rulesetName") != target:
        raise audit.Blocked("release_verification_failed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--apply", action="store_true")
    group.add_argument("--rollback", action="store_true")
    parser.add_argument("--checkpoint", required=True, help="Private metadata-only checkpoint, never a credential file")
    args = parser.parse_args()
    checkpoint = Path(args.checkpoint)
    print(json.dumps({"target": audit.PROJECT, "identity": "managed_gcloud_exact_account",
                      "operation": "rules_line_endings_rollback" if args.rollback else "rules_line_endings_reconcile",
                      "classification": "deploy" if args.apply or args.rollback else "GET"}))
    token = audit.managed_token("gcloud")
    reader = audit.Reader(token)
    report = {}
    try:
        audit.audit(reader, report)
    except audit.Blocked as error:
        if str(error) != "deployed_rules_or_indexes_require_comparison":
            raise
    require_preflight(report)
    release = reader.read("release", audit.ROUTES["release"])
    current = release.get("rulesetName")
    rules = reader.read("ruleset", audit.ruleset_url(current))
    source = rules.get("source", {})
    canonical = candidate(source)
    if args.rollback:
        saved = json.loads(checkpoint.read_text(encoding="utf-8"))
        if saved.get("projectId") != audit.PROJECT or saved.get("beforeHash") != OLD_HASH or saved.get("afterHash") != audit.RULES_SHA256:
            raise audit.Blocked("checkpoint_identity_or_hash_mismatch")
        old = reader.read("ruleset", audit.ruleset_url(saved["beforeRuleset"]))
        if sha(old.get("source", {}).get("files", [{}])[0].get("content", "")) != OLD_HASH:
            raise audit.Blocked("saved_ruleset_integrity_mismatch")
        point_release(token, reader, saved["afterRuleset"], saved["beforeRuleset"])
        print(json.dumps({"status": "PASS_RULES_ROLLBACK", "sha256": OLD_HASH, "businessDocumentWrites": 0}))
    elif args.apply:
        if sha(source["files"][0]["content"]) != OLD_HASH or checkpoint.exists():
            raise audit.Blocked("apply_requires_original_bytes_and_new_checkpoint")
        saved = {"projectId": audit.PROJECT, "beforeRuleset": current, "beforeHash": OLD_HASH,
                 "afterHash": audit.RULES_SHA256, "beforeSource": source}
        audit.write_report(checkpoint, saved)
        created = write_request(token, "POST", CREATE_URL, {"source": canonical})
        target = created.get("name")
        fresh = reader.read("ruleset", audit.ruleset_url(target))
        if fresh.get("source") != canonical:
            raise audit.Blocked("created_ruleset_bytes_mismatch")
        saved["afterRuleset"] = target
        audit.write_report(checkpoint, saved)
        point_release(token, reader, current, target)
        verified = {}
        audit.audit(reader, verified)
        print(json.dumps({"status": "PASS_RULES_RECONCILED", "beforeRuleset": current, "afterRuleset": target,
                          "sha256": audit.RULES_SHA256, "businessDocumentWrites": 0, "strictAudit": verified}))
    else:
        print(json.dumps({"status": "PASS_LINE_ENDINGS_ONLY_PREFLIGHT", "beforeRuleset": current,
                          "beforeHash": sha(source["files"][0]["content"]), "candidateHash": sha(canonical["files"][0]["content"]),
                          "projectWrites": 0}))


if __name__ == "__main__":
    try:
        main()
    except audit.Blocked as error:
        print(json.dumps({"status": "BLOCKED", "reason": str(error)}))
        raise SystemExit(1)
    except Exception:
        print(json.dumps({"status": "BLOCKED", "reason": "unexpected_failure_raw_details_suppressed"}))
        raise SystemExit(1)
