# NAVI — System Architecture & Technical Design

**Product:** NAVI\
**Architecture Version:** 1.0\
**Platform:** Web DApp\
**Primary Network:** X Layer\
**Architecture Type:** Modular monolith for MVP, service-oriented evolution post-MVP\
**Primary User:** Average crypto user\
**Execution Model:** Non-custodial, policy-constrained, user-approved onchain execution

---

# 1. Architecture Objective

NAVI must continuously:

1. Understand the user's financial position.
2. Understand the user's financial goal.
3. Discover relevant DeFi and RWA opportunities.
4. Evaluate risk and trade-offs.
5. Generate an optimized strategy.
6. Simulate the proposed transactions.
7. Validate every action against user-defined permissions.
8. Present the proposed actions clearly.
9. Obtain user authorization.
10. Execute transactions on X Layer.
11. Monitor resulting positions.
12. Detect meaningful changes.
13. Recommend or prepare rebalancing actions.

The architecture must enforce one core principle:

> **The AI can reason about money, but it cannot freely control money.**

---

# 2. High-Level System Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                         NAVI CLIENT                           │
│                                                               │
│ Next.js Web App                                               │
│                                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│ │Portfolio │ │NAVI Agent│ │Strategy  │ │Policy / Settings │  │
│ │Dashboard │ │Interface │ │Interface │ │                  │  │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│      │            │            │                │             │
└──────┼────────────┼────────────┼────────────────┼─────────────┘
       │            │            │                │
       └────────────┴────────────┴────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                     NAVI APPLICATION API                      │
│                                                               │
│ Authentication                                                │
│ Session Management                                            │
│ Request Validation                                            │
│ Rate Limiting                                                 │
│ API Orchestration                                             │
└───────────────────────────────┬───────────────────────────────┘
                                │
       ┌────────────────────────┼──────────────────────────┐
       │                        │                          │
       ▼                        ▼                          ▼
┌───────────────┐     ┌──────────────────┐       ┌────────────────┐
│ AI Agent      │     │ Financial Engine │       │ Safety Engine  │
│ Layer         │     │                  │       │                │
│               │     │ Portfolio        │       │ Simulation     │
│ Intent        │     │ Opportunities    │       │ Policy         │
│ Reasoning     │     │ Risk             │       │ Validation     │
│ Explanation   │     │ Strategy         │       │ Guardrails     │
└──────┬────────┘     └────────┬─────────┘       └───────┬────────┘
       │                       │                         │
       └───────────────────────┴─────────────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ Execution Engine   │
                    │                    │
                    │ Adapters           │
                    │ Tx Builder         │
                    │ Tx Tracking        │
                    └─────────┬──────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   User Wallet   │
                     │                 │
                     │ Signs Tx        │
                     └────────┬────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                           X LAYER                             │
│                                                               │
│ NAVI Contracts                                                │
│ DeFi Protocols                                                │
│ RWA Contracts                                                 │
│ Tokens                                                        │
└───────────────────────────────────────────────────────────────┘
```

---

# 3. Architectural Layers

NAVI is divided into seven logical layers.

## Layer 1 — Presentation

Responsible for:

- user interface
- wallet interaction
- charts
- AI conversation
- strategy display
- opportunity display
- simulation review
- policy configuration
- transaction status

Technology:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
wagmi
viem
TanStack Query
Zustand
```

---

## Layer 2 — Application

Responsible for:

- API
- authentication
- session management
- request validation
- application workflows
- service coordination

Technology:

```text
Next.js Server Routes
Node.js
TypeScript
Zod
```

---

## Layer 3 — Intelligence

Responsible for:

- language understanding
- intent extraction
- tool orchestration
- qualitative reasoning
- explanations

Technology:

```text
LLM provider
Structured outputs
Tool calling
Prompt templates
```

---

## Layer 4 — Financial Intelligence

Responsible for:

- portfolio state
- market data
- DeFi data
- RWA data
- risk
- portfolio calculations
- strategy generation
- opportunity ranking

---

## Layer 5 — Safety

Responsible for:

- transaction simulation
- policy enforcement
- contract allowlists
- data freshness
- transaction validation
- risk boundaries

---

## Layer 6 — Execution

Responsible for:

- protocol adapters
- transaction construction
- wallet signing
- transaction broadcast
- confirmation tracking

---

## Layer 7 — Blockchain

Responsible for:

- settlement
- asset ownership
- policy commitment
- financial execution
- auditable transaction history

---

# 4. MVP Deployment Architecture

For the hackathon, NAVI should use a **modular monolith**.

Do not deploy 10 microservices.

Recommended structure:

