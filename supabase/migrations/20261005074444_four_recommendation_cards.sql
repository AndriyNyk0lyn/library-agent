-- Support an explicit three-library plus one-external recommendation request.
-- The original unnamed cards-only CHECK is agent_runs_cards_check.
alter table private.agent_runs drop constraint agent_runs_cards_check;
alter table private.agent_runs add constraint agent_runs_cards_check
  check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) <= 4);

create or replace function private.finish_agent_run(p_id uuid,p_status text,p_answer text,p_cards jsonb,p_history jsonb,p_error text,p_usage jsonb,p_key text,p_plans jsonb default '[]')
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_status not in ('completed','failed','interrupted') or p_status is null or char_length(p_answer) > 12000
    or jsonb_typeof(p_history) is distinct from 'array' or octet_length(p_history::text) > 524288
    or jsonb_array_length(p_history) > 200 or jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards) > 4
    or jsonb_typeof(p_plans) is distinct from 'array' or jsonb_array_length(p_plans) > 5 or octet_length(p_plans::text) > 100000
    or char_length(p_error) > 100 or octet_length(p_usage::text) > 10000
    or (p_status = 'completed' and (p_answer is null or p_answer = '')) then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  update private.agent_runs set status = p_status,answer = p_answer,cards = p_cards,plans = p_plans,history = case when p_status = 'completed' then p_history else '[]'::jsonb end,
    error_code = p_error,usage = p_usage,finished_at = clock_timestamp()
    where user_id = auth.uid() and id = p_id and run_key_hash = sha256(convert_to(p_key,'UTF8'))::text and status = 'active' and expires_at > clock_timestamp();
  if not found then return false; end if;
  -- Keep only whole tool-compatible exchanges. Never cut a call away from its result.
  perform private.maintain_chat();
  return true;
end;
$$;
