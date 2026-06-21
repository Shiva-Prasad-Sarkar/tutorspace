'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Submission, Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Star, Download, Loader2 } from 'lucide-react'

interface GradeSubmissionDialogProps {
  submission: Submission & { student: Profile }
}

export function GradeSubmissionDialog({ submission }: GradeSubmissionDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [grade, setGrade] = useState(submission.grade || '')
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('submissions')
      .update({ grade: grade || null, feedback: feedback || null })
      .eq('id', submission.id)
    if (error) toast.error(error.message)
    else { toast.success('Graded!'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1 rounded border border-gray-200 text-xs h-7 px-2 font-medium text-gray-600 hover:bg-gray-50 transition-colors">
        <Star className="h-3 w-3" />
        {submission.grade ? 'Edit Grade' : 'Grade'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade — {submission.student?.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Student submission */}
          {submission.content && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Student&apos;s answer:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.content}</p>
            </div>
          )}
          {submission.file_url && (
            <a
              href={submission.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
            >
              <Download className="h-4 w-4" />
              {submission.file_name || 'View submission file'}
            </a>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Input
                placeholder="e.g. A+, 85/100, Excellent"
                value={grade}
                onChange={e => setGrade(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Feedback</Label>
              <Textarea
                placeholder="Write feedback for the student..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Grade
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
