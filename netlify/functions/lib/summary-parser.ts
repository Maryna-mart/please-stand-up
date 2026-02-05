/**
 * Summary Parser - Server-side
 * Extracts structured sections from Claude-generated summary text for email formatting
 * Reuses types from api-types.ts to maintain consistency with frontend
 */

import type { ParsedSummary, SummarySection } from './api-types'

/**
 * Parse summary text into structured sections
 * Handles Claude's formatted output:
 *   **Alice**:
 *   ✅ Yesterday: ...
 *   🎯 Today: ...
 *   etc.
 *
 * @param summaryText - Raw summary text from Claude
 * @returns Parsed summary with participant sections
 */
export function parseSummary(summaryText: string): ParsedSummary {
  const participants: Array<{
    name: string
    sections: SummarySection
  }> = []

  const lines = summaryText.split('\n')
  let currentParticipant: string | null = null
  let currentSection: SummarySection = {}
  let currentSectionType: keyof SummarySection | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) continue

    // Detect participant name (e.g., "Alice:", "## Alice", "**Alice**")
    const participantMatch = trimmed.match(/^(\*\*)?([^:\n*]+)(\*\*)?\s*:?\s*$/)
    if (
      participantMatch &&
      !trimmed.includes('✅') &&
      !trimmed.includes('🎯') &&
      !trimmed.includes('🚫') &&
      !trimmed.includes('📌') &&
      !trimmed.includes('📝')
    ) {
      // Save previous participant if exists
      if (currentParticipant) {
        participants.push({
          name: currentParticipant,
          sections: currentSection,
        })
      }
      // Start new participant
      currentParticipant = participantMatch[2].trim()
      currentSection = {}
      currentSectionType = null
      continue
    }

    // Detect section headers
    if (trimmed.includes('✅') && trimmed.includes('Yesterday')) {
      currentSectionType = 'yesterday'
      const content = trimmed.replace(/✅\s*Yesterday\s*:?\s*/i, '').trim()
      if (content) {
        currentSection.yesterday = content
      }
      continue
    }

    if (trimmed.includes('🎯') && trimmed.includes('Today')) {
      currentSectionType = 'today'
      const content = trimmed.replace(/🎯\s*Today\s*:?\s*/i, '').trim()
      if (content) {
        currentSection.today = content
      }
      continue
    }

    if (trimmed.includes('🚫') && trimmed.includes('Blocker')) {
      currentSectionType = 'blockers'
      const content = trimmed.replace(/🚫\s*Blocker[s]?\s*:?\s*/i, '').trim()
      if (content) {
        currentSection.blockers = content
      }
      continue
    }

    if (trimmed.includes('📌') && trimmed.includes('Team')) {
      currentSectionType = 'actionItems'
      const content = trimmed
        .replace(/📌\s*Team\s*Action\s*Item[s]?\s*:?\s*/i, '')
        .trim()
      if (content) {
        currentSection.actionItems = content
      }
      continue
    }

    if (trimmed.includes('📝') && trimmed.includes('Other')) {
      currentSectionType = 'other'
      const content = trimmed.replace(/📝\s*Other\s*:?\s*/i, '').trim()
      if (content) {
        currentSection.other = content
      }
      continue
    }

    // Append content to current section
    if (currentSectionType && currentParticipant) {
      const sectionKey = currentSectionType as keyof SummarySection
      const existingContent = currentSection[sectionKey] || ''
      currentSection[sectionKey] = existingContent
        ? `${existingContent}\n${trimmed}`
        : trimmed
    }
  }

  // Save last participant
  if (currentParticipant) {
    participants.push({
      name: currentParticipant,
      sections: currentSection,
    })
  }

  return {
    participants,
  }
}
