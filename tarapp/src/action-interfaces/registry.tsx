import type { ComponentType } from 'react';
import type { HarnessAction, HarnessInterfaceContract } from '@/lib/harness';
import ActionFormInterface from './ActionFormInterface';
import ConfirmationInterface from './ConfirmationInterface';
import FlowInterface from './FlowInterface';
import FlowBuilderInterface from './FlowBuilderInterface';
import type { ActionInterfaceProps } from './types';
import PosInterface from '@/pos/PosInterface';
import ItemInterface from '@/item/ItemInterface';

const interfaces = new Map<string, ComponentType<ActionInterfaceProps>>([
  ['pos', PosInterface],
  ['item', ItemInterface],
  ['form', ActionFormInterface],
  ['confirmation', ConfirmationInterface],
  ['flow', FlowInterface],
  ['flow-builder', FlowBuilderInterface],
]);

export function registerActionInterface(key: string, Component: ComponentType<ActionInterfaceProps>): void {
  interfaces.set(key, Component);
}

export const ITEM_INTERFACE_CONTRACT: HarnessInterfaceContract = {
  key: 'item',
  version: 1,
  title: 'Catalog item',
  presentation: 'screen',
  submitLabel: 'Save & Publish',
};

export function resolveActionInterface(action: HarnessAction, contracts: readonly HarnessInterfaceContract[]) {
  const effectiveKey = (action.id === 'catalog.item.save' || action.interfaceKey === 'item') ? 'item' : action.interfaceKey;
  let contract = contracts.find((item) => item.key === effectiveKey);
  if (!contract && effectiveKey === 'item') {
    contract = ITEM_INTERFACE_CONTRACT;
  }
  const Component = interfaces.get(effectiveKey);
  return contract && Component ? { contract, Component } : null;
}

export function registeredInterfaceKeys(): string[] { return [...interfaces.keys()]; }
