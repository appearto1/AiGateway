# AiGateway

**无需技术开发，通过 MCP + 私有知识库一体化集成，企业轻量化落地专属 AI 应用。**

一站式 AI 网关与管理后台：统一接入多模型、私有知识库**上传即用**、MCP 工具扩展、多应用与调用统计，开箱即用。

---

## 为什么选 AiGateway

- **知识库零配置**：上传 PDF / Word / Excel / HTML / ZIP 等文件即可生成技能，描述中注明「解压」可自动解压 ZIP 到资源目录；**无需编写 YAML 或复杂配置**，AI 自动生成技能指令与资源清单。
- **使用简单**：后端单二进制 + 一份 `env.example` 改名为 `.env` 即可运行；前端打包后静态部署，对接后端 API 即用。
- **能力完整**：私有知识库（Agent Skills）、MCP 工具集、多模型厂商、应用与 Token 管理、调用趋势与日志，界面统一清晰。

---

## 界面概览

管理后台提供统一深色主题界面，主要能力包括：

| 模块 | 说明 |
|------|------|
| **数据概览** | 系统状态、请求趋势图、各模型 Token 分布、最近调用日志，一目了然。 |
| **知识库管理** | 创建知识库 → 上传文档（支持多格式）→ 自动生成技能；支持按描述解压 ZIP、正确解析 HTML/GBK 编码，技能即生成即用。 |
| **应用与 Token** | 应用创建、API 密钥、绑定知识库与 MCP，用量统计。 |
| **智能体聊天** | 基于绑定知识库与 MCP 的对话，先匹配知识库再结合通用知识/MCP 回答。 |
| **MCP 扩展** | 配置 MCP 服务器（stdio / SSE / StreamableHTTP），工具与资源统一管理。 |
| **模型供应商** | 多厂商、多模型配置，统一路由与计费。 |
| **组织 / 角色 / 用户** | 多租户与权限管理，适配企业部署。 |

整体界面围绕「配置少、上手快、能力全」设计，知识库侧强调**上传文件即可使用**，无需额外复杂配置。

---

## 项目结构

```
AiGateway/
├── frontend/          # 前端管理后台（React + Vite + Ant Design）
├── build/
│   └── windows/       # 后端 Windows amd64 构建产物
│       ├── aigserver.exe   # 后端主程序
│       └── env.example    # 环境变量示例（复制为 .env 使用）
└── README.md
```

---

## 后端部署

### Windows（推荐快速体验）

1. **获取程序与配置**
   - 从本仓库 [build/windows](build/windows) 下载：
     - `aigserver.exe`（Windows amd64 单文件，无 CGO 依赖）
     - `env.example`
   - 将 `env.example` 复制为 `.env`，与 `aigserver.exe` 放在同一目录。

2. **编辑 `.env`**
   - 必选：`PORT`（如 `80`）、`DB_TYPE`（`sqlite` / `mysql` / `postgres`）。
   - SQLite：可不填 `SQLITE_PATH`，默认使用当前目录下 `data/nbutest.db3`；无需安装数据库。
   - MySQL/Postgres：填写 `MYSQL_DSN` 或 `POSTGRES_DSN`。
   - 其他如 `GIN_MODE=release`、`LOG_LEVEL=INFO` 按需修改。

3. **运行**
   ```bash
   aigserver.exe
   ```
   启动后 API 与 Web 管理接口在 `http://<服务器>:<PORT>`（如 `http://localhost:80`）。

---

## 前端打包与部署

前端为静态资源，构建后部署到任意 Web 服务器或 CDN，通过环境变量或构建时配置后端 API 地址即可。

1. **安装依赖与构建**
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   产物在 `frontend/dist`。

2. **部署**
   - 将 `dist` 目录内容部署到 Nginx、Apache、或对象存储静态站点等。
   - 确保 API 请求指向已部署的后端地址（可在前端 `vite.config.ts` 或接口 baseURL 中配置）。

3. **开发调试**
   ```bash
   cd frontend
   npm run dev
   ```
   本地开发时在环境或接口配置中填写后端地址即可。

---

## 知识库：上传即用

- 在管理后台进入 **知识库** → 选择或创建知识库 → **上传文档**（PDF、Word、Excel、HTML、ZIP 等）。
- 若上传为 **ZIP**，在描述中注明「解压」或「解压到资源目录」，系统会自动解压到技能资源目录并列出文件供 AI 使用。
- 上传后由 AI 自动生成技能说明与资源清单，**无需手写 YAML 或复杂配置**；生成完成后，绑定该知识库的应用即可在对话中调用对应知识。

---

## 许可证

Apache-2.0
