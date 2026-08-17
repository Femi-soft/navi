alter table wallet_auth_nonces
  drop constraint if exists wallet_auth_nonces_chain_id_check;

alter table wallet_auth_nonces
  add constraint wallet_auth_nonces_chain_id_check
  check (chain_id in (1952, 196));

create or replace function upsert_verified_wallet(requested_address varchar, requested_chain_id integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare selected_user uuid;
declare selected_wallet uuid;
begin
  if requested_chain_id not in (1952, 196) then raise exception 'wrong network'; end if;
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

revoke all on function upsert_verified_wallet(varchar, integer) from public, anon, authenticated;
grant execute on function upsert_verified_wallet(varchar, integer) to service_role;
