'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExamMark } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Award, Loader2 } from 'lucide-react'

interface Props {
  examId: string
  classId: string
  totalMarks: number | null
  studentId: string
  studentName: string
  existing?: ExamMark | null
}

export function SetExamMarksDialog({ examId, classId, totalMarks, studentId, studentName, existing }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [marks, setMarks] = useState(existing?.marks_obtained?.toString() || '')
  const [remarks, setRemarks] = useState(existing?.remarks || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const marksNum = parseFloat(marks)
    if (isNaN(marksNum) || marksNum < 0) {
      toast.error('Enter a valid marks value')
      return
    }
    if (totalMarks && marksNum > totalMarks) {
      toast.error(`Marks cannot exceed ${totalMarks}`)
      return
    }
    setLoading(true)
    const supabase = createClient()

    const payload = {
      exam_id: examId,
      class_id: classId,
      student_id: studentId,
      marks_obtained: marksNum,
      remarks: remarks || null,
    }

    const { error } = existing
      ? await supabase.from('exam_marks').update({ marks_obtained: marksNum, remarks: remarks || null }).eq('id', existing.id)
      : await supabase.from('exam_marks').insert(payload)

    if (error) toast.error(error.message)
    else {
      toast.success('Marks saved!')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={existing
        ? 'flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline'
        : 'flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'
      }>
        <Award className="h-3.5 w-3.5 flex-shrink-0" />
        {existing ? `${existing.marks_obtained}${totalMarks ? `/${totalMarks}` : ''}` : 'Set marks'}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Marks for {studentName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>
              Marks Obtained {totalMarks ? `(out of ${totalMarks})` : ''}
              <span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              type="number" min="0" step="0.5"
              max={totalMarks ?? undefined}
              placeholder="e.g. 42"
              value={marks}
              onChange={e => setMarks(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks (optional)</Label>
            <Textarea
              placeholder="Any comment about this student's performance..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Marks
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
