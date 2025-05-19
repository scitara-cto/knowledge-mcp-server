import { HandlerOutput, SessionInfo } from "dynamic-mcp-server";
import { DlxService } from "../DlxService.js";

/**
 * Triggers an orchestration and retrieves the execution record.
 * @param args { orchestrationId: string, data: any }
 * @param context SessionInfo
 * @returns HandlerOutput with the execution record
 */
export async function triggerOrchestrationAction(
  args: Record<string, any>,
  context: SessionInfo,
  handlerConfig: any,
): Promise<HandlerOutput> {
  // Prefer orchestrationId from args, fallback to handlerConfig
  const orchestrationId = args.orchestrationId || handlerConfig.orchestrationId;
  const { data } = args;
  if (!orchestrationId) {
    throw new Error("Missing required parameter: orchestrationId");
  }
  const dlxService = new DlxService();

  // 1. Trigger the orchestration
  const triggerResponse = await dlxService.executeDlxApiCall(
    {
      method: "POST",
      path: `/orchestrations/${orchestrationId}/trigger`,
      data: { data },
    },
    context,
  );

  // Type guard for executionId
  let executionId: string | undefined;
  if (triggerResponse && typeof triggerResponse === "object") {
    if (
      "result" in triggerResponse &&
      triggerResponse.result &&
      typeof triggerResponse.result === "object" &&
      "executionId" in triggerResponse.result
    ) {
      executionId = (triggerResponse.result as any).executionId;
    } else if ("executionId" in triggerResponse) {
      executionId = (triggerResponse as any).executionId;
    }
  }
  if (!executionId) {
    throw new Error("No executionId returned from orchestration trigger");
  }

  // 2. Retrieve the execution record from /executions/{executionId}
  const executionRecord = await dlxService.executeDlxApiCall(
    {
      method: "GET",
      path: `/executions/${executionId}`,
    },
    context,
  );

  return {
    result: executionRecord,
    message: `Orchestration triggered and execution record retrieved (executionId: ${executionId})`,
  };
}
