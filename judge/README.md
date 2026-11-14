# Pepper Judge

A tiny local server that compiles and runs your code for the [Pepper website](https://diwakar-gupta.github.io/pepper/).
It is a **single Python file with no dependencies**: no pip, no virtualenv, no account, no internet needed while it runs.

## Start it

You need Python 3.8+. Paste one line into a terminal and keep the window open:

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/pepper_judge.py | python3 -
```

**Windows (PowerShell)**

```powershell
(irm https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/pepper_judge.py) | python -
```

Then open the website. It finds the judge by itself within a few seconds (the badge in the top-right turns green).
There is no code to type in.

Prefer to keep a copy? Download [`pepper_judge.py`](pepper_judge.py) and run `python3 pepper_judge.py`.

## Languages

The judge uses whatever compilers are already on your machine and shows what it found when it starts:

| Language   | Needs on your PATH            |
| ---------- | ----------------------------- |
| Python 3   | the Python running the judge  |
| Java       | `javac` and `java` (JDK 8+)   |
| C++17      | `g++` or `clang++`            |
| C          | `gcc` or `clang`              |
| JavaScript | `node`                        |

Install a missing one and restart the judge to enable it.

## Options

```
python3 pepper_judge.py --port 6000                 # if 5050 is taken (also set the port on the website)
python3 pepper_judge.py --allow-origin https://you.github.io   # if you host your own fork of the site
python3 pepper_judge.py --site-origin http://127.0.0.1:8000   # serve /pepper/ from another copy of the site
python3 pepper_judge.py --verbose                   # log every request
```

## How it works

- Listens on `http://127.0.0.1:5050` (your computer only, never the network).
- The website, running in your browser on the same machine, calls it directly with `fetch`.
  Nothing goes through a server on the internet.
- It also serves the website at `http://127.0.0.1:5050/pepper/` (passed through from GitHub Pages), for browsers
  like Safari that block https → http requests.
- Endpoints: `GET /health`, `POST /run`, `POST /submit`, `GET /submissions?problem=<slug>`, `GET /progress`.
- Each run compiles once, then runs every test case with a time limit (2 s, 4 s for Java).
  Verdicts: Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error, Compilation Error.
  Output comparison ignores trailing spaces and blank lines.
- Submissions are saved in `~/.pepper/submissions.db` (SQLite), so your history and solved problems survive restarts.

## Safety

The judge runs code you write, with your user's permissions. To keep other websites from abusing it:

- it only binds to `127.0.0.1`;
- it only answers browser requests from the Pepper site and from `localhost` (other origins get `403`);
- it rejects requests whose `Host` is not loopback, which blocks DNS-rebinding tricks.

Still, only run code you understand. Don't run the judge as root/Administrator.

## Troubleshooting

- **The website says "Judge offline" but the judge is running.** If the browser asks to allow the site to access
  apps or devices on your local network, click *Allow*. In Brave, allow "localhost access" if Shields blocks it.
- **Safari.** Safari blocks https pages from talking to `http://127.0.0.1`, so the GitHub Pages site can't reach the
  judge there. Open **http://127.0.0.1:5050/pepper/** instead: the judge serves the website itself (fetched from
  GitHub Pages), and the page connects automatically. Chrome, Edge, Firefox and Brave work with either address.
  Note that code drafts saved in the browser are per address.
- **"Could not listen on 127.0.0.1:5050".** Another judge is already running. Close it, or use `--port`.
- **`python3` not found on Windows.** Use `python` (or `py`) instead.
- **Java/C++ not listed.** Check `javac -version` / `g++ --version` work in the same terminal, then restart the judge.

## Development

```bash
cd judge
python3 -m unittest test_pepper_judge -v
```
