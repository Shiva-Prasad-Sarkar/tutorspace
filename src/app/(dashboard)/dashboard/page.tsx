import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Profile, Class, ClassMember } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen, Users, Clock, Plus, CheckCircle, Bell,
  ClipboardList, MessageSquare, ArrowRight, TrendingUp, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, isAfter, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'
  const today = new Date().toISOString().split('T')[0]

  let classes: Class[] = []
  let pendingCount = 0
  let recentEvents: Array<{ id: string; title: string; event_date: string; event_type: string; class_name: string }> = []

  let pendingMemberships: (ClassMember & { class?: Class })[] = []
  let upcomingHw: Array<{ id: string; title: string; due_date: string | null; class_id: string; class_name: string; submitted: boolean }> = []
  let recentFeedback: Array<{ id: string; content: string; feedback_date: string; class_name: string }> = []

  if (isTeacher) {
    const { data } = await supabase.from('classes').select('*, class_members(count)').eq('teacher_id', user.id).order('created_at', { ascending: false })
    classes = (data || []) as Class[]
    if (classes.length > 0) {
      const { count } = await supabase.from('class_members').select('*', { count: 'exact', head: true }).eq('status', 'pending').in('class_id', classes.map(c => c.id))
      pendingCount = count || 0
      const { data: events } = await supabase.from('calendar_events').select('id, title, event_date, event_type, classes(name)').in('class_id', classes.map(c => c.id)).gte('event_date', today).order('event_date', { ascending: true }).limit(5)
      recentEvents = ((events || []) as unknown as Array<{ id: string; title: string; event_date: string; event_type: string; classes: { name: string } | Array<{ name: string }> }>).map(e => ({ id: e.id, title: e.title, event_date: e.event_date, event_type: e.event_type, class_name: Array.isArray(e.classes) ? e.classes[0]?.name : (e.classes as { name: string })?.name || '' }))
    }
  } else {
    const { data: allMemberships } = await supabase.from('class_members').select('*, classes(*)').eq('student_id', user.id)
    const memberships = allMemberships as (ClassMember & { classes: Class })[] || []
    pendingMemberships = memberships.filter(m => m.status === 'pending')
    const approved = memberships.filter(m => m.status === 'approved')
    classes = approved.map(m => m.classes)
    if (classes.length > 0) {
      const classIds = classes.map(c => c.id)
      const [{ data: assignments }, { data: submissions }, { data: feedback }] = await Promise.all([
        supabase.from('assignments').select('id, title, due_date, class_id, classes(name)').in('class_id', classIds).or(`due_date.gte.${today},due_date.is.null`).order('due_date', { ascending: true, nullsFirst: false }).limit(8),
        supabase.from('submissions').select('assignment_id').in('class_id', classIds).eq('student_id', user.id),
        supabase.from('daily_feedback').select('id, content, feedback_date, class_id, classes(name)').in('class_id', classIds).eq('student_id', user.id).order('feedback_date', { ascending: false }).limit(3),
      ])
      const submittedIds = new Set((submissions || []).map((s: { assignment_id: string }) => s.assignment_id))
      upcomingHw = ((assignments || []) as unknown as Array<{ id: string; title: string; due_date: string | null; class_id: string; classes: { name: string } | Array<{ name: string }> }>).map(a => ({ id: a.id, title: a.title, due_date: a.due_date, class_id: a.class_id, class_name: Array.isArray(a.classes) ? a.classes[0]?.name : (a.classes as { name: string })?.name || '', submitted: submittedIds.has(a.id) }))
      recentFeedback = ((feedback || []) as unknown as Array<{ id: string; content: string; feedback_date: string; class_id: string; classes: { name: string } | Array<{ name: string }> }>).map(f => ({ id: f.id, content: f.content, feedback_date: f.feedback_date, class_name: Array.isArray(f.classes) ? f.classes[0]?.name : (f.classes as { name: string })?.name || '' }))
    }
  }

  const totalStudents = isTeacher ? classes.reduce((a, c) => a + ((c as Class & { class_members?: Array<{ count: number }> }).class_members?.[0]?.count || 0), 0) : classes.length
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const eventTypeColors: Record<string, string> = {
    homework:     'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
    test:         'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    announcement: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    note:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    other:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const stats = isTeacher ? [
    { icon: BookOpen,    label: 'Classes',          val: classes.length,  gradient: 'from-indigo-500 to-violet-600',  bg: 'bg-indigo-50 dark:bg-indigo-950/40',   text: 'text-indigo-600 dark:text-indigo-400'  },
    { icon: Users,       label: 'Total students',   val: totalStudents,   gradient: 'from-violet-500 to-purple-600',  bg: 'bg-violet-50 dark:bg-violet-950/40',   text: 'text-violet-600 dark:text-violet-400'  },
    { icon: Bell,        label: 'Pending approvals', val: pendingCount,   gradient: pendingCount > 0 ? 'from-amber-500 to-orange-500' : 'from-gray-400 to-gray-500', bg: pendingCount > 0 ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-gray-50 dark:bg-gray-800', text: pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500' },
    { icon: Clock,       label: 'Upcoming events',  val: recentEvents.length, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  ] : [
    { icon: BookOpen,    label: 'Enrolled classes', val: classes.length,                               gradient: 'from-indigo-500 to-violet-600',  bg: 'bg-indigo-50 dark:bg-indigo-950/40',   text: 'text-indigo-600 dark:text-indigo-400'  },
    { icon: ClipboardList,label: 'HW due',          val: upcomingHw.filter(h => !h.submitted).length, gradient: 'from-orange-500 to-red-500',      bg: 'bg-orange-50 dark:bg-orange-950/40',   text: 'text-orange-600 dark:text-orange-400'  },
    { icon: CheckCircle, label: 'Submitted',        val: upcomingHw.filter(h => h.submitted).length,  gradient: 'from-emerald-500 to-teal-500',    bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
    { icon: MessageSquare,label: 'Feedback',        val: recentFeedback.length || '—',                gradient: 'from-violet-500 to-purple-600',   bg: 'bg-violet-50 dark:bg-violet-950/40',   text: 'text-violet-600 dark:text-violet-400'  },
  ]

  return (
    <div className="space-y-5 sm:space-y-7 animate-fade-up">
      {/* ── Hero banner ──────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 sm:p-8">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-indigo-200" />
            <span className="text-indigo-200 text-xs font-medium tracking-wide uppercase">
              {isTeacher ? 'Teacher Dashboard' : 'Student Dashboard'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-indigo-200 text-sm">
            {isTeacher ? 'Here\'s what\'s happening across your classes today.' : 'Keep up the great work — here\'s your progress.'}
          </p>
          {isTeacher && (
            <Link href="/classes/new" className="mt-5 inline-flex">
              <Button className="bg-white text-indigo-700 hover:bg-indigo-50 h-9 text-sm font-semibold shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" />New Class
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Pending notice */}
      {!isTeacher && pendingMemberships.length > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            {pendingMemberships.length === 1
              ? 'You have a pending enrollment awaiting teacher approval.'
              : `${pendingMemberships.length} pending enrollments awaiting approval.`}
          </p>
        </div>
      )}

      {/* ── Stats grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        {stats.map(({ icon: Icon, label, val, gradient, bg, text }) => (
          <Card key={label} className="border-0 shadow-sm dark:bg-card/80 overflow-hidden animate-fade-up">
            <CardContent className="p-4 sm:p-5">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg)}>
                <Icon className={cn('h-5 w-5', text)} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{val}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Classes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">{isTeacher ? 'Your Classes' : 'Enrolled Classes'}</h2>
            <Link href="/classes" className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {classes.length === 0 ? (
            <Card className="border-0 shadow-sm dark:bg-card/80 border-dashed border-2 border-gray-200 dark:border-gray-700">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-4">
                  <BookOpen className="h-7 w-7 text-indigo-400" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">No classes yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                  {isTeacher ? 'Create your first class to get started' : 'Ask your teacher for an invite code'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 stagger">
              {classes.slice(0, 4).map(cls => (
                <Link key={cls.id} href={`/classes/${cls.id}`} className="block">
                  <Card className="border-0 shadow-sm dark:bg-card/80 card-hover cursor-pointer group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm animate-fade-up"
                        style={{ backgroundColor: cls.color || '#4f46e5' }}
                      >
                        {cls.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {cls.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cls.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isTeacher && (
                          <Badge className="text-xs border-0 bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300">
                            <Users className="h-2.5 w-2.5 mr-1" />
                            {(cls as Class & { class_members?: Array<{ count: number }> }).class_members?.[0]?.count || 0}
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Student: upcoming homework */}
          {!isTeacher && upcomingHw.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900 dark:text-white">Upcoming Homework</h2>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-2 stagger">
                {upcomingHw.slice(0, 5).map(hw => {
                  const isOverdue = hw.due_date && !isAfter(parseISO(hw.due_date), new Date()) && !hw.submitted
                  return (
                    <Link key={hw.id} href={`/classes/${hw.class_id}/homework`} className="block">
                      <Card className="border-0 shadow-sm dark:bg-card/80 card-hover cursor-pointer animate-fade-up">
                        <CardContent className="py-3 px-4 flex items-center gap-3">
                          <div className={cn('p-2 rounded-xl flex-shrink-0', hw.submitted ? 'bg-emerald-100 dark:bg-emerald-950/50' : 'bg-orange-100 dark:bg-orange-950/50')}>
                            <ClipboardList className={cn('h-4 w-4', hw.submitted ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{hw.title}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{hw.class_name}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {hw.submitted
                              ? <Badge className="text-xs border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">Done</Badge>
                              : isOverdue
                              ? <Badge className="text-xs border-0 bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">Overdue</Badge>
                              : hw.due_date
                              ? <span className="text-xs text-gray-400 dark:text-gray-500">{format(parseISO(hw.due_date), 'MMM d')}</span>
                              : null}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Events or Feedback */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 dark:text-white">
            {isTeacher ? 'Upcoming Events' : 'Recent Feedback'}
          </h2>

          {isTeacher ? (
            recentEvents.length === 0 ? (
              <Card className="border-0 shadow-sm dark:bg-card/80">
                <CardContent className="py-10 flex flex-col items-center text-center">
                  <Clock className="h-8 w-8 text-gray-200 dark:text-gray-700 mb-2" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No upcoming events</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 stagger">
                {recentEvents.map(event => (
                  <Card key={event.id} className="border-0 shadow-sm dark:bg-card/80 animate-fade-up">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <span className={cn('mt-0.5 inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold flex-shrink-0', eventTypeColors[event.event_type] || eventTypeColors.other)}>
                          {event.event_type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{event.class_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            recentFeedback.length === 0 ? (
              <Card className="border-0 shadow-sm dark:bg-card/80">
                <CardContent className="py-10 flex flex-col items-center text-center">
                  <MessageSquare className="h-8 w-8 text-gray-200 dark:text-gray-700 mb-2" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No feedback yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Your teacher&apos;s feedback will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 stagger">
                {recentFeedback.map(f => (
                  <Card key={f.id} className="border-0 shadow-sm dark:bg-card/80 animate-fade-up">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">{f.class_name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-600 ml-auto flex-shrink-0">{format(parseISO(f.feedback_date), 'MMM d')}</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed">{f.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

