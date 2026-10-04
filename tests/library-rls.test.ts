import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const readerA = "00000000-0000-4000-8000-00000000000a";
const readerB = "00000000-0000-4000-8000-00000000000b";
const bookA = "00000000-0000-4000-8000-000000000001";
const bookB = "00000000-0000-4000-8000-000000000002";
const database = new PGlite();

async function asReader(id: string) {
  await database.exec("reset role;");
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [id],
  );
  await database.exec("set role authenticated;");
}

describe("initial migration on PostgreSQL", () => {
  beforeAll(async () => {
    // Stand in only for Supabase's auth schema and verified JWT identity. RLS is real PostgreSQL.
    await database.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
    `);
    await database.query("insert into auth.users values ($1), ($2)", [
      readerA,
      readerB,
    ]);
    await database.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20261003152839_create_library_books.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await asReader(readerA);
    await database.query(
      "insert into public.library_books (id, user_id, title, authors) values ($1, $2, 'A book', array['Author'])",
      [bookA, readerA],
    );
    await asReader(readerB);
    await database.query(
      "insert into public.library_books (id, user_id, title, authors) values ($1, $2, 'B book', array['Author'])",
      [bookB, readerB],
    );
  }, 30000);

  afterAll(async () => {
    await database.close();
  });

  it("returns only the reader's books even without an application ownership filter", async () => {
    await asReader(readerA);
    const result = await database.query<{ id: string }>(
      "select id from public.library_books",
    );
    expect(result.rows).toEqual([{ id: bookA }]);
    const foreignBook = await database.query(
      "select * from public.library_books where id = $1",
      [bookB],
    );
    expect(foreignBook.rows).toEqual([]);
  });

  it("rejects inserting a book owned by another reader", async () => {
    await asReader(readerB);
    await expect(
      database.query(
        "insert into public.library_books (id, user_id, title, authors) values (gen_random_uuid(), $1, 'Forged owner', array['Author'])",
        [readerA],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("denies anonymous access and denies writes with no verified subject", async () => {
    await database.exec("reset role; set role anon;");
    await expect(
      database.query("select * from public.library_books"),
    ).rejects.toMatchObject({ code: "42501" });
    await asReader("");
    expect(
      (await database.query("select * from public.library_books")).rows,
    ).toEqual([]);
    await expect(
      database.query(
        "insert into public.library_books (id, user_id, title, authors) values (gen_random_uuid(), $1, 'No subject', array['Author'])",
        [readerA],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("denies update, delete, and overriding the server timestamp/version", async () => {
    await asReader(readerA);
    await expect(
      database.query(
        "update public.library_books set user_id = $1 where id = $2",
        [readerB, bookA],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      database.query("delete from public.library_books where id = $1", [bookA]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      database.query(
        "insert into public.library_books (id, user_id, title, authors, version) values (gen_random_uuid(), $1, 'Version override', array['Author'], 7)",
        [readerA],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("rejects duplicate save IDs and invalid values at the database boundary", async () => {
    await asReader(readerA);
    await expect(
      database.query(
        "insert into public.library_books (id, user_id, title, authors) values ($1, $2, 'Duplicate', array['Author'])",
        [bookA, readerA],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      database.query(
        "insert into public.library_books (id, user_id, title, authors, rating) values (gen_random_uuid(), $1, 'Invalid rating', array['Author'], 3.7)",
        [readerA],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      database.query(
        "insert into public.library_books (id, user_id, title, authors, page_count) values (gen_random_uuid(), $1, 'Invalid pages', array['Author'], 0)",
        [readerA],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      database.query(
        "insert into public.library_books (id, user_id, title, authors) values (gen_random_uuid(), $1, '  ', array['Author'])",
        [readerA],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
