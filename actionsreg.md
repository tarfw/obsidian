# TAR Action Registry

**Canonical capability standard**

**Terminology:** [TAR Harness](tar-harness.md) owns the architecture. Flow is the product term; existing `workflow.*` IDs remain compatibility names. Existing `step.*` IDs refer to Action-occurrence lifecycle operations reserved for the engine, not a separate Step entity or builder layer. Listed capabilities are a catalog, not first-release scope.

TAR uses **Actions** to perform work inside Flows. An Action is a registered, versioned capability with a declared input, output, authority, risk and audit contract.

```text
Records hold truth.
Flows organise Actions.
Each Flow occurrence uses one registered Action.
Gateway authorises every official effect.
```

Normal product language says **Records**, **Flows** and **Actions**. `artifact`, primitive, tool, skill, model and MCP are internal engineering terms.

## 1. One user-facing model

```text
Trigger
  -> Flow Run
  -> Action
  -> Gateway validation
  -> Record / external effect / next Action
```

| Concept | Meaning |
| :--- | :--- |
| Record | Official information, such as a Contact, Order or Document. |
| Flow | A repeatable process. |
| Run | One execution of a versioned Flow. |
| Action | A registered capability used by a Flow. |
| Gateway | The only authority that commits official Record or external changes. |

An Action is one of three types:

| Type | Meaning | May commit directly? |
| :--- | :--- | :---: |
| `app` | Deterministic code or approved integration. | Only through Gateway. |
| `agent` | AI reasoning, drafting, extraction, research or bounded choice. | No; it proposes. |
| `human` | Person supplies information, a decision or approval. | Gateway validates the response. |

`agent` describes the Action implementation. An Agent Action may produce a fixed output or choose only allowlisted Actions and routes within its budget. There is no separate Step or control-mode layer.

## 2. What belongs in the Registry

```text
Action Registry
|-- Core TAR Actions
|-- Installed app and connector Actions
|-- Workspace Action bindings
`-- Action versions and audit metadata
```

The Registry is the sole catalog for executable capabilities. It hides implementation sources:

```text
Native application code
MCP server capability
Provider API / SDK
Sandbox operation
AI capability
Human Inbox interaction
      -> one registered Action
```

Users see a plain **Add action** picker. Owners/admins may inspect effects, access, approval and cost. The full catalog remains in `Build -> Actions`.

## 3. Core Action catalog

### 3.1 Records and links

```text
record.search          record.list            record.read
record.count           record.create          record.update
record.change_status   record.assign          record.archive
record.restore         record.import          record.export

link.search            link.list              link.create
link.update            link.remove
```

No Agent receives unrestricted SQL, a generic database writer or unrestricted Record access. Every Record mutation is a Gateway request with schema, access, version and idempotency checks.

### 3.2 Files and documents

```text
file.upload            file.read              file.download
file.rename            file.archive           file.extract_text
file.convert           file.generate          file.attach

document.create        document.read          document.update
document.render        document.send          document.sign_request
document.archive
```

### 3.3 Flow and Inbox

```text
workflow.search        workflow.start         workflow.pause
workflow.resume        workflow.cancel        workflow.read_status

step.start             step.complete          step.fail
step.retry             step.skip              step.choose_next

inbox.create           inbox.assign           inbox.reassign
inbox.request_input    inbox.request_approval inbox.remind
inbox.complete         inbox.reject           inbox.escalate
```

`workflow.define`, `workflow.update`, `workflow.publish` and `workflow.disable` are Build-only management Actions.

### 3.4 Communication and channels

```text
channel.receive        channel.send_message   channel.reply
channel.send_file      channel.send_template  channel.mark_read
channel.fetch_history  channel.search_messages

email.send             email.reply            email.forward
email.read             email.search
sms.send               sms.reply
chat.send              chat.reply             chat.read_thread
voice.call             voice.end_call         voice.transcribe
meeting.create         meeting.update         meeting.cancel
meeting.summarize
notification.send      notification.dismiss
```

Inbound Channels are verified triggers. Outbound communication binds the permitted account and destination in trusted code; the model never selects credentials or an arbitrary recipient scope.

### 3.5 Time and schedules

```text
schedule.once          schedule.recurring     schedule.delay
schedule.resume_at     schedule.update        schedule.pause
schedule.cancel        schedule.read

