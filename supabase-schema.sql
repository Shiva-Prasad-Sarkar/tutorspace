-- ============================================================
-- TUTOR APP - Supabase Schema (FULL RESET + CREATE)
-- Paste this entire file into Supabase SQL Editor and click Run
-- Safe to run even if some tables already exist from a failed run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- DROP EVERYTHING FIRST (in reverse dependency order)
-- ============================================================
drop table if exists attendance cascade;
drop table if exists direct_messages cascade;
drop table if exists daily_feedback cascade;
drop table if exists exam_marks cascade;
drop table if exists submissions cascade;
drop table if exists assignments cascade;
drop table if exists exam_questions cascade;
drop table if exists exams cascade;
drop table if exists topic_completions cascade;
drop table if exists syllabus_topics cascade;
drop table if exists syllabus_chapters cascade;
drop table if exists chat_messages cascade;
drop table if exists class_files cascade;
drop table if exists notes cascade;
drop table if exists calendar_events cascade;
drop table if exists class_members cascade;
drop table if exists classes cascade;
drop table if exists profiles cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('teacher', 'student')),
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile on signup
-- SET search_path = public is required: SECURITY DEFINER runs in an empty search_path
-- and can't find tables without the explicit schema qualifier.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- CLASSES
-- ============================================================
create table classes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  subject text not null,
  description text,
  teacher_id uuid references profiles(id) on delete cascade not null,
  invite_code text unique not null,
  color text default '#4f46e5',
  created_at timestamptz default now()
);

alter table classes enable row level security;

create policy "Teachers can manage their classes"
  on classes for all to authenticated
  using (teacher_id = auth.uid());

-- ============================================================
-- CLASS MEMBERS
-- ============================================================
create table class_members (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  joined_at timestamptz default now(),
  unique(class_id, student_id)
);

alter table class_members enable row level security;

-- ============================================================
-- RLS HELPER FUNCTIONS (SECURITY DEFINER breaks cross-table recursion)
-- ============================================================
create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_member_of_class(p_class_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id
      and student_id = auth.uid()
      and status = 'approved'
  );
$$;

-- Lookup a class by invite code, bypassing RLS.
-- Needed because a student joining a class has no membership yet, so a direct
-- select on `classes` would be blocked by row-level policies.
-- DROP first: return type may differ from an older version, and
-- `create or replace` cannot change a function's return type.
drop function if exists public.get_class_by_invite_code(text);
create or replace function public.get_class_by_invite_code(p_invite_code text)
returns table (id uuid, name text, subject text, teacher_id uuid)
language sql security definer set search_path = public as $$
  select id, name, subject, teacher_id
  from public.classes
  where invite_code = p_invite_code
  limit 1;
$$;

grant execute on function public.get_class_by_invite_code(text) to authenticated, anon;

-- Policies using helper functions — no circular RLS calls
create policy "Teachers can manage members of their classes"
  on class_members for all to authenticated
  using (public.is_teacher_of_class(class_id));

create policy "Students can view their own memberships"
  on class_members for select to authenticated
  using (student_id = auth.uid());

create policy "Students can request to join classes"
  on class_members for insert to authenticated
  with check (student_id = auth.uid());

