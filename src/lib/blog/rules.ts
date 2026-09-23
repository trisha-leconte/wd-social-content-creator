export const BLOG_RULES = {
  siteUrl: "https://wealthdailyapp.com",
  targetWordCount: { min: 1200, max: 2000 },

  structureRules: [
    "Answer the query in the first 100 words. No throat-clearing, no 'in this article we will explore'.",
    "Phrase every H2 as a question someone would actually type, not as a label.",
    "One idea per section. Someone skimming only the H2s should still get the answer.",
    "Never pad to hit a word count. If the topic is genuinely shorter, write it shorter.",
    "Close by resolving the question, then one call to action tied to a real deck or book.",
  ],

  contentRules: [
    "Follow every abstract claim with a concrete instance — ideally one of her real cards or exercises. That specificity is the thing Google cannot find anywhere else.",
    "Write from her point of view. A post with no opinion gets indexed and ignored.",
    "Link internally to real products by their real slug, but only where the link genuinely helps the reader.",
    "The target keyword belongs in the title, the first paragraph, one H2 and the meta description — and nowhere it does not read naturally.",
  ],

  doNotList: [
    "NEVER write a statistic, a percentage, a study, a survey or a named researcher. Not one. If a claim needs a number she has not supplied, make the claim qualitatively or leave it out. An invented '73% of readers' would damage her more than any missed ranking.",
    "NEVER write a detail about Trisha's life she did not say. No invented timeline, no invented job, no invented struggle.",
    "Never use AI tells: 'In today's fast-paced world', \"Let's dive in\", 'It's important to note', 'In conclusion', 'Moreover', 'Furthermore'.",
    "Never pad a list. No '10 ways' where only four are real.",
    "Never stuff the keyword. If a sentence exists to hold the keyword, delete the sentence.",
    "Never write a meta description that is a summary of the article. Write one that makes the answer sound worth reading.",
  ],
};
