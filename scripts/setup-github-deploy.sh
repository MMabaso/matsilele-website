#!/usr/bin/env bash
# One-time setup so .github/workflows/deploy.yml can deploy to Cloud Run with no stored keys.
#
# Creates:
#   - a "github-deployer" service account that can only push images to the "website" repository and
#     deploy the Cloud Run service (it is NOT the account the site runs as)
#   - a Workload Identity pool + provider that trusts GitHub's OIDC tokens, but only from this repo's main branch
#
# Run once, signed in with gcloud as a project owner:   bash scripts/setup-github-deploy.sh
# Safe to re-run: anything that already exists is left as it is.
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-matsilelemabaso}
REGION=${REGION:-europe-west3}
SERVICE=${SERVICE:-matsilele-website}
AR_REPO=${AR_REPO:-website}
GH_REPO=${GH_REPO:-MMabaso/matsilele-website}
RUNTIME_SA=${RUNTIME_SA:-matsilele@$PROJECT_ID.iam.gserviceaccount.com}   # the identity the site runs as
DEPLOYER=github-deployer
DEPLOYER_SA=$DEPLOYER@$PROJECT_ID.iam.gserviceaccount.com
POOL=github
PROVIDER=github

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> APIs for keyless sign-in"
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com

echo "==> Deployer service account"
gcloud iam service-accounts describe "$DEPLOYER_SA" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "$DEPLOYER" --display-name="GitHub Actions deployer"

echo "==> Workload Identity pool and GitHub provider (only $GH_REPO, branch main)"
gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global \
    --workload-identity-pool="$POOL" >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
       --location=global --workload-identity-pool="$POOL" --display-name="GitHub" \
       --issuer-uri="https://token.actions.githubusercontent.com" \
       --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
       --attribute-condition="assertion.repository=='$GH_REPO' && assertion.ref=='refs/heads/main'"

echo "==> Permissions"
# GitHub (this repo only) may act as the deployer
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" --format=none \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$GH_REPO"
# Push images to the one Artifact Registry repository
gcloud artifacts repositories add-iam-policy-binding "$AR_REPO" --location="$REGION" --format=none \
  --role=roles/artifactregistry.writer --member="serviceAccount:$DEPLOYER_SA"
# Deploy new revisions of the one Cloud Run service
gcloud run services add-iam-policy-binding "$SERVICE" --region="$REGION" --format=none \
  --role=roles/run.developer --member="serviceAccount:$DEPLOYER_SA"
# Deploying a revision that runs as the runtime account requires "act as" on it
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" --format=none \
  --role=roles/iam.serviceAccountUser --member="serviceAccount:$DEPLOYER_SA"

cat <<EOF

Done. In GitHub → $GH_REPO → Settings → Secrets and variables → Actions → Variables, add:

  GCP_PROJECT_ID                  $PROJECT_ID
  GCP_REGION                      $REGION
  CLOUD_RUN_SERVICE               $SERVICE
  GCP_WORKLOAD_IDENTITY_PROVIDER  projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER
  GCP_DEPLOY_SERVICE_ACCOUNT      $DEPLOYER_SA

Then push to main (or run "Deploy" from the Actions tab).
EOF
