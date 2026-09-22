from backend.app.models.services.ollama_service import ask_ollama


question = "Explain Python lists in simple words."

answer = ask_ollama(question)

print("\n==============================")
print("AGENT_FORGE AI RESPONSE")
print("==============================")
print(answer)