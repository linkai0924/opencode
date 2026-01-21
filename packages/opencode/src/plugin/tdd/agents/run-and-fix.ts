import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "../types"
import PROMPT from "./prompts/run_and_fix.txt"
import { RUN_AND_FIX_AGENT_NAME, type AgentName } from "./constants"

export const RUN_AND_FIX_PROMPT_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "FREE",
  triggers: [
    {
      domain: "Runnability",
      trigger: "Execute verification commands and fix coding issues",
    },
  ],
  useWhen: [
    "Need to verify project can run or compile",
    "Executing build/test commands and fixing resulting issues",
    "Ensuring project is in a working state",
  ],
  avoidWhen: ["Analyzing project structure", "Writing new features", "Code review"],
}

export function createRunAndFixAgent(_: string): AgentConfig & { name: AgentName } {
  return {
    name: RUN_AND_FIX_AGENT_NAME,
    description:
      "Finds and executes verification commands, and fixes coding issues to ensure project runs or compiles successfully",
    mode: "subagent",
    // model,
    temperature: 0.1,
    prompt: PROMPT,
    tools: {
      question: true,
      todowrite: true,
      todoread: true
    }
  }
}
