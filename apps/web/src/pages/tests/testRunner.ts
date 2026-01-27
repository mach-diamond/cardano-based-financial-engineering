import { type Ref } from 'vue'
import type { LoanContract } from './components/Contracts_Loans.vue'
import type { CLOContract } from './components/Contracts_CLOs.vue'

export interface Identity {
    id: string
    name: string
    role: string
    address: string
    wallets: {
        id: string
        name: string
        address: string
        balance: bigint
        assets: {
            policyId: string
            assetName: string
            quantity: bigint
        }[]
    }[]
}

export interface Phase {
    id: number
    name: string
    description: string
    status: string
    expanded: boolean
    steps: any[]
}

export interface LogFunction {
    (text: string, type?: 'info' | 'success' | 'error' | 'phase'): void
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function simulatePhase(
    index: number,
    phaseName: string,
    fn: () => Promise<void>,
    currentPhase: Ref<number>,
    phases: Ref<Phase[]>,
    log: LogFunction
) {
    currentPhase.value = index + 1
    phases.value[index].status = 'running'
    log(`Phase ${index + 1}: ${phaseName}`, 'phase')
    await fn()
    phases.value[index].status = 'passed'
}

export async function runTests(
    mode: 'demo' | 'emulator' | 'preview',
    identities: Ref<Identity[]>,
    phases: Ref<Phase[]>,
    isRunning: Ref<boolean>,
    currentPhase: Ref<number>,
    currentStepName: Ref<string>,
    log: LogFunction,
    stats: Ref<{ passed: number, failed: number }>,
    loanContracts?: Ref<LoanContract[]>,
    cloContracts?: Ref<CLOContract[]>
) {
    isRunning.value = true
    currentPhase.value = 1

    // Reset states
    identities.value.forEach(id => {
        id.wallets[0].balance = 0n
        id.wallets[0].assets = []
    })
    phases.value.forEach(p => {
        p.status = 'pending'
        p.steps.forEach((s: { status: string }) => s.status = 'pending')
    })
    // Clear contracts
    if (loanContracts) loanContracts.value = []
    if (cloContracts) cloContracts.value = []

    log(`Starting ${mode.toUpperCase()} mode: Realistic Financial Lifecycle...`, 'phase')
    log('═'.repeat(50))

    // Phase 1: Identities
    await simulatePhase(0, 'Setup & Identities', async () => {
        for (const identity of identities.value) {
            currentStepName.value = `Funding ${identity.name}`
            log(`  Creating wallet for ${identity.name} (${identity.role})...`, 'info')
            await delay(200)
            identity.wallets[0].balance = 5000000000n // 5000 ADA
            log(`  Funded with 5000 testnet ADA`, 'success')
            // Mark step as passed for manual feedback
            const step = phases.value[0].steps.find((s: any) => s.targetId === identity.id)
            if (step) step.status = 'passed'
        }
    }, currentPhase, phases, log)

    // Phase 2: Tokenization (per Originator)
    await simulatePhase(1, 'Asset Tokenization', async () => {
        const mintConfig = [
            { id: 'orig-jewelry', asset: 'Diamond', qty: 2n, type: 'jewelry' },
            { id: 'orig-airplane', asset: 'Airplane', qty: 10n, type: 'airplane' },
            { id: 'orig-home', asset: 'Home', qty: 1n, type: 'realestate' },
            { id: 'orig-realestate', asset: 'RealEstate', qty: 10n, type: 'realestate' },
            { id: 'orig-yacht', asset: 'Boat', qty: 3n, type: 'boat' },
        ]
        for (const config of mintConfig) {
            const orig = identities.value.find(i => i.id === config.id)!
            currentStepName.value = `Minting ${config.asset} tokens for ${orig.name}`
            log(`  ${orig.name}: Minting ${config.qty} ${config.asset} tokens...`, 'info')
            await delay(400)
            orig.wallets[0].assets.push({
                policyId: 'policy_' + config.asset.toLowerCase(),
                assetName: config.asset,
                quantity: config.qty
            })
            log(`  Confirmed ${config.qty} ${config.asset} in wallet`, 'success')
            const step = phases.value[1].steps.find((s: any) => s.originatorId === config.id)
            if (step) step.status = 'passed'
        }
    }, currentPhase, phases, log)

    // Phase 3: Create Loans
    await simulatePhase(2, 'Initialize Loan Contracts', async () => {
        const loanDefs = [
            { borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2, principal: 15000, apr: 6, termLength: '12 months' },
            { borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000, apr: 4, termLength: '60 months' },
            { borrowerId: 'bor-superfastcargo', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000, apr: 4, termLength: '60 months' },
            { borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500, apr: 5, termLength: '24 months' },
            { borrowerId: 'bor-luxuryapt', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500, apr: 5.5, termLength: '24 months' },
            { borrowerId: 'bor-boatop', originatorId: 'orig-yacht', asset: 'Boat', qty: 3, principal: 8000, apr: 7, termLength: '36 months' },
        ]
        for (const loan of loanDefs) {
            const borrower = identities.value.find(i => i.id === loan.borrowerId)!
            const originator = identities.value.find(i => i.id === loan.originatorId)!
            currentStepName.value = `Loan: ${borrower.name} buys ${loan.qty} ${loan.asset} from ${originator.name}`
            log(`  ${borrower.name}: Loan for ${loan.qty} ${loan.asset} @ ${loan.principal} ADA`, 'info')
            await delay(300)
            // Transfer asset from originator to borrower (simulated via loan contract)
            const origAsset = originator.wallets[0].assets.find(a => a.assetName === loan.asset)
            if (origAsset) {
                origAsset.quantity -= BigInt(loan.qty)
                if (origAsset.quantity <= 0n) {
                    originator.wallets[0].assets = originator.wallets[0].assets.filter(a => a.assetName !== loan.asset)
                }
            }
            // Add to loanContracts
            if (loanContracts) {
                loanContracts.value.push({
                    id: `LOAN-${loan.borrowerId}-${loan.asset}`,
                    alias: `${borrower.name} - ${loan.asset} Loan`,
                    subtype: 'Asset-Backed',
                    collateral: {
                        quantity: loan.qty,
                        assetName: loan.asset,
                        policyId: 'policy_' + loan.asset.toLowerCase()
                    },
                    principal: loan.principal * 1_000_000, // Convert to lovelace
                    apr: loan.apr,
                    termLength: loan.termLength,
                    status: 'passed',
                    borrower: borrower.name,
                    originator: originator.name
                })
            }
            log(`  Collateral Token issued, asset escrowed`, 'success')
            const step = phases.value[2].steps.find((s: any) => s.borrowerId === loan.borrowerId)
            if (step) step.status = 'passed'
        }
    }, currentPhase, phases, log)

    // Phase 4: CLO
    await simulatePhase(3, 'Collateral Bundle & CLO', async () => {
        const analystWallet = identities.value.find(i => i.role === 'Analyst')!.wallets[0]
        currentStepName.value = 'Cardano Investment Bank: Bundling Collateral Tokens'
        log(`  Bundling 6 Loan Collateral Tokens into CLO`, 'info')
        await delay(600)
        analystWallet.assets.push({
            policyId: 'policy_clo_manager',
            assetName: 'CLO-Manager-NFT',
            quantity: 1n
        })
        log(`  CLO Bond deployed with 3 tranches`, 'success')
        phases.value[3].steps[0].status = 'passed'
        phases.value[3].steps[1].status = 'passed'

        // Add CLO contract
        if (cloContracts) {
            const totalValue = loanContracts ? loanContracts.value.reduce((sum, l) => sum + l.principal, 0) : 128000 * 1_000_000
            cloContracts.value.push({
                id: 'CLO-001',
                alias: 'MintMatrix CLO Series 1',
                subtype: 'Waterfall',
                tranches: [
                    { name: 'Senior', allocation: 60, yieldModifier: 0.8 },
                    { name: 'Mezzanine', allocation: 25, yieldModifier: 1.0 },
                    { name: 'Junior', allocation: 15, yieldModifier: 1.5 }
                ],
                totalValue,
                collateralCount: loanContracts ? loanContracts.value.length : 6,
                status: 'passed',
                manager: 'Cardano Investment Bank'
            })
        }

        currentStepName.value = 'Distributing Tranche Tokens to Investors'
        await delay(400)
        log(`  Senior, Mezzanine, Junior tokens distributed`, 'success')
        phases.value[3].steps[2].status = 'passed'
    }, currentPhase, phases, log)

    log('═'.repeat(50))
    log(`TEST COMPLETE (${mode.toUpperCase()} MODE)`, 'phase')
    log(`Passed: ${stats.value.passed} | Failed: ${stats.value.failed}`, 'success')

    isRunning.value = false
    currentStepName.value = 'Complete'
}

export async function executeStep(
    phase: Phase,
    step: any,
    identities: Ref<Identity[]>,
    phases: Ref<Phase[]>,
    isRunning: Ref<boolean>,
    currentStepName: Ref<string>,
    log: LogFunction,
    loanContracts?: Ref<LoanContract[]>,
    cloContracts?: Ref<CLOContract[]>
) {
    isRunning.value = true
    step.status = 'running'
    phase.status = 'running'
    currentStepName.value = step.name

    try {
        // Phase 1: Fund identity
        if (phase.id === 1 && 'targetId' in step) {
            const identity = identities.value.find(i => i.id === (step as { targetId: string }).targetId)
            if (identity) {
                log(`  Funding ${identity.name}...`, 'info')
                await delay(300)
                identity.wallets[0].balance = 5000000000n
                log(`  ✓ Funded with 5000 testnet ADA`, 'success')
            }
        }

        // Phase 2: Mint assets
        if (phase.id === 2 && 'originatorId' in step) {
            const s = step as { originatorId: string; asset: string; qty: bigint }
            const orig = identities.value.find(i => i.id === s.originatorId)
            if (orig) {
                log(`  ${orig.name}: Minting ${s.qty} ${s.asset} tokens...`, 'info')
                await delay(400)
                orig.wallets[0].assets.push({
                    policyId: 'policy_' + s.asset.toLowerCase(),
                    assetName: s.asset,
                    quantity: s.qty
                })
                log(`  ✓ Minted ${s.qty} ${s.asset} tokens`, 'success')
            }
        }

        // Phase 3: Create loans
        if (phase.id === 3 && 'borrowerId' in step) {
            const s = step as { borrowerId: string; originatorId: string; asset: string; qty: number; principal: number }
            const borrower = identities.value.find(i => i.id === s.borrowerId)
            const originator = identities.value.find(i => i.id === s.originatorId)
            if (borrower && originator) {
                log(`  Loan: ${borrower.name} ← ${s.qty} ${s.asset} from ${originator.name}`, 'info')
                await delay(400)
                // Transfer asset
                const origAsset = originator.wallets[0].assets.find(a => a.assetName === s.asset)
                if (origAsset) {
                    origAsset.quantity -= BigInt(s.qty)
                    if (origAsset.quantity <= 0n) {
                        originator.wallets[0].assets = originator.wallets[0].assets.filter(a => a.assetName !== s.asset)
                    }
                }
                // Add collateral token to borrower
                borrower.wallets[0].assets.push({
                    policyId: 'policy_coll_' + s.asset.toLowerCase(),
                    assetName: 'Coll-' + s.asset,
                    quantity: BigInt(s.qty)
                })
                // Add to loanContracts
                if (loanContracts) {
                    const termMap: Record<string, string> = {
                        'Diamond': '12 months',
                        'Airplane': '60 months',
                        'RealEstate': '24 months',
                        'Boat': '36 months',
                        'Home': '12 months'
                    }
                    const aprMap: Record<string, number> = {
                        'Diamond': 6,
                        'Airplane': 4,
                        'RealEstate': 5,
                        'Boat': 7,
                        'Home': 6
                    }
                    loanContracts.value.push({
                        id: `LOAN-${s.borrowerId}-${s.asset}`,
                        alias: `${borrower.name} - ${s.asset} Loan`,
                        subtype: 'Asset-Backed',
                        collateral: {
                            quantity: s.qty,
                            assetName: s.asset,
                            policyId: 'policy_' + s.asset.toLowerCase()
                        },
                        principal: s.principal * 1_000_000,
                        apr: aprMap[s.asset] || 5,
                        termLength: termMap[s.asset] || '12 months',
                        status: 'passed',
                        borrower: borrower.name,
                        originator: originator.name
                    })
                }
                log(`  ✓ Collateral token issued, principal: ${s.principal} ADA`, 'success')
            }
        }

        // Phase 4: CLO steps
        if (phase.id === 4) {
            if (step.id === 'C1') {
                log(`  Bundling 6 collateral tokens into CLO...`, 'info')
                await delay(500)
                log(`  ✓ Collateral bundle created`, 'success')
            } else if (step.id === 'C2') {
                log(`  Deploying CLO Contract with 3 tranches...`, 'info')
                await delay(500)
                const analyst = identities.value.find(i => i.role === 'Analyst')
                if (analyst) {
                    analyst.wallets[0].assets.push({
                        policyId: 'policy_clo',
                        assetName: 'CLO-Manager-NFT',
                        quantity: 1n
                    })
                }
                // Add CLO contract
                if (cloContracts) {
                    const totalValue = loanContracts ? loanContracts.value.reduce((sum, l) => sum + l.principal, 0) : 128000 * 1_000_000
                    cloContracts.value.push({
                        id: 'CLO-001',
                        alias: 'MintMatrix CLO Series 1',
                        subtype: 'Waterfall',
                        tranches: [
                            { name: 'Senior', allocation: 60, yieldModifier: 0.8 },
                            { name: 'Mezzanine', allocation: 25, yieldModifier: 1.0 },
                            { name: 'Junior', allocation: 15, yieldModifier: 1.5 }
                        ],
                        totalValue,
                        collateralCount: loanContracts ? loanContracts.value.length : 6,
                        status: 'passed',
                        manager: 'Cardano Investment Bank'
                    })
                }
                log(`  ✓ CLO deployed: Senior/Mezzanine/Junior tranches`, 'success')
            } else if (step.id === 'C3') {
                log(`  Distributing tranche tokens to investors...`, 'info')
                await delay(400)
                const tranches = ['Senior', 'Mezzanine', 'Junior']
                const investorIds = ['inv-1', 'inv-2', 'inv-3']
                tranches.forEach((tranche, i) => {
                    const inv = identities.value.find(id => id.id === investorIds[i])
                    if (inv) {
                        inv.wallets[0].assets.push({
                            policyId: 'policy_tranche',
                            assetName: tranche + '-Tranche',
                            quantity: 100n
                        })
                    }
                })
                log(`  ✓ Tranche tokens distributed`, 'success')
            }
        }

        step.status = 'passed'

        // Check if all steps in phase are complete
        const allStepsPassed = phase.steps.every((s: { status: string }) => s.status === 'passed')
        if (allStepsPassed) {
            phase.status = 'passed'
        } else {
            phase.status = 'pending'
        }

    } catch (err) {
        step.status = 'failed'
        phase.status = 'failed'
        log(`  ✗ Error: ${(err as Error).message}`, 'error')
    } finally {
        isRunning.value = false
        currentStepName.value = ''
    }
}

export async function executePhase(
    phase: Phase,
    identities: Ref<Identity[]>,
    phases: Ref<Phase[]>,
    isRunning: Ref<boolean>,
    currentStepName: Ref<string>,
    log: LogFunction,
    loanContracts?: Ref<LoanContract[]>,
    cloContracts?: Ref<CLOContract[]>
) {
    log(`Starting Phase: ${phase.name}`, 'phase')
    for (const step of phase.steps) {
        if (step.status === 'pending') {
            await executeStep(phase, step, identities, phases, isRunning, currentStepName, log, loanContracts, cloContracts)
            await delay(100) // Small delay between steps for UI feedback
        }
    }
    log(`Completed Phase: ${phase.name}`, 'success')
}

export function getStepAction(phaseId: number): string {
    switch (phaseId) {
        case 1: return 'Fund'
        case 2: return 'Mint'
        case 3: return 'Initiate Loan'
        case 4: return 'Execute CLO'
        case 5: return 'Payment'
        default: return 'Run'
    }
}

export function getStepActionClass(phaseId: number): string {
    switch (phaseId) {
        case 1: return 'fund'
        case 2: return 'mint'
        case 3: return 'loan'
        case 4: return 'clo'
        case 5: return 'payment'
        default: return 'default'
    }
}

export function getStepEntity(
    step: any,
    identities: Identity[]
): string {
    // Phase 1: Extract identity name
    if ('targetId' in step) {
        const identity = identities.find(i => i.id === step.targetId)
        return identity?.name || step.name
    }
    // Phase 2: Asset name
    if ('asset' in step && !('borrowerId' in step)) {
        return `${step.asset} tokens`
    }
    // Phase 3: Borrower + Asset (Loan)
    if ('borrowerId' in step && 'asset' in step) {
        const borrower = identities.find(i => i.id === step.borrowerId)
        return `${borrower?.name || ''} ← ${step.asset}`
    }
    // Phase 5: Payment
    if ('borrowerId' in step && 'amount' in step) {
        const borrower = identities.find(i => i.id === step.borrowerId)
        return `${borrower?.name || ''} (${step.amount} ADA)`
    }
    // Phase 4: Just the name
    return step.name.replace('Bundle ', '').replace('Deploy ', '').replace('Distribute ', '')
}