```text
                    VERCEL / WEB HOST
                           │
            ┌──────────────┴──────────────┐
            │                             │
      Next.js Frontend              Next.js API
                                          │
                      ┌───────────────────┼────────────────────┐
                      │                   │                    │
                     AI               Financial             Safety
                   Modules              Modules              Modules
                      │                   │                    │
                      └───────────────────┼────────────────────┘
                                          │
                                      Supabase
                                          │
                             PostgreSQL + Auth Data
                                          │
                     ┌────────────────────┴───────────────────┐
                     │                                        │
                 X Layer RPC                         External Data
                     │                                        │
               Smart Contracts                     DeFi / RWA APIs
```

This minimizes operational complexity.

---

# 5. Repository Architecture

Recommended monorepo:

```text
navi/
│
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── styles/
│
├── packages/
│   │
│   ├── ai/
│   │   ├── agent.ts
│   │   ├── prompts.ts
│   │   ├── tools.ts
│   │   └── schemas.ts
│   │
│   ├── portfolio/
│   │   ├── reader.ts
│   │   ├── valuation.ts
│   │   └── types.ts
│   │
│   ├── opportunities/
│   │   ├── defi.ts
│   │   ├── rwa.ts
│   │   ├── normalize.ts
│   │   └── rank.ts
│   │
│   ├── risk/
│   │   ├── scorer.ts
│   │   ├── defi-risk.ts
│   │   └── rwa-risk.ts
│   │
│   ├── strategy/
│   │   ├── allocator.ts
│   │   ├── optimizer.ts
│   │   └── tradeoffs.ts
│   │
│   ├── simulation/
│   │   ├── simulator.ts
│   │   └── projection.ts
│   │
│   ├── policy/
│   │   ├── validator.ts
│   │   ├── canonicalize.ts
│   │   └── types.ts
│   │
│   ├── execution/
│   │   ├── builder.ts
│   │   ├── tracker.ts
│   │   └── adapters/
│   │
│   └── database/
│       ├── client.ts
│       └── queries/
│
├── contracts/
│   ├── NaviPolicyManager.sol
│   ├── NaviExecutor.sol
│   └── interfaces/
│
├── scripts/
│   ├── deploy.ts
│   └── verify.ts
│
├── tests/
│
└── README.md
```

---

# 6. Frontend Architecture

## Main Screens

```text
/
├── Landing
├── /app
│   ├── /overview
│   ├── /agent
│   ├── /opportunities
│   ├── /strategy
│   ├── /portfolio
│   ├── /activity
│   └── /policy
```

---

# 7. Frontend State

Use two categories of state.

## Server State

Managed using TanStack Query.

Includes:

- portfolio
- opportunities
- strategies
- simulations
- policies
- transaction status
- monitoring alerts

## Local UI State

Managed using Zustand.

Includes:

- current conversation
- selected opportunity
- open modal
- current strategy step
- filters
- UI preferences

Do not store authoritative financial state only in the browser.

---

# 8. Wallet System

## Wallet Flow

```text
User
 ↓
Connect Wallet
 ↓
Wallet Provider
 ↓
Address
 ↓
Check Network
 ↓
Switch to X Layer if needed
 ↓
Request Authentication Nonce
 ↓
User Signs Nonce
 ↓
Backend Verifies Signature
 ↓
Authenticated NAVI Session
```

Wallet must remain:

```text
User-controlled
Non-custodial
```

---

# 9. Authentication System

Backend:

```text
POST /api/auth/nonce
```

Response:

```json
{
  "nonce": "random-message"
}
```

User signs.

Then:

```text
POST /api/auth/verify
```

Request:

```json
{
  "address": "0x...",
  "signature": "0x...",
  "nonce": "..."
}
```

Backend verifies.

Session cookie:

```text
HttpOnly
Secure
SameSite=Lax
```

---

# 10. Portfolio Engine

The Portfolio Engine answers:

> What does the user currently own?

It should aggregate:

```text
Wallet Assets

+

DeFi Positions

+

RWA Positions

=

Unified Portfolio
```

---

# 11. Portfolio Pipeline

```text
Wallet Address
     ↓
Token Reader
     ↓
Protocol Position Readers
     ↓
Token Price Service
     ↓
Position Valuation
     ↓
Normalization
     ↓
Portfolio Aggregator
     ↓
Portfolio Snapshot
```

---

# 12. Portfolio Data Model

```typescript
interface Portfolio {
  wallet: string;
  chainId: number;

  totalUsd: Decimal;
  liquidUsd: Decimal;
  deployedUsd: Decimal;

  allocation: {
    stablecoins: Decimal;
    defi: Decimal;
    rwa: Decimal;
    volatile: Decimal;
  };

  assets: AssetPosition[];

  defiPositions: DeFiPosition[];

  rwaPositions: RWAPosition[];

  riskScore: number;

  estimatedYield: number;

  timestamp: string;
}
```

