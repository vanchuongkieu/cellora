// @ts-check
import { defineEcConfig } from "@astrojs/starlight/expressive-code"

/**
 * Code block colors per theme: a flat, light gray surface like shadcn/ui.
 * (Kept here, not in astro.config: functions must live in this file.)
 * @param {{ theme: { type: string } }} context
 */
const codeSurface = ({ theme }) => (theme.type === "dark" ? "#171717" : "#f7f7f7")
/** @param {{ theme: { type: string } }} context */
const codeDivider = ({ theme }) => (theme.type === "dark" ? "#262626" : "#e5e5e5")

export default defineEcConfig({
  themes: ["github-light", "github-dark"],
  // Shell snippets look like any other code block (no terminal window chrome)
  defaultProps: { overridesByLang: { "bash,sh,shell,zsh,powershell": { frame: "code" } } },
  styleOverrides: {
    borderRadius: "0.75rem",
    borderColor: "transparent",
    codeFontSize: "0.8125rem",
    codeBackground: codeSurface,
    frames: {
      frameBoxShadowCssValue: "none",
      editorBackground: codeSurface,
      terminalBackground: codeSurface,
      editorTabBarBackground: codeSurface,
      editorActiveTabBackground: codeSurface,
      terminalTitlebarBackground: codeSurface,
      editorTabBarBorderBottomColor: codeDivider,
      terminalTitlebarBorderBottomColor: codeDivider,
      editorActiveTabIndicatorTopColor: "transparent",
      editorActiveTabBorderColor: "transparent",
    },
  },
})
