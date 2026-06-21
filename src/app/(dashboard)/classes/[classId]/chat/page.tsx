import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Profile } from '@/types'
import { ChatWindow } from '@/components/chat/chat-window'

export default async function ChatPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*, sender:profiles(id, full_name, role)')
    .eq('class_id', classId)
    .order('created_at', { ascending: true })
    .limit(100)

  return (
    <ChatWindow
      classId={classId}
      currentUser={profile as Profile}
      initialMessages={messages || []}
    />
  )
}
