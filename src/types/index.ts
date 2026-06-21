export type Role = 'teacher' | 'student'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_url: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string
  subject: string
  description: string | null
  teacher_id: string
  invite_code: string
  color: string
  created_at: string
  teacher?: Profile
  member_count?: number
}

export interface ClassMember {
  id: string
  class_id: string
  student_id: string
  status: 'pending' | 'approved'
  joined_at: string
  student?: Profile
  class?: Class
}

export interface CalendarEvent {
  id: string
  class_id: string
  title: string
  description: string | null
  event_date: string
  event_type: 'homework' | 'note' | 'announcement' | 'test' | 'other'
  created_by: string
  created_at: string
}

export interface Note {
  id: string
  class_id: string
  title: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  author?: Profile
}

export interface ClassFile {
  id: string
  class_id: string
  title: string
  description: string | null
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
  uploader?: Profile
}

export interface ChatMessage {
  id: string
  class_id: string
  sender_id: string
  content: string
  file_url: string | null
  file_name: string | null
  file_type: string | null
  created_at: string
  sender?: Profile
}

export interface SyllabusChapter {
  id: string
  class_id: string
  title: string
  order_index: number
  created_at: string
  topics?: SyllabusTopic[]
}

export interface SyllabusTopic {
  id: string
  chapter_id: string
  class_id: string
  title: string
  order_index: number
  created_at: string
  completions?: TopicCompletion[]
}

export interface TopicCompletion {
  id: string
  topic_id: string
  student_id: string
  completed_at: string
  student?: Profile
}

export interface Assignment {
  id: string
  class_id: string
  title: string
  description: string | null
  due_date: string | null
  file_url: string | null
  file_name: string | null
  created_by: string
  created_at: string
  submissions?: Submission[]
}

export interface Exam {
  id: string
  class_id: string
  name: string
  exam_type: 'CT' | 'Mid' | 'Final' | 'Quiz' | 'Other'
  exam_date: string | null
  total_marks: number | null
  is_published: boolean
  created_by: string
  created_at: string
  question_count?: number
}

export interface DirectMessage {
  id: string
  class_id: string
  sender_id: string
  receiver_id: string
  content: string
  read_at: string | null
  created_at: string
  sender?: Profile
}

export interface ExamMark {
  id: string
  exam_id: string
  class_id: string
  student_id: string
  marks_obtained: number
  remarks: string | null
  created_at: string
  exam?: Exam
  student?: Profile
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface Attendance {
  id: string
  class_id: string
  student_id: string
  attendance_date: string
  status: AttendanceStatus
  note: string | null
  created_at: string
  student?: Profile
}

export interface DailyFeedback {
  id: string
  class_id: string
  student_id: string
  teacher_id: string
  feedback_date: string
  content: string
  created_at: string
  teacher?: Profile
}

export interface ExamQuestion {
  id: string
  exam_id: string
  question_number: number
  question_text: string
  solution_text: string | null
  marks: number | null
  created_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  class_id: string
  student_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  submitted_at: string
  grade: string | null
  feedback: string | null
  student?: Profile
}
