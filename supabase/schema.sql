-- Kiss / Marry / Kill: AI — Supabase schema
-- Apply via:  psql $SUPABASE_DB_URL -f supabase/schema.sql
-- (or paste into the Supabase SQL editor). Safe to re-run.

create extension if not exists "pgcrypto";

-- The model catalog. Slugs match src/lib/models.ts.
create table if not exists public.models (
  slug text primary key,
  name text not null,
  org text not null,
  color text not null,
  tag text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per voter per month. The unique constraint is what gives us
-- "vote once" — duplicates surface as Postgres error 23505.
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_token text not null,
  month text not null,                         -- YYYY-MM (UTC)
  kiss_slug text not null references public.models(slug),
  marry_slug text not null references public.models(slug),
  kill_slug text not null references public.models(slug),
  kiss_reason text,
  marry_reason text,
  kill_reason text,
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (voter_token, month)
);

create index if not exists votes_month_idx on public.votes (month);
create index if not exists votes_created_at_idx on public.votes (created_at desc);

-- Free-form wall scrawls (kiss/marry/kill columns on the bathroom board).
-- Unlike `votes` there's no per-voter limit at the DB layer — the front-end
-- enforces "one scrawl per category per visit". `slug` may match a known model
-- in public.models or be 'other' for write-ins; we don't FK it so anything the
-- writer types still survives.
create table if not exists public.scrawls (
  id uuid primary key default gen_random_uuid(),
  voter_token text not null,
  month text not null,                          -- YYYY-MM (UTC)
  category text not null check (category in ('kiss', 'marry', 'kill')),
  slug text not null,
  text text,                                    -- raw text the writer typed (write-in)
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists scrawls_month_idx on public.scrawls (month);
create index if not exists scrawls_month_cat_idx on public.scrawls (month, category);
create index if not exists scrawls_voter_idx on public.scrawls (voter_token, month);

-- Reactions on individual reasons. The (vote_id, category) pair identifies a
-- specific reason — same shape as the API's reason id `${voteId}:${category}`.
-- `reason_id` is a generated column so we can index/query it directly.
create table if not exists public.reason_reactions (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references public.votes(id) on delete cascade,
  category text not null check (category in ('kiss', 'marry', 'kill')),
  kind text not null check (kind in ('fire', 'skull', 'sob')),
  voter_token text not null,
  reason_id text generated always as (vote_id::text || ':' || category) stored,
  created_at timestamptz not null default now(),
  unique (vote_id, category, kind, voter_token)
);

create index if not exists reason_reactions_reason_idx on public.reason_reactions (reason_id);
create index if not exists reason_reactions_lookup_idx
  on public.reason_reactions (vote_id, category);

-- Frozen monthly leaderboards. Populated by snapshot_month() at month end.
create table if not exists public.monthly_snapshots (
  month text primary key,
  payload jsonb not null,   -- { kiss:[], marry:[], kill:[], totalVoters, awards:[] }
  snapshot_at timestamptz not null default now()
);

-- RLS
alter table public.models enable row level security;
alter table public.votes enable row level security;
alter table public.scrawls enable row level security;
alter table public.monthly_snapshots enable row level security;
alter table public.reason_reactions enable row level security;

drop policy if exists "models readable by anyone" on public.models;
create policy "models readable by anyone"
  on public.models for select using (true);

drop policy if exists "votes readable by anyone" on public.votes;
create policy "votes readable by anyone"
  on public.votes for select using (true);

drop policy if exists "scrawls readable by anyone" on public.scrawls;
create policy "scrawls readable by anyone"
  on public.scrawls for select using (true);

drop policy if exists "snapshots readable by anyone" on public.monthly_snapshots;
create policy "snapshots readable by anyone"
  on public.monthly_snapshots for select using (true);

drop policy if exists "reactions readable by anyone" on public.reason_reactions;
create policy "reactions readable by anyone"
  on public.reason_reactions for select using (true);

-- All inserts go through the service role (the Next.js API route).

-- snapshot_month(target_month):
-- Freezes the current state of `votes` for the given month into
-- monthly_snapshots, with awards computed in-database so the cron is
-- a single RPC call. Idempotent — re-running overwrites.
create or replace function public.snapshot_month(target_month text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_kiss jsonb;
  v_marry jsonb;
  v_kill jsonb;
  v_awards jsonb;
  v_most_kissed text;
  v_most_married text;
  v_most_killed text;
  v_most_controversial text;
  v_underdog text;
begin
  select count(*) into v_total
    from public.votes where month = target_month;

  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'votes', votes) order by votes desc), '[]'::jsonb)
    into v_kiss
    from (
      select kiss_slug as slug, count(*)::int as votes
      from public.votes where month = target_month group by kiss_slug
    ) k;

  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'votes', votes) order by votes desc), '[]'::jsonb)
    into v_marry
    from (
      select marry_slug as slug, count(*)::int as votes
      from public.votes where month = target_month group by marry_slug
    ) m;

  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'votes', votes) order by votes desc), '[]'::jsonb)
    into v_kill
    from (
      select kill_slug as slug, count(*)::int as votes
      from public.votes where month = target_month group by kill_slug
    ) x;

  -- Awards: top of each category, plus controversy (kiss_rank + kill_rank)
  -- and underdog (highest marry-to-total ratio outside the top 3 by totals).
  select v->>'slug' into v_most_kissed
    from jsonb_array_elements(v_kiss) with ordinality t(v, ord)
    where ord = 1;
  select v->>'slug' into v_most_married
    from jsonb_array_elements(v_marry) with ordinality t(v, ord)
    where ord = 1;
  select v->>'slug' into v_most_killed
    from jsonb_array_elements(v_kill) with ordinality t(v, ord)
    where ord = 1;

  with ranked as (
    select v->>'slug' as slug,
           (v->>'votes')::int as votes,
           row_number() over (order by (v->>'votes')::int desc) as rk
    from (
      select unnest(array['kiss','kill']) as cat,
             jsonb_array_elements(case when c = 'kiss' then v_kiss else v_kill end) as v
      from (select unnest(array['kiss','kill']) as c) cats
    ) flat
  ),
  kiss_rank as (
    select v->>'slug' as slug, row_number() over () as rk
    from jsonb_array_elements(v_kiss) with ordinality t(v, ord)
  ),
  kill_rank as (
    select v->>'slug' as slug, row_number() over () as rk
    from jsonb_array_elements(v_kill) with ordinality t(v, ord)
  )
  select slug into v_most_controversial
  from (
    select k.slug, k.rk + x.rk as combined
    from kiss_rank k join kill_rank x on x.slug = k.slug
  ) c
  order by combined asc, slug asc
  limit 1;
  -- (the `ranked` CTE above is intentionally unused; kept for readability)

  with totals as (
    select slug, sum(votes)::int as total
    from (
      select v->>'slug' as slug, (v->>'votes')::int as votes from jsonb_array_elements(v_kiss) as t(v)
      union all
      select v->>'slug' as slug, (v->>'votes')::int as votes from jsonb_array_elements(v_marry) as t(v)
      union all
      select v->>'slug' as slug, (v->>'votes')::int as votes from jsonb_array_elements(v_kill) as t(v)
    ) z group by slug
  ),
  top3 as (
    select slug from totals order by total desc limit 3
  ),
  marry_rows as (
    select v->>'slug' as slug, (v->>'votes')::int as votes
    from jsonb_array_elements(v_marry) as t(v)
  )
  select slug into v_underdog
  from marry_rows mr
  join totals tt on tt.slug = mr.slug
  where mr.slug not in (select slug from top3)
    and tt.total >= 5
  order by (mr.votes::float / nullif(tt.total, 0)) desc, slug asc
  limit 1;

  v_awards := '[]'::jsonb;
  if v_most_kissed is not null then
    v_awards := v_awards || jsonb_build_array(jsonb_build_object(
      'key', 'most_kissed', 'modelSlug', v_most_kissed,
      'label', 'Most Kissed',
      'blurb', 'the internet wanted a night out with this one'));
  end if;
  if v_most_married is not null then
    v_awards := v_awards || jsonb_build_array(jsonb_build_object(
      'key', 'most_married', 'modelSlug', v_most_married,
      'label', 'Most Married',
      'blurb', 'the internet''s chosen long-term partner'));
  end if;
  if v_most_killed is not null then
    v_awards := v_awards || jsonb_build_array(jsonb_build_object(
      'key', 'most_killed', 'modelSlug', v_most_killed,
      'label', 'Most Killed',
      'blurb', 'the internet has had enough'));
  end if;
  if v_most_controversial is not null then
    v_awards := v_awards || jsonb_build_array(jsonb_build_object(
      'key', 'most_controversial', 'modelSlug', v_most_controversial,
      'label', 'Most Controversial',
      'blurb', 'people felt EVERY kind of way about this one'));
  end if;
  if v_underdog is not null then
    v_awards := v_awards || jsonb_build_array(jsonb_build_object(
      'key', 'underdog', 'modelSlug', v_underdog,
      'label', 'Underdog of the Month',
      'blurb', 'the quiet pick who nobody hated'));
  end if;

  insert into public.monthly_snapshots (month, payload, snapshot_at)
  values (
    target_month,
    jsonb_build_object(
      'totalVoters', v_total,
      'kiss', v_kiss,
      'marry', v_marry,
      'kill', v_kill,
      'awards', v_awards
    ),
    now()
  )
  on conflict (month) do update
    set payload = excluded.payload,
        snapshot_at = excluded.snapshot_at;
end;
$$;
