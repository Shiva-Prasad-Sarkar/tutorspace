'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { LogIn, Loader2, Zap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'instant' | 'request'

export function JoinClassDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<Mode>('instant')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not signed in'); setLoading(false); return }

    // SECURITY DEFINER RPC bypasses class RLS — student has no membership yet
    const { data: classData, error: rpcErr } = await supabase
      .rpc('get_class_by_invite_code', { p_invite_code: code.trim() })

    if (rpcErr || !classData?.length) {
      toast.error('Invalid invite code. Check with your teacher.')
      setLoading(false)
      return
    }

    const cls = classData[0]

    const { data: existing } = await supabase
      .from('class_members')
      .select('id, status')
      .eq('class_id', cls.id)
      .eq('student_id', user.id)
      .maybeSingle()

    if (existing) {
      toast.info(existing.status === 'approved'
        ? `You're already a member of "${cls.name}".`
        : `Your request to join "${cls.name}" is already pending approval.`
      )
      setLoading(false)
      return
    }

    const status = mode === 'instant' ? 'approved' : 'pending'
    const { error: insertErr } = await supabase.from('class_members').insert({
      class_id: cls.id,
      student_id: user.id,
      status,
    })

    if (insertErr) {
      toast.error(insertErr.message)
    } else {
      toast.success(mode === 'instant'
        ? `Joined "${cls.name}"!`
        : `Request sent to "${cls.name}". You'll get access once the teacher approves.`
      )
      setOpen(false)
      setCode('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium px-4 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
        <LogIn className="h-4 w-4" /> Join a Class
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4 mt-2">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('instant')}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all',
                mode === 'instant'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-300'
              )}
            >
              <Zap className="h-4 w-4" />
              Join instantly
            </button>
            <button
              type="button"
              onClick={() => setMode('request')}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all',
                mode === 'request'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-300'
              )}
            >
              <Clock className="h-4 w-4" />
              Request to join
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Invite Code</Label>
            <Input
              placeholder="e.g. ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              autoFocus
              required
              className="font-mono tracking-widest"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {mode === 'instant'
                ? 'You\'ll get access to the class immediately.'
                : 'Your teacher will review and approve your request before you get access.'}
            </p>
          </div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === 'instant' ? 'Join Class' : 'Send Request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
