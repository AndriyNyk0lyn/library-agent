# Connect the first working library

The app now implements sign-up, email confirmation, sign-in, sign-out, password recovery, and adding/listing private books. Your Supabase project and `.env.local` are prepared. Custom SMTP is deferred; use the email address belonging to your Supabase organization for initial email tests. The default sender has restrictive limits. [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

## 1. Check the local app origin

Keep this in `.env.local` alongside your existing Supabase URL and publishable key:

```dotenv
APP_BASE_URL=http://localhost:3000
```

The server uses this trusted origin for confirmation redirects. Keep the app on port 3000 while testing these links. OpenAI values are not used by the current library. Restart `npm run dev` after changing environment values.

## 2. Finish the email configuration

In your development project's **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: add `http://localhost:3000/auth/confirm`

Keep email/password authentication and email confirmation enabled. Under **Authentication → Email Templates**, update these templates:

**Confirm sign up** — copy the contents of [confirmation.html](../../supabase/templates/confirmation.html):

```html
<h2>Confirm your email</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">Confirm email</a></p>
```

**Reset password** — copy the contents of [recovery.html](../../supabase/templates/recovery.html):

```html
<h2>Reset your password</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a></p>
```

These links send a one-time token hash to the implemented `/auth/confirm` handler. It verifies the token and establishes a cookie session, then redirects to the library or `/auth/reset-password`. Arbitrary redirect destinations are not accepted. [Supabase password/confirmation flow](https://supabase.com/docs/guides/auth/passwords), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

When deploying, update both Site URL and `APP_BASE_URL` to your real HTTPS app origin, and allow its exact `/auth/confirm` URL. The current templates intentionally use Site URL: they do not support simultaneous localhost and production destinations on one Supabase project. Use a separate development project for local testing after production launch.

## 3. Prepare CLI credentials in your terminal

The Supabase CLI is already installed as a pinned project development dependency. Run commands from this project root.

Create a **scoped personal access token** in [Supabase account token settings](https://supabase.com/dashboard/account/tokens), limited to this development project. For linking, grant **Read** access to **Project Settings**, **API Keys**, and **API Key Secrets**. Add **Database → Read** only if you will generate types. These permissions come from the [official CLI token guide](https://supabase.com/docs/guides/platform/personal-access-tokens#use-a-scoped-personal-access-token-with-the-supabase-cli).

Use your existing database password from the password manager. In zsh, the following prompts hide your entries and avoid putting their values in shell history:

```sh
read -s "SUPABASE_ACCESS_TOKEN?Scoped Supabase token: "
echo
export SUPABASE_ACCESS_TOKEN
read -s "SUPABASE_DB_PASSWORD?Development database password: "
echo
export SUPABASE_DB_PASSWORD
```

These credentials are for your terminal, not `.env.local` or the browser. Database-password commands can change the database independently of token scope, so verify the development target before applying anything. The automatic `supabase login` browser flow creates a classic account-wide token; the scoped environment variable above avoids that.

## 4. Link, review, and apply the migration

Replace `YOUR_DEVELOPMENT_PROJECT_REF` with the project reference shown in your development dashboard. Never use the database password in a command argument.

```sh
npx supabase link --project-ref YOUR_DEVELOPMENT_PROJECT_REF
npx supabase migration list --linked
npx supabase db push --linked --dry-run --skip-vault
```

Review the linked project and dry-run output. It should list only [20261003152839_create_library_books.sql](../../supabase/migrations/20261003152839_create_library_books.sql). If the database already has a conflicting `library_books` table or other migration history, stop and reconcile it before applying; do not reset the database or force a history repair.

The migration creates `public.library_books`, its ownership index, RLS policies, and explicit authenticated grants. It supports owner-only SELECT and INSERT. UPDATE and DELETE remain denied until those features are implemented. It stores title/authors, status, nullable rating/ownership/pages, notes, creation timestamp, and a version. Later features will extend the schema through new migrations.

Once the development target and migration are correct:

```sh
npx supabase db push --linked --skip-vault
npx supabase migration list --linked
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD
```

The migration should appear in both local and remote history. Do not paste its SQL directly into the dashboard; the CLI preserves migration history. Applying the migration does not change your hosted auth settings or templates. [Migration workflow](https://supabase.com/docs/guides/deployment/database-migrations).

The checked-in `database.types.ts` currently describes the reviewed migration by hand. After applying it, verify generated types before adopting them. With the scoped token available, generate into a temporary review file:

```sh
npx supabase gen types --linked --lang typescript --schema public > /tmp/library-agent-database.types.ts
```

Do not overwrite the checked-in file blindly: the application uses its `LibraryBookRow` alias too. Unset the token after this optional check.

## 5. Run the first book flow

```sh
npm run dev
```

1. Open `http://localhost:3000/auth/sign-up`. Use the email address associated with your Supabase organization and a password of at least 8 characters.
2. Receive the confirmation email and follow its link while the app is running. You should reach `/library` signed in. If a link expires, use **Resend confirmation** on the sign-in page; respect the default sender's rate limits.
3. Click **Add a book**. Enter a disposable title and one author per line. Leave rating/pages/ownership unknown if you do not know them.
4. Save; the book should appear in the library. Refresh and verify the same book remains.
5. Sign out, then sign back in. Verify the book still appears. Signed-out requests to `/library`, `/library/new`, and password update must redirect to sign-in.
6. Test **Forgot password?**, receive the recovery email, choose a new password, and verify sign-in using it. Password entries stay in the browser and are never returned in action state.

On a failed save, the form retains input. Check the library before retrying an uncertain write. Retrying the same form and details keeps its book ID, preventing a duplicate insert. Changed details under a previously saved ID produce a conflict rather than overwrite a saved book.

## 6. Verify two real accounts before expanding access

Use two confirmed disposable accounts. With default SMTP, both email recipients must be eligible organization addresses; wait for SMTP setup if that is impractical. Do not turn off RLS or email confirmation to bypass this.

- A's book is visible to A after refresh and absent for B.
- A direct authenticated Data API request as B cannot read A's book or insert a book owned by A.
- Anonymous Data API requests cannot read or write `library_books`.
- UPDATE and DELETE are rejected for both accounts in this slice.

Local PostgreSQL tests exercise these policies, but hosted Auth/PostgREST and real account isolation still need this verification. MCP and plan-reference ownership will be checked when those routes exist. No automatic email or account creation was performed during implementation.

## Local checks and limitations

```sh
npm run lint
npm run typecheck
npm run test
npm run format:check
npm run build
```

Tests use embedded PostgreSQL for the actual migration/RLS and mocked HTTP for save retry behavior. They do not call your hosted database. Docker is optional for these checks. `supabase/config.toml` and the checked-in email templates are prepared for later local Supabase testing; a full Docker stack has not been started or verified.

See [verification](../verification.md) for actual results and remaining hosted checks.
