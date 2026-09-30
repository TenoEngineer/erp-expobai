import pypdf
import re
import json

reader = pypdf.PdfReader(r"C:\Users\heito\Downloads\644d6e47-38c6-47e5-8cf2-b8368328a477-2026-09-23-2026-09-29.pdf")
full_text = ""
for page in reader.pages:
    full_text += page.extract_text() + "\n--- PAGE ---\n"

with open(r"C:\Users\heito\Projects\erp-expobai\server\scripts\nubank_extracted_raw.txt", "w", encoding="utf-8") as f:
    f.write(full_text)

print(f"Total pages: {len(reader.pages)}")
print("Saved raw text to nubank_extracted_raw.txt")
