"""
PostgreSQL database integration for Wello Internal Tooling
Provides persistent storage using Fly.io managed PostgreSQL
"""

import os
import json
import psycopg2
from psycopg2 import pool, sql
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import sqlite3
from functools import wraps
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# PostgreSQL connection setup
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    logger.warning("DATABASE_URL not found in environment variables")
    logger.info("Available environment variables: " + ", ".join([k for k in os.environ.keys() if 'DATA' in k.upper() or 'POSTGRES' in k.upper() or 'DB' in k.upper()]))
    pg_pool = None
else:
    try:
        # Parse the DATABASE_URL to get connection parameters
        url = urlparse(DATABASE_URL)
        
        # Create connection pool for better connection management
        pg_pool = psycopg2.pool.ThreadedConnectionPool(
            1, 20,  # min and max connections
            host=url.hostname,
            port=url.port,
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5
        )
        
        # Test connection
        conn = pg_pool.getconn()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
            conn.commit()
            logger.info("Successfully connected to PostgreSQL")
            
        finally:
            pg_pool.putconn(conn)
            
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {type(e).__name__}: {e}")
        logger.error(f"DATABASE_URL format: {DATABASE_URL[:50]}...")  # Show first 50 chars
        pg_pool = None

def postgres_required(func):
    """Decorator to ensure PostgreSQL is available"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not pg_pool:
            logger.error(f"PostgreSQL not available for {func.__name__}")
            # Return appropriate empty data structure based on function name
            if 'get_user_tasks' in func.__name__ or 'get_user_projects' in func.__name__:
                return []
            elif 'get_analytics' in func.__name__:
                return {
                    'total_campaigns': 0,
                    'outreach_types': {'founder': 0, 'investor': 0, 'any': 0},
                    'projects': {},
                    'recent_tasks': []
                }
            elif 'health_check' in func.__name__:
                return {
                    'status': 'unhealthy',
                    'connected': False,
                    'error': 'PostgreSQL not available'
                }
            return None
        return func(*args, **kwargs)
    return wrapper

def get_connection():
    """Get a connection from the pool"""
    return pg_pool.getconn()

def return_connection(conn):
    """Return a connection to the pool"""
    pg_pool.putconn(conn)

def init_database_schema():
    """Initialize database tables"""
    if not pg_pool:
        return False
        
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                # Users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id VARCHAR(255) PRIMARY KEY,
                        user_data JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Projects table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS projects (
                        project_id VARCHAR(255) PRIMARY KEY,
                        user_id VARCHAR(255),
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        color VARCHAR(7) DEFAULT '#4FD1C5',
                        project_data JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Tasks table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tasks (
                        task_id VARCHAR(255) PRIMARY KEY,
                        user_id VARCHAR(255),
                        project_id VARCHAR(255) DEFAULT '1',
                        outreach_type VARCHAR(50) DEFAULT 'founder',
                        status VARCHAR(50) DEFAULT 'completed',
                        task_data JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Analytics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS analytics (
                        id SERIAL PRIMARY KEY,
                        user_id VARCHAR(255),
                        date DATE,
                        outreach_type VARCHAR(50),
                        count INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, date, outreach_type)
                    )
                """)
                
                # Sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        session_id VARCHAR(255) PRIMARY KEY,
                        session_data JSONB NOT NULL,
                        expires_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Cache table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS cache (
                        cache_key VARCHAR(255) PRIMARY KEY,
                        cache_value TEXT,
                        expires_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Batch jobs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS batch_jobs (
                        batch_id VARCHAR(255) PRIMARY KEY,
                        user_id VARCHAR(255) NOT NULL,
                        batch_type VARCHAR(50) NOT NULL,
                        sector VARCHAR(50),
                        total_rows INTEGER NOT NULL,
                        completed_rows INTEGER DEFAULT 0,
                        csv_data JSONB NOT NULL,
                        anthropic_batch_id VARCHAR(255),
                        status VARCHAR(50) DEFAULT 'pending',
                        results JSONB,
                        error_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP,
                        notification_sent BOOLEAN DEFAULT FALSE,
                        notification_sent_at TIMESTAMP,
                        notification_error TEXT
                    )
                """)
                
                # User Email Templates table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_email_templates (
                        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                        user_email VARCHAR(255) NOT NULL,
                        template_type VARCHAR(50) NOT NULL,
                        company_name VARCHAR(255) NOT NULL,
                        email_content TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Generated files table for persistent storage
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS generated_files (
                        file_id VARCHAR(255) PRIMARY KEY,
                        user_email VARCHAR(255) NOT NULL,
                        filename VARCHAR(255) NOT NULL,
                        file_type VARCHAR(10) NOT NULL,  -- 'pptx' or 'pdf'
                        file_data BYTEA NOT NULL,
                        company_name VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
                    )
                """)
                
                # Create indexes for better performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_batch_jobs_status_notification ON batch_jobs(status, notification_sent)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_templates_user ON user_email_templates(user_email)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_generated_files_user ON generated_files(user_email)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_generated_files_expires ON generated_files(expires_at)")
                
                # Add notification columns to existing batch_jobs table if they don't exist
                cursor.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_jobs' AND column_name='notification_sent') THEN
                            ALTER TABLE batch_jobs ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_jobs' AND column_name='notification_sent_at') THEN
                            ALTER TABLE batch_jobs ADD COLUMN notification_sent_at TIMESTAMP;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batch_jobs' AND column_name='notification_error') THEN
                            ALTER TABLE batch_jobs ADD COLUMN notification_error TEXT;
                        END IF;
                    END $$
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics(user_id, date)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at)")
                
            conn.commit()
            logger.info("Database schema initialized successfully")
            
            # Initialize default project
            init_default_project()
            
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error initializing database schema: {e}")
        return False

