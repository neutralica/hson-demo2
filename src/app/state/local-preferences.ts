const BLING_PREFERENCE_KEY = "hson-livedemo.preference.bling";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function browser_storage(): PreferenceStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function read_bling_preference(storage: PreferenceStorage | undefined = browser_storage()): boolean {
  try {
    return storage?.getItem(BLING_PREFERENCE_KEY) === "on";
  } catch {
    return false;
  }
}

export function write_bling_preference(enabled: boolean, storage: PreferenceStorage | undefined = browser_storage()): void {
  try {
    storage?.setItem(BLING_PREFERENCE_KEY, enabled ? "on" : "off");
  } catch {
    // Cosmetic persistence must never prevent the shell from booting.
  }
}
