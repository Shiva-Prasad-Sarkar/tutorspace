'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'

export function AddQuestionDialog({ examId, nextNumber }: { examId: string; nextNumber: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(nextNumber.toString())
  const [questionText, setQuestionText] = useState('')
  const [solutionText, setSolutionText] = useState('')
  const [marks, setMarks] = useState('')
  const [loading, setLoading] = useState(false)

  function resetAndClose() {
    setOpen(false)
    setQuestionNumber((nextNumber + 1).toString())
    setQuestionText(''); setSolutionText(''); setMarks('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('exam_questions').insert({
      exam_id: examId,
      question_number: parseInt(questionNumber),
      question_text: questionText,
      solution_text: solutionText || null,
      marks: marks ? parseInt(marks) : null,
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Question added!')
      resetAndClose()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors">
        <Plus className="h-4 w-4" /> Add Question
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Q. No *</Label>
              <Input
                type="number" min="1"
                value={questionNumber}
                onChange={e => setQuestionNumber(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Marks</Label>
              <Input type="number" min="0" placeholder="e.g. 10" value={marks} onChange={e => setMarks(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Question *</Label>
            <Textarea
              placeholder="Write the question here..."
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Solution / Answer</Label>
            <Textarea
              placeholder="Write the solution or model answer here..."
              value={solutionText}
              onChange={e => setSolutionText(e.target.value)}
              rows={5}
            />
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Question
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
