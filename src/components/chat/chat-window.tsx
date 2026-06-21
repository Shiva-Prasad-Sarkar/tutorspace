'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, ChatMessage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Send, Paperclip, Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ChatWindowProps {
  classId: string
  currentUser: Profile
  initialMessages: (ChatMessage & { sender: Profile })[]
}

export function ChatWindow({ classId, currentUser, initialMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${classId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `class_id=eq.${classId}` },
        async (payload) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', payload.new.sender_id)
            .single()
          setMessages(prev => [...prev, { ...payload.new, sender } as ChatMessage & { sender: Profile }])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() && !file) return
    setSending(true)

    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${classId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('chat-files').upload(path, file)
      if (uploadErr) { toast.error('File upload failed'); setSending(false); return }
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path)
      fileUrl = publicUrl
      fileName = file.name
      fileType = file.type
    }

    const { error } = await supabase.from('chat_messages').insert({
      class_id: classId,
      sender_id: currentUser.id,
      content: text.trim(),
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    })

    if (error) toast.error(error.message)
    else { setText(''); setFile(null) }
    setSending(false)
  }

  function groupMessages() {
    const groups: { date: string; msgs: typeof messages }[] = []
    let lastDate = ''
    messages.forEach(m => {
      const d = format(new Date(m.created_at), 'MMMM d, yyyy')
      if (d !== lastDate) { groups.push({ date: d, msgs: [] }); lastDate = d }
      groups[groups.length - 1].msgs.push(m)
    })
    return groups
  }

  const groups = groupMessages()

  return (
    <div className="flex flex-col h-[calc(100dvh-16rem)] lg:h-[calc(100vh-8rem)]">
      <div className="mb-3 hidden lg:block">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Class Chat</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Group chat — visible to all class members</p>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-white/8 p-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-3">💬</div>
            <p className="font-medium text-gray-600 dark:text-gray-400">No messages yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Be the first to say something!</p>
          </div>
        )}

        {groups.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{group.date}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
            {group.msgs.map((msg, i) => {
              const isMe = msg.sender_id === currentUser.id
              const isSameAsPrev = i > 0 && group.msgs[i - 1].sender_id === msg.sender_id
              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-2 items-end', isMe ? 'flex-row-reverse' : 'flex-row', isSameAsPrev ? 'mt-0.5' : 'mt-3')}
                >
                  {!isSameAsPrev && !isMe && (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1">
                      {msg.sender?.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isSameAsPrev && !isMe && <div className="w-7 flex-shrink-0" />}

                  <div className={cn('max-w-[75%] sm:max-w-[65%]', isMe ? 'items-end' : 'items-start', 'flex flex-col')}>
                    {!isSameAsPrev && (
                      <div className={cn('flex items-center gap-2 mb-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {isMe ? 'You' : msg.sender?.full_name}
                        </span>
                        {msg.sender?.role === 'teacher' && (
                          <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium">Teacher</span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm'
                      )}
                    >
                      {msg.content && <p className="break-words">{msg.content}</p>}
                      {msg.file_url && (
                        <div className="mt-2">
                          {msg.file_type?.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={msg.file_url}
                              alt={msg.file_name || 'image'}
                              className="max-w-48 max-h-48 rounded-lg object-cover cursor-pointer"
                              onClick={() => window.open(msg.file_url!, '_blank')}
                            />
                          ) : (
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'flex items-center gap-2 text-xs font-medium underline',
                                isMe ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'
                              )}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {msg.file_name}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 mt-2">
          <Paperclip className="h-4 w-4 text-indigo-500" />
          <span className="text-sm text-indigo-700 dark:text-indigo-300 flex-1 truncate">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-indigo-400 hover:text-indigo-600 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 mt-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors flex-shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
        />
        <Button
          type="submit"
          disabled={(!text.trim() && !file) || sending}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 flex-shrink-0"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  )
}
