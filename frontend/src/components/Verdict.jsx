import { motion } from 'motion/react'
import { Sparkle } from 'lucide-react'
import { AGENTS, formatCost } from '../agents'
import AgentAvatar from './AgentAvatar'

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

export default function Verdict({ plan }) {
  const cost = formatCost(plan.estimated_cost)
  return (
    <motion.section
      className="verdict glass"
      data-testid="plan"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      <motion.div className="verdict-kicker" variants={item}>
        <AgentAvatar agent="moderator" size="sm" /> The verdict
      </motion.div>
      <motion.h2 variants={item}>{plan.title}</motion.h2>
      <motion.p className="verdict-summary" variants={item}>
        {plan.summary}
      </motion.p>
      <motion.div className="verdict-plan" variants={item}>
        <p>{plan.description}</p>
        {cost && (
          <div className="verdict-cost">
            <span>Estimated total</span>
            <strong>{cost}</strong>
          </div>
        )}
      </motion.div>

      <motion.h3 variants={item}>
        <Sparkle size={14} fill="currentColor" strokeWidth={0} /> Who won what
      </motion.h3>
      {plan.trade_off_log.length === 0 ? (
        <motion.p className="muted" variants={item}>
          No real disagreement this time. The council was aligned.
        </motion.p>
      ) : (
        <ul className="tradeoffs">
          {plan.trade_off_log.map((t, i) => (
            <motion.li key={i} variants={item}>
              <div className="tradeoff-who">
                <span className="avatar-stack">
                  {t.agents_involved.map((a) => (
                    <AgentAvatar key={a} agent={a} size="sm" />
                  ))}
                </span>
                <span>{t.agents_involved.map((a) => AGENTS[a]?.name ?? a).join(' vs ')}</span>
              </div>
              <p className="tradeoff-what">{t.disagreement}</p>
              <p className="tradeoff-won">{t.which_concern_won}</p>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.section>
  )
}
