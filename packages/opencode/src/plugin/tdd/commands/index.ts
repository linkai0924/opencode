import { Command } from "../../../command"

async function getTestTemplate(): Promise<string> {
  return Bun.file(new URL("./template/test.txt", import.meta.url)).text()
}

export async function getCommands(): Promise<Record<string, Command.Info>> {
  const testTemplate = await getTestTemplate()
  return {
    test: {
      name: "test",
      description:
        "execute comprehensive testing workflow: confirm requirements, generate test cases, and execute tests with automated fixes",
      template: testTemplate,
      hints: Command.hints(testTemplate),
    },
  }
}
