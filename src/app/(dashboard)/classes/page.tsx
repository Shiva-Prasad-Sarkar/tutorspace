import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Class, ClassMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Plus, Users, ArrowRight, Copy } from 'lucide-react'
import { CopyInviteButton } from '@/components/classes/copy-invite-button'
import { EditClassDialog } from '@/components/classes/edit-class-dialog'
import { DeleteClassButton } from '@/components/classes/delete-class-button'
import { JoinClassDialog } from '@/components/classes/join-class-dialog'

export default async function ClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  let classes: (Class & { memberCount?: number })[] = []

  if (isTeacher) {
    const { data } = await supabase.from('classes').select('*, class_members(count)').eq('teacher_id', user.id).order('created_at', { ascending: false })
    classes = (data || []).map((c: Class & { class_members: Array<{ count: number }> }) => ({ ...c, memberCount: c.class_members?.[0]?.count || 0 }))
  } else {
    const { data } = await supabase.from('class_members').select('*, classes(*)').eq('student_id', user.id).eq('status', 'approved')
    classes = (data || []).map((m: ClassMember & { classes: Class }) => m.classes)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">My Classes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {isTeacher
              ? `${classes.length} class${classes.length !== 1 ? 'es' : ''} — manage and grow your teaching`
              : `Enrolled in ${classes.length} class${classes.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
        {isTeacher ? (
          <Link href="/classes/new" className="self-start sm:self-auto">
            <Button className="bg-indigo-600 hover:bg-indigo-700 h-9 text-sm shadow-sm shadow-indigo-500/20">
              <Plus className="h-4 w-4 mr-1.5" />New Class
            </Button>
          </Link>
        ) : (
          <div className="self-start sm:self-auto">
            <JoinClassDialog />
          </div>
        )}
      </div>

      {/* Empty state */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center mb-5">
            <BookOpen className="h-9 w-9 text-indigo-400 dark:text-indigo-500" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-2">No classes yet</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs text-sm leading-relaxed">
            {isTeacher
              ? 'Create your first class to start managing students, sharing notes, and more.'
              : "You haven't joined any classes yet. Ask your teacher for an invite code."}
          </p>
          <div className="mt-6">
            {isTeacher ? (
              <Link href="/classes/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20">
                  <Plus className="h-4 w-4 mr-2" />Create your first class
                </Button>
              </Link>
            ) : (
              <JoinClassDialog />
            )}
          </div>
        </div>
      ) : (
        /* Class grid */
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {classes.map(cls => {
            const color = cls.color || '#4f46e5'
            return (
              <div key={cls.id} className="group relative bg-white dark:bg-card rounded-2xl shadow-sm overflow-hidden card-hover border border-gray-100/80 dark:border-white/5 animate-fade-up flex flex-col">
                {/* Color header */}
                <div className="relative h-28 flex-shrink-0 overflow-hidden" style={{ backgroundColor: color }}>
                  {/* Decorative circles */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -left-2 w-16 h-16 rounded-full bg-black/10" />
                  <div className="absolute inset-0 flex items-end justify-between p-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black text-2xl shadow-sm">
                      {cls.name.charAt(0)}
                    </div>
                    {isTeacher && (
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl px-2.5 py-1.5">
                        <Users className="h-3.5 w-3.5 text-white" />
                        <span className="text-xs font-bold text-white">{cls.memberCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{cls.subject}</p>
                    {cls.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{cls.description}</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/6 flex items-center justify-between">
                    {!isTeacher && (
                      <Badge className="text-xs border-0 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                        Enrolled
                      </Badge>
                    )}
                    <div className="flex items-center gap-0.5 ml-auto">
                      {isTeacher && (
                        <>
                          <CopyInviteButton code={cls.invite_code} iconOnly />
                          <EditClassDialog cls={cls} />
                          <DeleteClassButton classId={cls.id} className={cls.name} />
                        </>
                      )}
                      <Link
                        href={`/classes/${cls.id}`}
                        className="flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all group/btn"
                      >
                        Open
                        <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
