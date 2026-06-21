'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  const tabs = [
    { href: base,                icon: LayoutGrid,    label: 'Overview'  },
    { href: `${base}/calendar`,  icon: Calendar,      label: 'Calendar'  },
    { href: `${base}/notes`,     icon: FileText,      label: 'Notes'     },
    { href: `${base}/files`,     icon: FolderOpen,    label: 'Files'     },
    { href: `${base}/chat`,      icon: MessageCircle, label: 'Chat'      },
    { href: `${base}/syllabus`,  icon: BookOpen,      label: 'Syllabus'  },
    { href: `${base}/homework`,  icon: ClipboardList, label: 'Homework'  },
    { href: `${base}/exams`,     icon: GraduationCap, label: 'Exams'     },
    { href: `${base}/progress`,  icon: TrendingUp,    label: 'Progress'  },
    { href: `${base}/attendance`, icon: CalendarCheck, label: 'Attendance' },
    { href: `${base}/messages`,  icon: Mail,          label: 'Messages', badge: unreadMessages },
    ...(isTeacher ? [{ href: `${base}/members`, icon: Users, label: 'Members' }] : []),
  ]

  return (
    <div>
      {/* ── Class header ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/classes"
          className="flex-shrink-0 p-2 -ml-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
          aria-label="Back to classes"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
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
        {/* Fade hint on right */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex overflow-x-auto scrollbar-hide gap-0.5 px-4 sm:px-5 md:px-7 border-b border-gray-200/80 dark:border-white/8">
          {tabs.map(tab => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== base && pathname.startsWith(tab.href))

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-3 pt-2 pb-2.5 text-[11px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150 min-w-[56px]',
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                )}
              >
                <div className="relative">
                  <tab.icon className={cn(
                    'h-[17px] w-[17px] transition-transform duration-150',
                    isActive && 'scale-110'
                  )} />
                  {'badge' in tab && (tab.badge ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {(tab.badge ?? 0) > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
