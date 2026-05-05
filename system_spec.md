System Specification: Zamunda AI Platform
1. Project Overview

Build a multi-tenant AI agency platform where users interact with autonomous agents via Telegram.

    Orchestrator: OpenCLAW (Option 1: Shared Gateway with Session Isolation).

    Inference: OpenRouter (Token-optimized).

    Backend: NestJS (PostgreSQL, BullMQ, Redis).

    Frontend: NextJS (Tailwind CSS, User Dashboard).

    Payments: Paystack (Credit-based billing).

2. Core Architecture & Multi-Tenancy

The system uses a Stateful Proxy model.

    Identity: NestJS maps telegram_user_id to an internal UUID.

    Isolation: Differentiation is handled via the sessionId parameter in OpenCLAW.

    Workflow:

        Telegram -> NestJS (Auth/Billing Check).

        NestJS -> OpenCLAW (Agent Execution via API).

        OpenCLAW -> OpenRouter (LLM Reasoning).

        OpenCLAW -> Browser (Action via Playwright).

        Result -> NestJS (Deduction) -> Telegram.

3. Tech Stack Requirements
Backend (NestJS)

    Database: PostgreSQL with TypeORM.

    Queue: BullMQ for handling asynchronous agent tasks.

    Bot Framework: telegraf for Telegram integration.

    Security: JWT for NextJS dashboard; API Key for OpenCLAW communication.

Frontend (NextJS)

    Framework: App Router (v14/15+).

    Features:

        Real-time task logs (WebSockets/SSE).

        Credit top-up interface using Paystack Popup/Redirect.

        Usage analytics (Tokens spent vs. tasks completed).

Agentic Layer (OpenCLAW)

    Mode: Gateway API.

    Skills Required: browser, web_search, file_system (restricted).

    Session Strategy: user_${id} to persist browser cookies/history per user.

4. Data Schema (PostgreSQL)
User Entity

    id: UUID (Primary Key)

    telegramId: String (Unique)

    email: String (Optional, for Dashboard)

    creditBalance: Decimal (Current balance in tokens/credits)

    paystackCustomerId: String

AgentJob Entity

    id: UUID

    userId: Relation(User)

    sessionId: String (Matches OpenCLAW sessionId)

    status: Enum (PENDING, RUNNING, COMPLETED, FAILED)

    tokensUsed: Integer

    costInUsd: Decimal

    prompt: Text

    response: Text

5. Implementation Roadmap for Gemini CLI
Task 1: NestJS Boilerplate & Entities

    Generate a NestJS app with Docker support.

    Create User and AgentJob entities.

    Set up a Paystack service for handling webhooks and initializing transactions.

Task 2: Telegram & OpenCLAW Bridge

    Implement the Telegram bot listener.

    Create an AgentService that forwards prompts to OpenCLAW using axios.

    Pass X-Title and X-User-ID headers to OpenRouter via OpenCLAW for auditing.

Task 3: Token Tracking & Billing

    Create a logic to calculate costs based on OpenRouter's response metadata.

    Implement a CreditGuard to block requests if the balance is below the threshold.

Task 4: NextJS Dashboard

    Build a responsive UI to show "Agent Activity" history.

    Integrate the Paystack payment button for credit top-ups.

6. Docker Compose Configuration

Refer to the provided docker-compose.yml involving:

    agency-api (NestJS)

    agency-ui (NextJS)

    agency-openclaw (Gateway mode)

    agency-db (Postgres)

    agency-redis (BullMQ)

7. Operational Constraints

    Concurrency: Limit each user to 1 active agent task at a time.

    Browser Security: Ensure OpenCLAW launches incognito contexts for each session.

    Token Optimization: System prompts must instruct the agent to be concise and use tools only when necessary.
