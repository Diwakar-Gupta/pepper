# Pepper: DSA Learning Platform

Welcome to Pepper, a static DSA learning platform inspired by Pepcoding. Pepper aims to provide quality educational materials for learning Data Structures and Algorithms.

## Repository Structure

- **frontend/**: The main web application, built with React and Parcel. Hosted at [diwakar-gupta.github.io/pepper/](https://diwakar-gupta.github.io/pepper/).
- **judge/**: Local code execution backend supporting Java, Python, and C++. Run this locally to enable code execution from the frontend.
- **scrapper/**: Tools for scraping course/problem data (optional for most users).

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone git@github.com:Diwakar-Gupta/pepper.git
   cd pepper
   ```
2. **Install frontend dependencies and run the web app:**
   ```bash
   cd frontend
   yarn install
   yarn start
   # Visit http://localhost:1234/pepper/
   ```
3. **(Optional) Run the judge for local code execution:**
   ```bash
   cd ../judge
   # Set up your Python environment, then:
   python main.py
   ```

## Visit the Website

The production site is hosted at: [https://diwakar-gupta.github.io/pepper/](https://diwakar-gupta.github.io/pepper/)

- For code execution, you must run the judge locally (see [judge/README.md](judge/README.md)).

## Subproject READMEs

- [frontend/README.md](frontend/README.md): Web app details, development, and deployment.
- [judge/README.md](judge/README.md): Local code execution backend setup and usage.

## License

This project is licensed under the [Apache License](LICENSE).
