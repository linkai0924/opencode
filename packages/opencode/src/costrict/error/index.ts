import type { NamedError } from "@opencode-ai/util/error"
import { MessageV2 } from "@/session/message-v2"
import type { Provider } from "@/provider/provider"
import type { ModelMessage, APICallError } from "ai"

const COSTRICT_FINISH_REASON = {
  LENGTH: "length",
}

export namespace CostrictError {
  export function retryable(error: ReturnType<NamedError["toObject"]>) {
    if (MessageV2.OutputLengthError.isInstance(error)) {
      return "Output length reached"
    }
  }

  export async function finish(input: {
    reason: string
    message: MessageV2.Assistant
    model: Provider.Model
    messages: ModelMessage[]
  }) {
    if (input.reason === COSTRICT_FINISH_REASON.LENGTH) {
      const current = await MessageV2.get({
        sessionID: input.message.sessionID,
        messageID: input.message.id,
      })
      const continuation = MessageV2.toModelMessages([current], input.model)
      const messages = [
        ...input.messages,
        ...continuation,
        {
          role: "user",
          content: [
            "<system-reminder>",
            "模型输出内容超出了本次任务设定的 max token 上限，导致 agent 无法正常接收并执行后续操作。请基于本次任务核心需求，精简输出内容、剔除冗余表述，优先保留关键信息 / 核心指令 / 核心结果，严格控制文本 token 长度在限制范围内后重新输出；若需输出的内容较多，可采用分批次、分模块的方式依次输出，避免单次输出超限。",
            "</system-reminder>",
          ].join("\n"),
        },
      ] satisfies ModelMessage[]
      return {
        messages,
        error: new MessageV2.OutputLengthError({}),
      }
    }
    return void 0
  }
}
