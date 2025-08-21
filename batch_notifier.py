#!/usr/bin/env python3
"""
Batch Notification Scheduler
Runs as a scheduled task to send notifications for completed batch jobs.
"""

import os
import sys
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

# Import our modules
import postgres_db
from app import send_batch_completion_notification

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [BATCH_NOTIFIER] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def process_batch_notifications():
    """Main function to process pending batch notifications"""
    try:
        logger.info("Starting batch notification check...")
        
        # Get completed batches that haven't been notified
        pending_batches = postgres_db.get_completed_batches_for_notification()
        
        if not pending_batches:
            logger.info("No pending batch notifications found")
            return
        
        logger.info(f"Found {len(pending_batches)} batches pending notification")
        
        # Process each batch
        for batch_data in pending_batches:
            batch_id = batch_data['batch_id']
            user_email = batch_data['user_id']
            
            try:
                logger.info(f"Processing notification for batch {batch_id} (user: {user_email})")
                
                # Send notification email
                success, message = send_batch_completion_notification(batch_data)
                
                if success:
                    logger.info(f"✅ Notification sent successfully for batch {batch_id}")
                    # Mark as sent
                    postgres_db.mark_batch_notification_sent(batch_id, success=True)
                else:
                    logger.error(f"❌ Failed to send notification for batch {batch_id}: {message}")
                    # Mark as failed with error message
                    postgres_db.mark_batch_notification_sent(batch_id, success=False, error_message=message)
                    
                # Small delay between notifications to avoid rate limiting
                time.sleep(2)
                
            except Exception as e:
                error_msg = f"Error processing batch {batch_id}: {str(e)}"
                logger.error(error_msg)
                postgres_db.mark_batch_notification_sent(batch_id, success=False, error_message=error_msg)
                continue
        
        logger.info("Batch notification processing completed")
        
    except Exception as e:
        logger.error(f"Error in batch notification process: {str(e)}")
        raise

def health_check():
    """Simple health check to verify the system is working"""
    try:
        # Test database connection
        postgres_db.get_connection()
        logger.info("✅ Database connection: OK")
        
        # Test that we can import required modules
        from app import send_graph_email
        logger.info("✅ App imports: OK")
        
        return True
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return False

def main():
    """Main entry point"""
    logger.info("=" * 50)
    logger.info("Batch Notification Scheduler Starting")
    logger.info(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    logger.info("=" * 50)
    
    try:
        # Run health check
        if not health_check():
            logger.error("Health check failed, exiting")
            sys.exit(1)
        
        # Process notifications
        process_batch_notifications()
        
        logger.info("Batch notification run completed successfully")
        
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error in batch notifier: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()