create policy "Students can view enrolled classes"
  on classes for select to authenticated
  using (public.is_member_of_class(id));

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================
create table calendar_events (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  title text not null,
  description text,
  event_date date not null,
  event_type text not null default 'announcement'
    check (event_type in ('homework', 'note', 'announcement', 'test', 'other')),
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

alter table calendar_events enable row level security;

create policy "Teachers can manage events in their classes"
  on calendar_events for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = calendar_events.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view events"
  on calendar_events for select to authenticated
  using (
    exists (
      select 1 from class_members
      where class_members.class_id = calendar_events.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- NOTES
-- ============================================================
create table notes (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  title text not null,
  content text not null default '',
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table notes enable row level security;

create policy "Teachers can manage notes in their classes"
  on notes for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = notes.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view notes"
  on notes for select to authenticated
  using (
    exists (
      select 1 from class_members
      where class_members.class_id = notes.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- CLASS FILES
-- ============================================================
create table class_files (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  title text not null,
  description text,
  file_url text not null,
  file_name text not null,
  file_size bigint not null default 0,
  file_type text not null,
  uploaded_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

alter table class_files enable row level security;

create policy "Teachers can manage files in their classes"
  on class_files for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = class_files.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view files"
  on class_files for select to authenticated
  using (
    exists (
      select 1 from class_members
      where class_members.class_id = class_files.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
create table chat_messages (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null default '',
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;

create policy "Class participants can read messages"
  on chat_messages for select to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = chat_messages.class_id
        and classes.teacher_id = auth.uid()
    )
    or
    exists (
      select 1 from class_members
      where class_members.class_id = chat_messages.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

create policy "Class participants can send messages"
  on chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1 from classes
        where classes.id = chat_messages.class_id
          and classes.teacher_id = auth.uid()
      )
      or
      exists (
        select 1 from class_members
        where class_members.class_id = chat_messages.class_id
          and class_members.student_id = auth.uid()
          and class_members.status = 'approved'
      )
    )
  );

-- ============================================================
-- SYLLABUS CHAPTERS
-- ============================================================
create table syllabus_chapters (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz default now()
);

alter table syllabus_chapters enable row level security;

create policy "Teachers can manage chapters in their classes"
  on syllabus_chapters for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = syllabus_chapters.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view chapters"
  on syllabus_chapters for select to authenticated
  using (
    exists (
      select 1 from class_members
      where class_members.class_id = syllabus_chapters.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- SYLLABUS TOPICS
-- ============================================================
create table syllabus_topics (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references syllabus_chapters(id) on delete cascade not null,
  class_id uuid references classes(id) on delete cascade not null,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz default now()
);

alter table syllabus_topics enable row level security;

create policy "Teachers can manage topics in their classes"
  on syllabus_topics for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = syllabus_topics.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view topics"
  on syllabus_topics for select to authenticated
  using (
    exists (
      select 1 from class_members
      where class_members.class_id = syllabus_topics.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- TOPIC COMPLETIONS
-- ============================================================
create table topic_completions (
  id uuid default uuid_generate_v4() primary key,
  topic_id uuid references syllabus_topics(id) on delete cascade not null,
  class_id uuid references classes(id) on delete cascade not null,
  completed_at timestamptz default now(),
  unique(topic_id, class_id)
);

alter table topic_completions enable row level security;

create policy "Teachers can manage completions in their classes"
  on topic_completions for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = topic_completions.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view completions"
  on topic_completions for select to authenticated
  using (
    exists (
      select 1 from class_members
      where class_members.class_id = topic_completions.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
create table assignments (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  file_url text,
  file_name text,
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

alter table assignments enable row level security;

create policy "Teachers can manage assignments in their classes"
  on assignments for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = assignments.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view assignments"
  on assignments for select to authenticated
  using (
    exists (
      select 1 from class_members
      where class_members.class_id = assignments.class_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- SUBMISSIONS
-- ============================================================
create table submissions (
  id uuid default uuid_generate_v4() primary key,
  assignment_id uuid references assignments(id) on delete cascade not null,
  class_id uuid references classes(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  content text,
  file_url text,
  file_name text,
  submitted_at timestamptz default now(),
  grade text,
  feedback text,
  unique(assignment_id, student_id)
);

alter table submissions enable row level security;

create policy "Teachers can view and grade submissions in their classes"
  on submissions for all to authenticated
  using (
    exists (
      select 1 from classes
      where classes.id = submissions.class_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Students can manage their own submissions"
  on submissions for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ============================================================
-- EXAMS
-- ============================================================
create table exams (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  name text not null,
  exam_type text not null default 'CT'
    check (exam_type in ('CT', 'Mid', 'Final', 'Quiz', 'Other')),
  exam_date date,
  total_marks integer,
  is_published boolean not null default false,
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

alter table exams enable row level security;

create policy "Teachers can manage exams in their classes"
  on exams for all to authenticated
  using (public.is_teacher_of_class(class_id));

create policy "Approved students can view exams"
  on exams for select to authenticated
  using (public.is_member_of_class(class_id));

-- ============================================================
-- EXAM QUESTIONS
-- ============================================================
create table exam_questions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade not null,
  question_number integer not null,
  question_text text not null,
  solution_text text,
  marks integer,
  created_at timestamptz default now(),
  unique(exam_id, question_number)
);

alter table exam_questions enable row level security;

create policy "Teachers can manage questions in their classes"
  on exam_questions for all to authenticated
  using (
    exists (
      select 1 from exams
      join classes on classes.id = exams.class_id
      where exams.id = exam_questions.exam_id
        and classes.teacher_id = auth.uid()
    )
  );

create policy "Approved students can view questions"
  on exam_questions for select to authenticated
  using (
    exists (
      select 1 from exams
      join class_members on class_members.class_id = exams.class_id
      where exams.id = exam_questions.exam_id
        and class_members.student_id = auth.uid()
        and class_members.status = 'approved'
    )
  );

-- ============================================================
-- DAILY FEEDBACK (teacher → student, per class, per date)
-- ============================================================
create table daily_feedback (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  teacher_id uuid references profiles(id) on delete cascade not null,
  feedback_date date not null default current_date,
  content text not null,
  created_at timestamptz default now()
);

alter table daily_feedback enable row level security;

create policy "Teachers can manage feedback in their classes"
  on daily_feedback for all to authenticated
  using (public.is_teacher_of_class(class_id));

create policy "Students can view their own feedback"
  on daily_feedback for select to authenticated
  using (student_id = auth.uid());

-- ============================================================
-- EXAM MARKS (teacher records marks per student per exam)
-- ============================================================
create table exam_marks (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade not null,
  class_id uuid references classes(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  marks_obtained numeric(6,2) not null,
  remarks text,
  created_at timestamptz default now(),
  unique(exam_id, student_id)
);

alter table exam_marks enable row level security;

create policy "Teachers can manage exam marks in their classes"
  on exam_marks for all to authenticated
  using (public.is_teacher_of_class(class_id));

create policy "Students can view own marks or all marks for published exams"
  on exam_marks for select to authenticated
  using (
    student_id = auth.uid()
    or
    exists (
      select 1 from exams e
      join class_members cm on cm.class_id = e.class_id
      where e.id = exam_marks.exam_id
        and e.is_published = true
        and cm.student_id = auth.uid()
        and cm.status = 'approved'
    )
  );

-- ============================================================
-- DIRECT MESSAGES (private teacher ↔ student)
-- ============================================================
create table direct_messages (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  content text not null default '',
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table direct_messages enable row level security;

-- Receivers can mark their own incoming messages as read
create policy "Receivers can mark messages read"
  on direct_messages for update to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

create policy "Users can view their own DMs"
  on direct_messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Authenticated users can send DMs in their classes"
  on direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      public.is_teacher_of_class(class_id)
      or public.is_member_of_class(class_id)
    )
  );

-- ============================================================
-- ATTENDANCE (teacher marks per student per date)
-- ============================================================
create table attendance (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references classes(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  attendance_date date not null default current_date,
  status text not null default 'present'
    check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  created_at timestamptz default now(),
  unique(class_id, student_id, attendance_date)
);

alter table attendance enable row level security;

create policy "Teachers can manage attendance in their classes"
  on attendance for all to authenticated
  using (public.is_teacher_of_class(class_id));

create policy "Students can view their own attendance"
  on attendance for select to authenticated
  using (student_id = auth.uid());

-- ============================================================
-- ENABLE REALTIME FOR CHAT AND DMs
-- (guarded so re-running the schema never errors with "already member")
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table direct_messages;
  end if;
end $$;

-- ============================================================
-- STORAGE BUCKETS + POLICIES
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('chat-files',  'chat-files',  true),
  ('submissions', 'submissions', true),
  ('class-files', 'class-files', true),
  ('avatars',     'avatars',     true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can upload files" on storage.objects;
create policy "Authenticated users can upload files"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('chat-files', 'submissions', 'class-files', 'avatars'));

drop policy if exists "Public can read all files" on storage.objects;
create policy "Public can read all files"
  on storage.objects for select to public
  using (bucket_id in ('chat-files', 'submissions', 'class-files', 'avatars'));

drop policy if exists "Users can update own files" on storage.objects;
create policy "Users can update own files"
  on storage.objects for update to authenticated
  using (auth.uid() = owner);

drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
  on storage.objects for delete to authenticated
  using (auth.uid() = owner);
