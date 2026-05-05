#!/bin/bash
set -euo pipefail

# Fully automated Android screenshot capture for 7" and 10" tablets.
# This script runs from any directory and uses adb to tap and type.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$SCRIPT_DIR"
APP_ID="com.properplace.app"
APK_PATH="$ROOT_DIR/proper_place/build/app/outputs/flutter-apk/app-release.apk"

ANDROID_SDK_ROOT="/opt/homebrew/share/android-commandlinetools"
SDKMANAGER="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
AVDMANAGER="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/avdmanager"
EMULATOR_BIN="$ANDROID_SDK_ROOT/emulator/emulator"
ADB="$ANDROID_SDK_ROOT/platform-tools/adb"

SYSTEM_IMAGE_PKG="system-images;android-37.0;google_apis_playstore_ps16k;arm64-v8a"
AVD_7="Nexus_7_2013"
AVD_10="Pixel_C"
OUTDIR="$ROOT_DIR/android-screenshots"
mkdir -p "$OUTDIR/7inch" "$OUTDIR/10inch"

function check_tool() {
  if [[ ! -x "$1" ]]; then
    echo "ERROR: required tool not found or executable: $1" >&2
    exit 1
  fi
}

function ensure_sdk_tools() {
  check_tool "$SDKMANAGER"
  check_tool "$AVDMANAGER"
  check_tool "$EMULATOR_BIN"
  check_tool "$ADB"
}

