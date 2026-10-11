# managed-agent-chat

Minimal CLI that talks to the Managed Agent `agent_011ss7cizur9bqYZjR8Awvub`
in environment `env_019qQm6K7t3ALikT5C8ecWiW`.

It creates a session, opens the event stream, sends one `user.message`, prints
`agent.message` text as it arrives, and exits when the session goes idle
(`end_turn` → exit 0; errors, termination or other stop reasons → exit 1).

```bash
cd examples/managed-agent-chat
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # or: ant auth login
npm start -- "What can you do?"
```

`AGENT_ID` / `ENVIRONMENT_ID` env vars override the defaults. Tool calls that
pause for approval are denied, since no one is watching this client.
