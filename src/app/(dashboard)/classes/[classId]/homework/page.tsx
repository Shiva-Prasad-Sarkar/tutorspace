import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Assignment, Submission, Profile } from '@/types'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddAssignmentDialog } from '@/components/homework/add-assignment-dialog'
import { EditAssignmentDialog } from '@/components/homework/edit-assignment-dialog'
import { DeleteAssignmentButton } from '@/components/homework/delete-assignment-button'
import { SubmitHomeworkDialog } from '@/components/homework/submit-homework-dialog'
import { GradeSubmissionDialog } from '@/components/homework/grade-submission-dialog'
import { ClipboardList, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default async function HomeworkPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })

  // For each assignment, get submissions
  const assignmentIds = (assignments || []).map((a: Assignment) => a.id)
  const { data: allSubmissions } = await supabase
    .from('submissions')
    .select('*, student:profiles(id, full_name, email)')
    .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none'])

  // For students, get their own submissions
  const mySubmissions = isTeacher ? [] : (allSubmissions || []).filter(
    (s: Submission) => s.student_id === user.id
  )

  const submissionsByAssignment = (allSubmissions || []).reduce((acc: Record<string, (Submission & { student: Profile })[]>, s: Submission & { student: Profile }) => {
    if (!acc[s.assignment_id]) acc[s.assignment_id] = []
    acc[s.assignment_id].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Homework</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isTeacher ? 'Assign and grade homework' : 'Submit and track your assignments'}
          </p>
        </div>
        {isTeacher && <div className="self-start sm:self-auto"><AddAssignmentDialog classId={classId} /></div>}
      </div>

      {!assignments || assignments.length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <ClipboardList className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="font-medium text-gray-700 dark:text-gray-300">No assignments yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {isTeacher ? 'Create your first assignment' : 'Your teacher hasn\'t assigned any homework yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment: Assignment) => {
            const subs = submissionsByAssignment[assignment.id] || []
            const mySubmission = mySubmissions.find((s: Submission) => s.assignment_id === assignment.id)
            const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()
            const isDue = assignment.due_date

            return (
              <Card key={assignment.id} className="border-0 shadow-sm dark:bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{assignment.title}</h3>
                        {isTeacher && (
                          <Badge variant="secondary" className="text-xs">
                            {subs.length} submitted
                          </Badge>
                        )}
                        {!isTeacher && mySubmission && (
                          <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 border-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        )}
                        {!isTeacher && !mySubmission && isOverdue && (
                          <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border-0">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{assignment.description}</p>
                      )}
                      {isDue && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock className={`h-3.5 w-3.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            Due {format(new Date(assignment.due_date!), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isTeacher && (
                        <>
                          <EditAssignmentDialog assignment={assignment} />
                          <DeleteAssignmentButton assignmentId={assignment.id} />
                        </>
                      )}
                      {assignment.file_url && (
                        <a
                          href={assignment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {assignment.file_name || 'Attachment'}
                        </a>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isTeacher ? (
                    // Teacher sees all submissions
                    <div>
                      {subs.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No submissions yet</p>
                      ) : (
                        <div className="space-y-2">
                          {subs.map((sub: Submission & { student: Profile }) => (
                            <div key={sub.id} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">
                                  {sub.student?.full_name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.student?.full_name}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Submitted {format(new Date(sub.submitted_at), 'MMM d, h:mm a')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {sub.grade && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 border-0 text-xs">
                                    {sub.grade}
                                  </Badge>
                                )}
                                <GradeSubmissionDialog submission={sub} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Student sees their own submission or submit button
                    <div>
                      {mySubmission ? (
                        <div className="bg-green-50 dark:bg-green-950/40 rounded-xl p-3 space-y-2">
                          {mySubmission.content && (
                            <p className="text-sm text-gray-700 dark:text-gray-200">{mySubmission.content}</p>
                          )}
                          {mySubmission.file_url && (
                            <a
                              href={mySubmission.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {mySubmission.file_name || 'My submission'}
                            </a>
                          )}
                          {mySubmission.grade && (
                            <div className="flex items-center gap-2 pt-2 border-t border-green-200 dark:border-green-800/60">
                              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border-0">
                                Grade: {mySubmission.grade}
                              </Badge>
                              {mySubmission.feedback && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">{mySubmission.feedback}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <SubmitHomeworkDialog
                          assignmentId={assignment.id}
                          classId={classId}
                          assignmentTitle={assignment.title}
                        />
                      )}
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
