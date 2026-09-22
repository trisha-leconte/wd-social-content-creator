import type { BucketKey, SeriesKey } from "@/types";

export const BUCKETS: {
  key: BucketKey;
  name: string;
  targetPercent: number;
  description: string;
  whatItIsNot: string;
  color: string;
}[] = [
  {
    key: "LIVING_IT",
    name: "I'M LIVING IT",
    targetPercent: 40,
    description:
      "Trisha doing the thing. Today's card told her to do something; she did it; here is what happened. Mundane is good — mundane is what makes the movement believable.",
    whatItIsNot: "Not teaching. Documenting. There is no lesson at the end.",
    color: "#1E6F4C",
  },
  {
    key: "PEOPLE_LIVING_IT",
    name: "PEOPLE ARE LIVING IT",
    targetPercent: 25,
    description:
      "Someone else's evidence — a testimonial, a screenshot, a win, an unexpected result. Reposted with a real reaction and an invitation.",
    whatItIsNot:
      "Not a customer quote wall. The point is behaviour-setting: when I do something because of Wealth Daily, I share the evidence.",
    color: "#A0650F",
  },
  {
    key: "THE_IDEA",
    name: "THE IDEA",
    targetPercent: 20,
    description:
      "Bold, simple beliefs. Short lines. These make people understand what Wealth Daily stands for.",
    whatItIsNot: "Not advertisements. Beliefs. Never a feature in disguise.",
    color: "#2B4A7D",
  },
  {
    key: "BEHIND_THE_WORLD",
    name: "BEHIND THE WORLD",
    targetPercent: 15,
    description:
      "What Trisha is building — a deck being designed, an author's book becoming an experience. Where the author/coach audience quietly recognises itself.",
    whatItIsNot:
      "Never corporate B2B mode. No value propositions. It arrives as 'this is my favourite part'.",
    color: "#6B3A67",
  },
];

