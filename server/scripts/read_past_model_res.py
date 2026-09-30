import json
import os

brain_dir = r"C:\Users\heito\.gemini\antigravity-cli\brain"
cid = "39e2c050-6a01-4fd0-89c8-e10a48a78704"
tpath = os.path.join(brain_dir, cid, ".system_generated", "logs", "transcript.jsonl")

if os.path.exists(tpath):
    with open(tpath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                step = json.loads(line)
                if step.get("type") == "PLANNER_RESPONSE":
                    content = step.get("content", "").strip()
                    if "LUCRO REAL" in content.upper() or "BEBIDAS" in content.upper() and "INSUMOS" in content.upper():
                        print(f"[{step.get('created_at', '')}] MODEL RESPONSE SNIPPET:\n{content[:500]}\n...\n")
            except Exception as e:
                pass
