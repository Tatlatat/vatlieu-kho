# GitHub CodeQL + Semgrep CE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub-native CodeQL scanning and Semgrep CE scanning to the public `vatlieu-kho` repository, then push the branch so both workflows run on GitHub.

**Architecture:** Keep the setup repo-local and explicit. Use a dedicated `codeql.yml` advanced-setup workflow for `javascript-typescript` and GitHub Actions, and a separate `semgrep.yml` workflow that runs Semgrep CE and uploads SARIF into GitHub code scanning. Trigger both on push, pull request, manual dispatch, and a periodic schedule.

**Tech Stack:** GitHub Actions, GitHub CodeQL Action, Semgrep CE, SARIF upload, `gh` CLI, git.

---

### Task 1: Plan and workflow scope

**Files:**
- Create: `docs/superpowers/plans/2026-06-09-github-codeql-semgrep-ce.md`
- Modify: `.github/workflows/codeql.yml`
- Modify: `.github/workflows/semgrep.yml`

- [ ] **Step 1: Confirm current workflow context**

Run: `find .github/workflows -maxdepth 1 -type f`
Expected: existing repo workflows are listed so the new scan workflows can be added without clobbering anything.

- [ ] **Step 2: Confirm GitHub access and repo default branch**

Run: `gh auth status` and `git remote show origin`
Expected: authenticated `gh` session and `main` reported as the remote HEAD branch.

### Task 2: Add CodeQL advanced setup workflow

**Files:**
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Add workflow YAML**

```yaml
name: CodeQL

on:
  push:
  pull_request:
  schedule:
    - cron: "17 2 * * 1"
  workflow_dispatch:

permissions:
  actions: read
  contents: read
  security-events: write

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        language:
          - javascript-typescript
          - actions
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v4
        with:
          languages: ${{ matrix.language }}
          queries: security-extended

      - name: Perform CodeQL analysis
        uses: github/codeql-action/analyze@v4
```

- [ ] **Step 2: Validate YAML structure**

Run: `python3 - <<'PY' ...`
Expected: both workflow files parse as valid YAML.

### Task 3: Add Semgrep CE workflow

**Files:**
- Create: `.github/workflows/semgrep.yml`

- [ ] **Step 1: Add workflow YAML**

```yaml
name: Semgrep CE

on:
  push:
  pull_request:
  schedule:
    - cron: "43 2 * * 1"
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Semgrep CE
        run: |
          semgrep scan \
            --config p/default \
            --exclude docs \
            --sarif \
            --output semgrep.sarif \
            .

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: semgrep.sarif
```

- [ ] **Step 2: Keep Semgrep non-blocking initially**

Expected: the workflow uploads findings into GitHub code scanning without failing the job solely because findings exist. Tightening to blocking mode is a later policy change.

### Task 4: Verify, commit, and push

**Files:**
- Modify: `.github/workflows/codeql.yml`
- Modify: `.github/workflows/semgrep.yml`

- [ ] **Step 1: Validate YAML and inspect git diff**

Run: `python3` YAML parse check and `git diff -- .github/workflows`
Expected: valid YAML and only the intended workflow additions.

- [ ] **Step 2: Commit the workflow files**

```bash
git add .github/workflows/codeql.yml .github/workflows/semgrep.yml docs/superpowers/plans/2026-06-09-github-codeql-semgrep-ce.md
git commit -m "ci: add CodeQL and Semgrep CE scanning workflows"
```

- [ ] **Step 3: Push the current branch to GitHub**

```bash
git push -u origin HEAD
```

Expected: the branch is published and the push event triggers both workflows on GitHub.

### Task 5: Verify GitHub runs

**Files:**
- No file changes

- [ ] **Step 1: Confirm workflow runs exist**

Run: `gh run list --branch <current-branch> --limit 10`
Expected: fresh `CodeQL` and `Semgrep CE` runs appear for the pushed commit.

- [ ] **Step 2: Report run status and links**

Expected: provide the branch name, run status, and direct GitHub Actions URLs so the user can inspect them.
