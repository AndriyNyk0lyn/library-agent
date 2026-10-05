-- Add identity without rewriting retained run IDs, results or SDK exchanges.
create table private.chat_conversations (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  title text not null default 'New chat' check (char_length(title) between 1 and 80),
  created_at timestamptz not null default clock_timestamp(),
  last_activity_at timestamptz not null default clock_timestamp(),
  primary key (user_id,id)
);
alter table private.chat_conversations enable row level security;
revoke all on private.chat_conversations from public,anon,authenticated;
create index chat_conversations_recent_idx on private.chat_conversations(user_id,last_activity_at desc,id desc);
alter table private.agent_runs add column conversation_id uuid;
insert into private.chat_conversations(user_id,id,title,created_at,last_activity_at)
select user_id,gen_random_uuid(),
  left(regexp_replace((array_agg(input order by created_at,id))[1],'[[:space:]]+',' ','g'),80),
  min(created_at),max(created_at) from private.agent_runs group by user_id;
update private.agent_runs r set conversation_id = c.id from private.chat_conversations c where r.user_id = c.user_id;
alter table private.agent_runs alter column conversation_id set not null;
alter table private.agent_runs add constraint agent_runs_conversation_owner_fk
  foreign key(user_id,conversation_id) references private.chat_conversations(user_id,id) on delete cascade;
create index agent_runs_conversation_recent_idx on private.agent_runs(user_id,conversation_id,created_at desc,id desc);

-- Called under the existing reader-wide chat lock. Prune each conversation independently.
create function private.maintain_chat() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  update private.agent_runs set status = 'interrupted',error_code = 'INTERRUPTED',finished_at = clock_timestamp(),history = '[]'
    where user_id = auth.uid() and status = 'active' and expires_at <= clock_timestamp();
  delete from private.agent_runs where user_id = auth.uid() and created_at < clock_timestamp() - interval '30 days';
  update private.agent_runs set history = '[]' where user_id = auth.uid() and history <> '[]'
    and id in (select id from (select id,row_number() over(partition by conversation_id order by created_at desc,id desc) as position
      from private.agent_runs where user_id = auth.uid() and status <> 'active') ranked where position > 5);
  delete from private.chat_conversations c where c.user_id = auth.uid()
    and c.last_activity_at < clock_timestamp() - interval '30 days'
    and not exists(select 1 from private.agent_runs r where r.user_id = c.user_id and r.conversation_id = c.id);
end;
$$;
revoke all on function private.maintain_chat() from public,anon,authenticated;

