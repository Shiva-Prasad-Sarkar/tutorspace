'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { MessageSquarePlus, Loader2 } from 'lucide-react'

interface Props {
  classId: string
  studentId: string
  studentName: string
  compact?: boolean
}

export function AddFeedbackDialog({ classId, studentId, studentName, compact }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await supabase.from('daily_feedback').insert({
      class_id: classId,
      student_id: studentId,
      teacher_id: user.id,
      feedback_date: date,
      content,
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Feedback added!')
      setOpen(false)
      setContent('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={compact
        ? 'p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors'
        : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 transition-colors'
      }>
        <MessageSquarePlus className="h-3.5 w-3.5" />
        {!compact && <span>Add Feedback</span>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback for {studentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Feedback *</Label>
            <Textarea
              placeholder={`Write feedback for ${studentName}...`}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Feedback
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
