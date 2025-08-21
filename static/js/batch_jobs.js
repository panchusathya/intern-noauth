// Batch Jobs Management JavaScript
let currentPage = 1;
let batchJobs = [];
let filteredJobs = [];
const jobsPerPage = 10;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    loadBatchJobs();
    setupEventListeners();
    
    // Auto-refresh every 30 seconds
    setInterval(loadBatchJobs, 30000);
});

function initializePage() {
    // Initialize user dropdown
    initializeUserDropdown();
    
    // Set initial filter values
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('typeFilter').value = 'all';
}

function setupEventListeners() {
    // Filter change listeners
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
}

function initializeUserDropdown() {
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (userDropdownBtn && userDropdownMenu) {
        userDropdownBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            userDropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userDropdownBtn.contains(e.target)) {
                userDropdownMenu.classList.remove('show');
            }
        });
    }
}

async function loadBatchJobs() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/batch/list');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            batchJobs = data.batch_jobs || [];
            applyFilters();
            updateSummaryCards();
        } else {
            throw new Error(data.error || 'Failed to load batch jobs');
        }
    } catch (error) {
        console.error('Error loading batch jobs:', error);
        showError('Failed to load batch jobs. Please try again.');
    } finally {
        showLoading(false);
    }
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    filteredJobs = batchJobs.filter(job => {
        const statusMatch = statusFilter === 'all' || job.status === statusFilter;
        const typeMatch = typeFilter === 'all' || job.batch_type === typeFilter;
        return statusMatch && typeMatch;
    });
    
    currentPage = 1;
    renderBatchJobs();
}

function renderBatchJobs() {
    const container = document.getElementById('batchJobsList');
    
    if (filteredJobs.length === 0) {
        container.innerHTML = `
            <div class="batch-jobs-empty">
                <div class="empty-icon">
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                </div>
                <h4>No batch jobs found</h4>
                <p>No jobs match your current filters</p>
                <button onclick="clearFilters()" class="empty-action-btn">Clear Filters</button>
            </div>
        `;
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    const currentJobs = filteredJobs.slice(startIndex, endIndex);
    
    // Render jobs
    const jobsHTML = currentJobs.map(job => renderBatchJobCard(job)).join('');
    container.innerHTML = jobsHTML;
    
    // Update pagination
    updatePagination();
}

function renderBatchJobCard(job) {
    const statusClass = getStatusClass(job.status);
    const typeLabel = getTypeLabel(job.batch_type);
    const createdAt = new Date(job.created_at).toLocaleString();
    const updatedAt = job.updated_at ? new Date(job.updated_at).toLocaleString() : 'N/A';
    
    return `
        <div class="batch-job-card" data-job-id="${job.batch_id}">
            <div class="batch-job-header">
                <div class="batch-job-info">
                    <div class="batch-job-id">Job #${job.batch_id.substring(0, 8)}</div>
                    <div class="batch-job-type">${typeLabel}</div>
                </div>
                <div class="batch-job-status ${statusClass}">
                    <span class="status-dot"></span>
                    ${formatStatus(job.status)}
                </div>
            </div>
            
            <div class="batch-job-details">
                <div class="batch-job-meta">
                    <div class="meta-item">
                        <span class="meta-label">Rows:</span>
                        <span class="meta-value">${job.total_rows || 0}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Sector:</span>
                        <span class="meta-value">${job.sector || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Created:</span>
                        <span class="meta-value">${createdAt}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Updated:</span>
                        <span class="meta-value">${updatedAt}</span>
                    </div>
                </div>
                
                ${job.error_message ? `
                    <div class="batch-job-error">
                        <strong>Error:</strong> ${job.error_message}
                    </div>
                ` : ''}
                
                ${job.anthropic_batch_id ? `
                    <div class="batch-job-anthropic-id">
                        <strong>Anthropic Batch ID:</strong> ${job.anthropic_batch_id}
                    </div>
                ` : ''}
            </div>
            
            <div class="batch-job-actions">
                ${renderJobActions(job)}
            </div>
        </div>
    `;
}

function renderJobActions(job) {
    let actions = [];
    
    if (job.status === 'completed') {
        actions.push(`
            <button onclick="downloadResults('${job.batch_id}')" class="batch-action-btn primary">
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Results
            </button>
        `);
    }
    
    if (job.status === 'failed') {
        actions.push(`
            <button onclick="retryJob('${job.batch_id}')" class="batch-action-btn secondary">
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Retry
            </button>
        `);
    }
    
    actions.push(`
        <button onclick="viewJobDetails('${job.batch_id}')" class="batch-action-btn tertiary">
            <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            View Details
        </button>
    `);
    
    return actions.join('');
}

function updateSummaryCards() {
    const totalJobs = batchJobs.length;
    const pendingJobs = batchJobs.filter(job => ['pending', 'submitted', 'in_progress'].includes(job.status)).length;
    const completedJobs = batchJobs.filter(job => job.status === 'completed').length;
    const failedJobs = batchJobs.filter(job => job.status === 'failed').length;
    
    document.getElementById('totalJobs').textContent = totalJobs;
    document.getElementById('pendingJobs').textContent = pendingJobs;
    document.getElementById('completedJobs').textContent = completedJobs;
    document.getElementById('failedJobs').textContent = failedJobs;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    const paginationContainer = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    const newPage = currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderBatchJobs();
    }
}

function clearFilters() {
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('typeFilter').value = 'all';
    applyFilters();
}

function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'submitted': 'status-submitted',
        'in_progress': 'status-in-progress',
        'completed': 'status-completed',
        'failed': 'status-failed'
    };
    return statusClasses[status] || 'status-unknown';
}

function getTypeLabel(type) {
    const typeLabels = {
        'founder': 'Founder Outreach',
        'investor': 'Investor Research',
        'any': 'General Outreach'
    };
    return typeLabels[type] || type;
}

function formatStatus(status) {
    const statusLabels = {
        'pending': 'Pending',
        'submitted': 'Submitted',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'failed': 'Failed'
    };
    return statusLabels[status] || status;
}

function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px;
        border-radius: 8px;
        z-index: 1000;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}

// Action functions
async function downloadResults(batchId) {
    try {
        const response = await fetch(`/api/batch/${batchId}/results`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch_results_${batchId}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error('Failed to download results');
        }
    } catch (error) {
        console.error('Error downloading results:', error);
        showError('Failed to download results. Please try again.');
    }
}

async function retryJob(batchId) {
    if (!confirm('Are you sure you want to retry this batch job?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/batch/${batchId}/retry`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadBatchJobs(); // Refresh the list
        } else {
            throw new Error('Failed to retry job');
        }
    } catch (error) {
        console.error('Error retrying job:', error);
        showError('Failed to retry job. Please try again.');
    }
}

function viewJobDetails(batchId) {
    // For now, just show an alert with job details
    const job = batchJobs.find(j => j.batch_id === batchId);
    if (job) {
        alert(`Job Details:\n\nID: ${job.batch_id}\nType: ${getTypeLabel(job.batch_type)}\nStatus: ${formatStatus(job.status)}\nRows: ${job.total_rows}\nSector: ${job.sector || 'N/A'}\nCreated: ${new Date(job.created_at).toLocaleString()}\n${job.error_message ? '\nError: ' + job.error_message : ''}`);
    }
}

async function exportBatchData() {
    try {
        const response = await fetch('/api/batch/export');
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch_jobs_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error('Failed to export data');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showError('Failed to export data. Please try again.');
    }
}