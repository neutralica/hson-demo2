import { create_locus } from "hson-live/locus";
import type {
  JsonValue,
  LiveMap,
  LiveMapAuthority,
  Locus,
  LocusActionPayloads,
  LocusConnectionContext,
  LocusDisposer,
  LocusResult,
  LocusSocketLike,
  ProjectedLocusOptions,
} from "hson-live/types";

/** Production-owned registry for application Locus authorities. */
export type ApplicationLocusStore = Readonly<{
  has(key: string): boolean;
  get(key: string): Locus | undefined;
  create<
    TState extends JsonValue | undefined = JsonValue | undefined,
    TActions extends LocusActionPayloads = LocusActionPayloads,
  >(key: string, options?: ProjectedLocusOptions<TState, TActions>): LocusResult<Locus<LiveMap<TState>, TActions>>;
  set<
    TMap extends LiveMapAuthority,
    TActions extends LocusActionPayloads = LocusActionPayloads,
  >(key: string, locus: Locus<TMap, TActions>): LocusResult<Locus<TMap, TActions>>;
  delete(key: string): boolean;
  list(): readonly Readonly<{ id: string; host: Locus }>[];
  connect(key: string, socket: LocusSocketLike, context?: LocusConnectionContext): LocusResult<LocusDisposer>;
}>;

function failure(message: string, code: string): LocusResult<never> {
  return { ok: false, error: { message, code } };
}

/** Application-owned unbounded lookup utility; not a generic LiveHost service. */
export function create_application_locus_store(): ApplicationLocusStore {
  const loci = new Map<string, unknown>();
  const store: ApplicationLocusStore = {
    has: (key: string) => loci.has(key),
    get: (key: string) => loci.get(key) as Locus | undefined,
    create<
      TState extends JsonValue | undefined = JsonValue | undefined,
      TActions extends LocusActionPayloads = LocusActionPayloads,
    >(key: string, options: ProjectedLocusOptions<TState, TActions> = {}) {
      if (loci.has(key)) return failure(`Application Locus already exists: ${key}`, "LOCUS_STORE_DUPLICATE_ID");
      const locus = create_locus<TState, TActions>(options);
      loci.set(key, locus);
      return { ok: true, value: locus };
    },
    set<
      TMap extends LiveMapAuthority,
      TActions extends LocusActionPayloads = LocusActionPayloads,
    >(key: string, locus: Locus<TMap, TActions>) {
      if (loci.has(key)) return failure(`Application Locus already exists: ${key}`, "LOCUS_STORE_DUPLICATE_ID");
      loci.set(key, locus);
      return { ok: true, value: locus };
    },
    delete: (key: string) => loci.delete(key),
    list: () => Array.from(loci, ([id, host]) => Object.freeze({ id, host: host as Locus })),
    connect(key: string, socket: LocusSocketLike, context?: LocusConnectionContext) {
      const locus = loci.get(key) as Locus | undefined;
      if (locus === undefined) return failure(`Unknown application Locus: ${key}`, "LOCUS_STORE_UNKNOWN_ID");
      return { ok: true, value: locus.connect(socket, context) };
    },
  };
  return Object.freeze(store);
}
