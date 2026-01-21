from dulwich.repo import Repo
repo = Repo('.')
tree = repo[repo[repo.head()].tree]
for entry in tree.items():
    print(entry.path, entry.sha)
