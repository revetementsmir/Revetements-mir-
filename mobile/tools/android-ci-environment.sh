#!/usr/bin/env bash
# CI-only evidence and prerequisites. Never dismiss an ANR or alter app permissions/data.
set -euo pipefail
out=artifacts/phase11/system
mkdir -p "$out"
mode=${1:-capture}
capture() {
 local label=$1
 local ui_path="/sdcard/mir-ci-system-$label.xml"
 adb exec-out screencap -p > "$out/$label.png" 2>/dev/null || true
 adb shell dumpsys window 2>/dev/null | awk '/mCurrentFocus=|mFocusedApp=|mInputMethodTarget=/' > "$out/$label-window.txt" || true
 adb shell dumpsys activity activities 2>/dev/null | awk '/mResumedActivity|topResumedActivity|ResumedActivity:/' > "$out/$label-activity.txt" || true
 adb shell dumpsys activity lastanr 2>/dev/null | awk '/ANR in |PID:|Reason:|Quickstep/ {line=tolower($0);if(line !~ /https?:|token|bearer|password|@/)print}' > "$out/$label-anr.txt" || true
 adb shell dumpsys meminfo com.android.launcher3 > "$out/$label-launcher-memory.txt" 2>/dev/null || true
 adb shell uiautomator dump "$ui_path" >/dev/null 2>&1 || true
 adb exec-out cat "$ui_path" > "$out/$label-ui.xml" 2>/dev/null || true
 python3 - "$out/$label-ui.xml" <<'PY'
import sys,xml.etree.ElementTree as E
p=sys.argv[1]
try:
 tree=E.parse(p)
 for n in tree.iter():
  if n.attrib.get('password')=='true':n.set('text','[redacted]')
 tree.write(p,encoding='utf-8',xml_declaration=True)
except (E.ParseError,OSError):pass
PY
}
verify_kvm_report() {
 grep -Eiq 'KVM.* is installed and usable' "$1" && ! grep -Eiq '(^|[^[:alnum:]_])(not|unusable)([^[:alnum:]_]|$)' "$1"
}
# Sourcing exposes only the report parser to its unit test; CI executes mode host.
if [[ "${BASH_SOURCE[0]}" != "$0" ]];then return;fi
case "$mode" in
 host)
  rm -f "$out/host-ok.txt"
  emulator_bin="${ANDROID_HOME:?Android SDK required}/emulator/emulator"
  test -r /dev/kvm && test -w /dev/kvm || { echo 'MIR CI requires readable/writable KVM; CPU fallback refused' >&2; exit 1; }
  emulator_info() {
   local file=$1;shift
   if ! "$emulator_bin" -no-window -noaudio "$@" > "$out/$file" 2>&1;then cat "$out/$file" >&2;return 1;fi
  }
  emulator_info emulator-version.txt -version
  emulator_info emulator-help-gpu.txt -help-gpu
  grep -Eq '(^|[^[:alnum:]_])swiftshader([^[:alnum:]_]|$)' "$out/emulator-help-gpu.txt"
  emulator_info emulator-help-all.txt -help-all
  grep -q -- '-feature' "$out/emulator-help-all.txt"
  grep -q -- '-accel' "$out/emulator-help-all.txt"
  "$emulator_bin" -no-window -noaudio -accel-check 2>&1 | tee "$out/kvm.txt"
  verify_kvm_report "$out/kvm.txt" || { echo 'Usable KVM not confirmed' >&2; exit 1; }
  grep -E '^(MemTotal|MemAvailable|SwapTotal):' /proc/meminfo > "$out/host-memory.txt"
  printf 'KVM=verified\nHEADLESS=required\n' > "$out/host-ok.txt"
  ;;
 ready)
  if ! test -s "$out/host-ok.txt" || ! grep -qx 'KVM=verified' "$out/host-ok.txt" || ! verify_kvm_report "$out/kvm.txt";then echo 'Host preflight missing or failed; MIR tests refused' >&2;exit 1;fi
  ready=false
  for ((i=0;i<30;i++)); do
   boot=$(adb shell getprop sys.boot_completed | tr -d '\r')
   animation=$(adb shell getprop init.svc.bootanim | tr -d '\r')
   if [[ "$boot" == 1 && "$animation" == stopped ]]; then ready=true;break;fi
   sleep 1
  done
  "$ready" || { capture boot-not-ready; echo 'Android boot/animation not complete' >&2;exit 1; }
  adb shell input keyevent KEYCODE_WAKEUP
  adb shell wm dismiss-keyguard
  adb shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME > "$out/home-launch.txt"
  focused=false
  for ((i=0;i<30;i++)); do
   window=$(adb shell dumpsys window)
   if grep -Eiq 'Application (Not Responding|Error)|AppNotResponding' <<< "$window";then capture home-anr;echo 'System ANR before MIR tests; not dismissed' >&2;exit 1;fi
   activity=$(adb shell dumpsys activity activities)
   if grep -Eq 'mCurrentFocus=.*com.android.launcher3' <<< "$window" && grep -Eq '(mResumedActivity|topResumedActivity|ResumedActivity:).*com.android.launcher3' <<< "$activity";then focused=true;break;fi
   sleep 1
  done
  "$focused" || { capture home-not-ready;echo 'Android HOME is not interactive' >&2;exit 1; }
  capture before-tests
  test -s "$out/before-tests-ui.xml"
  grep -q 'package="com.android.launcher3"' "$out/before-tests-ui.xml"
  if grep -Eiq "isn.t responding|not responding|ne répond pas|AppNotRespondingDialog" "$out/before-tests-ui.xml";then echo 'System ANR before tests; no automatic dismissal' >&2;exit 1;fi
  printf 'boot_completed=%s\nbootanim=%s\nHOME=interactive\nANR=not observed\n' "$boot" "$animation" > "$out/ready.txt"
  ;;
 capture) capture failure ;;
 *) echo 'Expected host, ready or capture' >&2;exit 2 ;;
esac
