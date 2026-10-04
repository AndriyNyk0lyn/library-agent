-- Related ownership is enforced even outside the app/RPC.
alter table public.library_books add constraint library_books_id_owner_key unique (id,user_id);
create table public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null,
  operation_id uuid not null,
  book_version integer not null check (book_version > 0),
  title text not null check (char_length(title) between 1 and 500),
  authors text[] not null check (cardinality(authors) between 1 and 10),
  page_count integer check (page_count between 1 and 100000),
  pages_read integer check (pages_read between 0 and 100000),
  remaining_pages integer not null check (remaining_pages between 1 and 100000),
  start_date date not null check (start_date between date '0001-01-01' and date '9999-12-31'),
  target_date date not null check (target_date between date '0001-01-01' and date '9999-12-31' and target_date >= start_date),
  timezone text not null check (char_length(timezone) between 1 and 100),
  pages_per_hour numeric check (pages_per_hour > 0 and pages_per_hour <= 10000),
  daily_reading_minutes integer check (daily_reading_minutes between 1 and 1440),
  available_days integer generated always as (target_date - start_date + 1) stored,
  daily_pages integer not null,
  estimated_daily_minutes numeric,
  time_feasibility text not null check (time_feasibility in ('feasible','unknown')),
  assumptions text[] not null check (cardinality(assumptions) <= 10),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id,operation_id),
  foreign key (book_id,user_id) references public.library_books(id,user_id) on delete cascade,
  check (page_count is null or (remaining_pages <= page_count and (pages_read is null or pages_read + remaining_pages = page_count))),
  check (daily_pages = ceil(remaining_pages::numeric / (target_date - start_date + 1))),
  check ((pages_per_hour is null and estimated_daily_minutes is null) or
    (pages_per_hour is not null and estimated_daily_minutes is not null and estimated_daily_minutes = ceil(daily_pages * 6000::numeric / pages_per_hour) / 100)),
  check ((time_feasibility = 'unknown' and (pages_per_hour is null or daily_reading_minutes is null)) or
    (time_feasibility = 'feasible' and pages_per_hour is not null and daily_reading_minutes is not null and estimated_daily_minutes <= daily_reading_minutes))
);
create index reading_plans_reader_page_idx on public.reading_plans(user_id,created_at desc,id desc);
create index reading_plans_book_owner_idx on public.reading_plans(book_id,user_id);
alter table public.reading_plans enable row level security;
revoke all on public.reading_plans from public,anon,authenticated;
grant select on public.reading_plans to authenticated;
create policy "Readers can read their own plans" on public.reading_plans for select to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.library_books b where b.id = book_id and b.user_id = (select auth.uid())));
-- Writes have no direct grants; only the checked, immutable, retry-safe RPC inserts.
create policy "Readers can save plans for their own books" on public.reading_plans for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.library_books b where b.id = book_id and b.user_id = (select auth.uid())));

-- Definer required for the existing private immutable ledger, with verified identity
-- and explicit owner predicates on every access. No owner argument is accepted.
create function private.save_reading_plan(p_input jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); previous private.book_operations; book public.library_books; plan public.reading_plans;
  operation_id uuid; book_id uuid; expected_version integer; start_date date; target_date date; timezone text;
  remaining integer; pages_read integer; speed numeric; minutes integer; days integer; daily integer; estimate numeric;
  assumptions text[]; feasibility text; calculation jsonb; outcome jsonb;
  request jsonb := jsonb_build_object('kind','reading_plan','input',p_input);
