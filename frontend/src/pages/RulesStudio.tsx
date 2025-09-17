import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Settings, Play, Pause, Edit, Trash2, Copy } from 'lucide-react'
import { useAppStore } from '../state/useAppStore'

export default function RulesStudio() {
  const { rules, templates, persona, setPersona, addRule, updateRule, deleteRule } = useAppStore()
  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'persona'>('rules')

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rules Studio</h1>
          <p className="text-slate-600 mt-1">
            Configure conversation rules, templates, and persona settings
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-card border border-white/50 p-1">
        <div className="flex space-x-1">
          {[
            { id: 'rules', label: 'Rules', count: rules.length },
            { id: 'templates', label: 'Templates', count: templates.length },
            { id: 'persona', label: 'Persona', count: 1 }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {activeTab === 'rules' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {rules.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No rules configured</h3>
                  <p className="text-slate-500 mb-4">Create your first rule to start automating conversations</p>
                  <button className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Rule
                  </button>
                </div>
              ) : (
                rules.map((rule, index) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card group hover:shadow-card-hover"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium ${
                          rule.enabled 
                            ? 'bg-gradient-to-r from-success-500 to-success-600' 
                            : 'bg-gradient-to-r from-slate-400 to-slate-500'
                        }`}>
                          {rule.priority}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                          <p className="text-xs text-slate-500">
                            {rule.when.conditions.length} condition{rule.when.conditions.length !== 1 ? 's' : ''} • 
                            {rule.then.length} action{rule.then.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-slate-500 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                          className={`p-2 rounded-lg transition-colors ${
                            rule.enabled
                              ? 'text-success-600 hover:text-success-700 hover:bg-success-50'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {rule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 text-slate-500 hover:text-accent-600 rounded-lg hover:bg-accent-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-slate-700">When: </span>
                        <span className="text-slate-600">
                          {rule.when.conditions.map((condition, i) => (
                            <span key={i}>
                              {i > 0 && ` ${rule.when.op} `}
                              {condition.field} {condition.op} {condition.value}
                            </span>
                          ))}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">Then: </span>
                        <span className="text-slate-600">
                          {rule.then.map(action => action.type).join(', ')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {templates.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-warning-500 to-warning-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Edit className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No templates created</h3>
                  <p className="text-slate-500 mb-4">Create message templates for automated responses</p>
                  <button className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Template
                  </button>
                </div>
              ) : (
                templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900">{template.name}</h3>
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-slate-500 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-slate-500 hover:text-accent-600 rounded-lg hover:bg-accent-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 font-mono">
                      {template.content}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'persona' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Chatbot Persona</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Communication Style
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['friendly', 'professional', 'concise'].map((style) => (
                      <motion.button
                        key={style}
                        onClick={() => setPersona({ ...persona, style: style as any })}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3 text-center rounded-lg border-2 transition-all duration-200 ${
                          persona.style === style
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium capitalize">{style}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reading Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['6th', '8th', '10th'].map((level) => (
                      <motion.button
                        key={level}
                        onClick={() => setPersona({ ...persona, readingLevel: level as any })}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3 text-center rounded-lg border-2 transition-all duration-200 ${
                          persona.readingLevel === level
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">{level} Grade</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Emoji Usage
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['low', 'medium', 'high'].map((emoji) => (
                      <motion.button
                        key={emoji}
                        onClick={() => setPersona({ ...persona, emoji: emoji as any })}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3 text-center rounded-lg border-2 transition-all duration-200 ${
                          persona.emoji === emoji
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium capitalize">{emoji}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h4 className="font-semibold text-slate-900 mb-3">Quick Stats</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Active Rules</span>
                <span className="font-medium text-slate-900">
                  {rules.filter(r => r.enabled).length}/{rules.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Templates</span>
                <span className="font-medium text-slate-900">{templates.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Style</span>
                <span className="font-medium text-slate-900 capitalize">{persona.style}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h4 className="font-semibold text-slate-900 mb-3">Common Variables</h4>
            <div className="space-y-2 text-sm">
              {[
                '{{firstName}}',
                '{{company}}', 
                '{{intakeLink}}',
                '{{avgMonthlyRevenue}}'
              ].map((variable) => (
                <motion.div
                  key={variable}
                  whileHover={{ scale: 1.02 }}
                  className="p-2 bg-slate-50 rounded font-mono text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  {variable}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}