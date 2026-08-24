export class WorkflowEntrypoint<Env = unknown> {
  protected env: Env;

  constructor(_ctx: unknown, env: Env) {
    this.env = env;
  }
}

export type WorkflowEvent<T> = { payload: Readonly<T> };
export type WorkflowStep = {
  do<T>(name: string, callback: () => Promise<T>): Promise<T>;
};
