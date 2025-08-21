// Analytics Dashboard JavaScript
let projects = [];
let currentProjectFilter = 'all';
let currentTimeFilter = '30';

document.addEventListener('DOMContentLoaded', function() {
    // Auth disabled; skip auth status check
    loadProjects();
    loadAnalyticsData();
    loadBatchJobs();
    setupDropdownFunctionality();
    setupFilterHandlers();
});

// Setup filter handlers
function setupFilterHandlers() {
    const projectFilter = document.getElementById('projectFilter');
    const timeFilter = document.getElementById('timeFilter');
    
    if (projectFilter) {
        projectFilter.addEventListener('change', function() {
            currentProjectFilter = this.value;
            loadAnalyticsData();
        });
    }
    
    if (timeFilter) {
        timeFilter.addEventListener('change', function() {
            currentTimeFilter = this.value;
            loadAnalyticsData();
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
    
    // Add project options
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = `${project.name} (${project.task_count || 0})`;
        projectFilter.appendChild(option);
    });
}

// Authentication check
async function checkAuthStatus() { /* auth disabled */ }

// Update user dropdown with user info
function updateUserDropdown(authData) {
    const userName = document.getElementById('userName');
    const userAvatar = document.querySelector('.user-avatar');
    
    if (userName && authData.user_name) {
        userName.textContent = authData.user_name;
    }
    
    if (userAvatar) {
        userAvatar.textContent = '';
    }
}

// Setup dropdown functionality
function setupDropdownFunctionality() {
    const dropdownBtn = document.getElementById('userDropdownBtn');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    
    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('active');
        });
        
        // Prevent dropdown from closing when clicking inside
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// Load analytics data
async function loadAnalyticsData() {
    try {
        const params = new URLSearchParams();
        if (currentProjectFilter !== 'all') {
            params.append('project_id', currentProjectFilter);
        }
        if (currentTimeFilter !== 'all') {
            params.append('days', currentTimeFilter);
        }
        
        const response = await fetch(`/api/analytics?${params.toString()}`);
        if (response.ok) {
            const data = await response.json();
            console.log('Analytics API response:', data);
            updateAnalytics(data);
        } else {
            console.error('Analytics API response not ok:', response.status, response.statusText);
            throw new Error('Failed to fetch analytics');
        }
    } catch (error) {
        console.error('Failed to load analytics data:', error);
        showNotification('Failed to load analytics data', 'error');
        
        // Show default values on error
        updateAnalytics({
            total_campaigns: 0,
            outreach_types: {},
            projects: {},
            recent_tasks: []
        });
    }
}

// Update analytics with data
function updateAnalytics(data) {
    // Extract data from the new API format
    const totalCampaigns = data.total_campaigns || 0;
    const outreachTypes = data.outreach_types || {};
    const recentTasks = data.recent_tasks || [];
    const projectsData = data.projects || {};
    
    // Get counts by outreach type
    const founderCount = outreachTypes.founder || 0;
    const investorCount = outreachTypes.investor || 0;
    const anyCount = outreachTypes.any || 0;
    
    // Update UI
    animateCounter('totalCampaigns', totalCampaigns);
    animateCounter('founderCount', founderCount);
    animateCounter('investorCount', investorCount);
    animateCounter('anyCount', anyCount);
    
    // Update project breakdown
    updateProjectStats(projectsData);
    
    // Update weekly chart
    updateWeeklyChart(recentTasks);
    
    // Update recent activity with new format
    updateRecentActivity(recentTasks.slice(0, 8)); // Show last 8 items
}

// Animate counter
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let currentValue = 0;
    const increment = targetValue / 30; // 30 frames
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.floor(currentValue);
    }, 50);
}

// Animate percentage
function animatePercentage(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let currentValue = 0;
    const increment = targetValue / 30; // 30 frames
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.floor(currentValue) + '%';
    }, 50);
}

// Update recent activity list
function updateRecentActivity(recentTasks) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (recentTasks.length === 0) {
        activityList.innerHTML = `
            <div class="activity-empty">
                <p>No recent activity</p>
            </div>
        `;
        return;
    }
    
    const activityHTML = recentTasks.map(task => {
        const statusIcon = '●'; // Simple bullet for status
        
        const typeIcon = {
            'founder': `<svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
            </svg>`,
            'investor': `<svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>`,
            'any': `<svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h18" />
            </svg>`
        }[task.outreach_type] || `<svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
        </svg>`;
        
        const displayName = getDisplayNameFromTask(task);
        const timeAgo = getTimeAgo(new Date(task.created_at));
        const projectName = task.project_name || 'General';
        
        return `
            <div class="activity-item">
                <div class="activity-icon">${typeIcon}</div>
                <div class="activity-content">
                    <div class="activity-title">${displayName}</div>
                    <div class="activity-meta">${task.outreach_type} • ${projectName} • ${timeAgo}</div>
                </div>
                <div class="activity-status completed">
                    ${statusIcon}
                </div>
            </div>
        `;
    }).join('');
    
    activityList.innerHTML = activityHTML;
}

