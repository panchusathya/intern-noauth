"""
Finder - Experimental Lead Generation Tool
Natural language to structured lead discovery with web search
"""

import asyncio
import anthropic
import json
import csv
import io
import uuid
import re
from typing import List, Dict, Any, Optional
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from prompts import FINDER_ORCHESTRATION_PROMPT_TEMPLATE

# Configure logging for finder module
finder_logger = logging.getLogger('finder')
finder_logger.setLevel(logging.INFO)
if not finder_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('[%(name)s] %(message)s'))
    finder_logger.addHandler(handler)

class FinderOrchestrator:
    """Main orchestrator for the finder system"""
    
    def __init__(self, anthropic_client=None):
        self.client = anthropic_client or anthropic.AsyncAnthropic()
        self.session_id = str(uuid.uuid4())
        
    async def process_query(self, user_query: str, user_email: str) -> Dict[str, Any]:
        """
        Main entry point for processing a natural language lead finding query
        Returns either clarification questions or begins the search process
        """
        try:
            finder_logger.info(f"[FINDER] Processing query: {user_query[:100]}...")
            
            # Step 1: Analyze query and determine if clarification is needed
            analysis = await self._analyze_query(user_query)
            
            if analysis.get('needs_clarification'):
                return {
                    'status': 'needs_clarification',
                    'questions': analysis.get('questions', []),
                    'session_id': self.session_id
                }
            
            # Step 2: Generate CSV schema and search strategy
            orchestration = await self._orchestrate_search(user_query, analysis)
            
            return {
                'status': 'orchestration_complete',
                'csv_schema': orchestration['csv_schema'],
                'search_strategy': orchestration['search_strategy'],
                'session_id': self.session_id,
                'estimated_time': orchestration.get('estimated_time', '2-3 minutes')
            }
            
        except Exception as e:
            finder_logger.error(f"[FINDER] Error processing query: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def _analyze_query(self, user_query: str) -> Dict[str, Any]:
        """Analyze the user query to determine if clarification is needed"""
        
        analysis_prompt = f"""
You are analyzing a lead generation request. Determine if the query has enough information to proceed or if clarification is needed.

User Query: "{user_query}"

Analyze this query and determine:
1. Is the target audience clearly defined? (who they're looking for)
2. Is the geographic scope clear? (where to look)
3. Is the desired output format clear? (what information to collect - emails, names, company info, etc.)
4. Is the quantity reasonable and specified?
5. Are there any industry/company criteria specified?

If ANY of these elements are unclear or missing, generate 2-3 specific clarification questions.

Response format (MUST be valid JSON):
{{
    "needs_clarification": boolean,
    "questions": ["question1", "question2", "question3"] or [],
    "analysis": {{
        "target_audience": "clear/unclear - explanation",
        "geographic_scope": "clear/unclear - explanation", 
        "output_format": "clear/unclear - explanation",
        "quantity": "clear/unclear - explanation",
        "criteria": "clear/unclear - explanation"
    }}
}}
"""

        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": analysis_prompt}]
            )
            
            # Extract and clean the response text
            response_text = response.content[0].text.strip()
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback if no JSON found
                finder_logger.error(f"[FINDER] No valid JSON found in response: {response_text}")
                return {"needs_clarification": False, "questions": []}
            
        except json.JSONDecodeError as je:
            finder_logger.error(f"[FINDER] JSON decode error in query analysis: {je}")
            return {"needs_clarification": False, "questions": []}
        except Exception as e:
            finder_logger.error(f"[FINDER] Error in query analysis: {e}")
            return {"needs_clarification": False, "questions": []}
    
    async def _orchestrate_search(self, user_query: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate the CSV schema and search strategy for the sub-agents"""
        
        orchestration_prompt = FINDER_ORCHESTRATION_PROMPT_TEMPLATE.format(
            user_query=user_query,
            analysis=json.dumps(analysis, indent=2)
        )

        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": orchestration_prompt}]
            )
            
            # Extract and clean the response text
            response_text = response.content[0].text.strip()
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                
                # Force CSV schema to fixed Clado columns
                result['csv_schema'] = [
                    {"column": "name", "description": "Full name of the person"},
                    {"column": "title", "description": "Job title or position"},
                    {"column": "company", "description": "Company or organization name"},
                    {"column": "email", "description": "Email address"}
                ]
                
                # Set parallel workers permanently to 4 for Clado integration
                if 'search_strategy' not in result:
                    result['search_strategy'] = {}
                result['search_strategy']['parallel_workers'] = 4
                
                # Since we're using Clado API, we don't need complex work division strategies
                # Just store the refined query for later use
                result['refined_query'] = user_query
                
                return result
            else:
                finder_logger.error(f"[FINDER] No valid JSON found in orchestration response")
                raise Exception("Invalid response format from orchestrator")
            
        except json.JSONDecodeError as je:
            finder_logger.error(f"[FINDER] JSON decode error in orchestration: {je}")
            raise Exception("Failed to parse orchestration response")
        except Exception as e:
            finder_logger.error(f"[FINDER] Error in orchestration: {e}")
            raise

    def execute_search(self, orchestration: Dict[str, Any], user_email: str, session_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute search using Clado deep research API"""
        
        try:
            from clado_finder_integration import CladoFinderIntegration
            
            search_strategy = orchestration['search_strategy']
            
            # Use refined query from orchestration if available, otherwise session query
            if orchestration.get('refined_query'):
                refined_query = orchestration['refined_query']
                finder_logger.info(f"[FINDER] Using refined query from orchestration: {refined_query}")
            elif session_data and 'query' in session_data:
                refined_query = session_data['query']
                finder_logger.info(f"[FINDER] Using original user query: {refined_query}")
            else:
                refined_query = orchestration.get('sub_agent_prompt', 'Find relevant profiles')
                finder_logger.info(f"[FINDER] Fallback to sub-agent prompt: {refined_query}")
            
            # Use lead_count from session data with 20% buffer, or fallback to query extraction
            if session_data and 'lead_count' in session_data:
                user_lead_count = session_data['lead_count']
                target_count = int(user_lead_count * 1.2)  # Add 20% buffer
                finder_logger.info(f"[FINDER] Using session lead_count: {user_lead_count} + 20% = {target_count}")
            else:
                original_target = self._extract_target_count_from_query(refined_query)
                target_count = original_target if original_target else search_strategy.get('target_count', 30)
                finder_logger.info(f"[FINDER] Fallback to query extraction: {target_count}")
            
            finder_logger.info(f"[FINDER] Starting Clado deep research API search")
            finder_logger.info(f"[FINDER] ==========================================")
            finder_logger.info(f"[FINDER] EXACT QUERY BEING SENT TO CLADO API:")
            finder_logger.info(f"[FINDER] '{refined_query}'")
            finder_logger.info(f"[FINDER] ==========================================")
            finder_logger.info(f"[FINDER] Target count: {target_count}")
            
            # Initialize Clado integration
            clado_integration = CladoFinderIntegration()
            
            # Run the complete pipeline
            csv_path = clado_integration.run_complete_pipeline(refined_query, target_count)
            
            # Read the generated CSV content
            with open(csv_path, 'r', encoding='utf-8') as f:
                csv_content = f.read()
            
            # Count the results
            csv_lines = csv_content.strip().split('\n')
            total_leads = len(csv_lines) - 1  # Subtract header row
            
            finder_logger.info(f"[FINDER] Clado search completed: {total_leads} total leads found")
            
            return {
                'status': 'completed',
                'total_leads': total_leads,
                'successful_workers': 1,  # Always 1 for Clado API
                'csv_content': csv_content
            }
            
        except Exception as e:
            finder_logger.error(f"[FINDER] Error executing search: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _extract_target_count_from_query(self, query: str) -> Optional[int]:
        """Extract target count from user query"""
        import re
        
        # Look for numbers followed by common keywords
        patterns = [
            r'(\d+)\s+(?:founders?|people|contacts?|leads?|profiles?)',
            r'(?:find|get|search)\s+(?:me\s+)?(\d+)',
            r'(\d+)\s+(?:indian|startup|tech)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                count = int(match.group(1))
                finder_logger.info(f"[FINDER] Extracted target count from query: {count}")
                return count
        
        return None

    def _run_sub_agent(self, worker_id: int, prompt: str, csv_schema: List[Dict], user_email: str, focus_area: str = None) -> Dict[str, Any]:
        """Run a single sub-agent to find 10 leads"""
        
        # Enhanced prompt structure for specialized search
        focus_instruction = f"\n\nSPECIALIZED FOCUS: {focus_area}\nYour specific task is to focus your search efforts on: {focus_area}\nFocus specifically on your assigned area and do not overlap with other sub-agents' focus areas." if focus_area else ""
        
        sub_agent_prompt = f"""
{prompt}{focus_instruction}

Use web search to find exactly 10 leads. Perform comprehensive searches to get real results within your assigned focus area.

CSV Schema (use EXACTLY these column names):
{json.dumps(csv_schema, indent=2)}

IMPORTANT: After conducting your web searches and finding the leads, provide your final response as a JSON object in this format:

{{
    "leads": [
        {{
            "{csv_schema[0]['column']}": "Actual Name Found",
            "{csv_schema[1]['column']}": "actual.email@company.com", 
            "{csv_schema[2]['column']}": "Actual Company Name",
            "{csv_schema[3]['column'] if len(csv_schema) > 3 else 'notes'}": "Actual Title"
        }}
    ],
    "sources_used": ["actual sources used"],
    "confidence_notes": "Notes about data quality and focus area coverage"
}}

End your response with this JSON structure containing the real leads you found through your web searches.
"""

        try:
            focus_info = f" (Focus: {focus_area})" if focus_area else ""
            finder_logger.info(f"[FINDER] Starting sub-agent worker {worker_id}{focus_info}")
            finder_logger.info(f"[FINDER] Worker {worker_id} prompt length: {len(sub_agent_prompt)} chars")
            finder_logger.info(f"[FINDER] Worker {worker_id} full prompt: {sub_agent_prompt}")
            
            # Create a synchronous client for the thread
            sync_client = anthropic.Anthropic()
            
            response = sync_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,  # Increased for web search responses
                timeout=3000,  # 50 minute timeout for deep research
                messages=[
                    {"role": "user", "content": sub_agent_prompt}
                ],
                tools=[{
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 5  # Further reduced for testing
                }]
            )
            
            finder_logger.info(f"[FINDER] Worker {worker_id} got response from Anthropic")
            
            # Extract all text content from response blocks (like the working outreach workflows)
            content = ""
            finder_logger.info(f"[FINDER] Worker {worker_id} processing {len(response.content)} content blocks")
            
            for i, block in enumerate(response.content):
                block_type = getattr(block, 'type', 'unknown')
                finder_logger.info(f"[FINDER] Worker {worker_id} block {i}: type={block_type}")
                
                if block_type == "text":
                    block_text = getattr(block, 'text', '')
                    finder_logger.info(f"[FINDER] Worker {worker_id} text block {i}: {len(block_text)} chars")
                    if len(block_text) > 0:
                        finder_logger.info(f"[FINDER] Worker {worker_id} text preview: {block_text[:200]}...")
                    content += block_text
                elif block_type == "tool_use":
                    tool_name = getattr(block, 'name', 'unknown')
                    finder_logger.info(f"[FINDER] Worker {worker_id} used tool: {tool_name}")
                elif block_type == "tool_result":
                    finder_logger.info(f"[FINDER] Worker {worker_id} got tool result")
                else:
                    finder_logger.info(f"[FINDER] Worker {worker_id} other block type: {block_type}")
            
            content = content.strip()
            finder_logger.info(f"[FINDER] Worker {worker_id} response length: {len(content)} chars")
            finder_logger.info(f"[FINDER] Worker {worker_id} response preview: {content[:500]}...")
            
            # Extract JSON from response - try multiple approaches
            result = None
            
            # First, try to parse the entire content as JSON
            if content.strip().startswith('{') and content.strip().endswith('}'):
                try:
                    result = json.loads(content.strip())
                    finder_logger.info(f"[FINDER] Worker {worker_id} parsed entire response as JSON")
                except json.JSONDecodeError:
                    pass
            
            # If that fails, try to extract JSON using regex
            if not result:
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        json_text = json_match.group()
                        finder_logger.info(f"[FINDER] Worker {worker_id} extracted JSON length: {len(json_text)} chars")
                        result = json.loads(json_text)
                        finder_logger.info(f"[FINDER] Worker {worker_id} parsed JSON from regex match")
                    except json.JSONDecodeError as je:
                        finder_logger.error(f"[FINDER] Worker {worker_id} JSON decode error: {je}")
                        finder_logger.error(f"[FINDER] Worker {worker_id} failed JSON: {json_text[:300]}...")
            
            # If we still don't have a result, try to find JSON lines
            if not result:
                finder_logger.warning(f"[FINDER] Worker {worker_id} trying line-by-line JSON extraction")
                lines = content.split('\n')
                json_lines = []
                
                for line in lines:
                    line = line.strip()
                    if line and (line.startswith('{') or line.startswith('"') or line.startswith('[') or 
                                 line.endswith('}') or line.endswith(',') or line.endswith(']')):
                        json_lines.append(line)
                
                if json_lines:
                    try:
                        combined_json = '\n'.join(json_lines)
                        finder_logger.info(f"[FINDER] Worker {worker_id} combined JSON: {combined_json[:200]}...")
                        result = json.loads(combined_json)
                        finder_logger.info(f"[FINDER] Worker {worker_id} parsed JSON from combined lines")
                    except json.JSONDecodeError as je:
                        finder_logger.error(f"[FINDER] Worker {worker_id} combined JSON decode error: {je}")
            
            # Check if we have a valid result
            if result and isinstance(result, dict):
                leads_count = len(result.get('leads', []))
                finder_logger.info(f"[FINDER] Worker {worker_id} parsed {leads_count} leads")
                
                if leads_count > 0:
                    finder_logger.info(f"[FINDER] Worker {worker_id} first lead sample: {result['leads'][0]}")
                
                return result
            else:
                finder_logger.error(f"[FINDER] Worker {worker_id} returned no valid JSON")
                finder_logger.error(f"[FINDER] Worker {worker_id} full response: {content}")
                return {'leads': []}
                
        except Exception as e:
            finder_logger.error(f"[FINDER] Sub-agent {worker_id} error: {e}")
            import traceback
            finder_logger.error(f"[FINDER] Sub-agent {worker_id} traceback: {traceback.format_exc()}")
            return {'leads': []}

    def _deduplicate_leads(self, leads: List[Dict], csv_schema: List[Dict]) -> List[Dict]:
        """Deduplicate leads using AI to identify similar entries"""
        
        if not leads or len(leads) <= 1:
            return leads
            
        # Simple email-based deduplication first
        seen_emails = set()
        seen_names = set()
        initial_dedup = []
        
        for lead in leads:
            # Check email duplicates
            email = lead.get('email', '').lower().strip()
            if email and email not in seen_emails:
                seen_emails.add(email)
                initial_dedup.append(lead)
                continue
            
            # Check name duplicates for leads without emails
            name = lead.get('full_name', '').lower().strip()
            if not email and name and name not in seen_names:
                seen_names.add(name)
                initial_dedup.append(lead)
                continue
                
        # TODO: Implement AI-based deduplication for more complex cases
        finder_logger.info(f"[FINDER] Deduplicated {len(leads)} leads to {len(initial_dedup)}")
        return initial_dedup

    def _generate_csv(self, leads: List[Dict], csv_schema: List[Dict]) -> str:
        """Generate CSV content from leads and schema"""
        
        if not leads:
            return ""
            
        # Extract column names from schema
        columns = [col['column'] for col in csv_schema]
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=columns)
        
        # Write header
        writer.writeheader()
        
        # Write leads, ensuring all columns exist
        for lead in leads:
            row = {}
            for col in columns:
                row[col] = lead.get(col, '')
            writer.writerow(row)
        
        return output.getvalue()


class FinderService:
    """Service layer for finder functionality"""
    
    def __init__(self):
        self.orchestrator = FinderOrchestrator()
        self.active_sessions = {}  # Store session data
    
    def process_initial_query(self, query: str, user_email: str, lead_count: int = 50) -> Dict[str, Any]:
        """Process the initial user query"""
        import asyncio
        result = asyncio.run(self.orchestrator.process_query(query, user_email))
        
        if result.get('session_id'):
            self.active_sessions[result['session_id']] = {
                'query': query,
                'user_email': user_email,
                'lead_count': lead_count,  # Store the user's requested lead count
                'timestamp': threading.current_thread().ident  # Use thread ID instead of event loop time
            }
            finder_logger.info(f"[FINDER] Created session {result['session_id']} with lead_count: {lead_count}")
        
        return result
    
    def process_clarification_response(self, session_id: str, responses: List[str], skip: bool = False) -> Dict[str, Any]:
        """Process user responses to clarification questions"""
        
        finder_logger.info(f"[FINDER] Processing clarification for session: {session_id}")
        finder_logger.info(f"[FINDER] Active sessions: {list(self.active_sessions.keys())}")
        finder_logger.info(f"[FINDER] Responses: {responses}")
        finder_logger.info(f"[FINDER] Skip flag: {skip}")
        
        if session_id not in self.active_sessions:
            error_msg = f'Session {session_id} not found in active sessions'
            finder_logger.error(f"[FINDER] {error_msg}")
            return {'status': 'error', 'error': error_msg}
        
        session_data = self.active_sessions[session_id]
        finder_logger.info(f"[FINDER] Found session data: {session_data}")
        
        # Use original query if skipping, otherwise enhance with responses
        if skip or not responses or responses == ['skip clarification']:
            query_to_use = session_data['query']
            finder_logger.info(f"[FINDER] Using original query (skip=True): {query_to_use}")
        else:
            query_to_use = f"{session_data['query']}\n\nAdditional details: {' '.join(responses)}"
            finder_logger.info(f"[FINDER] Enhanced query: {query_to_use}")
        
        # Re-process with query
        try:
            # Skip analysis step since we already have clarification, go straight to orchestration
            finder_logger.info(f"[FINDER] Processing query with orchestrator, skipping analysis")
            
            fake_analysis = {
                "needs_clarification": False,
                "questions": [],
                "analysis": {
                    "target_audience": "clear - proceeding after clarification",
                    "geographic_scope": "clear - proceeding after clarification", 
                    "output_format": "clear - proceeding after clarification",
                    "quantity": "clear - proceeding after clarification",
                    "criteria": "clear - proceeding after clarification"
                }
            }
            
            orchestration = asyncio.run(self.orchestrator._orchestrate_search(query_to_use, fake_analysis))
            
            # Store the full orchestration data in the session for later use
            session_data['orchestration'] = orchestration
            
            result = {
                'status': 'orchestration_complete',
                'csv_schema': orchestration['csv_schema'],
                'search_strategy': orchestration['search_strategy'],
                'session_id': session_id,  # Use the SAME session ID
                'estimated_time': orchestration.get('estimated_time', '2-3 minutes')
            }
            
            finder_logger.info(f"[FINDER] Orchestrator result: {result}")
        except Exception as e:
            finder_logger.error(f"[FINDER] Error in orchestration: {e}")
            import traceback
            finder_logger.error(f"[FINDER] Full traceback: {traceback.format_exc()}")
            return {'status': 'error', 'error': str(e)}
        
        return result
    
    def execute_search(self, session_id: str, orchestration_from_frontend: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the lead search"""
        
        finder_logger.info(f"[FINDER] Execute search called for session: {session_id}")
        finder_logger.info(f"[FINDER] Active sessions: {list(self.active_sessions.keys())}")
        
        if session_id not in self.active_sessions:
            error_msg = f'Session {session_id} not found in active sessions'
            finder_logger.error(f"[FINDER] {error_msg}")
            return {'status': 'error', 'error': error_msg}
        
        session_data = self.active_sessions[session_id]
        finder_logger.info(f"[FINDER] Found session data: {session_data}")
        
        # Use the stored orchestration data which has all required fields
        if 'orchestration' not in session_data:
            error_msg = 'No orchestration data found in session'
            finder_logger.error(f"[FINDER] {error_msg}")
            return {'status': 'error', 'error': error_msg}
        
        orchestration = session_data['orchestration']
        finder_logger.info(f"[FINDER] Using stored orchestration: {list(orchestration.keys())}")
        
        try:
            result = self.orchestrator.execute_search(orchestration, session_data['user_email'], session_data)
            finder_logger.info(f"[FINDER] Orchestrator returned: {result}")
        except Exception as e:
            finder_logger.error(f"[FINDER] Error in orchestrator.execute_search: {e}")
            import traceback
            finder_logger.error(f"[FINDER] Full traceback: {traceback.format_exc()}")
            return {'status': 'error', 'error': str(e)}
        
        # Clean up session after completion
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            finder_logger.info(f"[FINDER] Cleaned up session {session_id}")
        
        return result

# Global service instance
finder_service = FinderService()