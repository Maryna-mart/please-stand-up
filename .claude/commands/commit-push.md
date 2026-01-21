---
description: Create a git commit and push to remote
---

Create a git commit and push to remote following these steps:

1. Check current status and changes
2. Analyze the diff and recent commit style
3. Draft a clear, concise commit message that:
   - Follows conventional commits format: `<type>(<scope>): <description>`
   - Keeps subject line to maximum 50 characters
   - Accurately describes what was changed and why
   - Is 1-2 sentences focused on the "why" rather than just the "what"
4. Stage all relevant files with `git add -A`
5. Create the commit with the drafted message
6. Push to remote with `git push`
7. Verify success

**Commit Message Format** (Conventional Commits):
- **Type** (required): `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`
- **Scope** (optional): Area of code affected in parentheses
- **Description** (required): Brief summary, max 50 characters total for subject, lowercase, no period
- **Body** (optional): Blank line + detailed explanation, max 72 characters per line
- **Footer** (optional): References to issues, breaking changes

Examples:
- `feat(auth): Add JWT token validation`
- `fix(session): Prevent localStorage corruption on invalid JSON`
- `docs: Update security guidelines in README`

**Important**:
- NEVER use `git commit --amend` unless explicitly requested
- Use HEREDOC format for commit messages to ensure proper formatting
- NEVER force push unless explicitly requested by the user
- Subject line must be under 50 characters (enforced by commit-msg hook)
- Blank line required between subject and body (enforced by commit-msg hook)
- Body lines should not exceed 72 characters (warned by commit-msg hook)
