'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Exam } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Pencil, Loader2 } from 'lucide-react'

const EXAM_TYPES = ['CT', 'Mid', 'Final', 'Quiz', 'Other'] as const

export function EditExamDialog({ exam }: { exam: Exam }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(exam.name)
  const [examType, setExamType] = useState(exam.exam_type)
  const [examDate, setExamDate] = useState(exam.exam_date || '')
  const [totalMarks, setTotalMarks] = useState(exam.total_marks?.toString() || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('exams')
      .update({
        name,
        exam_type: examType,
        exam_date: examDate || null,
        total_marks: totalMarks ? parseInt(totalMarks) : null,
      })
      .eq('id', exam.id)

    if (error) toast.error(error.message)
    else {
      toast.success('Exam updated!')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0">
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Exam</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Exam Type</Label>
            <Select value={examType} onValueChange={v => v && setExamType(v as Exam['exam_type'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Exam Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Marks</Label>
              <Input type="number" min="0" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
            </div>
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
