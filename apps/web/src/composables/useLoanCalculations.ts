import { computed, type Ref } from 'vue'
import type { LoanTerms } from '@/types'

/**
 * Composable for loan payment calculations
 */
export function useLoanCalculations(terms: Ref<LoanTerms>) {
  // Constants
  const YEAR_MS = 31556926000 // milliseconds in a year

  /**
   * Term length in milliseconds based on payment frequency
   */
  const termLengthMs = computed(() => {
    const freq = terms.value.frequency
    switch (freq) {
      case 4: return 7889231000    // Quarterly
      case 12: return 2629743000   // Monthly
      case 52: return 604800000    // Weekly
      case 365: return 86400000    // Daily
      case 8760: return 3600000    // Hourly
      default: return Math.floor(YEAR_MS / freq)
    }
  })

  /**
   * Payment unit label
   */
  const paymentUnit = computed(() => {
    const freq = terms.value.frequency
    if (freq === 12) return 'Months'
    if (freq === 4) return 'Quarters'
    if (freq === 52) return 'Weeks'
    if (freq === 365) return 'Days'
    return 'Payments'
  })

  /**
   * Total contract duration in years
   */
  const termInYears = computed(() => {
    return terms.value.installments / terms.value.frequency
  })

  /**
   * Formatted term length (e.g., "30 days", "1 month")
   */
  const formattedTermLength = computed(() => {
    return formatDuration(termLengthMs.value)
  })

  /**
   * Formatted total contract length
   */
  const formattedContractLength = computed(() => {
    const totalMs = termLengthMs.value * terms.value.installments
    return formatDuration(totalMs)
  })

  /**
   * Nominal payment per term (principal + interest portion)
   */
  const nominalTermPayment = computed(() => {
    const principal = Number(terms.value.principal) / 1_000_000 // Convert to ADA
    const apr = terms.value.apr / 10000 // Convert basis points to decimal
    const n = terms.value.installments
    const r = apr / terms.value.frequency // Rate per period

    if (r === 0) {
      return principal / n
    }

    // Standard amortization formula: P * [r(1+r)^n] / [(1+r)^n - 1]
    const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    return Math.round(payment * 100) / 100 // Round to 2 decimals
  })

  /**
   * Total interest over the life of the loan
   */
  const totalInterest = computed(() => {
    const principal = Number(terms.value.principal) / 1_000_000
    const totalPayments = nominalTermPayment.value * terms.value.installments
    return Math.round((totalPayments - principal) * 100) / 100
  })

  /**
   * Total cost to buyer (principal + interest + fees)
   */
  const totalCostToBuyer = computed(() => {
    const principal = Number(terms.value.principal) / 1_000_000
    return principal + totalInterest.value + Number(terms.value.transferFee) / 1_000_000
  })

  /**
   * Total value to seller (principal + interest - fees)
   */
  const totalValueToSeller = computed(() => {
    const principal = Number(terms.value.principal) / 1_000_000
    return principal + totalInterest.value - Number(terms.value.transferFee) / 1_000_000
  })

  /**
   * Late payment window (10% of term length)
   */
  const lateWindowMs = computed(() => {
    return Math.floor(termLengthMs.value * 0.1)
  })

  return {
    termLengthMs,
    paymentUnit,
    termInYears,
    formattedTermLength,
    formattedContractLength,
    nominalTermPayment,
    totalInterest,
    totalCostToBuyer,
    totalValueToSeller,
    lateWindowMs,
  }
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30.44)
  const years = Math.floor(days / 365.25)

  if (years >= 1) {
    const remainingMonths = Math.floor((days - years * 365.25) / 30.44)
    if (remainingMonths > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
    }
    return `${years} year${years > 1 ? 's' : ''}`
  }
  if (months >= 1) {
    return `${months} month${months > 1 ? 's' : ''}`
  }
  if (days >= 1) {
    return `${days} day${days > 1 ? 's' : ''}`
  }
  if (hours >= 1) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  if (minutes >= 1) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  return `${seconds} second${seconds > 1 ? 's' : ''}`
}

/**
 * Format time until a future date
 */
export function formatTimeUntil(targetMs: number): string {
  const now = Date.now()
  const diff = targetMs - now

  if (diff <= 0) {
    return 'Now'
  }

  return formatDuration(diff)
}

/**
 * Format time since a past date
 */
export function formatTimeSince(pastMs: number): string {
  const now = Date.now()
  const diff = now - pastMs

  if (diff <= 0) {
    return 'Just now'
  }

  return formatDuration(diff) + ' ago'
}