---

# 13. Price System

Never let the LLM estimate token prices.

Price service:

```text
Token
 ↓
Price Source
 ↓
Validation
 ↓
Normalized USD Price
 ↓
Portfolio Engine
```

Prices require:

```text
source
timestamp
confidence
```

If data is stale:

```text
do not execute
```

---

# 14. Opportunity Architecture

Opportunity Engine combines:

```text
DeFi Sources
+
RWA Sources
+
Supported Protocol Registry
```

Output:

```text
Normalized Opportunities
```

---

# 15. Opportunity Registry

Maintain supported protocols.

```typescript
interface ProtocolRegistryEntry {
  id: string;

  name: string;

  chainId: number;

  contractAddresses: string[];

  type:
    | "lending"
    | "vault"
    | "liquidity"
    | "rwa";

  status:
    | "active"
    | "disabled";

  executable: boolean;

  adapterId?: string;
}
```

---

# 16. DeFi Opportunity Ingestion

Pipeline:

```text
Protocol API / Contract
        ↓
Raw Position Data
        ↓
Normalizer
        ↓
APY Validation
        ↓
Liquidity Data
        ↓
Risk Engine
        ↓
Opportunity Database
```

---

# 17. RWA Opportunity Ingestion

Pipeline:

```text
Issuer / Protocol
      ↓
Asset Metadata
      ↓
Yield Information
      ↓
Redemption Rules
      ↓
Liquidity
      ↓
Counterparty Data
      ↓
Risk Engine
      ↓
Normalized RWA Opportunity
```

---

# 18. Unified Opportunity Object

```typescript
interface Opportunity {
  id: string;

  marketType:
    | "DEFI"
    | "RWA";

  protocolId: string;

  asset: string;

  apy: Decimal;

  riskScore: number;

  liquidityScore: number;

  tvlUsd?: Decimal;

  lockPeriodSeconds?: number;

  redemptionDays?: number;

  minimumDepositUsd?: Decimal;

  executable: boolean;

  adapterId?: string;

  dataTimestamp: string;
}
```

---

# 19. AI Agent System

The AI layer is built around an orchestrator.

```text
User Message
     ↓
NAVI Agent
     ↓
Intent Classification
     ↓
Tool Selection
     ↓
Tool Execution
     ↓
Structured Results
     ↓
LLM Reasoning
     ↓
User Explanation
```

---

# 20. AI Intent Types

Classify queries into:

```text
PORTFOLIO_QUERY

RISK_QUERY

OPPORTUNITY_QUERY

COMPARE_QUERY

STRATEGY_REQUEST

SIMULATION_REQUEST

EXECUTION_REQUEST

MONITORING_QUERY

GENERAL_FINANCIAL_QUERY
```

---

# 21. NAVI Agent Tools

Initial tools:

```text
getPortfolio

getPortfolioRisk

getUserPolicy

parseFinancialGoal

discoverOpportunities

getOpportunity

compareOpportunities

generateStrategy

simulateStrategy

validatePolicy

prepareTransaction

getTransactionStatus

getMonitoringAlerts
```

---

# 22. Tool Contract Example

```typescript
interface DiscoverOpportunitiesInput {
  wallet: string;

  asset?: string;

  category?: "DEFI" | "RWA";

  maxRiskScore?: number;

  minimumApy?: number;
}
```

Output:

```typescript
interface DiscoverOpportunitiesResult {
  opportunities: Opportunity[];

  timestamp: string;
}
```

---

# 23. AI Data Boundary

AI receives:

```text
structured verified data
```

AI never receives permission to directly:

```text
query arbitrary contracts

create arbitrary calldata

sign transactions

modify policy

change protocol allowlists
```

---

# 24. Intent Engine

Purpose:

Translate:

> “Earn low-risk yield on $4,000 but keep $1,000 liquid.”

Into:

```json
{
  "objective": "yield",
  "capitalUsd": 4000,
  "minimumLiquidUsd": 1000,
  "riskPreference": "conservative",
  "leverageAllowed": false
}
```

---

# 25. Intent Processing

```text
Natural Language
     ↓
Intent LLM
     ↓
Schema Validation
     ↓
Financial Constraint Validation
     ↓
User Confirmation
     ↓
Confirmed Intent
```

Schema validation:

```text
Zod
```

---

# 26. Strategy Engine

Strategy creation should remain deterministic after AI intent parsing.

AI does not directly decide allocation numbers.

Architecture:

```text
Confirmed Intent
      +
Portfolio
      +
User Policy
      +
Opportunities
      ↓
Constraint Filter
      ↓
Opportunity Ranking
      ↓
Allocation Engine
      ↓
Strategy Scoring
      ↓
Trade-Off Analysis
      ↓
Strategy Object
```

