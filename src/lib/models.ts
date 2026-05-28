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
