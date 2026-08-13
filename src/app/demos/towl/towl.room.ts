export const TOWL_ROOM_PARAM = "room";
export const TOWL_ROOM_HOST_PREFIX = "towl:";
export const TOWL_ROOM_ID_MIN_LENGTH = 6;
export const TOWL_ROOM_ID_MAX_LENGTH = 24;
export const TOWL_ROOM_ID_LENGTH = 10;

const TOWL_ROOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
export const TOWL_ROOM_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type TowlRoomUrl = Readonly<{
  roomId: string;
  url: URL;
  changed: boolean;
}>;

export type TowlRoomUrlState =
  | Readonly<{ kind: "absent"; url: URL }>
  | Readonly<{ kind: "valid"; roomId: string; url: URL; changed: boolean }>
  | Readonly<{ kind: "invalid"; requested: string; url: URL }>;

export type TowlEntryUrlState = Readonly<{
  direct: boolean;
  selectsTowl: boolean;
  room: TowlRoomUrlState;
}>;

export function normalize_towl_room_id(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length < TOWL_ROOM_ID_MIN_LENGTH
    || normalized.length > TOWL_ROOM_ID_MAX_LENGTH
    || !TOWL_ROOM_ID_PATTERN.test(normalized)
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

export function is_direct_towl_path(pathname: string): boolean {
  return pathname === "/towl" || pathname === "/towl/";
}

export function classify_towl_room_url(source: URL): TowlRoomUrlState {
  const url = new URL(source.toString());
  const requestedValues = url.searchParams.getAll(TOWL_ROOM_PARAM);
  if (requestedValues.length === 0) return Object.freeze({ kind: "absent", url });

  const requested = requestedValues[0] ?? "";
  if (requestedValues.length !== 1) {
    return Object.freeze({ kind: "invalid", requested: requestedValues.join(", "), url });
  }
  const normalized = normalize_towl_room_id(requested);
  if (normalized === undefined) {
    return Object.freeze({ kind: "invalid", requested, url });
  }

  const changed = requested !== normalized;
  if (changed) url.searchParams.set(TOWL_ROOM_PARAM, normalized);
  return Object.freeze({ kind: "valid", roomId: normalized, url, changed });
}

export function classify_towl_entry_url(source: URL): TowlEntryUrlState {
  const room = classify_towl_room_url(source);
  const direct = is_direct_towl_path(source.pathname);
  return Object.freeze({ direct, selectsTowl: direct || room.kind === "valid", room });
}

export function create_towl_room_url(
  source: URL,
  makeRoomId: () => string = generate_towl_room_id,
): TowlRoomUrl {
  const url = new URL(source.toString());
  const roomId = normalize_towl_room_id(makeRoomId());
  if (roomId === undefined) throw new Error("TOWL room generation returned an invalid room ID.");
  url.searchParams.set(TOWL_ROOM_PARAM, roomId);
  return Object.freeze({ roomId, url, changed: true });
}

export function canonical_towl_invite_url(source: URL, roomId: string): URL {
  const normalized = normalize_towl_room_id(roomId);
  if (normalized === undefined) throw new Error("Cannot create an invitation for an invalid TOWL room ID.");
  const url = new URL(source.origin);
  url.pathname = "/towl";
  url.searchParams.set(TOWL_ROOM_PARAM, normalized);
  return url;
}

export function towl_departure_url(source: URL): URL {
  const url = new URL(source.toString());
  url.searchParams.delete(TOWL_ROOM_PARAM);
  if (is_direct_towl_path(url.pathname)) url.pathname = "/";
  return url;
}

export function resolve_towl_room_url(
  source: URL,
  makeRoomId: () => string = generate_towl_room_id,
): TowlRoomUrl {
  const state = classify_towl_room_url(source);
  if (state.kind === "valid") {
    return Object.freeze({ roomId: state.roomId, url: state.url, changed: state.changed });
  }
  if (state.kind === "invalid") {
    throw new Error("Cannot resolve a malformed TOWL room invitation without an explicit replacement choice.");
  }
  return create_towl_room_url(source, makeRoomId);
}
