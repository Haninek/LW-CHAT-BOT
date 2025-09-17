import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Smile, Paperclip } from 'lucide-react'

interface ChatComposerProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatComposer({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: ChatComposerProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t border-slate-200/50 bg-white/80 backdrop-blur-sm p-4"
    >
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Message Input */}
        <div className={`flex-1 relative transition-all duration-200 ${
          isFocused ? 'ring-2 ring-primary-500 ring-opacity-50' : ''
        }`}>
          <div className="relative bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 pr-20 resize-none border-0 focus:outline-none focus:ring-0 placeholder-slate-400 text-slate-900 bg-transparent"
              style={{ 
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />
            
            {/* Action Buttons */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Smile className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Send Button */}
        <motion.button
          type="submit"
          disabled={!message.trim() || disabled}
          whileHover={{ scale: message.trim() ? 1.05 : 1 }}
          whileTap={{ scale: message.trim() ? 0.95 : 1 }}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
            message.trim() && !disabled
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg hover:shadow-primary-500/25'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </form>

      {/* Character Counter */}
      {message.length > 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-400 mt-2 text-right"
        >
          {message.length}/500
        </motion.div>
      )}
    </motion.div>
  )
}