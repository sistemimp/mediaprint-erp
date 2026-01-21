from dulwich.repo import Repo
repo = Repo('.')
print(repo.head())
