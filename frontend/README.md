# Pepper Frontend

This is the web application for the Pepper DSA Learning Platform. It provides interactive courses, problems, and a code editor for practicing Data Structures and Algorithms.

## Features
- Browse DSA courses and problems
- Practice problems with in-browser code editor
- Code execution support (requires local judge backend)
- Responsive, modern UI

## Getting Started

1. **Install dependencies:**
   ```bash
   yarn install
   ```
2. **Run the development server:**
   ```bash
   yarn start
   # Open http://localhost:1234/pepper/ in your browser
   ```

## Production Deployment

The frontend is deployed to GitHub Pages at [https://diwakar-gupta.github.io/pepper/](https://diwakar-gupta.github.io/pepper/).

## Code Execution (Judge Integration)

- To enable code execution (Java, Python, C++), you must run the [judge backend](../judge/README.md) locally.
- The frontend will connect to the local judge for code execution features.

## Data

- All course and problem data are stored as JSON files in `public/Database/`.

## Contributing

Contributions are welcome! See the main [README](../README.md) for details. 