function wait_for_boot() {
  local serial="$1"
  echo "Waiting for Android device $serial to boot..." >&2
  "$ADB" -s "$serial" wait-for-device
  until [[ "$($ADB -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
    sleep 3
  done
  echo "Device $serial booted." >&2
}

function create_avd_if_missing() {
  local name="$1"
  local device="$2"
  if [[ -d "$HOME/.android/avd/${name}.avd" ]]; then
    echo "AVD $name already exists." >&2
    return
  fi
  echo "Creating AVD $name using device '$device' and image $SYSTEM_IMAGE_PKG..." >&2
  "$AVDMANAGER" create avd --name "$name" --package "$SYSTEM_IMAGE_PKG" --device "$device" --force || true
}

function start_emulator() {
  local name="$1"
  local serial
  serial="$($ADB devices | awk '/device$/ {print $1}')"
  if [[ -n "$serial" ]]; then
    for s in $($ADB devices | awk '/device$/ {print $1}'); do
      local avd
      avd="$($ADB -s "$s" shell getprop ro.boot.qemu.avd_name 2>/dev/null | tr -d '\r')"
      if [[ "$avd" == "$name" ]]; then
        echo "Using already running emulator $name ($s)" >&2
        wait_for_boot "$s"
        echo "$s"
        return
      fi
    done
  fi

  echo "Starting emulator $name..." >&2
  nohup "$EMULATOR_BIN" -avd "$name" -no-snapshot-load -netdelay none -netspeed full >"$ROOT_DIR/$name-emulator.log" 2>&1 &
  sleep 12

  local timeout=0
  while [[ $timeout -lt 120 ]]; do
    serial="$($ADB devices | awk '/device$/ {print $1}')"
    for s in $serial; do
      local avd
      avd="$($ADB -s "$s" shell getprop ro.boot.qemu.avd_name 2>/dev/null | tr -d '\r')"
      if [[ "$avd" == "$name" ]]; then
        wait_for_boot "$s"
        echo "$s"
        return
      fi
    done
    sleep 3
    timeout=$((timeout + 3))
  done

  echo "ERROR: emulator $name failed to start or register with adb." >&2
  exit 1
}

function build_apk_if_needed() {
  if [[ ! -f "$APK_PATH" ]]; then
    echo "APK not found at $APK_PATH. Building release APK..." >&2
    (cd "$ROOT_DIR/proper_place" && /opt/homebrew/bin/flutter build apk --release)
  fi
}

function install_app() {
  local serial="$1"
  echo "Installing APK to $serial..." >&2
  "$ADB" -s "$serial" install -r "$APK_PATH"
}

function launch_app() {
  local serial="$1"
  echo "Launching $APP_ID on $serial..." >&2
  "$ADB" -s "$serial" shell am start -n "$APP_ID/$APP_ID.MainActivity" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER
  sleep 8
}

function get_screen_size() {
  local serial="$1"
  local size
  size="$("$ADB" -s "$serial" shell wm size | tr -d '\r')"
  echo "$size" | awk -F ' ' '{print $3}'
}

function tap_pct() {
  local serial="$1"
  local pct_x="$2"
  local pct_y="$3"
  local size="$(get_screen_size "$serial")"
  local width="$(echo "$size" | cut -d 'x' -f1)"
  local height="$(echo "$size" | cut -d 'x' -f2)"
  local x="$(awk -v w="$width" -v p="$pct_x" 'BEGIN {printf "%d", w * p}')"
  local y="$(awk -v h="$height" -v p="$pct_y" 'BEGIN {printf "%d", h * p}')"
  "$ADB" -s "$serial" shell input tap "$x" "$y"
}

function input_text() {
  local serial="$1"
  local text="$2"
  text="$(printf '%s' "$text" | sed 's/@/%40/g; s/ /%s/g; s/\"/\\\"/g; s/\$/\\$/g')"
  "$ADB" -s "$serial" shell input text "$text"
}

function fill_field() {
  local serial="$1"
  local pct_x="$2"
  local pct_y="$3"
  local text="$4"
  tap_pct "$serial" "$pct_x" "$pct_y"
  sleep 1
  input_text "$serial" "$text"
  sleep 1
  "$ADB" -s "$serial" shell input keyevent 66
  sleep 1
}

function capture_screenshot() {
  local serial="$1"
  local screen_name="$2"
  local device_label="$3"
  local out_path="$OUTDIR/${device_label}/${screen_name}.png"
  echo "Capturing $screen_name on $serial..." >&2
  "$ADB" -s "$serial" exec-out screencap -p > "$out_path"
  echo "Saved $out_path" >&2
}

function ensure_system_image() {
  if [[ ! -d "$ANDROID_SDK_ROOT/system-images/android-37.0/google_apis_playstore_ps16k/arm64-v8a" ]]; then
    echo "ERROR: Required system image not installed: $SYSTEM_IMAGE_PKG" >&2
    echo "Install it with: $SDKMANAGER '$SYSTEM_IMAGE_PKG'" >&2
    exit 1
  fi
}

function sign_up_new_account() {
  local serial="$1"
  local ts
  ts="$(date +%s)"
  local email="androidtest${ts}@proper-place.co.uk"
  local password="Pass1234"

  echo "Signing up new account: $email" >&2
  tap_pct "$serial" 0.50 0.915
  sleep 4
  fill_field "$serial" 0.50 0.233 "Tablet Tester"
  fill_field "$serial" 0.50 0.328 "$email"
  fill_field "$serial" 0.50 0.425 "$password"
  fill_field "$serial" 0.50 0.520 "$password"
  fill_field "$serial" 0.50 0.640 "AB12CDE"
  tap_pct "$serial" 0.50 0.958
  sleep 12
}

function navigate_and_capture() {
  local serial="$1"
  local device_label="$2"
  local x_pct="$3"
  local y_pct="$4"
  local name="$5"
  echo "Tapping $name at $x_pct,$y_pct on $serial..." >&2
  tap_pct "$serial" "$x_pct" "$y_pct"
  sleep 6
  capture_screenshot "$serial" "$name" "$device_label"
}

ensure_sdk_tools
ensure_system_image
build_apk_if_needed
create_avd_if_missing "$AVD_7" "Nexus 7 2013"
create_avd_if_missing "$AVD_10" "pixel_c"

serial7="$(start_emulator "$AVD_7")"
install_app "$serial7"
launch_app "$serial7"
capture_screenshot "$serial7" "welcome" "7inch"
sign_up_new_account "$serial7"
capture_screenshot "$serial7" "map" "7inch"
navigate_and_capture "$serial7" "7inch" 0.30 0.96 "bookings"
navigate_and_capture "$serial7" "7inch" 0.60 0.96 "saved"
tap_pct "$serial7" 0.50 0.40
sleep 4
capture_screenshot "$serial7" "place_detail" "7inch"

serial10="$(start_emulator "$AVD_10")"
install_app "$serial10"
launch_app "$serial10"
capture_screenshot "$serial10" "welcome" "10inch"
sign_up_new_account "$serial10"
capture_screenshot "$serial10" "map" "10inch"
navigate_and_capture "$serial10" "10inch" 0.30 0.96 "bookings"
navigate_and_capture "$serial10" "10inch" 0.60 0.96 "saved"
tap_pct "$serial10" 0.50 0.40
sleep 4
capture_screenshot "$serial10" "place_detail" "10inch"

echo "Done. Screenshots saved under $OUTDIR." >&2
