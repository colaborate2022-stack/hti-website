-- Storage for training-needs-survey.html
-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Until this table exists, the survey falls back to sending answers over WhatsApp.

create table if not exists public.survey_responses (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),

  -- who
  name             text,
  email            text,
  phone            text,
  company          text,
  role             text,
  city             text,

  -- their team
  business_type    text,
  outlets          text,
  team_size        text,
  languages        text[],

  -- where the gaps are
  focus_areas      text[],
  challenge        text,
  service_rating   smallint,
  trained_recently text,
  measure          text,

  -- format and timing
  format           text,
  timeline         text,
  notes            text,
  consent          boolean,
  source           text
);

alter table public.survey_responses enable row level security;

-- The website uses the public anon key, so it may only INSERT.
-- No select/update/delete policy exists, which means nobody can read
-- or change responses with that key - only the dashboard and the
-- service-role key can.
drop policy if exists "anon can submit survey" on public.survey_responses;
create policy "anon can submit survey"
  on public.survey_responses
  for insert
  to anon
  with check (true);

create index if not exists survey_responses_created_at_idx
  on public.survey_responses (created_at desc);

-- Read your responses here:
--   select created_at, name, company, phone, email, business_type,
--          team_size, focus_areas, challenge, service_rating, timeline
--   from public.survey_responses
--   order by created_at desc;
