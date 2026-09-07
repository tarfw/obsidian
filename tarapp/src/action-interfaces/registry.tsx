import type { ComponentType } from 'react';
import type { HarnessAction, HarnessInterfaceContract } from '@/lib/harness';
import ActionFormInterface from './ActionFormInterface';
import ConfirmationInterface from './ConfirmationInterface';
import FlowInterface from './FlowInterface';
import FlowBuilderInterface from './FlowBuilderInterface';
import type { ActionInterfaceProps } from './types';
import PosInterface from '@/pos/PosInterface';

const interfaces = new Map<string, ComponentType<ActionInterfaceProps>>([
  ['pos', PosInterface],
  ['form', ActionFormInterface],
  ['confirmation', ConfirmationInterface],
  ['flow', FlowInterface],
  ['flow-builder', FlowBuilderInterface],
]);

export function registerActionInterface(key: string, Component: ComponentType<ActionInterfaceProps>): void {
  interfaces.set(key, Component);
}

export function resolveActionInterface(action: HarnessAction, contracts: readonly HarnessInterfaceContract[]) {
  const contract = contracts.find((item) => item.key === action.interfaceKey);
  const Component = interfaces.get(action.interfaceKey);
  return contract && Component ? { contract, Component } : null;
}

export function registeredInterfaceKeys(): string[] { return [...interfaces.keys()]; }
