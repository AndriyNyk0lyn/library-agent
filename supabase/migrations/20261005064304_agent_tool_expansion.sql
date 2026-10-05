-- Reader-managed content is editable; identity, owner, version/timestamps and provenance stay protected.
create function private.valid_book_patch(p_patch jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare k text; v jsonb;
begin
  if jsonb_typeof(p_patch) is distinct from 'object' or p_patch = '{}' then return false; end if;
  for k,v in select key,value from jsonb_each(p_patch) loop
    if k in ('title','status','notes','notes_mode') then
      if jsonb_typeof(v) <> 'string' then return false; end if;
    elsif k in ('isbn10','isbn13','goodreads_book_id','goodreads_date_added','started_at','finished_at') then
      if jsonb_typeof(v) not in ('string','null') then return false; end if;
    elsif k in ('rating','page_count') then
      if jsonb_typeof(v) not in ('number','null') then return false; end if;
    elsif k = 'owned' then
      if jsonb_typeof(v) not in ('boolean','null') then return false; end if;
    elsif k in ('authors','imported_shelves') then
      if jsonb_typeof(v) <> 'array' then return false; end if;
      if exists (select 1 from jsonb_array_elements(v) a where jsonb_typeof(a) <> 'string' or char_length(a #>> '{}') > 200) then return false; end if;
      if k = 'authors' and (jsonb_array_length(v) not between 1 and 10 or exists(select 1 from jsonb_array_elements_text(v) a where btrim(a) = '')) then return false; end if;
      if k = 'imported_shelves' and jsonb_array_length(v) > 100 then return false; end if;
    else return false;
    end if;
  end loop;
  if p_patch ? 'title' and (char_length(btrim(p_patch->>'title')) not between 1 and 500) then return false; end if;
  if p_patch ? 'notes' and char_length(p_patch->>'notes') > 20000 then return false; end if;
  if p_patch ? 'notes_mode' and (not p_patch ? 'notes' or p_patch->>'notes_mode' not in ('append','replace')) then return false; end if;
  if p_patch ? 'page_count' and p_patch->>'page_count' is not null and
    ((p_patch->>'page_count')::numeric not between 1 and 100000 or trunc((p_patch->>'page_count')::numeric) <> (p_patch->>'page_count')::numeric) then return false; end if;
  return true;
end;
$$;
revoke all on function private.valid_book_patch(jsonb) from public, anon, authenticated;

-- Shared patch semantics for single and bulk writes; the caller owns validation and row locks.
create function private.patched_book(p_book public.library_books,p_patch jsonb) returns public.library_books
language plpgsql immutable security invoker set search_path = '' as $$
declare changed public.library_books;
begin
  changed := jsonb_populate_record(p_book,p_patch - 'notes_mode');
  if p_patch ? 'notes' and coalesce(p_patch->>'notes_mode','append') = 'append' then
    changed.notes := p_book.notes || case when p_book.notes <> '' and changed.notes <> '' then E'\n\n' else '' end || changed.notes;
  end if;
  return changed;
end;
$$;
revoke all on function private.patched_book(public.library_books,jsonb) from public,anon,authenticated;

create or replace function private.update_library_book(p_id uuid, p_expected_version integer, p_operation_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  previous private.book_operations;
  book public.library_books;
  changed public.library_books;
  request jsonb := jsonb_build_object('id', p_id, 'expected_version', p_expected_version, 'patch', p_patch);
  outcome jsonb;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_id is null or p_operation_id is null or p_expected_version is null or p_expected_version < 1
    or not private.valid_book_patch(p_patch) then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check the editable book fields, version, and operation ID.'));
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':operation:' || p_operation_id::text, 0));
  select * into previous from private.book_operations where user_id = auth.uid() and operation_id = p_operation_id;
  if found then
    if previous.request = request then return previous.outcome; end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This operation ID has different inputs. Read the current book and use a new operation ID.'));
  end if;
  select * into book from public.library_books where id = p_id and user_id = auth.uid() for update;
  if not found then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_FOUND','message','Book not found in your library.'));
  elsif book.version <> p_expected_version then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This book changed. Read the current version before saving again.'),'current',to_jsonb(book) - 'user_id');
  else
    begin
      changed := private.patched_book(book,p_patch);
      update public.library_books set title = changed.title, authors = changed.authors,
        isbn10 = changed.isbn10, isbn13 = changed.isbn13, goodreads_book_id = changed.goodreads_book_id,
        imported_shelves = changed.imported_shelves, goodreads_date_added = changed.goodreads_date_added,
        status = changed.status, rating = changed.rating, owned = changed.owned,
        notes = changed.notes, page_count = changed.page_count, started_at = changed.started_at, finished_at = changed.finished_at
        where id = p_id and user_id = auth.uid() and version = p_expected_version returning * into book;
      outcome := jsonb_build_object('ok',true,'book',to_jsonb(book) - 'user_id');
    exception when unique_violation or check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
      outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check rating, pages, notes length, and date order.'));
    end;
  end if;
  insert into private.book_operations(user_id, operation_id, request, outcome) values(auth.uid(),p_operation_id,request,outcome);
  return outcome;
end;
$$;

-- Frozen bulk targets live in the existing private immutable operation ledger.
-- Preview/application expose only counts and five identities, never full notes or target payloads.
create function private.preview_library_update(p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); preview_id uuid; filters jsonb; targets jsonb; sample jsonb;
  previous private.book_operations; outcome jsonb; request jsonb;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_input) is distinct from 'object' or (p_input - 'preview_id' - 'filters' - 'patch') <> '{}'
    or not private.valid_book_patch(p_input->'patch') then raise invalid_parameter_value; end if;
  preview_id := (p_input->>'preview_id')::uuid;
  filters := p_input->'filters';
  if preview_id is null or jsonb_typeof(filters) is distinct from 'object' or (filters - 'query' - 'status' - 'owned') <> '{}'
    or (filters ? 'query' and (jsonb_typeof(filters->'query') <> 'string' or char_length(filters->>'query') > 200))
    or (filters ? 'status' and (jsonb_typeof(filters->'status') <> 'string' or filters->>'status' not in ('want_to_read','reading','finished','dropped')))
    or (filters ? 'owned' and jsonb_typeof(filters->'owned') <> 'boolean') then raise invalid_parameter_value; end if;
  request := jsonb_build_object('tool','preview_library_update','input',p_input);
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':operation:' || preview_id::text,0));
  select * into previous from private.book_operations o where o.user_id = owner_id and o.operation_id = preview_id;
  if found then
    if previous.request = request then return previous.outcome - 'targets'; end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This preview ID has different inputs. Use a fresh preview ID.'));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'version',b.version,'title',b.title,'authors',b.authors) order by b.id),'[]') into targets
  from (select id,version,title,authors from public.library_books b where b.user_id = owner_id
    and (not filters ? 'status' or b.status = filters->>'status')
    and (not filters ? 'owned' or b.owned = (filters->>'owned')::boolean)
    and (nullif(btrim(filters->>'query'),'') is null or strpos(lower(b.title),lower(btrim(filters->>'query'))) > 0
      or exists(select 1 from unnest(b.authors) a where strpos(lower(a),lower(btrim(filters->>'query'))) > 0))
    order by b.id limit 5001) b;
  if jsonb_array_length(targets) > 5000 then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','More than 5,000 books match. Narrow the library filters. No changes made.'));
  end if;
  select coalesce(jsonb_agg(t.value - 'version' order by t.ordinality),'[]') into sample from jsonb_array_elements(targets) with ordinality t(value,ordinality) where t.ordinality <= 5;
  outcome := jsonb_build_object('ok',true,'preview_id',preview_id,'matched_count',jsonb_array_length(targets),'changed_count',0,'applied',false,
    'patch',p_input->'patch','sample',sample,'expires_at',clock_timestamp() + interval '15 minutes','targets',targets);
  insert into private.book_operations(user_id,operation_id,request,outcome) values(owner_id,preview_id,request,outcome);
  return outcome - 'targets';
