-- Schema for The County Budget Tracker.
--
-- Everything here records what was read out of a real document. Codes are the hierarchical location
-- codes used by the app (`machakos`, `machakos.mavoko`, `machakos.mavoko.athi-river`), so a row can
-- be rolled up to a sub-county or county without a join.

create extension if not exists pgcrypto;

create type budget_document_type as enum (
  'county-budget',
  'finance-bill',
  'supplementary-budget',
  'programme-based-budget',
  'annual-development-plan',
  'county-fiscal-strategy-paper',
  'implementation-report',
  'controller-of-budget-report',
  'other'
);

create type budget_document_status as enum (
  'processed',
  'no-rows-extracted',
  'needs-ocr',
  'ocr-failed'
);

create type budget_kind as enum ('development', 'recurrent');

create type idea_category as enum (
  'roads',
  'health',
  'education',
  'water',
  'agriculture',
  'youth',
  'markets',
  'security',
  'other'
);

create table if not exists budget_documents (
  id text primary key,
  county_code text not null,
  county_name text not null,
  title text not null,
  file_name text not null,
  fiscal_year text not null,
  type budget_document_type not null,
  status budget_document_status not null,
  uploaded_at timestamptz not null default now(),
  pages integer not null default 0,
  source_url text,
  -- The full detection record: which value came from the document, from which page, how confident.
  detection jsonb not null default '{}'::jsonb,
  -- The derived dashboard view: totals, departments, sectors, changes, clarifications.
  analysis jsonb not null default '{}'::jsonb
);

create table if not exists budget_line_items (
  id text primary key,
  document_id text not null references budget_documents(id) on delete cascade,
  county_code text not null,
  -- Null when the document did not tie the row to a ward; such rows are county-wide.
  ward_code text,
  ward_name text,
  sub_county_code text,
  sub_county_name text,
  department text not null,
  programme text not null,
  project text not null,
  fiscal_year text not null,
  allocation_kes bigint not null,
  -- Null when the row stated an allocation only, which is normal for budget estimates.
  expenditure_kes bigint,
  budget_type budget_kind not null,
  page integer not null,
  confidence numeric(4, 3) not null default 0,
  excerpt text not null,
  created_at timestamptz not null default now()
);

create table if not exists citizen_ideas (
  id text primary key,
  name text,
  county_code text not null,
  county_name text not null,
  sub_county_code text not null,
  sub_county_name text not null,
  ward_code text not null,
  ward_name text not null,
  category idea_category not null,
  idea text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists budget_documents_county_idx on budget_documents (county_code, fiscal_year);
create index if not exists budget_line_items_ward_idx on budget_line_items (ward_code, fiscal_year);
create index if not exists budget_line_items_county_idx on budget_line_items (county_code, fiscal_year);
create index if not exists budget_line_items_search_idx
  on budget_line_items using gin (
    to_tsvector('english', coalesce(ward_name, '') || ' ' || department || ' ' || programme || ' ' || project)
  );
create index if not exists citizen_ideas_ward_idx on citizen_ideas (ward_code, submitted_at desc);
