import app from './app.ts';
import scheduledWorker, {
  ProvisionWorkflow,
  RenewalWorkflow,
  AgentWorkflow,
  ProjectionWorkflow,
  ArchiveWorkflow,
  RestoreWorkflow,
} from './cloudflare.ts';

export { AgentWorkflow, ArchiveWorkflow, ProjectionWorkflow, ProvisionWorkflow, RenewalWorkflow, RestoreWorkflow };

export default {
  fetch: app.fetch,
  scheduled: scheduledWorker.scheduled,
};
