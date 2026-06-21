# TutorSpace — Deployment Guide

Follow these steps exactly. You only need to do this once.

---

## STEP 1: Create a Supabase Account & Project

1. Go to **https://supabase.com** → click **Start your project** → sign up with GitHub or email (free)
2. Click **New project**
3. Fill in:
   - **Organization**: your name
   - **Project name**: `tutorspace`
   - **Database password**: choose a strong password (save it!)
   - **Region**: pick the one closest to Bangladesh (Singapore or Mumbai)
4. Click **Create new project** — wait about 2 minutes

---

## STEP 2: Run the Database Schema

1. In Supabase dashboard, click **SQL Editor** (left sidebar, looks like `</>`)
2. Click **New query**
3. Open the file `supabase-schema.sql` from this project folder
4. Copy ALL the contents and paste them into the SQL Editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned."

> ⚠️ **Warning:** This script is a **full reset** — it starts by dropping every
> table, so running it again **erases all data** (users, classes, messages,
> attendance, etc.). Run it once on a fresh project. The script is safe to
> re-run only if you intend to wipe and rebuild. It is fully idempotent
> (no "already exists" errors), but it is still destructive.

---

## STEP 3: Create Storage Buckets

The schema in STEP 2 **already creates** the 4 storage buckets and their access
policies automatically. To confirm:

1. In Supabase dashboard, click **Storage** (left sidebar)
2. You should already see these 4 buckets, all **public**:

| Bucket Name | Public? |
|---|---|
| `class-files` | ✅ Yes (public) |
| `chat-files` | ✅ Yes (public) |
| `submissions` | ✅ Yes (public) |
| `avatars` | ✅ Yes (public) |

If any are missing, click **New bucket** → enter the name → toggle **Public** → **Save**.

---

## STEP 3b: Turn Off Email Confirmation (Important)

So students can register and use the app immediately (and so the
"join a class on sign-up" flow works), disable email confirmation:

1. In Supabase dashboard, go to **Authentication** → **Sign In / Providers** (or **Providers → Email**)
2. Find **Confirm email** and turn it **OFF**
3. Click **Save**

> If you leave this ON, new users must click a link in their email before they
> can log in, and joining a class during registration will not work until they
> confirm.

---

## STEP 4: Get Your Supabase API Keys

1. In Supabase dashboard, click **Project Settings** (gear icon, bottom left)
2. Click **API** (in the Settings menu)
3. You need two values:
   - **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

## STEP 5: Configure Environment Variables

1. Open the file `.env.local` in the `tutor-app` folder
2. Replace the placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxx...
NEXT_PUBLIC_TEACHER_SIGNUP_CODE=TEACHER2024
```

- Replace the URL and key with your actual Supabase values
- `TEACHER_SIGNUP_CODE` is the secret code you'll use to register as teacher
  - Change `TEACHER2024` to any code you want (keep it secret!)

---

## STEP 6: Test Locally

Open a terminal, navigate to the `tutor-app` folder and run:

```bash
cd "d:\Documents\Tutor\tutor-app"
npm run dev
```

Open your browser at **http://localhost:3000**

**First time setup:**
1. Go to **http://localhost:3000/register**
2. Click **Teacher**
3. Fill in your name, email, password
4. Enter your teacher registration code (the one you set in `.env.local`)
5. Click **Create Account**
6. Go to **/login** and sign in

---

## STEP 7: Deploy to Vercel (Free Forever)

1. **Create a GitHub account** at https://github.com (if you don't have one)

2. **Create a new repository**:
   - Go to https://github.com/new
   - Name it `tutorspace`
   - Click **Create repository**

3. **Push code to GitHub** (run in terminal inside `tutor-app` folder):
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tutorspace.git
git push -u origin main
```
(Replace `YOUR_USERNAME` with your GitHub username)

4. **Deploy on Vercel**:
   - Go to https://vercel.com → sign up with GitHub (free)
   - Click **Add New Project**
   - Select your `tutorspace` repository
   - Click **Import**

5. **Add environment variables in Vercel**:
   - Before clicking Deploy, go to **Environment Variables**
   - Add these 3 variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL = (your Supabase project URL)
     NEXT_PUBLIC_SUPABASE_ANON_KEY = (your Supabase anon key)
     NEXT_PUBLIC_TEACHER_SIGNUP_CODE = (your teacher code)
     ```
   - Click **Deploy**

6. Vercel will build and deploy in about 2-3 minutes
7. You'll get a URL like `https://tutorspace-xyz.vercel.app` — that's your app!

---

## STEP 8: Set Supabase Auth Redirect URL

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://tutorspace-xyz.vercel.app/**
   ```
3. Click **Save**

---

## Done! 🎉

Share your Vercel URL with students. They can register at `/register` using the invite code you give them.

---

## How to Share Invite Codes

1. Log in as teacher
2. Go to any class
3. Click the **invite code** button (e.g., `ABC123`) to copy it
4. Send the code to your student via WhatsApp/SMS
5. Student goes to `/register` → picks **Student** → enters code → registers

### Two ways a student can join (with the same code)
- **Join instantly** — the student gets access to the class right away.
- **Request to join** — the student's request shows up as **Pending** on your
  class **Members** tab (and the **Students** page). Approve or reject it there.

Both options are available in the **Join a Class** dialog inside the app and on
the registration screen. Use "Request to join" when you want to vet students
before they can see class content.

---

## After Deployment: How to Update

When you want to update the app after making code changes:
```bash
git add .
git commit -m "Update description"
git push
```
Vercel automatically redeploys whenever you push to GitHub.
