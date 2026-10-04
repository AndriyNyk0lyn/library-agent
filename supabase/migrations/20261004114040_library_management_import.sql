alter table public.library_books
  add column isbn10 text check (isbn10 ~ '^[0-9]{9}[0-9X]$'),
  add column isbn13 text check (isbn13 ~ '^[0-9]{13}$'),
  add column goodreads_book_id text check (goodreads_book_id ~ '^[0-9]{1,30}$'),
  add column imported_shelves text[] not null default '{}' check (cardinality(imported_shelves) <= 100),
  add column goodreads_date_added date check (goodreads_date_added between date '0001-01-01' and date '9999-12-31'),
  add column started_at date check (started_at between date '0001-01-01' and date '9999-12-31'),
  add column finished_at date check (finished_at between date '0001-01-01' and date '9999-12-31'),
  add column updated_at timestamptz not null default now(),
  add constraint library_book_dates check (started_at is null or finished_at is null or started_at <= finished_at);

create unique index library_books_goodreads_idx on public.library_books(user_id, goodreads_book_id) where goodreads_book_id is not null;
create index library_books_isbn10_idx on public.library_books(user_id, isbn10) where isbn10 is not null;
create index library_books_isbn13_idx on public.library_books(user_id, isbn13) where isbn13 is not null;

grant insert (isbn10, isbn13, goodreads_book_id, imported_shelves, goodreads_date_added, started_at, finished_at) on public.library_books to authenticated;
grant update (status, rating, owned, notes, page_count, started_at, finished_at) on public.library_books to authenticated;
create policy "Readers can update their own books" on public.library_books for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.advance_book_version() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.advance_book_version() from public, anon, authenticated;
create trigger advance_book_version before update on public.library_books for each row execute function public.advance_book_version();

-- Private durable coordination is writable only by the checked mutation function.
-- The definer is needed to keep clients from forging recorded success outcomes;
-- it does not accept an owner argument and scopes every access to auth.uid().
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Immutable outcomes are scoped to the reader, including errors. No UPDATE or DELETE grants.
create table private.book_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request jsonb not null,
  outcome jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
alter table private.book_operations enable row level security;
revoke all on private.book_operations from public, anon, authenticated;

create policy "Readers can read their operation outcomes" on private.book_operations for select to authenticated using ((select auth.uid()) = user_id);
create policy "Readers can record their operation outcomes" on private.book_operations for insert to authenticated with check ((select auth.uid()) = user_id);

