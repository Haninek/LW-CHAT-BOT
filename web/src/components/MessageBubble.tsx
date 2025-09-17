import React from 'react'
import { motion } from 'framer-motion'
import { User, Bot, Clock } from 'lucide-react'
import { ChatMessage } from '../state/useAppStore'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === 'user'
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return (
    <div className={`flex items-end space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar (for bot messages) */}
      {!isUser && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0"
        >
          <Bot className="w-4 h-4 text-white" />
        </motion.div>
      )}

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-sm lg:max-w-md`}>
        {/* Message Bubble */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            delay: 0.05
          }}
          className={`message-bubble ${isUser ? 'message-user' : 'message-bot'} relative`}
        >
          {/* Message Content */}
          <div className="break-words">
            {message.content}
          </div>

          {/* Tail */}
          <div className={`absolute bottom-0 w-3 h-3 ${
            isUser 
              ? 'right-0 transform translate-x-1 translate-y-1 bg-gradient-to-r from-primary-500 to-primary-600' 
              : 'left-0 transform -translate-x-1 translate-y-1 bg-white border-l border-b border-slate-200'
          } rotate-45`} />
        </motion.div>

        {/* Timestamp */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`flex items-center text-xs text-slate-400 mt-1 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <Clock className="w-3 h-3 mx-1" />
          <span>{timestamp}</span>
        </motion.div>

        {/* Action Buttons (for bot messages with actions) */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 mt-3"
          >
            {message.actions.map((action, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary text-xs px-3 py-1 rounded-full"
              >
                {getActionLabel(action)}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Avatar (for user messages) */}
      {isUser && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-md flex-shrink-0"
        >
          <User className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </div>
  )
}

function getActionLabel(action: any): string {
  switch (action.type) {
    case 'askForStatements':
      return '📄 Upload Statements'
    case 'startPlaid':
      return '🏦 Connect Bank'
    case 'generateOffers':
      return '💰 View Offers'
    case 'scheduleFollowUp':
      return `📅 Follow up in ${action.days} days`
    default:
      return action.type
  }
}