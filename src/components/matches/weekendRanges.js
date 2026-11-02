function getLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getNextWeekendRange(referenceDate = new Date()) {
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  const daysUntilSaturday = (6 - today.getDay() + 7) % 7
  const saturday = new Date(today)

  if (today.getDay() === 0) {
    saturday.setDate(today.getDate() - 1)
  } else {
    saturday.setDate(today.getDate() + daysUntilSaturday)
  }

  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)

  return {
    start: getLocalDateKey(saturday),
    end: getLocalDateKey(sunday)
  }
}

export function getPreviousWeekendRange(referenceDate = new Date()) {
  const nextWeekend = getNextWeekendRange(referenceDate)
  const saturday = new Date(`${nextWeekend.start}T00:00:00`)
  saturday.setDate(saturday.getDate() - 7)
  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)

  return {
    start: getLocalDateKey(saturday),
    end: getLocalDateKey(sunday)
  }
}