begin
  if owner_id is null then raise insufficient_privilege; end if;
  begin
    if jsonb_typeof(p_input) is distinct from 'object'
      or not p_input ?& array['book_id','expected_book_version','operation_id','start_date','target_date','timezone','remaining_pages']
      or exists (select 1 from jsonb_object_keys(p_input) k where k not in ('book_id','expected_book_version','operation_id','start_date','target_date','timezone','remaining_pages','pages_read','pages_per_hour','daily_reading_minutes'))
      or exists (select 1 from jsonb_each(p_input) e where
        (e.key in ('book_id','operation_id','start_date','target_date','timezone') and jsonb_typeof(e.value) <> 'string') or
        (e.key in ('expected_book_version','remaining_pages') and jsonb_typeof(e.value) <> 'number') or
        (e.key in ('pages_read','pages_per_hour','daily_reading_minutes') and jsonb_typeof(e.value) not in ('number','null')))
      then raise invalid_parameter_value; end if;
    operation_id := (p_input->>'operation_id')::uuid; book_id := (p_input->>'book_id')::uuid;
    expected_version := (p_input->>'expected_book_version')::integer;
    remaining := (p_input->>'remaining_pages')::integer; pages_read := (p_input->>'pages_read')::integer;
    speed := (p_input->>'pages_per_hour')::numeric; minutes := (p_input->>'daily_reading_minutes')::integer;
    timezone := p_input->>'timezone';
    if (p_input->>'start_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (p_input->>'target_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_parameter_value; end if;
    start_date := (p_input->>'start_date')::date; target_date := (p_input->>'target_date')::date;
    if expected_version < 1 or remaining not between 1 and 100000 or pages_read not between 0 and 100000
      or (speed <= 0 or speed > 10000) or minutes not between 1 and 1440
      or start_date not between date '0001-01-01' and date '9999-12-31' or target_date not between date '0001-01-01' and date '9999-12-31'
      or char_length(timezone) not between 1 and 100 or not exists (select 1 from pg_timezone_names t where t.name = timezone)
      then raise invalid_parameter_value; end if;
  exception when invalid_parameter_value or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check dates, pages, timezone, positive constraints, book version and operation ID.'));
  end;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':operation:' || operation_id::text,0));
  select * into previous from private.book_operations o where o.user_id = owner_id and o.operation_id = save_reading_plan.operation_id;
  if found then
    if previous.request = request then return previous.outcome; end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This operation ID has different inputs. Check saved plans before starting a new operation.'));
  end if;
  select * into book from public.library_books b where b.id = book_id and b.user_id = owner_id for update;
  if not found then outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_FOUND','message','Book not found in your library.'));
  elsif book.version <> expected_version then outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This book changed. Reload its current version before saving a plan.'));
  elsif target_date < start_date or start_date < (clock_timestamp() at time zone timezone)::date then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Start on or after today in the confirmed timezone, with target on or after start.'));
  elsif book.page_count is not null and (remaining > book.page_count or (pages_read is not null and remaining + pages_read <> book.page_count)) then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Remaining pages cannot exceed page count. Pages read plus remaining pages must equal the known count.'));
  else
    days := target_date - start_date + 1; daily := ceil(remaining::numeric / days); estimate := ceil(daily * 6000::numeric / speed) / 100;
    if estimate > 1e308::numeric then
      outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','This reading speed is too small to represent a time estimate. Check speed and units.'));
      insert into private.book_operations(user_id,operation_id,request,outcome) values(owner_id,operation_id,request,outcome);
      return outcome;
    end if;
    feasibility := case when speed is null or minutes is null then 'unknown' when estimate > minutes then 'infeasible' else 'feasible' end;
    assumptions := array[
      'Read every calendar day, including the start and target dates; the last day may need fewer pages.',
      'Remaining pages and progress are reader-declared; reading status does not establish progress.',
      case when speed is null then 'Reading speed is unknown; time feasibility is unknown.' else 'Time estimates assume a constant declared reading speed and exclude breaks.' end];
    if minutes is null then assumptions := array_append(assumptions,'Daily time budget is unknown; time feasibility is unknown.'); end if;
    if book.page_count is null then assumptions := array_append(assumptions,'Full page count is unknown; remaining pages cannot be checked against edition length.'); end if;
    calculation := jsonb_build_object('book_id',book.id,'book_version',book.version,'title',book.title,'authors',book.authors,'page_count',book.page_count,
      'pages_read',pages_read,'remaining_pages',remaining,'start_date',start_date,'target_date',target_date,'timezone',timezone,
      'pages_per_hour',speed,'daily_reading_minutes',minutes,'available_days',days,'daily_pages',daily,'estimated_daily_minutes',estimate,
      'time_feasibility',feasibility,'assumptions',assumptions);
    if feasibility = 'infeasible' then outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','PLAN_INFEASIBLE',
      'message','The daily page target exceeds the declared time budget. Agree on a later target, more time, or a shorter book before changing constraints.'),'constraints',calculation);
    else
      insert into public.reading_plans(user_id,book_id,operation_id,book_version,title,authors,page_count,pages_read,remaining_pages,start_date,target_date,timezone,pages_per_hour,daily_reading_minutes,daily_pages,estimated_daily_minutes,time_feasibility,assumptions)
        values(owner_id,book.id,operation_id,book.version,book.title,book.authors,book.page_count,pages_read,remaining,start_date,target_date,timezone,speed,minutes,daily,estimate,feasibility,assumptions) returning * into plan;
      outcome := jsonb_build_object('ok',true,'plan',to_jsonb(plan) - 'user_id');
    end if;
  end if;
  insert into private.book_operations(user_id,operation_id,request,outcome) values(owner_id,operation_id,request,outcome);
  return outcome;
