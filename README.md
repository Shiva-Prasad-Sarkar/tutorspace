# 🎓 TutorSpace

A complete, modern tutoring management platform for private tutors and their students. Manage classes, share notes and files, set homework, track exams and attendance, chat in real time, and follow each student's progress — all in one polished app with full dark mode and a mobile-first design.

**Live demo:** https://tutorspace-gray.vercel.app

---

## ✨ Features

### For Teachers
- **Classes** — create classes, share an invite code, approve or instantly admit students
- **Homework** — assign work with attachments, collect submissions, grade with feedback
- **Exams & tests** — record past questions with solutions, enter marks, and publish ranked class results
- **Attendance** — mark daily attendance (present / late / absent / excused) per student
- **Syllabus** — break the course into chapters & topics and track completion
- **Notes & files** — share study material and downloadable resources
- **Calendar** — post homework, tests, and announcements
- **Daily feedback** — leave per-student feedback that appears on their progress timeline
- **Messaging** — class group chat + private 1-to-1 messages with unread badges
- **Students** — see everyone across all your classes in one place

### For Students
- Join a class instantly with a code, or request approval
- View notes, files, syllabus, homework, exams, and the class calendar
- Submit homework and see grades & feedback
- See published exam results and their own ranking
- Track personal progress: syllabus %, homework completion, exam marks, attendance, and feedback
- Real-time class chat and private messaging with the teacher

### Everywhere
- 🌗 Full **light & dark mode**
- 📱 **Mobile-first**, app-like UI (bottom navigation, account sheet) and a polished desktop layout
- ⚡ **Real-time** chat and direct messages
- 🔒 **Row-Level Security** on every table — students only ever see their own classes and data

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components) |
| Language | **TypeScript** |
| Database & Auth | **Supabase** (Postgres, Auth, Realtime, Storage) |
| Styling | **Tailwind CSS v4** |
| UI primitives | **@base-ui/react** |
| Icons | **lucide-react** |
| Notifications | **sonner** |
| Hosting | **Vercel** |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- A free [Supabase](https://supabase.com) project

### 1. Install dependencies
```bash
npm install
```

### 2. Set up the database
In your Supabase project, open the **SQL Editor**, paste the entire contents of
[`supabase-schema.sql`](./supabase-schema.sql), and click **Run**.

> ⚠️ This script is a full reset — it drops and recreates every table, so only run it
> on a fresh project or when you intend to wipe existing data. It is safe to re-run
> (idempotent), but destructive.

It creates all tables, security policies, the storage buckets, and the helper functions.

### 3. Configure environment variables
Copy the example file and fill in your values:
```bash
cp .env.local.example .env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
NEXT_PUBLIC_TEACHER_SIGNUP_CODE=choose-a-secret-code
```
- Get the URL and anon key from Supabase → **Project Settings → API**
- `NEXT_PUBLIC_TEACHER_SIGNUP_CODE` is the secret you'll enter to register as a teacher

### 4. Turn off email confirmation (recommended)
Supabase → **Authentication → Sign In / Providers → Email** → turn **Confirm email** off.
This lets users log in immediately and makes "join a class on sign-up" work.

### 5. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 6. First account
Go to `/register` → choose **Teacher** → enter your teacher signup code → create the
account → sign in. Create a class and share its invite code with students.

---

## ☁️ Deployment

This app deploys to **Vercel** in a few minutes. Full step-by-step instructions —
including Supabase setup, environment variables, and auth redirect URLs — are in
**[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Quick version:
1. Push this repo to GitHub
2. Import it into Vercel
3. Add the 3 environment variables (same as `.env.local`) for all environments
4. Deploy
5. In Supabase → **Authentication → URL Configuration**, set the **Site URL** and add
   `https://your-app.vercel.app/**` to **Redirect URLs**

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/         # Authenticated app (sidebar layout)
│   │   ├── dashboard/       # Home / overview
│   │   ├── classes/         # Class list + per-class pages:
│   │   │   └── [classId]/   #   overview, calendar, notes, files, chat,
│   │   │                    #   syllabus, homework, exams, progress,
│   │   │                    #   attendance, messages, members
│   │   └── students/        # Teacher's all-students view
│   ├── login/ · register/   # Auth pages
│   └── layout.tsx           # Root layout (theme provider, toasts)
├── components/
│   ├── ui/                  # Base UI primitives (button, card, dialog, …)
│   ├── attendance/ chat/ classes/ exams/ feedback/ files/
│   ├── homework/ notes/ syllabus/ calendar/ layout/   # Feature components
├── lib/supabase/            # Supabase server & browser clients
├── types/                   # Shared TypeScript types
└── proxy.ts                 # Auth middleware (Next.js 16 "proxy")
```

---

## 🔐 Roles & Access

- **Teacher** — registers with the secret signup code; owns classes and all content
- **Student** — joins a class with an invite code (instant or pending approval)
- Row-Level Security enforces that students only access classes they're approved in,
  and only their own submissions, marks, attendance, feedback, and messages.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

---

## 🤝 Sharing Invite Codes

1. Log in as teacher → open a class → click the **invite code** to copy it
2. Send it to a student
3. The student registers (or uses **Join a Class**) and enters the code —
   **Join instantly** for immediate access, or **Request to join** to wait for your approval
   on the class **Members** tab

---

Built with ❤️ for tutors and their students.
