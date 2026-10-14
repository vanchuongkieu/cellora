import { useSyncExternalStore } from "react"
import { MAX_SCROLL_SIZE } from "@cellora/core"

// Every engine clamps element height to a fixed limit; Chrome/Safari use 2^25
// minus a bit. Nothing larger can exist, so never trust a bigger reading.
const ENGINE_CEILING = 33_554_428

let cached: number | undefined

/**
 * The tallest element this browser can lay out (Chrome/Safari ~33.5M px,
 * Firefox ~17.9M px), measured once. Rows fitting within it scroll 100%
 * natively; only content taller than this needs scaled scroll positions.
 * The limit is in CSS px, so browser zoom lowers it (200% zoom halves it).
 */
export function getMaxElementHeight(): number {
  if (cached !== undefined) return cached
  if (typeof document === "undefined" || !document.body) return MAX_SCROLL_SIZE

  const probe = document.createElement("div")
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;width:1px"
  document.body.appendChild(probe)
  probe.style.height = "100000000px" // far past any limit; the engine clamps it
  const measured = probe.getBoundingClientRect().height
  document.body.removeChild(probe)

  // Keep a 2% margin for borders, scrollbars and rounding
  cached = measured > 0 ? Math.floor(Math.min(measured, ENGINE_CEILING) * 0.98) : MAX_SCROLL_SIZE
  return cached
}

const noSubscription = () => () => {}
const fallback = () => MAX_SCROLL_SIZE

/**
 * The limit as a render value. The server (no DOM) and the hydrating client
 * both use the fallback, then the client re-renders with the measured limit,
 * so server-rendered grids hydrate without a mismatch. Measures nothing until
 * `enabled` (the probe forces a layout).
 */
export function useMaxElementHeight(enabled: boolean): number {
  return useSyncExternalStore(noSubscription, enabled ? getMaxElementHeight : fallback, fallback)
}
