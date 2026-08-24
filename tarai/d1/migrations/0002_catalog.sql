INSERT INTO packs (id, credits, price, currency, state) VALUES
  ('inr-500', 500, 9900, 'INR', 'active'),
  ('inr-2500', 2500, 44900, 'INR', 'active'),
  ('inr-6000', 6000, 99900, 'INR', 'active');

INSERT INTO agents (id, name, action, credits, version, state, updated) VALUES
  ('workspace-summary', 'Workspace Agent', 'workspace.summary', 2, 1, 'active', unixepoch()),
  ('sales-reply', 'Sales Agent', 'sales.reply', 2, 1, 'active', unixepoch()),
  ('support-reply', 'Support Agent', 'support.reply', 2, 1, 'active', unixepoch()),
  ('quote-proposal', 'Sales Agent', 'sales.quote', 10, 1, 'active', unixepoch()),
  ('ops-workflow', 'Operations Agent', 'ops.workflow', 10, 1, 'active', unixepoch()),
  ('analyst-report', 'Analyst Agent', 'analyst.report', 20, 1, 'active', unixepoch()),
  ('tax-report', 'Tax Agent', 'tax.report', 20, 1, 'active', unixepoch()),
  ('site-active', 'Site Agent', 'site.active', 50, 1, 'active', unixepoch()),
  ('site-generate', 'Site Agent', 'site.generate', 100, 1, 'active', unixepoch()),
  ('site-edit', 'Site Agent', 'site.edit', 10, 1, 'active', unixepoch()),
  ('site-publish', 'Site Agent', 'site.publish', 5, 1, 'active', unixepoch()),
  ('ocr-scan', 'Intake OCR Agent', 'ocr.scan', 3, 1, 'active', unixepoch()),
  ('voice-order', 'Voice Order Agent', 'voice.order', 5, 1, 'active', unixepoch()),
  ('bill-audit', 'Bill Auditor', 'bill.audit', 5, 1, 'active', unixepoch()),
  ('price-check', 'Price Monitor', 'price.check', 2, 1, 'active', unixepoch()),
  ('retention-campaign', 'Retention Agent', 'retention.campaign', 20, 1, 'active', unixepoch()),
  ('lead-batch', 'Lead Hunter', 'lead.batch', 50, 1, 'active', unixepoch()),
  ('photo-clean', 'Photo Agent', 'photo.clean', 10, 1, 'active', unixepoch()),
  ('research-task', 'Research Swarm', 'research.task', 100, 1, 'active', unixepoch());

-- Model prices are integer micro-USD per one million tokens.
INSERT INTO models (id, provider, name, input, output, cached, currency, version, state, updated) VALUES
  ('deepseek-v4-flash-0731-v1', 'deepseek', 'DeepSeek-V4-Flash-0731', 80000, 180000, 16000, 'USD', 1, 'active', unixepoch());
