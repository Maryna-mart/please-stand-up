---
name: commit-squash-push
description: Squash recent commits and push to remote
disable-model-invocation: true
---

Squash recent commits into one and push to remote following these steps:

1. Check current status and recent commit history
2. Ask the user how many commits to squash (default: 2)
3. Analyze the commits being squashed
4. Draft a clear, concise commit message that:
   - Summarizes all changes from the squashed commits
   - Follows the repository's commit message style
   - Is 1-2 sentences focused on the "why" rather than just the "what"
5. Use interactive rebase to squash: `git rebase -i HEAD~N` (where N is the number of commits)
6. Push to remote with `git push --force-with-lease`
7. Pull from remote with `git pull --rebase` to ensure local branch is up to date
8. Verify success

**Important**:
- ALWAYS ask the user for confirmation before force pushing
- Use `--force-with-lease` instead of `--force` for safety
- Use HEREDOC format for commit messages to ensure proper formatting
- This command should only be used on feature branches, warn if on main/master
