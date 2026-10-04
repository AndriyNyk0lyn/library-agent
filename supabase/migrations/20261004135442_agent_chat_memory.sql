-- Public records are read through RLS; private functions own durable writes.
create table public.reader_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences text not null default '' check (char_length(preferences) <= 4000),
  pages_per_hour numeric check (pages_per_hour > 0 and pages_per_hour <= 10000),
  daily_reading_minutes integer check (daily_reading_minutes between 1 and 1440),
  timezone text check (char_length(timezone) between 1 and 100),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
alter table public.reader_profiles enable row level security;
revoke all on public.reader_profiles from public, anon, authenticated;
grant select on public.reader_profiles to authenticated;
create policy "Read own profile" on public.reader_profiles for select to authenticated using ((select auth.uid()) = user_id);

create table private.agent_runs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  run_key_hash text not null,
  status text not null check (status in ('active','completed','failed','interrupted')),
  input text not null check (char_length(input) between 1 and 4000),
  model text not null check (char_length(model) between 1 and 200),
  answer text check (char_length(answer) <= 12000),
  cards jsonb not null default '[]', activity jsonb not null default '[]',
  history jsonb not null default '[]', usage jsonb,
  error_code text, created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null, finished_at timestamptz,
  primary key(user_id,id),
  check (jsonb_typeof(history) = 'array' and octet_length(history::text) <= 524288),
  check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) <= 3),
  check (jsonb_typeof(activity) = 'array' and jsonb_array_length(activity) <= 100)
);
create index agent_runs_recent_idx on private.agent_runs(user_id,created_at desc);
create unique index agent_runs_active_idx on private.agent_runs(user_id) where status = 'active';
alter table private.agent_runs enable row level security;
revoke all on private.agent_runs from public, anon, authenticated;

create function public.get_reader_profile() returns jsonb language plpgsql security invoker set search_path = '' as $$
declare profile public.reader_profiles;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select * into profile from public.reader_profiles where user_id = auth.uid();
  return jsonb_build_object('ok',true,'profile',case when profile.user_id is null then
    jsonb_build_object('preferences','','pages_per_hour',null,'daily_reading_minutes',null,'timezone',null,'version',0)
    else to_jsonb(profile) - 'user_id' - 'updated_at' end);
end;
$$;

-- Reuses the immutable operation ledger and payload-conflict protocol from ticket 02.
create function private.update_reader_profile(p_expected_version integer,p_operation_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  previous private.book_operations; profile public.reader_profiles; outcome jsonb;
  request jsonb := jsonb_build_object('kind','profile','expected_version',p_expected_version,'patch',p_patch);
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_operation_id is null or p_expected_version is null or p_expected_version < 0
    or jsonb_typeof(p_patch) is distinct from 'object' or p_patch = '{}'
    or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('preferences','pages_per_hour','daily_reading_minutes','timezone'))
    or (p_patch ? 'preferences' and (jsonb_typeof(p_patch->'preferences') is distinct from 'string' or char_length(p_patch->>'preferences') > 4000))
    or (p_patch ? 'pages_per_hour' and jsonb_typeof(p_patch->'pages_per_hour') not in ('number','null'))
    or (p_patch ? 'daily_reading_minutes' and jsonb_typeof(p_patch->'daily_reading_minutes') not in ('number','null'))
    or (p_patch ? 'timezone' and jsonb_typeof(p_patch->'timezone') not in ('string','null'))
    or (p_patch->>'timezone' is not null and not exists(select 1 from pg_catalog.pg_timezone_names where name = p_patch->>'timezone')) then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check explicit preferences, constraints, timezone and version.'));
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':operation:' || p_operation_id::text,0));
  select * into previous from private.book_operations where user_id = auth.uid() and operation_id = p_operation_id;
  if found then
    if previous.request = request then return previous.outcome; end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','Operation ID has different inputs. Reload before saving with a new ID.'));
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':profile',0));
  select * into profile from public.reader_profiles where user_id = auth.uid() for update;
  if coalesce(profile.version,0) <> p_expected_version then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','Profile changed. Reload before saving.'));
  else
    begin
      if profile.user_id is null then profile.preferences := ''; end if;
      profile := jsonb_populate_record(profile,p_patch);
      insert into public.reader_profiles(user_id,preferences,pages_per_hour,daily_reading_minutes,timezone,version)
        values(auth.uid(),profile.preferences,profile.pages_per_hour,profile.daily_reading_minutes,profile.timezone,1)
        on conflict(user_id) do update set preferences = excluded.preferences,pages_per_hour = excluded.pages_per_hour,
          daily_reading_minutes = excluded.daily_reading_minutes,timezone = excluded.timezone,
          version = public.reader_profiles.version + 1,updated_at = now() returning * into profile;
      outcome := jsonb_build_object('ok',true,'profile',to_jsonb(profile) - 'user_id' - 'updated_at');
    exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
      outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check profile constraints.'));
    end;
  end if;
  insert into private.book_operations(user_id,operation_id,request,outcome) values(auth.uid(),p_operation_id,request,outcome);
  return outcome;
