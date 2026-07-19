export const TOWL_ROOM_PARAM = "room";
export const TOWL_ROOM_HOST_PREFIX = "towl:";
export const TOWL_ROOM_ID_MIN_LENGTH = 6;
export const TOWL_ROOM_ID_MAX_LENGTH = 24;
export const TOWL_ROOM_ID_LENGTH = 10;

const TOWL_ROOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const TOWL_ROOM_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export type TowlRoomUrl = Readonly<{
  roomId: string;
  url: URL;
  changed: boolean;
}>;

export function normalize_towl_room_id(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length < TOWL_ROOM_ID_MIN_LENGTH
    || normalized.length > TOWL_ROOM_ID_MAX_LENGTH
    || !TOWL_ROOM_PATTERN.test(normalized)
    || normalized.endsWith("-")
  ) {
    return undefined;
  }
  return normalized;
}

export function generate_towl_room_id(
  fill: (bytes: Uint8Array<ArrayBuffer>) => void = (bytes) => {
    const crypto = globalThis.crypto;
    if (crypto?.getRandomValues === undefined) {
      throw new Error("Secure random room generation is unavailable.");
    }
    crypto.getRandomValues(bytes);
  },
): string {
  const bytes = new Uint8Array(TOWL_ROOM_ID_LENGTH);
  fill(bytes);

  return Array.from(
    bytes,
    (value) => TOWL_ROOM_ALPHABET[value & 31],
  ).join("");
}

export function towl_host_id_for_room(roomId: string): string {
  const normalized = normalize_towl_room_id(roomId);
  if (normalized === undefined) throw new Error("Cannot derive a TOWL host ID from an invalid room ID.");
  return `${TOWL_ROOM_HOST_PREFIX}${normalized}`;
}

export function towl_room_id_from_host_id(hostId: string): string | undefined {
  if (!hostId.startsWith(TOWL_ROOM_HOST_PREFIX)) return undefined;
  const rawRoomId = hostId.slice(TOWL_ROOM_HOST_PREFIX.length);
  const normalized = normalize_towl_room_id(rawRoomId);
  return normalized === rawRoomId ? normalized : undefined;
}

export function towl_room_credential_key(roomId: string): string {
  const normalized = normalize_towl_room_id(roomId);
  if (normalized === undefined) throw new Error("Cannot derive a TOWL credential key from an invalid room ID.");
  return `hson-livedemo.towl.${normalized}.livehost-credential`;
}

export function resolve_towl_room_url(
  source: URL,
  makeRoomId: () => string = generate_towl_room_id,
): TowlRoomUrl {
  const url = new URL(source.toString());
  const requested = url.searchParams.get(TOWL_ROOM_PARAM);
  const normalized = normalize_towl_room_id(requested);
  const roomId = normalized ?? normalize_towl_room_id(makeRoomId());
  if (roomId === undefined) throw new Error("TOWL room generation returned an invalid room ID.");
  const changed = requested !== roomId;
  if (changed) url.searchParams.set(TOWL_ROOM_PARAM, roomId);
  return Object.freeze({ roomId, url, changed });
}
