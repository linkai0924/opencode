# OpenCode 配置兼容性支持

## 概述

CoStrict 现在支持兼容 OpenCode 的配置文件，允许用户在迁移到 CoStrict 时继续使用原有的 OpenCode 配置。

## 功能特性

- ✅ 支持 `COSTRICT_ENABLE_OPENCODE_CONFIG` 环境变量来启用/禁用 OpenCode 配置兼容性
- ✅ 当启用时，同时加载 OpenCode 和 CoStrict 配置
- ✅ CoStrict 配置优先级高于 OpenCode 配置（同名配置项会被 CoStrict 覆盖）
- ✅ 支持多种 OpenCode 配置文件路径和格式

## 环境变量

| 环境变量 | 类型 | 默认值 | 说明 |
|---------|------|--------|------|
| `COSTRICT_ENABLE_OPENCODE_CONFIG` | boolean | `false` | 是否启用 OpenCode 配置兼容性 |
| `OPENCODE_CONFIG` | string | - | OpenCode 自定义配置文件路径 |
| `OPENCODE_CONFIG_CONTENT` | string | - | OpenCode 内联配置内容（JSON 字符串） |
| `OPENCODE_CONFIG_DIR` | string | - | OpenCode 配置目录路径 |

## 配置文件加载顺序（从低到高优先级）

### 1. Remote/well-known 配置
`*.well-known/opencode`

### 2. OpenCode 全局配置
- `~/.config/config.json`
- `~/.config/opencode.json`
- `~/.config/opencode.jsonc`
- `~/.config/opencode/opencode.json` ⭐ 新增
- `~/.config/opencode/opencode.jsonc` ⭐ 新增
- `~/.config/opencode/config` (TOML 格式)

### 3. OpenCode 自定义配置
- `OPENCODE_CONFIG` 指定的文件路径

### 4. OpenCode 项目配置
- 当前项目目录的 `opencode.jsonc`
- 当前项目目录的 `opencode.json`
- 项目 `.opencode/` 目录

### 5. CoStrict 全局配置
- `~/.config/costrict.json`
- `~/.config/costrict.jsonc`

### 6. CoStrict 自定义配置
- `COSTRICT_CONFIG` 指定的文件路径

### 7. CoStrict 项目配置
- 当前项目目录的 `costrict.jsonc`
- 当前项目目录的 `costrict.json`
- 项目 `.costrict/` 目录

### 8. 内联配置（最高优先级）
- `COSTRICT_CONFIG_CONTENT`

## 配置合并规则

### 对象字段
CoStrict 配置会覆盖 OpenCode 配置的同名字段。

```json
// OpenCode 配置
{
  "model": "openai/gpt-4",
  "theme": "dark",
  "username": "user1"
}

// CoStrict 配置
{
  "model": "anthropic/claude-3",
  "username": "user2"
}

// 合并结果
{
  "model": "anthropic/claude-3",   // 被 CoStrict 覆盖
  "theme": "dark",                 // 保留 OpenCode 值
  "username": "user2"               // 被 CoStrict 覆盖
}
```

### 数组字段
数组字段会被合并并去重。

```json
// OpenCode 配置
{
  "plugin": ["plugin1", "plugin2"]
}

// CoStrict 配置
{
  "plugin": ["plugin2", "plugin3"]
}

// 合并结果
{
  "plugin": ["plugin1", "plugin2", "plugin3"]  // 合并并去重
}
```

## 使用示例

### 基本使用

默认情况下，OpenCode 配置兼容性是启用的，系统会自动加载所有支持的配置文件：

```bash
# 不需要任何额外配置，直接启动
costrict
```

### 禁用 OpenCode 配置兼容性

如果你想完全使用 CoStrict 配置系统：

```bash
# 方法 1: 设置环境变量为 false
export COSTRICT_ENABLE_OPENCODE_CONFIG=false
costrict

# 方法 2: 设置环境变量为 0
export COSTRICT_ENABLE_OPENCODE_CONFIG=0
costrict
```

### 使用自定义 OpenCode 配置文件

```bash
# 指定自定义的 OpenCode 配置文件
export OPENCODE_CONFIG=/path/to/my-opencode-config.json
costrict
```

### 使用 OpenCode 配置目录

```bash
# 指定 OpenCode 配置目录
export OPENCODE_CONFIG_DIR=/path/to/my-opencode-config
costrict
```

### 覆盖特定配置

如果你想在大部分使用 OpenCode 配置的同时，覆盖某些设置：

```bash
# 创建 CoStrict 配置文件（优先级更高）
cat > ~/.config/costrict.json << 'EOF'
{
  "model": "anthropic/claude-3-5-sonnet",
  "username": "costrict-user"
}
EOF

# 启动 CoStrict（会加载两者配置，CoStrict 会覆盖 OpenCode 的同名字段）
costrict
```

## 支持的配置目录结构

### OpenCode 目录

```
~/.config/opencode/
├── opencode.json        # 主配置文件
├── opencode.jsonc       # 带注释的 JSON 配置
├── opencode.config      # TOML 格式配置
├── command/            # 命令定义
├── agent/              # Agent 定义
└── plugin/             # 插件文件
```

