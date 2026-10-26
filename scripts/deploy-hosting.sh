#!/usr/bin/env bash
# Publish firebase.json's Hosting config (the rewrite to Cloud Run) using your gcloud login, no Firebase CLI needed.
#
# Run when firebase.json changes, signed in with gcloud as a project owner:   bash scripts/deploy-hosting.sh
# (Same result as `firebase deploy --only hosting`; there are no static files, so only the config is uploaded.)
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-matsilelemabaso}
SITE=${SITE:-$PROJECT_ID}
API=https://firebasehosting.googleapis.com/v1beta1

cd "$(dirname "$0")/.."
TOKEN=$(gcloud auth print-access-token)
call() {  # call METHOD URL [JSON]
  curl -sS --fail-with-body -X "$1" "$2" -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" \
    -H "Content-Type: application/json" ${3:+-d "$3"}
}

# firebase.json says "source" where the API says "glob"
CONFIG=$(python3 -c 'import json; h = json.load(open("firebase.json"))["hosting"]
print(json.dumps({"config": {"rewrites": [{"glob": r["source"], "run": r["run"]} for r in h["rewrites"]]}}))')

echo "==> New version"
VERSION=$(call POST "$API/sites/$SITE/versions" "$CONFIG" | python3 -c 'import json, sys; print(json.load(sys.stdin)["name"])')
echo "    $VERSION"
call PATCH "$API/$VERSION?update_mask=status" '{"status": "FINALIZED"}' >/dev/null
echo "==> Release"
call POST "$API/sites/$SITE/releases?versionName=$VERSION" >/dev/null
echo "Live at https://$SITE.web.app"