# User Management
@postgres_required
def save_user(user_id: str, user_data: Dict[str, Any]) -> bool:
    """Save user data to PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                user_data['updated_at'] = datetime.utcnow().isoformat()
                
                cursor.execute("""
                    INSERT INTO users (user_id, user_data, updated_at) 
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id) 
                    DO UPDATE SET user_data = %s, updated_at = %s
                """, (user_id, json.dumps(user_data), datetime.utcnow(), 
                     json.dumps(user_data), datetime.utcnow()))
                
            conn.commit()
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error saving user {user_id}: {e}")
        return False

@postgres_required
def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user data from PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT user_data FROM users WHERE user_id = %s", (user_id,))
                result = cursor.fetchone()
                return result['user_data'] if result else None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}")
        return None

# Task Management
@postgres_required
def save_task(task_id: str, task_data: Dict[str, Any]) -> bool:
    """Save task data to PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                user_id = task_data.get('user_id') or task_data.get('founder_email', '').split('@')[0]
                project_id = task_data.get('project_id', '1')
                outreach_type = task_data.get('outreach_type', 'founder')
                status = task_data.get('status', 'completed')
                
                # Add metadata
                task_data['created_at'] = task_data.get('created_at', datetime.utcnow().isoformat())
                task_data['updated_at'] = datetime.utcnow().isoformat()
                
                cursor.execute("""
                    INSERT INTO tasks (task_id, user_id, project_id, outreach_type, status, task_data, updated_at) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (task_id) 
                    DO UPDATE SET 
                        user_id = %s, 
                        project_id = %s, 
                        outreach_type = %s,
                        status = %s,
                        task_data = %s, 
                        updated_at = %s
                """, (task_id, user_id, project_id, outreach_type, status, json.dumps(task_data), datetime.utcnow(),
                     user_id, project_id, outreach_type, status, json.dumps(task_data), datetime.utcnow()))
                
                # Update analytics
                update_analytics(user_id, outreach_type)
                
            conn.commit()
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error saving task {task_id}: {e}")
        return False

