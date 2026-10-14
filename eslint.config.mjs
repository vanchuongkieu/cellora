import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

// Lints the library packages with the same rules as the playground app
// (which keeps its own config under apps/playground-react).
export default defineConfig([
  globalIgnores(["**/dist", "apps/**", "**/node_modules"]),
  {
    files: ["packages/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
])
