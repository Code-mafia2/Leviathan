import { eventConfig } from './event.config'

const eventDate = new Date(eventConfig.date + 'T00:00:00Z')
const date = eventDate.toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' })
const shortDate = eventConfig.date.split('-').reverse().join('.')

export const copy = {
  title: eventConfig.name.toUpperCase(),
  tagline: 'Something ancient stirs beneath the surface.',
  subline: `${date} · ${eventConfig.venue}`,
  register: 'Register Your Crew',
  whatsapp: 'Join the WhatsApp Group',
  descent: 'For centuries it slept in the trench. Now the water is getting warmer, the sonar keeps pinging, and something down there has opened its eyes. Only a crew with enough power can go down and come back up. Gather your crew. Power up. Dive.',
  facts: [['DATE', date], ['LOCATION', eventConfig.venue], ['CREW', '2–3 divers per team']],
  trial: "Three main stations. Two bonus stations. What waits at each one — you'll find out on the day.",
  rules: [
    'Team size: minimum 2, maximum 3 members.',
    'A crew of 2 can dive — but the deep is not kind to small crews. Teams of 2 may be at a disadvantage. We recommend 3.',
    'One registration per team. The team leader registers on behalf of the crew.',
  ],
  warning: 'Diving with 2? You can — but crews of 3 have the edge.',
  confirm: 'I have read the crew rules',
  submit: 'Begin the Descent',
  success: "Your crew is logged. The deep is waiting. Join the participants' WhatsApp group now — all updates will be shared there.",
  channel: "All briefings, updates and announcements go out on WhatsApp. Don't miss the signal.",
  faq: [
    ['Who can take part?', eventConfig.eligibility],
    ['How many people per team?', '2 to 3. Teams of 2 are allowed but may be at a disadvantage.'],
    ['What are the stations?', 'There are 3 main stations and 2 bonus stations. The rest is a secret until the day.'],
    ['Where is it?', `${eventConfig.venue}.`],
    ['When is it?', `${date}.`],
    ['Where do I get updates?', "In the participants' WhatsApp group."],
  ],
  footer: `${eventConfig.name} · ${eventConfig.venue} · ${shortDate}`,
}
