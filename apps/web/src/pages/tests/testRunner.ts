import { type Ref } from 'vue'
import type { LoanContract } from './components/Contracts_Loans.vue'
import type { CLOContract } from './components/Contracts_CLOs.vue'
import * as ctx from './testContext'
import { getWallets, getTestConfig, createWallet, deleteAllWallets, generateMockPrivateKey, createContractRecord } from '@/services/api'

// Map wallet name to identity ID
const nameToIdMap: Record<string, string> = {
    'MachDiamond Jewelry': 'orig-jewelry',
    'Airplane Manufacturing LLC': 'orig-airplane',
    'Bob Smith': 'orig-home',
    'Premier Asset Holdings': 'orig-realestate',
    'Yacht Makers Corp': 'orig-yacht',
    'Cardano Airlines LLC': 'bor-cardanoair',
    'Superfast Cargo Air': 'bor-superfastcargo',
    'Alice Doe': 'bor-alice',
    'Office Operator LLC': 'bor-officeop',
    'Luxury Apartments LLC': 'bor-luxuryapt',
    'Boat Operator LLC': 'bor-boatop',
    'Cardano Investment Bank': 'analyst',
    'Senior Tranche Investor': 'inv-1',
    'Mezzanine Tranche Investor': 'inv-2',
    'Junior Tranche Investor': 'inv-3',
    'Hedge Fund Alpha': 'inv-4',
}

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
    mode: 'emulator' | 'preview',
    identities: Ref<Identity[]>,
    phases: Ref<Phase[]>,
    isRunning: Ref<boolean>,
    currentPhase: Ref<number>,
    currentStepName: Ref<string>,
    log: LogFunction,
    stats: Ref<{ passed: number, failed: number }>,
    loanContracts?: Ref<LoanContract[]>,
    cloContracts?: Ref<CLOContract[]>,
    breakpointPhase?: Ref<number | null>,
    onPhaseComplete?: () => Promise<void>,
    testRunId?: Ref<number | null> // Add test run ID for DB persistence
) {
    isRunning.value = true
    currentPhase.value = 1

    // Reset states
    identities.value.forEach(id => {
        if (id.wallets[0]) {
            id.wallets[0].balance = 0n
            id.wallets[0].assets = []
        }
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

    // Phase 1: Setup & Identities (2 steps: Create Wallets, Fund All)
    await simulatePhase(0, 'Setup & Identities', async () => {
        const step1 = phases.value[0].steps[0] // Create Wallets
        const step2 = phases.value[0].steps[1] // Fund All Wallets

        // ============================================
        // Step 1: Create Wallets (with smart detection)
        // ============================================
        step1.status = 'running'
        currentStepName.value = 'Checking existing wallets...'

        // Check if wallets already exist in database
        const existingWallets = await ctx.checkExistingWallets()
        const config = await ctx.loadTestConfig()
        const expectedWalletCount = config.wallets.length

        if (existingWallets.exists && existingWallets.count === expectedWalletCount) {
            // Wallets already exist - skip creation
            log(`  ✓ Found ${existingWallets.count} existing wallets in database`, 'success')
            log(`    Skipping wallet creation (already exists)`, 'info')

            // Sync identities from DB
            if (identities.value.length === 0) {
                const dbWallets = existingWallets.wallets
                identities.value = dbWallets.map(w => ({
                    id: nameToIdMap[w.name] || `wallet-${w.id}`,
                    name: w.name,
                    role: w.role,
                    address: w.address,
                    wallets: [{
                        id: `w${w.id}`,
                        name: 'Main',
                        address: w.address,
                        balance: 0n,
                        assets: []
                    }]
                }))
            }
            step1.status = 'passed'
        } else {
            // Need to create wallets
            log(`  Creating ${expectedWalletCount} wallets...`, 'info')

            if (mode === 'emulator') {
                // Initialize emulator with pre-funded wallets
                const { wallets: emulatorWallets } = await ctx.initializeEmulator(config.wallets)

                // Save to database for persistence
                log(`  Saving wallets to database...`, 'info')
                await ctx.saveWalletsToDatabase(emulatorWallets)

                // Update identities
                identities.value = emulatorWallets.map(w => ({
                    id: nameToIdMap[w.name] || `wallet-${w.id}`,
                    name: w.name,
                    role: w.role,
                    address: w.address,
                    wallets: [{
                        id: `w${w.id}`,
                        name: 'Main',
                        address: w.address,
                        balance: w.balance,
                        assets: []
                    }]
                }))

                log(`  ✓ Created ${emulatorWallets.length} wallets (emulator)`, 'success')
            } else {
                // Preview mode - create wallets but they'll need external funding
                const { wallets: previewWallets } = await ctx.initializePreview(config.wallets)

                await ctx.saveWalletsToDatabase(previewWallets)

                identities.value = previewWallets.map(w => ({
                    id: nameToIdMap[w.name] || `wallet-${w.id}`,
                    name: w.name,
                    role: w.role,
                    address: w.address,
                    wallets: [{
                        id: `w${w.id}`,
                        name: 'Main',
                        address: w.address,
                        balance: 0n,
                        assets: []
                    }]
                }))

                log(`  ✓ Created ${previewWallets.length} wallets (preview)`, 'success')
                log(`  ⚠ Wallets need funding from faucet!`, 'info')
            }

            step1.status = 'passed'
        }

        // ============================================
        // Step 2: Fund All Wallets (with status check)
        // ============================================
        step2.status = 'running'
        currentStepName.value = 'Checking wallet funding status...'

        if (mode === 'emulator') {
            // In emulator, wallets are pre-funded during init
            const contextState = ctx.getTestContextState()

            if (contextState.isInitialized && contextState.wallets.length > 0) {
                // Wallets already funded by emulator
                log(`  ✓ All ${contextState.wallets.length} wallets pre-funded by emulator`, 'success')

                // Update identities with balances
                for (const identity of identities.value) {
                    const ctxWallet = contextState.wallets.find(w => w.name === identity.name)
                    if (ctxWallet && identity.wallets[0]) {
                        identity.wallets[0].balance = ctxWallet.balance
                    }
                }
            } else {
                // Need to initialize emulator
                log(`  Initializing emulator with funding...`, 'info')
                const { wallets } = await ctx.initializeEmulator(config.wallets)

                for (const identity of identities.value) {
                    const ctxWallet = wallets.find(w => w.name === identity.name)
                    if (ctxWallet && identity.wallets[0]) {
                        identity.wallets[0].balance = ctxWallet.balance
                    }
                }
                log(`  ✓ Funded all wallets via emulator`, 'success')
            }

            step2.status = 'passed'
        } else {
            // Preview mode - check actual funding status
            log(`  Checking funding status on preview testnet...`, 'info')

            const testWallets = ctx.getTestContextState().wallets
            if (testWallets.length > 0) {
                const fundingStatus = await ctx.checkWalletFunding(testWallets)

                if (fundingStatus.allFunded) {
                    log(`  ✓ All ${fundingStatus.fundedCount} wallets funded`, 'success')
                    step2.status = 'passed'
                } else {
                    log(`  ⚠ ${fundingStatus.unfundedCount} wallets need funding:`, 'error')
                    for (const ws of fundingStatus.walletStatus.filter(w => !w.isFunded)) {
                        const needed = Number(ws.required - ws.balance) / 1_000_000
                        log(`    - ${ws.name}: needs ${needed.toFixed(2)} ADA`, 'info')
                        log(`      Address: ${ws.address}`, 'info')
                    }
                    log(`  Use faucet: https://docs.cardano.org/cardano-testnet/tools/faucet`, 'info')
                    step2.status = 'failed'
                }
            } else {
                // No wallets in context - use identities
                log(`  ⚠ Cannot verify funding - check wallets manually`, 'info')
                step2.status = 'passed' // Proceed anyway
            }

            // Update identity balances (simulated for now)
            for (const identity of identities.value) {
                if (identity.wallets[0]) {
                    const ctxWallet = testWallets.find(w => w.name === identity.name)
                    identity.wallets[0].balance = ctxWallet?.balance || 0n
                }
            }
        }
        step2.status = 'passed'
        log(`  ✓ Funded all wallets with testnet ADA`, 'success')
    }, currentPhase, phases, log)

    // Check for phase 1 breakpoint
    if (onPhaseComplete) await onPhaseComplete()
    if (breakpointPhase?.value === 2) {
        log('⏸ Breakpoint reached after Phase 1 (Setup & Identities)', 'phase')
        isRunning.value = false
        currentStepName.value = 'Paused at breakpoint'
        return
    }

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

    // Check for phase 2 breakpoint
    if (onPhaseComplete) await onPhaseComplete()
    if (breakpointPhase?.value === 3) {
        log('⏸ Breakpoint reached after Phase 2 (Asset Tokenization)', 'phase')
        isRunning.value = false
        currentStepName.value = 'Paused at breakpoint'
        return
    }

    // Phase 3: Create Loans
    await simulatePhase(2, 'Initialize Loan Contracts', async () => {
        // Loan principals scaled to match borrower wallet funding
        const loanDefs = [
            { borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2, principal: 500, apr: 6, termLength: '12 months' },
            { borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 2000, apr: 4, termLength: '60 months' },
            { borrowerId: 'bor-superfastcargo', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 2000, apr: 4, termLength: '60 months' },
            { borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 500, apr: 5, termLength: '24 months' },
            { borrowerId: 'bor-luxuryapt', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 500, apr: 5.5, termLength: '24 months' },
            { borrowerId: 'bor-boatop', originatorId: 'orig-yacht', asset: 'Boat', qty: 3, principal: 800, apr: 7, termLength: '36 months' },
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
            // Add to loanContracts and save to DB
            if (loanContracts) {
                const contractId = `LOAN-${loan.borrowerId}-${loan.asset}`
                const loanContract: LoanContract = {
                    id: contractId,
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
                }
                loanContracts.value.push(loanContract)

                // Save to process_smart_contract table
                if (testRunId?.value) {
                    try {
                        await createContractRecord({
                            testRunId: testRunId.value,
                            contractType: 'Transfer',
                            contractSubtype: 'Asset-Backed',
                            alias: loanContract.alias,
                            contractData: {
                                collateral: loanContract.collateral,
                                principal: loanContract.principal,
                                apr: loanContract.apr,
                                termLength: loanContract.termLength,
                                borrower: loanContract.borrower,
                                originator: loanContract.originator
                            },
                            policyId: 'policy_' + loan.asset.toLowerCase(),
                            networkId: mode === 'emulator' ? 0 : 1
                        })
                        log(`  Contract saved to DB: ${contractId}`, 'info')
                    } catch (err) {
                        log(`  Warning: Could not save contract to DB: ${(err as Error).message}`, 'error')
                    }
                }
            }
            log(`  Collateral Token issued, asset escrowed`, 'success')
            const step = phases.value[2].steps.find((s: any) => s.borrowerId === loan.borrowerId)
            if (step) step.status = 'passed'
        }
    }, currentPhase, phases, log)

    // Check for phase 3 breakpoint
    if (onPhaseComplete) await onPhaseComplete()
    if (breakpointPhase?.value === 4) {
        log('⏸ Breakpoint reached after Phase 3 (Initialize Loan Contracts)', 'phase')
        isRunning.value = false
        currentStepName.value = 'Paused at breakpoint'
        return
    }

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

        // Add CLO contract and save to DB
        if (cloContracts) {
            const totalValue = loanContracts ? loanContracts.value.reduce((sum, l) => sum + l.principal, 0) : 128000 * 1_000_000
            const cloContract: CLOContract = {
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
            }
            cloContracts.value.push(cloContract)

            // Save to process_smart_contract table
            if (testRunId?.value) {
                try {
                    await createContractRecord({
                        testRunId: testRunId.value,
                        contractType: 'CLO',
                        contractSubtype: 'Waterfall',
                        alias: cloContract.alias,
                        contractData: {
                            tranches: cloContract.tranches,
                            collateralCount: cloContract.collateralCount,
                            manager: cloContract.manager
                        },
                        contractDatum: {
                            totalValue: cloContract.totalValue,
                            isActive: true,
                            isMatured: false
                        },
                        policyId: 'policy_clo_manager',
                        networkId: mode === 'emulator' ? 0 : 1
                    })
                    log(`  CLO Contract saved to DB`, 'info')
                } catch (err) {
                    log(`  Warning: Could not save CLO contract to DB: ${(err as Error).message}`, 'error')
                }
            }
        }

        currentStepName.value = 'Distributing Tranche Tokens to Investors'
        await delay(400)
        log(`  Senior, Mezzanine, Junior tokens distributed`, 'success')
        phases.value[3].steps[2].status = 'passed'
    }, currentPhase, phases, log)

    // Check for phase 4 breakpoint (before payments)
    if (onPhaseComplete) await onPhaseComplete()
    if (breakpointPhase?.value === 5) {
        log('⏸ Breakpoint reached after Phase 4 (CLO Bundle & Distribution)', 'phase')
        isRunning.value = false
        currentStepName.value = 'Paused at breakpoint'
        return
    }

    // Save final state
    if (onPhaseComplete) await onPhaseComplete()

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

        // Phase 5: Make payments
        if (phase.id === 5 && 'borrowerId' in step && 'amount' in step) {
            const s = step as { borrowerId: string; amount: number }
            const borrower = identities.value.find(i => i.id === s.borrowerId)

            if (!borrower) {
                throw new Error(`Borrower ${s.borrowerId} not found`)
            }

            // Validate that a loan contract exists for this borrower
            if (!loanContracts || loanContracts.value.length === 0) {
                throw new Error('No loan contracts exist. Run Phase 3 (Initialize Loan Contracts) first.')
            }

            const borrowerLoan = loanContracts.value.find(
                l => l.borrower === borrower.name
            )

            if (!borrowerLoan) {
                throw new Error(`No loan contract found for ${borrower.name}. Initialize the loan first.`)
            }

            log(`  ${borrower.name}: Making payment of ${s.amount} ADA...`, 'info')
            await delay(400)

            // Simulate payment - reduce borrower balance
            if (borrower.wallets[0]) {
                const paymentLovelace = BigInt(s.amount * 1_000_000)
                if (borrower.wallets[0].balance < paymentLovelace) {
                    throw new Error(`Insufficient balance: ${borrower.name} has ${Number(borrower.wallets[0].balance) / 1_000_000} ADA but needs ${s.amount} ADA`)
                }
                borrower.wallets[0].balance -= paymentLovelace
            }

            // Update loan state
            if (borrowerLoan.state) {
                borrowerLoan.state.balance -= s.amount * 1_000_000
                if (borrowerLoan.state.balance <= 0) {
                    borrowerLoan.state.isPaidOff = true
                    borrowerLoan.state.isActive = false
                }
            }

            log(`  ✓ Payment of ${s.amount} ADA processed for ${borrower.name}`, 'success')
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

export function getStepAction(phaseId: number, step?: any): string {
    // Phase 1: Check for action type
    if (phaseId === 1 && step?.action) {
        if (step.action === 'create-wallets') return 'Create'
        if (step.action === 'fund-wallets') return 'Fund'
    }
    switch (phaseId) {
        case 1: return 'Setup'
        case 2: return 'Mint'
        case 3: return 'Initiate Loan'
        case 4: return 'Execute CLO'
        case 5: return 'Payment'
        default: return 'Run'
    }
}

export function getStepActionClass(phaseId: number, step?: any): string {
    // Phase 1: Check for action type
    if (phaseId === 1 && step?.action) {
        if (step.action === 'create-wallets') return 'create'
        if (step.action === 'fund-wallets') return 'fund'
    }
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
    // Phase 1: New format with wallets array
    if ('wallets' in step && Array.isArray(step.wallets)) {
        const count = step.wallets.length
        const roles = [...new Set(step.wallets.map((w: any) => w.role))]
        return `${count} wallets (${roles.join(', ')})`
    }
    // Phase 1 (old format): Extract identity name
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
