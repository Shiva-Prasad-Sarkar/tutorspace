import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClassMember, Profile, Class } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Users, Clock, BookOpen, GraduationCap } from 'lucide-react'
import { MemberApprovalCard } from '@/components/classes/member-approval-card'
import Link from 'next/link'

type MemberWithDetails = ClassMember & {
  student: Profile
  class: Class
}

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') redirect('/dashboard')

  // Get all classes owned by this teacher
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, subject, color')
    .eq('teacher_id', user.id)

  const classIds = (classes || []).map((c: { id: string }) => c.id)

  // Get all members across all classes
  const { data: members } = classIds.length > 0
    ? await supabase
        .from('class_members')
        .select('*, student:profiles(*), class:classes(id, name, subject, color)')
        .in('class_id', classIds)
        .order('joined_at', { ascending: false })
    : { data: [] }

  const allMembers = (members || []) as MemberWithDetails[]
  const approved = allMembers.filter(m => m.status === 'approved')
  const pending = allMembers.filter(m => m.status === 'pending')

  // Deduplicate students (a student may be in multiple classes)
  const uniqueStudentIds = [...new Set(approved.map(m => m.student_id))]

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Students</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {uniqueStudentIds.length} student{uniqueStudentIds.length !== 1 ? 's' : ''} across {(classes || []).length} class{(classes || []).length !== 1 ? 'es' : ''}
        </p>
      </div>

      {(classes || []).length === 0 && (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-300 font-medium">No classes yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create a class first to start adding students.</p>
            <Link
              href="/classes/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create a Class
            </Link>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 dark:bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Approval ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map(m => (
              <div key={m.id}>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {m.class?.name} — {m.class?.subject}
                </div>
                <MemberApprovalCard membership={m} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {approved.length === 0 && (classes || []).length > 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-300 font-medium">No students yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Share a class invite code with your students to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="h-4 w-4 text-indigo-500" />
              All Students ({uniqueStudentIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-50 dark:divide-white/8">
              {uniqueStudentIds.map(studentId => {
                const studentMemberships = approved.filter(m => m.student_id === studentId)
                const student = studentMemberships[0]?.student
                if (!student) return null
                const earliestJoin = studentMemberships.reduce((earliest, m) =>
                  m.joined_at < earliest ? m.joined_at : earliest,
                  studentMemberships[0].joined_at
                )
                return (
                  <div key={studentId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {student.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{student.full_name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{student.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {studentMemberships.map(m => (
                            <Link
                              key={m.class_id}
                              href={`/classes/${m.class_id}/members`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                            >
                              <BookOpen className="h-2.5 w-2.5" />
                              {m.class?.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400">Active</Badge>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Since {format(new Date(earliestJoin), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