end;
$$;

create function private.apply_library_update(p_preview_id uuid,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); previous private.book_operations; preview private.book_operations;
  request jsonb := jsonb_build_object('tool','apply_library_update','preview_id',p_preview_id);
  outcome jsonb; changed_count integer; conflict boolean := false;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if p_preview_id is null or p_operation_id is null then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':operation:' || p_operation_id::text,0));
  select * into previous from private.book_operations o where o.user_id = owner_id and o.operation_id = p_operation_id;
  if found then
    if previous.request = request then return previous.outcome; end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This operation ID has different inputs.'));
  end if;
  select * into preview from private.book_operations o where o.user_id = owner_id and o.operation_id = p_preview_id and o.request->>'tool' = 'preview_library_update';
  if not found then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','NOT_FOUND','message','Bulk preview not found for this reader.'));
  elsif (preview.outcome->>'expires_at')::timestamptz <= clock_timestamp() then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','Bulk preview expired. Prepare a fresh preview; no books changed.'));
  else
    -- Lock all rows in a stable order, then check the complete snapshot before any write.
    perform b.id from public.library_books b join jsonb_array_elements(preview.outcome->'targets') t on b.id = (t->>'id')::uuid
      where b.user_id = owner_id order by b.id for update of b;
    select exists(select 1 from jsonb_array_elements(preview.outcome->'targets') t
      left join public.library_books b on b.id = (t->>'id')::uuid and b.user_id = owner_id
      where b.id is null or b.version <> (t->>'version')::integer) into conflict;
    if conflict then
      outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','A previewed book changed or disappeared. No books changed. Prepare a fresh preview.'));
    else
      begin
        update public.library_books b set title = (c.changed).title, authors = (c.changed).authors,
          isbn10 = (c.changed).isbn10, isbn13 = (c.changed).isbn13, goodreads_book_id = (c.changed).goodreads_book_id,
          imported_shelves = (c.changed).imported_shelves, goodreads_date_added = (c.changed).goodreads_date_added,
          status = (c.changed).status, rating = (c.changed).rating, owned = (c.changed).owned,
          notes = (c.changed).notes, page_count = (c.changed).page_count, started_at = (c.changed).started_at, finished_at = (c.changed).finished_at
        from (select current_book.id,private.patched_book(current_book,preview.outcome->'patch') as changed
          from public.library_books current_book join jsonb_array_elements(preview.outcome->'targets') t on current_book.id = (t->>'id')::uuid
          where current_book.user_id = owner_id) c
        where b.id = c.id and b.user_id = owner_id;
        get diagnostics changed_count = row_count;
        outcome := (preview.outcome - 'targets') || jsonb_build_object('applied',true,'changed_count',changed_count);
      exception when unique_violation or check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
        -- A rejected row rolls back the entire statement; the outer transaction records the definitive failure.
        outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','At least one book rejected the patch (check dates, notes length or duplicate IDs). No books changed.'));
      end;
    end if;
  end if;
  insert into private.book_operations(user_id,operation_id,request,outcome) values(owner_id,p_operation_id,request,outcome);
  return outcome;
