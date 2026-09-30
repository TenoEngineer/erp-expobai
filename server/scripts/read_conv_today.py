import json
import os

brain_dir = r"C:\Users\heito\.gemini\antigravity-cli\brain"
cid = "e2503c1d-dc8b-4427-87cd-56369d98d6ca"
tpath = os.path.join(brain_dir, cid, ".system_generated", "logs", "transcript.jsonl")

if os.path.exists(tpath):
    with open(tpath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                step = json.loads(line)
                if step.get("type") == "USER_INPUT":
                    content = step.get("content", "").strip()
                    print(f"[{step.get('created_at', '')}] USER: {content}")
            except Exception as e:
                pass
