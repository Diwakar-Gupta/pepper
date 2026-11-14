// Where the site is served from (GitHub Pages project path).
export const BASE = "/pepper";

export const REPO_URL = "https://github.com/Diwakar-Gupta/pepper";
export const JUDGE_SCRIPT_URL =
  "https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/pepper_judge.py";
export const DEFAULT_JUDGE_PORT = 5050;

export const LANGUAGE_META = {
  java: { label: "Java", aceMode: "java" },
  cpp: { label: "C++", aceMode: "c_cpp" },
  c: { label: "C", aceMode: "c_cpp" },
  python: { label: "Python", aceMode: "python" },
  javascript: { label: "JavaScript", aceMode: "javascript" },
};

// Starter code used when the archived problem has no template for a language.
export const DEFAULT_TEMPLATES = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scn = new Scanner(System.in);
        // write your code here

    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // write your code here

    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    // write your code here

    return 0;
}
`,
  python: `import sys
input = sys.stdin.readline

# write your code here
`,
  javascript: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
let line = 0;
const next = () => lines[line++];

// write your code here
`,
};
