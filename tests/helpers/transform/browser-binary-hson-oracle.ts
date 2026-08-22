import { hson } from "hson-live";

function fixed_hex(source: string): Uint8Array {
  const hex = source.replaceAll(/\s/g, "");
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(hex)) throw new Error("invalid literal Binary HSON hex fixture");
  return Uint8Array.from(hex.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? []);
}

function assert_bytes(actual: Uint8Array, expected: Uint8Array, label: string): void {
  if (actual.length !== expected.length || actual.some((byte, index) => byte !== expected[index])) {
    throw new Error(`${label}: Binary HSON bytes differ from the independently authored literal vector.`);
  }
}

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const GOLDEN_NULL = fixed_hex("48 53 4f 4e 12 00 00 20");
const GOLDEN_HIGH_SURROGATE = fixed_hex("48 53 4f 4e 11 00 00 00000001 d800");
const GOLDEN_NEGATIVE_ZERO = fixed_hex("48 53 4f 4e 12 00 00 23 8000000000000000");

const TYPED_UNITS = Object.freeze([
  Object.freeze({ name: "absent", unit: undefined, own: false, bytes: fixed_hex("48 53 4f 4e 15 00 00 00000001 10 00000004 006d 0061 0069 006e 01 00000001 00000005 0073 0074 0079 006c 0065 26 00000001 00000005 0077 0069 0064 0074 0068 25 23 4000000000000000 00 00 00000000") }),
  Object.freeze({ name: "undefined", unit: undefined, own: true, bytes: fixed_hex("48 53 4f 4e 15 00 00 00000001 10 00000004 006d 0061 0069 006e 01 00000001 00000005 0073 0074 0079 006c 0065 26 00000001 00000005 0077 0069 0064 0074 0068 25 23 4000000000000000 01 00 00000000") }),
  Object.freeze({ name: "empty", unit: "", own: true, bytes: fixed_hex("48 53 4f 4e 15 00 00 00000001 10 00000004 006d 0061 0069 006e 01 00000001 00000005 0073 0074 0079 006c 0065 26 00000001 00000005 0077 0069 0064 0074 0068 25 23 4000000000000000 02 00000000 00 00000000") }),
  Object.freeze({ name: "px", unit: "px", own: true, bytes: fixed_hex("48 53 4f 4e 15 00 00 00000001 10 00000004 006d 0061 0069 006e 01 00000001 00000005 0073 0074 0079 006c 0065 26 00000001 00000005 0077 0069 0064 0074 0068 25 23 4000000000000000 02 00000002 0070 0078 00 00000000") }),
] as const);

function value_node(value: string | number | boolean | null) {
  return { $_tag: typeof value === "string" ? "_hson_str" : "_hson_val", $_content: [value] };
}

function typed_unit_node(unit: string | undefined, own: boolean) {
  const width: { value: number; unit?: string | undefined } = { value: 2 };
  if (own) width.unit = unit;
  return {
    $_tag: "_hson_elem",
    $_content: [{ $_tag: "main", $_content: [], $_attrs: { style: { width } } }],
  };
}

export function verify_browser_binary_exact_bytes_and_closure(): void {
  const node = value_node(null);
  const binary = hson.fromNode(node).toBinary();
  assert_bytes(binary.serialize(), GOLDEN_NULL, "basic serialize");
  const decoded = hson.fromBinary(GOLDEN_NULL).toNode();
  assert(decoded.$_tag === "_hson_val" && decoded.$_content[0] === null, "basic decode did not return the canonical null graph");
  assert_bytes(hson.fromNode(decoded).toBinary().serialize(), GOLDEN_NULL, "decode/encode closure");
}

export function verify_browser_binary_typed_units(): void {
  for (const vector of TYPED_UNITS) {
    const bytes = hson.fromNode(typed_unit_node(vector.unit, vector.own)).toBinary().serialize();
    assert_bytes(bytes, vector.bytes, `typed-unit ${vector.name} serialize`);
    const decoded = hson.fromBinary(vector.bytes).toNode();
    const child = decoded.$_content[0];
    assert(typeof child === "object" && child !== null, `typed-unit ${vector.name} child missing`);
    const width = child.$_attrs?.style?.width;
    assert(typeof width === "object" && width !== null, `typed-unit ${vector.name} width missing`);
    assert(Object.hasOwn(width, "unit") === vector.own, `typed-unit ${vector.name} own-presence differs`);
    assert(Reflect.get(width, "unit") === vector.unit, `typed-unit ${vector.name} value differs`);
    assert_bytes(hson.fromNode(decoded).toBinary().serialize(), vector.bytes, `typed-unit ${vector.name} closure`);
  }
}

export function verify_browser_binary_utf16_and_negative_zero(): void {
  const surrogate = value_node("\ud800");
  assert_bytes(hson.fromNode(surrogate).toBinary().serialize(), GOLDEN_HIGH_SURROGATE, "lone-surrogate serialize");
  const decodedSurrogate = hson.fromBinary(GOLDEN_HIGH_SURROGATE).toNode();
  assert(decodedSurrogate.$_content[0] === "\ud800", "lone surrogate did not round-trip as its original UTF-16 code unit");
  assert_bytes(hson.fromNode(decodedSurrogate).toBinary().serialize(), GOLDEN_HIGH_SURROGATE, "lone-surrogate closure");

  const decodedNegativeZero = hson.fromBinary(GOLDEN_NEGATIVE_ZERO).toNode();
  assert(Object.is(decodedNegativeZero.$_content[0], -0), "negative zero did not remain negative zero");
  assert_bytes(hson.fromNode(decodedNegativeZero).toBinary().serialize(), GOLDEN_NEGATIVE_ZERO, "negative-zero closure");
}

export async function verify_browser_binary_sha256(): Promise<void> {
  const representation = hson.fromNode(typed_unit_node("px", true)).toBinary();
  const bytes = representation.serialize();
  assert_bytes(bytes, TYPED_UNITS[3].bytes, "SHA source bytes");
  const web_crypto_bytes: Uint8Array<ArrayBuffer> = new Uint8Array(bytes.length);
  web_crypto_bytes.set(bytes);
  const expected = hex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", web_crypto_bytes)));
  assert(await representation.sha256() === expected, "Binary SHA-256 did not hash the exact serialized bytes with browser WebCrypto");
}
