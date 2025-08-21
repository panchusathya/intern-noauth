"""
Prompts for Westbridge Capital Outreach Tool
All prompt strings used across the application
"""

import postgres_db

def get_user_email_examples(user_email: str, template_type: str) -> str:
    """Get user's custom email examples or return default examples"""
    templates = postgres_db.get_user_email_templates(user_email)
    
    # Filter templates by type
    filtered_templates = [t for t in templates if t.get('type') == template_type]
    
    if not filtered_templates:
        # Return default examples based on type
        if template_type == 'founder':
            return DEFAULT_FOUNDER_EXAMPLES
        elif template_type == 'investor':
            return DEFAULT_INVESTOR_EXAMPLES
        else:
            return DEFAULT_GENERAL_EXAMPLES
    
    # Build custom examples from user templates
    examples = []
    for template in filtered_templates[:3]:  # Use up to 3 examples
        # For founder templates, use plain email format to match default examples
        if template_type == 'founder':
            examples.append(template['email_content'])
        else:
            # For investor and general templates, include the company name
            examples.append(f"Example email to {template['company_name']}:\n{template['email_content']}")
    
    return "\n\n".join(examples)

# Default examples for each type
DEFAULT_FOUNDER_EXAMPLES = """Hello Name,
We have been looking into the data and healthcare startup space and have developed deep conviction in Nimblemind. Attached is our work.
 
We are big investors in Turing and Innovaccer and know very intimately AI and data and the struggles that come with both. Would love to chat this week or next to see how we can help.
 
Best,
Achal Singi

Hello Pramod,
 
We have been looking into the AI visuals and productivity tooling space and have developed deep conviction in Napkin, attached is our work.
 
We have a bunch of portfolio companies (Turing, Freshworks, Innovaccer) who are always looking for this kind of tooling. Would love to chat this week or next to see how we can help.
 
Best,
Achal Singi

Hello Hojjat,
 
We have been looking into data streaming infra and have developed deep conviction in Deltastream. Attached is our work.
 
We have invested in and worked very closely with Turing, Innovaccer and know that both of those portfolio companies need better streaming infra. Would love to chat this week or next to see how we can help.
 
Best,
Achal Singi"""

DEFAULT_INVESTOR_EXAMPLES = """Example email to Peter Thiel at Founders Fund:
Dear Peter,

Your contrarian thinking about competition and monopolies deeply resonates with our approach at Westbridge. We've been applying similar principles to identify category-defining companies in emerging markets.

Would love to share how we're seeing unique monopolistic opportunities in India's tech ecosystem that mirror your Zero to One philosophy.

Best regards,
[Your Name]

Example email to Marc Andreessen at a16z:
Hi Marc,

Your recent essay on "software eating the world" in emerging markets caught our attention. At Westbridge, we're seeing this play out uniquely in India with companies like Turing and Innovaccer.

Would appreciate your thoughts on how vertical SaaS is evolving differently in high-growth markets.

Best,
[Your Name]"""

DEFAULT_GENERAL_EXAMPLES = """Example outreach email:
Dear [Name],

I came across your recent work on [specific topic] and was impressed by [specific achievement or insight].

At Westbridge Capital, we've been exploring similar themes through our portfolio companies. I'd love to share some insights and learn from your perspective.

Would you be open to a brief conversation next week?

Best regards,
[Your Name]"""

def get_email_system_prompt(user_email: str = None) -> str:
    """Get email system prompt with user's custom examples or defaults"""
    examples = get_user_email_examples(user_email, 'founder') if user_email else DEFAULT_FOUNDER_EXAMPLES
    
    return f"""You are writing a professional outreach email from Westbridge Capital to a startup's CEO. 
Based on the website content provided, create a compelling email that:

1. Shows genuine understanding of their business and recent developments
2. Highlights specific areas where Westbridge could add value
3. References the attached presentation for more details
4. Maintains a professional yet personable tone
5. Keeps it concise (under 100 words)

Here are some examples and your email should follow this exact structure:
{examples}

The overall idea is that in the first line, we say we have been looking into the space (this is just max 2-3 words on whatever space best encapsulates the company's product) and then say we have developed deep conviction in the company and attached our work. 
Then we say we have a bunch of portfolio companies (Turing, Freshworks, Innovaccer) who are always looking for this kind of tooling (CHOOSE RELEVANT PORTFOLIO COMPANIES OUT OF THESE 3). Would love to chat this week or next to see how we can help.

Make it feel like a thoughtful.
"""

