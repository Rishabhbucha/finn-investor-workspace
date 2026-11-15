import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const config = env as Cloudflare.Env & { FINN_STANDALONE?: string; FINN_REVIEW_PASSWORD?: string };
    if (config.FINN_STANDALONE === "1") {
      const incoming = new Headers(request.headers);
      for (const key of [...incoming.keys()]) {
        if (key.startsWith("oai-authenticated-")) incoming.delete(key);
      }
      const path = new URL(request.url).pathname;
      const credential = incoming.get("Authorization");
      const authorised = !!config.FINN_REVIEW_PASSWORD &&
        credential === "Basic " + btoa("reviewer:" + config.FINN_REVIEW_PASSWORD);
      incoming.delete("Authorization");
      if (path === "/signin-with-chatgpt") {
        if (!config.FINN_REVIEW_PASSWORD) return new Response("Reviewer sign-in has not been configured.", {status:503});
        if (!authorised) return new Response("Sign in with the FINN reviewer credentials.", {
          status:401, headers:{"WWW-Authenticate": 'Basic realm="FINN", charset="UTF-8"'}
        });
        return Response.redirect(new URL("/", request.url).href,302);
      }
      if (authorised) {
        incoming.set("oai-authenticated-user-id","finn-reviewer");
        incoming.set("oai-authenticated-user-email","reviewer");
      }
      request = new Request(request,{headers:incoming});
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
