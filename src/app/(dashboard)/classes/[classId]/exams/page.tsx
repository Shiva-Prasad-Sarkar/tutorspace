import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Exam } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddExamDialog } from '@/components/exams/add-exam-dialog'
import { EditExamDialog } from '@/components/exams/edit-exam-dialog'
import { DeleteExamButton } from '@/components/exams/delete-exam-button'
import { format } from 'date-fns'
import { GraduationCap, Calendar, HelpCircle, ChevronRight, Globe } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  CT:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  Mid:   'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Final: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Quiz:  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export default async function ExamsPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const { data: examsRaw } = await supabase
    .from('exams')
    .select('*, exam_questions(count)')
    .eq('class_id', classId)
    .order('exam_date', { ascending: true, nullsFirst: false })

  const exams: (Exam & { question_count: number })[] = (examsRaw || []).map(
    (e: Exam & { exam_questions: Array<{ count: number }> }) => ({
      ...e,
      question_count: e.exam_questions?.[0]?.count || 0,
    })
  )

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Exams & Tests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Previous questions with solutions</p>
        </div>
        {isTeacher && <div className="self-start sm:self-auto"><AddExamDialog classId={classId} /></div>}
      </div>

      {exams.length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <GraduationCap className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="font-medium text-gray-700 dark:text-gray-300">No exams yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {isTeacher ? 'Add CTs, mids, finals with past questions and solutions' : 'Your teacher hasn\'t added any exams yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => (
            <Card key={exam.id} className="border-0 shadow-sm dark:bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-xs font-semibold border-0 ${TYPE_COLORS[exam.exam_type] || TYPE_COLORS.Other}`}>
                        {exam.exam_type}
                      </Badge>
                      {exam.is_published && (
                        <Badge className="text-xs border-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <Globe className="h-2.5 w-2.5 mr-1" />Results
                        </Badge>
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white">{exam.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      {exam.exam_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(exam.exam_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {exam.question_count} question{exam.question_count !== 1 ? 's' : ''}
                      </span>
                      {exam.total_marks && (
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          Total: {exam.total_marks} marks
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isTeacher && (
                      <>
                        <EditExamDialog exam={exam} />
                        <DeleteExamButton examId={exam.id} classId={classId} />
                      </>
                    )}
                    <Link
                      href={`/classes/${classId}/exams/${exam.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 dark:text-indigo-400 transition-colors"
                    >
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