create function private.create_chat_conversation(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare conversation private.chat_conversations;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_id is null then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  -- Retry the same owner-scoped identity; never overwrite its title or activity.
  insert into private.chat_conversations(user_id,id) values(auth.uid(),p_id) on conflict(user_id,id) do nothing;
  select * into conversation from private.chat_conversations where user_id = auth.uid() and id = p_id;
  return to_jsonb(conversation) - 'user_id';
end;
$$;

create function private.list_chat_conversations(p_as_of timestamptz default null,p_before_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; cutoff timestamptz := coalesce(p_as_of,clock_timestamp());
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if (p_before_at is null) <> (p_before_id is null) or cutoff > clock_timestamp() then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  perform private.maintain_chat();
  -- Reconstruct activity at the first-page cutoff. Later admissions cannot move rows between pages.
  with candidates as (
    select c.id,c.title,c.created_at,greatest(c.created_at,coalesce((select max(r.created_at)
      from private.agent_runs r where r.user_id = auth.uid() and r.conversation_id = c.id and r.created_at <= cutoff),c.created_at)) as last_activity_at
    from private.chat_conversations c where c.user_id = auth.uid() and c.created_at <= cutoff
  ), page as (
    select * from candidates where p_before_at is null or (last_activity_at,id) < (p_before_at,p_before_id)
    order by last_activity_at desc,id desc limit 21
  ), visible as (select * from page order by last_activity_at desc,id desc limit 20)
  select jsonb_build_object('conversations',coalesce((select jsonb_agg(to_jsonb(v) order by last_activity_at desc,id desc) from visible v),'[]'),
    'next_cursor',case when (select count(*) from page) > 20 then
      (select jsonb_build_object('as_of',cutoff,'at',last_activity_at,'id',id) from visible order by last_activity_at,id limit 1) else null end)
    into result;
  return result;
end;
$$;

drop function public.chat_snapshot();
drop function private.chat_snapshot();
create function private.chat_snapshot(p_conversation_id uuid,p_before_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare conversation private.chat_conversations; result jsonb;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_conversation_id is null or (p_before_at is null) <> (p_before_id is null) then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  perform private.maintain_chat();
  select * into conversation from private.chat_conversations where user_id = auth.uid() and id = p_conversation_id;
  if not found then return jsonb_build_object('code','NOT_FOUND'); end if;
  with page as (
    select * from private.agent_runs where user_id = auth.uid() and conversation_id = p_conversation_id
      and (p_before_at is null or (created_at,id) < (p_before_at,p_before_id)) order by created_at desc,id desc limit 21
  ), visible as (select * from page order by created_at desc,id desc limit 20)
  select jsonb_build_object('conversation',to_jsonb(conversation) - 'user_id',
    'runs',coalesce((select jsonb_agg(to_jsonb(v) - 'user_id' - 'model' - 'history' - 'usage' - 'finished_at' - 'run_key_hash' order by created_at,id) from visible v),'[]'),
    'next_cursor',case when (select count(*) from page) > 20 then
      (select jsonb_build_object('at',created_at,'id',id) from visible order by created_at,id limit 1) else null end) into result;
  return result;
end;
$$;

drop function public.start_agent_run(uuid,text,text,text);
drop function private.start_agent_run(uuid,text,text,text);
create function private.start_agent_run(p_conversation_id uuid,p_id uuid,p_input text,p_model text,p_key text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare previous private.agent_runs;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_conversation_id is null or p_id is null or p_input is null or char_length(btrim(p_input)) not between 1 and 4000 or p_model is null or char_length(p_model) not between 1 and 200 or p_key is null or p_key !~ '^[a-f0-9]{64}$' then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':chat',0));
  perform private.maintain_chat();
  if not exists(select 1 from private.chat_conversations where user_id = auth.uid() and id = p_conversation_id) then
    return jsonb_build_object('ok',false,'code','NOT_FOUND');
  end if;
  select * into previous from private.agent_runs where user_id = auth.uid() and id = p_id;
  if found then
    return jsonb_build_object('ok',false,'code',case when previous.input = p_input and previous.conversation_id = p_conversation_id then 'ALREADY_SUBMITTED' else 'CONFLICT' end);
  end if;
  if exists(select 1 from private.agent_runs where user_id = auth.uid() and status = 'active') then return jsonb_build_object('ok',false,'code','RUN_ACTIVE'); end if;
  if (select count(*) from private.agent_runs where user_id = auth.uid() and created_at > clock_timestamp() - interval '1 hour') >= 10 then return jsonb_build_object('ok',false,'code','QUOTA_EXCEEDED'); end if;
  -- Bound storage on each read/start/finish path; rate evidence is always retained for an hour.
  delete from private.agent_runs where user_id = auth.uid() and created_at < clock_timestamp() - interval '30 days';
  insert into private.agent_runs(user_id,conversation_id,id,status,input,model,run_key_hash,expires_at) values(auth.uid(),p_conversation_id,p_id,'active',p_input,p_model,sha256(convert_to(p_key,'UTF8'))::text,clock_timestamp() + interval '75 seconds');
  update private.chat_conversations c set last_activity_at = clock_timestamp(),
    title = case when not exists(select 1 from private.agent_runs r where r.user_id = auth.uid() and r.conversation_id = p_conversation_id and r.id <> p_id)
      then left(regexp_replace(btrim(p_input),'[[:space:]]+',' ','g'),80) else c.title end
    where c.user_id = auth.uid() and c.id = p_conversation_id;
  return jsonb_build_object('ok',true);
end;
$$;
create function public.start_agent_run(p_conversation_id uuid,p_id uuid,p_input text,p_model text,p_key text) returns jsonb language sql security invoker set search_path = '' as $$ select private.start_agent_run(p_conversation_id,p_id,p_input,p_model,p_key); $$;

create or replace function private.finish_agent_run(p_id uuid,p_status text,p_answer text,p_cards jsonb,p_history jsonb,p_error text,p_usage jsonb,p_key text,p_plans jsonb default '[]')
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_status not in ('completed','failed','interrupted') or p_status is null or char_length(p_answer) > 12000
    or jsonb_typeof(p_history) is distinct from 'array' or octet_length(p_history::text) > 524288
    or jsonb_array_length(p_history) > 200 or jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards) > 3
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

drop function public.agent_history();
drop function private.agent_history();
create function private.agent_history(p_conversation_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if not exists(select 1 from private.chat_conversations where user_id = auth.uid() and id = p_conversation_id) then raise no_data_found; end if;
  return coalesce((select jsonb_agg(r.history order by r.created_at,r.id) from
    (select case when status = 'completed' then history else
      jsonb_build_array(jsonb_build_object('role','user','content',input),
        jsonb_build_object('role','assistant','status','completed','content',jsonb_build_array(jsonb_build_object('type','output_text','text',
          'The previous run failed or was interrupted. Writes may have completed. Read current records before acting; never automatically replay the previous request.')))) end as history,
      created_at,id from private.agent_runs where user_id = auth.uid() and conversation_id = p_conversation_id and status <> 'active'
      and created_at > clock_timestamp() - interval '30 days' order by created_at desc,id desc limit 5) r),'[]');
end;
$$;

create function public.create_chat_conversation(p_id uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.create_chat_conversation(p_id); $$;
revoke all on function private.create_chat_conversation(uuid),public.create_chat_conversation(uuid) from public,anon,authenticated;
grant execute on function private.create_chat_conversation(uuid),public.create_chat_conversation(uuid) to authenticated;

create function public.list_chat_conversations(p_as_of timestamptz default null,p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb language sql security invoker set search_path = '' as $$ select private.list_chat_conversations(p_as_of,p_before_at,p_before_id); $$;
revoke all on function private.list_chat_conversations(timestamptz,timestamptz,uuid),public.list_chat_conversations(timestamptz,timestamptz,uuid) from public,anon,authenticated;
grant execute on function private.list_chat_conversations(timestamptz,timestamptz,uuid),public.list_chat_conversations(timestamptz,timestamptz,uuid) to authenticated;

create function public.chat_snapshot(p_conversation_id uuid,p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb language sql security invoker set search_path = '' as $$ select private.chat_snapshot(p_conversation_id,p_before_at,p_before_id); $$;
revoke all on function private.chat_snapshot(uuid,timestamptz,uuid),public.chat_snapshot(uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function private.chat_snapshot(uuid,timestamptz,uuid),public.chat_snapshot(uuid,timestamptz,uuid) to authenticated;

create function public.agent_history(p_conversation_id uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.agent_history(p_conversation_id); $$;
revoke all on function private.agent_history(uuid),public.agent_history(uuid) from public,anon,authenticated;
grant execute on function private.agent_history(uuid),public.agent_history(uuid) to authenticated;

revoke all on function private.start_agent_run(uuid,uuid,text,text,text),public.start_agent_run(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.start_agent_run(uuid,uuid,text,text,text),public.start_agent_run(uuid,uuid,text,text,text) to authenticated;
