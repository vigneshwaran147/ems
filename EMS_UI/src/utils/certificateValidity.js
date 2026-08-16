// ems_frontend/src/utils/certificateValidity.js
//
// Certificate dates arrive as ISO `LocalDate` strings ("2026-08-02") — a plain
// calendar day with no zone. Everything here keeps them that way.

const DAY_MS = 86400000
const DAYS_PER_MONTH = 30.44

/**
 * Parses an ISO calendar date into local midnight.
 *
 * `new Date('2026-08-02')` is specified to parse as *UTC* midnight, which lands
 * on 1 Aug for anyone west of Greenwich and makes a certificate look a day
 * short. Splitting the parts and building a local date keeps the day the server
 * issued.
 */
export const parseIsoDate = (value) => {
  if (!value) return null
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

/** "02 Aug 2026" — matches the date form printed on the issued PDF. */
export const formatCertificateDate = (value) => {
  const date = parseIsoDate(value)
  if (!date) return '–'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const isExpired = (expiryDate, now = new Date()) => {
  const end = parseIsoDate(expiryDate)
  return Boolean(end) && end < now
}

/**
 * How much of a certificate's term is used up, and how much is left in words.
 *
 * The screen shows remaining validity as a bar as well as a date, so an expiry
 * creeping up is visible at a glance instead of requiring the reader to do date
 * arithmetic against today.
 */
export const validityOf = ({ issueDate, expiryDate }, now = new Date()) => {
  const start = parseIsoDate(issueDate)
  const end = parseIsoDate(expiryDate)

  if (!end) return { known: false, expired: false, percentElapsed: 0, remaining: 'No expiry' }

  const daysLeft = Math.ceil((end - now) / DAY_MS)
  if (daysLeft <= 0) return { known: true, expired: true, percentElapsed: 100, remaining: 'Expired' }

  const months = Math.floor(daysLeft / DAYS_PER_MONTH)
  const remaining =
    months >= 1
      ? `${months} month${months > 1 ? 's' : ''} remaining`
      : `${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining`

  // Without an issue date there is no term to measure against, so show the bar
  // empty rather than inventing a start point.
  const span = start ? end - start : 0
  const percentElapsed = span > 0 ? Math.min(Math.max(((now - start) / span) * 100, 0), 100) : 0

  return { known: true, expired: false, percentElapsed, remaining }
}

/** The certificate expiring soonest, for the wallet summary. */
export const nextExpiry = (certificates = []) =>
  certificates
    .filter((certificate) => certificate.expiryDate)
    .sort((a, b) => parseIsoDate(a.expiryDate) - parseIsoDate(b.expiryDate))[0] || null
