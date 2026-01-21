from dulwich.repo import Repo
repo = Repo('.')
path = b'backend/src/Repositories/LavorazioniRepository.php'
parts = path.split(b'/')

def find(repo, tree_sha, parts):
    tree = repo[tree_sha]
    for entry in tree.iteritems():
        name = entry.path
        if name == parts[0]:
            if len(parts) == 1:
                return entry.sha
            return find(repo, entry.sha, parts[1:])
    return None

commit = repo[repo.head()]
tree_sha = commit.tree
blob_sha = find(repo, tree_sha, parts)
print(blob_sha)
