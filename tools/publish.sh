#!/usr/bin/env bash
cd "$(dirname "${0}")/.."
set -e

from_git=0

for arg in "${@}"; do
  if [[ ${arg} == "--from-git" ]]; then
    from_git=1
    continue
  fi
done

yarn install

echo "=> Verifying login"
if ! yarn npm whoami --publish; then
  exit 1
fi

if [[ ${from_git} == "0" ]]; then
  echo "=> Starting versioning tool"
  yarn release-tool version
fi

echo "=> Publishing"
yarn npm publish

echo "=> Pushing to git"
git push
git push --tags

echo "=> Done"
