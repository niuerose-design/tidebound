import Anthropic from "@anthropic-ai/sdk";

const AGENT_ID = process.env.AGENT_ID ?? "agent_011ss7cizur9bqYZjR8Awvub";
const ENVIRONMENT_ID = process.env.ENVIRONMENT_ID ?? "env_019qQm6K7t3ALikT5C8ecWiW";

async function main(): Promise<number> {
  const prompt = process.argv.slice(2).join(" ") || "Hello! Introduce yourself in one sentence.";

  // Resolves ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile.
  const client = new Anthropic();

  const session = await client.beta.sessions.create({
    agent: { type: "agent", id: AGENT_ID },
    environment_id: ENVIRONMENT_ID,
  });
  console.error(`session: ${session.id}`);

  // Stream-first: open the stream before sending so no early events are missed.
  const stream = await client.beta.sessions.events.stream(session.id);

  await client.beta.sessions.events.send(session.id, {
    events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }],
  });

  for await (const event of stream) {
    switch (event.type) {
      case "agent.message":
        for (const block of event.content) {
          if (block.type === "text") process.stdout.write(block.text);
        }
        break;

      case "agent.tool_use":
      case "agent.mcp_tool_use":
        // Nobody is watching this minimal client, so paused calls are denied.
        if (event.evaluated_permission === "ask") {
          console.error(`\n[denying tool call: ${event.name}]`);
          await client.beta.sessions.events.send(session.id, {
            events: [{ type: "user.tool_confirmation", tool_use_id: event.id, result: "deny" }],
          });
        }
        break;

      case "agent.custom_tool_use":
        console.error(`\n[custom tool "${event.name}" is not implemented by this client]`);
        return 1;

      case "session.error":
        console.error(`\n[session error] ${event.error.type}: ${event.error.message}`);
        if (event.error.retry_status.type !== "retrying") return 1;
        break;

      case "session.status_idle":
        // requires_action means the session waits on us (handled above); keep streaming.
        if (event.stop_reason.type === "requires_action") break;
        process.stdout.write("\n");
        if (event.stop_reason.type !== "end_turn") {
          console.error(`[stopped: ${event.stop_reason.type}]`);
          return 1;
        }
        return 0;

      case "session.status_terminated":
        console.error("\n[session terminated]");
        return 1;
    }
  }

  console.error("\n[stream closed before the session went idle]");
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Authentication failed: set ANTHROPIC_API_KEY or run `ant auth login`.");
    } else if (error instanceof Anthropic.NotFoundError) {
      console.error(`Not found (check AGENT_ID / ENVIRONMENT_ID): ${error.message}`);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`API error ${error.status ?? ""}: ${error.message}`);
    } else {
      // e.g. no credentials found, connection failure
      console.error(error instanceof Error ? error.message : error);
    }
    process.exit(1);
  });
