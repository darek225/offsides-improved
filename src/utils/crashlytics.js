// Crashlytics shim.
//
// The full build talks to Firebase Crashlytics through this wrapper. In the
// FOSS build (EXPO_PUBLIC_FOSS=1, no Firebase native modules) every call is a
// no-op, so the rest of the app never imports @react-native-firebase directly
// and never crashes on the missing native module.
//
// Only the two methods the app actually uses are surfaced: log, recordError.

const noopInstance = {
  log: () => {},
  recordError: () => {},
};

let cached = null;

function resolveCrashlytics() {
  if (cached) return cached;
  if (process.env.EXPO_PUBLIC_FOSS === '1') {
    cached = () => noopInstance;
    return cached;
  }
  try {
    // Literal require so Metro bundles it in the full build. In a FOSS build
    // the package may still be present in JS but its native module is gone,
    // and its JS throws on import; the catch turns that into the no-op.
    const mod = require('@react-native-firebase/crashlytics');
    const real = mod && mod.default ? mod.default : mod;
    cached = typeof real === 'function' ? real : () => noopInstance;
  } catch (e) {
    cached = () => noopInstance;
  }
  return cached;
}

export default function crashlytics() {
  return resolveCrashlytics()();
}
