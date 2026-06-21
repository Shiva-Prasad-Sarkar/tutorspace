'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import {
  BookOpen, LayoutDashboard, LogOut, Users, GraduationCap, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [accountOpen, setAccountOpen] = useState(false)

  const isTeacher = profile.role === 'teacher'

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  short: 'Home',     color: 'text-violet-500' },
    { href: '/classes',   icon: BookOpen,         label: 'My Classes', short: 'Classes',  color: 'text-indigo-500' },
    ...(isTeacher ? [{ href: '/students', icon: Users, label: 'Students', short: 'Students', color: 'text-blue-500' }] : []),
  ]

  const initials = profile.full_name
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  async function handleSignOut() {
    setAccountOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  const avatarGradient = isTeacher
    ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
    : 'bg-gradient-to-br from-emerald-500 to-teal-600'

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white dark:bg-[#0c0c14] border-r border-gray-200/80 dark:border-white/6 h-screen fixed left-0 top-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md glow-indigo flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 dark:text-white text-[17px] tracking-tight leading-none">TutorSpace</span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 tracking-widest uppercase mt-0.5 leading-none">
              {isTeacher ? 'Teacher Portal' : 'Student Portal'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px] flex-shrink-0', active ? 'text-white' : item.color)} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 flex-shrink-0 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/6">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white', avatarGradient)}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-tight">{profile.full_name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{profile.role}</p>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 glass border-b border-gray-200/60 dark:border-white/6 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white tracking-tight text-[15px]">TutorSpace</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-gray-200/60 dark:border-white/6 flex items-stretch h-[58px] pb-[env(safe-area-inset-bottom)]">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors',
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <div className={cn('px-3 py-1 rounded-full transition-all duration-150', active && 'bg-indigo-50 dark:bg-indigo-950/60')}>
                <item.icon className={cn('h-[19px] w-[19px] transition-transform duration-150', active && 'scale-110')} />
              </div>
              <span>{item.short}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setAccountOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors',
            accountOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
          )}
        >
          <div className="px-3 py-1 rounded-full">
            <div className={cn('w-[19px] h-[19px] rounded-full flex items-center justify-center text-[9px] font-bold text-white', avatarGradient)}>
              {initials}
            </div>
          </div>
          <span>Account</span>
        </button>
      </nav>

      {/* ── Account bottom sheet ──────────────────────────────── */}
      <div
        onClick={() => setAccountOpen(false)}
        className={cn(
          'lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          accountOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />
      <div
        className={cn(
          'lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#0c0c14] rounded-t-3xl shadow-2xl border-t border-gray-200/60 dark:border-white/8 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pb-[env(safe-area-inset-bottom)]',
          accountOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/15" />
        </div>

        <div className="px-5 pt-3 pb-6 space-y-4">
          {/* Profile */}
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-shrink-0', avatarGradient)}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 dark:text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{profile.email}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-white/8" />

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3.5 w-full rounded-2xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}
