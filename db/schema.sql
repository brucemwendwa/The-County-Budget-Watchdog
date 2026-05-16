create extension if not exists pgcrypto;
create extension if not exists vector;

create type budget_document_type as enum (
  'approved-budget',
  'supplementary-budget',
  'gazette-notice',
  'implementation-report'
);

create type budget_document_status as enum (
  'processing',
  'review-ready',
  'published',
  'needs-attention'
);

create type budget_kind as enum ('development', 'recurrent');
create type allocation_status as enum ('on-track', 'underspent', 'overspent', 'changed');
create type sms_language as enum ('english', 'swahili', 'sheng');
create type sms_status as enum ('draft', 'approved', 'sent');
create type risk_level as enum ('low', 'medium', 'high');

create table if not exists budget_documents (
  id text primary key,
  county text not null,
  title text not null,
  fiscal_year text not null,
  type budget_document_type not null,
  status budget_document_status not null default 'processing',
  uploaded_at timestamptz not null default now(),
  pages integer not null default 0,
  source_url text,
  storage_path text,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists ward_allocations (
  id text primary key,
  document_id text references budget_documents(id) on delete cascade,
  county text not null,
  ward text not null,
  constituency text,
  department text not null,
  programme text,
  project text not null,
  fiscal_year text not null,
  allocation_kes bigint not null default 0,
  expenditure_kes bigint not null default 0,
  budget_type budget_kind not null,
  page integer not null,
  confidence numeric(4,3) not null default 0,
  status allocation_status not null default 'on-track',
  created_at timestamptz not null default now()
);

create table if not exists budget_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id text references budget_documents(id) on delete cascade,
  county text not null,
  fiscal_year text not null,
  page_start integer not null,
  page_end integer not null,
  text text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists suspicious_changes (
  id text primary key,
  county text not null,
  ward text,
  department text,
  description text not null,
  before_kes bigint,
  after_kes bigint,
  delta_kes bigint,
  risk risk_level not null,
  source_page integer,
  detected_at timestamptz not null default now(),
  source_document_id text references budget_documents(id)
);

create table if not exists sms_digests (
  id text primary key,
  county text not null,
  ward text not null,
  language sms_language not null,
  body text not null,
  status sms_status not null default 'draft',
  created_at timestamptz not null default now(),
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz
);

create index if not exists ward_allocations_search_idx
  on ward_allocations using gin (
    to_tsvector('english', county || ' ' || ward || ' ' || department || ' ' || programme || ' ' || project)
  );

create index if not exists ward_allocations_ward_idx on ward_allocations (county, ward, fiscal_year);
create index if not exists suspicious_changes_risk_idx on suspicious_changes (risk, detected_at desc);
