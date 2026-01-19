import { test, expect, describe } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Agent } from "../../src/agent/agent"
import { PermissionNext } from "../../src/permission/next"
import fs from "fs/promises"
import path from "path"

// Helper to evaluate permission for a tool with wildcard pattern
function evalPerm(agent: Agent.Info | undefined, permission: string): PermissionNext.Action | undefined {
  if (!agent) return undefined
  return PermissionNext.evaluate(permission, "*", agent.permission).action
}

describe("TDD agents", () => {
  describe("test_design agent", () => {
    test("is registered and available", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agents = await Agent.list()
          const names = agents.map((a) => a.name)
          expect(names).toContain("test_design")
        },
      })
    })

    test("has correct properties", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_design")
          expect(agent).toBeDefined()
          expect(agent?.name).toBe("test_design")
          expect(agent?.mode).toBe("subagent")
          expect(agent?.native).toBe(true)
          expect(agent?.temperature).toBe(0.1)
        },
      })
    })

    test("has correct description", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_design")
          expect(agent?.description).toContain("test point design")
          expect(agent?.description).toContain("test case planning")
        },
      })
    })

    test("has prompt defined", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_design")
          expect(agent?.prompt).toBeDefined()
          expect(agent?.prompt?.length).toBeGreaterThan(100)
        },
      })
    })

    test("allows edit and write permissions", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_design")
          expect(evalPerm(agent, "edit")).toBe("allow")
          expect(evalPerm(agent, "write")).toBe("allow")
          expect(evalPerm(agent, "read")).toBe("allow")
        },
      })
    })

    test("allows bash for running test commands", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_design")
          expect(evalPerm(agent, "bash")).toBe("allow")
        },
      })
    })

    test("prompt includes TEST_GUIDE content when available", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.writeFile(path.join(dir, "TEST_GUIDE.md"), "# Custom Test Guide\n\nCustom testing rules")
          await fs.mkdir(path.join(dir, ".git"))
        },
      })
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_design")
          expect(agent?.prompt).toContain("# Test Guide")
          expect(agent?.prompt).toContain("Custom testing rules")
        },
      })
    })

    test.todo("can be disabled via config - needs state isolation fix")

    test.todo("can override temperature via config - needs state isolation fix")
  })

  describe("test_and_fix agent", () => {
    test("is registered and available", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agents = await Agent.list()
          const names = agents.map((a) => a.name)
          expect(names).toContain("test_and_fix")
        },
      })
    })

    test("has correct properties", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_and_fix")
          expect(agent).toBeDefined()
          expect(agent?.name).toBe("test_and_fix")
          expect(agent?.mode).toBe("subagent")
          expect(agent?.native).toBe(true)
          expect(agent?.temperature).toBe(0.1)
        },
      })
    })

    test("has correct description", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_and_fix")
          expect(agent?.description).toContain("executing tests")
          expect(agent?.description).toContain("diagnosing")
          expect(agent?.description).toContain("fixing")
        },
      })
    })

    test("has prompt defined", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_and_fix")
          expect(agent?.prompt).toBeDefined()
          expect(agent?.prompt?.length).toBeGreaterThan(100)
        },
      })
    })

    test("allows bash and edit permissions", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_and_fix")
          expect(evalPerm(agent, "bash")).toBe("allow")
          expect(evalPerm(agent, "edit")).toBe("allow")
          expect(evalPerm(agent, "read")).toBe("allow")
        },
      })
    })

    test("prompt includes TEST_GUIDE content when available", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.writeFile(path.join(dir, "TEST_GUIDE.md"), "# Test Execution Guide\n\nExecution rules")
          await fs.mkdir(path.join(dir, ".git"))
        },
      })
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_and_fix")
          expect(agent?.prompt).toContain("# Test Guide")
          expect(agent?.prompt).toContain("Execution rules")
        },
      })
    })

    test.todo("can be disabled via config - needs state isolation fix")

    test.todo("can override description via config - needs state isolation fix")
  })

  describe("TEST_GUIDE integration", () => {
    test("both agents receive same TEST_GUIDE content", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.writeFile(path.join(dir, "TEST_GUIDE.md"), "# Shared Guide\n\nShared content")
          await fs.mkdir(path.join(dir, ".git"))
        },
      })
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const testDesign = await Agent.get("test_design")
          const testAndFix = await Agent.get("test_and_fix")

          expect(testDesign?.prompt).toContain("Shared content")
          expect(testAndFix?.prompt).toContain("Shared content")
        },
      })
    })

    test("agents work without TEST_GUIDE.md", async () => {
      await using tmp = await tmpdir()
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const testDesign = await Agent.get("test_design")
          const testAndFix = await Agent.get("test_and_fix")

          expect(testDesign).toBeDefined()
          expect(testAndFix).toBeDefined()
          expect(testDesign?.prompt).toBeDefined()
          expect(testAndFix?.prompt).toBeDefined()
        },
      })
    })

    test("merges multiple TEST_GUIDE files into agent prompts", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await fs.writeFile(path.join(dir, "TEST_GUIDE.md"), "Root guide")
          await fs.mkdir(path.join(dir, ".cospec"))
          await fs.writeFile(path.join(dir, ".cospec", "TEST_GUIDE.md"), "Cospec guide")
          await fs.mkdir(path.join(dir, ".git"))
        },
      })
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const agent = await Agent.get("test_design")
          expect(agent?.prompt).toContain("Root guide")
          expect(agent?.prompt).toContain("Cospec guide")
        },
      })
    })
  })

  describe("permission overrides", () => {
    test.todo("test_design can have permissions overridden - needs state isolation fix")

    test.todo("test_and_fix can have bash permission overridden - needs state isolation fix")
  })
})
