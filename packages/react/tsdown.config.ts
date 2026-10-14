import { defineConfig } from "tsdown"

// dependencies and peerDependencies are left external by tsdown
export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  exports: {
    // Hand-written CSS entry (tells Tailwind to scan the package): `@import "@cellora/react/styles.css"`
    customExports: { "./styles.css": "./styles.css" },
  },
  // Everything here uses hooks: mark the bundle as client code so React Server
  // Components frameworks (Next.js App Router) can import it directly
  banner: { js: '"use client"' },
})
