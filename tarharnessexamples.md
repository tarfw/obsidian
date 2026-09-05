# TAR Harness Examples

Illustrative definitions only. The canonical standard is `tar-harness.md`.

## Contact and links

~~~yaml
Contact:
  roles: [customer, vendor]
  flow_memberships: [sales.follow_up]
  identities: [email, phone, social_account]
~~~

~~~text
Order ─belongs to→ Contact
Task ─for→ Project
Quote ─for→ Opportunity
Document ─attached to→ Contact
Interaction ─about→ Order
~~~

## Human Action waiting in Inbox

~~~text
Flow: Support
Action: Request order details
  → Task: Send order number to the support team
  → Inbox: assigned to the customer or team member
~~~

## Agent Action definition

~~~yaml
objective: Qualify this lead
context: permitted Records and current Flow Run
allowed_next_actions: [opportunity.qualify, task.create, channel.message.send]
budget: declared
timeout: declared
fallback_action: inbox.request_input
~~~

## Common Flows

~~~text
Sales:   Capture lead → Qualify → Manage → Quote → Close → Follow up
Support: Receive → Identify → Triage → Resolve/Escalate → Confirm → Follow up
~~~

## Action contract

~~~yaml
id: order.create
version: 1.0.0
type: app
input: schema
output: schema
reads: [Contacts, Products]
effects: [record_create]
roles: [owner, member]
record_scope: assigned
approval: not_required
idempotency: required
timeout: 30s
retry: safe_only
cost: declared
audit: full
~~~

## Inbound channel event

~~~yaml
inbox_event:
  provider: zernio
  channel: instagram
  provider_message_id: unique
  conversation_key: provider-specific
  type: message.received
  content: normalized_payload
~~~

## Action interface declaration

~~~yaml
id: action.id
input: schema
interfaces: [client.interface_key]
~~~

## AI-first creation

~~~yaml
Team Onboarding:
  records: [Contacts, Documents]
  actions:
    - Collect details
    - Enrich permitted details
    - Collect documents
    - Review documents
    - Sign agreement
    - Approve membership
    - Activate access
~~~
