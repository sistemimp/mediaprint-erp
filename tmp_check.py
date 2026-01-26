from pathlib import Path
text = Path('src/views/lavorazioni/LavorazioneDetail.js').read_text(encoding='utf-8')
for i,line in enumerate(text.splitlines(),1):
    if 'getEffectiveStart' in line or 'toDateTimeLocal' in line:
        print(i, repr(line))
