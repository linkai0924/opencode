import { describe, expect, test } from "bun:test"
import { TDDPlugin } from "../../../src/plugin/tdd"
import type { PluginInput } from "@opencode-ai/plugin"
import type { Config } from "@opencode-ai/sdk"

// Mock PluginInput - we only need minimal properties for our tests
function createMockPluginInput(): PluginInput {
  return {
    client: null as any,
    project: null as any,
    directory: "/mock/directory",
    worktree: "/mock/directory",
    serverUrl: new URL("http://localhost:3000"),
    $: null as any,
  }
}

describe("TDD Plugin", () => {
  describe("plugin initialization and hooks", () => {
    test("should return all required hooks", async () => {
      const input = createMockPluginInput()
      const hooks = await TDDPlugin(input)

      // Verify all hooks are present
      expect(hooks).toBeDefined()
      expect(hooks.config).toBeDefined()
      expect(hooks["experimental.chat.system.transform"]).toBeDefined()
      expect(hooks.tool).toBeDefined()
      expect(hooks.event).toBeDefined()
    })

    test("config hook should be an async function", async () => {
      const input = createMockPluginInput()
      const hooks = await TDDPlugin(input)

      expect(typeof hooks.config).toBe("function")
      expect(hooks.config!.constructor.name).toBe("AsyncFunction")
    })

    test("system.transform hook should be an async function", async () => {
      const input = createMockPluginInput()
      const hooks = await TDDPlugin(input)

      expect(typeof hooks["experimental.chat.system.transform"]).toBe("function")
      expect(hooks["experimental.chat.system.transform"]!.constructor.name).toBe("AsyncFunction")
    })

    test("tool hook should return tools object", async () => {
      const input = createMockPluginInput()
      const hooks = await TDDPlugin(input)

      expect(typeof hooks.tool).toBe("object")
      expect(hooks.tool).toBeDefined()
    })

    test("config hook should process config object", async () => {
      const input = createMockPluginInput()
      const hooks = await TDDPlugin(input)

      const config: Partial<Config> = { model: "claude-sonnet-4-5" }

      await hooks.config!(config as Config)

      // Verify agents are registered
      expect(config.agent).toBeDefined()
      expect(config.agent!.RunAndFix).toBeDefined()
      expect(config.agent!.TestDesign).toBeDefined()
      expect(config.agent!.TestAndFix).toBeDefined()
      expect(config.agent!.TestPrepare).toBeDefined()
    })
  })
})
