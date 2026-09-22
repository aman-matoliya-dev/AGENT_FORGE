import { useState } from "react";
import { runAgent } from "../utils/api";


export default function AgentBackendTest() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    setResponse("");

    try {
      const result = await runAgent({
        message: "Explain Python lists in simple words.",
        config: {
          name: "StudyForge",
          personality: "friendly and educational",
          purpose: "Teach programming concepts",
          provider: "gemini",
          model: "gemini-3.6-flash",
          agentType: "general",
          tools: [],
          memory: "buffer",
          knowledge: "none",
          outputStyle: "concise",
        },
      });

      setResponse(result.response);
    } catch (error) {
      setResponse(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        width: "350px",
        padding: "20px",
        background: "white",
        color: "black",
        borderRadius: "12px",
        zIndex: 9999,
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      }}
    >
      <h3>Agent Backend Test</h3>

      <button onClick={handleTest} disabled={loading}>
        {loading ? "Thinking..." : "Test AI Agent"}
      </button>

      {response && (
        <p style={{ marginTop: "15px", whiteSpace: "pre-wrap" }}>
          {response}
        </p>
      )}
    </div>
  );
}