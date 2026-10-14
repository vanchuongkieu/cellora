import { useEffect, useLayoutEffect } from "react"

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server. Layout effects
 * never run during server rendering anyway, but React 18 logs a warning for
 * each one it meets there; this keeps SSR / SSG output clean. Same behaviour
 * on the client.
 */
export const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect
