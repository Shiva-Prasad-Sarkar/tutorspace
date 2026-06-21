'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DailyFeedback } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Pencil, Loader2 } from 'lucide-react'

export function EditFeedbackDialog({ feedback }: { feedback: DailyFeedback }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(feedback.feedback_date)
  const [content, setContent] = useState(feedback.content)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('daily_feedback')
      .update({ feedback_date: date, content })
      .eq('id', feedback.id)

    if (error) toast.error(error.message)
    else {
      toast.success('Feedback updated!')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="p-1 rounded text-gray-400 hover:text-indigo-500 transition-colors">
        <Pencil className="h-3 w-3" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Feedback</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Feedback *</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={5} required />
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
