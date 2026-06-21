'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteFileButton({ fileId, fileUrl }: { fileId: string; fileUrl: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this file?')) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('class_files').delete().eq('id', fileId)
    if (error) toast.error(error.message)
    else { toast.success('File deleted'); router.refresh() }
    setLoading(false)
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-gray-400 hover:text-red-500 transition-colors">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
