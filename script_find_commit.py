from dulwich.repo import Repo
repo = Repo('.')
path_parts = b'backend/src/Repositories/LavorazioniRepository.php'.split(b'/')

def find(repo, tree_sha, parts):
    tree = repo[tree_sha]
    for entry in tree.iteritems():
        if entry.path == parts[0]:
            if len(parts) == 1:
                return entry.sha
            return find(repo, entry.sha, parts[1:])
    return None

from dulwich.walk import Walker

for entry in repo.get_walker(include=[repo.head()]):
    commit = entry.commit
    blob_sha = find(repo, commit.tree, path_parts)
    if blob_sha is None:
        continue
    data = repo[blob_sha].data.decode('utf-8', errors='ignore')
    if 'fetchSpedizioni' in data:
        print('found in', commit.id.decode())
        break
