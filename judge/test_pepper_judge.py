"""Run with:  python3 -m unittest test_pepper_judge  (from the judge/ folder)."""

import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pepper_judge as pj


class CompareTests(unittest.TestCase):
    def test_trailing_whitespace_and_blank_lines_ignored(self):
        ok, diff = pj.compare_outputs("1\t\n2  \n\n", "1\n2")
        self.assertTrue(ok)
        self.assertIsNone(diff)

    def test_mismatch_has_diff(self):
        ok, diff = pj.compare_outputs("1\n3", "1\n2")
        self.assertFalse(ok)
        self.assertIn("-2", diff)
        self.assertIn("+3", diff)

    def test_java_class_name(self):
        self.assertEqual(pj.java_class_name("public class Solution {"), "Solution")
        self.assertEqual(pj.java_class_name("class X {}"), "Main")


class JudgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.judge = pj.Judge(pj.build_languages())

    def test_python_verdicts(self):
        code = "n = int(input())\nprint(n * 2)\n"
        res = self.judge.execute("python", code, [
            {"input": "2", "expected": "4"},
            {"input": "3", "expected": "7"},
            {"input": "5", "expected": None},
        ])
        verdicts = [r["verdict"] for r in res["results"]]
        self.assertEqual(verdicts, ["AC", "WA", "OK"])
        self.assertEqual(res["summary"], {"verdict": "WA", "passed": 1, "total": 3})

    def test_stop_on_failure(self):
        res = self.judge.execute("python", "print(1)", [
            {"input": "", "expected": "2"}, {"input": "", "expected": "1"},
        ], stop_on_failure=True)
        self.assertEqual(len(res["results"]), 1)

    def test_runtime_error_and_timeout(self):
        res = self.judge.execute("python", "raise SystemExit(3)", [{"input": "", "expected": "x"}])
        self.assertEqual(res["results"][0]["verdict"], "RE")
        res = self.judge.execute("python", "while True: pass", [{"input": "", "expected": "x"}],
                                 time_limit_ms=300)
        self.assertEqual(res["results"][0]["verdict"], "TLE")

    def test_cpp_compile_error(self):
        if "cpp" not in self.judge.languages:
            self.skipTest("no C++ compiler")
        res = self.judge.execute("cpp", "int main( {", [{"input": "", "expected": ""}])
        self.assertFalse(res["compile"]["ok"])
        self.assertEqual(res["summary"]["verdict"], "CE")

    def test_cpp_runs(self):
        if "cpp" not in self.judge.languages:
            self.skipTest("no C++ compiler")
        code = "#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}"
        res = self.judge.execute("cpp", code, [{"input": "2 3", "expected": "5"}])
        self.assertEqual(res["summary"]["verdict"], "AC")

    def test_unknown_language(self):
        with self.assertRaises(ValueError):
            self.judge.execute("cobol", "", [])


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        pj.Handler.judge = pj.Judge(pj.build_languages())
        pj.Handler.store = pj.SubmissionStore(os.path.join(cls.tmp.name, "s.db"))
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), pj.Handler)
        cls.base = "http://127.0.0.1:%d" % cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.tmp.cleanup()

    def request(self, path, body=None, origin=pj.SITE_URL.rstrip("/").rsplit("/", 1)[0]):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data)
        req.add_header("Content-Type", "application/json")
        if origin:
            req.add_header("Origin", origin)
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, json.loads(resp.read()), resp.headers
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b"{}"), e.headers

    def test_health_has_cors_for_site(self):
        status, body, headers = self.request("/health")
        self.assertEqual(status, 200)
        self.assertIn("python", body["languages"])
        self.assertEqual(headers["Access-Control-Allow-Origin"], "https://diwakar-gupta.github.io")

    def test_foreign_origin_rejected(self):
        status, _, _ = self.request("/run", {"language": "python", "code": "print(1)"},
                                    origin="https://evil.example")
        self.assertEqual(status, 403)

    def test_localhost_origin_allowed(self):
        status, _, _ = self.request("/health", origin="http://localhost:1234")
        self.assertEqual(status, 200)

    def test_root_redirects_to_site(self):
        conn = __import__("http.client").client.HTTPConnection("127.0.0.1", self.httpd.server_address[1])
        conn.request("GET", "/")
        resp = conn.getresponse()
        self.assertEqual(resp.status, 302)
        self.assertEqual(resp.getheader("Location"), "/pepper/")

    def test_site_is_mirrored_with_judge_marker(self):
        class FakeMirror(pj.SiteMirror):
            def _download(self, path):
                if path == "/pepper/app.js":
                    return 200, "application/javascript", b"console.log(1)"
                return 404, "text/html", b"<html><head></head><body>shell</body></html>"

        pj.Handler.mirror = FakeMirror()
        try:
            with urllib.request.urlopen(self.base + "/pepper/course/x/y") as resp:
                self.assertEqual(resp.status, 200)  # SPA route served as the app shell
                self.assertIn(b"__PEPPER_JUDGE__", resp.read())
            with urllib.request.urlopen(self.base + "/pepper/app.js") as resp:
                self.assertEqual(resp.read(), b"console.log(1)")
        finally:
            pj.Handler.mirror = pj.SiteMirror()

    def test_submit_and_progress(self):
        status, body, _ = self.request("/submit", {
            "problemSlug": "demo", "language": "python", "code": "print(input())",
            "tests": [{"input": "hi", "expected": "hi"}],
        })
        self.assertEqual(status, 200)
        self.assertEqual(body["summary"]["verdict"], "AC")
        _, hist, _ = self.request("/submissions?problem=demo")
        self.assertEqual(len(hist["submissions"]), 1)
        _, prog, _ = self.request("/progress")
        self.assertEqual(prog["progress"]["demo"], "solved")


if __name__ == "__main__":
    unittest.main()
