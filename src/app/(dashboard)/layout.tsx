import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http')) redirect('/login')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="flex min-h-[100dvh] bg-background overflow-x-clip">
      <Sidebar profile={profile as Profile} />
      <main className="flex-1 lg:pl-60 pt-14 lg:pt-0 min-h-[100dvh]">
        <div className="px-4 pt-3 pb-24 sm:px-5 sm:pt-4 md:px-7 md:pt-6 lg:pb-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
