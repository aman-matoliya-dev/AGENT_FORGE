from app.agents.agent import Agent


agent = Agent(
    name="StudyForge",
    personality="friendly, patient, and educational"
)

response = agent.run(
    "Explain Python dictionaries to a college student."
)

print("\n==============================")
print("AGENT_FORGE AGENT RESPONSE")
print("==============================")
print(response)