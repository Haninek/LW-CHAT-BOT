import { useAppStore, Client, Metrics, Rule, RuleAction, RuleCondition } from '@/state/useAppStore'
import { renderTemplate } from './templates'

export interface ChatContext {
  client: Client
  metrics?: Metrics
  lastBotAction?: string
}

export interface RuleEngineResult {
  actions: RuleAction[]
  message?: string
  tone?: 'friendly' | 'professional' | 'concise'
}

function evaluateCondition(condition: RuleCondition, context: ChatContext): boolean {
  const { client, metrics } = context
  
  switch (condition.field) {
    case 'client.status':
      return condition.op === 'eq' && client.status === condition.value
      
    case 'client.lastContactDays':
      switch (condition.op) {
        case 'gt': return client.lastContactDays > condition.value
        case 'lt': return client.lastContactDays < condition.value
        case 'ge': return client.lastContactDays >= condition.value
        case 'le': return client.lastContactDays <= condition.value
        default: return false
      }
      
    case 'consentOptedIn':
      return condition.op === 'eq' && client.consentOptedIn === condition.value
      
    case 'metrics.total_nsf_3m':
      if (!metrics) return false
      switch (condition.op) {
        case 'gt': return metrics.total_nsf_3m > condition.value
        case 'ge': return metrics.total_nsf_3m >= condition.value
        case 'lt': return metrics.total_nsf_3m < condition.value
        case 'le': return metrics.total_nsf_3m <= condition.value
        default: return false
      }
      
    case 'metrics.avg_monthly_revenue':
      if (!metrics) return false
      switch (condition.op) {
        case 'gt': return metrics.avg_monthly_revenue > condition.value
        case 'ge': return metrics.avg_monthly_revenue >= condition.value
        case 'lt': return metrics.avg_monthly_revenue < condition.value
        case 'le': return metrics.avg_monthly_revenue <= condition.value
        default: return false
      }
      
    case 'metrics.total_days_negative_3m':
      if (!metrics) return false
      switch (condition.op) {
        case 'gt': return metrics.total_days_negative_3m > condition.value
        case 'ge': return metrics.total_days_negative_3m >= condition.value
        case 'lt': return metrics.total_days_negative_3m < condition.value
        case 'le': return metrics.total_days_negative_3m <= condition.value
        default: return false
      }
      
    default:
      return false
  }
}

function evaluateRule(rule: Rule, context: ChatContext): boolean {
  if (!rule.enabled) return false
  
  const { op, conditions } = rule.when
  
  if (op === 'AND') {
    return conditions.every(condition => evaluateCondition(condition, context))
  } else {
    return conditions.some(condition => evaluateCondition(condition, context))
  }
}

export function runRulesEngine(context: ChatContext): RuleEngineResult {
  const { rules, templates, persona } = useAppStore.getState()
  
  // Sort rules by priority
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority)
  
  // Find first matching rule
  const matchingRule = sortedRules.find(rule => evaluateRule(rule, context))
  
  if (!matchingRule) {
    return {
      actions: [],
      message: "I'm here to help! What can I do for you today?",
      tone: persona.style
    }
  }
  
  let currentTone = persona.style
  let message = ''
  
  // Execute actions
  const actions: RuleAction[] = []
  
  for (const action of matchingRule.then) {
    actions.push(action)
    
    if (action.type === 'sendMessage') {
      const template = templates.find(t => t.id === action.templateId)
      if (template) {
        const templateVars = {
          firstName: context.client.firstName,
          company: context.client.company,
          intakeLink: 'https://app.lendwisely.com/intake',
          avgMonthlyRevenue: context.metrics?.avg_monthly_revenue?.toLocaleString() || 'N/A'
        }
        
        let renderedMessage = renderTemplate(template.content, templateVars)
        
        // Apply persona styling
        renderedMessage = applyPersonaStyling(renderedMessage, currentTone, persona)
        
        // Add SMS compliance for outreach messages
        if (persona.disclaimers.smsOptOut && 
            (action.templateId.includes('outreach') || action.templateId.includes('follow'))) {
          renderedMessage += ' Reply STOP to opt out.'
        }
        
        message = renderedMessage
      }
    } else if (action.type === 'setTone') {
      currentTone = action.persona
    }
  }
  
  return {
    actions,
    message: message || getDefaultMessage(actions, currentTone),
    tone: currentTone
  }
}

function applyPersonaStyling(
  message: string, 
  tone: 'friendly' | 'professional' | 'concise',
  persona: any
): string {
  let styled = message
  
  switch (tone) {
    case 'friendly':
      // Add contractions
      styled = styled.replace(/\bdo not\b/g, "don't")
      styled = styled.replace(/\bcannot\b/g, "can't")
      styled = styled.replace(/\bwill not\b/g, "won't")
      styled = styled.replace(/\byou are\b/g, "you're")
      styled = styled.replace(/\bwe are\b/g, "we're")
      
      // Add emoji if persona allows
      if (persona.emoji === 'medium' && !styled.includes('🔒') && !styled.includes('💰') && !styled.includes('📈') && !styled.includes('📄') && !styled.includes('💼')) {
        styled += ' 😊'
      }
      break
      
    case 'professional':
      // Remove existing emojis
      styled = styled.replace(/[😊💰📈📄💼🔒]/g, '')
      // Expand contractions
      styled = styled.replace(/\bdon't\b/g, 'do not')
      styled = styled.replace(/\bcan't\b/g, 'cannot')
      styled = styled.replace(/\bwon't\b/g, 'will not')
      styled = styled.replace(/\byou're\b/g, 'you are')
      styled = styled.replace(/\bwe're\b/g, 'we are')
      break
      
    case 'concise':
      // Shorten sentences
      styled = styled.replace(/\bplease\b/gi, '')
      styled = styled.replace(/\bkindly\b/gi, '')
      styled = styled.replace(/\bI hope\b/gi, 'Hope')
      styled = styled.replace(/\bthank you\b/gi, 'thanks')
      styled = styled.trim()
      break
  }
  
  return styled
}

function getDefaultMessage(actions: RuleAction[], tone: string): string {
  const actionTypes = actions.map(a => a.type)
  
  if (actionTypes.includes('askForStatements')) {
    return tone === 'concise' 
      ? 'Upload 3 recent bank statements.'
      : 'Please upload your 3 most recent bank statements to continue.'
  }
  
  if (actionTypes.includes('startPlaid')) {
    return tone === 'concise'
      ? 'Connect your bank for instant verification.'
      : 'You can also connect your bank securely for instant verification.'
  }
  
  if (actionTypes.includes('generateOffers')) {
    return tone === 'concise'
      ? 'Let me generate some offers for you.'
      : 'Let me put together some funding options based on your profile.'
  }
  
  return tone === 'concise' 
    ? 'How can I help?'
    : "I'm here to help! What can I do for you today?"
}