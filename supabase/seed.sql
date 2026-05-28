-- Seed the models catalog. Safe to re-run — upserts by slug.
insert into public.models (slug, name, org, color, tag) values
  ('chatgpt',    'ChatGPT',    'OpenAI',     '#10a37f', 'the default of the internet'),
  ('claude',     'Claude',     'Anthropic',  '#d97757', 'the thoughtful one, sometimes too thoughtful'),
  ('gemini',     'Gemini',     'Google',     '#4f8cff', 'knows everything, says nothing'),
  ('grok',       'Grok',       'xAI',        '#9ca3af', 'the chaos agent'),
  ('llama',      'Llama',      'Meta',       '#7c5cff', 'open source, open weights, open vibes'),
  ('mistral',    'Mistral',    'Mistral AI', '#fb7c2a', 'le LLM'),
  ('deepseek',   'DeepSeek',   'DeepSeek',   '#3d6aff', 'cracked on a budget'),
  ('qwen',       'Qwen',       'Alibaba',    '#a14bff', 'the silent giant'),
  ('perplexity', 'Perplexity', 'Perplexity', '#20b6c4', 'search that talks back'),
  ('copilot',    'Copilot',    'Microsoft',  '#00a4ef', 'office-core'),
  ('cursor',     'Cursor',     'Anysphere',  '#e0e0e0', 'the IDE that ate IDEs')
on conflict (slug) do update set
  name = excluded.name,
  org = excluded.org,
  color = excluded.color,
  tag = excluded.tag;
