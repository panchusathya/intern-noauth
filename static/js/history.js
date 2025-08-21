// History Dashboard JavaScript
let projects = [];
let currentProjectFilter = 'all';
let currentTypeFilter = 'all';
let currentStatusFilter = 'all';
let historyData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Auth disabled; skip auth status check
    loadProjects();
    loadHistory();
    setupDropdownFunctionality();
    setupFilterHandlers();
});

// Setup filter handlers
function setupFilterHandlers() {
    const projectFilter = document.getElementById('projectFilter');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('historyPageSearch');
    
    if (projectFilter) {
        projectFilter.addEventListener('change', function() {
            currentProjectFilter = this.value;
            filterAndDisplayHistory();
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            currentTypeFilter = this.value;
            filterAndDisplayHistory();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatusFilter = this.value;
            filterAndDisplayHistory();
        });
    }
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterAndDisplayHistory();
        });
        
        // Clear search on Escape key
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterAndDisplayHistory();
            }
        });
    }
}

// Load projects for filter dropdown
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (response.ok) {
            projects = await response.json();
            populateProjectFilter();
        }
    } catch (error) {
        console.error('Failed to load projects:', error);
    }
}

// Populate project filter dropdown
function populateProjectFilter() {
    const projectFilter = document.getElementById('projectFilter');
    if (!projectFilter) return;
    
    // Clear existing options except "All Projects"
    projectFilter.innerHTML = '<option value="all">All Projects</option>';
    
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.project_id;
        option.textContent = project.name;
        projectFilter.appendChild(option);
    });
}

// Load history data
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        if (response.ok) {
            const data = await response.json();
            historyData = data.history || [];
            filterAndDisplayHistory();
        } else if (response.status === 401) {
            // Auth disabled; treat as empty history
            historyData = [];
            filterAndDisplayHistory();
        } else {
            showError('Failed to load history data');
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        showError('Error loading history data');
    }
}

// Filter and display history
function filterAndDisplayHistory() {
    const searchTerm = document.getElementById('historyPageSearch')?.value.toLowerCase() || '';
    let filteredHistory = historyData;
    
    // Apply search filter
    if (searchTerm) {
        filteredHistory = filteredHistory.filter(item => {
            const taskData = item.task_data || {};
            const searchableText = [
                item.outreach_type || '',
                taskData.company_name || '',
                taskData.url || '',
                taskData.investor_name || '',
                taskData.fund_name || '',
                taskData.person_name || '',
                taskData.organization || '',
                taskData.sector || '',
                item.status || ''
            ].join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    }
    
    // Apply other filters
    if (currentProjectFilter !== 'all') {
        filteredHistory = filteredHistory.filter(item => item.project_id == currentProjectFilter);
    }
    
    if (currentTypeFilter !== 'all') {
        filteredHistory = filteredHistory.filter(item => item.outreach_type === currentTypeFilter);
    }
    
    if (currentStatusFilter !== 'all') {
        filteredHistory = filteredHistory.filter(item => item.status === currentStatusFilter);
    }
    
    displayHistory(filteredHistory);
}

// Display history items
function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <div class="empty-icon">
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                </div>
                <p>No history items found</p>
                <small>Try adjusting your filters or create a new generation</small>
            </div>
        `;
        return;
    }
    
    const historyHtml = history.map(item => {
        const createdAt = new Date(item.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusClass = `status-${item.status.toLowerCase()}`;
        const typeIcon = getTypeIcon(item.outreach_type);
        const project = projects.find(p => p.project_id == item.project_id);
        const projectName = project ? project.name : 'Unknown Project';
        
        // Extract preview info from task_data
        let previewInfo = '';
        if (item.task_data) {
            if (item.outreach_type === 'founder' && item.task_data.url) {
                previewInfo = item.task_data.url;
            } else if (item.outreach_type === 'investor' && item.task_data.investor_name) {
                previewInfo = `${item.task_data.investor_name}`;
                if (item.task_data.fund_name) {
                    previewInfo += ` (${item.task_data.fund_name})`;
                }
            } else if (item.outreach_type === 'any' && item.task_data.person_name) {
                previewInfo = item.task_data.person_name;
                if (item.task_data.organization) {
                    previewInfo += ` at ${item.task_data.organization}`;
                }
            }
        }
        
        // Get status icon like in sidebar
        const statusIcon = {
            'completed': `<svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
            'failed': `<svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>`,
            'in-progress': `<svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`
        }[item.status] || '';

        // Create type tag like in sidebar
        const typeTag = {
            'investor': `<span class="type-tag investor">INV</span>`,
            'any': `<span class="type-tag any">ANY</span>`,
            'founder': `<span class="type-tag founder">FDR</span>`
        }[item.outreach_type] || `<span class="type-tag">UNK</span>`;

        return `
            <div class="history-item ${item.status}" data-task-id="${item.task_id}" onclick="window.location.href='/history/${item.task_id}'" style="cursor: pointer;">
                <div class="history-header">
                    <h3 class="history-company">${previewInfo || 'No preview available'}</h3>
                    <div class="history-tags">
                        ${typeTag}
                        <span class="history-status ${item.status}">${statusIcon} ${item.status.toUpperCase()}</span>
                    </div>
                </div>
                <div class="history-meta">
                    <span>${projectName} • ${createdAt}</span>
                </div>
            </div>
        `;
    }).join('');
    
    historyList.innerHTML = historyHtml;
}