def get_any_outreach_system_prompt(user_email: str = None) -> str:
    """Get any outreach system prompt with user's custom examples or defaults"""
    examples = get_user_email_examples(user_email, 'general') if user_email else DEFAULT_GENERAL_EXAMPLES
    
    return f"""
You are writing a professional outreach email from Westbridge Capital. 
Based on the person, organization, and outreach request provided, create a compelling and personalized email that:

1. Shows genuine understanding of their background and the organization
2. Clearly articulates the purpose of the outreach based on the request
3. Highlights specific areas where Westbridge could add value or collaborate
4. Maintains a professional yet personable tone
5. Uses research and web search to find recent, specific details about the person and organization

CRITICAL: Keep the email EXTREMELY CONCISE - maximum 100 words total. Every word must count.

The email should feel thoughtful and well-researched, not generic. Use web search to find:
- Recent achievements, news, or developments related to the person or organization
- Specific projects, initiatives, or areas of focus
- Any connections to Westbridge's portfolio companies or investment areas
- Recent quotes, articles, or public statements they've made

IMPORTANT: Format your response with TWO parts:
1. SUBJECT LINE: A compelling, personalized subject line (max 50 characters)
2. EMAIL BODY: The full email content

Format your response EXACTLY like this:
SUBJECT: [Your subject line here]

EMAIL:
[Your email content here]

Here are some examples to follow:
{examples}

Structure the email concisely based on the outreach context:
1. Brief, personalized greeting
2. Specific reason for reaching out (based on the request) with one key research detail
3. Clear value proposition or collaboration opportunity
4. Direct call to action
5. Professional closing with "Best regards," followed by the sender's name (which will be provided)

DO NOT OUTPUT ANYTHING OTHER THAN THE SUBJECT AND EMAIL IN THE SPECIFIED FORMAT.
"""

def get_investor_email_system_prompt(user_email: str = None) -> str:
    """Get investor email system prompt with user's custom examples or defaults"""
    examples = get_user_email_examples(user_email, 'investor') if user_email else DEFAULT_INVESTOR_EXAMPLES
    
    return f"""
You are writing a professional outreach email from Westbridge Capital to an investor. 
Based on the investor research insights provided, create a compelling and personalized email that:

1. Shows genuine understanding of their investment focus and recent activities
2. References specific insights from the research to demonstrate thoroughness
3. Clearly articulates why Westbridge is reaching out and the potential collaboration
4. Highlights relevant portfolio companies or investment areas that align with their interests
5. Maintains a professional yet personable tone suitable for investor-to-investor communication
6. Uses additional web search to find recent developments or news about the investor

CRITICAL: Keep the email EXTREMELY CONCISE - maximum 100 words total. Every word must count.

The email should feel like it comes from someone who has done extensive research and sees real synergy potential. Use web search to find:
- Recent fund announcements or portfolio additions
- Speaking engagements, interviews, or podcast appearances
- Articles or blog posts they've written recently
- Industry events they've attended or sponsored
- Any recent quotes or public statements about market trends

IMPORTANT: Format your response with TWO parts:
1. SUBJECT LINE: A compelling, professional subject line (max 50 characters)
2. EMAIL BODY: The full email content

Format your response EXACTLY like this:
SUBJECT: [Your subject line here]

EMAIL:
[Your email content here]

Structure the email professionally but briefly:
1. Personal greeting using their name
2. Brief mention of specific insight that caught your attention (1-2 key points max)
3. Clear collaboration opportunity or value proposition
4. Mention of relevant Westbridge portfolio companies that might interest them
5. Direct call to action for a meeting or call
6. Professional closing with "Best regards," followed by the sender's name (which will be provided)

Here are some examples to follow:
{examples}

Keep the tone respectful and peer-to-peer, as this is investor-to-investor communication.

DO NOT OUTPUT ANYTHING OTHER THAN THE SUBJECT AND EMAIL IN THE SPECIFIED FORMAT.
"""

