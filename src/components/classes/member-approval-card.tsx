'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClassMember, Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MemberApprovalCardProps {
  membership: ClassMember & { student: Profile }
}

export function MemberApprovalCard({ membership }: MemberApprovalCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handleApprove() {
    setLoading('approve')
    const supabase = createClient()
    const { error } = await supabase
      .from('class_members')
      .update({ status: 'approved' })
      .eq('id', membership.id)
    if (error) toast.error(error.message)
    else { toast.success(`${membership.student.full_name} approved!`); router.refresh() }
    setLoading(null)
  }

  async function handleReject() {
    setLoading('reject')
    const supabase = createClient()
    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('id', membership.id)
    if (error) toast.error(error.message)
    else { toast.success('Request rejected'); router.refresh() }
    setLoading(null)
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-semibold">
          {membership.student.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{membership.student.full_name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{membership.student.email}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={!!loading}
          className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={!!loading}
          className="h-7 px-2 border-red-200 text-red-600 hover:bg-red-50 text-xs"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
