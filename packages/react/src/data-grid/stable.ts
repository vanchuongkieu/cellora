import { useMemo } from "react"

const ids = new WeakMap<object, number>()
let lastId = 0
const idOf = (value: object) => {
  let id = ids.get(value)
  if (id === undefined) ids.set(value, (id = ++lastId))
  return id
}

const typeName = (type: unknown) => (typeof type === "string" ? type : typeof type === "symbol" ? String(type) : `fn#${idOf(type as object)}`)

/**
 * Text that changes exactly when the declaration did: plain values by content,
 * functions and components by identity, React elements by their type, key and
 * props (recursively). JSX is rebuilt on every render of the parent, but
 * memoized rows only re-render when this text (and so the column or slot
 * objects) really differs. Anything that is not plain data (Map, Set, DOM
 * nodes, class instances) counts by identity.
 */
export function signatureOf(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === "function") return `fn#${idOf(item)}`
    if (item === null || typeof item !== "object") return item
    if ("$$typeof" in item) {
      const { type, key, props } = item as unknown as { type: unknown; key: unknown; props: unknown }
      return { $el: typeName(type), key, props }
    }
    if (Array.isArray(item)) return item
    const proto = Object.getPrototypeOf(item)
    return proto === Object.prototype || proto === null ? item : `obj#${idOf(item)}`
  })
}

/** Keeps `value` until `signature` changes. */
export function useStable<T>(value: T, signature: string): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the signature is the dependency on purpose
  return useMemo(() => value, [signature])
}