@postgres_required
def get_task(task_id: str) -> Optional[Dict[str, Any]]:
    """Get task data from PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT task_data FROM tasks WHERE task_id = %s", (task_id,))
                result = cursor.fetchone()
                return result['task_data'] if result else None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting task {task_id}: {e}")
        return None

@postgres_required  
def get_task_or_batch_by_id(task_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Get a task or batch job by ID for the authenticated user"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # First try to get from tasks table
                cursor.execute("""
                    SELECT t.*, p.name as project_name 
                    FROM tasks t 
                    LEFT JOIN projects p ON t.project_id = p.project_id 
                    WHERE t.task_id = %s AND t.user_id = %s
                """, (task_id, user_id))
                
                result = cursor.fetchone()
                if result:
                    task_data = dict(result['task_data'])
                    task_data['task_id'] = result['task_id']
                    task_data['project_name'] = result['project_name'] or 'General'
                    task_data['project_id'] = result['project_id']
                    task_data['outreach_type'] = result['outreach_type']
                    task_data['status'] = result['status']
                    task_data['created_at'] = result['created_at'].isoformat() if result['created_at'] else None
                    task_data['item_type'] = 'task'
                    return task_data
                
                # If not found in tasks, try batch_jobs table
                cursor.execute("""
                    SELECT batch_id, batch_type, sector, total_rows, completed_rows, 
                           status, created_at, completed_at, csv_data, results
                    FROM batch_jobs 
                    WHERE batch_id = %s AND user_id = %s
                """, (task_id, user_id))
                
                result = cursor.fetchone()
                if result:
                    return {
                        'task_id': result['batch_id'],
                        'project_name': 'General',
                        'project_id': '1',
                        'outreach_type': f"batch_{result['batch_type']}",
                        'status': result['status'],
                        'created_at': result['created_at'].isoformat() if result['created_at'] else None,
                        'item_type': 'batch',
                        'batch_type': result['batch_type'],
                        'sector': result['sector'],
                        'total_rows': result['total_rows'],
                        'completed_rows': result['completed_rows'] or 0,
                        'csv_data': result['csv_data'],
                        'results': result['results'],
                        'completed_at': result['completed_at'].isoformat() if result['completed_at'] else None
                    }
                
                return None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting task or batch {task_id}: {e}")
        return None

@postgres_required
def get_user_tasks(user_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """Get user's tasks and batch jobs sorted by creation time"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get individual tasks
                cursor.execute("""
                    SELECT t.*, p.name as project_name 
                    FROM tasks t 
                    LEFT JOIN projects p ON t.project_id = p.project_id 
                    WHERE t.user_id = %s 
                    ORDER BY t.created_at DESC 
                    LIMIT %s OFFSET %s
                """, (user_id, limit, offset))
                
                task_results = cursor.fetchall()
                all_items = []
                
                # Process individual tasks
                for row in task_results:
                    task_data = dict(row['task_data'])
                    task_data['project_name'] = row['project_name'] or 'General'
                    task_data['task_id'] = row['task_id']
                    task_data['project_id'] = row['project_id']
                    task_data['outreach_type'] = row['outreach_type']
                    task_data['status'] = row['status']
                    task_data['created_at'] = row['created_at'].isoformat() if row['created_at'] else None
                    task_data['item_type'] = 'task'
                    all_items.append(task_data)
                
                # Get batch jobs
                cursor.execute("""
                    SELECT batch_id, batch_type, sector, total_rows, completed_rows, 
                           status, created_at, completed_at, csv_data, results
                    FROM batch_jobs 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT %s
                """, (user_id, limit))
                
                batch_results = cursor.fetchall()
                
                # Process batch jobs
                for row in batch_results:
                    batch_data = {
                        'task_id': row['batch_id'],
                        'project_name': 'General',
                        'project_id': '1',
                        'outreach_type': f"batch_{row['batch_type']}",
                        'status': row['status'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'item_type': 'batch',
                        'batch_type': row['batch_type'],
                        'sector': row['sector'],
                        'total_rows': row['total_rows'],
                        'completed_rows': row['completed_rows'] or 0,
                        'csv_data': row['csv_data'],
                        'results': row['results'],
                        'completed_at': row['completed_at'].isoformat() if row['completed_at'] else None
                    }
                    all_items.append(batch_data)
                
                # Sort all items by created_at
                all_items.sort(key=lambda x: x['created_at'] or '', reverse=True)
                
                return all_items[:limit]
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting user tasks for {user_id}: {e}")
        return []

# Project Management
@postgres_required
def save_project(project_id: str, project_data: Dict[str, Any]) -> bool:
    """Save project data to PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                user_id = project_data.get('user_id', 'system')
                name = project_data.get('name', 'Unnamed Project')
                description = project_data.get('description', '')
                color = project_data.get('color', '#4FD1C5')
                
                cursor.execute("""
                    INSERT INTO projects (project_id, user_id, name, description, color, project_data, updated_at) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (project_id) 
                    DO UPDATE SET 
                        user_id = %s,
                        name = %s, 
                        description = %s, 
                        color = %s,
                        project_data = %s, 
                        updated_at = %s
                """, (project_id, user_id, name, description, color, json.dumps(project_data), datetime.utcnow(),
                     user_id, name, description, color, json.dumps(project_data), datetime.utcnow()))
                
            conn.commit()
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error saving project {project_id}: {e}")
        return False

@postgres_required
def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Get project data from PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT project_id, user_id, name, description, color, project_data, created_at, updated_at
                    FROM projects WHERE project_id = %s
                """, (project_id,))
                result = cursor.fetchone()
                if result:
                    project = dict(result['project_data']) if result['project_data'] else {}
                    project.update({
                        'id': result['project_id'],
                        'user_id': result['user_id'],
                        'name': result['name'],
                        'description': result['description'],
                        'color': result['color'],
                        'created_at': result['created_at'].isoformat() if result['created_at'] else None,
                        'updated_at': result['updated_at'].isoformat() if result['updated_at'] else None
                    })
                    return project
                return None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting project {project_id}: {e}")
        return None

