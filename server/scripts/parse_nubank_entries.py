import pypdf
import re
import json

reader = pypdf.PdfReader(r"C:\Users\heito\Downloads\644d6e47-38c6-47e5-8cf2-b8368328a477-2026-09-23-2026-09-29.pdf")
full_text = ""
for page in reader.pages:
    full_text += page.extract_text() + "\n"

# Parse transactions
# Format example:
# 24 SET 2026 Total de entradas + 270,00
# Transferência Recebida Jaqueline Vieira de Lima - •••.131.211-•• - NU 
# PAGAMENTOS - IP (0260) Agência: 1 Conta: 
# 44580890-1
# 60,00

lines = full_text.split('\n')
current_date = None
transactions = []
current_entry = []

date_regex = re.compile(r'^(\d{2}\s+[A-Z]{3}\s+\d{4})')
amount_regex = re.compile(r'^(\d{1,3}(?:\.\d{3})*,\d{2})$')

for line in lines:
    line_str = line.strip()
    if not line_str:
        continue
    
    # Check date header
    d_match = date_regex.match(line_str)
    if d_match and "Total" in line_str:
        current_date = d_match.group(1)
        continue

    # Skip header/footer noise
    if any(ignore in line_str for ignore in [
        "KATIA LUCIANA MULLER", "CNPJ", "VALORES EM R$", "Saldo", "Total de",
        "Tem alguma dúvida?", "Caso a solução", "Extrato gerado", "Nu Financeira",
        "Nu Pagamentos", "Asseguramos a autenticidade", "O saldo líquido",
        "Não nos responsabilizamos", "Movimentações"
    ]):
        continue

    # Check if line is an amount (e.g., "60,00" or "1.101,55")
    amt_match = amount_regex.match(line_str)
    if amt_match and current_entry:
        val_str = amt_match.group(1).replace('.', '').replace(',', '.')
        val = float(val_str)
        desc = " ".join(current_entry)
        
        # Determine if it's entrada or saida based on description
        is_saida = "Compra no débito" in desc or "enviada" in desc or "Pagamento de" in desc
        
        transactions.append({
            "data": current_date,
            "descricao": desc,
            "valor": val,
            "tipo": "saida" if is_saida else "entrada"
        })
        current_entry = []
    else:
        current_entry.append(line_str)

with open("nubank_transacoes.json", "w", encoding="utf-8") as f:
    json.dump(transactions, f, ensure_ascii=False, indent=2)

entradas = [t for t in transactions if t['tipo'] == 'entrada']
print(f"Total de movimentações: {len(transactions)}")
print(f"Total de entradas (Pix recebidos): {len(entradas)}")
print(f"Soma das entradas: R$ {sum(t['valor'] for t in entradas):.2f}")

# Group by date
from collections import defaultdict
by_date = defaultdict(lambda: {'count': 0, 'total': 0.0})
for t in entradas:
    by_date[t['data']]['count'] += 1
    by_date[t['data']]['total'] += t['valor']

for d, v in sorted(by_date.items()):
    print(f"  {d}: {v['count']} recebimentos | R$ {v['total']:.2f}")
