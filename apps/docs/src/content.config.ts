import { defineCollection } from "astro:content"
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders"
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema"

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // Overrides for Starlight's UI strings (src/content/i18n/<lang>.json); built-in English and Vietnamese are used otherwise
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
}