---

# 27. Constraint Filter

Reject:

```text
Risk > allowed

Protocol blocked

Asset blocked

Insufficient liquidity

RWA disabled

Leverage prohibited

Unsupported execution

Stale data
```

---

# 28. Opportunity Ranking

Example scoring framework:

```text
Yield Utility          30%

Risk Quality           30%

Liquidity              20%

Diversification        10%

Switching Cost         10%
```

The exact weight changes depending on user policy.

For conservative:

```text
Risk weight increases.
```

For aggressive:

```text
Yield weight increases.
```

---

# 29. Allocation Engine

Input:

```text
Available Capital:
$5,000

Minimum Liquidity:
$1,000

Max Protocol Exposure:
30%
```

Therefore:

```text
Investable:
$4,000

Max per protocol:
$1,500
```

The allocator must satisfy all constraints.

---

# 30. Strategy Object

```typescript
interface NaviStrategy {
  id: string;

  intentId: string;

  portfolioSnapshotId: string;

  allocations: Allocation[];

  actions: StrategyAction[];

  expectedApy: Decimal;

  projectedReturnUsd: Decimal;

  riskBefore: number;

  riskAfter: number;

  liquidityBefore: Decimal;

  liquidityAfter: Decimal;

  status:
    | "DRAFT"
    | "SIMULATED"
    | "APPROVED"
    | "EXECUTED";
}
```

---

# 31. Trade-Off Engine

Calculate:

```text
Yield difference

Risk difference

Liquidity difference

Protocol concentration

Asset concentration

Estimated gas

Slippage

Lock duration

Redemption restrictions
```

Then give structured data to AI.

Example:

```json
{
  "yieldDelta": 1.4,
  "riskDelta": 6,
  "liquidityImpact": "lower",
  "estimatedAnnualGainUsd": 42,
  "switchCostUsd": 0.11
}
```

AI converts this into plain language.

---

# 32. Risk Engine

Risk Engine must be independent of the LLM.

Components:

```text
Protocol Risk

Smart Contract Risk

Liquidity Risk

Asset Risk

Concentration Risk

Counterparty Risk

Redemption Risk

Dependency Risk
```

---

# 33. Risk Engine Architecture

```text
Opportunity
     ↓
Relevant Risk Modules
     ↓
Raw Risk Factors
     ↓
Normalize
     ↓
Weighted Risk Score
     ↓
0–100
     ↓
Risk Explanation Data
```

---

# 34. Risk Object

```typescript
interface RiskAssessment {
  score: number;

  level:
    | "LOW"
    | "MODERATE"
    | "ELEVATED"
    | "HIGH"
    | "CRITICAL";

  factors: {
    category: string;
    score: number;
    weight: number;
    contribution: number;
  }[];

  timestamp: string;
}
```

---

# 35. Risk Versioning

Every risk calculation should store:

```text
modelVersion
dataTimestamp
calculatedAt
```

Example:

```text
risk_model_v1
```

This helps reproduce past recommendations.

---

# 36. Policy System

The Policy System controls what NAVI may recommend or prepare.

Policy exists:

```text
Offchain:
Full structured configuration

Onchain:
Policy commitment / hash
```

---

# 37. Policy Lifecycle

```text
User creates policy
      ↓
Policy validated
      ↓
Canonical JSON generated
      ↓
Policy hash generated
      ↓
Optional X Layer commitment
      ↓
Policy becomes ACTIVE
```

---

# 38. Policy Rules

MVP:

```text
Maximum Risk Score

Minimum Portfolio Liquidity

Maximum Protocol Exposure

Maximum Slippage

Allowed Assets

Blocked Assets

Allowed Protocols

Blocked Protocols

Allow RWA

Allow Leverage

Maximum Transaction Size
```

---

# 39. Policy Evaluation

Every action:

```text
Proposed Transaction
       ↓
Projected Portfolio State
       ↓
Policy Validator
       ↓
Rule-by-rule Checks
       ↓
PASS
WARNING
BLOCK
```

---

# 40. Policy Rule Example

```typescript
interface PolicyRuleResult {
  rule: string;

  result:
    | "PASS"
    | "WARNING"
    | "BLOCK";

  expected: string;

  actual: string;

  reason?: string;
}
```

---

# 41. Simulation System

Simulation provides:

> What will happen if the user signs?

Architecture:

```text
Strategy Actions
      ↓
Transaction Builder
      ↓
RPC eth_call / Simulation Provider
      ↓
Execution Result
      ↓
Gas Estimate
      ↓
Slippage Estimate
      ↓
Projected Balances
      ↓
Projected Portfolio
      ↓
Policy Validation
```

---

# 42. Simulation State