# Investor research system prompt
INVESTOR_RESEARCH_PROMPT = """
You are researching an investor for personalized outreach. Your goal is to find specific, actionable insights about this person that would be valuable for someone looking to connect with them.

Based on the investor name, fund name, and outreach context provided, conduct comprehensive web searches to gather information about:

1. Recent blog posts or articles they've written
2. Companies they've invested in (especially recent ones)
3. Quotes or statements they've made about investing
4. Specific sectors or themes they're passionate about
5. Speaking engagements or podcast appearances
6. Educational background and career highlights
7. Personal interests or causes they support
8. Investment philosophy and what they look for in startups
9. Recent fund activity or notable deals
10. Any specific expertise or domain knowledge they're known for

Generate exactly 10-12 bullet points (1-2 sentences each) that provide specific, actionable insights someone could use for personalized outreach. Focus on recent and specific information rather than generic facts.

Format your response as a simple bulleted list with one insight per line, starting each line with "• ".

DO NOT include any introduction, conclusion, or other text - just the bullet points.
"""

# Batch processing prompts
def get_batch_founder_prompt(company, email, sector):
    """Get prompt for batch founder outreach"""
    return f"""
                Research the company "{company}" and generate a founder outreach email. 
                
                The email should be sent to: {email}
                Sector focus: {sector}
                
                Research the company's:
                1. Business model and key products/services
                2. Recent news, funding, or major updates
                3. Market position and competitive advantages
                4. Key pain points or challenges they might face
                5. Growth opportunities where Westbridge could help
                
                Then generate a personalized email from Westbridge Capital that:
                - Shows we understand their business
                - Highlights relevant expertise or portfolio companies
                - Suggests concrete ways we could add value
                - Includes a clear call to action
                
                Format the response as JSON with:
                {{"research": "company research summary", "email": "generated email content"}}
                """

def get_batch_investor_prompt(company, email):
    """Get prompt for batch investor outreach"""
    return f"""
                Research the investor associated with "{company}" and email "{email}".
                
                Find information about this investor including:
                1. Recent investments and portfolio companies
                2. Investment thesis and focus areas
                3. Blog posts or public statements about investing
                4. Speaking engagements or media appearances
                5. Educational background and career highlights
                
                Generate 10-12 specific, actionable insights that could be used for personalized outreach.
                
                Format as JSON: {{"insights": ["insight 1", "insight 2", ...]}}
                """

def get_batch_any_prompt(company, email):
    """Get prompt for batch any outreach"""
    return f"""
                Research "{company}" and the contact "{email}" for general outreach purposes.
                
                Find relevant information that would be useful for personalized outreach including:
                1. Company background and recent developments
                2. Key personnel and their backgrounds
                3. Industry trends affecting this company
                4. Potential partnership or collaboration opportunities
                5. Recent news or notable achievements
                
                Generate a summary that could be used to craft personalized outreach.
                
                Format as JSON: {{"research": "research summary", "recommendations": ["recommendation 1", "recommendation 2", ...]}}
                """

# Individual prompts for real-time generation
def get_email_generation_prompt(company_url, company_info, sender_name):
    """Get prompt for founder email generation"""
    return f"""
Based on the following information about {company_url}, write a professional outreach email from Westbridge Capital:

Company Information:
{company_info}

Sender Name: {sender_name}

IMPORTANT: End the email with "Best regards," followed by the sender's name ({sender_name}).

DO NOT OUTPUT ANYTHING OTHER THAN THE SUBJECT AND EMAIL IN THE SPECIFIED FORMAT. 
"""

def get_investor_research_prompt(investor_name, fund_name, outreach_context):
    """Get prompt for investor research"""
    return f"""
Research the following investor for personalized outreach:

Investor Name: {investor_name}
Fund Name: {fund_name}
Outreach Context: {outreach_context}

Please find specific insights about this investor that would be valuable for personalized outreach. Make it short. Include DIRECT quotes when possible. Try to find really interesting insights that like even the person will be like "wow, I didn't think they would know that".
"""

def get_investor_email_prompt(investor_name, fund_name, insights, outreach_context, sender_name):
    """Get prompt for investor email generation"""
    return f"""
Generate a personalized outreach email to an investor based on research insights:

Investor Name: {investor_name}
Fund Name: {fund_name}
Outreach Context: {outreach_context}
Sender Name: {sender_name}

Research Insights:
{insights}

Write a highly personalized email that references 1-2 of the most compelling insights from the research. Keep it brief but impactful.

IMPORTANT: End the email with "Best regards," followed by the sender's name ({sender_name}).

DO NOT OUTPUT ANYTHING OTHER THAN THE SUBJECT AND EMAIL IN THE SPECIFIED FORMAT.
"""

