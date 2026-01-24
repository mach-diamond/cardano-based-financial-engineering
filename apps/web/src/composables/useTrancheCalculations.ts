import { computed, type Ref } from 'vue'

/**
 * Tranche configuration for calculations
 */
export interface TrancheConfig {
  senior: { allocation: number; yieldModifier: number }
  mezzanine: { allocation: number; yieldModifier: number }
  junior: { allocation: number; yieldModifier: number }
}

/**
 * Tranche distribution result
 */
export interface TrancheDistribution {
  senior: bigint
  mezzanine: bigint
  junior: bigint
}

/**
 * Composable for CDO tranche calculations
 */
export function useTrancheCalculations(
  config: Ref<TrancheConfig>,
  totalPrincipal: Ref<bigint>,
  totalYield: Ref<bigint>
) {
  /**
   * Validate tranche allocations sum to 100%
   */
  const isValidAllocation = computed(() => {
    const total =
      config.value.senior.allocation +
      config.value.mezzanine.allocation +
      config.value.junior.allocation
    return total === 100
  })

  /**
   * Total allocation percentage
   */
  const totalAllocation = computed(() => {
    return (
      config.value.senior.allocation +
      config.value.mezzanine.allocation +
      config.value.junior.allocation
    )
  })

  /**
   * Principal allocated to senior tranche
   */
  const seniorPrincipal = computed(() => {
    return (totalPrincipal.value * BigInt(config.value.senior.allocation)) / 100n
  })

  /**
   * Principal allocated to mezzanine tranche
   */
  const mezzaninePrincipal = computed(() => {
    return (totalPrincipal.value * BigInt(config.value.mezzanine.allocation)) / 100n
  })

  /**
   * Principal allocated to junior tranche
   */
  const juniorPrincipal = computed(() => {
    return (totalPrincipal.value * BigInt(config.value.junior.allocation)) / 100n
  })

  /**
   * Calculate waterfall distribution for a given yield amount
   *
   * The waterfall prioritizes senior tranche payments:
   * 1. Senior gets their allocation first (modified by yield modifier)
   * 2. Mezzanine gets theirs second
   * 3. Junior gets what remains
   *
   * This protects senior investors from losses.
   */
  const waterfallDistribution = computed<TrancheDistribution>(() => {
    const yield_ = totalYield.value
    if (yield_ === 0n) {
      return { senior: 0n, mezzanine: 0n, junior: 0n }
    }

    // Calculate base yields based on allocation
    const seniorBase = (yield_ * BigInt(config.value.senior.allocation)) / 100n
    const mezzBase = (yield_ * BigInt(config.value.mezzanine.allocation)) / 100n
    const juniorBase = (yield_ * BigInt(config.value.junior.allocation)) / 100n

    // Apply yield modifiers (scaled by 100, so 70 = 0.7x, 170 = 1.7x)
    const seniorYield = (seniorBase * BigInt(config.value.senior.yieldModifier)) / 100n
    const mezzYield = (mezzBase * BigInt(config.value.mezzanine.yieldModifier)) / 100n

    // Junior gets the remainder (absorbs any surplus or shortfall)
    const juniorYield = yield_ - seniorYield - mezzYield

    return {
      senior: seniorYield > 0n ? seniorYield : 0n,
      mezzanine: mezzYield > 0n ? mezzYield : 0n,
      junior: juniorYield > 0n ? juniorYield : 0n,
    }
  })

  /**
   * Calculate effective yield rate for each tranche
   * Returns APR in basis points
   */
  const effectiveRates = computed(() => {
    const dist = waterfallDistribution.value

    // Calculate rate as (yield / principal) * 10000 for basis points
    const seniorRate =
      seniorPrincipal.value > 0n
        ? Number((dist.senior * 10000n) / seniorPrincipal.value)
        : 0
    const mezzRate =
      mezzaninePrincipal.value > 0n
        ? Number((dist.mezzanine * 10000n) / mezzaninePrincipal.value)
        : 0
    const juniorRate =
      juniorPrincipal.value > 0n
        ? Number((dist.junior * 10000n) / juniorPrincipal.value)
        : 0

    return {
      senior: seniorRate,
      mezzanine: mezzRate,
      junior: juniorRate,
    }
  })

  /**
   * Format basis points as percentage string
   */
  function formatRate(basisPoints: number): string {
    return (basisPoints / 100).toFixed(2) + '%'
  }

  /**
   * Calculate redemption value for tranche tokens
   */
  function calculateRedemptionValue(
    tranche: 'senior' | 'mezzanine' | 'junior',
    tokenAmount: bigint,
    totalTokens: bigint,
    bondValue: bigint,
    redemptionFee: number // basis points
  ): { grossValue: bigint; fee: bigint; netValue: bigint } {
    // Get tranche's share of total bond value
    const allocation = config.value[tranche].allocation
    const trancheValue = (bondValue * BigInt(allocation)) / 100n

    // Calculate pro-rata share based on tokens held
    const grossValue = (trancheValue * tokenAmount) / totalTokens

    // Apply redemption fee
    const fee = (grossValue * BigInt(redemptionFee)) / 10000n
    const netValue = grossValue - fee

    return { grossValue, fee, netValue }
  }

  /**
   * Calculate collateral coverage ratio
   * Returns ratio * 100 (e.g., 150 = 1.5x coverage)
   */
  function calculateCoverageRatio(
    collateralValue: bigint,
    tranche: 'senior' | 'mezzanine' | 'junior'
  ): number {
    let targetValue: bigint

    switch (tranche) {
      case 'senior':
        targetValue = seniorPrincipal.value
        break
      case 'mezzanine':
        targetValue = seniorPrincipal.value + mezzaninePrincipal.value
        break
      case 'junior':
        targetValue = totalPrincipal.value
        break
    }

    if (targetValue === 0n) return 0

    return Number((collateralValue * 100n) / targetValue)
  }

  /**
   * Weighted average yield of collateral pool
   */
  function calculateWeightedAverageYield(
    collateral: Array<{ principal: bigint; apr: number }>
  ): number {
    if (collateral.length === 0) return 0

    let totalWeightedYield = 0n
    let totalPrincipal = 0n

    for (const c of collateral) {
      totalWeightedYield += c.principal * BigInt(c.apr)
      totalPrincipal += c.principal
    }

    if (totalPrincipal === 0n) return 0

    return Number(totalWeightedYield / totalPrincipal)
  }

  return {
    // Validation
    isValidAllocation,
    totalAllocation,

    // Principal allocations
    seniorPrincipal,
    mezzaninePrincipal,
    juniorPrincipal,

    // Yield calculations
    waterfallDistribution,
    effectiveRates,

    // Utility functions
    formatRate,
    calculateRedemptionValue,
    calculateCoverageRatio,
    calculateWeightedAverageYield,
  }
}
