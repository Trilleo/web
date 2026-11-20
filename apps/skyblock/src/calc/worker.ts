/// <reference lib="webworker" />
/** The calculator's worker: solving 130,000 recipes stays off the page's thread. */
import { CalcHost } from "./host";
import type { WorkerRequest } from "./protocol";

const host = new CalcHost();
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  void host.handle(event.data).then((response) => {
    scope.postMessage(response);
  });
});