def get_any_outreach_email_prompt(person_name, organization, outreach_request, sender_name):
    """Get prompt for any outreach email generation"""
    return f"""
Generate a personalized outreach email for the following:

Person Name: {person_name}
Organization: {organization}
Outreach Request: {outreach_request}
Sender Name: {sender_name}

Use web search to find recent and specific information about this person and organization that would make the email highly personalized and relevant.

IMPORTANT: End the email with "Best regards," followed by the sender's name ({sender_name}).

DO NOT OUTPUT ANYTHING OTHER THAN THE SUBJECT AND EMAIL IN THE SPECIFIED FORMAT.
"""

# Finder orchestration prompts
FINDER_ORCHESTRATION_PROMPT_TEMPLATE = """
You are orchestrating a lead generation search. Based on the user query, design:
1. A CSV schema with appropriate column headers
2. Different specialized search strategies for each sub-agent to divide the work intelligently
3. Search strategy and estimated timeline

User Query: "{user_query}"
Analysis: {analysis}

Design a comprehensive approach where each sub-agent has a different specialized focus:

CSV Schema:
- EXACTLY 4 columns maximum - choose the most essential fields
- Focus on core information: name, email, company, title/role
- Do not include confidence/source columns to save space
- Keep it simple and focused

Work Division Strategy:
Based on the query context, divide the search work among sub-agents by different criteria such as:
- Geographic regions (e.g., East Coast vs West Coast vs International)
- Company sizes (e.g., startups vs mid-market vs enterprise)
- Industry sectors (e.g., fintech vs healthtech vs enterprise software)
- Funding stages (e.g., seed vs series A vs growth stage)
- Company types (e.g., B2B vs B2C vs marketplace)
- Other relevant segmentation based on the specific query

Each sub-agent should get a unique search focus that collectively covers the full scope of the request.

Response format (MUST be valid JSON):
{{
    "csv_schema": [
        {{"column": "full_name", "description": "Full name of the lead"}},
        {{"column": "email", "description": "Contact email address"}},
        {{"column": "company", "description": "Company name"}},
        {{"column": "title", "description": "Job title or role"}}
    ],
    "work_division_strategies": [
        {{"focus": "Geographic region or sector 1", "prompt": "Specialized prompt for this sub-agent..."}},
        {{"focus": "Geographic region or sector 2", "prompt": "Specialized prompt for this sub-agent..."}},
        {{"focus": "Geographic region or sector 3", "prompt": "Specialized prompt for this sub-agent..."}},
        {{"focus": "Geographic region or sector 4", "prompt": "Specialized prompt for this sub-agent..."}},
        {{"focus": "Geographic region or sector 5", "prompt": "Specialized prompt for this sub-agent..."}}
    ],
    "search_strategy": {{
        "target_count": 100,
        "parallel_workers": 5,
        "searches_per_worker": 15,
        "leads_per_worker": 10
    }},
    "estimated_time": "2-3 minutes"
}}
"""

def get_finder_specialized_prompt(focus_area, base_search_criteria, csv_schema):
    """Generate a specialized prompt for a sub-agent with specific focus area"""
    return f"""
{base_search_criteria}

SPECIALIZED FOCUS: {focus_area}

Your specific task is to focus your search efforts on: {focus_area}

Use web search to find exactly 10 leads that match this specialized focus. Perform comprehensive searches to get real results within your assigned focus area.

CSV Schema (use EXACTLY these column names):
{csv_schema}

IMPORTANT: After conducting your web searches and finding the leads, provide your final response as a JSON object in this format:

{{
    "leads": [
        {{
            "{csv_schema[0]['column'] if csv_schema else 'full_name'}": "Actual Name Found",
            "{csv_schema[1]['column'] if len(csv_schema) > 1 else 'email'}": "actual.email@company.com", 
            "{csv_schema[2]['column'] if len(csv_schema) > 2 else 'company'}": "Actual Company Name",
            "{csv_schema[3]['column'] if len(csv_schema) > 3 else 'title'}": "Actual Title"
        }}
    ],
    "sources_used": ["actual sources used"],
    "confidence_notes": "Notes about data quality and focus area coverage"
}}

Focus specifically on your assigned area: {focus_area}. Do not overlap with other sub-agents' focus areas.

End your response with this JSON structure containing the real leads you found through your web searches.
"""