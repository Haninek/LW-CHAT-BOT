import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Settings, Play, Edit, Trash2, GripVertical, Save, Eye, EyeOff, Link } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../state/useAppStore'
import { Rule, Condition, Action, FieldId } from '../types'
import { fieldRegistry } from '../lib/fieldRegistry'
import { v4 as uuidv4 } from 'uuid'
import { apiClient } from '../lib/api'

// Sortable Rule Component
const SortableRule: React.FC<{ 
  rule: Rule, 
  isEditing: boolean, 
  onEdit: (rule: Rule) => void, 
  onToggle: (rule: Rule) => void, 
  onDelete: (ruleId: string) => void 
}> = ({ rule, isEditing, onEdit, onToggle, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isEditing 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onEdit(rule)}
    >
      <div className="flex items-center gap-3">
        <button 
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing text-gray-400"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{rule.name}</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              Priority: {rule.priority}
            </span>
            {rule.enabled ? (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Enabled
              </span>
            ) : (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                Disabled
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            When: {rule.when.kind} | Then: {rule.then.length} actions
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(rule)
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {rule.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(rule.id)
            }}
            className="p-1 hover:bg-red-100 rounded"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

const RulesStudio: React.FC = () => {
  const {
    rules,
    templates,
    persona,
    setRules,
    setTemplates,
    setPersona,
    addRule,
    updateRule,
    deleteRule,
    reorderRules
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'persona'>('rules')
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [showJSON, setShowJSON] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Visual condition builder state  
  const [conditionType, setConditionType] = useState<'equals' | 'missingAny' | 'expiredAny' | 'notExpiredAll' | 'and' | 'or'>('equals')
  const [conditionField, setConditionField] = useState('')
  const [conditionValue, setConditionValue] = useState('')
  const [selectedFields, setSelectedFields] = useState<FieldId[]>([])

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = rules.findIndex(rule => rule.id === active.id)
      const newIndex = rules.findIndex(rule => rule.id === over.id)
      
      const reorderedRules = arrayMove(rules, oldIndex, newIndex)
      
      // Update priorities to match new order
      const updatedRules = reorderedRules.map((rule, index) => ({
        ...rule,
        priority: index + 1
      }))
      
      setRules(updatedRules)
    }
  }

  const handleCreateRule = () => {
    const newRule: Rule = {
      id: uuidv4(),
      name: 'New Rule',
      enabled: true,
      priority: rules.length + 1,
      when: { kind: 'equals', field: 'merchant.status', value: 'new' },
      then: [{ type: 'message', templateId: 'intake_welcome' }]
    }
    addRule(newRule)
    setEditingRule(newRule)
    updateJsonFromRule(newRule)
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    updateJsonFromRule(rule)
  }

  const updateJsonFromRule = (rule: Rule) => {
    setJsonText(JSON.stringify(rule, null, 2))
  }

  const handleSaveRule = () => {
    if (!editingRule) return

    try {
      if (showJSON) {
        // Save from JSON
        const updatedRule = JSON.parse(jsonText)
        updateRule(editingRule.id, updatedRule)
      } else {
        // Save from visual builder
        const condition = buildCondition()
        const actions = buildActions()
        updateRule(editingRule.id, {
          ...editingRule,
          when: condition,
          then: actions
        })
      }
      setEditingRule(null)
    } catch (error) {
      alert('Invalid JSON format')
    }
  }

  const buildCondition = (): Condition => {
    switch (conditionType) {
      case 'equals':
        return { kind: 'equals', field: conditionField, value: conditionValue }
      case 'missingAny':
        return { kind: 'missingAny', fields: selectedFields }
      case 'expiredAny':
        return { kind: 'expiredAny', fields: selectedFields }
      case 'notExpiredAll':
        return { kind: 'notExpiredAll', fields: selectedFields }
      default:
        return { kind: 'equals', field: 'merchant.status', value: 'new' }
    }
  }

  const buildActions = (): Action[] => {
    return [{ type: 'message', templateId: 'intake_welcome' }]
  }

  const handleSyncToServer = async () => {
    setIsSaving(true)
    try {
      const result = await apiClient.saveRules(rules)
      if (result.success) {
        alert('Rules synced to server successfully!')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Sync failed - using localStorage only')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleRule = (rule: Rule) => {
    updateRule(rule.id, { ...rule, enabled: !rule.enabled })
  }

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteRule(ruleId)
      if (editingRule?.id === ruleId) {
        setEditingRule(null)
      }
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rules Studio</h1>
            <p className="text-gray-600">Create and manage conversation rules, templates, and persona</p>
          </div>
          <div className="flex items-center gap-3">
            <RouterLink to="/simulate">
              <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2">
                <Play className="w-4 h-4" />
                Test in Simulator
              </button>
            </RouterLink>
            <button
              onClick={handleSyncToServer}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Link className="w-4 h-4" />
              {isSaving ? 'Syncing...' : 'Sync to Server'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b">
            {[
              { id: 'rules', label: 'Rules', count: rules.length },
              { id: 'templates', label: 'Templates', count: templates.length },
              { id: 'persona', label: 'Persona' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} {tab.count !== undefined && <span className="ml-1 text-sm">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'rules' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rules List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Rules</h3>
                    <button
                      onClick={handleCreateRule}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Rule
                    </button>
                  </div>

                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={rules.map(rule => rule.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {rules
                          .sort((a, b) => a.priority - b.priority)
                          .map((rule) => (
                            <SortableRule
                              key={rule.id}
                              rule={rule}
                              isEditing={editingRule?.id === rule.id}
                              onEdit={handleEditRule}
                              onToggle={handleToggleRule}
                              onDelete={handleDeleteRule}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                    
                    {rules.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No rules created yet. Click "Add Rule" to get started.
                      </div>
                    )}
                  </div>
                </div>

                {/* Rule Editor */}
                <div className="space-y-4">
                  {editingRule ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Edit Rule</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowJSON(!showJSON)}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
                          >
                            {showJSON ? 'Visual' : 'JSON'}
                          </button>
                          <button
                            onClick={handleSaveRule}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {showJSON ? (
                        <div>
                          <textarea
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                            placeholder="Edit rule JSON..."
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Basic Info */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rule Name
                            </label>
                            <input
                              type="text"
                              value={editingRule.name}
                              onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Priority
                              </label>
                              <input
                                type="number"
                                value={editingRule.priority}
                                onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={editingRule.enabled ? 'enabled' : 'disabled'}
                                onChange={(e) => setEditingRule({ ...editingRule, enabled: e.target.value === 'enabled' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="enabled">Enabled</option>
                                <option value="disabled">Disabled</option>
                              </select>
                            </div>
                          </div>

                          {/* Condition Builder */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              When (Condition)
                            </label>
                            <div className="space-y-2">
                              <select
                                value={conditionType}
                                onChange={(e) => setConditionType(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="equals">Field Equals</option>
                                <option value="missingAny">Any Field Missing</option>
                                <option value="expiredAny">Any Field Expired</option>
                                <option value="notExpiredAll">All Fields Not Expired</option>
                              </select>

                              {conditionType === 'equals' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Field (e.g., merchant.status)"
                                    value={conditionField}
                                    onChange={(e) => setConditionField(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Value (e.g., existing)"
                                    value={conditionValue}
                                    onChange={(e) => setConditionValue(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md"
                                  />
                                </div>
                              )}

                              {(conditionType === 'missingAny' || conditionType === 'expiredAny' || conditionType === 'notExpiredAll') && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Fields
                                  </label>
                                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                    {Object.keys(fieldRegistry).map(fieldId => (
                                      <label key={fieldId} className="flex items-center text-sm">
                                        <input
                                          type="checkbox"
                                          checked={selectedFields.includes(fieldId as FieldId)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedFields([...selectedFields, fieldId as FieldId])
                                            } else {
                                              setSelectedFields(selectedFields.filter(f => f !== fieldId))
                                            }
                                          }}
                                          className="mr-2"
                                        />
                                        {fieldRegistry[fieldId as FieldId]?.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Then (Actions)
                            </label>
                            <div className="text-sm text-gray-500">
                              Action builder coming soon. Use JSON editor for complex actions.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Select a rule to edit or create a new one
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Message Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium">{template.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'persona' && (
              <div className="max-w-2xl space-y-6">
                <h3 className="text-lg font-semibold">Persona Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style
                    </label>
                    <select
                      value={persona.style}
                      onChange={(e) => setPersona({ ...persona, style: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="friendly">Friendly</option>
                      <option value="professional">Professional</option>
                      <option value="concise">Concise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reading Level
                    </label>
                    <select
                      value={persona.reading}
                      onChange={(e) => setPersona({ ...persona, reading: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="6th">6th Grade</option>
                      <option value="8th">8th Grade</option>
                      <option value="10th">10th Grade</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emoji Level
                    </label>
                    <select
                      value={persona.emoji}
                      onChange={(e) => setPersona({ ...persona, emoji: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="low">Low</option>
                      <option value="med">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Preview</h4>
                  <p className="text-sm text-gray-600">
                    Current persona will affect how message templates are rendered in the intake simulator.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RulesStudio