from dulwich.repo import Repo
repo = Repo('.')
blob_sha = b'b2a524a888df8abf36ed14a22022169fb1953f4a'
with open('backend/src/Repositories/LavorazioniRepository.php', 'wb') as f:
    f.write(repo[blob_sha].data)
