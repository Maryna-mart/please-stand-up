/**
 * Summary Parser - Extracts structured sections from Claude-generated summary text
 * Parses format like:
 *   ✅ Yesterday: ...
 *   🎯 Today: ...
 *   etc.
 */

export interface SummarySection {
  yesterday?: string
  today?: string
  blockers?: string
  actionItems?: string
  other?: string
}

export interface ParsedSummary {
  participants: Array<{
    name: string
    sections: SummarySection
  }>
  rawText: string
}

/**
 * Parse summary text into structured sections
 * @param summaryText - Raw summary text from Claude
 * @returns Parsed summary with participant sections
 */
export function parseSummary(summaryText: string): ParsedSummary {
  const participants: Array<{
    name: string
    sections: SummarySection
  }> = []

  // Split by participant headers (name followed by colon or participant name as header)
  // Claude typically formats as "Alice:" or "## Alice" or "**Alice**" etc.
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
    rawText: summaryText,
  }
}

/**
 * Check if a section has content
 */
export function hasSectionContent(section: SummarySection): boolean {
  return !!(
    section.yesterday ||
    section.today ||
    section.blockers ||
    section.actionItems ||
    section.other
  )
}

/**
 * Get all non-empty sections from a summary
 */
export function getSectionKeys(
  section: SummarySection
): (keyof SummarySection)[] {
  const keys: (keyof SummarySection)[] = []
  if (section.yesterday) keys.push('yesterday')
  if (section.today) keys.push('today')
  if (section.blockers) keys.push('blockers')
  if (section.actionItems) keys.push('actionItems')
  if (section.other) keys.push('other')
  return keys
}
