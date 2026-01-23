---
name: commit
description: Create a git commit with current changes
disable-model-invocation: true
---

Create a git commit following these steps:

1. Check current status and changes
2. Analyze the diff and recent commit style
3. Draft a clear, concise commit message that:
   - Accurately describes what was changed and why
   - Follows the repository's commit message style
   - Is 1-2 sentences focused on the "why" rather than just the "what"
4. Stage all relevant files with `git add -A`
5. Create the commit with the drafted message
6. Verify the commit was successful

**Important**:
- NEVER use `git commit --amend` unless explicitly requested
- Use HEREDOC format for commit messages to ensure proper formatting
- Do NOT push to remote
