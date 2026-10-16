# Testing

Run backend tests from `backend/`:

```powershell
python -m unittest discover -p "test*.py"
```

Run frontend checks from the repository root:

```powershell
npx tsc --noEmit
$env:VITE_API_BASE_URL = "https://api.example.invalid"
npm run build
$buildExit = $LASTEXITCODE
Remove-Item Env:VITE_API_BASE_URL
if ($buildExit -ne 0) { exit $buildExit }
```

Run repository checks:

```powershell
git diff --check
git diff --stat
git status -sb
```

The regression suite uses mocked provider calls and local temporary SQLite files. It does not validate live Gemini/Ollama behavior, production routing, PDF extraction comprehensively, automated accessibility, multi-host SQLite, or a proxy's forwarded-address setup.
