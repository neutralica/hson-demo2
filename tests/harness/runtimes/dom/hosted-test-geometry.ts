export type HostedTestElementRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type HostedTestGeometryFixture = Readonly<{
  id: string;
  rect: HostedTestElementRect;
}>;

export const HOSTED_TEST_GEOMETRY_SERVICE = Symbol.for("hson.hosted-test.geometry");
export const HOSTED_TEST_RESIZE_SERVICE = Symbol.for("hson.hosted-test.resize");

type HostedTestGeometryService = Readonly<{
  set_element_rect(element: Element, rect: HostedTestElementRect): void;
}>;

export type HostedTestResizeService = Readonly<{
  notify_resize(element: Element): void;
}>;

/** No-op in a real browser; delegates only when a hosted DOM runtime owns the process globals. */
export function apply_hosted_test_element_rect(element: Element, rect: HostedTestElementRect): void {
  const service = Reflect.get(globalThis, HOSTED_TEST_GEOMETRY_SERVICE) as HostedTestGeometryService | undefined;
  service?.set_element_rect(element, rect);
}

/** Explicitly changes hosted geometry and synchronously triggers hosted ResizeObserver callbacks. */
export function notify_hosted_test_resize(element: Element, rect: HostedTestElementRect): void {
  apply_hosted_test_element_rect(element, rect);
  const service = Reflect.get(globalThis, HOSTED_TEST_RESIZE_SERVICE) as HostedTestResizeService | undefined;
  service?.notify_resize(element);
}
