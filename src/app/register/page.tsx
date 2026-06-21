'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { GraduationCap, Loader2, School, ArrowLeft, Zap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<'teacher' | 'student' | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [teacherCode, setTeacherCode] = useState('')
  const [joinMethod, setJoinMethod] = useState<'invite' | 'request'>('invite')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (role === 'teacher') {
      if (teacherCode !== process.env.NEXT_PUBLIC_TEACHER_SIGNUP_CODE) {
        toast.error('Invalid teacher registration code')
        setLoading(false)
        return
      }
    }

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })

    if (error) {
      console.error('Supabase signUp error:', error)
      toast.error(error.message || error.name || 'Registration failed. Please try again.')
      setLoading(false)
      return
    }

    // Student joining a class via code — instant join or pending request
    if (role === 'student' && inviteCode.trim()) {
      const { data: classData } = await supabase
        .rpc('get_class_by_invite_code', { p_invite_code: inviteCode.trim() })

      const cls = classData?.[0]
      if (cls) {
        const status = joinMethod === 'invite' ? 'approved' : 'pending'
        await supabase.from('class_members').insert({
          class_id: cls.id,
          student_id: data.user!.id,
          status,
        })
        toast.success(joinMethod === 'invite'
          ? `Account created! You've joined "${cls.name}". Please sign in.`
          : `Account created! Your request to join "${cls.name}" is pending approval. Please sign in.`
        )
      } else {
        toast.warning('Account created, but that invite code wasn\'t found. You can join a class after signing in.')
      }
    } else {
      toast.success('Account created! Please sign in.')
    }

    router.push('/login')
    setLoading(false)
  }

  // ─── Role picker ──────────────────────────────────────────────
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">TutorSpace</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Create your account</p>
          </div>

          <p className="text-center text-gray-600 dark:text-gray-300 mb-5 font-medium text-sm">I am a…</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setRole('teacher')}
              className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-card rounded-2xl border-2 border-transparent dark:border-white/5 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 p-4 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <School className="h-7 w-7" />
              </div>
              <span className="font-semibold text-gray-800 dark:text-gray-100">Teacher</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 text-center">Manage classes, add content, grade students</span>
            </button>
            <button
              onClick={() => setRole('student')}
              className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-card rounded-2xl border-2 border-transparent dark:border-white/5 hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-md transition-all group"
            >
              <div className="bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 p-4 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <GraduationCap className="h-7 w-7" />
              </div>
              <span className="font-semibold text-gray-800 dark:text-gray-100">Student</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 text-center">Join classes, submit work, chat with teacher</span>
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  // ─── Registration form ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Create account</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Registering as {role === 'teacher' ? 'Teacher' : 'Student'}
          </p>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required
                className="h-11 rounded-xl bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                className="h-11 rounded-xl bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="h-11 rounded-xl bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10" />
            </div>

            {role === 'teacher' && (
              <div className="space-y-1.5">
                <Label htmlFor="teacherCode">Teacher Registration Code</Label>
                <Input id="teacherCode" placeholder="Enter the code provided" value={teacherCode} onChange={e => setTeacherCode(e.target.value)} required
                  className="h-11 rounded-xl bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10" />
              </div>
            )}

            {role === 'student' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJoinMethod('invite')}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                      joinMethod === 'invite'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-300'
                    )}
                  >
                    <Zap className="h-4 w-4" /> Join instantly
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinMethod('request')}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                      joinMethod === 'request'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-300'
                    )}
                  >
                    <Clock className="h-4 w-4" /> Request to join
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inviteCode">Class Invite Code</Label>
                  <Input id="inviteCode" placeholder="e.g. ABC123" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    className="h-11 rounded-xl bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 font-mono tracking-widest" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {joinMethod === 'invite'
                      ? 'You\'ll join the class immediately. Leave blank to join a class later.'
                      : 'Your teacher will approve your request before you get access. Leave blank to join later.'}
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-sm shadow-indigo-500/20 mt-1" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>

            <div className="flex justify-between items-center w-full pt-1">
              <button type="button" onClick={() => setRole(null)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <Link href="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Sign in instead
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