create function private.update_library_book(p_id uuid, p_expected_version integer, p_operation_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  previous private.book_operations;
  book public.library_books;
  changed public.library_books;
  request jsonb := jsonb_build_object('id', p_id, 'expected_version', p_expected_version, 'patch', p_patch);
  outcome jsonb;
  note_mode text := coalesce(p_patch->>'notes_mode', 'append');
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_id is null or p_operation_id is null or p_expected_version is null or p_expected_version < 1
    or jsonb_typeof(p_patch) is distinct from 'object' or p_patch = '{}'
    or exists (select 1 from jsonb_object_keys(p_patch) k where k not in ('status','rating','owned','notes','notes_mode','page_count','started_at','finished_at'))
    or note_mode not in ('append','replace')
    or (p_patch ? 'notes_mode' and jsonb_typeof(p_patch->'notes_mode') is distinct from 'string')
    or (p_patch ? 'notes_mode' and not p_patch ? 'notes')
    or (p_patch ? 'notes' and (jsonb_typeof(p_patch->'notes') is distinct from 'string' or char_length(p_patch->>'notes') > 20000))
    or (p_patch ? 'status' and jsonb_typeof(p_patch->'status') is distinct from 'string')
    or (p_patch ? 'rating' and jsonb_typeof(p_patch->'rating') not in ('number','null'))
    or (p_patch ? 'owned' and jsonb_typeof(p_patch->'owned') not in ('boolean','null'))
    or (p_patch ? 'page_count' and jsonb_typeof(p_patch->'page_count') not in ('number','null'))
    or (p_patch ? 'started_at' and jsonb_typeof(p_patch->'started_at') not in ('string','null'))
    or (p_patch ? 'finished_at' and jsonb_typeof(p_patch->'finished_at') not in ('string','null')) then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check the allowed book fields, version, and operation ID.'));
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
      changed := jsonb_populate_record(book, p_patch - 'notes_mode');
      if p_patch ? 'notes' and note_mode = 'append' then
        changed.notes := book.notes || case when book.notes <> '' and changed.notes <> '' then E'\n\n' else '' end || changed.notes;
      end if;
      update public.library_books set status = changed.status, rating = changed.rating, owned = changed.owned,
        notes = changed.notes, page_count = changed.page_count, started_at = changed.started_at, finished_at = changed.finished_at
        where id = p_id and user_id = auth.uid() and version = p_expected_version returning * into book;
      outcome := jsonb_build_object('ok',true,'book',to_jsonb(book) - 'user_id');
    exception when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
      outcome := jsonb_build_object('ok',false,'error',jsonb_build_object('code','VALIDATION_ERROR','message','Check rating, pages, notes length, and date order.'));
    end;
  end if;
  insert into private.book_operations(user_id, operation_id, request, outcome) values(auth.uid(),p_operation_id,request,outcome);
  return outcome;
end;
$$;
revoke all on function private.update_library_book(uuid,integer,uuid,jsonb) from public, anon, authenticated;
grant execute on function private.update_library_book(uuid,integer,uuid,jsonb) to authenticated;

create function public.update_library_book(p_id uuid, p_expected_version integer, p_operation_id uuid, p_patch jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.update_library_book(p_id,p_expected_version,p_operation_id,p_patch);
$$;
revoke all on function public.update_library_book(uuid,integer,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.update_library_book(uuid,integer,uuid,jsonb) to authenticated;

-- The same routine previews and confirms. Confirmation rechecks identity under a reader lock.
create function public.import_library_batch(p_rows jsonb, p_confirm boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  book public.library_books;
  candidates jsonb;
  results jsonb := '[]';
  code text;
  row_number integer;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 50 or p_confirm is null then
    raise invalid_parameter_value using message = 'Use batches of at most 50 rows.';
  end if;
  if p_confirm then perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':import',0)); end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    row_number := (item->>'row')::integer;
    candidates := '[]';
    begin
      book := jsonb_populate_record(null::public.library_books, item->'book');
      if exists(select 1 from public.library_books b where b.user_id = auth.uid() and (
        b.id = book.id or (book.goodreads_book_id is not null and b.goodreads_book_id = book.goodreads_book_id)
        or (book.goodreads_book_id is null and ((book.isbn10 is not null and b.isbn10 = book.isbn10) or (book.isbn13 is not null and b.isbn13 = book.isbn13)))
      )) then code := 'duplicate';
      else
        select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'title', b.title, 'authors', b.authors, 'isbn10', b.isbn10, 'isbn13', b.isbn13)), '[]') into candidates
          from (select id,title,authors,isbn10,isbn13 from public.library_books b where b.user_id = auth.uid()
            and lower(btrim(b.title)) = lower(btrim(book.title))
            and exists(select 1 from unnest(b.authors) a, unnest(book.authors) c where lower(btrim(a)) = lower(btrim(c))) limit 10) b;
        if candidates <> '[]' and coalesce((item->>'allow_ambiguous')::boolean,false) = false then code := 'ambiguous';
        elsif not p_confirm then code := 'ready';
        else
          insert into public.library_books(id,user_id,title,authors,status,rating,owned,notes,page_count,isbn10,isbn13,goodreads_book_id,imported_shelves,goodreads_date_added,started_at,finished_at)
            values(book.id,auth.uid(),book.title,book.authors,book.status,book.rating,book.owned,book.notes,book.page_count,book.isbn10,book.isbn13,book.goodreads_book_id,coalesce(book.imported_shelves,'{}'),book.goodreads_date_added,book.started_at,book.finished_at);
          code := 'added';
        end if;
      end if;
    exception
      when unique_violation then code := 'duplicate';
      when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then code := 'failed';
    end;
    results := results || jsonb_build_array(jsonb_build_object('row',row_number,'code',code,'candidates',candidates));
  end loop;
  return results;
end;
$$;
revoke all on function public.import_library_batch(jsonb,boolean) from public, anon, authenticated;
grant execute on function public.import_library_batch(jsonb,boolean) to authenticated;
