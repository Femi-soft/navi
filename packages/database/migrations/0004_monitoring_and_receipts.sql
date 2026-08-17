alter table executions add column if not exists receipt_source varchar;
alter table executions add column if not exists receipt_retrieved_at timestamptz;
alter table executions add column if not exists receipt_block_number varchar;
alter table executions add column if not exists receipt_block_hash varchar;

create table if not exists monitoring_checks (
  id uuid primary key default gen_random_uuid(), network varchar not null check (network in ('testnet','mainnet')),
  chain_id integer check (chain_id in (1952,196)), block_number varchar,
  status varchar not null check (status in ('healthy','degraded')), source varchar not null,
  retrieved_at timestamptz not null, details jsonb not null, created_at timestamptz not null default now()
);
alter table monitoring_checks enable row level security;
revoke all on monitoring_checks from anon, authenticated;
create index if not exists monitoring_checks_network_time_idx on monitoring_checks(network,created_at desc);