export const SERIES: {
  key: SeriesKey;
  name: string;
  bucketKey: BucketKey;
  promptQuestions: string[];
  structureSkeleton: string;
  examples: string[];
}[] = [
  {
    key: "TODAY_I_LIVED_IT",
    name: "TODAY I LIVED IT",
    bucketKey: "LIVING_IT",
    promptQuestions: [
      "What did today's card tell you to do?",
      "Did you want to do it? Be honest.",
      "Did you do it anyway?",
      "What actually happened?",
    ],
    structureSkeleton:
      "Assignment → resistance → did it anyway → what happened → proof mark. Open on the resistance, never on the insight.",
    examples: [
      "Today's card told me to ______.\n\nDidn't particularly feel like doing it. 😂\n\nDid it anyway.\n\nHere's what happened…",
      "It started with picking up pennies.\n\nThen $1.\n\nThen $20.\n\nThen a completely unexpected $3,000 check showed up.\n\nThis is why I'm obsessed with experimenting with the things I read instead of just reading them.",
      "Today's card told me to do ______ for my husband.\n\nHere's what happened…",
    ],
  },
  {
    key: "SOMEONE_LIVED_IT",
    name: "SOMEONE LIVED IT",
    bucketKey: "PEOPLE_LIVING_IT",
    promptQuestions: [
      "Who did the thing, and what did they do?",
      "How far in were they — what day?",
      "What is your honest reaction to it?",
    ],
    structureSkeleton:
      "Their evidence → your genuine reaction → what LIVE IT means → the invitation back to the reader.",
    examples: [
      "LOOK WHAT SARAH DID. 😭\n\nDay 12 of ______.\n\nThis is what LIVE IT means.\n\nNot learning more.\n\nActually doing something with what you already know.\n\nWhat did YOU live today?",
    ],
  },
  {
    key: "TRY_THIS",
    name: "TRY THIS",
    bucketKey: "THE_IDEA",
    promptQuestions: [
      "What is the one action you want them to take today?",
      "How small can you make it?",
      "What belief sits underneath it?",
    ],
    structureSkeleton: "The belief, stated flat → the action, made tiny → the invitation.",
    examples: [
      "STOP READING PERSONAL DEVELOPMENT BOOKS.\n\nOkay. Not literally. 😂\n\nBut before you buy another one…\n\nDo something with the last one.",
      "YOU DON'T NEED MORE INFORMATION.\n\nYou need evidence.",
      "LESS COURSEWORK.\nMORE LIFE WORK.",
      "You highlighted it.\n\nYou saved it.\n\nYou underlined it.\n\nYou told your friend about it.\n\nCool.\n\nDid you do it?",
      "DON'T JUST LEARN IT.\n\nLIVE IT.",
    ],
  },
  {
    key: "FROM_PAGE_TO_PRACTICE",
    name: "FROM PAGE → PRACTICE",
    bucketKey: "THE_IDEA",
    promptQuestions: [
      "Which book or idea are you taking?",
      "What does the book actually say?",
      "What would doing it for 30 days look like?",
    ],
    structureSkeleton: "The idea as written → the experiment it becomes → what you found.",
    examples: [
      "I tried this experiment from The Science of Getting Rich.\n\nHere's what happened…",
    ],
  },
  {
    key: "BUILDING_WEALTH_DAILY",
    name: "BUILDING WEALTH DAILY",
    bucketKey: "BEHIND_THE_WORLD",
    promptQuestions: [
      "What are you working on right now?",
      "Why does it exist — what problem did you hit?",
      "What is the fun part of it?",
    ],
    structureSkeleton:
      "What you're making → why it exists → the detail you're enjoying. Demonstrate the feature by showing evidence, never by announcing it.",
    examples: [
      "Today's proof.\n\nDidn't want to do it.\n\nDid it anyway.\n\nDay 6. ✓\n\nI'm collecting these in Wealth Daily because apparently I need receipts that I'm actually changing. 😂",
    ],
  },
  {
    key: "IMAGINE_YOUR_IP_LIKE_THIS",
    name: "IMAGINE YOUR IP LIKE THIS",
    bucketKey: "BEHIND_THE_WORLD",
    promptQuestions: [
      "Whose work, or which book, are you transforming?",
      "What does the ladder look like for it?",
      "What would their audience actually DO?",
    ],
    structureSkeleton:
      "BOOK → ACTIVITY EXPERIENCE → CARD DECK → STICKERS → CHALLENGE → COMMUNITY → PHYSICAL WORKBOOK + QR, then: imagine this was YOUR book.",
    examples: [
      "I'm working on something for an author today and this is exactly why I built Wealth Daily.\n\nThey already have YEARS of incredible IP.\n\nThey don't need another course.\n\nI'm taking their ideas and turning them into things their audience can actually DO.\n\nActivities.\n\nExperiments.\n\nA card deck.\n\nChallenges.\n\nAnd the entire experience looks like THEIR brand.\n\nThis is my favorite part.",
      "This is what I mean when I tell authors I don't just want to put their book inside an app.\n\nImagine someone reads YOUR idea…\n\nthen spends 30 days actually testing it.\n\nThat's what I want to build.",
    ],
  },
];

export const WEEKLY_SLOTS: {
  key: string;
  dayOfWeek: number;
  label: string;
  bucketKey: BucketKey;
  defaultSeriesKey: SeriesKey;
}[] = [
  { key: "mon", dayOfWeek: 1, label: "LIVE IT", bucketKey: "LIVING_IT", defaultSeriesKey: "TODAY_I_LIVED_IT" },
  { key: "tue", dayOfWeek: 2, label: "THE IDEA", bucketKey: "THE_IDEA", defaultSeriesKey: "TRY_THIS" },
  { key: "thu", dayOfWeek: 4, label: "PROOF", bucketKey: "PEOPLE_LIVING_IT", defaultSeriesKey: "SOMEONE_LIVED_IT" },
  { key: "sat", dayOfWeek: 6, label: "BUILDING", bucketKey: "BEHIND_THE_WORLD", defaultSeriesKey: "BUILDING_WEALTH_DAILY" },
];

