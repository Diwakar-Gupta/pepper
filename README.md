# Pepper: learn DSA, one problem at a time

**Pepper** keeps the Pepcoding data structures & algorithms curriculum alive after the original site shut down:
video lectures, notes, and hundreds of problems you can solve in the browser.

👉 **https://diwakar-gupta.github.io/pepper/**

It costs nothing to run: the website is static (GitHub Pages) and your code runs on **your own computer** through a
small local judge.

## Run your code in 30 seconds

You need Python 3.8+ (and the compilers for the languages you want: JDK, g++, Node…).

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/pepper_judge.py | python3 -
```

```powershell
# Windows PowerShell
(irm https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/pepper_judge.py) | python -
```

Open the website: it detects the judge automatically. More in [`judge/README.md`](judge/README.md).

- **No setup at all:** Python and JavaScript also run directly in the browser (Pyodide / Web Worker). The judge is
  needed for Java, C++ and C, and for keeping submission history in one place.
- **Safari:** it blocks https pages from reaching the judge, so open **http://127.0.0.1:5050/pepper/** (the judge
  serves the site itself), or use Chrome, Edge, Firefox or Brave.

## How it fits together

```
 Browser (GitHub Pages)                       Your computer
 ┌───────────────────────────┐   fetch()    ┌──────────────────────────────┐
 │ React app                 │ ───────────▶ │ pepper_judge.py              │
 │ problems, videos, notes   │ 127.0.0.1    │ compiles + runs your code     │
 │ from public/database/*.json│ ◀─────────── │ ~/.pepper/submissions.db      │
 └───────────────────────────┘   verdicts   └──────────────────────────────┘
           ▲
           │ built from
 ┌───────────────────────────┐
 │ scraper/ (Wayback Machine)│
 └───────────────────────────┘
```

No signaling server, no WebRTC, no backend to host.

## Repository layout

| Folder      | What it is                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `frontend/` | React + Tailwind site (Parcel). All content is static JSON in `frontend/public/database/`.               |
| `judge/`    | `pepper_judge.py`: single-file, dependency-free local code runner.                                      |
| `scraper/`  | Rebuilds the database from Internet Archive snapshots of pepcoding.com.                                 |

## Contributing

- **Fix content or add test cases.** Problems are in `frontend/public/database/problems/<slug>.json`, tests in
  `frontend/public/database/testcases/<slug>/testcaseinputN.txt` + `testcaseoutputN.txt`.
  After adding test files run `cd scraper && npm run index-tests` to update the problem JSON.
  Most problems only have the archived sample as a test today, so more test cases are the most useful contribution.
- **Work on the site:** see [`frontend/README.md`](frontend/README.md).
- **Re-scrape:** see [`scraper/README.md`](scraper/README.md).

Pushing to `main` builds and deploys the site through GitHub Actions.

## License

[Apache 2.0](LICENSE). Course content belongs to its original authors and is preserved here for learning.
