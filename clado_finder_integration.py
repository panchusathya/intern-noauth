#!/usr/bin/env python3
"""
Clado API Integration for Finder Pipeline
Handles deep research API calls and contact enrichment
"""

import os
import sys
import json
import requests
import time
import csv
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CladoFinderIntegration:
    def __init__(self):
        self.api_key = os.environ.get('CLADO_KEY')
        if not self.api_key:
            raise ValueError("CLADO_KEY environment variable not set")
        
        self.base_url = "https://search.clado.ai"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def initiate_deep_research(self, search_query: str, limit: int = 30) -> Optional[Dict]:
        """
        Initiate a deep research job with Clado API
        
        Args:
            search_query: Succinct 2-3 line prompt from orchestrator
            limit: Maximum number of profiles (default: 30)
        
        Returns:
            Job response with job_id
        """
        url = f"{self.base_url}/api/search/deep_research"
        
        payload = {
            "query": search_query,
            "limit": limit
        }
        
        try:
            logger.info(f"🔍 Initiating deep research")
            logger.info(f"📋 EXACT PROMPT TO CLADO API: '{search_query}'")
            logger.info(f"🎯 Target limit: {limit}")
            logger.info(f"🌐 API endpoint: {url}")
            logger.info(f"📦 Full payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"✅ Deep research job initiated: {result.get('job_id')}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Deep research API error: {e}")
            return None
    
    def check_job_status(self, job_id: str) -> Optional[Dict]:
        """
        Check the status of a deep research job
        
        Args:
            job_id: The job ID returned from initiate_deep_research
        
        Returns:
            Job status and results if completed
        """
        # Try multiple possible endpoints
        possible_endpoints = [
            f"{self.base_url}/api/search/deep_research/{job_id}",
            f"{self.base_url}/api/search/deep_research/status/{job_id}",
            f"{self.base_url}/api/jobs/{job_id}",
            f"{self.base_url}/api/search/results/{job_id}"
        ]
        
        for endpoint in possible_endpoints:
            try:
                response = requests.get(endpoint, headers=self.headers)
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"📊 Job status: {result.get('status', 'unknown')}")
                    return result
            except requests.exceptions.RequestException:
                continue
        
        logger.warning(f"⚠️  Could not check status for job {job_id}")
        return None
    
    def wait_for_completion(self, job_id: str, max_wait_time: int = 3000, check_interval: int = 10) -> Optional[Dict]:
        """
        Wait for job completion with polling
        
        Args:
            job_id: Job ID to monitor
            max_wait_time: Maximum wait time in seconds
            check_interval: Check interval in seconds
        
        Returns:
            Completed job results or None if timeout/error
        """
        start_time = time.time()
        
        logger.info(f"⏱️  Waiting for job {job_id} to complete (max: {max_wait_time}s)")
        
        while time.time() - start_time < max_wait_time:
            result = self.check_job_status(job_id)
            
            if result:
                status = result.get('status', '').lower()
                
                if status in ['completed', 'finished', 'done', 'success']:
                    logger.info(f"🎉 Job completed! Found {result.get('final_results_count', 0)} profiles")
                    return result
                
                elif status in ['failed', 'error']:
                    logger.error(f"❌ Job failed: {result.get('message', 'Unknown error')}")
                    return None
                
                elif status in ['pending', 'running', 'processing']:
                    elapsed = int(time.time() - start_time)
                    logger.info(f"⏳ Still {status}... (elapsed: {elapsed}s)")
            
            time.sleep(check_interval)
        
        logger.warning(f"⏰ Timeout reached ({max_wait_time}s). Job may still be processing.")
        return None
    
    def get_contact_info(self, linkedin_url: str) -> Optional[Dict]:
        """
        Get contact information for a LinkedIn profile
        
        Args:
            linkedin_url: LinkedIn profile URL
        
        Returns:
            Contact information (emails, phones)
        """
        url = f"{self.base_url}/api/enrich/contacts"
        
        params = {
            "linkedin_url": linkedin_url
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️  Contact enrichment failed for {linkedin_url}: {e}")
            return None
    
    def extract_profile_data(self, profile_result: Dict) -> Dict:
        """
        Extract relevant data from a profile result
        
        Args:
            profile_result: Single profile from deep research results
        
        Returns:
            Extracted profile data with name, title, company
        """
        profile = profile_result.get('profile', {})
        
        # Log structure for debugging
        logger.info(f"📋 Profile structure keys: {list(profile_result.keys())}")
        
        # Extract basic info
        name = profile.get('name', 'Unknown')
        title = profile.get('title', profile.get('headline', 'Unknown'))
        linkedin_url = profile.get('linkedin_profile_url', profile.get('linkedin_url', ''))
        
        # Extract latest company from experience (experience is at root level, not inside profile)
        company = 'Unknown'
        experience = profile_result.get('experience', [])  # Fixed: get from profile_result, not profile
        
        logger.info(f"🏢 Extracting company for {name}: found {len(experience)} experience entries")
        
        if experience:
            # Find current position or most recent
            current_job = None
            most_recent_job = None
            
            for exp in experience:
                if exp.get('is_current'):
                    current_job = exp
                    break
                
                # Track most recent by start_date
                if not most_recent_job:
                    most_recent_job = exp
                else:
                    current_start = exp.get('start_date', '')
                    recent_start = most_recent_job.get('start_date', '')
                    if current_start > recent_start:
                        most_recent_job = exp
            
            # Use current job if available, otherwise most recent
            latest_job = current_job or most_recent_job
            if latest_job:
                company = latest_job.get('employer_name', 'Unknown')
                logger.info(f"✅ Found company for {name}: {company} (current: {latest_job.get('is_current', False)})")
            else:
                logger.warning(f"⚠️  No suitable job found for {name}")
        else:
            logger.warning(f"⚠️  No experience data found for {name}")
        
        return {
            'name': name,
            'title': title,
            'company': company,
            'linkedin_url': linkedin_url,
            'email': None  # Will be filled by contact enrichment
        }
    
    def enrich_with_contacts(self, profiles: List[Dict]) -> List[Dict]:
        """
        Enrich profiles with contact information
        
        Args:
            profiles: List of profile dictionaries
        
        Returns:
            Profiles enriched with email addresses
        """
        enriched_profiles = []
        
        for i, profile in enumerate(profiles, 1):
            logger.info(f"📧 Enriching contact {i}/{len(profiles)}: {profile['name']}")
            
            # Get contact info
            contact_info = self.get_contact_info(profile['linkedin_url'])
            
            # Extract best email
            email = None
            if contact_info and contact_info.get('data'):
                for contact_data in contact_info['data']:
                    if contact_data.get('error') == False:  # Only process if no error
                        contacts = contact_data.get('contacts', [])
                        # Filter for email contacts only
                        email_contacts = [c for c in contacts if c.get('type') == 'email']
                        
                        if email_contacts:
                            # Sort by rating (higher is better) and prefer work emails
                            email_contacts.sort(key=lambda x: (
                                x.get('rating', 0),
                                1 if x.get('subType') == 'work' else 0
                            ), reverse=True)
                            email = email_contacts[0]['value']
                            logger.info(f"✅ Found email: {email} (rating: {email_contacts[0].get('rating', 'N/A')})")
                            break
                
                if not email:
                    logger.warning(f"⚠️  No email found for {profile['name']}")
            
            profile['email'] = email or 'Not found'
            enriched_profiles.append(profile)
            
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        
        return enriched_profiles
    
    def save_to_csv(self, profiles: List[Dict], filename: str = None) -> str:
        """
        Save profiles to CSV
        
        Args:
            profiles: List of profile dictionaries
            filename: Optional filename, auto-generated if None
        
        Returns:
            Path to saved CSV file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"clado_finder_results_{timestamp}.csv"
        
        # Ensure results directory exists
        os.makedirs('finder_results', exist_ok=True)
        filepath = os.path.join('finder_results', filename)
        
        # Write CSV with fixed columns
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['name', 'title', 'company', 'email'])
            writer.writeheader()
            
            for profile in profiles:
                writer.writerow({
                    'name': profile['name'],
                    'title': profile['title'],
                    'company': profile['company'],
                    'email': profile['email']
                })
        
        logger.info(f"✅ Results saved to: {filepath}")
        return filepath
    
    def run_complete_pipeline(self, search_query: str, limit: int = 30) -> str:
        """
        Run the complete finder pipeline with Clado integration
        
        Args:
            search_query: Search query from orchestrator
            limit: Maximum number of profiles
        
        Returns:
            Path to CSV file with results
        """
        logger.info("🚀 Starting Clado Finder Pipeline")
        
        # Step 1: Initiate deep research
        job_response = self.initiate_deep_research(search_query, limit)
        if not job_response:
            raise Exception("Failed to initiate deep research job")
        
        job_id = job_response['job_id']
        
        # Step 2: Wait for completion
        results = self.wait_for_completion(job_id)
        if not results:
            raise Exception("Deep research job failed or timed out")
        
        # Step 3: Extract profile data
        profiles = []
        if results.get('results'):
            for profile_result in results['results']:
                profile_data = self.extract_profile_data(profile_result)
                profiles.append(profile_data)
        
        logger.info(f"📋 Extracted {len(profiles)} profiles")
        
        # Step 4: Enrich with contact information
        enriched_profiles = self.enrich_with_contacts(profiles)
        
        # Step 5: Save to CSV
        csv_path = self.save_to_csv(enriched_profiles)
        
        logger.info(f"🎉 Pipeline completed! Results: {csv_path}")
        return csv_path

def main():
    """CLI interface for testing"""
    if len(sys.argv) < 2:
        print("Usage: python clado_finder_integration.py '<search_query>' [limit]")
        print("Example: python clado_finder_integration.py 'Find 30 CISOs in Bay Area tech startups' 30")
        sys.exit(1)
    
    search_query = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    
    try:
        integration = CladoFinderIntegration()
        csv_path = integration.run_complete_pipeline(search_query, limit)
        print(f"\n✅ Success! Results saved to: {csv_path}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()