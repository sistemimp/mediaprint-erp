from dulwich.repo import Repo
repo = Repo('.')
commit = repo[repo.head()]
print(type(commit))
print(commit.tree)
