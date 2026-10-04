# 2. Supabase for the prototype

Your project and environment file are already prepared by your report. Continue with [First working library](05-first-library.md); you do not need to repeat account creation.

## If configuring from scratch

1. Open the [Supabase dashboard](https://supabase.com/dashboard), choose your organization, and create one project. Save its database password privately.
2. From **Connect** or **Settings → API Keys**, copy the project URL and publishable key into `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REFERENCE.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   APP_BASE_URL=http://localhost:3000
   ```

3. Keep email/password sign-in and email confirmation enabled. Configure the exact URL and templates in [First working library](05-first-library.md).
4. Apply the checked-in migration using that guide, then save and reload one book.

Use the default email sender with your Supabase organization team email. Its recipient and rate restrictions apply; it is suitable for a controlled demo. There is no custom SMTP setup in this MVP. [Default sender restrictions](https://supabase.com/docs/guides/auth/auth-smtp).

Use one project while building and showcasing. Switch its Site URL to the hosted app when deploying; switch it back when testing local email links. A second project is unnecessary for this prototype.

## Troubleshooting

| Problem                            | Action                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| Email address not authorized       | Use an existing Supabase organization team email.                |
| Email rate limit                   | Wait before resending; reuse the confirmed account for demos.    |
| Confirmation opens the wrong app   | Match Site URL, `APP_BASE_URL`, and `/auth/confirm` redirect.    |
| Missing table                      | Apply the checked-in migration.                                  |
| Records inaccessible after sign-in | Check session, grants, and ownership policies; keep RLS enabled. |

The app uses verified sessions and user-scoped database access. No secret/service-role key is required. Real two-account isolation is still a showcase verification requirement; local tests alone do not establish it.