@postgres_required
def get_user_projects(user_id: str) -> List[Dict[str, Any]]:
    """Get user's projects with task counts"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT p.*, COALESCE(task_counts.count, 0) as task_count
                    FROM projects p
                    LEFT JOIN (
                        SELECT project_id, COUNT(*) as count 
                        FROM tasks 
                        WHERE user_id = %s 
                        GROUP BY project_id
                    ) task_counts ON p.project_id = task_counts.project_id
                    WHERE p.user_id = %s OR p.project_id = '1'
                    ORDER BY p.created_at DESC
                """, (user_id, user_id))
                
                results = cursor.fetchall()
                projects = []
                for row in results:
                    project = {
                        'id': row['project_id'],
                        'name': row['name'],
                        'description': row['description'],
                        'color': row['color'],
                        'task_count': row['task_count'],
                        'user_id': row['user_id'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    }
                    projects.append(project)
                return projects
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting user projects for {user_id}: {e}")
        return []

@postgres_required
def delete_project(project_id: str, user_id: str) -> bool:
    """Delete a project and reassign its tasks to the default project"""
    try:
        if project_id == '1':
            return False
            
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                # Reassign tasks to default project
                cursor.execute("""
                    UPDATE tasks SET project_id = '1' 
                    WHERE project_id = %s AND user_id = %s
                """, (project_id, user_id))
                
                # Delete project
                cursor.execute("""
                    DELETE FROM projects WHERE project_id = %s AND user_id = %s
                """, (project_id, user_id))
                
            conn.commit()
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error deleting project {project_id}: {e}")
        return False

# Analytics
@postgres_required
def update_analytics(user_id: str, outreach_type: str):
    """Update analytics data"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                today = datetime.utcnow().date()
                
                cursor.execute("""
                    INSERT INTO analytics (user_id, date, outreach_type, count) 
                    VALUES (%s, %s, %s, 1)
                    ON CONFLICT (user_id, date, outreach_type) 
                    DO UPDATE SET count = analytics.count + 1
                """, (user_id, today, outreach_type))
                
            conn.commit()
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error updating analytics for {user_id}: {e}")

@postgres_required
def get_analytics(user_id: str, days: int = 30, project_id: str = None) -> Dict[str, Any]:
    """Get analytics data for a user"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                end_date = datetime.utcnow().date()
                start_date = end_date - timedelta(days=days)
                
                # Base query conditions
                where_conditions = ["t.user_id = %s", "t.created_at >= %s"]
                params = [user_id, start_date]
                
                if project_id and project_id != 'all':
                    where_conditions.append("t.project_id = %s")
                    params.append(project_id)
                
                where_clause = " AND ".join(where_conditions)
                
                # Get overall stats
                cursor.execute(f"""
                    SELECT 
                        COUNT(*) as total_campaigns,
                        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
                        COUNT(CASE WHEN t.outreach_type = 'founder' THEN 1 END) as founder_count,
                        COUNT(CASE WHEN t.outreach_type = 'investor' THEN 1 END) as investor_count,
                        COUNT(CASE WHEN t.outreach_type = 'any' THEN 1 END) as any_count
                    FROM tasks t
                    WHERE {where_clause}
                """, params)
                
                stats = cursor.fetchone()
                
                # Get project breakdown
                cursor.execute(f"""
                    SELECT p.name, COUNT(t.task_id) as count
                    FROM tasks t
                    LEFT JOIN projects p ON t.project_id = p.project_id
                    WHERE {where_clause}
                    GROUP BY p.name, t.project_id
                    ORDER BY count DESC
                """, params)
                
                project_results = cursor.fetchall()
                projects = {row['name'] or 'General': row['count'] for row in project_results}
                
                # Get recent tasks for activity
                cursor.execute(f"""
                    SELECT t.*, p.name as project_name
                    FROM tasks t
                    LEFT JOIN projects p ON t.project_id = p.project_id
                    WHERE {where_clause}
                    ORDER BY t.created_at DESC
                    LIMIT 50
                """, params)
                
                recent_tasks = []
                for row in cursor.fetchall():
                    task_data = dict(row['task_data']) if row['task_data'] else {}
                    task = {
                        'task_id': row['task_id'],
                        'outreach_type': row['outreach_type'],
                        'project_name': row['project_name'] or 'General',
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'company_name': task_data.get('company_name'),
                        'investor_name': task_data.get('investor_name'),
                        'person_name': task_data.get('person_name'),
                        'status': row['status']
                    }
                    recent_tasks.append(task)
                
                total = stats['total_campaigns'] or 0
                
                return {
                    'total_campaigns': total,
                    'outreach_types': {
                        'founder': stats['founder_count'] or 0,
                        'investor': stats['investor_count'] or 0,
                        'any': stats['any_count'] or 0
                    },
                    'projects': projects,
                    'recent_tasks': recent_tasks
                }
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting analytics for {user_id}: {e}")
        return {
            'total_campaigns': 0,
            'outreach_types': {'founder': 0, 'investor': 0, 'any': 0},
            'projects': {},
            'recent_tasks': []
        }

# Session Management
@postgres_required
def save_session(session_id: str, session_data: Dict[str, Any], ttl: int = None) -> bool:
    """Save session data to PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                expires_at = datetime.utcnow() + timedelta(seconds=ttl or (14 * 24 * 60 * 60))
                
                cursor.execute("""
                    INSERT INTO sessions (session_id, session_data, expires_at) 
                    VALUES (%s, %s, %s)
                    ON CONFLICT (session_id) 
                    DO UPDATE SET session_data = %s, expires_at = %s
                """, (session_id, json.dumps(session_data), expires_at,
                     json.dumps(session_data), expires_at))
                
            conn.commit()
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error saving session {session_id}: {e}")
        return False

@postgres_required
def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get session data from PostgreSQL"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT session_data FROM sessions 
                    WHERE session_id = %s AND expires_at > %s
                """, (session_id, datetime.utcnow()))
                result = cursor.fetchone()
                return result['session_data'] if result else None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting session {session_id}: {e}")
        return None

