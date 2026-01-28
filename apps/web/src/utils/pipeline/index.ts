/**
 * Pipeline Module
 * CI/CD-style test pipeline for financial contract lifecycle
 *
 * Usage:
 *   import { runPipeline, PipelineOptions } from '@/utils/pipeline'
 *   await runPipeline(options)
 *
 * Or import specific modules:
 *   import * as actions from '@/utils/pipeline/actions'
 *   import * as ctx from '@/utils/pipeline/context'
 */

// Re-export types
export * from './types'

// Re-export context utilities
export * as context from './context'

// Re-export actions
export * as actions from './actions'

// Re-export runner
export {
  runPipeline,
  executeStep,
  executePhase,
  delay,
  getStepAction,
  getStepActionClass,
  getStepEntity,
  type PipelineOptions,
} from './runner'
