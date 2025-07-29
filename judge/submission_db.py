import sqlite3
import os
import time
import json
from datetime import datetime
from typing import List, Dict, Optional, Set
import hashlib
from contextlib import contextmanager

class SubmissionDB:
    """
    SQLite-based database for tracking code submissions.
    Optimized for:
    1. Adding new submission entries
    2. Fetching submission history for a question
    3. Checking which problems from a list were solved/failed
    """
    
    def __init__(self, db_path: str = "submissions.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize the SQLite database with required tables"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Create submissions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS submissions (
                    id TEXT PRIMARY KEY,
                    problem_slug TEXT NOT NULL,
                    language TEXT NOT NULL,
                    code TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'error')),
                    timestamp REAL NOT NULL,
                    datetime TEXT NOT NULL,
                    test_results TEXT,  -- JSON string
                    error_message TEXT
                )
            """)
            
            # Create indexes for fast queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_problem_slug 
                ON submissions(problem_slug)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON submissions(timestamp DESC)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_status 
                ON submissions(status)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_problem_status 
                ON submissions(problem_slug, status)
            """)
            
            # Create a view for problem status (latest successful submission per problem)
            cursor.execute("""
                CREATE VIEW IF NOT EXISTS problem_status AS
                SELECT 
                    problem_slug,
                    CASE 
                        WHEN MAX(CASE WHEN status = 'success' THEN timestamp END) IS NOT NULL THEN 'success'
                        WHEN MAX(CASE WHEN status = 'failed' THEN timestamp END) IS NOT NULL THEN 'failed'
                        ELSE 'error'
                    END as status,
                    MAX(timestamp) as latest_timestamp
                FROM submissions 
                GROUP BY problem_slug
            """)
            
            conn.commit()
    
    @contextmanager
    def _get_connection(self):
        """Get a database connection with proper cleanup"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
        finally:
            conn.close()
    
    def _generate_submission_id(self, problem_slug: str, language: str, code: str, timestamp: float) -> str:
        """Generate a unique submission ID"""
        content = f"{problem_slug}_{language}_{timestamp}_{code[:100]}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def add_submission(self, problem_slug: str, language: str, code: str, status: str, 
                      test_results: Optional[Dict] = None, error_message: Optional[str] = None) -> str:
        """
        Add a new submission entry.
        
        Args:
            problem_slug: The problem identifier
            language: Programming language used
            code: The submitted code
            status: "success", "failed", or "error"
            test_results: Optional test execution results
            error_message: Optional error message if status is "error"
        
        Returns:
            submission_id: Unique identifier for the submission
        """
        timestamp = time.time()
        submission_id = self._generate_submission_id(problem_slug, language, code, timestamp)
        datetime_str = datetime.fromtimestamp(timestamp).isoformat()
        
        # Convert test_results to JSON string if provided
        test_results_json = json.dumps(test_results) if test_results else None
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO submissions 
                (id, problem_slug, language, code, status, timestamp, datetime, test_results, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (submission_id, problem_slug, language, code, status, timestamp, 
                  datetime_str, test_results_json, error_message))
            conn.commit()
        
        return submission_id
    
    def get_submission_history(self, problem_slug: str) -> List[Dict]:
        """
        Get submission history for a specific problem.
        
        Args:
            problem_slug: The problem identifier
        
        Returns:
            List of submissions for the problem, sorted by timestamp (newest first)
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, problem_slug, language, code, status, timestamp, datetime, 
                       test_results, error_message
                FROM submissions 
                WHERE problem_slug = ?
                ORDER BY timestamp DESC
            """, (problem_slug,))
            
            rows = cursor.fetchall()
            
            submissions = []
            for row in rows:
                submission = dict(row)
                # Parse test_results JSON if present
                if submission['test_results']:
                    submission['test_results'] = json.loads(submission['test_results'])
                submissions.append(submission)
            
            return submissions
    
    def check_problems_status(self, problem_slugs: List[str]) -> Dict[str, str]:
        """
        Check which problems from a list were solved, failed, or have errors.
        
        Args:
            problem_slugs: List of problem identifiers to check
        
        Returns:
            Dictionary mapping problem_slug to status ("success", "failed", "error", or "not_attempted")
        """
        if not problem_slugs:
            return {}
        
        # Create placeholders for the IN clause
        placeholders = ','.join('?' * len(problem_slugs))
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT problem_slug, status
                FROM problem_status
                WHERE problem_slug IN ({placeholders})
            """, problem_slugs)
            
            rows = cursor.fetchall()
            
            # Create result dictionary with default "not_attempted" status
            result = {slug: "not_attempted" for slug in problem_slugs}
            
            # Update with actual statuses from database
            for row in rows:
                result[row['problem_slug']] = row['status']
            
            return result
    
    def get_all_solved_problems(self) -> Set[str]:
        """
        Get all problems that have been successfully solved.
        
        Returns:
            Set of problem slugs that have been solved
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT problem_slug
                FROM problem_status
                WHERE status = 'success'
            """)
            
            rows = cursor.fetchall()
            return {row['problem_slug'] for row in rows}
    
    def get_submission_stats(self) -> Dict:
        """
        Get overall submission statistics.
        
        Returns:
            Dictionary with submission statistics
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Get basic submission counts
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_submissions,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_submissions,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_submissions,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_submissions,
                    COUNT(DISTINCT problem_slug) as unique_problems_attempted,
                    COUNT(DISTINCT language) as unique_languages
                FROM submissions
            """)
            
            stats = dict(cursor.fetchone())
            
            # Get unique problems solved
            cursor.execute("""
                SELECT COUNT(*) as unique_problems_solved
                FROM problem_status
                WHERE status = 'success'
            """)
            
            stats['unique_problems_solved'] = cursor.fetchone()['unique_problems_solved']
            
            # Get languages used
            cursor.execute("""
                SELECT DISTINCT language
                FROM submissions
                ORDER BY language
            """)
            
            languages = [row['language'] for row in cursor.fetchall()]
            stats['languages_used'] = languages
            
            return stats
    
    def get_recent_submissions(self, limit: int = 10) -> List[Dict]:
        """
        Get recent submissions across all problems.
        
        Args:
            limit: Maximum number of submissions to return
        
        Returns:
            List of recent submissions, sorted by timestamp (newest first)
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, problem_slug, language, status, timestamp, datetime
                FROM submissions 
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def backup_to_json(self, backup_path: str):
        """
        Create a JSON backup of all submissions.
        
        Args:
            backup_path: Path to save the backup file
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, problem_slug, language, code, status, timestamp, datetime, 
                       test_results, error_message
                FROM submissions 
                ORDER BY timestamp
            """)
            
            rows = cursor.fetchall()
            submissions = []
            
            for row in rows:
                submission = dict(row)
                # Parse test_results JSON if present
                if submission['test_results']:
                    submission['test_results'] = json.loads(submission['test_results'])
                submissions.append(submission)
            
            with open(backup_path, 'w') as f:
                json.dump(submissions, f, indent=2)
    
    def get_database_info(self) -> Dict:
        """
        Get information about the database file.
        
        Returns:
            Dictionary with database information
        """
        info = {
            'db_path': self.db_path,
            'exists': os.path.exists(self.db_path),
            'size_bytes': 0
        }
        
        if info['exists']:
            info['size_bytes'] = os.path.getsize(self.db_path)
            info['size_mb'] = round(info['size_bytes'] / (1024 * 1024), 2)
        
        return info
