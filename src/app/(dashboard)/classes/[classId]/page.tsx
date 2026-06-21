import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarEvent, Class, ClassMember, Profile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { Calendar, Users, Bell, MessageSquare, ArrowRight } from 'lucide-react'
import { CopyInviteButton } from '@/components/classes/copy-invite-button'
import { MemberApprovalCard } from '@/components/classes/member-approval-card'
import { UnenrollButton } from '@/components/classes/unenroll-button'
import Link from 'next/link'

export default async function ClassOverviewPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const today = new Date().toISOString().split('T')[0]

  const { data: cls } = await supabase.from('classes').select('*').eq('id', classId).single()

  const [{ data: events }, { data: announcements }, { data: members }] = await Promise.all([
    supabase.from('calendar_events').select('*').eq('class_id', classId)
      .neq('event_type', 'announcement').gte('event_date', today)
      .order('event_date', { ascending: true }).limit(5),
    supabase.from('calendar_events').select('*').eq('class_id', classId)
      .eq('event_type', 'announcement').order('event_date', { ascending: false }).limit(3),
    supabase.from('class_members').select('*, student:profiles(*)').eq('class_id', classId),
  ])

  const approvedMembers = (members || []).filter((m: ClassMember) => m.status === 'approved')
  const pendingMembers = (members || []).filter((m: ClassMember) => m.status === 'pending')

  const eventTypeColors: Record<string, string> = {
    homework:     'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
    test:         'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
    note:         'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300',
    other:        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    announcement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
  }

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-up">
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Pending approvals (teacher only) */}
          {isTeacher && pendingMembers.length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 dark:bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                  <Bell className="h-4 w-4 text-amber-500" />
                  Pending Approvals ({pendingMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingMembers.map((m: ClassMember & { student: Profile }) => (
                  <MemberApprovalCard key={m.id} membership={m} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Announcements */}
          {(announcements || []).length > 0 && (
            <Card className="border-0 shadow-sm dark:bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                  <Bell className="h-4 w-4 text-blue-500" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(announcements as CalendarEvent[]).map(a => (
                  <div key={a.id} className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 p-3">
                    <div className="flex justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{format(new Date(a.event_date), 'MMM d')}</span>
                    </div>
                    {a.description && <p className="text-xs text-gray-600 dark:text-gray-400">{a.description}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming events */}
          <Card className="border-0 shadow-sm dark:bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!events || events.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  No upcoming events. Add some in the Calendar tab.
                </p>
              ) : (
                <div className="space-y-3">
                  {(events as CalendarEvent[]).map(event => (
                    <div key={event.id} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-white/8 last:border-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 mt-0.5 ${eventTypeColors[event.event_type] || eventTypeColors.other}`}>
                        {event.event_type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                        {event.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{event.description}</p>}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {format(new Date(event.event_date), 'EEEE, MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {isTeacher && cls ? (
            <Card className="border-0 shadow-sm dark:bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-900 dark:text-white">Invite Code</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Share with students to join:</p>
                <div className="flex items-center justify-center">
                  <CopyInviteButton code={(cls as Class).invite_code} />
                </div>
              </CardContent>
            </Card>
          ) : !isTeacher && cls ? (
            <Card className="border-0 shadow-sm dark:bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-900 dark:text-white">Class Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/classes/${classId}/messages/${(cls as Class).teacher_id}`}
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message Teacher
                </Link>
                <UnenrollButton classId={classId} className={(cls as Class).name} />
              </CardContent>
            </Card>
          ) : null}

          {/* Students list */}
          <Card className="border-0 shadow-sm dark:bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                <Users className="h-4 w-4 text-indigo-500" />
                Students ({approvedMembers.length})
              </CardTitle>
              {isTeacher && (
                <Link href={`/classes/${classId}/members`} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 hover:gap-1.5 transition-all">
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {approvedMembers.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No students yet</p>
              ) : (
                <div className="space-y-2">
                  {(approvedMembers as (ClassMember & { student: Profile })[]).slice(0, 8).map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {m.student?.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{m.student?.full_name}</span>
                    </div>
                  ))}
                  {approvedMembers.length > 8 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
                      +{approvedMembers.length - 8} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
