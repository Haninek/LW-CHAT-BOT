import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import { ChatMessage } from '../state/useAppStore'

interface ChatWindowProps {
  messages: ChatMessage[]
  isTyping?: boolean
}

export function ChatWindow({ messages, isTyping }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <AnimatePresence>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          >
            <MessageBubble message={message} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Typing Indicator */}
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex justify-start"
        >
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm max-w-xs">
            <div className="flex space-x-1">
              <motion.div
                className="w-2 h-2 bg-slate-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-slate-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-slate-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {messages.length === 0 && !isTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mb-4 shadow-glow">
            <span className="text-white text-xl font-bold">💬</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Start a conversation
          </h3>
          <p className="text-slate-500 max-w-sm">
            Type a message below to begin chatting with the LendWisely assistant
          </p>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}