-- One read contract for UI pages and MCP cursors; no new table write grants.
create function public.search_library_books(
  p_query text default null,
  p_status text default null,
  p_owned boolean default null,
  p_limit integer default 26,
  p_offset integer default 0,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns setof public.library_books
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 51
    or p_offset is null or p_offset < 0 or p_offset > 249975
    or char_length(p_query) > 200
    or (p_status is not null and p_status not in ('want_to_read', 'reading', 'finished', 'dropped'))
    or ((p_before_created_at is null) <> (p_before_id is null))
    or (p_before_id is not null and p_offset <> 0)
  then
    raise exception 'Invalid library search parameters' using errcode = '22023';
  end if;

  return query
  select b.*
  from public.library_books b
  where b.user_id = (select auth.uid())
    and (p_status is null or b.status = p_status)
    and (p_owned is null or b.owned = p_owned)
    -- strpos treats punctuation and SQL LIKE wildcards as literal characters.
    and (nullif(btrim(p_query), '') is null
      or strpos(lower(b.title), lower(btrim(p_query))) > 0
      or exists (
        select 1 from unnest(b.authors) as author(name)
        where strpos(lower(author.name), lower(btrim(p_query))) > 0
      ))
    and (p_before_id is null or (b.created_at, b.id) < (p_before_created_at, p_before_id))
  order by b.created_at desc, b.id desc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.search_library_books(text, text, boolean, integer, integer, timestamptz, uuid) from public, anon;
grant execute on function public.search_library_books(text, text, boolean, integer, integer, timestamptz, uuid) to authenticated;
