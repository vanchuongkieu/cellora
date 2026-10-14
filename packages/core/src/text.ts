/** Text helpers shared by search and filters. */

// eslint-disable-next-line no-control-regex -- the range deliberately starts at NUL (everything that is not ASCII)
const NON_ASCII = /[^\u0000-\u007f]/
const COMBINING_MARKS = /[̀-ͯ]/g

/** Whether the text has anything outside ASCII (so folding could change it). */
export const hasAccents = (text: string) => NON_ASCII.test(text)

// Folded text per input. Cell values repeat (names, departments, statuses),
// and a lookup is several times cheaper than normalizing again. Bounded:
// cleared once full, so a million distinct values cannot pile up.
const folded = new Map<string, string>()
const FOLD_CACHE_SIZE = 20_000

/**
 * Strip accents: "Nguyễn Văn" -> "Nguyen Van", "Crème brûlée" -> "Creme brulee".
 * Vietnamese đ / Đ are separate letters (not a mark), so they are mapped by hand.
 * ASCII text is returned as is, so plain data costs nothing.
 */
export function foldAccents(text: string): string {
  if (!NON_ASCII.test(text)) return text
  let result = folded.get(text)
  if (result === undefined) {
    result = text.normalize("NFD").replace(COMBINING_MARKS, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    if (folded.size >= FOLD_CACHE_SIZE) folded.clear()
    folded.set(text, result)
  }
  return result
}
