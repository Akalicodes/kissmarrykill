import type { Category } from "@/lib/types";

/**
 * Easter eggs triggered by specific Kiss/Marry/Kill combos.
 * Returns the first matching toast, or null if the picks aren't special.
 *
 * Add new combos here freely — they're cheap, and screenshots of them
 * tend to do well on Twitter/Reddit.
 */
export type EasterEgg = {
  id: string;
  title: string;
  body: string;
};

export function detectEasterEgg(picks: Record<Category, string>): EasterEgg | null {
  const { kiss, marry, kill } = picks;

  for (const rule of RULES) {
    if (rule.match(kiss, marry, kill)) return rule.egg;
  }
  return null;
}

const RULES: Array<{
  match: (kiss: string, marry: string, kill: string) => boolean;
  egg: EasterEgg;
}> = [
  {
    match: (_k, m, x) => m === "claude" && x === "chatgpt",
    egg: {
      id: "anthropic_stan",
      title: "anthropic stan detected",
      body: "we see you. claude sees you. it's beautiful.",
    },
  },
  {
    match: (_k, m, x) => m === "chatgpt" && x === "claude",
    egg: {
      id: "openai_loyalist",
      title: "openai loyalist confirmed",
      body: "ride or die. sam altman would be proud.",
    },
  },
  {
    match: (_k, m) => m === "cursor",
    egg: {
      id: "developer_detected",
      title: "developer alert",
      body: "you marry your IDE. we respect it.",
    },
  },
  {
    match: (_k, m, x) => m === "grok" && x !== "grok",
    egg: {
      id: "elon_will_see",
      title: "elon will see this",
      body: "and he will retweet it.",
    },
  },
  {
    match: (_k, m, x) => m === "cursor" && x === "copilot",
    egg: {
      id: "ide_war",
      title: "IDE war crimes filed",
      body: "the GitHub Copilot team is taking notes.",
    },
  },
  {
    match: (k, m) => k === "mistral" && m === "llama",
    egg: {
      id: "open_source_pilled",
      title: "open source pilled",
      body: "huggingface called, they're proud.",
    },
  },
  {
    match: (k, m, x) => k === m && m === x,
    egg: {
      id: "polycule_energy",
      title: "polycule energy",
      body: "kiss, marry, AND kill the same model. you have... layers.",
    },
  },
  {
    match: (k, _m, x) => k === "deepseek" && x === "chatgpt",
    egg: {
      id: "cracked_on_a_budget",
      title: "cracked on a budget detected",
      body: "$0.27 per million tokens. love is real.",
    },
  },
  {
    match: (_k, m, _x) => m === "perplexity",
    egg: {
      id: "google_is_dead",
      title: "google is dead, long live perplexity",
      body: "(google would like a word.)",
    },
  },
  {
    match: (_k, _m, x) => x === "gemini",
    egg: {
      id: "google_in_pain",
      title: "google product manager weeps",
      body: "they really tried.",
    },
  },
];
