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
    <div className="flex min-h-screen bg-background">
      <Sidebar profile={profile as Profile} />
      <main className="flex-1 lg:pl-60 overflow-auto pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-5 md:p-7 max-w-6xl mx-auto pb-24 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  )
}
