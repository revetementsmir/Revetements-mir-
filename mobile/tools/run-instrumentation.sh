#!/usr/bin/env bash
set -euo pipefail
class_name="${1:-ca.revetementsmir.equipe.test.MirAndroidTest}"
mkdir -p artifacts/phase11
finish() {
  status=$?
  trap - EXIT
  if ((status != 0));then mobile/tools/android-ci-environment.sh capture || true;fi
  adb pull /sdcard/Android/data/ca.revetementsmir.equipe.test/files/phase11-proof artifacts/phase11/ >/dev/null 2>&1 || echo "Capture Android indisponible pour cette exécution"
  exit "$status"
}
trap finish EXIT
adb shell am instrument -w -e class "$class_name" ca.revetementsmir.equipe.test.test/androidx.test.runner.AndroidJUnitRunner | tee artifacts/phase11/instrumentation.txt
# am instrument can return shell status 0 even when JUnit fails.
grep -Eq '^OK \([1-9][0-9]* tests?\)' artifacts/phase11/instrumentation.txt
if grep -Eq 'FAILURES|INSTRUMENTATION_FAILED|Process crashed' artifacts/phase11/instrumentation.txt; then exit 1; fi
