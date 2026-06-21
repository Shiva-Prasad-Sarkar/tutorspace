'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function CopyInviteButton({ code, iconOnly }: { code: string; iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success(`Invite code ${code} copied!`)
    setTimeout(() => setCopied(false), 2000)
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all"
        title={`Copy invite code: ${code}`}
      >
        {copied
          ? <Check className="h-4 w-4 text-emerald-500" />
          : <Copy className="h-4 w-4" />}
      </button>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
        copied
          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
          : 'bg-gray-100 dark:bg-white/8 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 text-gray-700 dark:text-gray-300'
      )}
      title="Copy invite code"
    >
      {copied
        ? <Check className="h-4 w-4 text-emerald-500" />
        : <Copy className="h-4 w-4" />}
      <span className="font-mono tracking-widest">{code}</span>
    </button>
  )
}
