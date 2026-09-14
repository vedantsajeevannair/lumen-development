import { Logger } from '@nestjs/common';

/**
 * The language-model fallback, grounded on a live snapshot of the backlog.
 *
 * Ported from the lumen-platform original with the Anthropic provider removed.
 * That path needed ANTHROPIC_API_KEY and billed per request; this deployment
 * exists to cost nothing, so the local model is not a fallback here — it is
 * the only provider. Ollama runs in a container on the same box.
 *
 * This is only ever reached when the parser in nlu.ts could not classify the
 * question. Everything it answers is still grounded: the snapshot below is
 * built from queries run at the moment of asking, and the model is told to
 * report from it rather than reason about the city. When it fails — not
 * pulled, not running, too slow — this returns null and the caller falls back
 * to its own reply, so the assistant degrades rather than breaks.
 */

const logger = new Logger('assistant/llm');

export type LlmSource = 'ollama';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:1b';

/**
 * How the platform works. Static because it describes the code, not the data —
 * it lets the model answer "how does severity work?" accurately instead of
 * inventing a plausible-sounding formula.
 */
const SYSTEM_FACTS = `
LUMEN is an AI-assisted civic damage reporting platform. Architecture:
  - Frontend: Vite + React SPA
  - Backend:  NestJS + Prisma REST API over PostgreSQL
  - AI:       FastAPI computer-vision service running onnxruntime
  - All of it runs in containers on a single Oracle Cloud ARM instance.

Detection: a YOLO model trained on RDD2022 emits four road-damage classes —
Pothole, Alligator, Transverse and Longitudinal. It detects nothing else. It
does not detect garbage, manholes, streetlights or waterlogging; if asked about
those, say the platform does not detect them.

Severity is scored 0-5 by the vision service as
min(5, mean_confidence * 3 + boxes * 0.5), so both how sure the model is and
how many defects it found raise it. Priority is derived from severity and from
how many other reports of the same class sit within 30 m.

Duplicates: a new report within 20 m of an open report of the same class is
rejected at intake as already known.

Material estimates come from measured pothole geometry, not from the
photograph, unless they are marked ESTIMATED.
`.trim();

/**
 * Extra rules for the local model only.
 *
 * The shared prompt asks for brevity and a larger model obliges. A 1B model
 * does not — it opens with "I'm happy to help you with that!", hedges about
 * not being an expert, then runs past the token limit and stops mid-sentence.
 * These rules are blunter and repeated because that is what a small model
 * responds to, and shorter output is also faster output on two ARM cores.
 */
const OLLAMA_EXTRA = `
STRICT OUTPUT RULES — follow these exactly:
- Maximum 3 sentences. Shorter is better.
- Start with the answer. No greeting, no "I'm happy to help", no "Great question".
- Never say you are not an expert, not a data analyst, or not a developer. You
  are the operations assistant and the data above is yours to report.
- No bullet points, no headings, no closing offer of further help.
- Never state a number that does not appear in the data above.
- NEVER write "he", "she", "his" or "her" about an engineer. Write the person's
  name again, or "they".
`.trim();

const SYSTEM_PROMPT = `
You are the LUMEN operations assistant, answering a municipal supervisor.
Report only what the data below supports. If it does not answer the question,
say so in one sentence.
`.trim();

export async function askOllama(
  context: string,
  question: string,
): Promise<string | null> {
  // A local model on two ARM cores is slower than an API, and the first call
  // also pays to load weights into memory. Generous, but bounded — a hung
  // request must not leave the user staring at a spinner.
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      // Low temperature: this is factual reporting, not writing.
      options: { temperature: 0.2, num_predict: 200 },
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n${OLLAMA_EXTRA}` },
        { role: 'user', content: `${context}\n\nQuestion: ${question}` },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const body = (await res.json()) as { message?: { content?: string } };
  return body.message?.content?.trim() || null;
}

/**
 * Ask the local model, grounded on a snapshot supplied by the caller.
 *
 * Returns null rather than throwing: an unreachable model is an expected
 * state, not an error worth failing the request over.
 */
export async function callLLM(
  snapshot: string,
  question: string,
  /** Extra source material — e.g. the canned explanation the question skirted. */
  extra?: string,
): Promise<{ text: string; source: LlmSource } | null> {
  const context =
    `SYSTEM FACTS\n${SYSTEM_FACTS}\n\nLIVE DATA (queried just now)\n${snapshot}` +
    (extra ? `\n\nRELEVANT PLATFORM DETAIL\n${extra}` : '');

  try {
    const text = await askOllama(context, question);
    if (text) return { text, source: 'ollama' };
    logger.warn('Ollama returned an empty reply');
  } catch (e) {
    logger.warn(`Ollama unavailable: ${(e as Error).message}`);
  }
  return null;
}
