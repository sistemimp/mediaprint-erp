from pathlib import Path
text = Path('backend/src/Repositories/LavorazioniRepository.php').read_text(encoding='utf-8')
lines = text.splitlines()
for i,line in enumerate(lines):
    if 'fetchSpedizioni' in line:
        start = max(0, i-5)
        end = min(len(lines), i+80)
        for j in range(start, end):
            print(f"{j+1:04d}: {lines[j]}")
        break