end;
$$;
create function public.update_reader_profile(p_expected_version integer,p_operation_id uuid,p_patch jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.update_reader_profile(p_expected_version,p_operation_id,p_patch); $$;

create function private.chat_snapshot() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  update private.agent_runs set status = 'interrupted',error_code = 'INTERRUPTED',finished_at = clock_timestamp(),history = '[]'
    where user_id = auth.uid() and status = 'active' and expires_at <= clock_timestamp();
  delete from private.agent_runs where user_id = auth.uid() and created_at < clock_timestamp() - interval '30 days';
  update private.agent_runs set history = '[]' where user_id = auth.uid() and history <> '[]'
    and id not in (select id from private.agent_runs where user_id = auth.uid() and status <> 'active' order by created_at desc,id desc limit 5);
  return jsonb_build_object('runs',coalesce((select jsonb_agg(to_jsonb(r) - 'user_id' - 'model' - 'history' - 'usage' - 'finished_at' - 'run_key_hash' order by r.created_at,r.id)
    from (select * from private.agent_runs where user_id = auth.uid() order by created_at desc,id desc limit 20) r),'[]'));
end;
$$;
create function public.chat_snapshot() returns jsonb language sql security invoker set search_path = '' as $$ select private.chat_snapshot(); $$;

create function private.start_agent_run(p_id uuid,p_input text,p_model text,p_key text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare previous private.agent_runs;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_id is null or p_input is null or char_length(btrim(p_input)) not between 1 and 4000 or p_model is null or char_length(p_model) not between 1 and 200 or p_key is null or p_key !~ '^[a-f0-9]{64}$' then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  perform private.chat_snapshot();
  select * into previous from private.agent_runs where user_id = auth.uid() and id = p_id;
  if found then
    return jsonb_build_object('ok',false,'code',case when previous.input = p_input then 'ALREADY_SUBMITTED' else 'CONFLICT' end);
  end if;
  if exists(select 1 from private.agent_runs where user_id = auth.uid() and status = 'active') then return jsonb_build_object('ok',false,'code','RUN_ACTIVE'); end if;
  if (select count(*) from private.agent_runs where user_id = auth.uid() and created_at > clock_timestamp() - interval '1 hour') >= 10 then return jsonb_build_object('ok',false,'code','QUOTA_EXCEEDED'); end if;
  -- Bound storage on each read/start/finish path; rate evidence is always retained for an hour.
  delete from private.agent_runs where user_id = auth.uid() and created_at < clock_timestamp() - interval '30 days';
  insert into private.agent_runs(user_id,id,status,input,model,run_key_hash,expires_at) values(auth.uid(),p_id,'active',p_input,p_model,sha256(convert_to(p_key,'UTF8'))::text,clock_timestamp() + interval '75 seconds');
  return jsonb_build_object('ok',true);
end;
$$;
create function public.start_agent_run(p_id uuid,p_input text,p_model text,p_key text) returns jsonb language sql security invoker set search_path = '' as $$ select private.start_agent_run(p_id,p_input,p_model,p_key); $$;

create function private.record_agent_activity(p_id uuid,p_activity jsonb,p_key text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_activity) is distinct from 'object' or (p_activity - 'tool' - 'phase' - 'outcome') <> '{}'
    or coalesce(p_activity->>'tool','') not in ('search_my_library','get_book','update_book','get_reader_profile','update_reader_profile')
    or coalesce(p_activity->>'phase','') not in ('started','completed')
    or (p_activity ? 'outcome' and coalesce(p_activity->>'outcome','') not in ('ok','error','uncertain')) then raise invalid_parameter_value; end if;
  update private.agent_runs set activity = activity || jsonb_build_array(p_activity)
    where user_id = auth.uid() and id = p_id and run_key_hash = sha256(convert_to(p_key,'UTF8'))::text and status = 'active' and expires_at > clock_timestamp() and jsonb_array_length(activity) < 100;
  return found;
end;
$$;
create function public.record_agent_activity(p_id uuid,p_activity jsonb,p_key text) returns boolean language sql security invoker set search_path = '' as $$ select private.record_agent_activity(p_id,p_activity,p_key); $$;

create function private.finish_agent_run(p_id uuid,p_status text,p_answer text,p_cards jsonb,p_history jsonb,p_error text,p_usage jsonb,p_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_status not in ('completed','failed','interrupted') or p_status is null or char_length(p_answer) > 12000
    or jsonb_typeof(p_history) is distinct from 'array' or octet_length(p_history::text) > 524288
    or jsonb_array_length(p_history) > 200 or jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards) > 3
    or char_length(p_error) > 100 or octet_length(p_usage::text) > 10000
    or (p_status = 'completed' and (p_answer is null or p_answer = '')) then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  update private.agent_runs set status = p_status,answer = p_answer,cards = p_cards,history = case when p_status = 'completed' then p_history else '[]'::jsonb end,
    error_code = p_error,usage = p_usage,finished_at = clock_timestamp()
    where user_id = auth.uid() and id = p_id and run_key_hash = sha256(convert_to(p_key,'UTF8'))::text and status = 'active' and expires_at > clock_timestamp();
  if not found then return false; end if;
  -- Keep only whole tool-compatible exchanges. Never cut a call away from its result.
  update private.agent_runs set history = '[]' where user_id = auth.uid() and history <> '[]'
    and id not in (select id from private.agent_runs where user_id = auth.uid() and status <> 'active' order by created_at desc,id desc limit 5);
  return true;
end;
$$;
create function public.finish_agent_run(p_id uuid,p_status text,p_answer text,p_cards jsonb,p_history jsonb,p_error text,p_usage jsonb,p_key text)
returns boolean language sql security invoker set search_path = '' as $$ select private.finish_agent_run(p_id,p_status,p_answer,p_cards,p_history,p_error,p_usage,p_key); $$;

create function private.agent_history() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  return coalesce((select jsonb_agg(r.history order by r.created_at,r.id) from
    (select case when status = 'completed' then history else
      jsonb_build_array(jsonb_build_object('role','user','content',input),
        jsonb_build_object('role','assistant','status','completed','content',jsonb_build_array(jsonb_build_object('type','output_text','text',
          'The previous run failed or was interrupted. Writes may have completed. Read current records before acting; never automatically replay the previous request.')))) end as history,
      created_at,id from private.agent_runs where user_id = auth.uid() and status <> 'active'
      and created_at > clock_timestamp() - interval '30 days' order by created_at desc,id desc limit 5) r),'[]');
end;
$$;
create function public.agent_history() returns jsonb language sql security invoker set search_path = '' as $$ select private.agent_history(); $$;

-- All privileged implementations live outside the exposed schema, check auth.uid(),
-- accept no owner, and restrict every access. Clients cannot release app-started leases without the server-held capability.
revoke all on function public.get_reader_profile() from public,anon,authenticated;
grant execute on function public.get_reader_profile() to authenticated;
revoke all on function private.update_reader_profile(integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.update_reader_profile(integer,uuid,jsonb) to authenticated;
revoke all on function public.update_reader_profile(integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.update_reader_profile(integer,uuid,jsonb) to authenticated;
revoke all on function private.chat_snapshot() from public,anon,authenticated;
grant execute on function private.chat_snapshot() to authenticated;
revoke all on function public.chat_snapshot() from public,anon,authenticated;
grant execute on function public.chat_snapshot() to authenticated;
revoke all on function private.start_agent_run(uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.start_agent_run(uuid,text,text,text) to authenticated;
revoke all on function public.start_agent_run(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.start_agent_run(uuid,text,text,text) to authenticated;
revoke all on function private.record_agent_activity(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function private.record_agent_activity(uuid,jsonb,text) to authenticated;
revoke all on function public.record_agent_activity(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_agent_activity(uuid,jsonb,text) to authenticated;
revoke all on function private.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text) from public,anon,authenticated;
grant execute on function private.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text) to authenticated;
revoke all on function public.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text) to authenticated;
revoke all on function private.agent_history() from public,anon,authenticated;
grant execute on function private.agent_history() to authenticated;
revoke all on function public.agent_history() from public,anon,authenticated;
grant execute on function public.agent_history() to authenticated;