end;
$$;
create function public.save_reading_plan(p_input jsonb) returns jsonb language sql security invoker set search_path = '' as $$ select private.save_reading_plan(p_input); $$;
revoke all on function private.save_reading_plan(jsonb) from public,anon,authenticated;
revoke all on function public.save_reading_plan(jsonb) from public,anon,authenticated;
grant execute on function private.save_reading_plan(jsonb),public.save_reading_plan(jsonb) to authenticated;

create function public.list_reading_plans(p_book_id uuid default null,p_status text default null,p_limit integer default 11,p_before_created_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_limit is null or p_limit not between 1 and 26 or (p_status is not null and p_status not in ('active','completed','cancelled'))
    or (p_before_created_at is null) <> (p_before_id is null) then raise invalid_parameter_value; end if;
  return coalesce((select jsonb_agg(to_jsonb(p) - 'user_id' order by p.created_at desc,p.id desc) from (
    select p.* from public.reading_plans p join public.library_books b on b.id = p.book_id and b.user_id = p.user_id
    where p.user_id = auth.uid() and b.user_id = auth.uid() and (p_book_id is null or p.book_id = p_book_id)
      and (p_status is null or p.status = p_status) and (p_before_created_at is null or (p.created_at,p.id) < (p_before_created_at,p_before_id))
    order by p.created_at desc,p.id desc limit p_limit
  ) p),'[]');
end;
$$;
revoke all on function public.list_reading_plans(uuid,text,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.list_reading_plans(uuid,text,integer,timestamptz,uuid) to authenticated;

-- Persist authoritative observed plan results separately from model output/recommendation cards.
alter table private.agent_runs add column plans jsonb not null default '[]' check (jsonb_typeof(plans) = 'array' and jsonb_array_length(plans) <= 5 and octet_length(plans::text) <= 100000);
create or replace function private.record_agent_activity(p_id uuid,p_activity jsonb,p_key text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_activity) is distinct from 'object' or (p_activity - 'tool' - 'phase' - 'outcome') <> '{}'
    or coalesce(p_activity->>'tool','') not in ('search_my_library','get_book','update_book','get_reader_profile','update_reader_profile','calculate_reading_plan','save_reading_plan','list_reading_plans')
    or coalesce(p_activity->>'phase','') not in ('started','completed')
    or (p_activity ? 'outcome' and coalesce(p_activity->>'outcome','') not in ('ok','error','uncertain')) then raise invalid_parameter_value; end if;
  update private.agent_runs set activity = activity || jsonb_build_array(p_activity)
    where user_id = auth.uid() and id = p_id and run_key_hash = sha256(convert_to(p_key,'UTF8'))::text and status = 'active' and expires_at > clock_timestamp() and jsonb_array_length(activity) < 100;
  return found;
end;
$$;

drop function public.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text);
drop function private.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text);
create function private.finish_agent_run(p_id uuid,p_status text,p_answer text,p_cards jsonb,p_history jsonb,p_error text,p_usage jsonb,p_key text,p_plans jsonb default '[]')
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
  update private.agent_runs set history = '[]' where user_id = auth.uid() and history <> '[]'
    and id not in (select id from private.agent_runs where user_id = auth.uid() and status <> 'active' order by created_at desc,id desc limit 5);
  return true;
end;
$$;
create function public.finish_agent_run(p_id uuid,p_status text,p_answer text,p_cards jsonb,p_history jsonb,p_error text,p_usage jsonb,p_key text,p_plans jsonb default '[]')
returns boolean language sql security invoker set search_path = '' as $$ select private.finish_agent_run(p_id,p_status,p_answer,p_cards,p_history,p_error,p_usage,p_key,p_plans); $$;


revoke all on function private.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text,jsonb),public.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function private.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text,jsonb),public.finish_agent_run(uuid,text,text,jsonb,jsonb,text,jsonb,text,jsonb) to authenticated;