```typescript
interface Simulation {
  id: string;

  strategyId: string;

  status:
    | "PENDING"
    | "SUCCESS"
    | "FAILED";

  estimatedGasUsd: Decimal;

  expectedSlippageUsd: Decimal;

  before: PortfolioProjection;

  after: PortfolioProjection;

  policyValidation: PolicyValidation;

  warnings: string[];

  expiresAt: string;
}
```

---

# 43. Simulation Expiration

Simulation must expire.

Example:

```text
TTL:
2 minutes
```

Before actual signing:

```text
refresh prices
refresh balances
refresh opportunity
revalidate policy
```

---

# 44. Execution Engine

Execution flow:

```text
Approved Strategy
      ↓
Valid Simulation
      ↓
Fresh Market State
      ↓
Fresh Policy Validation
      ↓
Build Transaction
      ↓
Return Tx to Frontend
      ↓
Wallet Signature
      ↓
Broadcast
      ↓
Track
      ↓
Confirm
```

---

# 45. Protocol Adapter System

Protocol integrations must use adapters.

Example:

```text
Protocol A

deposit()
withdraw()
claim()
```

Adapter maps internal NAVI actions to protocol calls.

---

# 46. Adapter Structure

```text
packages/execution/adapters/

├── protocol-a/
│   ├── config.ts
│   ├── deposit.ts
│   ├── withdraw.ts
│   └── simulate.ts
│
└── rwa-protocol/
    ├── config.ts
    ├── subscribe.ts
    └── redeem.ts
```

---

# 47. Adapter Safety

Each adapter must define:

```text
Allowed contracts

Allowed methods

Supported assets

Minimum amount

Maximum amount

Required approvals

Expected outputs
```

AI cannot alter these definitions.

---

# 48. Prepared Transaction

```typescript
interface PreparedTransaction {
  chainId: number;

  from: string;

  to: string;

  data: string;

  value: bigint;

  gasEstimate: bigint;

  description: string;

  simulationId: string;

  expiresAt: string;
}
```

---

# 49. Transaction Tracking

Lifecycle:

```text
CREATED

AWAITING_SIGNATURE

SIGNED

SUBMITTED

PENDING

CONFIRMED

FAILED
```

---

# 50. Transaction Confirmation

After confirmation:

```text
Fetch receipt

Verify status == success

Update execution record

Refresh portfolio

Create new portfolio snapshot

Start monitoring position
```

Never update position optimistically as permanently successful before receipt confirmation.

---

# 51. Smart Contract Architecture

MVP contracts:

```text
NaviPolicyManager.sol

NaviExecutor.sol
```

---

# 52. NaviPolicyManager

Purpose:

Commit financial policies onchain.

Responsibilities:

```text
Create policy commitment

Update policy commitment

Increment policy version

Retrieve active hash

Emit events
```

It should not contain sensitive financial profile data.

---

# 53. NaviExecutor

Purpose:

Provide restricted execution layer.

Responsibilities:

```text
Validate approved targets

Validate function selectors

Validate token permissions

Validate spending limits

Execute protocol call

Emit execution event
```

---

# 54. NaviExecutor Concept

```solidity
contract NaviExecutor {
    mapping(address => bool) public approvedTargets;

    mapping(bytes4 => bool) public approvedSelectors;

    function execute(
        address target,
        bytes calldata data
    )
        external
    {
        require(approvedTargets[target]);

        bytes4 selector;

        assembly {
            selector := calldataload(data.offset)
        }

        require(approvedSelectors[selector]);

        // execute
    }
}
```

Production implementation requires stronger controls.

---

# 55. Smart Contract Events

Policy:

```solidity
event PolicyCommitted(
    address indexed user,
    bytes32 policyHash,
    uint256 version
);
```

Execution:

```solidity
event ActionExecuted(
    address indexed user,
    address indexed target,
    bytes4 indexed selector,
    bytes32 strategyId
);
```

---

# 56. Onchain / Offchain Split

Store onchain:

```text
Policy hash

Execution transactions

Contract events

Asset movements

Protocol interactions
```

Store offchain:

```text
Full portfolio snapshots

AI conversations

Risk breakdown

Opportunity data

Strategy reasoning

Simulation metadata

Monitoring history
```

---

# 57. Database Architecture

Primary database:

```text
PostgreSQL
```

Recommended provider:

```text
Supabase
```

---

# 58. Core Database Relationships

```text
User
 │
 ├── Wallets
 │
 ├── Policies
 │
 ├── PortfolioSnapshots
 │
 ├── Strategies
 │      │
 │      ├── Actions
 │      └── Simulations
 │
 ├── Executions
 │
 ├── AI Sessions
 │
 └── Monitoring Events
```

---

# 59. User Table

