/**
 * Splits text into fixed-size chunks with optional overlap.
 * @param text The input text
 * @param chunkSize The size of each chunk (default: 1000)
 * @param overlap The number of overlapping characters between chunks (default: 200)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200,
): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}
