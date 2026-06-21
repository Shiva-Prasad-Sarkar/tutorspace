import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClassMember, Profile, DirectMessage } from '@/types'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

export default async function MessagesPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Students go directly to their DM with the teacher
  if (profile.role === 'student') {
    const { data: cls } = await supabase.from('classes').select('teacher_id').eq('id', classId).single()
    if (cls?.teacher_id) redirect(`/classes/${classId}/messages/${cls.teacher_id}`)
    redirect(`/classes/${classId}`)
  }

  // Teacher: list students with last message preview
  const { data: members } = await supabase
    .from('class_members')
    .select('*, student:profiles(*)')
    .eq('class_id', classId)
    .eq('status', 'approved')
    .order('joined_at', { ascending: true })

  const studentIds = (members || []).map((m: ClassMember & { student: Profile }) => m.student_id)

  const lastMsgMap = new Map<string, DirectMessage>()
  const unreadMap = new Map<string, number>()
  if (studentIds.length > 0) {
    try {
      const { data: lastMessages } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('class_id', classId)
        .or(`sender_id.in.(${studentIds.join(',')}),receiver_id.in.(${studentIds.join(',')})`)
        .order('created_at', { ascending: false })

      for (const msg of (lastMessages as DirectMessage[] || [])) {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        if (!lastMsgMap.has(otherId)) lastMsgMap.set(otherId, msg)
        // count unread messages from this student to me
        if (msg.receiver_id === user.id && !msg.read_at) {
          unreadMap.set(otherId, (unreadMap.get(otherId) || 0) + 1)
        }
      }
    } catch {
      // Table may not exist yet; show empty state
    }
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Private Messages</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Direct conversations with your students</p>
      </div>

      {(members || []).length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-14 text-center">
            <MessageSquare className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">No students yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(members as (ClassMember & { student: Profile })[]).map(m => {
            const last = lastMsgMap.get(m.student_id)
            const unread = unreadMap.get(m.student_id) || 0
            return (
              <Link key={m.id} href={`/classes/${classId}/messages/${m.student_id}`} className="block">
                <Card className="border-0 shadow-sm dark:bg-card hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {m.student?.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-gray-900 dark:text-white ${unread > 0 ? 'font-bold' : 'font-semibold'}`}>{m.student?.full_name}</p>
                        {last ? (
                          <p className={`text-xs truncate ${unread > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                            {last.sender_id === user.id ? 'You: ' : ''}{last.content}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500">No messages yet — start a conversation</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {last && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {format(new Date(last.created_at), 'MMM d')}
                          </span>
                        )}
                        {unread > 0 ? (
                          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        ) : (
                          <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
