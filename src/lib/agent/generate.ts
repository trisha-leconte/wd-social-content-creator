import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildSystemPrompt, buildUserMessage, type DraftContext } from "./prompt";
import { ClassificationSchema, DraftSchema, type Classification, type Draft } from "./schema";

const MODEL = "claude-opus-5";

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic();
}

/**
 * Sorting only. Carries no series skeleton and no examples on purpose: the
 * writing prompt must be built AFTER the series is known, or the model is
 * steered into a shape the story does not have and invents beats to fill it.
 */
const CLASSIFY_SYSTEM = `Sort one rough note into the bucket and series it belongs to. Do not write anything.

LIVING_IT — Trisha did something herself and is documenting what happened.
  TODAY_I_LIVED_IT
PEOPLE_LIVING_IT — someone else's win, result or testimonial.
  SOMEONE_LIVED_IT
THE_IDEA — a belief, or one action handed to the reader. No specific event.
  TRY_THIS · FROM_PAGE_TO_PRACTICE
BEHIND_THE_WORLD — something she is making, building, shipping or designing.
  BUILDING_WEALTH_DAILY · IMAGINE_YOUR_IP_LIKE_THIS

Judge only what the note actually says. Give one short sentence of reasoning.`;

export async function classifyStory(rawNotes: string): Promise<Classification> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: CLASSIFY_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: rawNotes }],
    output_config: { format: zodOutputFormat(ClassificationSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("The model could not sort that story into a bucket. Try again.");
  }
  return response.parsed_output;
}

export async function generateDraft(ctx: DraftContext): Promise<Draft> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: buildSystemPrompt(ctx), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildUserMessage(ctx) }],
    output_config: { format: zodOutputFormat(DraftSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("The model's response could not be parsed into a draft. Try again.");
  }
  return response.parsed_output;
}