# Cache Management
@postgres_required
def cache_set(key: str, value: Any, ttl: int = None) -> bool:
    """Set a cache value"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                expires_at = datetime.utcnow() + timedelta(seconds=ttl or 3600)
                cache_value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
                
                cursor.execute("""
                    INSERT INTO cache (cache_key, cache_value, expires_at) 
                    VALUES (%s, %s, %s)
                    ON CONFLICT (cache_key) 
                    DO UPDATE SET cache_value = %s, expires_at = %s
                """, (key, cache_value, expires_at, cache_value, expires_at))
                
            conn.commit()
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error setting cache {key}: {e}")
        return False

@postgres_required
def cache_get(key: str) -> Optional[Any]:
    """Get a cache value"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT cache_value FROM cache 
                    WHERE cache_key = %s AND expires_at > %s
                """, (key, datetime.utcnow()))
                result = cursor.fetchone()
                if result:
                    try:
                        return json.loads(result['cache_value'])
                    except:
                        return result['cache_value']
                return None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting cache {key}: {e}")
        return None

# Migration from SQLite
@postgres_required
def migrate_from_sqlite():
    """Migrate existing data from SQLite to PostgreSQL"""
    try:
        # Connect to SQLite
        conn = sqlite3.connect('task_metadata.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Migrate projects
        logger.info("Migrating projects from SQLite...")
        cursor.execute('SELECT * FROM projects')
        projects = cursor.fetchall()
        
        for project in projects:
            project_data = dict(project)
            project_id = str(project_data.pop('id'))
            save_project(project_id, project_data)
        
        logger.info(f"Migrated {len(projects)} projects")
        
        # Migrate tasks
        logger.info("Migrating tasks from SQLite...")
        cursor.execute('SELECT * FROM task_metadata')
        tasks = cursor.fetchall()
        
        for task in tasks:
            task_data = dict(task)
            task_id = task_data.pop('task_id')
            
            # Extract user from founder_email
            user_id = task_data.get('founder_email', '').split('@')[0] if task_data.get('founder_email') else 'unknown'
            task_data['user_id'] = user_id
            
            save_task(task_id, task_data)
        
        logger.info(f"Migrated {len(tasks)} tasks")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"Error during SQLite migration: {e}")
        return False

# Initialize default project
@postgres_required
def init_default_project():
    """Initialize the default General project"""
    try:
        project = get_project('1')
        if not project:
            save_project('1', {
                'name': 'General',
                'description': 'Default project for uncategorized requests',
                'color': '#4FD1C5',
                'user_id': 'system'
            })
            logger.info("Created default General project")
    except Exception as e:
        logger.error(f"Error initializing default project: {e}")

# Health check
@postgres_required
def health_check() -> Dict[str, Any]:
    """Check PostgreSQL connection and get stats"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Test connection
                cursor.execute("SELECT 1 as test")
                cursor.fetchone()
                
                # Get basic stats
                cursor.execute("SELECT COUNT(*) as total_tasks FROM tasks")
                tasks_count = cursor.fetchone()['total_tasks']
                
                cursor.execute("SELECT COUNT(*) as total_projects FROM projects")
                projects_count = cursor.fetchone()['total_projects']
                
                cursor.execute("SELECT COUNT(*) as total_users FROM users")
                users_count = cursor.fetchone()['total_users']
                
                # Get PostgreSQL version
                cursor.execute("SELECT version()")
                version_info = cursor.fetchone()['version']
                
                return {
                    'status': 'healthy',
                    'connected': True,
                    'version': version_info.split(',')[0] if version_info else 'unknown',
                    'total_keys': tasks_count + projects_count + users_count,
                    'tasks': tasks_count,
                    'projects': projects_count,
                    'users': users_count
                }
        finally:
            return_connection(conn)
    except Exception as e:
        return {
            'status': 'unhealthy',
            'connected': False,
            'error': str(e)
        }

