// ───────────────────────────────────────────────
// IMPORTS & DEV FLAGS
// ───────────────────────────────────────────────
import {
  dailyQuests,
  sideQuests,
  ranks,
  rankTrials,
  weeklyBosses,
  mainQuests,
} from "./data.js";

const DEV_RESET = false;

// ───────────────────────────────────────────────
// GLOBAL STATE (CANONICAL SHAPE)
// ───────────────────────────────────────────────
let state = {
  player: {
    xp: 0,
    currentRank: "b1",
    unlockedRanks: ["b1"],
    mainQuestProgress: {},
    streak: 0, // consecutive active days ✅
  },

  daily: {
    completedQuests: {},
    sideQuestUsage: {},
    lastDay: null,
    weeklyActiveDays: 0,
    timeBankMs: 24 * 60 * 60 * 1000,
    lastTimeTick: Date.now(),
    xpGained: 0,
    xpHistory: {},
  },

  quests: {
    activeTimed: {}, // questId -> { start, dayDeadline, failed, accounted }
  },

  ui: {
    expandedQuests: {},
  },

  bosses: {
    weeklyProgress: {},
    lastBossWeek: null,
    history: [],
  },
};

// ───────────────────────────────────────────────
// PERSISTENCE
// ───────────────────────────────────────────────
function load() {
  if (DEV_RESET) localStorage.removeItem("projektRPG");

  const saved = localStorage.getItem("projektRPG");
  if (!saved) return;

  const parsed = JSON.parse(saved);
  state.player = parsed.player ?? state.player;
  state.daily = parsed.daily ?? state.daily;
  state.quests = parsed.quests ?? state.quests;
  state.ui = parsed.ui ?? state.ui;
  state.bosses = parsed.bosses ?? state.bosses;
}

function save() {
  localStorage.setItem("projektRPG", JSON.stringify(state));
}

// ───────────────────────────────────────────────
// TIME UTILITIES
// ───────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function currentWeek() {
  const d = new Date();
  const year = d.getUTCFullYear();
  const week = Math.ceil(
    ((d - new Date(year, 0, 1)) / 86400000 +
      new Date(year, 0, 1).getDay() +
      1) /
      7
  );
  return `${year}-W${week}`;
}

function getXpMultiplier() {
  if (state.player.streak >= 7) return 1.5;
  if (state.player.streak >= 3) return 1.2;
  return 1;
}

// ───────────────────────────────────────────────
// RANK LOGIC
// ───────────────────────────────────────────────
function getCurrentRank() {
  return ranks.find((r) => r.id === state.player.currentRank);
}

function getNextRank() {
  const i = ranks.findIndex((r) => r.id === state.player.currentRank);
  return ranks[i + 1];
}

function unlockNextRank() {
  const rank = getCurrentRank();
  if (state.player.xp < rank.maxXp) return;

  const next = getNextRank();
  if (!next) return;

  state.player.currentRank = next.id;
  state.player.unlockedRanks.push(next.id);
  save();
  render();
}

function renderMainQuestBoard() {
  const box = document.getElementById("mainQuests");
  box.innerHTML = "";

  const rank = state.player.currentRank;
  const quests = mainQuests[rank];
  if (!quests) return;

  quests.forEach((text, i) => {
    const done = state.player.mainQuestProgress[`${rank}-${i}`];

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.marginBottom = "0.4rem";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!done;

    checkbox.onchange = () => {
      state.player.mainQuestProgress[`${rank}-${i}`] = checkbox.checked;
      save();
    };

    const label = document.createElement("span");
    label.textContent = text;
    label.style.marginLeft = "0.5rem";
    label.style.opacity = done ? "0.6" : "1";

    row.append(checkbox, label);
    box.append(row);
  });
}

function hasUnlockedRank(requiredRank) {
  if (!requiredRank) return true;

  const playerIndex = ranks.findIndex((r) => r.id === state.player.currentRank);
  const requiredIndex = ranks.findIndex((r) => r.id === requiredRank);

  return playerIndex >= requiredIndex;
}

