import json
import re
import google.generativeai as genai
from config import settings

def get_gemini_model():
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.5-flash")

SCREENING_PROMPT = """
You are an expert HR AI. Analyze this resume against the job description and return ONLY valid JSON.

=== JOB DESCRIPTION ===
{job_description}

=== CANDIDATE RESUME ({candidate_name}) ===
{resume_text}

Return ONLY this JSON (no markdown, no explanation):
{{
  "candidate_name": "{candidate_name}",
  "overall_score": <integer 0-100>,
  "grade": "<A+|A|B+|B|C|D|F>",
  "recommendation": "<Strongly Recommended|Recommended|Consider|Not Suitable>",
  "executive_summary": "<2-3 sentence professional summary>",
  "scores": {{
    "skills_match": <0-100>,
    "experience_relevance": <0-100>,
    "education_fit": <0-100>,
    "keyword_alignment": <0-100>,
    "overall_presentation": <0-100>
  }},
  "matched_skills": ["<skill>"],
  "missing_skills": ["<skill>"],
  "bonus_skills": ["<extra skill candidate has>"],
  "strengths": ["<strength>"],
  "weaknesses": ["<weakness>"],
  "red_flags": ["<concern if any>"],
  "interview_questions": ["<tailored question 1>", "<tailored question 2>", "<tailored question 3>"],
  "hiring_recommendation_detail": "<detailed paragraph>"
}}
"""

def clean_json(text: str) -> dict:
    # Remove markdown code fences if present
    text = re.sub(r"```json|```", "", text).strip()
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {}

async def screen_resume(resume_text: str, job_description: str, candidate_name: str) -> dict:
    try:
        model = get_gemini_model()
        prompt = SCREENING_PROMPT.format(
            job_description=job_description[:3000],
            resume_text=resume_text[:3000],
            candidate_name=candidate_name,
        )
        response = model.generate_content(prompt)
        data = clean_json(response.text)
        if not data:
            return {
                "candidate_name": candidate_name,
                "overall_score": 0,
                "error": "Failed to parse Gemini response"
            }
        return data
    except Exception as e:
        return {
            "candidate_name": candidate_name,
            "overall_score": 0,
            "error": str(e)
        }

def rank_results(results: list[dict]) -> list[dict]:
    """Sort by overall_score descending and assign ranks."""
    sorted_results = sorted(results, key=lambda x: x.get("overall_score", 0), reverse=True)
    for i, r in enumerate(sorted_results):
        r["rank"] = i + 1
    return sorted_results
