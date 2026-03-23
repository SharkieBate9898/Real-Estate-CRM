# Lead + Follow-Up Mini CRM (Turso/libSQL)

## 1) Project Overview
This is a production-ready MVP CRM designed for a solo real estate agent to track leads and follow-up tasks. It provides a lightweight pipeline board, lead detail records, interaction history, and a follow-up message generator (with optional AI). This app uses Turso (libSQL) as the database.

**Who it is for:** A solo real estate agent who wants a focused CRM with a clean workflow for managing leads and follow-ups.

**Key features:**
- Email + password authentication.
- Kanban-style pipeline board with filters and reminders.
- Lead detail view with interactions, notes, and next actions.
- Follow-up generator with deterministic templates + optional AI.
- Seed script for demo data.

## 2) Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Turso (libSQL)
- bcrypt
- OpenAI API (optional)

## 3) Setup Instructions
### Node.js version
- Node.js 18+ recommended.

### Install dependencies
```bash
npm install
```

### Turso setup (libSQL)
1. Install the Turso CLI.
2. Log in:
```bash
turso auth login
```
3. Create a database:
```bash
turso db create mini-crm
```
4. Get the database URL:
```bash
turso db show mini-crm --url
```
5. Create a token:
```bash
turso db tokens create mini-crm
```

### Environment variables
Create a `.env.local` file in the project root:
```bash
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token_here
OPENAI_API_KEY=your_key_here
```
`OPENAI_API_KEY` is optional; if not provided, the follow-up generator uses built-in templates.

### Run migrations
```bash
npm run db:migrate
```

## 4) Database Schema
Tables:
- **users**: stores user accounts (email + hashed password).
- **leads**: stores leads tied to a user with stage, source, next action, and notes.
- **interactions**: stores contact history per lead.
- **sessions**: stores session tokens for cookie auth.

Schema file location: `/db/schema.sql`.

## 5) Running the App
### Dev mode
```bash
npm run dev
```

### Build for production
```bash
npm run build
npm run start
```

## 6) Seeding Data
Run the seed script to populate demo data in Turso:
```bash
npm run seed
```

**Demo credentials created by seed:**
- Email: `demo@mini-crm.local`
- Password: `password123`

## 7) Authentication Flow
- Users sign up or log in on `/login`.
- Passwords are hashed with bcrypt.
- A session token is stored in an HTTP-only cookie and validated server-side.
- Middleware checks for the session cookie on `/app` routes.
- Server components also verify sessions before rendering protected pages.

## 8) Project Structure
- `/app`: Next.js App Router routes and layouts.
- `/components`: Reusable UI components (forms, generator, modals).
- `/lib`: Database helpers, auth utilities, and lead logic.
- `/db`: SQL schema file (`schema.sql`) and migration script.
- `/scripts`: Seed script for demo data.

## 9) Future Improvements
- Add notifications (email/SMS) for upcoming follow-ups.
- Mobile-first interface for on-the-go updates.
- Multi-user team support with role-based access.

## 10) Organization Tenancy (Multi-User)
This app now scopes all CRM data by organization (`org_id`) to prevent cross-team access.

**Key points:**
- Every lead, interaction, and related CRM record is filtered by `org_id` on reads and writes.
- The server derives `org_id` from the authenticated session (not from client input).
- New users are auto-provisioned into a default org on first login.
- Admins can invite teammates and manage roles from `/app/org`.

**Testing tenant isolation:**
1. Create User A and User B.
2. Log in as User A and create a lead (Lead A1).
3. Log in as User B and create a lead (Lead B1).
4. Verify User A cannot access Lead B1 (even by URL guessing), and vice versa.

**Invite flow:**
1. Admin creates an invite in `/app/org`.
2. Invitee logs in and accepts the invite via `/invite/accept?token=...`.

**Assistant assignments:**
1. Agents/Admins can invite assistants in `/app/assistants`.
2. Assistants accept via `/assistant-invite/accept?token=...`.
3. Assistants can see leads for the agents they are linked to.
