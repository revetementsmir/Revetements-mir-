#!/usr/bin/env bash
set -euo pipefail
class_name="${1:-ca.revetementsmir.equipe.test.MirAndroidTest}"
mkdir -p artifacts/phase11
adb shell am instrument -w -e class "$class_name" ca.revetementsmir.equipe.test.test/androidx.test.runner.AndroidJUnitRunner | tee artifacts/phase11/instrumentation.txt
# am instrument can return shell status 0 even when JUnit fails.
grep -Eq '^OK \([1-9][0-9]* tests?\)' artifacts/phase11/instrumentation.txt
if grep -Eq 'FAILURES|INSTRUMENTATION_FAILED|Process crashed' artifacts/phase11/instrumentation.txt; then exit 1; fi