```sql
users

id uuid primary key
created_at timestamptz
updated_at timestamptz
```

---

# 60. Wallet Table

```sql
wallets

id uuid primary key
user_id uuid references users(id)
address varchar not null
chain_id integer not null
verified boolean default false
created_at timestamptz
```

Unique:

```text
(address, chain_id)
```

---

# 61. Portfolio Snapshots

```sql
portfolio_snapshots

id uuid primary key
user_id uuid
wallet_id uuid
total_value_usd numeric
portfolio_json jsonb
risk_score integer
created_at timestamptz
```

---

# 62. Opportunities Table

```sql
opportunities

id uuid primary key
protocol_id varchar
chain_id integer
market_type varchar
asset_address varchar
apy numeric
risk_score integer
liquidity_score integer
metadata jsonb
data_timestamp timestamptz
```

---

# 63. Strategy Table

```sql
strategies

id uuid primary key
user_id uuid
intent_json jsonb
strategy_json jsonb
expected_apy numeric
risk_before integer
risk_after integer
status varchar
created_at timestamptz
```

---

# 64. Simulation Table

```sql
simulations

id uuid primary key
strategy_id uuid
simulation_json jsonb
policy_status varchar
status varchar
created_at timestamptz
expires_at timestamptz
```

---

# 65. Execution Table

```sql
executions

id uuid primary key
strategy_id uuid
simulation_id uuid
wallet_id uuid
tx_hash varchar
chain_id integer
status varchar
submitted_at timestamptz
confirmed_at timestamptz
```

---

# 66. AI Sessions

```sql
ai_sessions

id uuid primary key
user_id uuid
title varchar
created_at timestamptz
```

Messages:

```sql
ai_messages

id uuid primary key
session_id uuid
role varchar
content text
tool_metadata jsonb
created_at timestamptz
```

Never store secrets in AI messages.

---

# 67. Monitoring Architecture

Monitoring service continuously evaluates positions.

```text
Scheduler
   ↓
Active User Positions
   ↓
Fetch Market Updates
   ↓
Refresh Risk
   ↓
Compare Snapshot
   ↓
Evaluate Policy
   ↓
Detect Event
   ↓
Generate Recommendation
   ↓
Notify User
```

---

# 68. Monitoring Scheduler

Hackathon:

```text
cron every 10 minutes
```

Post-MVP:

Different cadences:

```text
Risk:
1–5 min

Yield:
15 min

Portfolio:
5 min

RWA:
hourly / daily depending on source
```

---

# 69. Monitoring State Machine

```text
NORMAL

↓

CHANGE_DETECTED

↓

EVALUATING

↓

NO_ACTION
or
RECOMMENDATION

↓

USER_REVIEW

↓

SIMULATION

↓

EXECUTION
```

---

# 70. Alert Severity

```text
INFO

OPPORTUNITY

WARNING

CRITICAL
```

Examples:

```text
INFO:
APY changed 0.1%

OPPORTUNITY:
Meaningfully better yield available

WARNING:
Risk approaching limit

CRITICAL:
Policy violated
```

---

# 71. API Architecture

Namespaces:

```text
/api/auth

/api/portfolio

/api/agent

/api/opportunities

/api/risk

/api/strategy

/api/simulation

/api/policy

/api/execution

/api/monitoring
```

---

# 72. API Example — Portfolio

```text
GET /api/portfolio
```

Response:

```json
{
  "totalUsd": "8420.51",
  "riskScore": 23,
  "liquidUsd": "3100.00",
  "positions": [],
  "updatedAt": "..."
}
```

---

# 73. API Example — Agent

```text
POST /api/agent/chat
```

Request:

```json
{
  "sessionId": "...",
  "message": "Find better yield for my USDC"
}
```

Backend:

```text
Authenticate
 ↓
Load policy
 ↓
Agent determines tools
 ↓
Execute tools
 ↓
Return structured response
```

---

# 74. Structured Agent Response

Avoid plain text-only responses.

```typescript
interface AgentResponse {
  message: string;

  components?: (
    | OpportunityCard
    | ComparisonCard
    | StrategyCard
    | AlertCard
    | ActionCard
  )[];

  suggestedActions?: string[];
}
```

---

# 75. Strategy Endpoint

```text
POST /api/strategy/generate
```

Request:

```json
{
  "intentId": "..."
}
```

Pipeline:

```text
Load portfolio

Load policy

Load current opportunities

Filter

Rank

Allocate

Calculate risk

Calculate trade-offs

Persist

Return
```

---

# 76. Simulation Endpoint

```text
POST /api/simulation
```

Input:

```json
{
  "strategyId": "..."
}
```

Returns:

```text
Simulation ID

Before state

After state

Gas

Slippage

Warnings

Policy checks

Expiration
```

---

