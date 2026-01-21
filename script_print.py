from dulwich.repo import Repo
repo = Repo('.')
blob_sha = b'b2a524a888df8abf36ed14a22022169fb1953f4a'
blob = repo[blob_sha]
content = blob.data.decode('utf-8')
print(content[:400])
