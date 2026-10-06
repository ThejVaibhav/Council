import { Coins, Compass, Heart, Scale } from 'lucide-react'

export const AGENTS = {
  budget: { name: 'Budget', role: 'keeps it affordable', Icon: Coins },
  logistics: { name: 'Logistics', role: 'makes sure it actually works', Icon: Compass },
  vibe: { name: 'Vibe', role: 'protects the feeling', Icon: Heart },
  moderator: { name: 'Moderator', role: 'makes the final call', Icon: Scale },
}

export const SPECIALISTS = ['budget', 'logistics', 'vibe']

export const STANCE_LABEL = { propose: 'proposes', support: 'agrees', flag: 'pushes back' }

export const ROUND_LABEL = {
  1: { title: 'Round one', note: 'first takes' },
  2: { title: 'Round two', note: 'the pushback' },
}

export const formatCost = (c) => (c == null ? null : `₹${Math.round(c).toLocaleString('en-IN')}`)
