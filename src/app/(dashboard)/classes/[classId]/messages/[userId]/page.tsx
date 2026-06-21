import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DirectMessage, Profile } from '@/types'
import { DmWindow } from '@/components/chat/dm-window'

export default async function DmPage({
  params,
}: {
  params: Promise<{ classId: string; userId: string }>
}) {
  const { classId, userId: otherUserId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: currentProfile }, { data: otherProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', otherUserId).single(),
  ])

  if (!currentProfile || !otherProfile) redirect(`/classes/${classId}`)

  // Fetch messages — graceful fallback if table not yet created
  let messages: (DirectMessage & { sender: Profile })[] = []
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!sender_id(id, full_name, role)')
      .eq('class_id', classId)
      .in('sender_id', [user.id, otherUserId])
      .in('receiver_id', [user.id, otherUserId])
      .order('created_at', { ascending: true })
    if (!error && data) messages = data as (DirectMessage & { sender: Profile })[]

    // Mark incoming messages from this person as read
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('class_id', classId)
      .eq('receiver_id', user.id)
      .eq('sender_id', otherUserId)
      .is('read_at', null)
  } catch {
    // ignore
  }

  return (
    <DmWindow
      classId={classId}
      currentUser={currentProfile as Profile}
      otherUser={otherProfile as Profile}
      initialMessages={messages}
    />
  )
}
