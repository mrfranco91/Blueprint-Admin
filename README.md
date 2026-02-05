# Blueprint-Admin

## Merge conflict recovery (beginner-friendly)

If GitHub says your PR has conflicts and the web editor cannot resolve them, use these exact terminal commands on your computer.

### 1) Open your project
```bash
cd /Users/mel/Documents/GitHub/Blueprint-Admin
```

### 2) See if a merge is already in progress
```bash
git status
```
If you see `You have unmerged paths`, continue.

### 3) Abort the broken merge (safe)
```bash
git merge --abort
```

### 4) Save any local edits (just in case)
```bash
git stash push -m "temp-save-before-conflict-fix"
```

### 5) Switch to the PR branch (replace BRANCH_NAME)
```bash
git checkout BRANCH_NAME
```

### 6) Pull latest and merge main
```bash
git fetch origin
git pull origin BRANCH_NAME
git merge origin/main
```

### 7) Resolve conflicts file-by-file
Open each conflicted file and remove only these markers:
- `<<<<<<<`
- `=======`
- `>>>>>>>`

Then stage resolved files:
```bash
git add <file1> <file2> <file3>
```

### 8) Finish and push
```bash
git commit -m "Resolve merge conflicts"
git push
```

### 9) Restore your earlier local edits (optional)
```bash
git stash pop
```

If `stash pop` reports conflicts, stop and run `git status` so you can resolve only those files.
