import pathlib
path = pathlib.Path('src/views/lavorazioni/LavorazioniList.js')
lines = path.read_text(encoding='utf-8')
start = lines.index('{columnItems.length > 0 ? (')
end = lines.index('<div className= text-center text-body-secondary small py-4>', start)
print(lines[start:end])
