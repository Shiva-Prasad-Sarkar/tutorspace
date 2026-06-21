import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarEvent } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { format, parseISO } from 'date-fns'
import { AddEventDialog } from '@/components/calendar/add-event-dialog'
import { DeleteEventButton } from '@/components/calendar/delete-event-button'
import { EditEventDialog } from '@/components/calendar/edit-event-dialog'

const EVENT_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  homework: { bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50', text: 'text-orange-700 dark:text-orange-300', label: 'Homework' },
  test: { bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50', text: 'text-red-700 dark:text-red-300', label: 'Test/Exam' },
  announcement: { bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50', text: 'text-blue-700 dark:text-blue-300', label: 'Announcement' },
  note: { bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900/50', text: 'text-green-700 dark:text-green-300', label: 'Note' },
  other: { bg: 'bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10', text: 'text-gray-700 dark:text-gray-300', label: 'Other' },
}

export default async function CalendarPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('class_id', classId)
    .order('event_date', { ascending: true })

  const grouped = (events || []).reduce((acc: Record<string, CalendarEvent[]>, event: CalendarEvent) => {
    const month = format(parseISO(event.event_date), 'MMMM yyyy')
    if (!acc[month]) acc[month] = []
    acc[month].push(event)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Calendar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Homework, tests, and announcements</p>
        </div>
        {isTeacher && <div className="self-start sm:self-auto"><AddEventDialog classId={classId} /></div>}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-medium text-gray-700 dark:text-gray-300">No events yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {isTeacher ? 'Add homework, tests, or announcements' : 'Your teacher hasn\'t added any events yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(Object.entries(grouped) as [string, CalendarEvent[]][]).map(([month, monthEvents]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{month}</h3>
              <div className="space-y-2">
                {monthEvents.map((event: CalendarEvent) => {
                  const style = EVENT_TYPE_STYLES[event.event_type] || EVENT_TYPE_STYLES.other
                  return (
                    <Card key={event.id} className={`border shadow-sm ${style.bg}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="text-center pt-0.5 flex-shrink-0 w-10">
                              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                                {format(parseISO(event.event_date), 'd')}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {format(parseISO(event.event_date), 'EEE')}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white dark:bg-white/10 border border-transparent ${style.text}`}>
                                  {style.label}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{event.title}</p>
                              {event.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{event.description}</p>
                              )}
                            </div>
                          </div>
                          {isTeacher && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <EditEventDialog event={event} />
                              <DeleteEventButton eventId={event.id} />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