calendar.check_availability
calendar.create_event  calendar.update_event  calendar.cancel_event
calendar.send_invitation
time.get_current       time.convert_timezone  date.calculate
```

Schedules trigger or resume a Flow. They are not a second Flow model.

### 3.6 Web and research

```text
web.search             web.fetch              web.extract
web.read_page          web.list_links         web.download
web.screenshot         web.browse             web.fill_form
web.click              web.monitor_change

research.discover      research.compare       research.verify
research.summarize     research.extract_structured
research.cite_sources
```

Web reads can be low risk. Browser writes, authentication and purchases require explicit scope and normally an approval.

### 3.7 App and connector management

```text
app.discover_actions   app.inspect_action     app.connect
app.disconnect         app.test_connection    app.run_action
app.read_status

mcp.connect            mcp.discover_tools     mcp.inspect_tool
mcp.run_tool           mcp.disconnect
```

MCP is an implementation source only. A connected MCP capability is wrapped and registered as a normal TAR Action, for example `mcp__gmail__send_email` becomes `email.send`.

### 3.8 Agent and knowledge Actions

```text
agent.classify         agent.extract          agent.summarize
agent.translate        agent.draft            agent.rewrite
agent.recommend        agent.compare          agent.plan
agent.research         agent.review           agent.detect_risk
agent.choose_action    agent.choose_next      agent.delegate

skill.discover         skill.activate         skill.read_resource
skill.execute_procedure
```

Skills teach an Agent a procedure; they do not grant authority. Agent output is a schema-validated proposal, draft, classification or allowed choice. A following App or Human Action performs the official effect.

### 3.9 Sandbox and code

```text
sandbox.create         sandbox.read_file      sandbox.write_file
sandbox.edit_file      sandbox.search_files   sandbox.list_files
sandbox.run_command    sandbox.run_code       sandbox.download_input
sandbox.upload_output  sandbox.destroy
```

Sandbox Actions run with declared filesystem, network, time, memory and credential limits. Prefer a narrow App Action over giving an Agent a broad shell or secret.

### 3.10 People, products and operations

```text
contact.search         contact.read           contact.create
contact.update         contact.add_role       contact.remove_role
contact.merge          contact.enroll_workflow

organization.search    organization.read      organization.create
organization.update    organization.add_contact
organization.remove_contact

offering.search        offering.read          offering.create
offering.update        offering.set_price     offering.set_availability

inventory.check        inventory.receive      inventory.reserve
inventory.release      inventory.adjust       inventory.transfer
inventory.reorder

asset.register         asset.assign           asset.return
asset.maintain         asset.retire
location.search        location.create        location.update
location.check_capacity
```

Contacts use roles such as customer, team member, vendor, partner and lead. A Contact role does not grant access: Workspace membership and access rules do.

### 3.11 Orders, bookings and money

```text
order.create           order.read             order.update
order.add_item         order.remove_item      order.calculate_total
order.confirm          order.fulfill          order.cancel
order.refund

booking.check_availability
booking.create         booking.reschedule     booking.confirm
booking.check_in       booking.complete       booking.cancel

quote.create           quote.update           quote.approve
quote.send             quote.accept           quote.reject
quote.convert_to_order

invoice.create         invoice.update         invoice.issue
invoice.send           invoice.mark_paid      invoice.void

payment.create         payment.authorize      payment.capture
payment.verify         payment.refund         payment.cancel

expense.create         expense.submit         expense.approve
expense.reject         expense.reimburse

money.calculate        money.convert_currency money.calculate_tax
money.apply_discount
```

Payments, refunds, inventory movements, approvals and permissions use deterministic, idempotent App Actions only. They never use automatic last-write-wins conflict resolution.

### 3.12 Sales, support, projects and control

```text
case.create            case.assign            case.escalate
case.resolve           case.reopen

opportunity.create     opportunity.qualify    opportunity.change_stage
opportunity.mark_won   opportunity.mark_lost

