'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, DirectMessage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Send, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface DmWindowProps {
  classId: string
  currentUser: Profile
  otherUser: Profile
  initialMessages: (DirectMessage & { sender: Profile })[]
}

type MsgRow = DirectMessage & { sender: Profile }

export function DmWindow({ classId, currentUser, otherUser, initialMessages }: DmWindowProps) {
  const [messages, setMessages] = useState<MsgRow[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channelKey = [currentUser.id, otherUser.id].sort().join('-')
    const channel = supabase
      .channel(`dm:${classId}:${channelKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const msg = payload.new as DirectMessage
          const ids = [currentUser.id, otherUser.id]
          if (!ids.includes(msg.sender_id) || !ids.includes(msg.receiver_id)) return
          const senderProfile = msg.sender_id === currentUser.id ? currentUser : otherUser
          setMessages(prev => {
            // Remove any temp optimistic messages, then add the confirmed real one
            const withoutTemps = prev.filter(m => !m.id.startsWith('temp-'))
            if (withoutTemps.some(m => m.id === msg.id)) return withoutTemps
            return [...withoutTemps, { ...msg, sender: senderProfile }]
          })
          // If the incoming message is addressed to me, mark it read immediately
          if (msg.receiver_id === currentUser.id && !msg.read_at) {
            supabase.from('direct_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', msg.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classId, currentUser.id, otherUser.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    const msgText = text.trim()
    if (!msgText || sending) return

    setSending(true)
    setSendError('')
    setText('')

    // Optimistic: show immediately with a temp id
    const tempId = `temp-${Date.now()}`
    const tempMsg: MsgRow = {
      id: tempId,
      class_id: classId,
      sender_id: currentUser.id,
      receiver_id: otherUser.id,
      content: msgText,
      read_at: null,
      created_at: new Date().toISOString(),
      sender: currentUser,
    }
    setMessages(prev => [...prev, tempMsg])

    const { error } = await supabase.from('direct_messages').insert({
      class_id: classId,
      sender_id: currentUser.id,
      receiver_id: otherUser.id,
      content: msgText,
    })

    if (error) {
      // Roll back the optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(msgText)
      const msg = error.message || 'Unknown error'
      setSendError(msg)
      toast.error('Message not sent: ' + msg)
      console.error('[DM send error]', error)
    }

    setSending(false)
  }

  function groupMessages() {
    const groups: { date: string; msgs: MsgRow[] }[] = []
    let lastDate = ''
    messages.forEach(m => {
      const d = format(new Date(m.created_at), 'MMMM d, yyyy')
      if (d !== lastDate) { groups.push({ date: d, msgs: [] }); lastDate = d }
      groups[groups.length - 1].msgs.push(m)
    })
    return groups
  }

  const groups = groupMessages()
  const isTeacher = currentUser.role === 'teacher'

  return (
    <div className="flex flex-col h-[calc(100dvh-16rem)] lg:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link
          href={isTeacher ? `/classes/${classId}/messages` : `/classes/${classId}`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-sm flex-shrink-0">
          {otherUser.full_name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{otherUser.full_name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{otherUser.role}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-white/8 p-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-3">✉️</div>
            <p className="font-medium text-gray-600 dark:text-gray-400">No messages yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start a private conversation with {otherUser.full_name}
            </p>
          </div>
        )}

        {groups.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{group.date}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/8" />
            </div>

            {group.msgs.map((msg, i) => {
              const isMe = msg.sender_id === currentUser.id
              const isTemp = msg.id.startsWith('temp-')
              const isSameAsPrev = i > 0 && group.msgs[i - 1].sender_id === msg.sender_id

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2 items-end',
                    isMe ? 'flex-row-reverse' : 'flex-row',
                    isSameAsPrev ? 'mt-0.5' : 'mt-3'
                  )}
                >
                  {!isSameAsPrev && !isMe && (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1">
                      {otherUser.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isSameAsPrev && !isMe && <div className="w-7 flex-shrink-0" />}

                  <div className={cn('max-w-[75%] sm:max-w-[65%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                    {!isSameAsPrev && (
                      <div className={cn('flex items-center gap-2 mb-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {isMe ? 'You' : otherUser.full_name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity',
                        isTemp && 'opacity-60',
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm border border-gray-100 dark:border-white/6'
                      )}
                    >
                      <p className="break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Inline error */}
      {sendError && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{sendError}</span>
          <button onClick={() => setSendError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Message ${otherUser.full_name}…`}
          className="flex-1 rounded-xl border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:placeholder-gray-500"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 flex-shrink-0"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}
