create schema if not exists `county_budget_watchdog`;

create table if not exists `county_budget_watchdog.budget_facts` (
  document_id string,
  county string,
  fiscal_year string,
  ward string,
  constituency string,
  department string,
  programme string,
  project string,
  budget_type string,
  allocation_kes int64,
  expenditure_kes int64,
  absorption_rate float64,
  source_page int64,
  confidence float64,
  status string,
  uploaded_at timestamp
)
partition by date(uploaded_at)
cluster by county, fiscal_year, ward, department;

create table if not exists `county_budget_watchdog.budget_changes` (
  change_id string,
  county string,
  fiscal_year string,
  ward string,
  department string,
  description string,
  before_kes int64,
  after_kes int64,
  delta_kes int64,
  risk string,
  source_page int64,
  detected_at timestamp
)
partition by date(detected_at)
cluster by county, ward, risk;

create table if not exists `county_budget_watchdog.resident_questions` (
  question_id string,
  county string,
  ward string,
  question string,
  answer_confidence float64,
  cited_pages array<int64>,
  created_at timestamp
)
partition by date(created_at)
cluster by county, ward;
