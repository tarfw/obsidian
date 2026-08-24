/**
 * Task Tools
 */
import * as v from 'valibot';
import type { ToolDefinition } from './registry.ts';
import { MatterRepository, TaskMatterSchema } from '../data/repositories/matter.ts';
import type { TaskMatter } from '../domain/types.ts';

export const TasksListTool: ToolDefinition<{ status?: string }, TaskMatter[]> = {
  name: 'tasks.list',
  description: 'List workspace tasks with optional status filter',
  riskClass: 'read',
  validateInput(input: unknown) {
    return v.parse(v.object({ status: v.optional(v.string()) }), input || {});
  },
  async run({ input, client, workspaceId }) {
    const repo = new MatterRepository(client);
    const tasks = await repo.listByType(workspaceId, 'task');
    if (input.status) {
      return tasks.filter((t) => t.data.status === input.status).map((t) => t.data);
    }
    return tasks.map((t) => t.data);
  },
};

export const TaskCreateTool: ToolDefinition<
  { id: string; title: string; description?: string; priority?: 'low' | 'medium' | 'high' },
  TaskMatter
> = {
  name: 'task.create',
  description: 'Create a new task in the workspace',
  riskClass: 'reversible_write',
  validateInput(input: unknown) {
    return v.parse(
      v.object({
        id: v.pipe(v.string(), v.minLength(1)),
        title: v.pipe(v.string(), v.minLength(1)),
        description: v.optional(v.string()),
        priority: v.optional(v.picklist(['low', 'medium', 'high'])),
      }),
      input
    );
  },
  async run({ input, client, workspaceId, auth }) {
    const repo = new MatterRepository(client);
    const taskData: TaskMatter = {
      title: input.title,
      description: input.description,
      status: 'todo',
      assigneeId: auth.userId,
      priority: input.priority || 'medium',
    };
    const created = await repo.create(workspaceId, input.id, 'task', taskData);
    return created.data;
  },
};

export const TaskUpdateTool: ToolDefinition<
  { id: string; status?: 'todo' | 'in_progress' | 'done' | 'archived'; priority?: 'low' | 'medium' | 'high' },
  TaskMatter | null
> = {
  name: 'task.update',
  description: 'Update status or priority of an existing task',
  riskClass: 'reversible_write',
  validateInput(input: unknown) {
    return v.parse(
      v.object({
        id: v.pipe(v.string(), v.minLength(1)),
        status: v.optional(v.picklist(['todo', 'in_progress', 'done', 'archived'])),
        priority: v.optional(v.picklist(['low', 'medium', 'high'])),
      }),
      input
    );
  },
  async run({ input, client, workspaceId }) {
    const repo = new MatterRepository(client);
    const updated = await repo.update(workspaceId, input.id, 'task', {
      status: input.status,
      priority: input.priority,
    });
    return updated ? updated.data : null;
  },
};

export const TaskArchiveTool: ToolDefinition<{ id: string }, { archived: boolean }> = {
  name: 'task.archive',
  description: 'Archive a task (consequential action)',
  riskClass: 'consequential',
  validateInput(input: unknown) {
    return v.parse(v.object({ id: v.pipe(v.string(), v.minLength(1)) }), input);
  },
  async run({ input, client, workspaceId }) {
    const repo = new MatterRepository(client);
    const updated = await repo.update(workspaceId, input.id, 'task', { status: 'archived' });
    return { archived: !!updated };
  },
};