project.create         project.update         project.add_member
project.change_status  project.complete

task.create            task.assign            task.update
task.set_due           task.complete          task.reopen
task.cancel

approval.request       approval.approve       approval.reject
access.check           access.grant           access.revoke
access.change_role
validation.validate    validation.check_duplicate
validation.check_version
gateway.propose        gateway.commit         gateway.reject
audit.record           audit.read             audit.export
secret.connect         secret.rotate          secret.disconnect
run.read               run.cancel             run.retry
run.read_logs
```

Access, secret and definition-management Actions are owner/admin-only and never Agent-controlled.

## 4. Action contract

Every versioned Action declares this minimum contract:

```yaml
Action:
  id: payment.refund
  version: 1.0.0
  name: Refund payment
  category: Money
  type: app                 # app | agent | human
  source: native            # native | api | mcp | sandbox | ai | inbox

  input: schema
  output: schema

  reads: [Payments, Orders]
  effects: [external_payment, record_update]

  roles: [owner, finance]
  record_scope: own         # own | assigned | team | all
  offline: false

  approval: required
  idempotency: required
  timeout: 30s
  retries: safe_only

  cost: declared
  regions: [global]
  data_handling: declared
  audit: full
```

The Gateway validates membership, role, Flow occurrence authority, schema, record state, base version, idempotency key and approval before an official effect. Rejections are recorded with a corrective message.

## 5. Registry experience

The public experience is deliberately small:

```text
Search: What do you want to do?

Recommended
|-- Send a message
|-- Find a person
|-- Search the web
|-- Create a document
`-- Take a payment

Categories
|-- Communication
|-- People and organisations
|-- Sales and commerce
|-- Money
|-- Documents
|-- Web and research
|-- Data
`-- Utilities
```

```text
Category -> Provider -> Action
```

The builder normally lets the AI discover and recommend one to three suitable Actions. An owner sees the concise effect summary before installing or using an Action:

```text
Send email
Uses: Contact, subject, message
Effect: sends an external email
Data shared with: Gmail
Approval: before sending
Cost: included

[Add Action]
```

The endpoint-heavy catalog is advanced Build functionality, not worker UI.

## 6. AI-first Flow creation

```text
Person describes work
  -> TAR identifies Records and relationships
  -> TAR discovers registered Actions
  -> TAR drafts Flows and optional Bot bindings
  -> TAR identifies access, approvals and high-risk effects
  -> person reviews a compact preview
  -> Gateway creates approved definitions
```

Example request:

> Create a team onboarding pipeline. Collect details, enrich permitted information, collect documents manually, sign an agreement and approve the person as a team member.

```yaml
Team Management Bot:
  Records: [Contacts, Documents]
  Flow: Onboard team member
  Actions:
    - Collect details
    - Enrich permitted details
    - Collect documents
    - Review documents
    - Sign agreement
    - Approve membership
    - Activate access
```

AI can enrich, extract, draft and review. Only a Human approval plus deterministic Gateway Actions may create Workspace membership or grant access.

## 7. Canonical rules

1. An Action is the only executable capability exposed in a Flow.
2. Action implementations may use app code, Agent reasoning, MCP, skills, sandbox, subagents, inbox, channels or schedules; these never create a second builder model.
3. Every official Record or external effect goes through the Gateway.
4. Agents can read permitted context and propose or select only allowlisted Actions and transitions.
5. Models, skills, MCP connections, subagents and sandboxes are runtime configuration for an Agent Action, not user-facing Flow layers.
6. Schedules and Channels are verified triggers that start or resume Flow Runs.
7. The Workspace DB stores official Records, Links, Flow Runs and audit Events. Agent conversation/runtime state is execution history, never business truth.
8. Every consequential Action declares scope, approval, idempotency, timeout, retry, cost, data handling and audit behaviour.
9. Prefer soft archive over deletion; destructive and consequential Actions require explicit confirmation.
10. Keep the worker UI to Work, Inbox and Records. Registry administration lives in Build.

> **Triggers start work. Flows organise work. Actions perform work. Agents handle uncertainty. The Gateway authorises every official effect.**
