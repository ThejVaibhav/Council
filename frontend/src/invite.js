// Opens the person's own mail app with an invite; the app itself never sends email.
export function emailInviteHref(link, who, what) {
  const subject = `${who} wants to plan ${what} with you on Council`
  const body = `Hey! I'm planning ${what} on Council, where three AI agents debate the plan and a moderator picks one.\n\nJoin here: ${link}`
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