# Batch Jobs Management
@postgres_required
def create_batch_job(batch_id: str, user_email: str, batch_type: str, sector: str, total_rows: int, csv_data: str, status: str = 'pending') -> bool:
    """Create a new batch job record"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO batch_jobs (batch_id, user_id, batch_type, sector, total_rows, csv_data, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (batch_id, user_email, batch_type, sector, total_rows, csv_data, status))
            conn.commit()
            logger.info(f"Created batch job {batch_id} for user {user_email}")
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error creating batch job: {e}")
        return False

@postgres_required
def get_batch_job(batch_id: str, user_email: str) -> Optional[Dict[str, Any]]:
    """Get a specific batch job by ID for the authenticated user"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT * FROM batch_jobs 
                    WHERE batch_id = %s AND user_id = %s
                """, (batch_id, user_email))
                result = cursor.fetchone()
                return dict(result) if result else None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting batch job: {e}")
        return None

@postgres_required
def get_user_batch_jobs(user_email: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all batch jobs for a specific user"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT batch_id, batch_type, sector, total_rows, completed_rows, 
                           status, created_at, completed_at
                    FROM batch_jobs 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT %s
                """, (user_email, limit))
                results = cursor.fetchall()
                return [dict(row) for row in results]
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting user batch jobs: {e}")
        return []

