import type { JsonValue, LiveMapNodeAttrValue } from "hson-live/types";


export type NodeLiveAfterDeleteCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  deletePath: (string | number)[];
  expectedInitialTag: string;
  expectedAfterDelete: undefined;
}>;

export type NodeLiveAfterSetCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  setPath: (string | number)[];
  value: JsonValue;
  expectedInitial: undefined;
  expectedAfterSetTag: string;
}>;

export type NodeParentContentCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  setPath: (string | number)[];
  value: JsonValue;
  expectedInitialContentLength: number;
  expectedAfterSetContentLength: number;
}>;

export type NodeAttrsCopyCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  setName: string;
  setValue: LiveMapNodeAttrValue;
  mutateName: string;
  mutateValue: LiveMapNodeAttrValue;
  expectedAttr: LiveMapNodeAttrValue;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

export type NodeSetAttrCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  nameToSet: string;
  valueToSet: LiveMapNodeAttrValue;
  expectedAttr: LiveMapNodeAttrValue;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

export type NodeSetAttrsCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  firstName: string;
  firstValue: LiveMapNodeAttrValue;
  attrsToSet: Readonly<Record<string, LiveMapNodeAttrValue>>;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

export type NodeRemoveAttrCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  attrsToSet: Readonly<Record<string, LiveMapNodeAttrValue>>;
  nameToRemove: string;
  expectedRemovedAttr: undefined;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

export type NodeClearAttrsCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  attrsToSet: Readonly<Record<string, LiveMapNodeAttrValue>>;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

export type NodeExistingAttrsCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  expectedClass: LiveMapNodeAttrValue;
  expectedDisabled: LiveMapNodeAttrValue;
  expectedAttrs: Readonly<Record<string, LiveMapNodeAttrValue>>;
}>;

export type NodeAttrMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
}>;

export type NodeAttrJsonBackedThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
}>;

export type NodeJsonHtmlTagNameCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedTag: string;
  expectedContentLength: number;
  expectedMessage: string;
}>;

export type NodeChildrenCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedChildTags: readonly string[];
  expectedMissingPathChildren: readonly string[];
}>;

export type NodeChildLookupCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  tag: string;
  missingTag: string;
  expectedChildTag: string;
  expectedChildrenByTagCount: number;
  expectedMissingChildrenByTag: readonly string[];
  expectedMissingChild: undefined;
}>;

export type NodeMustChildThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  missingTag: string;
  expectedMessage: string;
}>;

export type NodeAppendCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  childTag: string;
  expectedChildTags: readonly string[];
  expectedAppendedTag: string;
}>;

export type NodeAppendMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  childTag: string;
  expectedMessage: string;
}>;


export type NodeAppendHtmlCaseSpec = Readonly<{
  suite: string;
  name: string;
  html: string;
  path: (string | number)[];
  childTag: string;
  expectedChildTags: readonly string[];
  expectedAppendedTag: string;
}>;

export type NodeRemoveChildrenCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  appendedTag: string;
  primitiveContent: string;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedAfterContent: readonly string[];
}>;

export type NodeRemoveChildCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  firstAppendedTag: string;
  secondAppendedTag: string;
  primitiveContent: string;
  indexToRemove: number;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedContentTagsAndValues: readonly string[];
}>;

export type NodeRemoveChildBadIndexThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  badIndex: number;
  expectedMessage: string;
}>;


export type NodeRemoveMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  expectedMessage: string;
}>;

export type NodeReplaceChildrenCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  appendedTag: string;
  replacementTags: readonly string[];
  primitiveContent: string;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedAfterContent: readonly string[];
}>;

export type NodeReplaceChildCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  firstAppendedTag: string;
  secondAppendedTag: string;
  replacementTag: string;
  primitiveContent: string;
  indexToReplace: number;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedContentTagsAndValues: readonly string[];
}>;

export type NodeReplaceChildBadIndexThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  badIndex: number;
  replacementTag: string;
  expectedMessage: string;
}>;

export type NodeReplaceMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  replacementTag: string;
  expectedMessage: string;
}>;

export type NodeInsertChildCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  firstAppendedTag: string;
  secondAppendedTag: string;
  insertedTag: string;
  primitiveContent: string;
  indexToInsert: number;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedContentTagsAndValues: readonly string[];
}>;

export type NodeInsertChildAppendCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  insertedTag: string;
  indexToInsert: number;
  expectedChildTags: readonly string[];
}>;

export type NodeInsertChildBadIndexThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  badIndex: number;
  insertedTag: string;
  expectedMessage: string;
}>;


export type NodeInsertMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  insertedTag: string;
  expectedMessage: string;
}>;

export type NodeMoveChildCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  firstAppendedTag: string;
  secondAppendedTag: string;
  primitiveContent: string;
  fromIndex: number;
  toIndex: number;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
  expectedContentTagsAndValues: readonly string[];
}>;

export type NodeMoveChildBackwardCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  firstAppendedTag: string;
  secondAppendedTag: string;
  fromIndex: number;
  toIndex: number;
  expectedBeforeChildTags: readonly string[];
  expectedAfterChildTags: readonly string[];
}>;

export type NodeMoveChildBadToIndexThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  fromIndex: number;
  badToIndex: number;
  expectedMessage: string;
}>;

export type NodeMoveChildBadFromIndexThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  badFromIndex: number;
  toIndex: number;
  expectedMessage: string;
}>;

export type NodeMoveMissingPathThrowCaseSpec = Readonly<{
  suite: string;
  name: string;
  input: JsonValue;
  path: (string | number)[];
  fromIndex: number;
  toIndex: number;
  expectedMessage: string;
}>;
