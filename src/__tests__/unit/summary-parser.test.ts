/**
 * Unit tests for summary-parser
 * Tests parsing of Claude-generated summary text into structured sections
 */

import { describe, it, expect } from 'vitest'
import {
  parseSummary,
  hasSectionContent,
  getSectionKeys,
  type SummarySection,
} from '@/lib/summary-parser'

describe('summary-parser: parseSummary', () => {
  it('should parse single participant summary with all sections', () => {
    const summaryText = `
Alice:
✅ Yesterday: Finished the login page and authentication setup
🎯 Today: Working on the checkout flow and payment integration
🚫 Blockers: Waiting for the payment API credentials from the team
📌 Team Action Items: Need code review from Bob before merging
📝 Other: Will attend the design sync meeting at 3pm
    `

    const result = parseSummary(summaryText)

    expect(result.participants).toHaveLength(1)
    expect(result.participants[0].name).toBe('Alice')
    expect(result.participants[0].sections.yesterday).toContain('login page')
    expect(result.participants[0].sections.today).toContain('checkout')
    expect(result.participants[0].sections.blockers).toContain('payment API')
    expect(result.participants[0].sections.actionItems).toContain('code review')
    expect(result.participants[0].sections.other).toContain('design sync')
  })

  it('should parse multiple participants', () => {
    const summaryText = `
Alice:
✅ Yesterday: Fixed login bug
🎯 Today: Working on checkout
Bob:
✅ Yesterday: Updated database schema
🎯 Today: Testing migration scripts
    `

    const result = parseSummary(summaryText)

    expect(result.participants).toHaveLength(2)
    expect(result.participants[0].name).toBe('Alice')
    expect(result.participants[1].name).toBe('Bob')
  })

  it('should handle participant names with markdown formatting', () => {
    const summaryText = `
**Alice**:
✅ Yesterday: Task A
🎯 Today: Task B

**Bob**:
✅ Yesterday: Task C
🎯 Today: Task D
    `

    const result = parseSummary(summaryText)

    expect(result.participants.map(p => p.name)).toContain('Alice')
    expect(result.participants.map(p => p.name)).toContain('Bob')
  })

  it('should handle sections without participant names', () => {
    const summaryText = `
✅ Yesterday: Worked on feature A
🎯 Today: Testing feature B
🚫 Blockers: Need access to production
    `

    const result = parseSummary(summaryText)

    // Should still parse sections even without participant name
    expect(result.rawText).toContain('Yesterday')
  })

  it('should skip empty lines', () => {
    const summaryText = `
Alice:

✅ Yesterday: Task A

🎯 Today: Task B


🚫 Blockers: Issue X
    `

    const result = parseSummary(summaryText)

    expect(result.participants[0].sections.yesterday).toBe('Task A')
    expect(result.participants[0].sections.today).toBe('Task B')
    expect(result.participants[0].sections.blockers).toBe('Issue X')
  })

  it('should handle section content spanning multiple lines', () => {
    const summaryText = `Alice:
✅ Yesterday: First task
🎯 Today: Second task
Continue today task here`

    const result = parseSummary(summaryText)

    // Parser should find Alice and her sections
    expect(result.participants.length).toBeGreaterThan(0)
    const alice = result.participants.find(p => p.name === 'Alice')
    expect(alice).toBeDefined()
    expect(alice?.sections.yesterday).toContain('First task')
  })

  it('should handle different section header formats', () => {
    const summaryText = `
Alice:
✅ Yesterday: Task A
🎯 Today: Task B
🚫 Blocker: Issue
📌 Team Action Items: Action
📝 Other: Note
    `

    const result = parseSummary(summaryText)

    const sections = result.participants[0].sections
    expect(sections.yesterday).toBe('Task A')
    expect(sections.today).toBe('Task B')
    expect(sections.blockers).toBe('Issue')
    expect(sections.actionItems).toBe('Action')
    expect(sections.other).toBe('Note')
  })

  it('should handle section headers with lowercase content', () => {
    const summaryText = `
Alice:
✅ Yesterday: Task A
🎯 Today: Task B
🚫 Blockers: Issue
    `

    const result = parseSummary(summaryText)

    const sections = result.participants[0].sections
    expect(sections.yesterday).toBe('Task A')
    expect(sections.today).toBe('Task B')
    expect(sections.blockers).toBe('Issue')
  })

  it('should preserve rawText', () => {
    const summaryText = `Alice:
✅ Yesterday: Task A
🎯 Today: Task B`

    const result = parseSummary(summaryText)

    expect(result.rawText).toBe(summaryText)
  })

  it('should handle empty summary', () => {
    const result = parseSummary('')

    expect(result.participants).toHaveLength(0)
    expect(result.rawText).toBe('')
  })

  it('should not confuse emojis with participant names', () => {
    const summaryText = `
Alice:
✅ Yesterday: Some task
🎯 Today: Another task
Bob:
✅ Yesterday: His task
    `

    const result = parseSummary(summaryText)

    expect(result.participants).toHaveLength(2)
    expect(result.participants[0].sections.today).toBe('Another task')
  })

  it('should handle sections with colons in content', () => {
    const summaryText = `
Alice:
✅ Yesterday: Task at 10:30am, deadline 5:00pm
🎯 Today: Call with Bob: discuss roadmap
    `

    const result = parseSummary(summaryText)

    expect(result.participants[0].sections.yesterday).toContain('10:30am')
    expect(result.participants[0].sections.today).toContain('Bob')
  })

  it('should handle participant names that look like headers', () => {
    const summaryText = `
**Alice Lee**:
✅ Yesterday: Task
🎯 Today: Another task
    `

    const result = parseSummary(summaryText)

    expect(result.participants[0].name).toBe('Alice Lee')
  })

  it('should handle when sections appear without participant header', () => {
    const summaryText = `
✅ Yesterday: Task A
🎯 Today: Task B
Alice:
✅ Yesterday: Alice task
    `

    const result = parseSummary(summaryText)

    // Should have Alice with her tasks
    const alice = result.participants.find(p => p.name === 'Alice')
    expect(alice?.sections.yesterday).toBe('Alice task')
  })
})

