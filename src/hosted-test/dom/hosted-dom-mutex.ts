import { install_hosted_dom_runtime, type HostedDomRuntime, type HostedDomRuntimeOptions } from "./hosted-dom-runtime";

type LockMode = "read" | "write";
type LockRequest = {
  mode: LockMode;
  resolve(release: () => void): void;
};

const queue: LockRequest[] = [];
let readers = 0;
let writing = false;

function pump(): void {
  if (writing || queue.length === 0) return;
  const first = queue[0];
  if (first?.mode === "write") {
    if (readers !== 0) return;
    writing = true;
    queue.shift();
    first.resolve(() => {
      writing = false;
      pump();
    });
    return;
  }
  while (queue[0]?.mode === "read" && !writing) {
    const request = queue.shift();
    if (request === undefined) return;
    readers += 1;
    request.resolve(() => {
      readers -= 1;
      pump();
    });
  }
}

function acquire(mode: LockMode): Promise<() => void> {
  return new Promise((resolve) => {
    queue.push({ mode, resolve });
    pump();
  });
}

/** Shared guard for Node-only runners that require browser globals to remain absent. */
export async function with_hosted_node_globals<T>(run: () => Promise<T> | T): Promise<T> {
  const release = await acquire("read");
  try {
    return await run();
  } finally {
    release();
  }
}

/** Exclusive process-global ownership for one complete DOM-backed action. */
export async function with_hosted_dom_lock<T>(run: () => Promise<T> | T): Promise<T> {
  const release = await acquire("write");
  try {
    return await run();
  } finally {
    release();
  }
}

export async function with_hosted_dom_runtime<T>(
  run: (runtime: HostedDomRuntime) => Promise<T> | T,
  options?: HostedDomRuntimeOptions,
): Promise<T> {
  return with_hosted_dom_lock(async () => {
    const runtime = install_hosted_dom_runtime(options);
    try {
      return await run(runtime);
    } finally {
      runtime.dispose();
    }
  });
}