export const STRATEGY_PROFILE = {
  oneStory:
    "I spent years consuming personal development. Now I'm experimenting with actually living it. I built Wealth Daily to help me do that. I'm inviting other people to LIVE IT with me — and I'm helping authors and coaches turn their teachings into things people can actually practice.",
  audiences: [
    { who: "Consumer", thought: "I want to do this." },
    { who: "Author or coach", thought: "I want my audience doing this with MY work." },
  ],
  voiceRules: [
    "Open on the resistance, not the lesson. Assignment → resistance → did it anyway → what happened.",
    "Never explain the moral. The reader supplies it. This is documentation, not teaching.",
    "End on an open loop. Stop one beat before the conclusion.",
    "Short lines. Real white space between them. Often one sentence per line.",
    "Specific nouns over summary: 'Trader Joe's' not 'the store'; '$3,000 check' not 'unexpected money'.",
    "Use escalation ladders where the story has one: pennies → $1 → $20 → $3,000.",
    "Mundane is an asset. Never inflate a small result — the ordinariness is what makes it believable.",
    "Self-deprecation is the trust mechanism. Laugh at your own resistance; that is what stops it reading as preachy.",
    "Emoji sparingly, as tone, never as decoration and never as section markers.",
    "The ask is an invitation, never a platform instruction: a question a friend would ask, answerable in about four words, about the reader rather than about Trisha.",
    "Demonstrate features by showing the evidence, never by announcing them.",
    "Vary the opener. Do not begin consecutive posts the same way.",
  ],
  doNotList: [
    "Never write feature announcements: 'WEALTH DAILY HAS STREAKS!', 'WEALTH DAILY HAS CARD DECKS!', 'DOWNLOAD WEALTH DAILY!', 'AUTHORS — JOIN MY PLATFORM!'",
    "Never use platform-instruction CTAs: 'Comment below!', 'Tag a friend! 👇', 'Double tap if you agree!', 'Link in bio!'",
    "Never ask a big abstract question such as 'What's your biggest struggle with personal development?' — it does not get answered.",
    "Never open with teaching voice: 'Here's what I learned…', '3 things this taught me', 'Remember:'.",
    "Never write in corporate B2B register. No value propositions, no 'solutions', no 'leverage'.",
    "Never claim a result that did not happen, and never round a small win up into a big one.",
    "Never use hashtag walls. At most a few, and only where they read naturally.",
  ],
  ctaRotation: [
    "Try this today.",
    "Show me your proof.",
    "Come LIVE IT with us.",
    "Save this and actually DO it.",
    "Send this to someone who needs to do it with you.",
    "What did YOU live today?",
    "Imagine your IP like this.",
    'If you have a book or framework you\'d love to turn into an experience, message me "LIVE IT".',
  ],
  openerBank: [
    "Today's card told me to…",
    "I didn't want to do this.",
    "It started with…",
    "Okay this is small but…",
    "LOOK WHAT ______ DID.",
    "I tried this experiment from…",
    "I'm working on something for an author today…",
    "You highlighted it. You saved it. You underlined it.",
  ],
  profileBio:
    "Building Wealth Daily. LIVE IT = turning personal development into action. Authors & coaches: your audience doesn't need another course.",
  pinnedPosts: [
    {
      title: "WHAT IS LIVE IT?",
      brief:
        "The manifesto. Years of consuming personal development, now experimenting with actually living it. What LIVE IT means and why evidence beats information.",
    },
    {
      title: "WHAT IS WEALTH DAILY?",
      brief:
        "Show someone actually using it — a card, an action, a photo of proof, a streak of evidence. Demonstrate, never announce.",
    },
    {
      title: "FOR AUTHORS + COACHES",
      brief:
        "Your audience doesn't need another course. Give them something to LIVE. Show the ecosystem: book → activities → deck → stickers → challenge → community → workbook.",
    },
  ],
};

export const STORY_PROMPTS: string[] = [
  "Walking Lolo and doing today's activity? Take a picture. 'Today's LIVE IT ☝️'",
  "Designing a card deck? Screen recording. 'Building something fun today 👀'",
  "Someone sent you a result? Screenshot it. 'THIS. This is why I'm building this.'",
  "Finished something? Picture. 'Proof. ✓'",
  "Don't feel like today's activity? Even better. Say so, then post the after: 'Did it. Annoyingly glad I did. 😂'",
  "Mid-build on something for an author? Show the screen. No explanation needed.",
  "Bought or reread a book? Photo. 'What would you actually DO with this?'",
];
