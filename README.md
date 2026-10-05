# Council

A multi agent planning tool that makes AI deliberation visible. Instead of one model giving one answer, three specialist agents argue out a real decision, a weekend trip, a dinner plan, a group budget call, in front of the user, then a moderator agent merges their positions into a final plan with the trade offs stated out loud.

## Why this project

Most consumer AI tools hide the reasoning and show only the output. Council does the opposite. The product is the argument, not just the answer. That is also the right technical story for a portfolio piece, since it demonstrates actual multi agent orchestration, structured agent to agent communication, and model selection per role, not a single prompt wrapped in a UI.

## Document index

PRD.md, the product scope, the user, what is in and out for the MVP.

ARCHITECTURE.md, the system design, the orchestration loop, model choice per agent, streaming approach.

AGENTS.md, the four agent personas, their system prompts, and the debate protocol.

DATA_MODEL.md, the database schema.

BUILD_PLAN.md, the phased build order for Claude Code to execute against.

## How to use this with Claude Code

Drop all five files into the repo root or a docs folder. Point Claude Code at BUILD_PLAN.md first and ask it to execute Phase 0, then proceed phase by phase, referencing ARCHITECTURE.md and AGENTS.md as it builds each component. Do not ask it to build everything in one shot, the phased order exists because each phase should be runnable and demoable before the next one starts.
