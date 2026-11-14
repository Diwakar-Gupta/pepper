# Pepper scraper

Rebuilds `frontend/public/database` from [Wayback Machine](https://web.archive.org/) snapshots of pepcoding.com.
No headless browser: it reads the archived raw HTML with `fetch` and parses it with cheerio.

```bash
npm install
node scrape.js                              # all three courses (first run: ~30 min, then cached)
node scrape.js --course levelup             # one course
node scrape.js --course dsa-fundamentals --module patterns
node scrape.js --index-tests                # only refresh testCases lists after adding test files
```

What it collects for every module:

- **Problems**: statement, input/output format, constraints, sample input/output, difficulty, question video,
  solution video, starter code (Java, C++, Python where archived) and the editorial (often with a full solution).
  The sample becomes test case #1, unless `testcases/<slug>/` already has hand-written tests, which are never overwritten.
- **Articles**: the written notes for each topic.
- **Videos**: lecture YouTube IDs.
- **Images**: downloaded into `database/images/`.

How it works:

1. One CDX query per course lists every archived URL and snapshot time.
2. For each page it fetches the newest snapshot from before the site shut down (2023), using the `id_` form so the
   HTML is the original, without the Wayback toolbar. If parsing fails it tries older snapshots.
3. Responses are cached in `.cache/` (git-ignored), so re-runs only re-parse.
4. HTML is reduced to a small safe tag subset before being saved, because the site renders it directly.

Items that were never archived show up in module lists as "not archived". MCQs are skipped (answers weren't archived).
