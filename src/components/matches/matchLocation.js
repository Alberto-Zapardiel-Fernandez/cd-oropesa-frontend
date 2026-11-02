export function getMatchLocation(venue) {
  if (!venue) return 'UNKNOWN'

  if (venue.isHomeVenue || venue.city?.trim().toLocaleLowerCase('es') === 'oropesa') {
    return 'HOME'
  }

  return 'AWAY'
}
