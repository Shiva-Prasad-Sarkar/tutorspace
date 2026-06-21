'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

const EXAM_TYPES = ['CT', 'Mid', 'Final', 'Quiz', 'Other'] as const

export function AddExamDialog({ classId }: { classId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [examType, setExamType] = useState<string>('CT')
  const [examDate, setExamDate] = useState('')
  const [totalMarks, setTotalMarks] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await supabase.from('exams').insert({
      class_id: classId,
      name,
      exam_type: examType,
      exam_date: examDate || null,
      total_marks: totalMarks ? parseInt(totalMarks) : null,
      created_by: user.id,
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Exam created!')
      setOpen(false)
      setName(''); setExamType('CT'); setExamDate(''); setTotalMarks('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors">
        <Plus className="h-4 w-4" /> Add Exam
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Exam</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Exam Type</Label>
            <Select value={examType} onValueChange={v => v && setExamType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Exam Name *</Label>
            <Input placeholder="e.g. CT-1, Mid Term, Final Exam" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Marks</Label>
              <Input type="number" min="0" placeholder="100" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Exam
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
