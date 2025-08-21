#!/usr/bin/env python3
"""
Test script for Clado Contact Info API
Run locally to test contact enrichment for a LinkedIn URL
"""

import os
import json
import requests
from datetime import datetime

def test_clado_contact_api():
    """Test the Clado contact enrichment API with a LinkedIn URL"""
    
    # Check for API key
    api_key = os.environ.get('CLADO_KEY')
    if not api_key:
        print("❌ CLADO_KEY environment variable not set")
        print("Please set it with: export CLADO_KEY='your_api_key'")
        return
    
    print("🔑 Clado API key found")
    
    # Get LinkedIn URL from user
    linkedin_url = input("\n📧 Enter LinkedIn profile URL: ").strip()
    
    if not linkedin_url:
        print("❌ No LinkedIn URL provided")
        return
    
    if not linkedin_url.startswith('http'):
        # Add https if missing
        linkedin_url = f"https://linkedin.com/in/{linkedin_url}" if not linkedin_url.startswith('linkedin.com') else f"https://{linkedin_url}"
    
    print(f"🔍 Testing contact enrichment for: {linkedin_url}")
    
    # API setup
    base_url = "https://search.clado.ai"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    url = f"{base_url}/api/enrich/contacts"
    params = {
        "linkedin_url": linkedin_url
    }
    
    print(f"🌐 API endpoint: {url}")
    print(f"📦 Parameters: {params}")
    
    try:
        print("\n⏳ Making API request...")
        response = requests.get(url, headers=headers, params=params, timeout=30)
        
        print(f"📊 Response status: {response.status_code}")
        print(f"📋 Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API call successful!")
            
            # Save to JSON file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"clado_contact_result_{timestamp}.json"
            
            # Pretty print the result
            print("\n📄 API Response:")
            print("=" * 50)
            print(json.dumps(result, indent=2))
            print("=" * 50)
            
            # Save to file
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "linkedin_url": linkedin_url,
                    "api_response": result
                }, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Results saved to: {filename}")
            
            # Extract and display contact info if available
            if result.get('data'):
                print("\n📧 Extracted Contact Information:")
                for i, contact_data in enumerate(result['data']):
                    print(f"\n--- Contact Set {i+1} ---")
                    emails = contact_data.get('emails', [])
                    phones = contact_data.get('phones', [])
                    
                    if emails:
                        print("📧 Emails found:")
                        for email in emails:
                            print(f"  • {email.get('email')} (confidence: {email.get('confidence', 'N/A')}, type: {email.get('type', 'N/A')})")
                    else:
                        print("📧 No emails found")
                    
                    if phones:
                        print("📞 Phones found:")
                        for phone in phones:
                            print(f"  • {phone.get('phone')} (confidence: {phone.get('confidence', 'N/A')}, type: {phone.get('type', 'N/A')})")
                    else:
                        print("📞 No phones found")
            else:
                print("\n⚠️  No contact data found in response")
        
        else:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"📄 Response body: {response.text}")
            
            # Save error response too
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"clado_contact_error_{timestamp}.json"
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "linkedin_url": linkedin_url,
                    "status_code": response.status_code,
                    "error_response": response.text,
                    "headers": dict(response.headers)
                }, f, indent=2, ensure_ascii=False)
            
            print(f"💾 Error details saved to: {filename}")
    
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 30 seconds")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        print(f"📄 Raw response: {response.text}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def main():
    print("🚀 Clado Contact Info API Tester")
    print("=" * 40)
    
    test_clado_contact_api()
    
    print("\n✨ Test completed!")

if __name__ == "__main__":
    main()