// Demo mode (VITE_DEMO=1): plays a scripted debate in the browser with the same events the backend streams.
// Used for the static preview where no backend or Gemini key is available.
import { SCENARIOS } from './scenarios'

const T = (agent, round, option_title, description, estimated_cost, stance, commentary) => ({
  agent, round, option_title, description, estimated_cost, stance, commentary,
})

const DEBATES = {
  'Hills weekend': {
    turns: [
      T('budget', 1, 'Chikmagalur homestay', 'Two nights in a coffee-estate homestay, shared room, self-drive in one car.', 6900, 'propose',
        'This lands at about 6,900 for all three, fuel included. That leaves 1,100 of breathing room, which on 8,000 you will want.'),
      T('logistics', 1, 'Chikmagalur via NH75', 'Leave 6 am Saturday, about 5 hours each way. Back by 8 pm Sunday.', 7200, 'propose',
        'Five hours each way is the ceiling for a two-day trip. Coorg is similar. Gokarna is not: 9 hours each way kills Sunday.'),
      T('vibe', 1, 'Sakleshpur plantation cottage', 'A private cottage with a verandah over the estate, no itinerary, bonfire at night.', 9400, 'propose',
        "You said relaxing. That means a place you don't have to leave. A cottage with its own view beats any sightseeing list."),
      T('budget', 2, 'Chikmagalur homestay', 'Same plan, upgrade to a private room on night two only.', 7600, 'flag',
        "Vibe's cottage is 1,400 over budget. I'll concede one upgraded night, it is worth the 700, but not two."),
      T('logistics', 2, 'Chikmagalur, one car', 'One car for three, leave 6 am to beat the Nelamangala traffic, no detours.', 7600, 'support',
        "Budget's version works on the clock. Vibe's Sakleshpur cottage adds a ghat road at night, which I'd rather not."),
      T('vibe', 2, 'Chikmagalur, private room', 'Book the estate room with the verandah, skip Mullayanagiri, sleep in.', 7600, 'support',
        "I can live with Budget's split. The verandah is the trip. Just don't fill Sunday with a peak hike nobody asked for."),
    ],
    plan: {
      title: 'Two slow days in Chikmagalur', estimated_cost: 7600,
      description: 'Leave Bengaluru 6 am Saturday in one car. Coffee-estate homestay, standard room night one, verandah room night two. No fixed plans beyond a short estate walk. Head back after lunch Sunday.',
      summary: 'Book a Chikmagalur estate homestay for Saturday and Sunday. It is five hours away, comes in at about 7,600 for three, and the plan is deliberately empty so you actually rest.',
      trade_off_log: [
        { agents_involved: ['budget', 'vibe'], disagreement: 'Vibe wanted a private cottage at 9,400; Budget held the 8,000 cap.',
          which_concern_won: "Budget, with one upgraded night as Vibe's win, because the cap was stated as hard." },
        { agents_involved: ['logistics', 'vibe'], disagreement: "Sakleshpur's cottage versus a ghat road after dark.",
          which_concern_won: 'Logistics, because a tense night drive undoes the relaxing part.' },
      ],
    },
  },
  'Date night': {
    turns: [
      T('budget', 1, 'Rooftop dinner in Indiranagar', 'Set menu for two at a rooftop place, one drink each, auto both ways.', 2600, 'propose',
        'A set menu keeps the bill predictable at around 2,600. Ordering à la carte on a special night is how 3,000 becomes 4,500.'),
      T('logistics', 1, 'Early dinner in Hebbal', 'Dinner 7 to 9 pm near Hebbal, 20 minutes from home, on the airport side of town.', 2800, 'propose',
        'A 6 am flight means leaving home by 4. Being asleep by 10:30 is the real constraint, so dinner has to be close and early.'),
      T('vibe', 1, 'Candlelit table at a lakeside cafe', 'A quiet lakeside table at sunset, slow courses, no rush to turn the table.', 3200, 'propose',
        'Special means unhurried. A view and a table nobody needs back in an hour matter more than the menu.'),
      T('budget', 2, 'Lakeside cafe, early slot', "Vibe's lakeside idea at the 6:30 slot, skip dessert out, it fits at 2,900.", 2900, 'support',
        "Vibe's pick is only 200 over if you skip the wine pairing. I'm fine with that."),
      T('logistics', 2, 'Hebbal lake cafe', 'The lake cafe near Hebbal: sunset at 6:20, done by 8:45, home by 9:15.', 2900, 'flag',
        "An Indiranagar rooftop is 50 minutes from home in Friday traffic. Pick a lakeside spot north of the city or the plan doesn't hold."),
      T('vibe', 2, 'Sunset at Hebbal lake', 'Book the 6:30 window table, phones away, walk by the lake after.', 2900, 'support',
        'Starting at sunset is better anyway. An early night after a slow dinner still feels special.'),
    ],
    plan: {
      title: 'Sunset dinner by Hebbal lake', estimated_cost: 2900,
      description: 'Book a window table at a lakeside cafe near Hebbal for 6:30 pm Friday. Skip the wine pairing, take a short walk by the lake after, and be home by 9:15 for a 4 am start.',
      summary: 'Have an early sunset dinner at a lakeside cafe on the airport side of town. It feels special, stays under 3,000, and gets you to bed in time for the 6 am flight.',
      trade_off_log: [
        { agents_involved: ['logistics', 'vibe'], disagreement: 'Vibe wanted any lakeside spot; Logistics ruled out anything south of the city.',
          which_concern_won: 'Logistics, because the flight time is the one constraint that cannot bend.' },
        { agents_involved: ['budget', 'vibe'], disagreement: 'The lake cafe ran 200 over with the wine pairing.',
          which_concern_won: 'Budget, by dropping the pairing rather than the venue.' },
      ],
    },
  },
  'Beach with friends': {
    turns: [
      T('budget', 1, 'Gokarna by overnight bus', 'Sleeper bus both ways, a beach hut for two nights, seafood thalis.', 11800, 'propose',
        'Overnight buses save a night of stay. That brings four people in at about 11,800 and leaves room for a boat ride.'),
      T('logistics', 1, 'Gokarna via the Karwar train', 'Night train to Gokarna Road, 20 minutes by auto to Kudle beach. Book now, long weekends sell out.', 12600, 'propose',
        'Train beats the bus on comfort and arrives by 7 am. The catch is availability: long weekend seats go three weeks out.'),
      T('vibe', 1, 'Om beach shacks in Gokarna', 'A shack right on Om beach, hammocks, sunset from the rocks, prawn fry dinners.', 15200, 'propose',
        'Lazy evenings means waking up on the beach, not a 20 minute walk from it. Stay on Om beach itself.'),
      T('budget', 2, 'Kudle beach huts', 'Kudle huts instead of Om shacks, same beach life, 1,200 less.', 13200, 'flag',
        "Vibe's Om beach shacks push us over 14,000. Kudle is one rock away and 1,200 cheaper, and the sunset is the same."),
      T('logistics', 2, 'Train there, bus back', 'Night train out on Friday, sleeper bus back on Monday when trains are full.', 13200, 'support',
        'Budget is right about Kudle. I would split transport: the return train is the one that sells out first.'),
      T('vibe', 2, 'Kudle with a sunset walk', 'Stay on Kudle, walk the cliff path to Om beach for sunset and dinner one night.', 13400, 'support',
        "Fine with Kudle if we keep one Om beach evening. That walk at sunset is the whole reason to go."),
    ],
    plan: {
      title: 'Three lazy days in Gokarna', estimated_cost: 13400,
      description: 'Night train from Bengaluru on Friday, two nights in beach huts on Kudle beach, one sunset walk over the cliff to Om beach for a seafood dinner, and a sleeper bus back on Monday.',
      summary: 'Go to Gokarna and stay on Kudle beach. It keeps the sea-and-seafood feel, fits 14,000 for four with a little to spare, and splits train and bus so the return is not a gamble.',
      trade_off_log: [
        { agents_involved: ['budget', 'vibe'], disagreement: 'Vibe wanted shacks on Om beach; Budget said they break the 14,000 cap.',
          which_concern_won: 'Budget, with one Om beach sunset dinner kept as Vibe\'s win.' },
        { agents_involved: ['logistics', 'budget'], disagreement: 'Train both ways versus bus both ways.',
          which_concern_won: 'Logistics, because return trains on a long weekend sell out first.' },
      ],
    },
  },
  'Birthday party': {
    turns: [
      T('budget', 1, 'Bowling and a dinner buffet', 'Two games of bowling, then a buffet dinner nearby, for eight.', 11200, 'propose',
        'At 1,400 a head this stays under 1,500 per person. Buffets also make the non-drinkers pay the same as everyone else.'),
      T('logistics', 1, 'One venue in Koramangala', 'A gaming cafe and restaurant in one building, booked for 7 to 10 pm.', 12000, 'propose',
        'Eight people across two venues on a Saturday means someone is always late. Keep it under one roof.'),
      T('vibe', 1, 'Split evening, shared dinner', 'Arcade hour for the loud half, board-game cafe for the calm half, then one long dinner together.', 12400, 'propose',
        "Forcing everyone into bowling loses half the group. Let both halves have their hour, then bring everyone to one table."),
      T('budget', 2, 'One-roof venue, set menu', 'Arcade credits and a mocktail-friendly set menu at the same venue.', 11600, 'support',
        "Logistics' one-venue idea keeps it at 1,450 a head. Vibe's split plan works there too, as long as the dinner is a set menu."),
      T('logistics', 2, 'Koramangala, two floors', 'Arcade on the ground floor, quiet lounge upstairs, dinner booked for 8:30.', 11600, 'support',
        "Vibe's split is feasible if both halves are in the same building. Two venues across town is still a no."),
      T('vibe', 2, 'Two floors, one table', 'Loud floor, quiet floor, then a long table with a cake moment and good mocktails.', 11600, 'support',
        'This keeps what I cared about: nobody spends the night doing something they hate, and the birthday still has a shared moment.'),
    ],
    plan: {
      title: 'Two floors, one birthday table', estimated_cost: 11600,
      description: 'Book a Koramangala venue with an arcade floor and a quiet lounge for 7 pm Saturday. Each half picks its floor for an hour, then everyone meets at 8:30 for a set dinner with mocktails and cake.',
      summary: 'Keep all eight people under one roof, let the loud and calm halves each have their hour, and finish with one long dinner. It comes to about 1,450 per person.',
      trade_off_log: [
        { agents_involved: ['logistics', 'vibe'], disagreement: 'Vibe wanted separate venues for each half; Logistics wanted one venue.',
          which_concern_won: "Logistics on the venue, Vibe on the split, because two floors gives both." },
        { agents_involved: ['budget', 'vibe'], disagreement: 'An open menu would push past 1,500 per head.',
          which_concern_won: 'Budget, with a set menu that still includes proper mocktails for the non-drinkers.' },
      ],
    },
  },
}

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })

export async function simulateDebate(_url, body, onEvent, signal) {
  const match = SCENARIOS.find((s) => s.brief === body.brief)
  const debate = DEBATES[match?.label] ?? DEBATES['Hills weekend']
  let id = 0
  for (const round of [1, 2]) {
    onEvent('round_start', { round })
    const turns = debate.turns.filter((t) => t.round === round)
    const order = round === 1 ? [0, 1, 2] : [2, 0, 1]
    for (const i of order) {
      await wait(1100 + Math.random() * 900, signal)
      onEvent('turn', { id: `demo-${id++}`, ...turns[i] })
    }
    await wait(700, signal)
  }
  onEvent('moderator_start', {})
  await wait(2400, signal)
  onEvent('final_plan', debate.plan)
  onEvent('done', {})
}
