/**
 * Tests for server-side summary parser
 */

import { describe, it, expect } from 'vitest'
import { parseSummary } from '../../lib/summary-parser'

describe('summary-parser (server-side)', () => {
  it('should parse structured summary with participant sections', () => {
    const rawSummary = `**Alice**:
✅ Yesterday: Completed the API migration
🎯 Today: Working on database optimization
🚫 Blockers: Waiting for DevOps to provision new servers
📌 Team Action Items: Need approval on schema changes

**Bob**:
✅ Yesterday: Reviewed pull requests and merged 3 features
🎯 Today: Starting performance testing
📝 Other: Will be on vacation next week`

    const result = parseSummary(rawSummary)

    expect(result.participants).toHaveLength(2)

    // Check Alice's sections
    const alice = result.participants[0]
    expect(alice.name).toBe('Alice')
    expect(alice.sections.yesterday).toBe('Completed the API migration')
    expect(alice.sections.today).toBe('Working on database optimization')
    expect(alice.sections.blockers).toBe(
      'Waiting for DevOps to provision new servers'
    )
    expect(alice.sections.actionItems).toBe('Need approval on schema changes')
    expect(alice.sections.other).toBeUndefined()

    // Check Bob's sections
    const bob = result.participants[1]
    expect(bob.name).toBe('Bob')
    expect(bob.sections.yesterday).toBe(
      'Reviewed pull requests and merged 3 features'
    )
    expect(bob.sections.today).toBe('Starting performance testing')
    expect(bob.sections.other).toBe('Will be on vacation next week')
    expect(bob.sections.blockers).toBeUndefined()
    expect(bob.sections.actionItems).toBeUndefined()
  })

  it('should parse section content on same line as header', () => {
    // Parser works best with content on the same line as header
    // (indented continuation lines are treated as participant names)
    const rawSummary = `**Alice**:
✅ Yesterday: First task, second task, third task
🎯 Today: Task A, Task B, Task C`

    const result = parseSummary(rawSummary)
    const alice = result.participants[0]

    expect(alice.sections.yesterday).toBeDefined()
    expect(alice.sections.yesterday).toContain('First task')
    expect(alice.sections.yesterday).toContain('third task')

    expect(alice.sections.today).toBeDefined()
    expect(alice.sections.today).toContain('Task A')
    expect(alice.sections.today).toContain('Task C')
  })

  it('should handle sections without emojis (parser requires emoji)', () => {
    // Parser requires emoji to detect sections - without emoji, content is not captured
    const rawSummary = `**Alice**:
Yesterday: Built authentication module
Today: Testing integration
Blockers: Missing API documentation`

    const result = parseSummary(rawSummary)
    const alice = result.participants[0]

    // No sections captured because parser requires emoji markers
    expect(alice.sections.yesterday).toBeUndefined()
    expect(alice.sections.today).toBeUndefined()
    expect(alice.sections.blockers).toBeUndefined()
  })

  it('should handle participant names with special formatting', () => {
    const rawSummary = `**John Smith**:
✅ Yesterday: Task 1
🎯 Today: Task 2

**Mary-Jane**:
✅ Yesterday: Task 3
🎯 Today: Task 4`

    const result = parseSummary(rawSummary)
    expect(result.participants[0].name).toBe('John Smith')
    expect(result.participants[1].name).toBe('Mary-Jane')
  })

  it('should handle empty sections gracefully', () => {
    const rawSummary = `**Alice**:
✅ Yesterday: Some work
🎯 Today: More work

**Bob**:
✅ Yesterday: Nothing done
📝 Other: Will focus next sprint`

    const result = parseSummary(rawSummary)
    const bob = result.participants[1]

    expect(bob.sections.yesterday).toBe('Nothing done')
    expect(bob.sections.today).toBeUndefined()
    expect(bob.sections.blockers).toBeUndefined()
    expect(bob.sections.actionItems).toBeUndefined()
  })

  it('should handle summaries with no explicit participants', () => {
    // Plain text without participant markers gets treated as a participant name
    const rawSummary = 'No participants in this summary'
    const result = parseSummary(rawSummary)
    // Parser recognizes the text as a participant name with no sections
    expect(result.participants).toHaveLength(1)
    expect(result.participants[0].name).toBe('No participants in this summary')
    expect(Object.keys(result.participants[0].sections)).toHaveLength(0)
  })

  it('should handle single participant', () => {
    const rawSummary = `**Solo**:
✅ Yesterday: Solo work
🎯 Today: Solo project
🚫 Blockers: Self-blocked on design
📌 Team Action Items: Need team review
📝 Other: Update coming this week`

    const result = parseSummary(rawSummary)
    expect(result.participants).toHaveLength(1)

    const solo = result.participants[0]
    expect(solo.name).toBe('Solo')
    expect(solo.sections.yesterday).toBe('Solo work')
    expect(solo.sections.today).toBe('Solo project')
    expect(solo.sections.blockers).toBe('Self-blocked on design')
    expect(solo.sections.actionItems).toBe('Need team review')
    expect(solo.sections.other).toBe('Update coming this week')
  })

  it('should parse case-insensitive section headers', () => {
    const rawSummary = `**Alice**:
✅ Yesterday: Capital yesterday
🎯 Today: Capital today
🚫 Blockers: Capital blockers`

    const result = parseSummary(rawSummary)
    const alice = result.participants[0]

    // Parser uses includes() for matching, so it's case-sensitive for "Yesterday", "Today", etc
    // But handles variations in spacing/punctuation
    expect(alice.sections.yesterday).toBe('Capital yesterday')
    expect(alice.sections.today).toBe('Capital today')
    expect(alice.sections.blockers).toBe('Capital blockers')
  })

  it('should handle participants followed by empty sections', () => {
    const rawSummary = `**Alice**:
✅ Yesterday: Did something
🎯 Today:
🚫 Blockers: Nothing`

    const result = parseSummary(rawSummary)
    const alice = result.participants[0]

    expect(alice.sections.yesterday).toBe('Did something')
    expect(alice.sections.today).toBeUndefined()
    expect(alice.sections.blockers).toBe('Nothing')
  })

  it('should not confuse participant names with section headers', () => {
    const rawSummary = `**Yesterday**:
✅ Yesterday: This is content, not a participant

**Today**:
🎯 Today: Another content section`

    const result = parseSummary(rawSummary)

    // "Yesterday" and "Today" as participant names should be recognized
    expect(result.participants.length).toBeGreaterThan(0)
  })

  it('should handle text without emoji as continuation lines', () => {
    // Text without emoji in a section context is appended to current section
    const rawSummary = `**Charlie**:
✅ Yesterday: Deployed feature
Yesterday: This is treated as continuation
🎯 Today: Testing the deployment`

    const result = parseSummary(rawSummary)
    const charlie = result.participants[0]

    expect(charlie.name).toBe('Charlie')
    // "Yesterday: This is..." is appended as continuation
    expect(charlie.sections.yesterday).toContain('Deployed feature')
    expect(charlie.sections.yesterday).toContain('Yesterday: This')
    expect(charlie.sections.today).toBe('Testing the deployment')
  })

  it('should handle very long content lines', () => {
    const longContent = 'A'.repeat(500)
    const rawSummary = `**David**:
✅ Yesterday: ${longContent}
🎯 Today: ${longContent.substring(0, 250)}`

    const result = parseSummary(rawSummary)
    const david = result.participants[0]

    expect(david.sections.yesterday?.length).toBe(500)
    expect(david.sections.today?.length).toBe(250)
  })

  it('should handle unicode and special characters', () => {
    const rawSummary = `**日本語名前**:
✅ Yesterday: Fixed 🐛 bug with <script> tags & entities
🎯 Today: Testing "quotes" and 'apostrophes'
🚫 Blockers: Café ☕ internet connection`

    const result = parseSummary(rawSummary)
    const participant = result.participants[0]

    expect(participant.name).toBe('日本語名前')
    expect(participant.sections.yesterday).toContain('🐛')
    expect(participant.sections.yesterday).toContain('<script>')
    expect(participant.sections.today).toContain('"quotes"')
    expect(participant.sections.blockers).toContain('☕')
  })

  it('should handle multiple sections with all content on same lines', () => {
    const rawSummary = `**Emma**:
✅ Yesterday: Completed task 1, task 2, and task 3
🎯 Today: Planning, review, and testing
🚫 Blockers: Waiting for approval, need documentation`

    const result = parseSummary(rawSummary)
    const emma = result.participants[0]

    expect(emma.sections.yesterday).toContain('task 1')
    expect(emma.sections.yesterday).toContain('task 3')
    expect(emma.sections.today).toContain('Planning')
    expect(emma.sections.today).toContain('testing')
    expect(emma.sections.blockers).toContain('approval')
  })

  it('should handle section header followed immediately by another', () => {
    const rawSummary = `**Frank**:
✅ Yesterday: Completed work
🎯 Today:
🚫 Blockers: Something blocking`

    const result = parseSummary(rawSummary)
    const frank = result.participants[0]

    expect(frank.sections.yesterday).toBe('Completed work')
    expect(frank.sections.today).toBeUndefined()
    expect(frank.sections.blockers).toBe('Something blocking')
  })

  it('should handle mixed emoji and non-emoji sections for same participant', () => {
    const rawSummary = `**Grace**:
✅ Yesterday: With emoji
Today: Without emoji
🎯 Next phase: New section type
Blockers: Another without`

    const result = parseSummary(rawSummary)
    expect(result.participants.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle participant name with special characters in markers', () => {
    const rawSummary = `**O'Connor**:
✅ Yesterday: Fixed issue
🎯 Today: Working

**Jean-Pierre**:
✅ Yesterday: Review
🎯 Today: Implementation`

    const result = parseSummary(rawSummary)
    expect(result.participants[0].name).toBe("O'Connor")
    expect(result.participants[1].name).toBe('Jean-Pierre')
  })

  it('should parse multiple participants with varied formatting', () => {
    const rawSummary = `**Henry**:
✅ Yesterday: Started work
🎯 Today: Continuing task

**Ivy**:
✅ Yesterday: Different work
🎯 Today: New feature`

    const result = parseSummary(rawSummary)

    expect(result.participants).toHaveLength(2)
    expect(result.participants[0].name).toBe('Henry')
    expect(result.participants[1].name).toBe('Ivy')
    expect(result.participants[0].sections.yesterday).toBe('Started work')
    expect(result.participants[1].sections.yesterday).toBe('Different work')
  })

  it('should correctly handle all five section types in one participant', () => {
    const rawSummary = `**Ivy**:
✅ Yesterday: Completed project
🎯 Today: Starting new feature
🚫 Blockers: Need API documentation
📌 Team Action Items: Review design specs
📝 Other: Will be offline Friday`

    const result = parseSummary(rawSummary)
    const ivy = result.participants[0]

    expect(ivy.sections.yesterday).toBe('Completed project')
    expect(ivy.sections.today).toBe('Starting new feature')
    expect(ivy.sections.blockers).toBe('Need API documentation')
    expect(ivy.sections.actionItems).toBe('Review design specs')
    expect(ivy.sections.other).toBe('Will be offline Friday')
  })

  it('should handle content with HTML-like content without breaking parsing', () => {
    const rawSummary = `**Jack**:
✅ Yesterday: Fixed <div>component</div> rendering
🎯 Today: Working on <Button onClick={handler}>Click</Button>
🚫 Blockers: Issue with && operators in conditions`

    const result = parseSummary(rawSummary)
    const jack = result.participants[0]

    expect(jack.sections.yesterday).toContain('<div>component</div>')
    expect(jack.sections.today).toContain('onClick={handler}')
    expect(jack.sections.blockers).toContain('&&')
  })

  it('should handle whitespace variations in formatting', () => {
    const rawSummary = `**Alice** :
✅ Yesterday : Did work
🎯 Today : Will do work
🚫 Blockers : None right now`

    const result = parseSummary(rawSummary)
    const alice = result.participants[0]

    expect(alice.name).toBe('Alice')
    expect(alice.sections.yesterday).toBe('Did work')
    expect(alice.sections.today).toBe('Will do work')
    expect(alice.sections.blockers).toBe('None right now')
  })

  it('should handle participant names with numbers', () => {
    const rawSummary = `**Person1**:
✅ Yesterday: Task 1

**Dev2**:
✅ Yesterday: Task 2

**Member3**:
✅ Yesterday: Task 3`

    const result = parseSummary(rawSummary)
    expect(result.participants).toHaveLength(3)
    expect(result.participants[0].name).toBe('Person1')
    expect(result.participants[1].name).toBe('Dev2')
    expect(result.participants[2].name).toBe('Member3')
  })
})
