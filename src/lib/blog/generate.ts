import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  buildOutlinePrompt,
  buildOutlineMessage,
  buildDraftPrompt,
  buildDraftMessage,
  type BlogContext,
  type OutlineResult,
} from "./prompt";
import { ArticleSchema, OutlineSchema, type Article } from "./schema";

const MODEL = "claude-opus-5";

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic();
}

export async function generateOutline(ctx: BlogContext): Promise<OutlineResult> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: buildOutlinePrompt(ctx), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildOutlineMessage(ctx) }],
    output_config: { format: zodOutputFormat(OutlineSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("The model's response could not be parsed into an outline. Try again.");
  }
  return response.parsed_output as OutlineResult;
}

/**
 * Articles MUST stream. The SDK refuses a non-streaming request whose
 * max_tokens implies a run longer than ten minutes — the ceiling works out
 * at 128000/6 ≈ 21333 tokens — and an article needs more headroom than that
 * once adaptive thinking is included. Calling `messages.parse` here throws
 * "Streaming is required for operations that may take longer than 10
 * minutes" before a single request leaves the machine. `messages.stream`
 * carries the same parsed output via `finalMessage()`.
 */
export async function generateArticle(
  ctx: BlogContext,
  outline: OutlineResult
): Promise<Article> {
  const response = await client()
    .messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: buildDraftPrompt(ctx), cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: buildDraftMessage(ctx, outline) }],
      output_config: { format: zodOutputFormat(ArticleSchema) },
    })
    .finalMessage();

  if (!response.parsed_output) {
    throw new Error("The model's response could not be parsed into an article. Try again.");
  }
  return response.parsed_output;
}
