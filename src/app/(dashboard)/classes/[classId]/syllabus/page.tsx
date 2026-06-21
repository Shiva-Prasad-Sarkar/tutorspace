import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SyllabusChapter, SyllabusTopic } from '@/types'
import { SyllabusManager } from '@/components/syllabus/syllabus-manager'

export default async function SyllabusPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const { data: chapters } = await supabase
    .from('syllabus_chapters')
    .select('*')
    .eq('class_id', classId)
    .order('order_index', { ascending: true })

  const { data: topics } = await supabase
    .from('syllabus_topics')
    .select('*')
    .eq('class_id', classId)
    .order('order_index', { ascending: true })

  const { data: completions } = await supabase
    .from('topic_completions')
    .select('topic_id')
    .eq('class_id', classId)

  const completedTopicIds = new Set((completions || []).map((c: { topic_id: string }) => c.topic_id))

  const chaptersWithTopics = (chapters || []).map((ch: SyllabusChapter) => ({
    ...ch,
    topics: (topics || [])
      .filter((t: SyllabusTopic) => t.chapter_id === ch.id)
      .map((t: SyllabusTopic) => ({ ...t, completed: completedTopicIds.has(t.id) })),
  }))

  const totalTopics = topics?.length || 0
  const completedCount = completedTopicIds.size

  return (
    <SyllabusManager
      classId={classId}
      isTeacher={isTeacher}
      chapters={chaptersWithTopics}
      totalTopics={totalTopics}
      completedCount={completedCount}
    />
  )
}
