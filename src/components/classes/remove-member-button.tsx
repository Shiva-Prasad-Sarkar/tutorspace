'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserMinus, Loader2 } from 'lucide-react'

interface RemoveMemberButtonProps {
  membershipId: string
  studentName: string
}

export function RemoveMemberButton({ membershipId, studentName }: RemoveMemberButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    if (!confirm(`Remove ${studentName} from this class?`)) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('class_members').delete().eq('id', membershipId)
    if (error) toast.error(error.message)
    else { toast.success(`${studentName} removed`); router.refresh() }
    setLoading(false)
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
      title="Remove student"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
    </button>
  )
}