// ───────────────────────────────────────────────
// DAILY & WEEKLY RESET
// ───────────────────────────────────────────────
function resetIfNewDay() {
  const now = today();
  if (state.daily.lastDay === now) return;
  if (state.daily.lastDay) {
    state.daily.xpHistory[state.daily.lastDay] = state.daily.xpGained;
  }
  if (state.daily.xpGained > 0) {
    state.player.streak += 1;
  } else {
    state.player.streak = 0;
  }

  Object.values(state.quests.activeTimed).forEach((q) => {
    if (!q.failed) {
      q.failed = true;
      state.player.xp = Math.max(0, state.player.xp - 5);
    }
  });

  state.quests.activeTimed = {};
  state.daily.completedQuests = {};
  state.daily.sideQuestUsage = {};
  state.daily.timeBankMs = 24 * 60 * 60 * 1000;
  state.daily.lastDay = now;
  state.daily.xpGained = 0;

  save();
}

function resetIfNewWeek() {
  const week = currentWeek();
  if (state.bosses.lastBossWeek === week) return;
  state.bosses.lastBossWeek = null;
  save();
}

// ───────────────────────────────────────────────
// TIME ENFORCEMENT (LIVE SYSTEM)
// ───────────────────────────────────────────────
function enforceQuestTimers() {
  const now = Date.now();
  const delta = now - state.daily.lastTimeTick;
  state.daily.lastTimeTick = now;

  const hasActive = Object.values(state.quests.activeTimed).some(
    (q) => !q.failed
  );

  if (hasActive) {
    state.daily.timeBankMs = Math.max(0, state.daily.timeBankMs - delta);
  }

  Object.values(state.quests.activeTimed).forEach((q) => {
    if (!q.failed && now > q.dayDeadline) {
      q.failed = true;
      state.player.xp = Math.max(0, state.player.xp - 5);
    }
  });

  save();
}

