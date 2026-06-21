import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Assignment, Submission, Exam, ExamMark, DailyFeedback, Profile, ClassMember } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AddFeedbackDialog } from '@/components/feedback/add-feedback-dialog'
import { EditFeedbackDialog } from '@/components/feedback/edit-feedback-dialog'
import { DeleteFeedbackButton } from '@/components/feedback/delete-feedback-button'
import { format, parseISO } from 'date-fns'
import {
  ClipboardList, GraduationCap, MessageSquare,
  CheckCircle2, XCircle, BookOpen, Users, TrendingUp
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function safeQuery<T>(fn: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data, error } = await fn()
    if (error) return null
    return data
  } catch {
    return null
  }
}

const TYPE_COLORS: Record<string, string> = {
  CT:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  Mid:   'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Final: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Quiz:  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

// ─── Student view: date-wise timeline ────────────────────────────────────────

type TimelineItem =
  | { kind: 'assignment'; date: string; assignment: Assignment; submission?: Submission }
  | { kind: 'exam';       date: string; exam: Exam;             mark?: ExamMark }
  | { kind: 'feedback';   date: string; feedback: DailyFeedback & { teacher?: { full_name: string } } }

async function StudentProgressView({ classId, userId }: { classId: string; userId: string }) {
  const supabase = await createClient()

  const [assignments, submissions, exams, marks, feedbacks, topics, completions] = await Promise.all([
    safeQuery<Assignment[]>(() => supabase.from('assignments').select('*').eq('class_id', classId)),
    safeQuery<Submission[]>(() => supabase.from('submissions').select('*').eq('class_id', classId).eq('student_id', userId)),
    safeQuery<Exam[]>(() => supabase.from('exams').select('*').eq('class_id', classId)),
    safeQuery<ExamMark[]>(() => supabase.from('exam_marks').select('*').eq('class_id', classId).eq('student_id', userId)),
    safeQuery<(DailyFeedback & { teacher: { full_name: string } })[]>(() =>
      supabase.from('daily_feedback')
        .select('*, teacher:profiles!teacher_id(full_name)')
        .eq('class_id', classId)
        .eq('student_id', userId)
        .order('feedback_date', { ascending: false })
    ),
    safeQuery<{ id: string }[]>(() => supabase.from('syllabus_topics').select('id').eq('class_id', classId)),
    safeQuery<{ topic_id: string }[]>(() => supabase.from('topic_completions').select('topic_id').eq('class_id', classId)),
  ])

  const submissionMap = new Map((submissions || []).map(s => [s.assignment_id, s]))
  const markMap = new Map((marks || []).map(m => [m.exam_id, m]))

  const items: TimelineItem[] = []
  for (const a of (assignments || [])) {
    items.push({ kind: 'assignment', date: a.due_date || a.created_at.split('T')[0], assignment: a, submission: submissionMap.get(a.id) })
  }
  for (const e of (exams || [])) {
    items.push({ kind: 'exam', date: e.exam_date || e.created_at.split('T')[0], exam: e, mark: markMap.get(e.id) })
  }
  for (const f of (feedbacks || [])) {
    items.push({ kind: 'feedback', date: f.feedback_date, feedback: f })
  }
  items.sort((a, b) => b.date.localeCompare(a.date))

  const totalTopics = topics?.length || 0
  const completedTopics = completions?.length || 0
  const syllabusProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
  const totalAssignments = assignments?.length || 0
  const submitted = submissions?.length || 0
  const hwPct = totalAssignments > 0 ? Math.round((submitted / totalAssignments) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Progress</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your activity timeline for this class</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen, iconWrap: 'bg-green-100 dark:bg-green-900/60', iconColor: 'text-green-600 dark:text-green-400', val: `${syllabusProgress}%`, sub: `${completedTopics}/${totalTopics} topics`, prog: syllabusProgress },
          { icon: ClipboardList, iconWrap: 'bg-orange-100 dark:bg-orange-900/60', iconColor: 'text-orange-600 dark:text-orange-400', val: `${hwPct}%`, sub: `${submitted}/${totalAssignments} HW`, prog: hwPct },
          { icon: GraduationCap, iconWrap: 'bg-indigo-100 dark:bg-indigo-900/60', iconColor: 'text-indigo-600 dark:text-indigo-400', val: `${marks?.length || 0}`, sub: 'Exams graded', prog: null },
        ].map(({ icon: Icon, iconWrap, iconColor, val, sub, prog }) => (
          <Card key={sub} className="border-0 shadow-sm dark:bg-card">
            <CardContent className="pt-4 pb-4 px-4">
              <div className={`${iconWrap} p-2 rounded-xl w-fit mb-2`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{val}</p>
              {prog !== null && <Progress value={prog} className="mt-1.5 h-1" />}
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feedback info banner if no feedbacks yet */}
      {(feedbacks === null) && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
          Feedback will appear here once your teacher adds some. Ask your teacher to add daily feedback from the Progress or Members tab.
        </div>
      )}

      {/* Timeline */}
      {items.length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-14 text-center">
            <TrendingUp className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="font-medium text-gray-600 dark:text-gray-400">No activity yet</p>
            <p className="text-xs text-gray-400 mt-1">Assignments, exams, and teacher feedback will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            if (item.kind === 'assignment') {
              const { assignment: a, submission: sub } = item
              const isOverdue = !sub && a.due_date && new Date(a.due_date) < new Date()
              return (
                <Card key={`a-${a.id}`} className="border-0 shadow-sm dark:bg-card overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${sub ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'}`}>
                        <ClipboardList className={`h-4 w-4 ${sub ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                              {a.due_date ? `Due ${format(parseISO(a.due_date), 'MMM d, yyyy')}` : 'Assignment'}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.title}</p>
                          </div>
                          {sub?.grade
                            ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0 text-xs flex-shrink-0">{sub.grade}</Badge>
                            : isOverdue
                            ? <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0 text-xs flex-shrink-0">Overdue</Badge>
                            : null}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {sub
                            ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /><span className="text-xs text-green-600 dark:text-green-400">Submitted</span></>
                            : <><XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" /><span className="text-xs text-red-500">Not submitted</span></>
                          }
                        </div>
                        {sub?.feedback && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">&ldquo;{sub.feedback}&rdquo;</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            if (item.kind === 'exam') {
              const { exam: e, mark } = item
              const pct = mark && e.total_marks ? Math.round((mark.marks_obtained / e.total_marks) * 100) : null
              return (
                <Card key={`e-${e.id}`} className="border-0 shadow-sm dark:bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-xl flex-shrink-0">
                        <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                          {e.exam_date ? format(parseISO(e.exam_date), 'MMM d, yyyy') : 'Exam'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs border-0 ${TYPE_COLORS[e.exam_type] || TYPE_COLORS.Other}`}>{e.exam_type}</Badge>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{e.name}</p>
                        </div>
                        {mark ? (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              {mark.marks_obtained}{e.total_marks ? `/${e.total_marks}` : ''}
                            </span>
                            {pct !== null && (
                              <span className={`text-sm font-medium ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                                ({pct}%)
                              </span>
                            )}
                            {mark.remarks && <span className="text-xs text-gray-400 italic">&mdash; {mark.remarks}</span>}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1.5">Marks not recorded yet</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            // feedback
            const f = item.feedback
            return (
              <Card key={`f-${f.id}`} className="border-0 shadow-sm dark:bg-card border-l-2 border-l-emerald-400">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-xl flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">Teacher feedback</span>
                        {' · '}{format(parseISO(f.feedback_date), 'EEEE, MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{f.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Teacher view ─────────────────────────────────────────────────────────────

async function TeacherProgressView({ classId }: { classId: string }) {
  const supabase = await createClient()

  const [members, assignments, submissions, exams, allMarks, allFeedback, topics, completions] = await Promise.all([
    safeQuery<(ClassMember & { student: Profile })[]>(() => supabase.from('class_members').select('*, student:profiles(*)').eq('class_id', classId).eq('status', 'approved')),
    safeQuery<{ id: string }[]>(() => supabase.from('assignments').select('id').eq('class_id', classId)),
    safeQuery<{ student_id: string; grade: string | null }[]>(() => supabase.from('submissions').select('student_id, grade').eq('class_id', classId)),
    safeQuery<Exam[]>(() => supabase.from('exams').select('*').eq('class_id', classId)),
    safeQuery<ExamMark[]>(() => supabase.from('exam_marks').select('*').eq('class_id', classId)),
    safeQuery<(DailyFeedback & { teacher: { full_name: string } })[]>(() =>
      supabase.from('daily_feedback').select('*, teacher:profiles!teacher_id(full_name)').eq('class_id', classId).order('feedback_date', { ascending: false })
    ),
    safeQuery<{ id: string }[]>(() => supabase.from('syllabus_topics').select('id').eq('class_id', classId)),
    safeQuery<{ topic_id: string }[]>(() => supabase.from('topic_completions').select('topic_id').eq('class_id', classId)),
  ])

  const totalAssignments = assignments?.length || 0
  const syllabusProgress = (topics?.length || 0) > 0 ? Math.round(((completions?.length || 0) / (topics?.length || 1)) * 100) : 0

  const subCountByStudent = (submissions || []).reduce((acc: Record<string, number>, s) => {
    acc[s.student_id] = (acc[s.student_id] || 0) + 1; return acc
  }, {})
  const marksByStudent = (allMarks || []).reduce((acc: Record<string, ExamMark[]>, m) => {
    if (!acc[m.student_id]) acc[m.student_id] = []; acc[m.student_id].push(m); return acc
  }, {})
  type FeedbackWithTeacher = DailyFeedback & { teacher: { full_name: string } }
  const feedbackByStudent: Record<string, FeedbackWithTeacher[]> = {}
  for (const f of (allFeedback || [])) {
    if (!feedbackByStudent[f.student_id]) feedbackByStudent[f.student_id] = []
    feedbackByStudent[f.student_id].push(f)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Class Progress</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{(members || []).length} students enrolled</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Syllabus', val: `${syllabusProgress}%`, prog: syllabusProgress, iconWrap: 'bg-indigo-100 dark:bg-indigo-900/60', iconColor: 'text-indigo-600 dark:text-indigo-400', Icon: BookOpen },
          { label: 'Assignments', val: totalAssignments, prog: null, iconWrap: 'bg-orange-100 dark:bg-orange-900/60', iconColor: 'text-orange-600 dark:text-orange-400', Icon: ClipboardList },
          { label: 'Students', val: (members || []).length, prog: null, iconWrap: 'bg-green-100 dark:bg-green-900/60', iconColor: 'text-green-600 dark:text-green-400', Icon: Users },
        ].map(({ label, val, prog, iconWrap, iconColor, Icon }) => (
          <Card key={label} className="border-0 shadow-sm dark:bg-card">
            <CardContent className="pt-4 pb-4 px-4">
              <div className={`${iconWrap} p-2 rounded-xl w-fit mb-2`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{val}</p>
              {prog !== null && <Progress value={prog} className="mt-1.5 h-1" />}
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(members || []).length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-10 text-center text-sm text-gray-400">No students enrolled yet</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(members as (ClassMember & { student: Profile })[]).map(m => {
            const sid = m.student_id
            const subCount = subCountByStudent[sid] || 0
            const hwPct = totalAssignments > 0 ? Math.round((subCount / totalAssignments) * 100) : 0
            const studentMarks = marksByStudent[sid] || []
            const studentFeedbacks: FeedbackWithTeacher[] = feedbackByStudent[sid] || []

            return (
              <Card key={m.id} className="border-0 shadow-sm dark:bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {m.student?.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{m.student?.full_name}</p>
                        <p className="text-xs text-gray-400">{m.student?.email}</p>
                      </div>
                    </div>
                    <AddFeedbackDialog classId={classId} studentId={sid} studentName={m.student?.full_name || ''} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Homework</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{subCount}/{totalAssignments}</span>
                      </div>
                      <Progress value={hwPct} className="h-1.5" />
                    </div>
                  </div>

                  {studentMarks.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" /> Exam marks
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {studentMarks.map(mk => {
                          const ex = (exams || []).find(e => e.id === mk.exam_id)
                          return (
                            <span key={mk.id} className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg px-2 py-1 font-medium">
                              {ex?.name || 'Exam'}: {mk.marks_obtained}{ex?.total_marks ? `/${ex.total_marks}` : ''}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {studentFeedbacks.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> Feedback ({studentFeedbacks.length})
                      </p>
                      <div className="space-y-2">
                        {studentFeedbacks.slice(0, 3).map(fb => (
                          <div key={fb.id} className="bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                {format(parseISO(fb.feedback_date), 'MMM d, yyyy')}
                              </span>
                              <div className="flex gap-0.5">
                                <EditFeedbackDialog feedback={fb} />
                                <DeleteFeedbackButton feedbackId={fb.id} />
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{fb.content}</p>
                          </div>
                        ))}
                        {studentFeedbacks.length > 3 && (
                          <p className="text-xs text-gray-400 text-center">+{studentFeedbacks.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default async function ProgressPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'teacher'
    ? <TeacherProgressView classId={classId} />
    : <StudentProgressView classId={classId} userId={user.id} />
}
