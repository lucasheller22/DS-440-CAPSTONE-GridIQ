import google.generativeai as genai
from typing import List, Dict, Any
import json
from app.core.config import settings

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def generate_response(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Generate a response from Gemini given a list of messages.
        Messages should be in format: [{"role": "user", "content": "..."}]
        """
        # Convert to Gemini format
        history = []
        for msg in messages[:-1]:  # All but the last message
            if msg["role"] == "user":
                history.append({"role": "user", "parts": [msg["content"]]})
            elif msg["role"] == "assistant":
                history.append({"role": "model", "parts": [msg["content"]]})

        # Start chat with history
        chat = self.model.start_chat(history=history)

        # Send the last user message
        last_message = messages[-1]["content"]
        response = chat.send_message(last_message)

        # Extract citations if available
        citations = []
        if hasattr(response, '_result') and response._result.candidates:
            candidate = response._result.candidates[0]
            if hasattr(candidate, 'grounding_attributions'):
                for attr in candidate.grounding_attributions:
                    citations.append({
                        "title": attr.title if hasattr(attr, 'title') else "",
                        "url": attr.uri if hasattr(attr, 'uri') else "",
                        "snippet": attr.content if hasattr(attr, 'content') else ""
                    })

        return {
            "content": response.text,
            "citations": citations
        }

# Global instance
gemini_service = GeminiService()