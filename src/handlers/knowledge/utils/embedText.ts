import fetch from "node-fetch";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_EMBED_MODEL = "text-embedding-ada-002";

/**
 * Get an embedding vector for a single text using OpenAI's API.
 */
export async function embedTextOpenAI(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: OPENAI_EMBED_MODEL,
    }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || "OpenAI embedding error");
  return data.data[0].embedding;
}

/**
 * Get embedding vectors for an array of texts using OpenAI's API.
 * Now expects batching to be handled by the caller.
 */
export async function embedTextsOpenAI(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: OPENAI_EMBED_MODEL,
    }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || "OpenAI embedding error");
  return data.data.map((item: any) => item.embedding);
}
