create table public.library_books (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  authors text[] not null check (cardinality(authors) between 1 and 10 and array_position(authors, null) is null),
  status text not null default 'want_to_read' check (status in ('want_to_read', 'reading', 'finished', 'dropped')),
  rating numeric check (rating between 0.5 and 5 and mod(rating, 0.5) = 0),
  owned boolean,
  notes text not null default '' check (char_length(notes) <= 20000),
  page_count integer check (page_count between 1 and 100000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

create index library_books_owner_created_idx on public.library_books (user_id, created_at desc, id desc);

alter table public.library_books enable row level security;

-- Start with only the operations this slice implements, independent of project default grants.
revoke all on public.library_books from public, anon, authenticated;
grant select on public.library_books to authenticated;
grant insert (id, user_id, title, authors, status, rating, owned, notes, page_count) on public.library_books to authenticated;

create policy "Readers can view their own books"
  on public.library_books for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Readers can add their own books"
  on public.library_books for insert to authenticated
  with check ((select auth.uid()) = user_id);
