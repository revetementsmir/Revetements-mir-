#!/usr/bin/env bash
# CI-only evidence and prerequisites. Never dismiss an ANR or alter app permissions/data.
set -euo pipefail
out=artifacts/phase11/system
mkdir -p "$out"
mode=${1:-capture}
record() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$out/boot-order.txt"; }
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
await_home() {
 local phase=$1 stable=0 window activity
 record "$phase: awaiting stable HOME focus and resumed Activity"
 for ((i=0;i<30;i++));do
  window=$(adb shell dumpsys window)
  if grep -Eiq 'Application (Not Responding|Error)|AppNotResponding' <<< "$window";then capture home-anr;echo 'System ANR before MIR tests; not dismissed' >&2;return 1;fi
  activity=$(adb shell dumpsys activity activities)
  if grep -Eq 'mCurrentFocus=.*com.android.launcher3' <<< "$window" && grep -Eq '(mResumedActivity|topResumedActivity|ResumedActivity:).*com.android.launcher3' <<< "$activity";then
   ((stable+=1))
   if ((stable>=2));then record "$phase: HOME focus and resumed Activity stable";return 0;fi
  else stable=0;fi
  sleep 1
 done
 capture home-not-ready
 echo "Android HOME is not interactive ($phase)" >&2
 return 1
}
# Sourcing exposes only the report parser to its unit test; CI executes mode host.
if [[ "${BASH_SOURCE[0]}" != "$0" ]];then return;fi
case "$mode" in
 start)
  # Own the boot sequence: the upstream runner injected MENU immediately after
  # sys.boot_completed without awaiting Launcher focus (CI 2154 focus ANR).
  "$0" host
  : "${ANDROID_AVD_HOME:?A job-private AVD directory is required}"
  mkdir -p "$ANDROID_AVD_HOME"
  avdmanager create avd --force --name test --package 'system-images;android-35;default;x86_64' --device pixel_7 <<< no
  avd_config="$ANDROID_AVD_HOME/test.avd/config.ini"
  printf '\nhw.cpu.ncore=2\nhw.ramSize=3072\nvm.heapSize=512\nhw.keyboard=no\n' >> "$avd_config"
  grep -E '^(hw.cpu.ncore|hw.ramSize|vm.heapSize|hw.lcd.(height|width|density)|hw.device.name)=' "$avd_config" > "$out/avd-config.txt"
  record 'emulator start API35/default/x86_64 Pixel7 cores=2 RAM=3072 heap=512 KVM=on GPU=swiftshader Vulkan=off'
  "$ANDROID_HOME/emulator/emulator" -port 5554 -avd test -no-window -accel on -gpu swiftshader -feature -Vulkan -no-snapshot -noaudio -no-boot-anim > "$out/emulator-boot.log" 2>&1 &
  printf '%s\n' "$!" > "$out/emulator.pid"
  exec "$0" ready
  ;;
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
  deadline=$((SECONDS+150))
  while ((SECONDS<deadline)); do
   boot=$(timeout 5s adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r') || boot=''
   animation=$(timeout 5s adb shell getprop init.svc.bootanim 2>/dev/null | tr -d '\r') || animation=''
   if [[ "$boot" == 1 && "$animation" == stopped ]]; then ready=true;break;fi
   sleep 2
  done
  "$ready" || { capture boot-not-ready; echo 'Android boot/animation not complete' >&2;exit 1; }
  record 'boot_completed=1 bootanim=stopped; no input sent'
  adb shell wm dismiss-keyguard
  adb shell am start -W -a android.intent.action.MAIN -c android.intent.category.HOME > "$out/home-launch.txt"
  await_home before-input
  record 'HOME focused and resumed; first input permitted'
  adb shell input keyevent KEYCODE_HOME
  record 'HOME key dispatched after focus'
  await_home after-input
  adb shell settings put global window_animation_scale 0.0
  adb shell settings put global transition_animation_scale 0.0
  adb shell settings put global animator_duration_scale 0.0
  presentation_deadline=$((SECONDS+30))
  presented=false
  frame=0
  while ((SECONDS<presentation_deadline));do
   ((frame+=1))
   label="home-frame-$frame"
   capture "$label"
   if node "$(dirname "$0")/android-ci-home.cjs" "$out" "$label" > "$out/home-presentation.json";then
    for suffix in .png -window.txt -activity.txt -anr.txt -launcher-memory.txt -ui.xml;do cp "$out/$label$suffix" "$out/before-tests$suffix";done
    presented=true;break
   else
    result=$?
    if ((result==2));then echo 'System ANR observed in HOME presentation; not dismissed' >&2;exit 1;fi
   fi
   record 'HOME frame still transitional; no new input sent'
   await_home presentation
  done
  "$presented" || { echo 'Android HOME did not present a coherent rendered frame' >&2;exit 1; }
  printf 'boot_completed=%s\nbootanim=%s\nHOME=interactive\nANR=not observed\n' "$boot" "$animation" > "$out/ready.txt"
  record 'HOME screenshot/XML verified; MIR installation permitted'
  ;;
 stop)
  # Only terminate the emulator process started by this job. Never kill by name
  # or clear app data; the caller preserves the instrumentation exit status.
  if test -f "$out/emulator.pid";then
   emulator_pid=$(cat "$out/emulator.pid")
   if [[ "$emulator_pid" =~ ^[0-9]+$ ]] && test -r "/proc/$emulator_pid/cmdline" && tr '\0' ' ' < "/proc/$emulator_pid/cmdline" | grep -Eq '/emulator/.*-avd test( |$)';then
    kill "$emulator_pid" 2>/dev/null || true
    for ((i=0;i<20;i++));do kill -0 "$emulator_pid" 2>/dev/null || break;sleep 1;done
    kill -KILL "$emulator_pid" 2>/dev/null || true
    record 'job emulator PID stopped'
   fi
  fi
  ;;
 capture) capture failure ;;
 *) echo 'Expected start, host, ready, stop or capture' >&2;exit 2 ;;
esac
