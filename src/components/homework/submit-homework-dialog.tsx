'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Upload, Loader2, Paperclip, X, Send } from 'lucide-react'

interface SubmitHomeworkDialogProps {
  assignmentId: string
  classId: string
  assignmentTitle: string
}

export function SubmitHomeworkDialog({ assignmentId, classId, assignmentTitle }: SubmitHomeworkDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && !file) { toast.error('Add text or attach a file'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    let fileUrl: string | null = null
    let fileName: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${classId}/submissions/${assignmentId}/${user.id}_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('submissions').upload(path, file)
      if (uploadErr) { toast.error('Upload failed'); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(path)
      fileUrl = publicUrl
      fileName = file.name
    }

    const { error } = await supabase.from('submissions').insert({
      assignment_id: assignmentId,
      class_id: classId,
      student_id: user.id,
      content: content || null,
      file_url: fileUrl,
      file_name: fileName,
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Homework submitted!')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-indigo-700 transition-colors">
        <Send className="h-3.5 w-3.5" /> Submit Homework
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit: {assignmentTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Your Answer / Notes</Label>
            <Textarea
              placeholder="Write your answer here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Attach File (optional)</Label>
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                <button type="button" onClick={() => setFile(null)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                <Paperclip className="h-4 w-4 mr-2" /> Attach File
              </Button>
            )}
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