# 77. Security Architecture

Security boundaries:

```text
AI Boundary

API Boundary

Database Boundary

Execution Boundary

Wallet Boundary

Contract Boundary
```

---

# 78. AI Security

Prevent:

```text
prompt injection

tool misuse

financial hallucination

arbitrary execution
```

Mitigations:

```text
strict tool schemas

output validation

system prompts

tool allowlists

external data isolation

deterministic financial logic
```

---

# 79. Financial Data Security

Every data object should include:

```text
source

retrievedAt
```

Execution requires:

```text
freshEnough == true
```

---

# 80. Transaction Security

Before wallet signing:

```text
Confirm target

Confirm selector

Confirm amount

Confirm token

Confirm expected output

Confirm simulation freshness

Confirm policy

Confirm chain ID
```

---

# 81. Token Approval Security

Default:

```text
exact approval
```

Avoid unlimited token approval unless strictly necessary.

If an unlimited approval is required:

```text
explicitly disclose it
```

---

# 82. Smart Contract Security

Required:

```text
ReentrancyGuard

Pausable

SafeERC20

AccessControl

Allowlisted targets

Allowlisted selectors

Explicit events
```

---

# 83. Backend Secrets

Environment variables:

```text
DATABASE_URL

LLM_API_KEY

RPC_URL

PRICE_API_KEY

DATA_PROVIDER_KEYS
```

Never expose server-only secrets through:

```text
NEXT_PUBLIC_
```

---

# 84. Observability Architecture

Use structured logging.

Example:

```json
{
  "event": "strategy_generated",
  "strategyId": "...",
  "userId": "...",
  "riskBefore": 14,
  "riskAfter": 22
}
```

Track:

```text
API errors

AI tool calls

RPC failures

simulation failures

policy blocks

transaction reverts

data freshness failures
```

---

# 85. Error Model

Use machine-readable errors.

```typescript
interface NaviError {
  code: string;

  message: string;

  retryable: boolean;

  metadata?: Record<string, unknown>;
}
```

Examples:

```text
WRONG_NETWORK

STALE_PRICE_DATA

RPC_UNAVAILABLE

SIMULATION_FAILED

POLICY_BLOCKED

INSUFFICIENT_BALANCE

TRANSACTION_REVERTED

OPPORTUNITY_UNAVAILABLE
```

---

# 86. Cache Architecture

Suggested:

```text
Portfolio:
0–60 seconds

Opportunities:
2–5 minutes

Price:
15–60 seconds

RWA metadata:
hours

Risk score:
until relevant data changes
```

Always force fresh data before transaction creation.

---

# 87. Data Precision

Do not use:

```text
JavaScript number
```

for blockchain balances.

Use:

```text
bigint
```

For financial decimal arithmetic:

```text
Decimal.js
or
big.js
```

Database:

```text
NUMERIC
```

---

# 88. Background Jobs

Hackathon:

```text
Vercel Cron
or
Supabase scheduled functions
```

Jobs:

```text
refresh_opportunities

monitor_positions

refresh_risk

clean_expired_simulations
```

---

# 89. Scalability Model

MVP:

```text
One application backend
```

Later split:

```text
AI Service

Portfolio Indexer

Opportunity Service

Risk Service

Simulation Service

Execution Service

Monitoring Service
```

---

# 90. Post-MVP Architecture

```text
                  API Gateway
                       │
       ┌───────────────┼─────────────────┐
       │               │                 │
       ▼               ▼                 ▼
 AI Service      Portfolio Service   Strategy Service
       │               │                 │
       ▼               ▼                 ▼
 Risk Service    Opportunity Service Simulation Service
       │               │                 │
       └───────────────┼─────────────────┘
                       │
                 Execution Service
                       │
                   X Layer
```

---

# 91. Future Agentic Wallet Architecture

Later:

```text
User Policy
     ↓
Delegated Session
     ↓
NAVI Agent
     ↓
Safety Engine
     ↓
Agent Wallet
     ↓
Transaction
```

The delegation must contain:

```text
spending limit

expiry

approved assets

approved contracts

allowed actions
```

---

# 92. Future Autopilot Architecture

```text
Monitoring Event
      ↓
NAVI Detects Risk
      ↓
Generate Response
      ↓
Simulation
      ↓
Policy Validation
      ↓
Delegated Permission Validation
      ↓
Automatic Execution
      ↓
User Notification
```

No autonomous execution without explicit prior delegation.

---

# 93. Core System State Machine

```text
NO_WALLET

↓

CONNECTED

↓

PORTFOLIO_READY

↓

GOAL_DEFINED

↓

STRATEGY_CREATED

↓

SIMULATED

↓

POLICY_VALIDATED

↓

AWAITING_APPROVAL

↓

EXECUTING

↓

CONFIRMED

↓

MONITORING
```

