import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ClassNav } from '@/components/classes/class-nav'
import { Class } from '@/types'

export default async function ClassLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cls } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single()

  if (!cls) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'teacher' && cls.teacher_id === user.id

  if (!isTeacher) {
    const { data: membership } = await supabase
      .from('class_members')
      .select('status')
      .eq('class_id', classId)
      .eq('student_id', user.id)
      .single()

    if (!membership || membership.status !== 'approved') {
      redirect('/dashboard')
    }
  }

  // Unread direct messages addressed to me in this class
  let unreadMessages = 0
  try {
    const { count } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('receiver_id', user.id)
      .is('read_at', null)
    unreadMessages = count || 0
  } catch {
    unreadMessages = 0
  }

  return (
    <div>
      <div className="sticky top-14 lg:top-0 z-20 bg-background -mx-4 sm:-mx-5 md:-mx-7 px-4 sm:px-5 md:px-7 pt-1 pb-0 -mt-4 sm:-mt-5 md:-mt-6">
        <ClassNav cls={cls as Class} isTeacher={isTeacher} classId={classId} unreadMessages={unreadMessages} />
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}
