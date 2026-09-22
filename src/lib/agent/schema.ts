import { z } from "zod";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

export const DraftSchema = z.object({
  captions: z.array(z.string()).length(3),
  hooks: z.array(z.string()).length(3),
  cta: z.string(),
  platformVariants: z.object({
    instagram: z.string(),
    linkedin: z.string(),
    facebook_threads: z.string(),
  }),
  suggestedVisual: z.string(),
  storyVersion: z.string(),
});

export type Draft = z.infer<typeof DraftSchema>;

/** Used by the CLI, where the bucket is not known in advance. */
export const ClassifiedDraftSchema = DraftSchema.extend({
  bucketKey: z.enum(BUCKET_KEYS),
  seriesKey: z.enum(SERIES_KEYS),
  classificationReason: z.string(),
});

export type ClassifiedDraft = z.infer<typeof ClassifiedDraftSchema>;
