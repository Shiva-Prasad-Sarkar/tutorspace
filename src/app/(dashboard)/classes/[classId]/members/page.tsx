import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClassMember, Profile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Users, Clock, Mail } from 'lucide-react'
import { MemberApprovalCard } from '@/components/classes/member-approval-card'
import { RemoveMemberButton } from '@/components/classes/remove-member-button'
import { AddFeedbackDialog } from '@/components/feedback/add-feedback-dialog'
import Link from 'next/link'

export default async function MembersPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') redirect('/dashboard')

  const { data: members } = await supabase
    .from('class_members')
    .select('*, student:profiles(*)')
    .eq('class_id', classId)
    .order('joined_at', { ascending: true })

  const approved = (members || []).filter((m: ClassMember) => m.status === 'approved')
  const pending = (members || []).filter((m: ClassMember) => m.status === 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Members</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{approved.length} approved · {pending.length} pending</p>
      </div>

      {pending.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 dark:bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Approval ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((m: ClassMember & { student: Profile }) => (
              <MemberApprovalCard key={m.id} membership={m} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm dark:bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            Students ({approved.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approved.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No approved students yet</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {approved.map((m: ClassMember & { student: Profile }) => (
                <div key={m.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {m.student?.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.student?.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.student?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Link
                      href={`/classes/${classId}/messages/${m.student_id}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                      title="Send private message"
                    >
                      <Mail className="h-4 w-4" />
                    </Link>
                    <AddFeedbackDialog classId={classId} studentId={m.student_id} studentName={m.student?.full_name || ''} />
                    <div className="hidden sm:block text-right">
                      <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400">Active</Badge>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Joined {format(new Date(m.joined_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <RemoveMemberButton membershipId={m.id} studentName={m.student?.full_name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
