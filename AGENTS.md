<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mandatory User Workflow Rules
1. In EVERY response where code changes or deployment are discussed, ALWAYS provide:
   - Commands for PC (Git commit with specific message, push origin main, push backup main, and DB backup).
   - Commands for VPS (strictly line-by-line / one-by-one, NEVER single-line with `&&`, and without `cd` since the user is already inside the repo).
2. NEVER add `cd /var/www/...` to VPS commands. The user is already in the repository directory on VPS.
3. NEVER join VPS commands with `&&`. Always write each command on its own line so they can be run one by one.
4. Commit messages MUST be specific and detailed, explicitly listing what was fixed. Never use generic messages like "update".

