export type Result<T> = [T, null] | [null, Error]

export function tc<T>(p: Promise<T>): Promise<Result<T>> {
  return p
    .then(v => [v, null] as [T, null])
    .catch(e => [null, e instanceof Error ? e : new Error(String(e))])
}
