// The three demo scenarios from PRD.md.
export const SCENARIOS = [
  {
    label: 'Tight weekend trip',
    meta: '3 people · ₹8,000 · 2 days',
    brief:
      'A two day weekend trip for three friends, budget eight thousand rupees total, somewhere within driving distance of Bengaluru. We want it relaxing rather than packed with activities.',
    constraints: { budget: '8000', headcount: '3', dates: 'Saturday and Sunday', location: 'Bengaluru' },
  },
  {
    label: 'Date night, early flight',
    meta: '2 people · ₹3,000 · Friday night',
    brief:
      'Date night for two in Bengaluru this Friday. One of us has a 6 am flight from Kempegowda airport on Saturday, so we need to be home early. Budget around three thousand rupees. We want it to feel special, not rushed.',
    constraints: { budget: '3000', headcount: '2', dates: 'Friday evening', location: 'Bengaluru' },
  },
  {
    label: 'Mixed-energy birthday',
    meta: '8 people · ₹1,500 each · Saturday',
    brief:
      'Birthday outing for eight people in Bengaluru on Saturday. Half the group wants something active and loud, the other half wants a calm sit down evening, and two people do not drink. Budget fifteen hundred rupees per person.',
    constraints: { budget: '1500 per person', headcount: '8', dates: 'Saturday', location: 'Bengaluru' },
  },
]