@postgres_required
def get_task_by_id(task_id: str, user_email: str) -> Optional[Dict[str, Any]]:
    """Get a specific task by ID for the authenticated user"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT task_id, user_id, project_id, outreach_type, status, task_data, created_at, updated_at
                    FROM tasks 
                    WHERE task_id = %s AND user_id = %s
                """, (task_id, user_email))
                result = cursor.fetchone()
                if result:
                    task_dict = dict(result)
                    # Parse task_data JSON
                    if task_dict.get('task_data'):
                        try:
                            task_dict['task_data'] = json.loads(task_dict['task_data']) if isinstance(task_dict['task_data'], str) else task_dict['task_data']
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse task_data JSON for task {task_id}")
                    return task_dict
                return None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting task by ID: {e}")
        return None

@postgres_required
def update_batch_job_status(batch_id: str, status: str, anthropic_batch_id: str = None, completed_rows: int = None, results: str = None, error_message: str = None) -> bool:
    """Update batch job status and related fields"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                # Build dynamic update query
                update_fields = ["status = %s"]
                params = [status]
                
                if anthropic_batch_id is not None:
                    update_fields.append("anthropic_batch_id = %s")
                    params.append(anthropic_batch_id)
                
                if completed_rows is not None:
                    update_fields.append("completed_rows = %s")
                    params.append(completed_rows)
                
                if results is not None:
                    update_fields.append("results = %s")
                    params.append(results)
                
                if error_message is not None:
                    update_fields.append("error_message = %s")
                    params.append(error_message)
                
                if status in ['completed', 'failed']:
                    update_fields.append("completed_at = CURRENT_TIMESTAMP")
                
                params.append(batch_id)
                
                query = f"""
                    UPDATE batch_jobs 
                    SET {', '.join(update_fields)}
                    WHERE batch_id = %s
                """
                
                cursor.execute(query, params)
                updated = cursor.rowcount > 0
            conn.commit()
            
            if updated:
                logger.info(f"Updated batch job {batch_id} to status {status}")
            return updated
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error updating batch job status: {e}")
        return False

# Cleanup expired entries
@postgres_required
def cleanup_expired():
    """Clean up expired sessions and cache entries"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                now = datetime.utcnow()
                
                # Clean up expired sessions
                cursor.execute("DELETE FROM sessions WHERE expires_at < %s", (now,))
                sessions_cleaned = cursor.rowcount
                
                # Clean up expired cache
                cursor.execute("DELETE FROM cache WHERE expires_at < %s", (now,))
                cache_cleaned = cursor.rowcount
                
                # Clean up expired generated files
                cursor.execute("DELETE FROM generated_files WHERE expires_at < %s", (now,))
                files_cleaned = cursor.rowcount
                
            conn.commit()
            logger.info(f"Cleaned up {sessions_cleaned} expired sessions, {cache_cleaned} expired cache entries, and {files_cleaned} expired files")
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return False

@postgres_required
def get_completed_batches_for_notification() -> List[Dict[str, Any]]:
    """Get completed batch jobs that haven't been notified yet"""
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT batch_id, user_id, batch_type, sector, total_rows, completed_rows, 
                           results, completed_at, created_at
                    FROM batch_jobs 
                    WHERE status = 'completed' 
                    AND notification_sent = FALSE
                    AND completed_at IS NOT NULL
                    ORDER BY completed_at ASC
                """)
                return [dict(row) for row in cursor.fetchall()]
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting batches for notification: {e}")
        return []

@postgres_required
def mark_batch_notification_sent(batch_id: str, success: bool = True, error_message: str = None) -> bool:
    """Mark a batch job as having sent its notification"""
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE batch_jobs 
                    SET notification_sent = %s,
                        notification_sent_at = CURRENT_TIMESTAMP,
                        notification_error = %s
                    WHERE batch_id = %s
                """, (success, error_message, batch_id))
            conn.commit()
            logger.info(f"Marked batch {batch_id} notification as sent: {success}")
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error marking batch notification sent: {e}")
        return False

