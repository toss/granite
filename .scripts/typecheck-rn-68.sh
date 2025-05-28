set -eo pipefail;

ROOT_DIR="$(pwd)"

# 서비스 코드에서 사용하는 패키지를 대상으로 타입 체크를 진행합니다
TARGET_PACKAGES=(
  "@granite-js/react-native"
  "@granite-js/image"
  "@granite-js/style-utils"
)

INCLUDE_PACKAGES_PATTERN="{$(printf "%s," "${TARGET_PACKAGES[@]}" | sed 's/,$//')}"

(

cleanup() {
  echo "Git을 초기화합니다."
  git reset --hard
  git clean -fd
}

trap cleanup EXIT

echo "React Native 0.68 설치 시작..."

unset YARN_NPM_AUTH_TOKEN

yarn -v


jq '.dependencies["react-native"]="0.68.2" | .devDependencies["@types/react-native"]="0.68.2" | .devDependencies["@types/react"]="17.0.2"' package.json > package.tmp.json
mv package.tmp.json package.json

cd $ROOT_DIR
jq '.resolutions["react-native"]="0.68.2" | .resolutions["@types/react-native"]="0.68.2" | .resolutions["@types/react"]="17.0.2"' package.json > package.tmp.json
mv package.tmp.json package.json

yarn install --no-immutable --no-immutable-cache
yarn workspaces foreach -A --include "$INCLUDE_PACKAGES_PATTERN" add -D @types/react-native@0.68.2 @types/react@17.0.2
yarn workspaces foreach -A --include "$INCLUDE_PACKAGES_PATTERN" run build

echo "React Native 0.68 타입 검사 시작..."
yarn workspaces foreach -A --include "$INCLUDE_PACKAGES_PATTERN" run typecheck

)
