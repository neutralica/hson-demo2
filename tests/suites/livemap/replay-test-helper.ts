export function replay_fixture<TCommit>(
  map: Readonly<{ replay(input: never): TCommit }>,
  input: unknown,
): TCommit {
  return Reflect.apply(map.replay, map, [input]);
}

export function apply_fixture<TCommit>(
  map: Readonly<{ apply(input: never): TCommit }>,
  input: unknown,
): TCommit {
  return Reflect.apply(map.apply, map, [input]);
}