# Email Template Functions
def get_user_email_templates(user_email: str) -> List[Dict[str, Any]]:
    """Get all email templates for a user"""
    if not pg_pool:
        return []
    
    try:
        conn = get_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT id, template_type, company_name, email_content, created_at, updated_at
                    FROM user_email_templates
                    WHERE user_email = %s
                    ORDER BY updated_at DESC
                """, (user_email,))
                
                templates = cursor.fetchall()
                # Convert to regular dicts and format dates
                result = []
                for template in templates:
                    template_dict = dict(template)
                    template_dict['type'] = template_dict.pop('template_type')
                    if template_dict.get('created_at'):
                        template_dict['created_at'] = template_dict['created_at'].isoformat()
                    if template_dict.get('updated_at'):
                        template_dict['updated_at'] = template_dict['updated_at'].isoformat()
                    result.append(template_dict)
                
                return result
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error getting email templates: {e}")
        return []

def add_email_template(user_email: str, template_type: str, company_name: str, email_content: str) -> Optional[str]:
    """Add a new email template"""
    if not pg_pool:
        return None
    
    try:
        conn = get_connection()
        if not conn:
            return None
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO user_email_templates (user_email, template_type, company_name, email_content)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                """, (user_email, template_type, company_name, email_content))
                
                template_id = cursor.fetchone()[0]
                conn.commit()
                return template_id
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error adding email template: {e}")
        return None

def update_email_template(template_id: str, user_email: str, template_type: str, company_name: str, email_content: str) -> bool:
    """Update an existing email template"""
    if not pg_pool:
        return False
    
    try:
        conn = get_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE user_email_templates
                    SET template_type = %s, company_name = %s, email_content = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s AND user_email = %s
                """, (template_type, company_name, email_content, template_id, user_email))
                
                updated = cursor.rowcount > 0
                conn.commit()
                return updated
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error updating email template: {e}")
        return False

def delete_email_template(template_id: str, user_email: str) -> bool:
    """Delete an email template"""
    if not pg_pool:
        return False
    
    try:
        conn = get_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM user_email_templates
                    WHERE id = %s AND user_email = %s
                """, (template_id, user_email))
                
                deleted = cursor.rowcount > 0
                conn.commit()
                return deleted
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error deleting email template: {e}")
        return False

# Generated Files Functions
def store_generated_file(file_id: str, user_email: str, filename: str, file_type: str, 
                        file_data: bytes, company_name: str = None) -> bool:
    """Store a generated file in the database"""
    if not pg_pool:
        return False
    
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO generated_files (file_id, user_email, filename, file_type, file_data, company_name)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (file_id) 
                    DO UPDATE SET file_data = %s, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
                """, (file_id, user_email, filename, file_type, file_data, company_name, file_data))
                
            conn.commit()
            logger.info(f"Stored generated file {file_id} for user {user_email}")
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error storing generated file: {e}")
        return False

def get_generated_file(file_id: str, user_email: str = None) -> Dict[str, Any]:
    """Retrieve a generated file from the database"""
    if not pg_pool:
        return None
    
    try:
        conn = get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if user_email:
                    cursor.execute("""
                        SELECT file_id, filename, file_type, file_data, company_name, created_at
                        FROM generated_files
                        WHERE file_id = %s AND user_email = %s AND expires_at > CURRENT_TIMESTAMP
                    """, (file_id, user_email))
                else:
                    # Allow access without user_email check for backward compatibility
                    cursor.execute("""
                        SELECT file_id, filename, file_type, file_data, company_name, created_at
                        FROM generated_files
                        WHERE file_id = %s AND expires_at > CURRENT_TIMESTAMP
                    """, (file_id,))
                
                result = cursor.fetchone()
                if result:
                    return dict(result)
                return None
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error retrieving generated file: {e}")
        return None

def cleanup_expired_files():
    """Clean up expired generated files"""
    if not pg_pool:
        return False
    
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM generated_files WHERE expires_at < CURRENT_TIMESTAMP
                """)
                deleted_count = cursor.rowcount
                
            conn.commit()
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} expired generated files")
            return True
        finally:
            return_connection(conn)
    except Exception as e:
        logger.error(f"Error cleaning up expired files: {e}")
        return False

# Initialize on module load
if pg_pool:
    logger.info("PostgreSQL module loaded successfully")
    # Initialize database schema now that all functions are defined
    init_database_schema()
else:
    logger.warning("PostgreSQL module loaded but connection failed")