import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Attendance, AttendanceStatus, ClassMember, Profile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceMarker } from '@/components/attendance/attendance-marker'
import { format, parseISO } from 'date-fns'
import { CalendarCheck, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react'

const STATUS_META: Record<AttendanceStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  present: { label: 'Present', cls: 'text-green-600 dark:text-green-400',  icon: CheckCircle2 },
  absent:  { label: 'Absent',  cls: 'text-red-500 dark:text-red-400',      icon: XCircle },
  late:    { label: 'Late',    cls: 'text-amber-600 dark:text-amber-400',  icon: Clock },
  excused: { label: 'Excused', cls: 'text-blue-600 dark:text-blue-400',    icon: ShieldCheck },
}

export default async function AttendancePage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { data: cls } = await supabase.from('classes').select('teacher_id').eq('id', classId).single()
  const isTeacher = profile?.role === 'teacher' && cls?.teacher_id === user.id

  // ── Teacher view ──────────────────────────────────────────────
  if (isTeacher) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const [{ data: members }, { data: todayRecords }] = await Promise.all([
      supabase.from('class_members').select('*, student:profiles(*)').eq('class_id', classId).eq('status', 'approved').order('joined_at'),
      supabase.from('attendance').select('*').eq('class_id', classId).eq('attendance_date', today),
    ])

    const students = ((members as (ClassMember & { student: Profile })[]) || []).map(m => m.student).filter(Boolean)

    return (
      <div className="space-y-5 animate-fade-up">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Attendance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mark and review daily attendance for your students</p>
        </div>
        <AttendanceMarker
          classId={classId}
          students={students as Profile[]}
          initialDate={today}
          initialRecords={(todayRecords as Attendance[]) || []}
        />
      </div>
    )
  }

  // ── Student view ──────────────────────────────────────────────
  const { data: records } = await supabase
    .from('attendance')
    .select('*')
    .eq('class_id', classId)
    .eq('student_id', user.id)
    .order('attendance_date', { ascending: false })

  const list = (records as Attendance[]) || []
  const counts = { present: 0, absent: 0, late: 0, excused: 0 } as Record<AttendanceStatus, number>
  list.forEach(r => { counts[r.status]++ })
  const total = list.length
  const presentRate = total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : null

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Attendance</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your attendance record for this class</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(STATUS_META) as AttendanceStatus[]).map(s => {
          const M = STATUS_META[s]
          return (
            <Card key={s} className="border-0 shadow-sm dark:bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <M.icon className={`h-5 w-5 ${M.cls}`} />
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{counts[s]}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{M.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {presentRate !== null && (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall attendance rate</span>
            <span className={`text-lg font-bold ${presentRate >= 75 ? 'text-green-600 dark:text-green-400' : presentRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
              {presentRate}%
            </span>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="border-0 shadow-sm dark:bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-indigo-500" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No attendance recorded yet</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/8">
              {list.map(r => {
                const M = STATUS_META[r.status]
                return (
                  <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {format(parseISO(r.attendance_date), 'EEEE, MMM d, yyyy')}
                    </span>
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${M.cls}`}>
                      <M.icon className="h-4 w-4" />
                      {M.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
