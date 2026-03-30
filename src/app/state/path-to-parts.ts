

export function path_to_parts(path: string): (string | number)[] {
  const src = path.trim();
  if (src === "") return [];

  const parts: (string | number)[] = [];
  let buf = "";

  const pushBuf = (): void => {
    const raw = buf.trim();
    buf = "";

    if (raw === "") return;

    // CHANGED: plain numeric segments become array indexes
    if (/^\d+$/.test(raw)) {
      parts.push(Number.parseInt(raw, 10));
      return;
    }

    parts.push(raw);
  };

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    // CHANGED: dot ends the current segment
    if (ch === ".") {
      pushBuf();
      continue;
    }

    // CHANGED: bracket index support, e.g. foo[0]
    if (ch === "[") {
      pushBuf();

      const closeIx = src.indexOf("]", i + 1);
      if (closeIx < 0) {
        throw new Error(`path_to_parts(): missing closing ] in path "${path}"`);
      }

      const inner = src.slice(i + 1, closeIx).trim();
      if (!/^\d+$/.test(inner)) {
        throw new Error(
          `path_to_parts(): only numeric bracket indexes are supported in path "${path}"`
        );
      }

      parts.push(Number.parseInt(inner, 10));
      i = closeIx;
      continue;
    }

    buf += ch;
  }

  pushBuf();
  return parts;
}