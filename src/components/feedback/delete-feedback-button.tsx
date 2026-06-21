'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteFeedbackButton({ feedbackId }: { feedbackId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this feedback?')) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('daily_feedback').delete().eq('id', feedbackId)
    if (error) toast.error(error.message)
    else { toast.success('Feedback deleted'); router.refresh() }
    setLoading(false)
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors">
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
    </button>
  )
}