end;
$$;

-- A catalog addition freezes server-fetched edition metadata on the first successful write.
-- p_candidate=null is a read-only recovery probe: it never inserts or reserves an operation.
create function private.add_catalog_book(p_input jsonb,p_candidate jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); addition_operation_id uuid; previous private.book_operations; book public.library_books;
  fields jsonb; request jsonb; outcome jsonb; edition_id text;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_input) is distinct from 'object' or (p_input - 'operation_id' - 'edition_id' - 'fields') <> '{}' then raise invalid_parameter_value; end if;
  addition_operation_id := (p_input->>'operation_id')::uuid; edition_id := p_input->>'edition_id'; fields := coalesce(p_input->'fields','{}');
  if addition_operation_id is null or edition_id is null or edition_id !~ '^OL[0-9]+M$' or char_length(edition_id) > 40
    or (fields <> '{}' and not private.valid_book_patch(fields)) or jsonb_typeof(fields) <> 'object' then raise invalid_parameter_value; end if;
  request := jsonb_build_object('tool','add_catalog_book','input',p_input);
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':operation:' || addition_operation_id::text,0));
  select * into previous from private.book_operations o where o.user_id = owner_id and o.operation_id = addition_operation_id;
  if found then
    if previous.request = request then return previous.outcome; end if;
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This operation ID has different addition inputs.'));
  end if;
  if p_candidate is null then return null; end if;
  if (jsonb_typeof(p_candidate) = 'object' and p_candidate->>'provider' = 'open_library' and p_candidate->>'kind' = 'edition'
    and p_candidate->>'edition_id' = edition_id and p_candidate->>'provider_id' = edition_id
    and p_candidate->>'source_url' = 'https://openlibrary.org/books/' || edition_id) is distinct from true then raise invalid_parameter_value; end if;
  -- Serialize tool additions for this reader, so two new operation IDs cannot add the same edition concurrently.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || ':catalog-add',0));
  if exists(select 1 from public.library_books b where b.user_id = owner_id and
    (b.catalog_metadata->>'edition_id' = edition_id
      or (p_candidate->>'isbn10' is not null and b.isbn10 = p_candidate->>'isbn10')
      or (p_candidate->>'isbn13' is not null and b.isbn13 = p_candidate->>'isbn13')
      or (lower(btrim(b.title)) = lower(btrim(p_candidate->>'title')) and exists(select 1 from unnest(b.authors) a, jsonb_array_elements_text(p_candidate->'authors') c where lower(btrim(a)) = lower(btrim(c)))))) then
    outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','CONFLICT','message','This edition, ISBN or matching title/author already exists. Check your library; no automatic merge or duplicate addition.'));
  else
    begin
      book := jsonb_populate_record(null::public.library_books, jsonb_build_object('title',p_candidate->'title','authors',p_candidate->'authors',
        'page_count',p_candidate->'page_count','isbn10',p_candidate->'isbn10','isbn13',p_candidate->'isbn13',
        'status','want_to_read','owned',null,'rating',null,'notes','','imported_shelves','[]'::jsonb) || (fields - 'notes_mode'));
      insert into public.library_books(id,user_id,title,authors,status,rating,owned,notes,page_count,isbn10,isbn13,goodreads_book_id,imported_shelves,goodreads_date_added,started_at,finished_at,catalog_metadata)
        values(gen_random_uuid(),owner_id,book.title,book.authors,book.status,book.rating,book.owned,book.notes,book.page_count,book.isbn10,book.isbn13,book.goodreads_book_id,book.imported_shelves,book.goodreads_date_added,book.started_at,book.finished_at,p_candidate)
        returning * into book;
      outcome := jsonb_build_object('ok',true,'book',to_jsonb(book) - 'user_id');
    exception when unique_violation or check_violation or not_null_violation or invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
      outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check title/authors, personal fields, dates and edition metadata. Missing authors require reader-supplied authors.'));
    end;
  end if;
  insert into private.book_operations(user_id,operation_id,request,outcome) values(owner_id,addition_operation_id,request,outcome);
  return outcome;