// Get icon for outreach type
function getTypeIcon(type) {
    switch (type) {
        case 'founder':
            return `
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18v18m13.5-18v18m2.25-18v18M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.75m-3.75 3.75h.75m-3.75 3.75h.75m-3.75 3.75H21m-11.25-9h.75m-.75 3h.75m-.75 3h.75" />
                </svg>
            `;
        case 'investor':
            return `
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
            `;
        case 'any':
            return `
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
            `;
        default:
            return `
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
            `;
    }
}

// Authentication check
async function checkAuthStatus() { /* auth disabled */ }

// Update authentication UI
function updateAuthUI(userInfo) {
    const userName = document.getElementById('userName');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userName && userInfo.name) {
        userName.textContent = userInfo.name;
        userDropdown.style.display = 'block';
    }
}

// Handle authentication error
function handleAuthError() { /* no-op while auth disabled */ }

// Setup dropdown functionality
function setupDropdownFunctionality() {
    // Get elements fresh from DOM (like in main.js)
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (userDropdownBtn && userDropdownMenu) {
        userDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            if (userDropdownMenu) {
                userDropdownMenu.classList.remove('active');
            }
        });
        
        // Prevent dropdown from closing when clicking inside
        userDropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// Show error message
function showError(message) {
    const historyList = document.getElementById('historyList');
    if (historyList) {
        historyList.innerHTML = `
            <div class="history-error">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
                <button onclick="loadHistory()" class="btn btn-secondary">Retry</button>
            </div>
        `;
    }
}

// Notification system
// Use the main notification system
function showNotification(message, type = 'info', duration = 5000) {
    // Check if main.js showNotification is available
    if (typeof window.showNotification === 'function') {
        return window.showNotification(message, type, duration);
    }
    
    // Fallback implementation
    // Ensure notification container exists
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Create notification structure
    const icon = document.createElement('div');
    icon.className = 'notification-icon';
    
    const content = document.createElement('div');
    content.className = 'notification-content';
    
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-message';
    messageEl.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close notification');
    
    // Assemble notification
    content.appendChild(messageEl);
    notification.appendChild(icon);
    notification.appendChild(content);
    notification.appendChild(closeBtn);
    
    // Add to container
    container.insertBefore(notification, container.firstChild);
    
    // Close functionality
    const closeNotification = () => {
        notification.style.transform = 'translateX(120%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 400);
    };
    
    closeBtn.addEventListener('click', closeNotification);
    
    // Show animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Auto-hide
    if (duration > 0) {
        setTimeout(closeNotification, duration);
    }
    
    return notification;
}