// Helper functions
function getDisplayName(item) {
    if (item.outreachType === 'investor' && item.investorName) {
        return item.investorName;
    } else if (item.outreachType === 'any' && item.personName) {
        return item.personName;
    } else if (item.url) {
        return extractCompanyName(item.url);
    }
    return 'Unknown';
}

function getDisplayNameFromTask(task) {
    if (task.outreach_type === 'investor' && task.investor_name) {
        return task.investor_name;
    } else if (task.outreach_type === 'any' && task.person_name) {
        return task.person_name;
    } else if (task.company_name) {
        return task.company_name;
    }
    return 'Unknown';
}

function extractCompanyName(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '').split('.')[0].toUpperCase();
    } catch (e) {
        return 'Unknown Company';
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

// Export data function
function exportData() {
    showNotification('Export feature coming soon!', 'info');
}

// Notification system
// Update project stats section
function updateProjectStats(projectsData) {
    const projectStats = document.getElementById('projectStats');
    if (!projectStats) return;
    
    // Clear existing content
    projectStats.innerHTML = '';
    
    if (!projectsData || Object.keys(projectsData).length === 0) {
        projectStats.innerHTML = `
            <div class="project-item">
                <div class="project-info">
                    <div class="project-color" style="background: #4FD1C5;"></div>
                    <span class="project-name">General</span>
                </div>
                <div class="project-count">0</div>
            </div>
        `;
        return;
    }
    
    // Project colors
    const projectColors = ['#4FD1C5', '#FC8181', '#F687B3', '#9F7AEA', '#FBD38D', '#68D391', '#63B3ED'];
    let colorIndex = 0;
    
    // Create project stats items
    Object.entries(projectsData).forEach(([projectName, count]) => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        
        const color = projectColors[colorIndex % projectColors.length];
        colorIndex++;
        
        projectItem.innerHTML = `
            <div class="project-info">
                <div class="project-color" style="background: ${color};"></div>
                <span class="project-name">${projectName}</span>
            </div>
            <div class="project-count">${count}</div>
        `;
        
        projectStats.appendChild(projectItem);
    });
}

