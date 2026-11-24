export interface Member {
  fullName: string
  phone: string
  email: string
}

export interface RegistrationData {
  teamName: string
  leader: Member & { college: string; department: string; year: string }
  member2: Member
  member3: Member | null
  acceptedCrewRules: boolean
}

export interface RegistrationRequest {
  requestId: string
  registration: RegistrationData
}

export const uncertainMessage = 'Registration could not be confirmed. Please retry using the same details.'
export const validRequestId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid registration details.')
  return value as Record<string, unknown>
}

function field(value: unknown): string {
  if (typeof value !== 'string') throw Error('Please complete all required fields.')
  return value.trim()
}

function member(input: unknown, optional: boolean): Member | null {
  if (optional && input == null) return null
  const data = record(input)
  function read(key: string) {
    return optional && data[key] === undefined ? '' : field(data[key])
  }
  const fullName = read('fullName'), phone = read('phone'), email = read('email').toLowerCase()
  if (optional && !fullName && !phone && !email) return null
  if (!fullName || !phone || !email) throw Error(optional
    ? 'Please complete all Member 3 fields or leave them blank.' : 'Please complete all required fields.')
  if (!/^[0-9]{10}$/.test(phone)) throw Error('Each phone number must contain exactly 10 digits.')
  if (!/^[a-z0-9.!#$%&'*+/=?^_{}`|~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(email)) {
    throw Error('Please enter a valid email address for each crew member.')
  }
  return { fullName, phone, email }
}

export function registrationData(input: unknown): RegistrationData {
  const data = record(input), leader = record(data.leader)
  const teamName = field(data.teamName)
  const college = field(leader.college), department = field(leader.department), year = field(leader.year)
  if (!teamName || !college || !department || !year) throw Error('Please complete all required fields.')
  if (teamName.length > 30) throw Error('Team name must be at most 30 characters.')
  if (data.acceptedCrewRules !== true) throw Error('Please confirm that you have read the crew rules.')
  const first = member(leader, false)!, second = member(data.member2, false)!, third = member(data.member3, true)
  const crew = third ? [first, second, third] : [first, second]
  if (['phone', 'email'].some(key => new Set(crew.map(m => m[key as 'phone' | 'email'])).size !== crew.length)) {
    throw Error('Each crew member must have a different phone number and email address.')
  }
  return { teamName, leader: { ...first, college, department, year }, member2: second, member3: third, acceptedCrewRules: true }
}
