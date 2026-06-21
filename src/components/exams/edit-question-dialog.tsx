'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExamQuestion } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Pencil, Loader2 } from 'lucide-react'

export function EditQuestionDialog({ question }: { question: ExamQuestion }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(question.question_number.toString())
  const [questionText, setQuestionText] = useState(question.question_text)
  const [solutionText, setSolutionText] = useState(question.solution_text || '')
  const [marks, setMarks] = useState(question.marks?.toString() || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('exam_questions')
      .update({
        question_number: parseInt(questionNumber),
        question_text: questionText,
        solution_text: solutionText || null,
        marks: marks ? parseInt(marks) : null,
      })
      .eq('id', question.id)

    if (error) toast.error(error.message)
    else {
      toast.success('Question updated!')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors">
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Q. No *</Label>
              <Input type="number" min="1" value={questionNumber} onChange={e => setQuestionNumber(e.target.value)} required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Marks</Label>
              <Input type="number" min="0" value={marks} onChange={e => setMarks(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Question *</Label>
            <Textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={4} required />
          </div>
          <div className="space-y-1.5">
            <Label>Solution / Answer</Label>
            <Textarea value={solutionText} onChange={e => setSolutionText(e.target.value)} rows={5} />
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
