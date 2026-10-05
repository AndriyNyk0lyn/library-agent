-- Optional insert-only edition provenance; existing books and import/update RPCs remain unchanged.
alter table public.library_books add column catalog_metadata jsonb;
alter table public.library_books add constraint library_books_catalog_metadata_check check (
  catalog_metadata is null or (
    jsonb_typeof(catalog_metadata) = 'object'
    and octet_length(catalog_metadata::text) <= 65536
    and catalog_metadata->>'provider' = 'open_library'
    and catalog_metadata->>'kind' = 'edition'
    and catalog_metadata->>'edition_id' ~ '^OL[0-9]+M$'
    and catalog_metadata->>'provider_id' = catalog_metadata->>'edition_id'
    and catalog_metadata->>'source_url' = 'https://openlibrary.org/books/' || (catalog_metadata->>'edition_id')
    and catalog_metadata ?& array['provider','kind','edition_id','provider_id','source_url']
  ) is true
);
-- Existing owner RLS governs inserts and reads. No UPDATE grant on provenance.
grant insert (catalog_metadata) on public.library_books to authenticated;

-- Preserve existing capability/lease checks; admit only the new safe activity name.
create or replace function private.record_agent_activity(p_id uuid,p_activity jsonb,p_key text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if jsonb_typeof(p_activity) is distinct from 'object' or (p_activity - 'tool' - 'phase' - 'outcome') <> '{}'
    or coalesce(p_activity->>'tool','') not in ('search_catalog','search_my_library','get_book','update_book','get_reader_profile','update_reader_profile','calculate_reading_plan','save_reading_plan','list_reading_plans')
    or coalesce(p_activity->>'phase','') not in ('started','completed')
    or (p_activity ? 'outcome' and coalesce(p_activity->>'outcome','') not in ('ok','error','uncertain')) then raise invalid_parameter_value; end if;
  update private.agent_runs set activity = activity || jsonb_build_array(p_activity)
    where user_id = auth.uid() and id = p_id and run_key_hash = sha256(convert_to(p_key,'UTF8'))::text and status = 'active' and expires_at > clock_timestamp() and jsonb_array_length(activity) < 100;
  return found;
end;
$$;
