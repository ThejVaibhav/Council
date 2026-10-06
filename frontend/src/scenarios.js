// Example plans from PRD.md, plus a beach weekend.
export const SCENARIOS = [
  {
    label: 'Hills weekend',
    meta: '3 people · ₹8,000 · 2 days',
    brief:
      'A two day weekend trip to the hills for three friends, budget eight thousand rupees total, somewhere within driving distance of Bengaluru. We want it relaxing rather than packed with activities.',
    constraints: { budget: '8000', headcount: '3', dates: 'Saturday and Sunday', location: 'Bengaluru' },
  },
  {
    label: 'Date night',
    meta: '2 people · ₹3,000 · Friday',
    brief:
      'Date night for two in Bengaluru this Friday. One of us has a 6 am flight from Kempegowda airport on Saturday, so we need to be home early. Budget around three thousand rupees. We want it to feel special, not rushed.',
    constraints: { budget: '3000', headcount: '2', dates: 'Friday evening', location: 'Bengaluru' },
  },
  {
    label: 'Beach with friends',
    meta: '4 people · ₹14,000 · long weekend',
    brief:
      'Four friends want a beach trip over the long weekend, leaving from Bengaluru by train or bus. Budget fourteen thousand rupees total. We want sea, seafood and lazy evenings, not a packed itinerary.',
    constraints: { budget: '14000', headcount: '4', dates: 'Long weekend', location: 'Bengaluru' },
  },
  {
    label: 'Birthday party',
    meta: '8 people · ₹1,500 each · Saturday',
    brief:
      'Birthday outing for eight people in Bengaluru on Saturday. Half the group wants something active and loud, the other half wants a calm sit down evening, and two people do not drink. Budget fifteen hundred rupees per person.',
    constraints: { budget: '1500 per person', headcount: '8', dates: 'Saturday', location: 'Bengaluru' },
  },
]
