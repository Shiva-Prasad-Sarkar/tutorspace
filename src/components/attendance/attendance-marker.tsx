'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance, AttendanceStatus, Profile } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

const STATUSES: { key: AttendanceStatus; label: string; short: string; active: string; idle: string }[] = [
  { key: 'present', label: 'Present', short: 'P', active: 'bg-green-600 text-white border-green-600',  idle: 'text-green-600 dark:text-green-400 border-gray-200 dark:border-white/10 hover:border-green-400' },
  { key: 'late',    label: 'Late',    short: 'L', active: 'bg-amber-500 text-white border-amber-500',  idle: 'text-amber-600 dark:text-amber-400 border-gray-200 dark:border-white/10 hover:border-amber-400' },
  { key: 'absent',  label: 'Absent',  short: 'A', active: 'bg-red-500 text-white border-red-500',      idle: 'text-red-500 dark:text-red-400 border-gray-200 dark:border-white/10 hover:border-red-400' },
  { key: 'excused', label: 'Excused', short: 'E', active: 'bg-blue-600 text-white border-blue-600',    idle: 'text-blue-600 dark:text-blue-400 border-gray-200 dark:border-white/10 hover:border-blue-400' },
]

interface AttendanceMarkerProps {
  classId: string
  students: Profile[]
  initialDate: string
  initialRecords: Attendance[]
}

export function AttendanceMarker({ classId, students, initialDate, initialRecords }: AttendanceMarkerProps) {
  const [date, setDate] = useState(initialDate)
  const [records, setRecords] = useState<Map<string, AttendanceStatus>>(
    new Map(initialRecords.map(r => [r.student_id, r.status]))
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [loadingDate, setLoadingDate] = useState(false)
  const supabase = createClient()

  async function changeDate(newDate: string) {
    setDate(newDate)
    setLoadingDate(true)
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('attendance_date', newDate)
    setRecords(new Map(((data as Attendance[]) || []).map(r => [r.student_id, r.status])))
    setLoadingDate(false)
  }

  async function mark(studentId: string, status: AttendanceStatus) {
    setSavingId(studentId)
    // optimistic
    setRecords(prev => new Map(prev).set(studentId, status))

    const { error } = await supabase
      .from('attendance')
      .upsert(
        { class_id: classId, student_id: studentId, attendance_date: date, status },
        { onConflict: 'class_id,student_id,attendance_date' }
      )

    if (error) {
      toast.error('Could not save: ' + error.message)
    }
    setSavingId(null)
  }

  async function markAll(status: AttendanceStatus) {
    if (students.length === 0) return
    const next = new Map(records)
    students.forEach(s => next.set(s.id, status))
    setRecords(next)
    startTransition(async () => {
      const rows = students.map(s => ({ class_id: classId, student_id: s.id, attendance_date: date, status }))
      const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'class_id,student_id,attendance_date' })
      if (error) toast.error('Could not save all: ' + error.message)
      else toast.success(`Marked all ${status}`)
    })
  }

  const marked = students.filter(s => records.has(s.id)).length

  return (
    <div className="space-y-4">
      {/* Date + bulk controls */}
      <Card className="border-0 shadow-sm dark:bg-card">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Date</label>
            <input
              type="date"
              value={date}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => changeDate(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/30 outline-none"
            />
            {loadingDate && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">{marked}/{students.length} marked</span>
            <button onClick={() => markAll('present')} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-green-200 dark:border-green-900/60 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors">
              All present
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Roster */}
      <Card className="border-0 shadow-sm dark:bg-card">
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="py-14 flex flex-col items-center text-center">
              <Users className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No approved students yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/8">
              {students.map(s => {
                const current = records.get(s.id)
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 sm:px-4">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {s.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 min-w-0 truncate">{s.full_name}</span>
                    {savingId === s.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                    <div className="flex gap-1 flex-shrink-0">
                      {STATUSES.map(st => (
                        <button
                          key={st.key}
                          onClick={() => mark(s.id, st.key)}
                          title={st.label}
                          className={cn(
                            'w-8 h-8 rounded-lg border text-xs font-bold transition-all',
                            current === st.key ? st.active : cn('bg-white dark:bg-white/5', st.idle)
                          )}
                        >
                          {st.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Tap P / L / A / E to mark each student. Changes save automatically for {format(parseISO(date), 'MMM d, yyyy')}.
      </p>
    </div>
  )
}