describe('summary-parser: hasSectionContent', () => {
  it('should return true if section has any content', () => {
    const section: SummarySection = {
      yesterday: 'Some work',
    }

    expect(hasSectionContent(section)).toBe(true)
  })

  it('should return false if section is empty', () => {
    const section: SummarySection = {}

    expect(hasSectionContent(section)).toBe(false)
  })

  it('should return true if any field has content', () => {
    const section: SummarySection = {
      blockers: 'Blocked on API',
      actionItems: undefined,
    }

    expect(hasSectionContent(section)).toBe(true)
  })

  it('should handle all section types', () => {
    const fullSection: SummarySection = {
      yesterday: 'A',
      today: 'B',
      blockers: 'C',
      actionItems: 'D',
      other: 'E',
    }

    expect(hasSectionContent(fullSection)).toBe(true)
  })
})

describe('summary-parser: getSectionKeys', () => {
  it('should return array of non-empty section keys', () => {
    const section: SummarySection = {
      yesterday: 'Task A',
      today: 'Task B',
      blockers: undefined,
      actionItems: 'Action',
    }

    const keys = getSectionKeys(section)

    expect(keys).toContain('yesterday')
    expect(keys).toContain('today')
    expect(keys).toContain('actionItems')
    expect(keys).not.toContain('blockers')
    expect(keys.length).toBe(3)
  })

  it('should return empty array for empty section', () => {
    const section: SummarySection = {}

    const keys = getSectionKeys(section)

    expect(keys).toEqual([])
  })

  it('should maintain order of keys', () => {
    const section: SummarySection = {
      yesterday: 'A',
      today: 'B',
      blockers: 'C',
      actionItems: 'D',
      other: 'E',
    }

    const keys = getSectionKeys(section)

    expect(keys).toEqual([
      'yesterday',
      'today',
      'blockers',
      'actionItems',
      'other',
    ])
  })

  it('should skip undefined and empty sections', () => {
    const section: SummarySection = {
      yesterday: 'Task',
      today: undefined,
      blockers: '',
      actionItems: 'Action',
    }

    const keys = getSectionKeys(section)

    // Empty string is falsy, so should be skipped
    expect(keys).toContain('yesterday')
    expect(keys).toContain('actionItems')
    expect(keys.length).toBe(2)
  })
})
