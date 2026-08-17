-- Supabase production security baseline. Apply only to the selected NAVI project.
-- Elevated keys remain server-only; browser roles receive no direct table grants.

alter table users add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

create table if not exists wallet_auth_nonces (
  nonce_hash varchar primary key,
  address varchar not null,
  chain_id integer not null check (chain_id = 196),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table users enable row level security;
alter table wallets enable row level security;
alter table policies enable row level security;
alter table portfolio_snapshots enable row level security;
alter table opportunities enable row level security;
alter table strategies enable row level security;
alter table simulations enable row level security;
alter table executions enable row level security;
alter table wallet_auth_nonces enable row level security;

revoke all on users, wallets, policies, portfolio_snapshots, opportunities, strategies, simulations, executions, wallet_auth_nonces from anon, authenticated;

create or replace function consume_wallet_auth_nonce(
  requested_nonce_hash varchar,
  requested_address varchar,
  requested_now timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update wallet_auth_nonces
     set consumed_at = requested_now
   where nonce_hash = requested_nonce_hash
     and lower(address) = lower(requested_address)
     and consumed_at is null
     and expires_at > requested_now;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function upsert_verified_wallet(requested_address varchar, requested_chain_id integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare selected_user uuid;
declare selected_wallet uuid;
begin
  if requested_chain_id <> 196 then raise exception 'wrong network'; end if;
  select id into selected_wallet from wallets where lower(address) = lower(requested_address) and chain_id = requested_chain_id;
  if selected_wallet is not null then
    update wallets set verified = true where id = selected_wallet;
    return selected_wallet;
  end if;
  insert into users default values returning id into selected_user;
  insert into wallets(user_id, address, chain_id, verified)
  values(selected_user, lower(requested_address), requested_chain_id, true)
  on conflict(address, chain_id) do update set verified = true
  returning id into selected_wallet;
  return selected_wallet;
end;
$$;

revoke all on function consume_wallet_auth_nonce(varchar, varchar, timestamptz) from public, anon, authenticated;
revoke all on function upsert_verified_wallet(varchar, integer) from public, anon, authenticated;
grant execute on function consume_wallet_auth_nonce(varchar, varchar, timestamptz) to service_role;
grant execute on function upsert_verified_wallet(varchar, integer) to service_role;

create index if not exists wallet_auth_nonces_expiry_idx on wallet_auth_nonces(expires_at) where consumed_at is null;
