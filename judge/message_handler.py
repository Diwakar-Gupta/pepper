import json
from code_executor import detect_languages, EXECUTORS, execute_code
from judge import execute_test_cases, judge_submission


class MessageHandler:
    def __init__(self, submission_db):
        self.submission_db = submission_db
    
    def handle_message(self, message, channel):
        """Handle incoming messages from browser"""
        try:
            data = json.loads(message)
            msg_id = data.get("_msgId")
            
            response = self._process_message(data)
            
            # Include the _msgId in the response if it was provided
            if msg_id is not None:
                response["_msgId"] = msg_id
            
            print(f"Sending response to browser: {response}")
            channel.send(json.dumps(response))
        except Exception as e:
            print(f"Error handling message: {e}")
            error_response = {"error": str(e)}
            if 'msg_id' in locals() and msg_id is not None:
                error_response["_msgId"] = msg_id
            channel.send(json.dumps(error_response))
    
    def _process_message(self, data):
        """Process different message types"""
        message_type = data.get("type")
        
        if message_type == "languages":
            return {"languages": detect_languages()}
        
        elif message_type == "execute":
            return self._handle_execute(data)
        
        elif message_type == "submit":
            return self._handle_submit(data)
        
        elif message_type == "submission_history":
            return self._handle_submission_history(data)
        
        elif message_type == "check_problems_status":
            return self._handle_check_problems_status(data)
        
        elif message_type == "submission_stats":
            return self._handle_submission_stats(data)
        
        elif message_type == "recent_submissions":
            return self._handle_recent_submissions(data)
        
        else:
            return {"error": "Unknown message type"}
    
    def _handle_execute(self, data):
        """Handle code execution request"""
        code = data.get("code")
        lang = data.get("language")
        test_cases = data.get("testCases", [])
        
        if not test_cases:
            input_text = data.get("input", "")
            test_cases = [{"input": input_text, "expectedOutput": ""}]
        
        if lang not in EXECUTORS:
            return {"error": "Unsupported language"}
        
        results = execute_test_cases(lang, code, test_cases)
        
        return {
            "results": results,
            "summary": {
                "total": len(results),
                "passed": sum(1 for r in results if r["passed"] is True),
                "failed": sum(1 for r in results if r["passed"] is False),
                "noExpectedOutput": sum(1 for r in results if r["passed"] is None)
            }
        }
    
    def _handle_submit(self, data):
        """Handle code submission request"""
        code = data.get("code")
        lang = data.get("language")
        problem_slug = data.get("problemSlug")
        
        if lang not in EXECUTORS:
            return {"error": "Unsupported language"}
        
        return judge_submission(lang, code, problem_slug, self.submission_db)
    
    def _handle_submission_history(self, data):
        """Handle submission history request"""
        problem_slug = data.get("problemSlug")
        include_code = data.get("includeCode", False)
        
        if not problem_slug:
            return {"error": "Problem slug is required"}
        
        history = self.submission_db.get_submission_history(problem_slug)
        history_summary = []
        
        for submission in history:
            summary = {
                "id": submission["id"],
                "language": submission["language"],
                "status": submission["status"],
                "timestamp": submission["timestamp"],
                "datetime": submission["datetime"],
                "error_message": submission.get("error_message")
            }
            if submission.get("test_results"):
                summary["test_results"] = submission["test_results"]
            if include_code:
                summary["code"] = submission["code"]
            history_summary.append(summary)
        
        return {
            "problemSlug": problem_slug,
            "history": history_summary,
            "totalSubmissions": len(history_summary)
        }
    
    def _handle_check_problems_status(self, data):
        """Handle problems status check request"""
        problem_slugs = data.get("problemSlugs", [])
        
        if not isinstance(problem_slugs, list):
            return {"error": "problemSlugs must be a list"}
        
        status_map = self.submission_db.check_problems_status(problem_slugs)
        return {
            "problemStatuses": status_map,
            "totalProblems": len(problem_slugs),
            "solvedCount": sum(1 for status in status_map.values() if status == "success"),
            "failedCount": sum(1 for status in status_map.values() if status == "failed"),
            "errorCount": sum(1 for status in status_map.values() if status == "error"),
            "notAttemptedCount": sum(1 for status in status_map.values() if status == "not_attempted")
        }
    
    def _handle_submission_stats(self, data):
        """Handle submission statistics request"""
        stats = self.submission_db.get_submission_stats()
        return {"stats": stats}
    
    def _handle_recent_submissions(self, data):
        """Handle recent submissions request"""
        limit = data.get("limit", 10)
        recent = self.submission_db.get_recent_submissions(limit)
        return {
            "recentSubmissions": recent,
            "count": len(recent)
        }
