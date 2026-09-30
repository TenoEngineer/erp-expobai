import json
import glob
import os

brain_dir = r"C:\Users\heito\.gemini\antigravity-cli\brain"
conv_ids = [
    "e2503c1d-dc8b-4427-87cd-56369d98d6ca",
    "39e2c050-6a01-4fd0-89c8-e10a48a78704",
    "7d4c2458-0cb6-4912-9d68-bfc4f5e0c349",
    "e73156ee-dca3-4d34-a5d1-c9113fa9b59b",
    "85d7e911-5671-49c4-a027-a8321bcc231f"
]

for cid in conv_ids:
    tpath = os.path.join(brain_dir, cid, ".system_generated", "logs", "transcript.jsonl")
    if not os.path.exists(tpath):
        continue
    print(f"\n=================== CONVERSATION: {cid} ===================")
    with open(tpath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                step = json.loads(line)
                if step.get("type") == "USER_INPUT":
                    content = step.get("content", "").strip()
                    print(f"[{step.get('created_at', '')}] USER: {content[:150]}")
            except Exception as e:
                pass
