export const RUN_AND_FIX_AGENT_NAME = "run_and_fix" as const
export const TEST_DESIGN_AGENT_NAME = "test_design" as const
export const TEST_AND_FIX_AGENT_NAME = "test_and_fix" as const

export type AgentName = typeof RUN_AND_FIX_AGENT_NAME | typeof TEST_DESIGN_AGENT_NAME | typeof TEST_AND_FIX_AGENT_NAME
