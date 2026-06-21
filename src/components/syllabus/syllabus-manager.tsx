'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SyllabusChapter, SyllabusTopic } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  CheckCircle, Circle, BookOpen, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TopicWithCompletion = Omit<SyllabusTopic, 'completions'> & { completed: boolean }
type ChapterWithTopics = Omit<SyllabusChapter, 'topics'> & { topics: TopicWithCompletion[] }

interface SyllabusManagerProps {
  classId: string
  isTeacher: boolean
  chapters: ChapterWithTopics[]
  totalTopics: number
  completedCount: number
}

export function SyllabusManager({ classId, isTeacher, chapters: initial, totalTopics, completedCount }: SyllabusManagerProps) {
  const router = useRouter()
  const [chapters, setChapters] = useState(initial)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(initial.map(c => c.id)))
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [newTopicTitles, setNewTopicTitles] = useState<Record<string, string>>({})
  const [addingChapter, setAddingChapter] = useState(false)
  const [addingTopic, setAddingTopic] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const pct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0

  async function handleAddChapter() {
    if (!newChapterTitle.trim()) return
    setAddingChapter(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('syllabus_chapters').insert({
      class_id: classId,
      title: newChapterTitle.trim(),
      order_index: chapters.length,
    }).select().single()
    if (error) toast.error(error.message)
    else {
      setChapters(prev => [...prev, { ...data, topics: [] as TopicWithCompletion[] }] as ChapterWithTopics[])
      setExpandedChapters(prev => new Set([...prev, data.id]))
      setNewChapterTitle('')
      toast.success('Chapter added!')
    }
    setAddingChapter(false)
  }

  async function handleDeleteChapter(chapterId: string) {
    if (!confirm('Delete this chapter and all its topics?')) return
    const supabase = createClient()
    const { error } = await supabase.from('syllabus_chapters').delete().eq('id', chapterId)
    if (error) toast.error(error.message)
    else { setChapters(prev => prev.filter(c => c.id !== chapterId)); toast.success('Chapter deleted'); }
  }

  async function handleAddTopic(chapterId: string) {
    const title = newTopicTitles[chapterId]?.trim()
    if (!title) return
    setAddingTopic(chapterId)
    const supabase = createClient()
    const chapter = chapters.find(c => c.id === chapterId)
    const { data, error } = await supabase.from('syllabus_topics').insert({
      class_id: classId,
      chapter_id: chapterId,
      title,
      order_index: chapter?.topics.length || 0,
    }).select().single()
    if (error) toast.error(error.message)
    else {
      setChapters(prev => prev.map(c =>
        c.id === chapterId ? { ...c, topics: [...c.topics, { ...data, completed: false } as TopicWithCompletion] } : c
      ))
      setNewTopicTitles(prev => ({ ...prev, [chapterId]: '' }))
      toast.success('Topic added!')
      router.refresh()
    }
    setAddingTopic(null)
  }

  async function handleDeleteTopic(chapterId: string, topicId: string) {
    const supabase = createClient()
    await supabase.from('syllabus_topics').delete().eq('id', topicId)
    setChapters(prev => prev.map(c =>
      c.id === chapterId ? { ...c, topics: c.topics.filter(t => t.id !== topicId) as TopicWithCompletion[] } : c
    ) as ChapterWithTopics[])
    toast.success('Topic deleted')
    router.refresh()
  }

  async function handleToggleComplete(chapterId: string, topic: TopicWithCompletion) {
    setToggling(topic.id)
    const supabase = createClient()
    if (topic.completed) {
      await supabase.from('topic_completions').delete()
        .eq('topic_id', topic.id).eq('class_id', classId)
    } else {
      await supabase.from('topic_completions').insert({ topic_id: topic.id, class_id: classId })
    }
    setChapters(prev => prev.map(c =>
      c.id === chapterId
        ? { ...c, topics: c.topics.map(t => t.id === topic.id ? { ...t, completed: !t.completed } as TopicWithCompletion : t) }
        : c
    ) as ChapterWithTopics[])
    router.refresh()
    setToggling(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Syllabus</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {completedCount} of {totalTopics} topics completed
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {totalTopics > 0 && (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Chapters */}
      {chapters.length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <BookOpen className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="font-medium text-gray-700 dark:text-gray-300">No syllabus yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {isTeacher ? 'Add chapters and topics below' : 'Your teacher hasn\'t added the syllabus yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, ci) => {
            const isExpanded = expandedChapters.has(chapter.id)
            const chapterCompleted = chapter.topics.length > 0 && chapter.topics.every(t => t.completed)
            const chapterPct = chapter.topics.length > 0
              ? Math.round((chapter.topics.filter(t => t.completed).length / chapter.topics.length) * 100)
              : 0

            return (
              <Card key={chapter.id} className="border-0 shadow-sm overflow-hidden dark:bg-card">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedChapters(prev => {
                        const next = new Set(prev)
                        if (next.has(chapter.id)) next.delete(chapter.id)
                        else next.add(chapter.id)
                        return next
                      })}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', chapterCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300')}>
                      {ci + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">{chapter.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {chapter.topics.filter(t => t.completed).length}/{chapter.topics.length} topics · {chapterPct}%
                      </p>
                    </div>
                    {isTeacher && (
                      <button
                        onClick={() => handleDeleteChapter(chapter.id)}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="pl-10 space-y-1.5">
                      {chapter.topics.map((topic, ti) => (
                        <div key={topic.id} className="flex items-center gap-2.5 py-1.5 group">
                          <button
                            onClick={() => isTeacher && handleToggleComplete(chapter.id, topic)}
                            disabled={!isTeacher || toggling === topic.id}
                            className={cn('flex-shrink-0', isTeacher ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default')}
                          >
                            {toggling === topic.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            ) : topic.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-300" />
                            )}
                          </button>
                          <span className={cn('text-sm flex-1', topic.completed ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300')}>
                            {topic.title}
                          </span>
                          {isTeacher && (
                            <button
                              onClick={() => handleDeleteTopic(chapter.id, topic.id)}
                              className="text-gray-200 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {isTeacher && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/8">
                          <Input
                            placeholder="Add topic..."
                            value={newTopicTitles[chapter.id] || ''}
                            onChange={e => setNewTopicTitles(prev => ({ ...prev, [chapter.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTopic(chapter.id) } }}
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddTopic(chapter.id)}
                            disabled={addingTopic === chapter.id}
                            className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700"
                          >
                            {addingTopic === chapter.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add chapter (teacher only) */}
      {isTeacher && (
        <div className="flex gap-2">
          <Input
            placeholder="New chapter title..."
            value={newChapterTitle}
            onChange={e => setNewChapterTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChapter() } }}
          />
          <Button onClick={handleAddChapter} disabled={addingChapter || !newChapterTitle.trim()} className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
            {addingChapter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add Chapter
          </Button>
        </div>
      )}
    </div>
  )
}