// ───────────────────────────────────────────────
// FORMATTERS
// ───────────────────────────────────────────────
function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}`;
}

// ───────────────────────────────────────────────
// RENDERING
// ───────────────────────────────────────────────
function renderStatus() {
  const rank = getCurrentRank();

  document.getElementById("level").textContent = rank.name;
  document.getElementById("xp").textContent = state.player.xp;

  const cappedXp = Math.min(state.player.xp, rank.maxXp);
  const progress = (cappedXp - rank.minXp) / (rank.maxXp - rank.minXp);

  document.getElementById("xpFill").style.width = `${progress * 100}%`;

  const bankH = Math.floor(state.daily.timeBankMs / 3600000);
  const bankM = Math.floor((state.daily.timeBankMs % 3600000) / 60000);

  document.getElementById("xpText").textContent =
    `${cappedXp - rank.minXp} / ${rank.maxXp - rank.minXp} XP` +
    ` | Time Bank: ${bankH}h ${bankM}m`;

  const dailyXp = document.createElement("div");
  dailyXp.style.fontSize = "0.85rem";
  dailyXp.style.opacity = "0.75";
  dailyXp.textContent = `XP gained today: ${state.daily.xpGained}`;

  document.getElementById(
    "dailyXp"
  ).textContent = `XP gained today: ${state.daily.xpGained}`;

  const trialText = document.getElementById("rankTrialText");
  const trialBtn = document.getElementById("completeTrialBtn");

  const next = getNextRank();
  if (next && state.player.xp >= rank.maxXp) {
    trialText.style.display = "block";
    trialBtn.style.display = "block";
    trialText.textContent = rankTrials[next.id];
  } else {
    trialText.style.display = "none";
    trialBtn.style.display = "none";
  }

  document.getElementById("streakInfo").textContent = `Streak: ${
    state.player.streak
  } days | XP Multiplier: x${getXpMultiplier()}`;
}

function renderXpHistory() {
  const box = document.getElementById("xpHistory");
  if (!box) return;

  box.innerHTML = "";

  // LIVE today row
  const todayRow = document.createElement("div");
  todayRow.style.fontWeight = "600";
  todayRow.textContent = `Today: ${state.daily.xpGained} XP`;
  box.appendChild(todayRow);

  const entries = Object.entries(state.daily.xpHistory).slice(-6); // previous 6 days

  entries.forEach(([date, xp]) => {
    const row = document.createElement("div");
    row.style.fontSize = "0.85rem";
    row.style.opacity = "0.75";
    row.textContent = `${date}: ${xp} XP`;
    box.appendChild(row);
  });
}

// ───────────────────────────────────────────────
// DAILY QUESTS
// ───────────────────────────────────────────────
function renderDaily() {
  const box = document.getElementById("daily");
  box.innerHTML = "";

  dailyQuests.forEach((q) => {
    const done = state.daily.completedQuests[q.id];
    const active = state.quests.activeTimed[q.id];
    const failed = active?.failed;

    // ── Card container ──
    const container = document.createElement("div");
    container.style.padding = "0.75rem";
    container.style.borderRadius = "10px";
    container.style.background = "#232859";
    container.style.marginBottom = "0.75rem";

    // ── Title (NOT a button) ──
    const title = document.createElement("div");
    title.textContent = q.title;
    title.style.fontWeight = "600";
    title.style.cursor = "pointer";
    title.style.marginBottom = "0.25rem";

    title.onclick = () => {
      state.ui.expandedQuests[q.id] = !state.ui.expandedQuests[q.id];
      save();
      render();
    };

    // ── Description (collapsed by default) ──
    const details = document.createElement("div");
    details.style.display = state.ui.expandedQuests[q.id] ? "block" : "none";
    details.style.fontSize = "0.85rem";
    details.style.opacity = "0.75";
    details.style.marginBottom = "0.4rem";
    details.textContent = q.description;

    // ── Timer (small, muted) ──
    let timer = null;
    if (active && !failed) {
      timer = document.createElement("div");
      timer.style.fontSize = "0.8rem";
      timer.style.opacity = "0.7";
      timer.style.marginBottom = "0.3rem";
      timer.textContent =
        "Elapsed: " + formatElapsed(Date.now() - active.start);
    }

    // ── Action button (ONLY button) ──
    const btn = document.createElement("button");
    btn.style.fontSize = "0.85rem";
    btn.style.padding = "0.35rem 0.6rem";

    if (done) {
      btn.textContent = "Completed";
      btn.disabled = true;
    } else if (!active) {
      btn.textContent = "Accept Quest";
      btn.onclick = () => {
        state.quests.activeTimed[q.id] = {
          start: Date.now(),
          dayDeadline: endOfToday(),
          failed: false,
        };
        save();
        render();
      };
    } else if (!failed) {
      btn.textContent = `Complete (+${q.xp} XP)`;
      btn.onclick = () => {
        if (active.accounted) return;
        active.accounted = true;

        const gained = Math.round(q.xp * getXpMultiplier());
        state.player.xp += gained;
        state.daily.xpGained += gained;
        state.daily.completedQuests[q.id] = true;
        delete state.quests.activeTimed[q.id];
        delete state.ui.expandedQuests[q.id];

        save();
        render();
      };
    } else {
      btn.textContent = "Failed";
      btn.disabled = true;
    }

    // ── Assemble ──
    container.append(title);
    if (details.style.display === "block") container.append(details);
    if (timer) container.append(timer);
    container.append(btn);

    box.append(container);
  });
}

// ───────────────────────────────────────────────
// SIDE QUESTS
// ───────────────────────────────────────────────
function renderSide() {
  const box = document.getElementById("side");
  box.innerHTML = "";
  const MAX = 2;

  sideQuests
    .filter((q) => hasUnlockedRank(q.rank))
    .forEach((q) => {
      const used = state.daily.sideQuestUsage[q.id] ?? 0;

      const container = document.createElement("div");
      container.style.padding = "0.75rem";
      container.style.borderRadius = "10px";
      container.style.background = "#232859";
      container.style.marginBottom = "0.75rem";

      const title = document.createElement("div");
      title.textContent = q.title;
      title.style.fontWeight = "600";
      title.style.cursor = "pointer";
      title.style.marginBottom = "0.25rem";

      title.onclick = () => {
        state.ui.expandedQuests[q.id] = !state.ui.expandedQuests[q.id];
        save();
        render();
      };

      const details = document.createElement("div");
      details.style.display = state.ui.expandedQuests[q.id] ? "block" : "none";
      details.style.fontSize = "0.8rem";
      details.style.opacity = "0.65";
      details.textContent = q.description;

      const usage = document.createElement("div");
      usage.textContent = `Uses today: ${used}/${MAX}`;
      usage.style.fontSize = "0.8rem";
      usage.style.fontWeight = "bold";
      usage.style.color =
        used === 0 ? "#4ade80" : used === 1 ? "#facc15" : "#f87171";

      const btn = document.createElement("button");

      if (used >= MAX) {
        btn.textContent = "Limit Reached";
        btn.disabled = true;
      } else {
        btn.textContent = `Complete (+${q.xp} XP)`;
        btn.onclick = () => {
          const gained = Math.round(q.xp * getXpMultiplier());
          state.player.xp += q.xp;
          state.daily.xpGained += q.xp;
          state.daily.sideQuestUsage[q.id] = used + 1;
          save();
          render();
        };
      }

      container.append(title);
      if (details.style.display === "block") container.append(details);
      container.append(usage);
      container.append(btn);
      box.append(container);
    });
}

// ───────────────────────────────────────────────
// TIMELINE / BOSSES / HISTORY
// ───────────────────────────────────────────────
function renderTimeline() {
  const box = document.getElementById("timeline");
  box.innerHTML = "";
  ranks.forEach((r) => {
    const div = document.createElement("div");
    div.textContent = r.name;
    div.style.opacity = state.player.unlockedRanks.includes(r.id) ? "1" : "0.4";
    box.append(div);
  });
}

function renderDungeon() {
  const box = document.getElementById("dungeon");
  box.innerHTML = "";

  const week = currentWeek();
  const boss = weeklyBosses[state.player.currentRank];
  if (!boss) return;

  if (!state.bosses.weeklyProgress[week]) {
    state.bosses.weeklyProgress[week] = boss.tasks.map(() => false);
  }

  boss.tasks.forEach((t, i) => {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = state.bosses.weeklyProgress[week][i];
    cb.onchange = () => {
      state.bosses.weeklyProgress[week][i] = cb.checked;
      save();
    };
    box.append(
      cb,
      document.createTextNode(" " + t),
      document.createElement("br")
    );
  });

  const done = state.bosses.weeklyProgress[week].every(Boolean);
  const btn = document.createElement("button");
  btn.textContent = done ? "Boss Defeated" : `Defeat Boss (+${boss.xp})`;
  btn.disabled = !done;

  btn.onclick = () => {
    state.player.xp += boss.xp;
    state.bosses.lastBossWeek = week;
    state.bosses.history.push({ week, title: boss.title });
    save();
    render();
  };

  box.append(btn);
}

function renderBossHistory() {
  const box = document.getElementById("bossHistory");
  box.innerHTML = "";
  state.bosses.history.forEach((b) => {
    const div = document.createElement("div");
    div.textContent = `${b.week} — ${b.title}`;
    box.append(div);
  });
}

// ───────────────────────────────────────────────
// APP LIFECYCLE
// ───────────────────────────────────────────────
function render() {
  renderStatus();
  renderDaily();
  renderSide();
  renderDungeon();
  renderTimeline();
  renderBossHistory();
  renderMainQuestBoard();
  renderXpHistory();
}

let liveTimer = null;

function startLiveTimer() {
  if (liveTimer) return;
  liveTimer = setInterval(() => {
    enforceQuestTimers();
    render();
  }, 1000);
}

function runWelcomeAnimation() {
  const overlay = document.getElementById("welcomeOverlay");
  if (!overlay) return;

  setTimeout(() => {
    overlay.classList.add("hidden");
  }, 1200);

  setTimeout(() => {
    overlay.remove();
  }, 2200);
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  resetIfNewDay();
  resetIfNewWeek();
  render();
  startLiveTimer();

  runWelcomeAnimation();

  document
    .getElementById("completeTrialBtn")
    ?.addEventListener("click", unlockNextRank);
});
