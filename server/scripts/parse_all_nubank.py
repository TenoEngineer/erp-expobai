import re
import json

with open('scripts/nubank_extracted_raw.txt', encoding='utf-8') as f:
    text = f.read()

# Pages
pages = text.split('--- PAGE ---')

all_transactions = []
current_date = None

for page_idx, page in enumerate(pages):
    lines = page.split('\n')
    for line in lines:
        line_s = line.strip()
        m_date = re.match(r'^(\d{2}\s+[A-Z]{3}\s+\d{4})', line_s)
        if m_date and "Total" in line_s:
            current_date = m_date.group(1)

# Now let's split the whole text into chunks starting with (Transferência ... | Compra no débito ... | Pagamento de boleto ...)
pattern = r'(?=Transferência [^\n]+|Compra no débito|Pagamento de boleto)'
chunks = re.split(pattern, text)

parsed_txs = []
curr_date = "23 SET 2026"

for chunk in chunks:
    # check if this chunk has a date header inside it before the tx
    date_match = re.search(r'(\d{2}\s+[A-Z]{3}\s+\d{4})\s+Total de entradas', chunk)
    if date_match:
        curr_date = date_match.group(1)
    
    chunk_clean = chunk.strip()
    if not (chunk_clean.startswith('Transferência') or chunk_clean.startswith('Compra no débito') or chunk_clean.startswith('Pagamento de boleto')):
        continue
    
    # Extract the amount: usually at the end of the entry, or before footers
    # Let's find all numbers matching \b\d+(?:\.\d{3})*,\d{2}\b
    # Filter out known CNPJs or Agência/Conta numbers or Saldo/Total numbers
    # Remove footers
    cleaned_chunk = re.sub(r'Tem alguma dúvida\?.*', '', chunk_clean, flags=re.DOTALL)
    cleaned_chunk = re.sub(r'Extrato gerado dia.*', '', cleaned_chunk)
    cleaned_chunk = re.sub(r'Saldo do dia.*', '', cleaned_chunk)
    cleaned_chunk = re.sub(r'\d{2}\s+[A-Z]{3}\s+\d{4}\s+Total de entradas.*', '', cleaned_chunk)
    cleaned_chunk = re.sub(r'Total de saídas.*', '', cleaned_chunk)
    
    # Find all amounts in cleaned_chunk
    amt_matches = list(re.finditer(r'(\d{1,3}(?:\.\d{3})*,\d{2})', cleaned_chunk))
    if amt_matches:
        # The last amount in the entry is the transaction value
        last_match = amt_matches[-1]
        val_str = last_match.group(1).replace('.', '').replace(',', '.')
        val = float(val_str)
        desc = cleaned_chunk[:last_match.start()].strip()
        desc = " ".join(desc.split())
        
        tipo = "saida" if any(w in desc.lower() for w in ["enviada", "compra", "pagamento", "boleto"]) else "entrada"
        
        parsed_txs.append({
            "data": curr_date,
            "descricao": desc,
            "valor": val,
            "tipo": tipo
        })

print(f"Total parsed: {len(parsed_txs)}")
entradas = [t for t in parsed_txs if t['tipo'] == 'entrada']
print(f"Entradas: {len(entradas)} | Soma: R$ {sum(t['valor'] for t in entradas):.2f}")

from collections import defaultdict
by_date = defaultdict(lambda: {'count': 0, 'total': 0.0})
for t in entradas:
    by_date[t['data']]['count'] += 1
    by_date[t['data']]['total'] += t['valor']

for d, v in sorted(by_date.items()):
    print(f"  {d}: {v['count']} recebimentos | R$ {v['total']:.2f}")

with open("scripts/nubank_all_entradas.json", "w", encoding="utf-8") as f:
    json.dump(entradas, f, ensure_ascii=False, indent=2)
