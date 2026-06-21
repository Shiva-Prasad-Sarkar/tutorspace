import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Note } from '@/types'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AddNoteDialog } from '@/components/notes/add-note-dialog'
import { DeleteNoteButton } from '@/components/notes/delete-note-button'
import { EditNoteDialog } from '@/components/notes/edit-note-dialog'
import { FileText } from 'lucide-react'

export default async function NotesPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const { data: notes } = await supabase
    .from('notes')
    .select('*, author:profiles(full_name)')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Shared class notes and resources</p>
        </div>
        {isTeacher && <div className="self-start sm:self-auto"><AddNoteDialog classId={classId} /></div>}
      </div>

      {!notes || notes.length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <FileText className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="font-medium text-gray-700 dark:text-gray-300">No notes yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {isTeacher ? 'Add notes for your students' : 'Your teacher hasn\'t added any notes yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 stagger">
          {notes.map((note: Note & { author: { full_name: string } }) => (
            <Card key={note.id} className="border-0 shadow-sm dark:bg-card card-hover animate-fade-up">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{note.title}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {note.author?.full_name} · {format(new Date(note.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {isTeacher && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <EditNoteDialog note={note} />
                    <DeleteNoteButton noteId={note.id} />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-6">
                  {note.content || <span className="text-gray-300 dark:text-gray-600 italic">No content</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
