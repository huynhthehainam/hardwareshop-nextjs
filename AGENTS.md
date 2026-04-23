<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Shared AI Assets

Use shared, agent-agnostic assets from:

- `.ai/skills/` for reusable skills and references
- `.ai/gemini-settings.json` for shared Gemini MCP reference

Gemini compatibility path:

- `.gemini/skills` is a junction to `.ai/skills`
