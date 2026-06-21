'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Loader2, Paperclip, X } from 'lucide-react'

export function AddAssignmentDialog({ classId }: { classId: string }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    let fileUrl: string | null = null
    let fileName: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${classId}/assignments/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('class-files').upload(path, file)
      if (uploadErr) { toast.error('File upload failed'); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('class-files').getPublicUrl(path)
      fileUrl = publicUrl
      fileName = file.name
    }

    const { error } = await supabase.from('assignments').insert({
      class_id: classId,
      title,
      description: description || null,
      due_date: dueDate || null,
      file_url: fileUrl,
      file_name: fileName,
      created_by: user.id,
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Assignment created!')
      setOpen(false)
      setTitle(''); setDescription(''); setDueDate(''); setFile(null)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors">
        <Plus className="h-4 w-4" /> Add Assignment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Assignment title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Instructions</Label>
            <Textarea placeholder="Describe the assignment..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Attachment (optional)</Label>
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
            Create Assignment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
