import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Exam, ExamQuestion, ExamMark, ClassMember, Profile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddQuestionDialog } from '@/components/exams/add-question-dialog'
import { EditQuestionDialog } from '@/components/exams/edit-question-dialog'
import { DeleteQuestionButton } from '@/components/exams/delete-question-button'
import { SetExamMarksDialog } from '@/components/exams/set-exam-marks-dialog'
import { PublishResultsButton } from '@/components/exams/publish-results-button'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, HelpCircle, CheckCircle2, Users, Globe, Trophy } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  CT:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  Mid:   'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Final: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Quiz:  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ classId: string; examId: string }>
}) {
  const { classId, examId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const [{ data: exam }, { data: questions }] = await Promise.all([
    supabase.from('exams').select('*').eq('id', examId).single(),
    supabase.from('exam_questions').select('*').eq('exam_id', examId).order('question_number', { ascending: true }),
  ])

  if (!exam) redirect(`/classes/${classId}/exams`)

  const e = exam as Exam
  const nextNumber = questions && questions.length > 0
    ? Math.max(...questions.map((q: ExamQuestion) => q.question_number)) + 1
    : 1
  const totalMarksFromQuestions = questions?.reduce((sum: number, q: ExamQuestion) => sum + (q.marks || 0), 0) || 0
  const displayTotal = e.total_marks || (totalMarksFromQuestions > 0 ? totalMarksFromQuestions : null)

  // Teacher: fetch members + marks to show per-student mark entry
  let members: (ClassMember & { student: Profile })[] = []
  let marksByStudent: Record<string, ExamMark> = {}

  // For published results: all class members + all marks
  let publishedMarks: (ExamMark & { student: Profile })[] = []

  if (isTeacher) {
    const [{ data: membersData }, { data: marksData }] = await Promise.all([
      supabase.from('class_members').select('*, student:profiles(*)').eq('class_id', classId).eq('status', 'approved'),
      supabase.from('exam_marks').select('*').eq('exam_id', examId),
    ])
    members = (membersData as (ClassMember & { student: Profile })[]) || []
    marksByStudent = Object.fromEntries((marksData as ExamMark[] || []).map(m => [m.student_id, m]))

    // Build published marks with student profile for results table
    if (e.is_published) {
      publishedMarks = (marksData as ExamMark[] || [])
        .map(m => ({
          ...m,
          student: members.find(mem => mem.student_id === m.student_id)?.student as Profile,
        }))
        .filter(m => m.student)
        .sort((a, b) => b.marks_obtained - a.marks_obtained)
    }
  } else if (e.is_published) {
    // Student: fetch published class results
    const { data: allMarks } = await supabase
      .from('exam_marks')
      .select('*, student:profiles(id, full_name)')
      .eq('exam_id', examId)
    publishedMarks = ((allMarks as (ExamMark & { student: Profile })[]) || [])
      .filter(m => m.student)
      .sort((a, b) => b.marks_obtained - a.marks_obtained)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href={`/classes/${classId}/exams`}
            className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={`text-xs font-semibold border-0 ${TYPE_COLORS[e.exam_type] || TYPE_COLORS.Other}`}>
                {e.exam_type}
              </Badge>
              {e.is_published && (
                <Badge className="text-xs border-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <Globe className="h-3 w-3 mr-1" />Results published
                </Badge>
              )}
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{e.name}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              {e.exam_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(e.exam_date), 'MMMM d, yyyy')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {questions?.length || 0} question{(questions?.length || 0) !== 1 ? 's' : ''}
              </span>
              {displayTotal && (
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  Total: {displayTotal} marks
                </span>
              )}
            </div>
          </div>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2 self-start sm:self-auto pl-9 sm:pl-0">
            <PublishResultsButton examId={examId} isPublished={e.is_published} />
            <AddQuestionDialog examId={examId} nextNumber={nextNumber} />
          </div>
        )}
      </div>

      {/* Published results board */}
      {publishedMarks.length > 0 && (
        <Card className="border-0 shadow-sm dark:bg-card border border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
              <Trophy className="h-4 w-4" />
              Class Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {publishedMarks.map((mk, idx) => {
                const pct = displayTotal ? Math.round((mk.marks_obtained / displayTotal) * 100) : null
                const isCurrentUser = mk.student_id === user.id
                return (
                  <div
                    key={mk.id}
                    className={`flex items-center justify-between py-2.5 first:pt-0 last:pb-0 ${isCurrentUser ? 'rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-2 -mx-2' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold w-6 text-center ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-700' : 'text-gray-400'}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className={`text-sm ${isCurrentUser ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                        {mk.student?.full_name}{isCurrentUser ? ' (you)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pct !== null && (
                        <span className={`text-xs font-medium ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                          {pct}%
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {mk.marks_obtained}{displayTotal ? `/${displayTotal}` : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher: Student marks entry section */}
      {isTeacher && members.length > 0 && (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Student Marks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map(m => {
                const existing = marksByStudent[m.student_id] || null
                const pct = existing && displayTotal ? Math.round((existing.marks_obtained / displayTotal) * 100) : null
                return (
                  <div key={m.student_id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {m.student?.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-800 dark:text-gray-200">{m.student?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pct !== null && (
                        <span className={`text-xs font-medium ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                          {pct}%
                        </span>
                      )}
                      <SetExamMarksDialog
                        examId={examId}
                        classId={classId}
                        totalMarks={displayTotal}
                        studentId={m.student_id}
                        studentName={m.student?.full_name || ''}
                        existing={existing}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {!questions || questions.length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <HelpCircle className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="font-medium text-gray-700 dark:text-gray-300">No questions yet</p>
            {isTeacher && (
              <p className="text-sm text-gray-400 mt-1">Click &ldquo;Add Question&rdquo; to add exam questions with solutions</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(questions as ExamQuestion[]).map(q => (
            <Card key={q.id} className="border-0 shadow-sm dark:bg-card overflow-hidden">
              <div className="p-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm font-bold">
                    {q.question_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap flex-1">
                        {q.question_text}
                      </p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {q.marks !== null && q.marks !== undefined && (
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1 whitespace-nowrap">
                            [{q.marks} mk]
                          </span>
                        )}
                        {isTeacher && (
                          <>
                            <EditQuestionDialog question={q} />
                            <DeleteQuestionButton questionId={q.id} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {q.solution_text && (
                <div className="mx-4 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                      Solution
                    </span>
                  </div>
                  <p className="text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                    {q.solution_text}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