// Update weekly chart with histogram
function updateWeeklyChart(recentTasks) {
    console.log('updateWeeklyChart called with:', recentTasks);
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) {
        console.error('weeklyChart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.weeklyChart) {
        window.weeklyChart.destroy();
    }
    
    // Get last 7 days
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date);
    }
    
    // Group tasks by date and project
    const tasksByDay = {};
    const projectColors = {
        'General': '#4FD1C5',
        'Default': '#FC8181'
    };
    let colorIndex = 2;
    const additionalColors = ['#F687B3', '#9F7AEA', '#FBD38D', '#68D391', '#63B3ED'];
    
    // Initialize days
    last7Days.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        tasksByDay[dateKey] = {};
    });
    
    // Process tasks
    recentTasks.forEach(task => {
        const taskDate = new Date(task.created_at);
        const dateKey = taskDate.toISOString().split('T')[0];
        const projectName = task.project_name || 'General';
        
        if (tasksByDay[dateKey]) {
            if (!tasksByDay[dateKey][projectName]) {
                tasksByDay[dateKey][projectName] = 0;
                
                // Assign color if new project
                if (!projectColors[projectName]) {
                    projectColors[projectName] = additionalColors[colorIndex % additionalColors.length];
                    colorIndex++;
                }
            }
            tasksByDay[dateKey][projectName]++;
        }
    });
    
    // Get all unique projects
    const allProjects = new Set();
    Object.values(tasksByDay).forEach(dayData => {
        Object.keys(dayData).forEach(project => allProjects.add(project));
    });
    
    console.log('All projects found:', Array.from(allProjects));
    console.log('Tasks by day structure:', tasksByDay);
    
    // Prepare datasets
    let datasets;
    if (allProjects.size === 0) {
        // Show empty chart with placeholder
        datasets = [{
            label: 'No Activity',
            data: last7Days.map(() => 0),
            backgroundColor: '#E2E8F0',
            borderColor: '#E2E8F0',
            borderWidth: 1
        }];
    } else {
        datasets = Array.from(allProjects).map(project => ({
            label: project,
            data: last7Days.map(date => {
                const dateKey = date.toISOString().split('T')[0];
                return tasksByDay[dateKey][project] || 0;
            }),
            backgroundColor: projectColors[project] || '#4FD1C5',
            borderColor: projectColors[project] || '#4FD1C5',
            borderWidth: 1
        }));
    }
    
    // Create chart
    const ctx = canvas.getContext('2d');
    window.weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(date => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return days[date.getDay()];
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: var(--space-16);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-weight: var(--weight-semibold);
        z-index: 1000;
        transform: translateX(100%);
        transition: var(--transition-base);
        max-width: 400px;
        box-shadow: var(--shadow-subtle);
        background: var(--bg-deeper);
        border: var(--border-thin) solid var(--cyan-blue);
    `;
    
    if (type === 'error') {
        notification.style.borderColor = 'var(--coral-pink)';
        notification.style.color = 'var(--coral-pink)';
    } else if (type === 'success') {
        notification.style.borderColor = 'var(--mint-green)';
        notification.style.color = 'var(--mint-green)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Load batch jobs
async function loadBatchJobs() {
    try {
        const response = await fetch('/api/batch/jobs');
        if (response.ok) {
            const data = await response.json();
            displayBatchJobs(data.batch_jobs);
        } else if (response.status === 401) {
            handleAuthError();
        }
    } catch (error) {
        console.error('Failed to load batch jobs:', error);
    }
}

// Display batch jobs
function displayBatchJobs(batchJobs) {
    const batchJobsList = document.getElementById('batchJobsList');
    if (!batchJobsList) return;
    
    if (batchJobs.length === 0) {
        batchJobsList.innerHTML = '<div class="batch-jobs-empty"><p>No batch jobs yet</p></div>';
        return;
    }
    
    const jobsHtml = batchJobs.map(job => {
        const progressPercentage = job.total_rows > 0 ? (job.completed_rows / job.total_rows) * 100 : 0;
        const statusClass = `status-${job.status.toLowerCase()}`;
        const createdAt = new Date(job.created_at).toLocaleString();
        const completedAt = job.completed_at ? new Date(job.completed_at).toLocaleString() : null;
        
        return `
            <div class="batch-job-item">
                <div class="batch-job-header">
                    <div class="batch-job-info">
                        <h4 class="batch-job-title">${job.batch_type.charAt(0).toUpperCase() + job.batch_type.slice(1)} Batch</h4>
                        <span class="status-badge ${statusClass}">${job.status}</span>
                    </div>
                    <div class="batch-job-actions">
                        ${job.status === 'completed' ? 
                            `<button onclick="viewBatchResults('${job.batch_id}')" class="btn btn-small btn-primary">View Results</button>` : 
                            ''}
                    </div>
                </div>
                
                <div class="batch-job-details">
                    <div class="detail-row">
                        <span class="detail-label">Progress:</span>
                        <span class="detail-value">${job.completed_rows}/${job.total_rows} rows</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${createdAt}</span>
                    </div>
                    ${completedAt ? `
                        <div class="detail-row">
                            <span class="detail-label">Completed:</span>
                            <span class="detail-value">${completedAt}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="batch-progress">
                    <div class="batch-progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
    
    batchJobsList.innerHTML = jobsHtml;
}

// View batch results
async function viewBatchResults(batchId) {
    try {
        const response = await fetch(`/api/batch/results/${batchId}`);
        if (response.ok) {
            const data = await response.json();
            showBatchResultsModal(data);
        } else if (response.status === 401) {
            handleAuthError();
        } else {
            const errorData = await response.json();
            showNotification(errorData.error || 'Failed to load batch results', 'error');
        }
    } catch (error) {
        console.error('Failed to load batch results:', error);
        showNotification('Error loading batch results', 'error');
    }
}

// Show batch results modal
function showBatchResultsModal(data) {
    // Create modal HTML
    const modalHtml = `
        <div class="modal-overlay" id="batchResultsModal">
            <div class="modal modal-large">
                <div class="modal-header">
                    <h3 class="modal-title">Batch Results - ${data.batch_type.charAt(0).toUpperCase() + data.batch_type.slice(1)}</h3>
                    <button class="modal-close" onclick="closeBatchResultsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="batch-results-summary">
                        <div class="summary-item">
                            <strong>Total Rows:</strong> ${data.total_rows}
                        </div>
                        <div class="summary-item">
                            <strong>Completed:</strong> ${data.completed_rows}
                        </div>
                        <div class="summary-item">
                            <strong>Completion Rate:</strong> ${((data.completed_rows / data.total_rows) * 100).toFixed(1)}%
                        </div>
                    </div>
                    
                    <div class="batch-results-list">
                        ${data.results.map((result, index) => `
                            <div class="result-item">
                                <div class="result-header">
                                    <h5>Row ${index + 1}</h5>
                                    <button class="btn btn-small" onclick="copyResultToClipboard('${result.custom_id}')">Copy</button>
                                </div>
                                <div class="result-content">
                                    <pre id="result-${result.custom_id}">${JSON.stringify(result.result, null, 2)}</pre>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeBatchResultsModal()">Close</button>
                    <button class="btn btn-primary" onclick="generatePPTFromBatch('${data.batch_id}')">Generate PPTs</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Close batch results modal
function closeBatchResultsModal() {
    const modal = document.getElementById('batchResultsModal');
    if (modal) {
        modal.remove();
    }
}

// Copy result to clipboard
async function copyResultToClipboard(customId) {
    const resultElement = document.getElementById(`result-${customId}`);
    if (resultElement) {
        try {
            await navigator.clipboard.writeText(resultElement.textContent);
            showNotification('Result copied to clipboard', 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            showNotification('Failed to copy to clipboard', 'error');
        }
    }
}

// Generate PPTs from batch results (placeholder)
function generatePPTFromBatch(batchId) {
    showNotification('PPT generation feature coming soon!', 'info');
    // TODO: Implement PPT generation from batch results
} 