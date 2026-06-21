'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect } from 'react'
import { Class } from '@/types'
import { cn } from '@/lib/utils'
import {
  LayoutGrid, Calendar, FileText, FolderOpen,
  MessageCircle, BookOpen, ClipboardList, Users, TrendingUp, ArrowLeft, GraduationCap, Mail, CalendarCheck
} from 'lucide-react'

interface ClassNavProps {
  cls: Class
  isTeacher: boolean
  classId: string
  unreadMessages?: number
}

export function ClassNav({ cls, isTeacher, classId, unreadMessages = 0 }: ClassNavProps) {
  const pathname = usePathname()
  const base = `/classes/${classId}`
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  const tabs = [
    { href: base,                 icon: LayoutGrid,    label: 'Overview'   },
    { href: `${base}/calendar`,   icon: Calendar,      label: 'Calendar'   },
    { href: `${base}/notes`,      icon: FileText,      label: 'Notes'      },
    { href: `${base}/files`,      icon: FolderOpen,    label: 'Files'      },
    { href: `${base}/chat`,       icon: MessageCircle, label: 'Chat'       },
    { href: `${base}/syllabus`,   icon: BookOpen,      label: 'Syllabus'   },
    { href: `${base}/homework`,   icon: ClipboardList, label: 'Homework'   },
    { href: `${base}/exams`,      icon: GraduationCap, label: 'Exams'      },
    { href: `${base}/progress`,   icon: TrendingUp,    label: 'Progress'   },
    { href: `${base}/attendance`, icon: CalendarCheck, label: 'Attendance' },
    { href: `${base}/messages`,   icon: Mail,          label: 'Messages', badge: unreadMessages },
    ...(isTeacher ? [{ href: `${base}/members`, icon: Users, label: 'Members' }] : []),
  ]

  // Keep the active tab in view (horizontal only — never moves the page vertically)
  useEffect(() => {
    const c = scrollRef.current
    const a = activeRef.current
    if (c && a) {
      const target = a.offsetLeft - c.clientWidth / 2 + a.clientWidth / 2
      c.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    }
  }, [pathname])

  return (
    <div>
      {/* ── Class header ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-3">
        <Link
          href="/classes"
          className="flex-shrink-0 p-2 -ml-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
          aria-label="Back to classes"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm"
            style={{ backgroundColor: cls.color || '#4f46e5' }}
          >
            {cls.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate leading-tight tracking-tight">
              {cls.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{cls.subject}</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────── */}
      <div className="relative -mx-4 sm:-mx-5 md:-mx-7">
        {/* Fade hints (only show where there's more to scroll) */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-px w-6 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-px w-8 bg-gradient-to-l from-background to-transparent z-10" />

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide gap-0.5 px-3 sm:px-5 md:px-7 border-b border-gray-200/80 dark:border-white/8"
        >
          {tabs.map(tab => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== base && pathname.startsWith(tab.href))

            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={isActive ? activeRef : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-3 pt-2.5 pb-3 text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors duration-150 min-w-[60px] active:scale-95',
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                )}
              >
                <div className="relative">
                  <tab.icon className={cn('h-[19px] w-[19px] transition-transform duration-150', isActive && 'scale-110')} />
                  {'badge' in tab && (tab.badge ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-background">
                      {(tab.badge ?? 0) > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