end;
$$;

create function public.preview_library_update(p_input jsonb) returns jsonb language sql security invoker set search_path = '' as $$ select private.preview_library_update(p_input); $$;
create function public.apply_library_update(p_preview_id uuid,p_operation_id uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.apply_library_update(p_preview_id,p_operation_id); $$;
create function public.add_catalog_book(p_input jsonb,p_candidate jsonb default null) returns jsonb language sql security invoker set search_path = '' as $$ select private.add_catalog_book(p_input,p_candidate); $$;
revoke all on function private.preview_library_update(jsonb),private.apply_library_update(uuid,uuid),private.add_catalog_book(jsonb,jsonb),public.preview_library_update(jsonb),public.apply_library_update(uuid,uuid),public.add_catalog_book(jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.preview_library_update(jsonb),private.apply_library_update(uuid,uuid),private.add_catalog_book(jsonb,jsonb),public.preview_library_update(jsonb),public.apply_library_update(uuid,uuid),public.add_catalog_book(jsonb,jsonb) to authenticated;

create or replace function private.record_agent_activity(p_id uuid,p_activity jsonb,p_key text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_activity) is distinct from 'object' or (p_activity - 'tool' - 'phase' - 'outcome') <> '{}'
    or coalesce(p_activity->>'tool','') not in ('search_catalog','get_catalog_book','add_catalog_book','preview_library_update','apply_library_update','search_web','search_my_library','get_book','update_book','get_reader_profile','update_reader_profile','calculate_reading_plan','save_reading_plan','list_reading_plans')
    or coalesce(p_activity->>'phase','') not in ('started','completed')
    or (p_activity ? 'outcome' and coalesce(p_activity->>'outcome','') not in ('ok','error','uncertain')) then raise invalid_parameter_value; end if;
  update private.agent_runs set activity = activity || jsonb_build_array(p_activity)
    where user_id = auth.uid() and id = p_id and run_key_hash = sha256(convert_to(p_key,'UTF8'))::text and status = 'active' and expires_at > clock_timestamp() and jsonb_array_length(activity) < 100;
  return found;
end;
$$;
