"""
PostgreSQL Session Interface for Flask
Provides persistent session storage using PostgreSQL database
"""

import json
import pickle
from datetime import datetime, timedelta
from uuid import uuid4
from flask.sessions import SessionInterface, SessionMixin
from werkzeug.datastructures import CallbackDict
import postgres_db
import logging

logger = logging.getLogger(__name__)

class PostgreSQLSession(CallbackDict, SessionMixin):
    """PostgreSQL-backed session"""
    
    def __init__(self, initial=None, sid=None, new=False):
        def on_update(self):
            self.modified = True
        CallbackDict.__init__(self, initial, on_update)
        self.sid = sid
        self.new = new
        self.modified = False


class PostgreSQLSessionInterface(SessionInterface):
    """Session interface that uses PostgreSQL for storage"""
    
    def __init__(self, key_prefix='westbridge:', permanent=True):
        self.key_prefix = key_prefix
        self.permanent = permanent
    
    def generate_sid(self):
        """Generate a new session ID"""
        return str(uuid4())
    
    def get_storage_key(self, sid):
        """Get the storage key for a session ID"""
        return f"{self.key_prefix}{sid}"
    
    def open_session(self, app, request):
        """Open a session"""
        cookie_name = app.config.get('SESSION_COOKIE_NAME', 'session')
        sid = request.cookies.get(cookie_name)
        if not sid:
            sid = self.generate_sid()
            return PostgreSQLSession(sid=sid, new=True)
        
        # Try to load session from PostgreSQL
        storage_key = self.get_storage_key(sid)
        try:
            session_data = postgres_db.get_session(storage_key)
            if session_data and isinstance(session_data, dict):
                return PostgreSQLSession(session_data, sid=sid)
            elif session_data is not None:
                # Handle case where session_data is not a dict
                logger.warning(f"Invalid session data type for {sid}: {type(session_data)}")
        except Exception as e:
            logger.error(f"Failed to load session {sid}: {e}")
        
        # Session not found, expired, or invalid - create new one
        sid = self.generate_sid()
        return PostgreSQLSession(sid=sid, new=True)
    
    def save_session(self, app, session, response):
        """Save a session"""
        domain = self.get_cookie_domain(app)
        path = self.get_cookie_path(app)
        
        if not session:
            # Empty session, remove it
            if session.modified:
                storage_key = self.get_storage_key(session.sid)
                try:
                    # We don't have a delete_session function, but we can save empty data with short TTL
                    postgres_db.save_session(storage_key, {}, ttl=1)
                except Exception as e:
                    logger.error(f"Failed to delete session {session.sid}: {e}")
                
                cookie_name = app.config.get('SESSION_COOKIE_NAME', 'session')
                response.delete_cookie(
                    cookie_name,
                    domain=domain,
                    path=path
                )
            return
        
        # Determine session expiration
        if self.permanent:
            timeout = app.permanent_session_lifetime
        else:
            timeout = timedelta(days=1)  # Default to 1 day for non-permanent sessions
        
        # Save session to PostgreSQL
        if session.modified or session.new:
            storage_key = self.get_storage_key(session.sid)
            try:
                ttl = int(timeout.total_seconds())
                # Convert session to dict for storage
                session_dict = dict(session)
                
                success = postgres_db.save_session(storage_key, session_dict, ttl=ttl)
                
                if success:
                    # Set cookie only if save was successful
                    cookie_name = app.config.get('SESSION_COOKIE_NAME', 'session')
                    httponly = self.get_cookie_httponly(app)
                    secure = self.get_cookie_secure(app)
                    samesite = self.get_cookie_samesite(app)
                    expires = datetime.utcnow() + timeout
                    
                    response.set_cookie(
                        cookie_name,
                        session.sid,
                        expires=expires,
                        httponly=httponly,
                        secure=secure,
                        samesite=samesite,
                        domain=domain,
                        path=path
                    )
                    
                    logger.debug(f"Saved session {session.sid} with TTL {ttl}s")
                else:
                    logger.error(f"PostgreSQL session save returned False for {session.sid}")
                
            except Exception as e:
                logger.error(f"Failed to save session {session.sid}: {e}")
                # In case of database error, don't set cookie to avoid inconsistent state