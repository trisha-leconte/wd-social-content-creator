import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { buildSystemPrompt, buildUserMessage, type DraftContext } from "./prompt";
import { ClassifiedDraftSchema, DraftSchema, type ClassifiedDraft, type Draft } from "./schema";

const MODEL = "claude-opus-5";

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic();
}

const CLASSIFY_SUFFIX = `

# Also classify this story
The bucket was not chosen in advance. Decide which bucket and series this story belongs to, and say in one line why. A story about Trisha doing something herself is LIVING_IT. Someone else's win is PEOPLE_LIVING_IT. A standalone belief or an action for the reader is THE_IDEA. Something she is making or building is BEHIND_THE_WORLD.`;

async function run<T>(ctx: DraftContext, schema: z.ZodType, extra: string): Promise<T> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: buildSystemPrompt(ctx) + extra,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(ctx) }],
    output_config: { format: zodOutputFormat(schema) },
  });

  if (!response.parsed_output) {
    throw new Error("The model's response could not be parsed into a draft. Try again.");
  }
  return response.parsed_output as T;
}

export async function generateDraft(ctx: DraftContext): Promise<Draft> {
  return run<Draft>(ctx, DraftSchema, "");
}

export async function classifyAndDraft(ctx: DraftContext): Promise<ClassifiedDraft> {
  return run<ClassifiedDraft>(ctx, ClassifiedDraftSchema, CLASSIFY_SUFFIX);
}
