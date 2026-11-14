#!/usr/bin/env python3
"""
Pepper Judge - a local code runner for https://diwakar-gupta.github.io/pepper/

Single file, Python standard library only (3.8+). No pip install, no venv.

    python3 pepper_judge.py            # listen on 127.0.0.1:5050
    python3 pepper_judge.py --port 6000

The website (running in a browser on the same machine) talks to this server
over http://127.0.0.1:<port>. Only requests coming from allowed origins are
accepted, so random websites you visit cannot run code on your machine.
"""

import argparse
import difflib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

VERSION = "3.0.0"
DEFAULT_PORT = 5050
SITE_URL = "https://diwakar-gupta.github.io/pepper/"

DEFAULT_ALLOWED_ORIGINS = {
    "https://diwakar-gupta.github.io",
}
# Any port on these hosts is accepted (local development of the frontend).
LOCAL_ORIGIN_RE = re.compile(r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")

DATA_DIR = os.path.join(os.path.expanduser("~"), ".pepper")
DB_PATH = os.path.join(DATA_DIR, "submissions.db")

MAX_OUTPUT_BYTES = 1 << 20  # 1 MiB per stream
MAX_BODY_BYTES = 8 << 20  # 8 MiB request body
DEFAULT_TIME_LIMIT_MS = 2000
COMPILE_TIMEOUT_S = 30
IS_WINDOWS = os.name == "nt"


# --------------------------------------------------------------------------- #
# Languages
# --------------------------------------------------------------------------- #

def _first_available(*names):
    for n in names:
        path = shutil.which(n)
        if path:
            return path
    return None


def _version_of(cmd):
    """Return the first line of `cmd`'s version output, or None if it fails."""
    try:
        out = subprocess.run(cmd, capture_output=True, timeout=10)
    except Exception:
        return None
    if out.returncode != 0:
        return None
    text = (out.stdout or out.stderr).decode(errors="replace").strip()
    return text.splitlines()[0] if text else "unknown"


def java_class_name(code):
    m = re.search(r"public\s+(?:final\s+|abstract\s+)*class\s+([A-Za-z_]\w*)", code)
    return m.group(1) if m else "Main"


class Language:
    """Describes how to compile and run one language."""

    def __init__(self, id, name, source_name, version_cmd, compile_cmd=None,
                 run_cmd=None, time_factor=1.0):
        self.id = id
        self.name = name
        self.source_name = source_name  # callable(code) -> filename
        self.version_cmd = version_cmd
        self.compile_cmd = compile_cmd  # callable(src, workdir) -> argv | None
        self.run_cmd = run_cmd  # callable(src, workdir, code) -> argv
        self.time_factor = time_factor
        self.version = None


def build_languages():
    langs = []
    exe = ".exe" if IS_WINDOWS else ""

    py = sys.executable or _first_available("python3", "python")
    if py:
        langs.append(Language(
            "python", "Python 3", lambda c: "main.py", [py, "--version"],
            run_cmd=lambda src, d, c: [py, "-u", src],
        ))

    javac, java = _first_available("javac"), _first_available("java")
    if javac and java:
        langs.append(Language(
            "java", "Java", lambda c: java_class_name(c) + ".java", [javac, "-version"],
            compile_cmd=lambda src, d: [javac, "-encoding", "UTF-8", "-d", d, src],
            run_cmd=lambda src, d, c: [java, "-Xss64m", "-cp", d, java_class_name(c)],
            time_factor=2.0,
        ))

    cxx = _first_available("g++", "clang++")
    if cxx:
        langs.append(Language(
            "cpp", "C++17", lambda c: "main.cpp", [cxx, "--version"],
            compile_cmd=lambda src, d: [cxx, "-std=c++17", "-O2", "-o",
                                        os.path.join(d, "main" + exe), src],
            run_cmd=lambda src, d, c: [os.path.join(d, "main" + exe)],
        ))

    cc = _first_available("gcc", "clang")
    if cc:
        langs.append(Language(
            "c", "C", lambda c: "main.c", [cc, "--version"],
            compile_cmd=lambda src, d: [cc, "-O2", "-o", os.path.join(d, "main" + exe), src, "-lm"],
            run_cmd=lambda src, d, c: [os.path.join(d, "main" + exe)],
        ))

    node = _first_available("node")
    if node:
        langs.append(Language(
            "javascript", "JavaScript (Node.js)", lambda c: "main.js", [node, "--version"],
            run_cmd=lambda src, d, c: [node, src],
        ))

    available = {}
    for lang in langs:
        lang.version = _version_of(lang.version_cmd)
        if lang.version:
            available[lang.id] = lang
    return available


# --------------------------------------------------------------------------- #
# Execution
# --------------------------------------------------------------------------- #

def _truncate(data):
    if len(data) > MAX_OUTPUT_BYTES:
        data = data[:MAX_OUTPUT_BYTES]
        return data.decode(errors="replace") + "\n... (output truncated)"
    return data.decode(errors="replace")


def normalize_output(text):
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    while lines and lines[0] == "":
        lines.pop(0)
    return lines


def compare_outputs(actual, expected):
    a, e = normalize_output(actual), normalize_output(expected)
    if a == e:
        return True, None
    diff = "\n".join(difflib.unified_diff(e, a, fromfile="expected", tofile="yours", lineterm=""))
    return False, diff


def run_process(argv, stdin_text, timeout_s, cwd):
    start = time.perf_counter()
    try:
        proc = subprocess.run(
            argv, input=stdin_text.encode(), capture_output=True,
            timeout=timeout_s, cwd=cwd,
        )
        elapsed = int((time.perf_counter() - start) * 1000)
        return proc.returncode, _truncate(proc.stdout), _truncate(proc.stderr), elapsed, False
    except subprocess.TimeoutExpired as e:
        elapsed = int((time.perf_counter() - start) * 1000)
        return None, _truncate(e.stdout or b""), _truncate(e.stderr or b""), elapsed, True


class Judge:
    def __init__(self, languages):
        self.languages = languages
        # One program at a time keeps timings meaningful and the laptop responsive.
        self.lock = threading.Lock()

    def execute(self, language, code, tests, time_limit_ms=None, stop_on_failure=False):
        """
        Compile `code` once and run it against every test.

        Returns {"compile": {...}, "results": [...], "summary": {...}}.
        Each test is {"input": str, "expected": str | None}.
        """
        lang = self.languages.get(language)
        if not lang:
            raise ValueError("Language '%s' is not available on this machine" % language)
        if not tests:
            tests = [{"input": "", "expected": None}]
        limit_ms = int((time_limit_ms or DEFAULT_TIME_LIMIT_MS) * lang.time_factor)

        with self.lock, tempfile.TemporaryDirectory(prefix="pepper-") as workdir:
            src = os.path.join(workdir, lang.source_name(code))
            with open(src, "w", encoding="utf-8") as f:
                f.write(code)

            compile_info = {"ok": True, "output": ""}
            if lang.compile_cmd:
                try:
                    proc = subprocess.run(lang.compile_cmd(src, workdir), capture_output=True,
                                          timeout=COMPILE_TIMEOUT_S, cwd=workdir)
                    out = _truncate(proc.stderr + proc.stdout)
                    compile_info = {"ok": proc.returncode == 0, "output": out.replace(workdir + os.sep, "")}
                except subprocess.TimeoutExpired:
                    compile_info = {"ok": False, "output": "Compilation timed out"}
                if not compile_info["ok"]:
                    return {
                        "compile": compile_info,
                        "results": [],
                        "summary": summarize([], len(tests), "CE"),
                    }

            results = []
            argv = lang.run_cmd(src, workdir, code)
            for i, test in enumerate(tests):
                stdin_text = test.get("input") or ""
                expected = test.get("expected")
                code_rc, out, err, ms, timed_out = run_process(argv, stdin_text, limit_ms / 1000.0, workdir)
                result = {
                    "index": i,
                    "input": stdin_text,
                    "expected": expected,
                    "stdout": out,
                    "stderr": err.replace(workdir + os.sep, ""),
                    "timeMs": ms,
                    "exitCode": code_rc,
                    "diff": None,
                }
                if timed_out:
                    result["verdict"] = "TLE"
                elif code_rc != 0:
                    result["verdict"] = "RE"
                elif expected is None or expected == "":
                    result["verdict"] = "OK"
                else:
                    passed, diff = compare_outputs(out, expected)
                    result["verdict"] = "AC" if passed else "WA"
                    result["diff"] = diff
                results.append(result)
                if stop_on_failure and result["verdict"] not in ("AC", "OK"):
                    break

            return {
                "compile": compile_info,
                "results": results,
                "summary": summarize(results, len(tests)),
            }


def summarize(results, total, forced=None):
    passed = sum(1 for r in results if r["verdict"] == "AC")
    if forced:
        verdict = forced
    else:
        failing = [r for r in results if r["verdict"] not in ("AC", "OK")]
        verdict = failing[0]["verdict"] if failing else "AC"
    return {"verdict": verdict, "passed": passed, "total": total}


# --------------------------------------------------------------------------- #
# Submission history (SQLite in ~/.pepper)
# --------------------------------------------------------------------------- #

class SubmissionStore:
    def __init__(self, path=DB_PATH):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.path = path
        self.lock = threading.Lock()
        with self._conn() as c:
            c.execute("""
                CREATE TABLE IF NOT EXISTS submissions (
                    id TEXT PRIMARY KEY,
                    problem_slug TEXT NOT NULL,
                    language TEXT NOT NULL,
                    code TEXT NOT NULL,
                    verdict TEXT NOT NULL,
                    passed INTEGER NOT NULL,
                    total INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    details TEXT
                )""")
            c.execute("CREATE INDEX IF NOT EXISTS idx_sub_slug ON submissions(problem_slug, created_at)")

    def _conn(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def add(self, slug, language, code, summary, details):
        sid = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        with self.lock, self._conn() as c:
            c.execute(
                "INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?,?)",
                (sid, slug, language, code, summary["verdict"], summary["passed"],
                 summary["total"], now, json.dumps(details)),
            )
        return {"id": sid, "createdAt": now}

    def history(self, slug, limit=50):
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM submissions WHERE problem_slug=? ORDER BY created_at DESC LIMIT ?",
                (slug, limit),
            ).fetchall()
        return [{
            "id": r["id"], "language": r["language"], "code": r["code"],
            "verdict": r["verdict"], "passed": r["passed"], "total": r["total"],
            "createdAt": r["created_at"], "details": json.loads(r["details"] or "null"),
        } for r in rows]

    def progress(self):
        """{slug: "solved" | "attempted"} for every problem ever submitted."""
        with self._conn() as c:
            rows = c.execute("""
                SELECT problem_slug, MAX(verdict = 'AC') AS solved
                FROM submissions GROUP BY problem_slug""").fetchall()
        return {r["problem_slug"]: ("solved" if r["solved"] else "attempted") for r in rows}


# --------------------------------------------------------------------------- #
# HTTP server
# --------------------------------------------------------------------------- #

class Handler(BaseHTTPRequestHandler):
    server_version = "PepperJudge/" + VERSION
    judge = None  # type: Judge
    store = None  # type: SubmissionStore
    allowed_origins = set(DEFAULT_ALLOWED_ORIGINS)
    port = DEFAULT_PORT
    verbose = False

    # --- helpers ----------------------------------------------------------- #

    def log_message(self, fmt, *args):
        if self.verbose:
            sys.stderr.write("  %s\n" % (fmt % args))

    def _origin_allowed(self):
        origin = self.headers.get("Origin")
        if origin is None:
            return True  # not a browser cross-origin request (curl, same-origin GET)
        return origin in self.allowed_origins or bool(LOCAL_ORIGIN_RE.match(origin))

    def _host_allowed(self):
        # Defends against DNS rebinding: only accept requests addressed to loopback.
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip("[]")
        return host in ("127.0.0.1", "localhost", "::1")

    def _cors(self):
        origin = self.headers.get("Origin")
        if origin and self._origin_allowed():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Max-Age", "600")

    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _guard(self):
        if not self._host_allowed():
            self._send(403, {"error": "Requests must be addressed to 127.0.0.1"})
            return False
        if not self._origin_allowed():
            origin = self.headers.get("Origin")
            print("  ! Rejected request from origin %s (start with --allow-origin %s to permit it)"
                  % (origin, origin))
            self._send(403, {"error": "Origin not allowed"})
            return False
        return True

    def _json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            raise ValueError("Request too large")
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode() or "{}")

    # --- verbs ------------------------------------------------------------- #

    def do_OPTIONS(self):
        if not self._host_allowed() or not self._origin_allowed():
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if not self._guard():
            return
        url = urlparse(self.path)
        query = parse_qs(url.query)
        try:
            if url.path in ("/", "/health"):
                self._send(200, self._health())
            elif url.path == "/submissions":
                slug = (query.get("problem") or [""])[0]
                if not slug:
                    raise ValueError("Missing ?problem=<slug>")
                self._send(200, {"submissions": self.store.history(slug)})
            elif url.path == "/progress":
                self._send(200, {"progress": self.store.progress()})
            else:
                self._send(404, {"error": "Not found"})
        except ValueError as e:
            self._send(400, {"error": str(e)})
        except Exception as e:  # pragma: no cover
            self._send(500, {"error": str(e)})

    def do_POST(self):
        if not self._guard():
            return
        url = urlparse(self.path)
        try:
            body = self._json_body()
            if url.path == "/run":
                result = self._run(body, stop_on_failure=False)
                self._send(200, result)
            elif url.path == "/submit":
                slug = body.get("problemSlug")
                if not slug:
                    raise ValueError("problemSlug is required")
                result = self._run(body, stop_on_failure=True)
                saved = self.store.add(slug, body.get("language"), body.get("code") or "",
                                       result["summary"], _submission_details(result))
                result["submission"] = saved
                v = result["summary"]
                print("  > submit %-45s %-10s %s (%d/%d)" % (slug[:45], body.get("language"),
                                                              v["verdict"], v["passed"], v["total"]))
                self._send(200, result)
            else:
                self._send(404, {"error": "Not found"})
        except ValueError as e:
            self._send(400, {"error": str(e)})
        except Exception as e:  # pragma: no cover
            self._send(500, {"error": str(e)})

    # --- endpoints --------------------------------------------------------- #

    def _health(self):
        return {
            "name": "pepper-judge",
            "version": VERSION,
            "platform": sys.platform,
            "languages": {
                l.id: {"name": l.name, "version": l.version} for l in self.judge.languages.values()
            },
        }

    def _run(self, body, stop_on_failure):
        tests = body.get("tests") or []
        if not isinstance(tests, list):
            raise ValueError("tests must be a list")
        tests = [{"input": str(t.get("input") or ""),
                  "expected": None if t.get("expected") is None else str(t.get("expected"))}
                 for t in tests]
        return self.judge.execute(
            body.get("language"), body.get("code") or "", tests,
            time_limit_ms=body.get("timeLimitMs"), stop_on_failure=stop_on_failure,
        )