Failure states:

```text
SIMULATION_FAILED

POLICY_BLOCKED

EXECUTION_FAILED

DATA_STALE
```

---

# 94. Strategy State Machine

```text
DRAFT
  ↓
GENERATED
  ↓
SIMULATED
  ↓
APPROVED
  ↓
EXECUTING
  ↓
EXECUTED
```

Alternate:

```text
BLOCKED

EXPIRED

REJECTED

FAILED
```

---

# 95. Execution State Machine

```text
PREPARED

↓

AWAITING_SIGNATURE

↓

SUBMITTED

↓

PENDING

↓

CONFIRMED
```

or:

```text
USER_REJECTED

REVERTED

EXPIRED
```

---

# 96. End-to-End Example

User:

> Earn conservative yield on 4,000 USDC while keeping 1,000 liquid.

System:

```text
1. Agent parses goal.

2. Intent schema created.

3. User confirms.

4. Portfolio Engine confirms sufficient USDC.

5. Policy Engine loads:
   max risk = 30
   min liquidity = 20%
   max protocol exposure = 30%.

6. Opportunity Engine retrieves:
   Protocol A
   Protocol B
   RWA C.

7. Risk Engine scores:
   A = 18
   B = 46
   C = 21.

8. Constraint Filter removes B.

9. Strategy Engine allocates:
   $1,500 → A
   $1,500 → C
   $1,000 → Liquid.

10. Trade-Off Engine calculates outcomes.

11. AI explains strategy.

12. User requests simulation.

13. Simulation Engine builds transactions.

14. Transactions simulated.

15. Portfolio projection calculated.

16. Policy checks pass.

17. User receives Action Cards.

18. User signs.

19. Transaction sent to X Layer.

20. Confirmation received.

21. Portfolio refreshed.

22. Monitoring begins.
```

---

# 97. Hackathon Minimum Architecture

To avoid overbuilding, the first functional version requires:

### Frontend

```text
Wallet

Overview

NAVI Agent

Strategy

Simulation

Policy

Activity
```

### Backend

```text
Portfolio Engine

AI Orchestrator

Opportunity Engine

Risk Engine

Strategy Engine

Simulation Engine

Policy Engine

Execution Builder
```

### Blockchain

```text
X Layer

NaviPolicyManager

At least one live protocol transaction
```

### Database

```text
Users

Policies

Strategies

Simulations

Executions

Snapshots
```

---

# 98. Engineering Build Order

Build in this sequence.

## Stage 1

```text
Next.js
Wallet
X Layer
Database
Authentication
```

## Stage 2

```text
Portfolio Reader
Token Balances
Price Data
Portfolio Dashboard
```

## Stage 3

```text
Opportunity Model
DeFi data
RWA data
Risk scoring
```

## Stage 4

```text
NAVI AI Agent
Tool calling
Intent parsing
```

## Stage 5

```text
Strategy Engine
Constraint Engine
Trade-Off Engine
```

## Stage 6

```text
Simulation
Policy Validation
Action Cards
```

## Stage 7

```text
Protocol Adapter
Transaction Builder
Wallet Signing
X Layer Execution
```

## Stage 8

```text
Monitoring
Alerts
Risk changes
Opportunity changes
```

## Stage 9

```text
Onchain Policy Contract
Proof of Intent
```

## Stage 10

```text
Polish
Testing
Demo
Mainnet
```

---

# 99. Architecture Definition of Done

Architecture is correctly implemented when:

```text
AI cannot directly move assets.

AI cannot fabricate financial data.

All financial numbers originate from deterministic systems.

All transactions are simulated before execution.

All proposed actions are checked against policy.

Only supported protocol adapters can produce executable transactions.

User signs all MVP transactions.

Blockchain state is independently verified after execution.

Portfolio state updates from confirmed onchain data.

Monitoring continues after execution.

Every recommendation can explain:
what,
why,
benefit,
risk,
cost,
and policy impact.
```

---

# 100. Final System Definition

NAVI is not architected as a chatbot connected to a wallet.

It is architected as a **financial decision and execution system**.

The system consists of:

```text
AI Agent
+
Portfolio Intelligence
+
Opportunity Intelligence
+
Risk Engine
+
Strategy Engine
+
Trade-Off Engine
+
Simulation Engine
+
Policy Engine
+
Restricted Execution Layer
+
X Layer Settlement
+
Continuous Monitoring
```

Each component has a clear responsibility.

The most important separation is:

> **The AI interprets and explains. The financial engines calculate. The safety system decides what is permitted. The execution system prepares controlled transactions. The user authorizes. X Layer settles and verifies.**

That separation is the foundation of NAVI's security, usability, and technical credibility.
