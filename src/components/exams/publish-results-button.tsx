'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Globe, EyeOff, Loader2 } from 'lucide-react'

interface PublishResultsButtonProps {
  examId: string
  isPublished: boolean
}

export function PublishResultsButton({ examId, isPublished }: PublishResultsButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    const { error } = await supabase
      .from('exams')
      .update({ is_published: !isPublished })
      .eq('id', examId)
    if (error) toast.error(error.message)
    else {
      toast.success(isPublished ? 'Results hidden from students' : 'Results published to all students')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant="outline"
      size="sm"
      className={isPublished
        ? 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 hover:bg-red-50 dark:hover:bg-red-950'
        : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-950 hover:text-green-700 hover:border-green-300'
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPublished ? (
        <><Globe className="h-4 w-4 mr-1.5" />Published</>
      ) : (
        <><EyeOff className="h-4 w-4 mr-1.5" />Publish Results</>
      )}
    </Button>
  )
}
