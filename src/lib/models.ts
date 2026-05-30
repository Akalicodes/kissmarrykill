/**
 * The official roster of LLMs on the board.
 *
 * To add or retire a model:
 *  1. Edit this list.
 *  2. If you are using Supabase, run `supabase/seed.sql` again
 *     (it upserts by slug so it is safe to re-run).
 *
 * `color` drives the model's accent in the UI.
 * `tag` is a short personality blurb that appears on its card.
 */
export type Model = {
  slug: string;
  name: string;
  org: string;
  color: string;
  tag: string;
};

export const MODELS: Model[] = [
  {
    slug: "chatgpt",
    name: "ChatGPT",
    org: "OpenAI",
    color: "#10a37f",
    tag: "the default of the internet",
  },
  {
    slug: "claude",
    name: "Claude",
    org: "Anthropic",
    color: "#d97757",
    tag: "the thoughtful one, sometimes too thoughtful",
  },
  {
    slug: "gemini",
    name: "Gemini",
    org: "Google",
    color: "#4f8cff",
    tag: "knows everything, says nothing",
  },
  {
    slug: "grok",
    name: "Grok",
    org: "xAI",
    color: "#9ca3af",
    tag: "the chaos agent",
  },
  {
    slug: "llama",
    name: "Llama",
    org: "Meta",
    color: "#7c5cff",
    tag: "open source, open weights, open vibes",
  },
  {
    slug: "mistral",
    name: "Mistral",
    org: "Mistral AI",
    color: "#fb7c2a",
    tag: "le LLM",
  },
  {
    slug: "deepseek",
    name: "DeepSeek",
    org: "DeepSeek",
    color: "#3d6aff",
    tag: "cracked on a budget",
  },
  {
    slug: "qwen",
    name: "Qwen",
    org: "Alibaba",
    color: "#a14bff",
    tag: "the silent giant",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    org: "Perplexity",
    color: "#20b6c4",
    tag: "search that talks back",
  },
  {
    slug: "copilot",
    name: "Copilot",
    org: "Microsoft",
    color: "#00a4ef",
    tag: "office-core",
  },
  {
    slug: "cursor",
    name: "Cursor",
    org: "Anysphere",
    color: "#e0e0e0",
    tag: "the IDE that ate IDEs",
  },
  {
    slug: "other",
    name: "Other",
    org: "Write-in",
    color: "#94a3b8",
    tag: "the one that wasn't on the list",
  },
];

export const MODEL_BY_SLUG: Record<string, Model> = MODELS.reduce(
  (acc, m) => {
    acc[m.slug] = m;
    return acc;
  },
  {} as Record<string, Model>,
);

export function getModel(slug: string): Model | undefined {
  return MODEL_BY_SLUG[slug];
}

// Aliases people commonly type instead of the canonical model name.
const ALIAS_MAP: Record<string, string> = {
  gpt: "chatgpt", "chat gpt": "chatgpt", openai: "chatgpt", "open ai": "chatgpt", chat: "chatgpt",
  anthropic: "claude", sonnet: "claude", opus: "claude", haiku: "claude",
  bard: "gemini", google: "gemini", "google ai": "gemini",
  xai: "grok", "x ai": "grok",
  meta: "llama", facebook: "llama", "meta ai": "llama",
  "le chat": "mistral",
  alibaba: "qwen", "alibaba cloud": "qwen",
  microsoft: "copilot", "co pilot": "copilot", "github copilot": "copilot",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve any free-text input to a known model slug for counting.
 *
 * Strategy (in order):
 *  1. exact match against a slug, model name, or alias
 *  2. word-boundary scan: pick the *longest* model/alias mention
 *     anywhere inside the text — so "grok it is very smart" → grok
 *  3. prefix match (e.g. "clau" → claude)
 *  4. fall back to "other"
 */
export function resolveSlug(text: string): string {
  const t = text.trim().toLowerCase();
  if (!t) return "other";

  if (ALIAS_MAP[t]) return ALIAS_MAP[t];
  const exact = MODELS.find((m) => m.slug === t || m.name.toLowerCase() === t);
  if (exact) return exact.slug;

  // Build a list of (slug, pattern) pairs and check word-boundary mentions
  // anywhere in the input. Longer patterns win to avoid matching "open" inside
  // "openai" before "openai" itself.
  const candidates: Array<{ slug: string; pattern: string }> = [];
  for (const m of MODELS) {
    if (m.slug === "other") continue; // never auto-match "other"
    candidates.push({ slug: m.slug, pattern: m.slug });
    candidates.push({ slug: m.slug, pattern: m.name.toLowerCase() });
  }
  for (const [alias, slug] of Object.entries(ALIAS_MAP)) {
    candidates.push({ slug, pattern: alias });
  }
  candidates.sort((a, b) => b.pattern.length - a.pattern.length);

  for (const c of candidates) {
    if (c.pattern.length < 3) continue;
    const re = new RegExp(`\\b${escapeRegex(c.pattern)}\\b`, "i");
    if (re.test(t)) return c.slug;
  }

  // Prefix fall-through: "clau" → "claude"
  const prefix = MODELS.find(
    (m) => m.slug !== "other" && (m.name.toLowerCase().startsWith(t) || m.slug.startsWith(t)),
  );
  return prefix?.slug ?? "other";
}