def _submission_details(result):
    """Keep only what history needs (the failing case), not every output."""
    failing = next((r for r in result["results"] if r["verdict"] not in ("AC", "OK")), None)
    return {"compile": result["compile"], "failing": failing}


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #

def main(argv=None):
    parser = argparse.ArgumentParser(description="Pepper local judge")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PEPPER_JUDGE_PORT", DEFAULT_PORT)))
    parser.add_argument("--allow-origin", action="append", default=[],
                        help="Extra website origin allowed to use this judge (repeatable)")
    parser.add_argument("--verbose", action="store_true", help="Log every HTTP request")
    args = parser.parse_args(argv)

    print("\n  Pepper Judge v%s" % VERSION)
    print("  ------------------")
    languages = build_languages()
    if languages:
        for lang in languages.values():
            print("  [x] %-22s %s" % (lang.name, lang.version))
    missing = {"python", "java", "cpp", "c", "javascript"} - set(languages)
    for lid in sorted(missing):
        print("  [ ] %-22s not found (install it and restart to enable)" % lid)

    Handler.judge = Judge(languages)
    Handler.store = SubmissionStore()
    Handler.allowed_origins = set(DEFAULT_ALLOWED_ORIGINS) | set(args.allow_origin)
    Handler.port = args.port
    Handler.verbose = args.verbose

    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as e:
        print("\n  Could not listen on 127.0.0.1:%d (%s)." % (args.port, e))
        print("  Is another judge already running? Close it, or use --port <n>.\n")
        return 1

    print("\n  Listening on http://127.0.0.1:%d" % args.port)
    print("  Submissions are saved in %s" % DB_PATH)
    print("\n  Now open %s - it connects automatically." % SITE_URL)
    print("  Keep this window open while you practice. Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Bye!")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
