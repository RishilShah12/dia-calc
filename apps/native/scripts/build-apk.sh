#!/usr/bin/env bash
# Build a release APK pointed at production (apps/native/.env.prod).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env.prod"
if [[ ! -f "$ENV_FILE" ]]; then
	echo "Missing $ENV_FILE — copy .env.prod.example and set EXPO_PUBLIC_SERVER_URL" >&2
	exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${EXPO_PUBLIC_SERVER_URL:-}" ]]; then
	echo "EXPO_PUBLIC_SERVER_URL is empty in .env.prod" >&2
	exit 1
fi

# Expo release bundling loads .env then .env.production (later wins).
# Keep .env.prod as source of truth; mirror for this build only.
cp "$ENV_FILE" "$ROOT/.env.production"
cleanup() {
	rm -f "$ROOT/.env.production"
}
trap cleanup EXIT

echo "Building APK with EXPO_PUBLIC_SERVER_URL=$EXPO_PUBLIC_SERVER_URL"

if [[ ! -d android ]]; then
	pnpm exec expo prebuild --platform android --no-install
fi

cd android
# Force Metro to rebundle so EXPO_PUBLIC_* from .env.production is inlined
rm -rf app/build/generated/assets/react/release \
	app/build/generated/sourcemaps/react/release \
	app/build/intermediates/sourcemaps/react/release \
	app/build/intermediates/assets/release \
	app/build/intermediates/compressed_assets/release
./gradlew :app:createBundleReleaseJsAndAssets assembleRelease

APK="app/build/outputs/apk/release/app-release.apk"
if [[ -f "$APK" ]]; then
	echo "APK ready: $ROOT/android/$APK"
else
	echo "Gradle finished but APK not found at $APK" >&2
	exit 1
fi
