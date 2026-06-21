'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LogOut, Loader2 } from 'lucide-react'

export function UnenrollButton({ classId, className }: { classId: string; className: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleUnenroll() {
    if (!confirm(`Leave "${className}"? You will need a new invite code to rejoin.`)) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', user.id)

    if (error) toast.error(error.message)
    else {
      toast.success(`Left "${className}"`)
      router.push('/classes')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleUnenroll}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 transition-colors"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      Leave Class
    </button>
  )
}
