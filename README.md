# Maya Meal Prep

A shared weekly meal planner that turns the plan into a grocery list.

**Live site: https://meals.sweedler.com**

- A **project** is a shared workspace. Members join with its invite code.
- **Recipes** are typed in, or imported from a link to a recipe page (NYT Cooking and most
  recipe sites). Press and hold the Recipes tab for both options.
- The **plan** is a weekly calendar: each meal is a recipe and a number of portions.
- The **grocery list** sums every planned ingredient, scaled to the portions planned.

Source: https://github.com/AriSweedler/maya-meal-prep

## How it is built

- The web app is Vite, React and TypeScript, served as static files by GitHub Pages. A push to
  `main` runs the tests, builds, and deploys.
- The data lives in [Supabase](https://supabase.com) (Postgres and auth). The browser talks to
  it directly; row level security in `supabase/migrations/` limits every table to the project's
  members.
- Each recipe is stored as a [schema.org Recipe](https://schema.org/Recipe) document, the
  format recipe sites publish. The `import-recipe` edge function in `supabase/functions/`
  reads that document from a page; imports that fail are recorded in `import_failures`.

## Staging and debug mode

There are two hosted Supabase projects: the real one, and `maya-meal-prep-staging`, a copy of
the schema with its own accounts and data that is safe to break. The "Debug mode" link at the
bottom of the app switches that browser to staging, and the banner at the top switches back.
Sign-up on staging needs no email confirmation.

Push a migration to staging first, with its project ref from `supabase/config.toml`:

```sh
npx supabase db push --remote=<staging ref>
```

## Run it locally

Needs Node and Docker.

```sh
npm install
npx supabase start   # local Postgres and auth, with the migrations applied
npm run dev          # http://localhost:5173, using .env.development
npm test
```

## Change the database

Add a migration under `supabase/migrations/`, try it with `npx supabase db reset`, regenerate
the types, then push it to the hosted project:

```sh
npm run db:types
npx supabase db push --remote
npx supabase functions deploy import-recipe
```
