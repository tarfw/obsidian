# Jev sources

Checked 2026-09-21. Use TypeSafe documentation as the provider contract. Community
articles are context and hypotheses to validate, not authority for thresholds.

## Primary TypeSafe documentation

| Source | What it answers |
|---|---|
| [System One](https://docs.typesafe.ai/concepts/system-one.md) | Product model and boundaries |
| [State](https://docs.typesafe.ai/concepts/state.md) | State construction and shared evaluation |
| [Primitives](https://docs.typesafe.ai/primitives.md) | Choice, Score and Noul |
| [Choice](https://docs.typesafe.ai/primitives/choice.md) | Candidate selection and distributions |
| [Score](https://docs.typesafe.ai/primitives/score.md) | Ordered rubrics and weighted score output |
| [Noul](https://docs.typesafe.ai/primitives/noul.md) | Yes/no probability semantics |
| [Advanced structure](https://docs.typesafe.ai/primitives/advanced.md) | Structured instructions and criteria |
| [Confidence](https://docs.typesafe.ai/confidence.md) | Distribution concentration and routing |
| [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md) | Code-controlled workflow composition |
| [API](https://docs.typesafe.ai/api.md) | Endpoint, schema, answers and errors |
| [Models](https://docs.typesafe.ai/models.md) | Aliases, limits, price, data handling |
| [SDK overview](https://docs.typesafe.ai/sdk.md) | Supported client libraries |
| [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript.md) | JavaScript integration contract |
| [Python SDK](https://docs.typesafe.ai/sdk/python.md) | Python integration contract |
| [Legal](https://docs.typesafe.ai/legal.md) | DPA, privacy policy and enterprise ZDR information |
| [Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md) | Literal, numeric, adversarial and invariant failures |
| [Fan-out](https://docs.typesafe.ai/patterns/fan-out.md) | Parallel independent questions |
| [Composite scoring](https://docs.typesafe.ai/patterns/composite-scoring.md) | Code-owned weights over atomic dimensions |
| [Value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md) | Candidate selection and verbatim copy |
| [Guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails.md) | Hazard batteries, severity and precedence |

## Community context

| Source | Appropriate use |
|---|---|
| [Jason Zhou: GTM automation](https://x.com/jasonzhou1993/status/2101925228335317238) | Workflow ideas and author-reported outcomes |
| [Treg Jev recipes](https://treg.to/jev) | Example sequencing, gateway adapter and caveats |
| [Linked Treg comparison post](https://x.com/jasonzhou1993/status/2100175886599524555) | A marketing claim, not a general benchmark |

The public recipe page reports support-ticket timings and several GTM examples.
It also identifies its signup display as synthetic and includes an incomplete
launch-routing branch for artificial engagement. Do not inherit those policies
without TAR evaluation.

## Checked provider facts

- Stable alias: jev-latest; checked target: jev-1.13.0.
- Price: USD 0.042 per million input tokens; output tokens free.
- Request: 64k total tokens; state plus longest question: 32k.
- Input: text only, represented as string, JSON object or text array.
- Native endpoint: POST https://api.typesafe.ai/v1/systemone.
- Native yes/no question type: noul.
- Rate limits are dynamic; checked documentation lists 250k tokens/second and
  1,200 requests/minute.
