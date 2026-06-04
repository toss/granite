set -e

case "${CONFIGURATION:-}" in
  *Debug*)
    case "${PLATFORM_NAME:-}" in
      *simulator*)
        echo "Skipping Granite bundling in Debug for the Simulator."
        exit 0
        ;;
    esac
    ;;
esac

PROJECT_ROOT="${PROJECT_ROOT:-"$SRCROOT/.."}"
DEST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}"
BUNDLE_NAME="${BUNDLE_NAME:-main}"
GRANITE_BIN="$PROJECT_ROOT/node_modules/.bin/granite"
IOS_JS_BUNDLE="$PROJECT_ROOT/dist/bundle.ios.js"
IOS_HERMES_BUNDLE="$PROJECT_ROOT/dist/bundle.ios.hbc"
EMBEDDED_BUNDLE="$DEST/$BUNDLE_NAME.jsbundle"

cd "$PROJECT_ROOT"
"$GRANITE_BIN" build

mkdir -p "$DEST"

if [ -f "$IOS_HERMES_BUNDLE" ]; then
  cp "$IOS_HERMES_BUNDLE" "$EMBEDDED_BUNDLE"
elif [ -f "$IOS_JS_BUNDLE" ]; then
  cp "$IOS_JS_BUNDLE" "$EMBEDDED_BUNDLE"
else
  echo "Expected Granite iOS bundle at $IOS_HERMES_BUNDLE or $IOS_JS_BUNDLE"
  exit 1
fi
