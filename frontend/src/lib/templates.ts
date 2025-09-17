// Simple template renderer for {{token}} syntax
export function renderTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined ? String(value) : match
  })
}

// Validate template syntax
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for unmatched braces
  const openBraces = (template.match(/\{\{/g) || []).length
  const closeBraces = (template.match(/\}\}/g) || []).length
  
  if (openBraces !== closeBraces) {
    errors.push('Unmatched template braces {{ }}')
  }
  
  // Check for empty tokens
  const emptyTokens = template.match(/\{\{\s*\}\}/g)
  if (emptyTokens) {
    errors.push('Empty template tokens are not allowed')
  }
  
  // Check for invalid token characters
  const invalidTokens = template.match(/\{\{[^}]*[^a-zA-Z0-9_][^}]*\}\}/g)
  if (invalidTokens) {
    errors.push('Template tokens can only contain letters, numbers, and underscores')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Extract tokens from template
export function extractTokens(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  return matches.map(match => match.slice(2, -2)).filter((token, index, array) => array.indexOf(token) === index)
}

// Common template variables
export const commonTemplateVars = {
  firstName: 'Client first name',
  lastName: 'Client last name', 
  company: 'Company name',
  email: 'Email address',
  phone: 'Phone number',
  intakeLink: 'Application link',
  avgMonthlyRevenue: 'Average monthly revenue',
  totalDeposits: 'Total deposits',
  avgDailyBalance: 'Average daily balance',
  dashboardLink: 'Dashboard link',
  supportEmail: 'Support email',
  currentDate: 'Current date',
  currentTime: 'Current time'
}