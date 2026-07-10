import { NextRequest } from "next/server";
import { getEventBus } from "../engine";

export async function GET(req: NextRequest) {
  const eventBus = getEventBus();

  const stream = new ReadableStream({
    start(controller) {
      const logListener = (payload: { level: string; message: string }) => {
        controller.enqueue(`data: ${JSON.stringify({ type: "log", ...payload })}\n\n`);
      };

      eventBus.on("log", logListener);

      // Keep connection alive with periodic pings every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(": ping\n\n");
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        eventBus.off("log", logListener);
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch (e) {
          // ignore stream close errors
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
