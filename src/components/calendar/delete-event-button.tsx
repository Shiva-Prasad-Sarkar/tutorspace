'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this event?')) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
    if (error) toast.error(error.message)
    else { toast.success('Event deleted'); router.refresh() }
    setLoading(false)
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
