# Council, Product Requirements

## Problem

Small group decisions, where to go for the weekend, what to do for a birthday, how to split a shared trip budget, take far longer than they should. Each person is optimizing for something different, cost, convenience, or the actual experience, and nobody is holding all three at once. Existing planning tools give you information, not a decision.

## Who this is for

Groups of friends or a single user planning on behalf of a group, early twenties, used to chat interfaces, deciding on something with real constraints, a budget, a timeframe, a location. The first version is built around trip and outing planning specifically, not general purpose decision making.

## Core user story

A user describes what they are trying to plan and the constraints that matter, a two day weekend trip for three people, budget eight thousand rupees, somewhere within driving distance of Bengaluru, relaxing rather than packed with activities. Council runs three specialist agents against that brief, the user watches them propose, react to each other, and sometimes disagree, and within roughly thirty seconds receives a final plan that states which agent's concern shaped which decision.

## MVP scope

One flow only, trip or outing planning, from a single text brief to a final plan. The three specialist agents are Budget, Logistics, and Vibe, defined in AGENTS.md. The debate runs two rounds, proposal then reaction, followed by one moderator synthesis. The full transcript streams to the user in real time rather than appearing all at once. The final output is a structured plan card plus a short trade off log naming which agent's objection changed the outcome.

## Explicitly out of scope for v1

No user accounts or saved history across sessions. No real booking integrations, flights, hotels, or restaurants are not actually reserved. No live pricing or weather APIs, agents reason from the brief and general knowledge, not live data feeds. No mobile app, web only. No payment splitting. No more than three specialist agents and one moderator, additional agent types are a v2 idea, not v1.

## Success criteria

The full debate to final plan completes in under a minute for a typical brief. The transcript is genuinely readable, each agent's turn is distinguishable by voice and position, not generic filler text. The final plan visibly reflects at least one real trade off from the debate, not just a merged summary. It works end to end for three prepared demo scenarios before anything else gets touched, since the LinkedIn demo depends on this working live.

## Primary demo scenarios to seed

A weekend trip for a group of friends with a tight budget and only two days. A date night decision with one clear constraint, for example an early flight the next morning. A birthday outing for a mixed group with very different energy levels. These three exist so Phase 4 in BUILD_PLAN.md has concrete material to test against rather than building directly against whatever the user types first.
