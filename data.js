export const dailyQuests = [
  {
    id: "reading",
    title: "Reading",
    xp: 10,
    expectedHours: 1,
    penaltyXp: 5,
    description: "Read at least 10–15 minutes of German text.",
  },
  {
    id: "listening",
    title: "Listening",
    xp: 10,
    expectedHours: 1,
    penaltyXp: 5,
    description: "Listen to German audio/video for 15 minutes.",
  },
  {
    id: "writing",
    title: "Writing",
    xp: 15,
    expectedHours: 1,
    penaltyXp: 10,
    description: "Write 120–200 words in German.",
  },
  {
    id: "speaking",
    title: "Speaking",
    xp: 25,
    expectedHours: 1,
    penaltyXp: 10,
    description: "Speak in any topic in German for 2 minutes.",
  },
];

export const sideQuests = [
  {
    id: "focus",
    title: "Deep Focus (40 min)",
    xp: 20,
    rank: "b1",
    expectedHours: 1,
    penaltyXp: 5,
    description:
      "Listen to German audio for 40 minutes from DW news.\n(session 1: 20 min, session 2: 20 min)",
  },
  {
    id: "lecture",
    title: "Watch German Lecture (40 min)",
    xp: 25,
    rank: "b2",
    expectedHours: 1,
    penaltyXp: 10,
    description: "Watch any German lectures on science topics for 40 minutes.",
  },
  {
    id: "summary",
    title:
      "Summarize an Article (40 min = Listen 20 min + Write summary 20 min)",
    xp: 25,
    rank: "c1",
    expectedHours: 1,
    penaltyXp: 10,
    description:
      "Read or listen to any topic for 20 minutes and summarize it within 20 minutes.",
  },
];

export const ranks = [
  { id: "b1", name: "B1", minXp: 0, maxXp: 1000 },
  { id: "b2", name: "B2", minXp: 1000, maxXp: 2500 },
  { id: "c1", name: "C1", minXp: 2500, maxXp: 4000 },
];

export const rankTrials = {
  b2: "Speak for 10 minutes on one topic without notes.",
  c1: "Explain a complex topic for 15 minutes and write a summary.",
};

export const weeklyBosses = {
  b1: {
    id: "boss-b1",
    title: "B1 Core Dungeon",
    xp: 100,
    minDailies: 5,
    tasks: [
      "Study German on 5 different days",
      "Read one full article or chapter",
      "Write 150–200 words in German",
      "Speak German for 30 minutes total",
      "Review and correct mistakes",
    ],
  },

  b2: {
    id: "boss-b2",
    title: "B2 Core Dungeon",
    xp: 150,
    minDailies: 6,
    tasks: [
      "Study German on 6 different days",
      "Read two long-form texts",
      "Write a 300-word structured text",
      "Speak German for 45 minutes total",
      "Summarize one complex topic orally",
    ],
  },

  c1: {
    id: "boss-c1",
    title: "C1 Mastery Dungeon",
    xp: 200,
    minDailies: 7,
    tasks: [
      "Study German every day this week",
      "Read an academic or advanced text",
      "Write a 400+ word essay",
      "Speak German for 60 minutes total",
      "Explain a complex topic clearly",
    ],
  },
};

export const mainQuests = {
  b1: [
    "Complete all daily quests at least once",
    "Reach 1000 XP",
    "Defeat the B1 weekly boss",
  ],
  b2: [
    "Write 3 structured texts",
    "Speak German for 30 minutes without notes",
    "Defeat the B2 weekly boss",
  ],
  c1: [
    "Write a 400+ word essay",
    "Explain a complex topic fluently",
    "Defeat the C1 mastery dungeon",
  ],
};
