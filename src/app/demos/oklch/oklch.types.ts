import type { LiveTree } from "hson-live/livetree";

export type OklchValues = Readonly<{
  l: number;
  c: number;
  h: number;
  a: number;
}>;

export type OklchChannel = keyof OklchValues;

export type OklchTarget = Readonly<{
  path: string;
  label: string;
  varName: string;
  initial: string;
}>;


export type OklchPickerModel = Readonly<{
  state: OklchValues;
  targets: readonly OklchTarget[];
}>;

export type OklchDemoOpts = Readonly<{
  targets?: readonly OklchTarget[];
}>;

export type OklchInputRig = Readonly<{
  channel: OklchChannel;
  input: LiveTree;
  value: LiveTree;
}>;

export type OklchRig = Readonly<{
  root: LiveTree;
  preview: LiveTree;
  code: LiveTree;
  inputs: readonly OklchInputRig[];
  targetRows: readonly LiveTree[];
}>;