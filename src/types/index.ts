export const BUCKET_KEYS = ["LIVING_IT", "PEOPLE_LIVING_IT", "THE_IDEA", "BEHIND_THE_WORLD"] as const;
export type BucketKey = (typeof BUCKET_KEYS)[number];

export const SERIES_KEYS = [
  "TODAY_I_LIVED_IT",
  "SOMEONE_LIVED_IT",
  "TRY_THIS",
  "FROM_PAGE_TO_PRACTICE",
  "BUILDING_WEALTH_DAILY",
  "IMAGINE_YOUR_IP_LIKE_THIS",
] as const;
export type SeriesKey = (typeof SERIES_KEYS)[number];

export const POST_STATUSES = ["idea", "captured", "drafted", "ready", "posted", "skipped"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const PLATFORM_KEYS = ["instagram", "linkedin", "facebook_threads"] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export type Lens = "consumer" | "creator";

/** A real card read out of the Wealth Daily database. */
export type CardCandidate = {
  activityId: string;
  productId: string;
  text: string;
  productTitle: string;
  chapterTitle: string | null;
};