### 项目目录

```
my-project/
├── opencode.json          # 项目级 OpenCode 配置
├── opencode.jsonc         # 带注释的 JSON 格式
├── .opencode/             # OpenCode 配置目录（与 costrict/ 并列）
│   ├── command/
│   ├── agent/
│   └── plugin/
├── costrict.json          # 项目级 CoStrict 配置（会覆盖 opencode.json）
├── .costrict/            # CoStrict 配置目录（会覆盖 .opencode/）
│   ├── command/
│   ├── agent/
│   └── plugin/
```

## 配置示例

### OpenCode 配置示例

```json
// ~/.config/opencode/opencode.json
{
  "$schema": "https://costrict.ai/config.json",
  "model": "openai/gpt-4",
  "theme": "dark",
  "username": "opencode-user",
  "plugin": [
    "@opencode-ai/plugin-opencode"
  ],
  "mcp": {
    "test_opencode": {
      "type": "local",
      "command": "ls -lh",
      "args": []
    }
  }
}
```

### CoStrict 配置示例

```json
// ~/.config/costrict.json
{
  "$schema": "https://costrict.ai/config.json",
  "model": "anthropic/claude-3-5-sonnet",
  "username": "costrict-user",
  "plugin": [
    "@opencode-ai/plugin-opencode",
    "@custom/plugin-enhanced"
  ],
  "mcp": {
    "test1": {
      "type": "local",
      "command": "ls -lh",
      "args": []
    }
  }
}
```

## 迁移指南

### 从纯 OpenCode 迁移到 CoStrict

1. **保持现有配置**：
   - 无需迁移，OpenCode 配置文件可以继续使用
   - 系统会自动加载 OpenCode 配置

2. **逐步迁移**：
   - 创建 CoStrict 配置文件
   - 只将需要修改的配置项写入 CoStrict 配置
   - 其他配置保持使用 OpenCode

3. **完全迁移**：
   - 将所有配置迁移到 CoStrict 格式
   - 设置 `COSTRICT_ENABLE_OPENCODE_CONFIG=false`
   - 删除旧配置文件（可选）

### 配置文件检查

查看当前加载的配置：

```bash
# 查看完整的合并后配置
costrict .config cat

# 查看特定配置文件
costrict .config cat ~/.config/opencode/opencode.json
costrict .config cat ~/.config/costrict.json
```

## 故障排查

### OpenCode 配置未加载

**问题**：OpenCode 配置文件中的配置未生效

**检查清单**：
1. 确认 `COSTRICT_ENABLE_OPENCODE_CONFIG` 未设置为 `false`
2. 检查配置文件路径是否正确
3. 查看日志输出（启用 debug 模式）
4. 验证 CoStrict 配置中没有覆盖相同配置项

```bash
# 启用 debug 日志
export LOG_LEVEL=debug
costrict
```

### 配置冲突

**问题**：某些配置项不符合预期

**解决方案**：
1. 检查配置优先级，确认哪个配置文件生效
2. 使用 `.config cat` 查看合并后的配置
3. 根据 CoStrict 覆盖 OpenCode 的规则调整配置文件

### MCP 服务器无法连接

**问题**：OpenCode 配置的 MCP 服务器报错

**解决方案**：
1. 检查 OpenCode 配置文件格式是否正确
2. 验证 MCP 命令在当前系统上可用
3. 查看详细错误信息

```bash
# 查看详细错误
costrict --verbose
```

## 技术细节

### 配置合并函数

使用 `mergeConfigConcatArrays` 函数进行配置合并：

```typescript
function mergeConfigConcatArrays(target: Info, source: Info): Info {
  const merged = mergeDeep(target, source)
  
  // 数组字段使用 Set 去重和合并
  if (target.plugin && source.plugin) {
    merged.plugin = Array.from(new Set([...target.plugin, ...source.plugin]))
  }
  if (target.instructions && source.instructions) {
    merged.instructions = Array.from(new Set([...target.instructions, ...source.instructions]))
  }
  
  return merged
}
```

### 惰性加载

`opencodeGlobal` 和 `global` 函数使用惰性加载以提高性能：

```typescript
export const opencodeGlobal = lazy(async () => {
  // 加载 OpenCode 全局配置
})
```

## 相关文件

- [`config.ts`](./config.ts) - 配置加载和管理逻辑
- [`flag.ts`](../flag/flag.ts) - 环境变量定义
- [`opencode-config.test.ts`](./opencode-config.test.ts) - 测试用例

## 版本历史

### v1.0.0 (2025-01-27)
- ✅ 初始版本
- ✅ 添加 `COSTRICT_ENABLE_OPENCODE_CONFIG` 支持
- ✅ 实现双阶段配置加载（OpenCode + CoStrict）
- ✅ 支持 `~/.config/opencode/` 目录
- ✅ 支持 `~/.opencode/` 和 `opencode/` 目录扫描
- ✅ 实现配置合并和覆盖规则
