# Kaju private-AI processing assessment

Prepared 2 November 2026. **Not approved for private customer content.** No model, provider, paid plan or processing flag was changed in this release.

## Route assessed

| Item | Existing implementation / evidence |
|---|---|
| Application | StrayPaw Kaju, `/api/ai`, `src/sp3/ai/engine.ts` |
| Gateway / processor | Vercel AI Gateway, `https://ai-gateway.vercel.sh`, Anthropic-compatible Messages transport |
| Model developer and model | Google, `google/gemini-2.5-flash`; the Anthropic SDK is a protocol client, not evidence that Anthropic processes this Google model request |
| Authentication | Vercel request-context OIDC; optional Gateway API key. Credentials are server-side and never conversation content |
| Actual serving provider, region, BYOK status | **Not established by model ID or project env metadata.** No provider allowlist or retention/training filter is set in the application request. Gateway can route to eligible endpoints; inspect the generation's provider/routing details and the team's settings before approving private processing |
| Direct-provider fallback | Code supports a separately configured Anthropic key, but its exact transport/model needs a different approval string. Approval of the Gateway model cannot authorise a direct route |
| Current private gate | `STRAYPAW_AI_APPROVED_DATA_ROUTE` remains unset. Authenticated and customer text uses permission-scoped deterministic record tools inside StrayPaw |
| Public exception | One unauthenticated, standalone “Hello/Hi/Hey [Kaju]”. Page/workspace/role context is replaced by generic public context before transmission. Arbitrary guest text is not covered by this exception |

## Data flow if this exact route is approved

Browser → StrayPaw authenticated API → Vercel Gateway → serving model endpoint → Gateway → StrayPaw tool loop → browser. Tool execution remains in StrayPaw or an explicitly connected provider; the model does not receive Supabase credentials or arbitrary database access.

| Data category | Potential transmitted content | Limit / safeguard |
|---|---|---|
| Conversation | Latest 12 user/assistant messages, including pasted field reports and extracted document text | 6,000 characters per message; these can still contain personal data and are not automatically anonymised |
| Context | UTC date, organisation-membership indicator, server-verified role, current path and workspace | Path capped at 200 characters; workspace at 80. Context is untrusted data, not permission |
| System instructions | Domain guidance, human approval requirements, source and safety rules | Static system block requests ephemeral provider caching. Provider caching terms must be assessed; this is not proof of no retention |
| Tool definitions | Tool names, descriptions and schemas; connected tools only when the user's connection and permissions allow them | No broad database tool; no clinical certification, veterinary authorisation or government acceptance tool |
| Tool results | Authorised record IDs, titles, notes, animal/case information, locations, counts, deadlines, source links and action receipts; connected-document/email excerpts when those tools are available | Caller-session RLS and explicit organisation filters; bounded reads. Sensitive contact information, addresses and geolocation can occur in user text or records. They are not automatically redacted |
| Model output | Answer text, requested tool arguments and proposed changes | Validated structured output and safe links; tool calls bounded to 6 rounds / 12 calls / 45 seconds; 4,000 output tokens per call; no SDK retries |
| Confirmed actions | Only a user-confirmed proposal is written | Source record and audit are independently read before a success receipt; receipts do not establish veterinary or municipal approval |

Native PDF/DOCX/XLSX/CSV/PPTX extraction runs in StrayPaw. Reading a file does not itself upload it to a language model, but adding extracted text to an approved model conversation would transmit that text. Current private gate prevents that route. Session conversation history is browser session storage scoped to user, organisation, role and reviewing office; operational records, snapshots and action audits remain in Supabase. This is not a promise of an automatically enforced retention schedule for those internal records.

## Retention and training assessment

1. **Vercel Gateway content:** Vercel states that Gateway does not retain prompts or outputs after request completion and does not train on them. This does not establish the upstream model endpoint's policy or the application host's operational-log retention.
2. **Upstream provider:** Gateway documentation says provider retention/training restrictions are not routing defaults. Google's model name alone cannot establish a serving endpoint, retention period, processing region or contract. Vercel lists Google Vertex AI among providers with negotiated no-training/ZDR terms; that listing is conditional evidence, not verification that this application's current requests used that route.
3. **Available controls:** `disallowPromptTraining: true` is a documented request filter. Provider allowlisting and ZDR can further constrain routing. The current application does not send these controls. Vercel documents per-request ZDR on Pro/Enterprise without an additional request fee, and a charged team-wide option. No plan upgrade or charged setting has been enabled. Availability and compatibility with the existing Messages transport must be tested before activation.
4. **Caches and logs:** The static system prompt requests ephemeral caching; provider-side cache retention needs separate confirmation. Gateway routing-attempt details are documented as retained for 30 days. Metadata retention is distinct from prompt/output retention. Do not include private text in logs or infer zero metadata retention from ZDR.
5. **Google terms:** Paid Gemini API terms, unpaid Gemini terms and Vertex AI terms differ. Gateway credit balance does not establish which Google contract applies. Do not approve private processing by citing a generic Gemini free/paid policy alone.
6. **Risk conclusion:** Private processing is **not ready to activate** until the actual serving route, region, applicable contract, training restriction, retention (including abuse monitoring and prompt caching), subprocessor terms and any cross-border obligations are documented. The current safe mode remains record tools.

## Approval record to complete before activation

An approval must identify `gateway:google/gemini-2.5-flash`, the allowed serving provider(s) and regions, contract/DPA references, permitted data categories and organisations, retention/cache/abuse-monitoring terms, training restrictions, accountable owner and date. Confirm organisations' authority to submit third-party personal data; exclude unnecessary personal/clinical details. Record the Gateway settings and a synthetic test generation showing the actual provider and enforced filters. Then run denied-route/failure/timeout/isolation/tool/confirmed-write tests before setting the exact approval variable in Production. No blanket approval or purchase is requested by this document.

## Primary sources consulted

- [Vercel Gateway ZDR and provider policies](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr)
- [Vercel Gateway disallow prompt training](https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training)
- [Vercel Gateway logs and routing metadata](https://vercel.com/docs/ai-gateway/observability-and-spend/logs)
- [Vercel DPA](https://vercel.com/legal/dpa)
- [Google Vertex AI data governance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/your-data) — provider policy linked by Vercel; applicable account terms still need confirmation
- [Gemini API terms](https://ai.google.dev/gemini-api/terms)
- [Gemini API zero data retention](https://ai.google.dev/gemini-api/docs/zdr)

Policies can change. This is an engineering assessment of this implementation, not legal advice or a certification of the provider contract.
