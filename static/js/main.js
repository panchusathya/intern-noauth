// DOM elements
const form = document.getElementById('convertForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const spinner = submitBtn.querySelector('.spinner');
const urlInput = document.getElementById('url');
const progressSection = document.getElementById('progressSection');
const emailSection = document.getElementById('emailSection');
const resultDiv = document.getElementById('result');
const metricsDiv = document.getElementById('metrics');
const sendEmailBtn = document.getElementById('sendEmailBtn');
const emailBtnText = document.getElementById('emailBtnText');
const emailSpinner = sendEmailBtn.querySelector('.spinner');
const emailContent = document.getElementById('emailContent');
const emailSubject = document.getElementById('emailSubject');
const recipientEmail = document.getElementById('recipientEmail');
const emailResult = document.getElementById('emailResult');
const authBtn = document.getElementById('authBtn');
const userDropdown = document.getElementById('userDropdown');
const userDropdownBtn = document.getElementById('userDropdownBtn');
const userDropdownMenu = document.getElementById('userDropdownMenu');
const userName = document.getElementById('userName');
const historySidebar = document.getElementById('historySidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const historyList = document.getElementById('historyList');
const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');

// Project management elements
const projectList = document.getElementById('projectList');
const createProjectBtn = document.getElementById('createProjectBtn');
const projectModalOverlay = document.getElementById('projectModalOverlay');
const closeProjectModal = document.getElementById('closeProjectModal');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');
const createProjectSubmit = document.getElementById('createProjectSubmit');
const projectForm = document.getElementById('projectForm');
const projectNameInput = document.getElementById('projectNameInput');
const projectDescInput = document.getElementById('projectDescInput');
const projectColorInput = document.getElementById('projectColorInput');
const colorPresets = document.querySelectorAll('.color-preset');

// Outreach type elements
const outreachFounder = document.getElementById('outreach_founder');
const outreachInvestor = document.getElementById('outreach_investor');
const outreachAny = document.getElementById('outreach_any');
const outreachBatch = document.getElementById('outreach_batch');
const sectorGroup = document.getElementById('sector-group');
const founderOptions = document.querySelectorAll('.founder-option');
const investorOptions = document.querySelectorAll('.investor-option');

// Field groups
const founderFields = document.getElementById('founder-fields');
const investorFields = document.getElementById('investor-fields');
const anyFields = document.getElementById('any-fields');
const batchFields = document.getElementById('batch-fields');
const founderEmailGroup = document.getElementById('founder-email-group');
const founderEmailLabel = document.getElementById('founder-email-label');

// Batch processing elements
const csvFileInput = document.getElementById('csv_file');
const csvUploadArea = document.getElementById('csvUploadArea');
const csvPreview = document.getElementById('csvPreview');
const previewTable = document.getElementById('previewTable');
const previewTableBody = document.getElementById('previewTableBody');
const previewSummary = document.getElementById('previewSummary');
const batchTypeGroup = document.getElementById('batch-type-group');

// Investor fields
const investorNameInput = document.getElementById('investor_name');
const fundNameInput = document.getElementById('fund_name');
const outreachContextInput = document.getElementById('outreach_context');
const investorResultSection = document.getElementById('investorResultSection');
const investorInsights = document.getElementById('investorInsights');

// Any outreach fields
const personNameInput = document.getElementById('person_name');
const organizationInput = document.getElementById('organization');
const outreachRequestInput = document.getElementById('outreach_request');

// Global variables
let startTime;
let timerInterval;
let eventSource;
let currentTaskId;
let currentFileId;
let isSignedIn = false;
let generationHistory = [];
let currentFilter = 'all';

// Project management variables
let projects = [];
let currentProjectId = 1; // Default to General project

// Authentication helper function (disabled; never redirect)
function handleAuthError(response) {
    return false;
}

// Outreach type switching functionality
function handleOutreachTypeChange() {
    const selectedType = document.querySelector('input[name="outreach_type"]:checked')?.value;
    
    if (!selectedType) {
        // Hide all sections if no outreach type selected
        if (sectorGroup) sectorGroup.style.display = 'none';
        if (founderFields) founderFields.style.display = 'none';
        if (investorFields) investorFields.style.display = 'none';
        if (anyFields) anyFields.style.display = 'none';
        if (batchFields) batchFields.style.display = 'none';
        if (founderEmailGroup) founderEmailGroup.style.display = 'none';
        if (btnText) btnText.textContent = 'Select Outreach Type';
        return;
    }
    
    // Clear any previously checked sector options
    document.querySelectorAll('input[name="sector"]').forEach(input => {
        input.checked = false;
    });
    
    if (selectedType === 'founder') {
        // Show sector group for founder mode only
        if (sectorGroup) sectorGroup.style.display = 'block';
        // Show founder fields and options
        if (founderFields) founderFields.style.display = 'block';
        if (investorFields) investorFields.style.display = 'none';
        if (anyFields) anyFields.style.display = 'none';
        if (batchFields) batchFields.style.display = 'none';
        if (founderEmailGroup) founderEmailGroup.style.display = 'block';
        
        // Update labels and button text
        founderEmailLabel.textContent = 'Recipient Email Address';
        btnText.textContent = 'Generate Presentation & Email';
        
        // Show founder options, hide investor options
        founderOptions.forEach(option => {
            option.style.display = 'flex';
        });
        investorOptions.forEach(option => {
            option.style.display = 'none';
        });
        
        // Auto-select first founder option (infra)
        const firstFounderOption = document.querySelector('.founder-option input[name="sector"]');
        if (firstFounderOption) {
            firstFounderOption.checked = true;
        }
        
        // Make URL required for founder mode
        urlInput.required = true;
        document.getElementById('recipient_email').required = true;
        
        // Hide investor result section
        investorResultSection.style.display = 'none';
        
    } else if (selectedType === 'investor') {
        // Show investor fields and options
        if (founderFields) founderFields.style.display = 'none';
        if (investorFields) investorFields.style.display = 'block';
        if (anyFields) anyFields.style.display = 'none';
        if (batchFields) batchFields.style.display = 'none';
        if (founderEmailGroup) founderEmailGroup.style.display = 'block';
        
        // Update labels and button text
        founderEmailLabel.textContent = 'Recipient Email Address';
        btnText.textContent = 'Research Investor';
        
        // Hide sector options for investor outreach mode
        sectorGroup.style.display = 'none';
        
        // Make investor fields required
        investorNameInput.required = true;
        fundNameInput.required = true;
        outreachContextInput.required = true;
        document.getElementById('recipient_email').required = true;
        
        // Remove URL requirement for investor mode
        urlInput.required = false;
        
        // Hide regular result section
        resultDiv.innerHTML = '';
        
    } else if (selectedType === 'any') {
        // Show any outreach fields
        if (founderFields) founderFields.style.display = 'none';
        if (investorFields) investorFields.style.display = 'none';
        if (anyFields) anyFields.style.display = 'block';
        if (batchFields) batchFields.style.display = 'none';
        if (founderEmailGroup) founderEmailGroup.style.display = 'block';
        
        // Update labels and button text
        founderEmailLabel.textContent = 'Recipient Email Address';
        btnText.textContent = 'Generate Email';
        
        // Hide sector options for any outreach mode
        sectorGroup.style.display = 'none';
        
        // Make any outreach fields required
        personNameInput.required = true;
        organizationInput.required = true;
        outreachRequestInput.required = true;
        document.getElementById('recipient_email').required = true;
        
        // Remove URL requirement for any outreach mode
        urlInput.required = false;
        
        // Hide result sections
        resultDiv.innerHTML = '';
        investorResultSection.style.display = 'none';
        
    } else if (selectedType === 'batch') {
        // Show batch processing fields
        if (founderFields) founderFields.style.display = 'none';
        if (investorFields) investorFields.style.display = 'none';
        if (anyFields) anyFields.style.display = 'none';
        if (batchFields) batchFields.style.display = 'block';
        if (founderEmailGroup) founderEmailGroup.style.display = 'none';
        
        // Update button text
        btnText.textContent = 'Kick off generation';
        
        // Show sector options for batch processing
        sectorGroup.style.display = 'block';
        
        // Remove requirements from other fields
        urlInput.required = false;
        investorNameInput.required = false;
        fundNameInput.required = false;
        outreachContextInput.required = false;
        personNameInput.required = false;
        organizationInput.required = false;
        outreachRequestInput.required = false;
        
        // Hide result sections
        resultDiv.innerHTML = '';
        investorResultSection.style.display = 'none';
    }
    
    // Reset all generation-related UI state when switching outreach types
    resetGenerationUI();
    
    // Update stage titles based on outreach type
    updateStageLabels(selectedType);
}

// Function to update stage titles based on outreach type
function updateStageLabels(outreachType) {
    const crawlTitle = document.querySelector('#stage-crawl .stage-title');
    const analyzeTitle = document.querySelector('#stage-analyze .stage-title');
    const generateTitle = document.querySelector('#stage-generate .stage-title');
    const emailTitle = document.querySelector('#stage-email .stage-title');
    
    if (outreachType === 'investor') {
        if (crawlTitle) crawlTitle.textContent = 'Research Prep';
        if (analyzeTitle) analyzeTitle.textContent = 'AI Analysis';
        if (generateTitle) generateTitle.textContent = 'Research & Insights';
        if (emailTitle) emailTitle.textContent = 'Email Generation';
    } else if (outreachType === 'any') {
        if (crawlTitle) crawlTitle.textContent = 'Research Prep';
        if (analyzeTitle) analyzeTitle.textContent = 'AI Analysis';
        if (generateTitle) generateTitle.textContent = 'Email Generation';
        if (emailTitle) emailTitle.textContent = 'Finalizing';
    } else {
        // Default to founder outreach labels
        if (crawlTitle) crawlTitle.textContent = 'Web Crawling';
        if (analyzeTitle) analyzeTitle.textContent = 'AI Analysis';
        if (generateTitle) generateTitle.textContent = 'Slide Generation';
        if (emailTitle) emailTitle.textContent = 'Email Generation';
    }
}

// Function to reset all generation-related UI state
function resetGenerationUI() {
    // Hide progress and email sections
    if (progressSection) {
        progressSection.style.display = 'none';
        progressSection.style.opacity = '0';
        progressSection.style.transform = 'translateY(20px)';
    }
    
    if (emailSection) {
        emailSection.style.display = 'none';
        emailSection.style.opacity = '0';
        emailSection.style.transform = 'translateY(20px)';
    }
    
    // Reset all progress stages
    document.querySelectorAll('.stage').forEach(stage => {
        stage.classList.remove('active', 'completed');
        
        // Icons are now handled by CSS classes (active, completed, error)
        
        // Reset stage detail text
        const detail = stage.querySelector('.stage-detail');
        if (detail) {
            detail.textContent = 'Waiting to start...';
        }
    });
    
    // Clear timers
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Close any active SSE connection
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    
    // Reset loading state
    setLoadingState(false);
    
    // Clear email content
    if (emailContent) {
        emailContent.value = '';
    }
    
    if (emailSubject) {
        emailSubject.value = '';
    }
    
    if (recipientEmail) {
        recipientEmail.value = '';
    }
    
    // Reset metrics - DISABLED
    // if (document.getElementById('pagesCount')) {
    //     document.getElementById('pagesCount').textContent = '0';
    // }
    
    // if (document.getElementById('timeElapsed')) {
    //     document.getElementById('timeElapsed').textContent = '0:00';
    // }
    
    // Clear email result
    if (emailResult) {
        emailResult.innerHTML = '';
    }
    
    // Reset current task/file IDs
    currentTaskId = null;
    currentFileId = null;
}

// Note: Scroll animations removed for static layout

// Modern UI enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Add outreach type event listeners
    if (outreachFounder) {
        outreachFounder.addEventListener('change', handleOutreachTypeChange);
    }
    if (outreachInvestor) {
        outreachInvestor.addEventListener('change', handleOutreachTypeChange);
    }
    if (outreachAny) {
        outreachAny.addEventListener('change', handleOutreachTypeChange);
    }
    if (outreachBatch) {
        outreachBatch.addEventListener('change', handleOutreachTypeChange);
    }
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add focus management
    if (urlInput) {
        urlInput.addEventListener('focus', () => {
            urlInput.closest('.form-group').style.transform = 'scale(1.02)';
        });
        
        urlInput.addEventListener('blur', () => {
            urlInput.closest('.form-group').style.transform = 'scale(1)';
        });
    }
    
    // URL validation with better UX
    if (urlInput) {
        urlInput.addEventListener('input', validateUrl);
    }
    
    // History search functionality
    const historySearchInput = document.getElementById('historySearch');
    if (historySearchInput) {
        historySearchInput.addEventListener('input', () => {
            renderHistory();
        });
        
        // Clear search on Escape key
        historySearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                historySearchInput.value = '';
                renderHistory();
            }
        });
    }
    
    // User dropdown functionality - get elements fresh from DOM
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
    
    // Auto-resize textarea
    if (emailContent) {
        emailContent.addEventListener('input', autoResizeTextarea);
    }
    
    // Expert info checkbox functionality
    const expertInfoCheckbox = document.getElementById('has_expert_info');
    const expertInfoGroup = document.getElementById('expert-info-group');
    if (expertInfoCheckbox && expertInfoGroup) {
        expertInfoCheckbox.addEventListener('change', function() {
            if (this.checked) {
                expertInfoGroup.style.display = 'block';
                expertInfoGroup.style.opacity = '0';
                expertInfoGroup.style.transform = 'translateY(-10px)';
                
                // Smooth animation
                setTimeout(() => {
                    expertInfoGroup.style.transition = 'all 0.3s ease';
                    expertInfoGroup.style.opacity = '1';
                    expertInfoGroup.style.transform = 'translateY(0)';
                }, 10);
            } else {
                expertInfoGroup.style.transition = 'all 0.3s ease';
                expertInfoGroup.style.opacity = '0';
                expertInfoGroup.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    expertInfoGroup.style.display = 'none';
                }, 300);
            }
        });
    }
    
    // Auth button functionality
    if (authBtn) {
        authBtn.addEventListener('click', handleAuthAction);
    }
    
    
    // Sidebar functionality
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            updateFilterButtons();
            renderHistory();
        });
    });
    
    // Initialize auth state and history
    checkAuthStatus();
    loadHistory().then(() => {
        renderHistory();
    });
    
    // Also render immediately with any local history
    renderHistory();
    
    // Auto-select founder mode by default
    if (outreachFounder && !document.querySelector('input[name="outreach_type"]:checked')) {
        outreachFounder.checked = true;
        handleOutreachTypeChange();
    }
    
    // Initialize CSV file handling
    initCSVHandling();
});

// CSV File Handling
function initCSVHandling() {
    console.log('Setting up CSV handlers...');
    
    // Handle clicks on the upload area - simpler approach
    const csvUploadArea = document.getElementById('csvUploadArea');
    if (csvUploadArea) {
        csvUploadArea.addEventListener('click', function(e) {
            // Only trigger if not clicking directly on the file input
            if (e.target.id !== 'csv_file') {
                console.log('CSV upload area clicked');
                const csvInput = document.getElementById('csv_file');
                if (csvInput) {
                    console.log('Triggering file input click');
                    csvInput.click();
                }
            }
        });
    }
    
    // File input change handler using event delegation
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'csv_file') {
            console.log('CSV file selected');
            handleCSVFile();
        }
    });
    
    // Drag and drop handlers using event delegation
    document.addEventListener('dragover', function(e) {
        if (e.target.closest('#csvUploadArea')) {
            e.preventDefault();
            e.target.closest('#csvUploadArea').classList.add('dragover');
        }
    });
    
    document.addEventListener('dragleave', function(e) {
        if (e.target.closest('#csvUploadArea')) {
            e.target.closest('#csvUploadArea').classList.remove('dragover');
        }
    });
    
    document.addEventListener('drop', function(e) {
        if (e.target.closest('#csvUploadArea')) {
            e.preventDefault();
            const uploadArea = e.target.closest('#csvUploadArea');
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const csvInput = document.getElementById('csv_file');
                if (csvInput) {
                    csvInput.files = files;
                    handleCSVFile();
                }
            }
        }
    });
}

function handleCSVFile() {
    const csvInput = document.getElementById('csv_file');
    const file = csvInput.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showNotification('Please select a CSV file', 'error');
        return;
    }
    
    if (file.size > 1024 * 1024) { // 1MB limit
        showNotification('File too large. Maximum size is 1MB', 'error'); 
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csvData = parseCSV(e.target.result);
            if (csvData.length > 100) {
                showNotification('CSV file contains too many rows. Maximum is 100 rows', 'error');
                return;
            }
            
            displayCSVPreview(csvData);
            if (batchTypeGroup) {
                batchTypeGroup.style.display = 'block';
            }
        } catch (error) {
            showNotification('Error reading CSV file: ' + error.message, 'error');
        }
    };
    
    reader.onerror = (e) => {
        showNotification('Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const data = [];
    
    // Skip first row (header row)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles basic cases)
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        
        if (columns.length < 2) {
            throw new Error(`Row ${i + 1}: CSV must have at least 2 columns (Company, Email)`);
        }
        
        const [company, email] = columns;
        
        if (!company || !email) {
            throw new Error(`Row ${i + 1}: Both Company and Email are required`);
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailRegex.test(email);
        
        data.push({
            row: i + 1,
            company: company,
            email: email,
            isValid: isValidEmail,
            error: isValidEmail ? null : 'Invalid email format'
        });
    }
    
    return data;
}

function displayCSVPreview(csvData) {
    if (!previewTableBody || !previewSummary) {
        showNotification('Error: Preview elements not found', 'error');
        return;
    }
    
    // Clear existing preview
    previewTableBody.innerHTML = '';
    
    // Populate table
    csvData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.row}</td>
            <td>${row.company}</td>
            <td>${row.email}</td>
            <td>
                <span class="status-badge ${row.isValid ? 'status-valid' : 'status-invalid'}">
                    ${row.isValid ? 'Valid' : 'Invalid'}
                </span>
                ${row.error ? `<br><small>${row.error}</small>` : ''}
            </td>
        `;
        previewTableBody.appendChild(tr);
    });
    
    // Update summary
    const validCount = csvData.filter(row => row.isValid).length;
    const invalidCount = csvData.length - validCount;
    
    previewSummary.innerHTML = `
        <div style="margin-bottom: var(--space-4);">
            <strong>Total Rows:</strong> ${csvData.length} | 
            <strong class="text-success">Valid:</strong> ${validCount} | 
            <strong class="text-error">Invalid:</strong> ${invalidCount}
        </div>
        ${invalidCount > 0 ? '<div style="color: var(--coral-pink); margin-top: var(--space-2);">Invalid entries will be skipped</div>' : ''}
    `;
    
    // Hide the upload area and show preview
    const csvUploadArea = document.getElementById('csvUploadArea');
    if (csvUploadArea) {
        csvUploadArea.style.display = 'none';
    }
    csvPreview.style.display = 'block';
    
    // Store CSV data for later use
    window.currentCSVData = csvData;
    
    // Update main form button text to show valid entries count
    updateMainButtonText(validCount);
}

function updateMainButtonText(validCount) {
    const btnText = document.getElementById('btnText');
    if (btnText && validCount > 0) {
        btnText.textContent = `Proceed with ${validCount} valid entries`;
    }
}

// Check for batch completion notifications
async function checkBatchNotifications() {
    try {
        const response = await fetch('/api/batch/notifications');
        if (response.ok) {
            const data = await response.json();
            if (data.notifications && data.notifications.length > 0) {
                // Show most recent notification
                const latest = data.notifications[0];
                if (latest.type === 'batch_completed') {
                    showNotification(
                        `✅ ${latest.title}: ${latest.message}`, 
                        'success', 
                        8000
                    );
                }
            }
        }
    } catch (error) {
        console.log('Could not check batch notifications:', error);
    }
}

// Start checking for batch notifications periodically
function startBatchNotificationChecking() {
    // Check immediately
    checkBatchNotifications();
    
    // Then check every 2 minutes
    setInterval(checkBatchNotifications, 2 * 60 * 1000);
}

// This function is no longer needed since we handle valid entries directly in the main form submission

// Handle batch processing submission
async function handleBatchSubmission(batchType, validRows, sector) {
    try {
        setLoadingState(true);
        
        // First, upload the CSV data to the server for validation
        const formData = new FormData();
        const csvBlob = new Blob([validRows.map(row => `${row.company},${row.email}`).join('\n')], {
            type: 'text/csv'
        });
        formData.append('csv_file', csvBlob, 'batch_data.csv');
        
        showNotification('Uploading and validating CSV...', 'info');
        
        const uploadResponse = await fetch('/api/batch/upload', {
            method: 'POST',
            body: formData
        });
        
        if (handleAuthError(uploadResponse)) {
            return;
        }
        
        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Failed to upload CSV');
        }
        
        const uploadResult = await uploadResponse.json();
        
        if (uploadResult.has_errors) {
            showNotification('CSV validation failed: ' + uploadResult.errors.join(', '), 'error');
            return;
        }
        
        // Submit the batch job
        console.log(`[BATCH] Submitting batch job: ${batchType}, ${uploadResult.rows.length} rows, sector: ${sector}`);
        showNotification('Submitting batch job...', 'info');
        
        const submitResponse = await fetch('/api/batch/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                batch_type: batchType,
                sector: sector,
                rows: uploadResult.rows
            })
        });
        
        console.log(`[BATCH] Submit response status: ${submitResponse.status}`);
        
        if (handleAuthError(submitResponse)) {
            return;
        }
        
        if (!submitResponse.ok) {
            const errorData = await submitResponse.json();
            throw new Error(errorData.error || 'Failed to submit batch job');
        }
        
        const submitResult = await submitResponse.json();
        console.log(`[BATCH] Submit result:`, submitResult);
        
        // Show success message and batch job details
        showBatchJobResult(submitResult);
        
    } catch (error) {
        console.error('Batch submission error:', error);
        showNotification('Error submitting batch job: ' + error.message, 'error');
    } finally {
        setLoadingState(false);
    }
}

// Display batch job submission result
function showBatchJobResult(result) {
    resultDiv.innerHTML = `
        <div class="batch-result">
            <div class="result-header">
                <h3>Batch Job Submitted Successfully</h3>
                <span class="status-badge status-pending" id="batch-status-badge">Pending</span>
            </div>
            
            <div class="batch-details">
                <div class="detail-item">
                    <strong>Batch ID:</strong> 
                    <code>${result.batch_id}</code>
                </div>
                <div class="detail-item">
                    <strong>Status:</strong> 
                    <span id="batch-status-text">${result.status}</span>
                </div>
                <div class="detail-item">
                    <strong>Message:</strong> ${result.message}
                </div>
                <div class="detail-item">
                    <strong>Created:</strong> ${new Date().toLocaleString()}
                </div>
            </div>
            
            <div class="batch-info">
                <p>✅ <strong>Batch job submitted to Anthropic API successfully!</strong></p>
                <p>🔄 Processing will begin shortly and may take up to 24 hours to complete.</p>
                <p>📊 Real-time status updates will be shown below. You can also check the <a href="/analytics">Analytics page</a>.</p>
            </div>
            
            <div class="batch-status-monitor" id="batch-status-monitor">
                <div class="status-checking">
                    <span class="spinner" style="display: inline-block;"></span>
                    Checking status...
                </div>
            </div>
            
            <div class="batch-actions">
                <button onclick="window.location.href='/analytics'" class="btn btn-primary">
                    View All Batch Jobs
                </button>
                <button onclick="checkBatchStatus('${result.batch_id}')" class="btn btn-secondary">
                    Refresh Status
                </button>
                <button onclick="resetForm()" class="btn btn-secondary">
                    Submit Another Batch
                </button>
            </div>
        </div>
    `;
    
    showNotification('Batch job submitted successfully! Check Analytics page for updates.', 'success');
    
    // Start monitoring batch status
    if (result.batch_id) {
        startBatchStatusMonitoring(result.batch_id);
    }
    
    // Reset form state
    form.reset();
    csvPreview.style.display = 'none';
    batchTypeGroup.style.display = 'none';
    
    // Restore the CSV upload area
    const csvUploadArea = document.getElementById('csvUploadArea');
    if (csvUploadArea) {
        csvUploadArea.style.display = 'block';
    }
    
    window.currentCSVData = null;
}

async function checkBatchStatus(batchId) {
    try {
        const response = await fetch(`/api/batch/status/${batchId}`);
        
        if (!response.ok) {
            throw new Error('Failed to check batch status');
        }
        
        const data = await response.json();
        updateBatchStatusDisplay(data);
        return data;
        
    } catch (error) {
        console.error('Error checking batch status:', error);
        showNotification('Error checking batch status: ' + error.message, 'error');
        return null;
    }
}

function updateBatchStatusDisplay(data) {
    const statusBadge = document.getElementById('batch-status-badge');
    const statusText = document.getElementById('batch-status-text');
    const statusMonitor = document.getElementById('batch-status-monitor');
    
    if (statusBadge) {
        statusBadge.className = `status-badge status-${data.status}`;
        statusBadge.textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);
    }
    
    if (statusText) {
        statusText.textContent = data.status;
    }
    
    if (statusMonitor) {
        const completedRows = data.completed_rows || 0;
        const totalRows = data.total_rows || 0;
        
        statusMonitor.innerHTML = `
            <div class="status-progress">
                <div class="progress-info">
                    <strong>Progress:</strong> ${completedRows}/${totalRows} entries processed
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${totalRows > 0 ? (completedRows / totalRows) * 100 : 0}%"></div>
                </div>
                <div class="status-details">
                    <small>Last updated: ${new Date().toLocaleString()}</small>
                </div>
            </div>
        `;
        
        if (data.status === 'completed') {
            statusMonitor.innerHTML += `
                <div class="completion-message">
                    <p>✅ <strong>Batch processing completed!</strong></p>
                    <p>All ${completedRows} entries have been processed successfully.</p>
                </div>
            `;
        } else if (data.status === 'failed') {
            statusMonitor.innerHTML += `
                <div class="error-message">
                    <p>❌ <strong>Batch processing failed</strong></p>
                    <p>Error: ${data.error_message || 'Unknown error occurred'}</p>
                </div>
            `;
        }
    }
}

function startBatchStatusMonitoring(batchId) {
    console.log(`[BATCH] Starting status monitoring for batch: ${batchId}`);
    
    // Check status immediately
    checkBatchStatus(batchId);
    
    // Set up periodic checking every 30 seconds
    const intervalId = setInterval(async () => {
        console.log(`[BATCH] Checking status for batch: ${batchId}`);
        const status = await checkBatchStatus(batchId);
        
        // Stop monitoring if batch is completed or failed
        if (status && (status.status === 'completed' || status.status === 'failed')) {
            console.log(`[BATCH] Batch ${batchId} is ${status.status}, stopping monitoring`);
            clearInterval(intervalId);
        }
    }, 30000); // Check every 30 seconds
    
    // Stop monitoring after 2 hours maximum
    setTimeout(() => {
        clearInterval(intervalId);
    }, 2 * 60 * 60 * 1000);
}

// Enhanced URL validation
function validateUrl() {
    const url = urlInput.value;
    const isValid = /^https?:\/\/.+\..+/.test(url);
    
    if (url && !isValid) {
        urlInput.style.borderColor = 'var(--error)';
        urlInput.style.boxShadow = '0 0 0 4px var(--error-light)';
    } else {
        urlInput.style.borderColor = '';
        urlInput.style.boxShadow = '';
    }
    
    return isValid;
}

// Auto-resize textarea
function autoResizeTextarea() {
    emailContent.style.height = 'auto';
    emailContent.style.height = Math.max(200, emailContent.scrollHeight) + 'px';
}

// Form submission handler with enhanced UX
console.log('[DEBUG] Setting up form event listener, form element:', form);
console.log('[DEBUG] Submit button element:', submitBtn);

// Add direct click listener to submit button for debugging
if (submitBtn) {
    console.log('[DEBUG] Adding click listener to submit button');
    submitBtn.addEventListener('click', (e) => {
        console.log('[DEBUG] Submit button clicked!');
        console.log('[DEBUG] Button disabled status:', submitBtn.disabled);
        console.log('[DEBUG] Button innerHTML:', submitBtn.innerHTML);
        console.log('[DEBUG] Event target:', e.target);
        console.log('[DEBUG] Form element from button:', submitBtn.form);
        
        // Check if button is actually disabled and why
        if (submitBtn.disabled) {
            console.log('[DEBUG] BUTTON IS DISABLED - this prevents form submission');
            console.log('[DEBUG] Button text content:', btnText.textContent);
            console.log('[DEBUG] Spinner display:', spinner.style.display);
            return; // Don't try to submit if disabled
        }
        
        // Check if there are any form validation errors
        const formValidity = submitBtn.form?.checkValidity();
        console.log('[DEBUG] Form valid?', formValidity);
        
        // Check what outreach type is selected
        const currentOutreachType = document.querySelector('input[name="outreach_type"]:checked');
        console.log('[DEBUG] Current outreach type:', currentOutreachType?.value);
        
        // If form is invalid, let's see what fields are invalid
        if (!formValidity && submitBtn.form) {
            const invalidFields = submitBtn.form.querySelectorAll(':invalid');
            console.log('[DEBUG] Invalid fields:', invalidFields);
            invalidFields.forEach(field => {
                console.log('[DEBUG] Invalid field:', field.name, field.validationMessage);
            });
        }
        
        // Force trigger form submission if everything looks good
        console.log('[DEBUG] Manually triggering form submit event');
        form.dispatchEvent(new Event('submit'));
    });
}

if (form) {
    console.log('[DEBUG] Form found, adding submit event listener');
    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[FORM] Form submitted - event triggered!');
    
    const outreachType = document.querySelector('input[name="outreach_type"]:checked')?.value;
    const sector = document.querySelector('input[name="sector"]:checked')?.value;
    const recipientEmail = document.getElementById('recipient_email').value;
    const ccEmailsInput = document.getElementById('cc_emails');
    const ccEmails = ccEmailsInput ? ccEmailsInput.value.trim() : '';
    
    console.log('[FORM] Outreach type:', outreachType);
    console.log('[FORM] Sector:', sector);
    
    // Validate outreach type
    if (!outreachType) {
        showNotification('Please select an outreach type (Founder or Investor)', 'error');
        return;
    }
    
    // Validate sector (required for founder outreach and batch processing)
    if ((outreachType === 'founder' || outreachType === 'batch') && !sector) {
        showNotification('Please select a sector', 'error');
        return;
    }
    
    // Validate recipient email (not required for batch processing)
    if (outreachType !== 'batch' && (!recipientEmail || !recipientEmail.includes('@'))) {
        showNotification('Please enter a valid recipient email address', 'error');
        return;
    }
    
    // Validate CC emails if provided
    let ccRecipients = [];
    if (ccEmails) {
        ccRecipients = ccEmails.split(',').map(email => email.trim()).filter(email => email);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const ccEmail of ccRecipients) {
            if (!emailRegex.test(ccEmail)) {
                showNotification(`Invalid CC email address: ${ccEmail}`, 'error');
                return;
            }
        }
    }
    
    let requestData = {
        outreach_type: outreachType,
        sector: sector,
        recipient_email: recipientEmail,
        cc_recipients: ccRecipients.length > 0 ? ccRecipients : null,
        project_id: currentProjectId
    };
    
    // Mode-specific validation and data collection
    if (outreachType === 'founder') {
        const url = urlInput.value;
        
        // Validate URL for founder mode
        if (!validateUrl() || !url) {
            showNotification('Please enter a valid URL (e.g., https://example.com)', 'error');
            return;
        }
        
        requestData.url = url;
        
    } else if (outreachType === 'investor') {
        const investorName = investorNameInput.value;
        const fundName = fundNameInput.value;
        const outreachContext = outreachContextInput.value;
        
        // Validate investor fields
        if (!investorName.trim()) {
            showNotification('Please enter the investor name', 'error');
            return;
        }
        
        if (!fundName.trim()) {
            showNotification('Please enter the fund name', 'error');
            return;
        }
        
        if (!outreachContext.trim()) {
            showNotification('Please provide outreach context', 'error');
            return;
        }
        
        requestData.investor_name = investorName;
        requestData.fund_name = fundName;
        requestData.outreach_context = outreachContext;
        
    } else if (outreachType === 'any') {
        const personName = personNameInput.value;
        const organization = organizationInput.value;
        const outreachRequest = outreachRequestInput.value;
        
        // Validate any outreach fields
        if (!personName.trim()) {
            showNotification('Please enter the person name', 'error');
            return;
        }
        
        if (!organization.trim()) {
            showNotification('Please enter the associated organization', 'error');
            return;
        }
        
        if (!outreachRequest.trim()) {
            showNotification('Please provide the outreach request details', 'error');
            return;
        }
        
        requestData.person_name = personName;
        requestData.organization = organization;
        requestData.outreach_request = outreachRequest;
        
    } else if (outreachType === 'batch') {
        console.log('[BATCH] Processing batch submission...');
        
        // Handle batch processing
        if (!window.currentCSVData || window.currentCSVData.length === 0) {
            console.log('[BATCH] No CSV data found');
            showNotification('Please upload and validate a CSV file first', 'error');
            return;
        }
        
        console.log('[BATCH] CSV data found:', window.currentCSVData.length, 'rows');
        
        const batchType = document.querySelector('input[name="batch_type"]:checked')?.value;
        console.log('[BATCH] Batch type selected:', batchType);
        
        if (!batchType) {
            showNotification('Please select a batch processing type', 'error');
            return;
        }
        
        // Validate CSV data
        const validRows = window.currentCSVData.filter(row => row.isValid);
        console.log('[BATCH] Valid rows:', validRows.length);
        
        if (validRows.length === 0) {
            showNotification('No valid rows found in CSV. Please fix the errors first.', 'error');
            return;
        }
        
        console.log('[BATCH] Submitting batch job with sector:', sector);
        
        // Submit batch job
        await handleBatchSubmission(batchType, validRows, sector);
        return;
    }
    
    // Reset UI with smooth animations
    resultDiv.innerHTML = '';
    emailResult.innerHTML = '';
    investorResultSection.style.display = 'none';
    
    // Show progress section with animation
    progressSection.style.display = 'block';
    progressSection.style.opacity = '0';
    progressSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        progressSection.style.transition = 'var(--transition-base)';
        progressSection.style.opacity = '1';
        progressSection.style.transform = 'translateY(0)';
    }, 100);
    
    emailSection.style.display = 'none';
    // metricsDiv.style.display = 'grid'; // Disabled metrics display
    
    // Reset all stages
    document.querySelectorAll('.stage').forEach(s => {
        s.classList.remove('active', 'completed');
    });
    
    // Disable form with loading state
    setLoadingState(true);
    
    // Start timer
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
    
    // Reset metrics - DISABLED
    // document.getElementById('pagesCount').textContent = '0';
    
    try {
        // Start SSE connection for progress updates
        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });
        
        // Check for authentication error
        if (handleAuthError(response)) {
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            currentTaskId = data.task_id;
            
            // Add to history when starting
            addToHistory({
                taskId: currentTaskId,
                url: requestData.url || null,
                investorName: requestData.investor_name || null,
                fundName: requestData.fund_name || null,
                personName: requestData.person_name || null,
                organization: requestData.organization || null,
                recipientEmail: requestData.recipient_email,
                outreachType: requestData.outreach_type,
                sector: requestData.sector,
                status: 'in-progress'
            });
            
            // Connect to progress stream
            eventSource = new EventSource(`/progress/${data.task_id}`);
            
            eventSource.onmessage = (event) => {
                const progress = JSON.parse(event.data);
                updateProgress(progress);
                
                if (progress.status === 'completed') {
                    eventSource.close();
                    clearInterval(timerInterval);
                    updateHistoryStatus(currentTaskId, 'completed', {
                        fileId: progress.file_id,
                        emailContent: progress.email_content,
                        investorInsights: progress.investor_insights
                    });
                    showSuccess(progress);
                } else if (progress.status === 'error') {
                    eventSource.close();
                    clearInterval(timerInterval);
                    updateHistoryStatus(currentTaskId, 'failed');
                    showError(progress.message);
                }
            };
            
            eventSource.onerror = () => {
                eventSource.close();
                clearInterval(timerInterval);
                showError('Lost connection to server');
            };
            
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start generation');
        }
    } catch (error) {
        clearInterval(timerInterval);
        showError(error.message);
    }
});

// Enhanced loading state management
function setLoadingState(isLoading) {
    console.log('[DEBUG] setLoadingState called with:', isLoading);
    console.log('[DEBUG] Stack trace:', new Error().stack);
    
    submitBtn.disabled = isLoading;
    urlInput.disabled = isLoading;
    
    if (isLoading) {
        btnText.textContent = 'Generating...';
        spinner.style.display = 'inline-block';
        submitBtn.style.transform = 'scale(0.98)';
    } else {
        // Reset to appropriate text based on form state
        const outreachType = document.querySelector('input[name="outreach_type"]:checked')?.value;
        if (outreachType === 'batch') {
            // Check if we have valid CSV data to show count
            if (window.currentCSVData) {
                const validCount = window.currentCSVData.filter(row => row.isValid).length;
                if (validCount > 0) {
                    btnText.textContent = `Proceed with ${validCount} valid entries`;
                } else {
                    btnText.textContent = 'Kick off generation';
                }
            } else {
                btnText.textContent = 'Kick off generation';
            }
        } else {
            btnText.textContent = 'Generate Presentation & Email';
        }
        spinner.style.display = 'none';
        submitBtn.style.transform = 'scale(1)';
    }
}
}

// Email send handler with enhanced UX
if (sendEmailBtn) {
    sendEmailBtn.addEventListener('click', async () => {
    const recipient = recipientEmail.value;
    const subject = emailSubject.value;
    const content = emailContent.value;
    const ccEmails = document.getElementById('ccEmails');
    const ccRecipientsValue = ccEmails ? ccEmails.value.trim() : '';
    
    if (!recipient || !subject || !content) {
        showNotification('Please enter recipient email, subject, and email content', 'error');
        return;
    }
    
    // Validate primary email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
        showNotification('Please enter a valid primary recipient email address', 'error');
        return;
    }
    
    // Validate CC emails if provided
    let ccRecipients = [];
    if (ccRecipientsValue) {
        ccRecipients = ccRecipientsValue.split(',').map(email => email.trim()).filter(email => email);
        for (const ccEmail of ccRecipients) {
            if (!emailRegex.test(ccEmail)) {
                showNotification(`Invalid CC email address: ${ccEmail}`, 'error');
                return;
            }
        }
    }
    
    // Disable button with loading state
    setEmailLoadingState(true);
    emailResult.innerHTML = '';
    
    try {
        const response = await fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task_id: currentTaskId,
                file_id: currentFileId,
                recipient: recipient,
                subject: subject,
                content: content,
                cc_recipients: ccRecipients.length > 0 ? ccRecipients : null
            }),
        });
        
        // Check for authentication error
        if (handleAuthError(response)) {
            return;
        }
        
        const data = await response.json();
        
        if (response.ok) {
            const ccMessage = ccRecipients.length > 0 ? ` with CC to ${ccRecipients.join(', ')}` : '';
            showNotification(`Email sent successfully to ${recipient}${ccMessage}`, 'success');
            
            // Add success animation
            sendEmailBtn.style.transform = 'scale(1.05)';
            setTimeout(() => {
                sendEmailBtn.style.transform = 'scale(1)';
            }, 200);
        } else {
            throw new Error(data.error || 'Failed to send email');
        }
    } catch (error) {
        showNotification(`Failed to send email: ${error.message}`, 'error');
    } finally {
        setEmailLoadingState(false);
    }
    });
}

// Enhanced email loading state
function setEmailLoadingState(isLoading) {
    sendEmailBtn.disabled = isLoading;
    
    if (isLoading) {
        emailBtnText.textContent = 'Sending...';
        emailSpinner.style.display = 'inline-block';
        sendEmailBtn.style.transform = 'scale(0.98)';
    } else {
        emailBtnText.textContent = 'Send Email with Attachment';
        emailSpinner.style.display = 'none';
        sendEmailBtn.style.transform = 'scale(1)';
    }
}

// Enhanced progress update handler
function updateProgress(progress) {
    const outreachType = document.querySelector('input[name="outreach_type"]:checked')?.value;
    
    // Update stages with smooth transitions
    if (progress.stage === 'crawling') {
        setStageActive('stage-crawl');
        document.getElementById('crawl-detail').textContent = progress.message || 
            (outreachType === 'investor' ? 'Preparing research...' : 
             outreachType === 'any' ? 'Starting research...' : 'Crawling website...');
        // if (progress.pages_crawled !== undefined) {
        //     animateCounter('pagesCount', progress.pages_crawled);
        // }
    } else if (progress.stage === 'analyzing') {
        setStageCompleted('stage-crawl');
        setStageActive('stage-analyze');
        document.getElementById('analyze-detail').textContent = progress.message || 
            (outreachType === 'investor' ? 'Analyzing research requirements...' : 
             outreachType === 'any' ? 'Analyzing outreach requirements...' : 'Analyzing content...');
    } else if (progress.stage === 'generating') {
        setStageCompleted('stage-analyze');
        setStageActive('stage-generate');
        document.getElementById('generate-detail').textContent = progress.message || 
            (outreachType === 'investor' ? 'Conducting research...' : 
             outreachType === 'any' ? 'Conducting research and generating email...' : 'Creating slides...');
    } else if (progress.stage === 'email') {
        setStageCompleted('stage-generate');
        setStageActive('stage-email');
        document.getElementById('email-detail').textContent = progress.message || 
            (outreachType === 'investor' ? 'Generating personalized email...' : 'Generating email...');
    }
}

// Enhanced stage management with animations
function setStageActive(stageId) {
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
    const stage = document.getElementById(stageId);
    stage.classList.add('active');
    
    // Scroll stage into view
    stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setStageCompleted(stageId) {
    const stage = document.getElementById(stageId);
    stage.classList.remove('active');
    stage.classList.add('completed');
    
    // Animate icon change (icon colors handled by CSS classes)
    const icon = stage.querySelector('.stage-icon');
    icon.style.transform = 'scale(0.8)';
    setTimeout(() => {
        icon.style.transform = 'scale(1.1)';
        setTimeout(() => {
            icon.style.transform = 'scale(1)';
        }, 200);
    }, 150);
}

// Animated counter for metrics
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;
    const increment = targetValue > currentValue ? 1 : -1;
    
    if (currentValue !== targetValue) {
        element.textContent = currentValue + increment;
        setTimeout(() => animateCounter(elementId, targetValue), 50);
    }
}

// Enhanced timer function
function updateTimer() {
    // Timer functionality disabled - no longer updating timeElapsed display
    // const elapsed = Math.floor((Date.now() - startTime) / 1000);
    // const minutes = Math.floor(elapsed / 60);
    // const seconds = elapsed % 60;
    // const timeElement = document.getElementById('timeElapsed');
    // if (timeElement) {
    //     timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    // }
}

// Enhanced success handler
function showSuccess(data) {
    setStageCompleted('stage-email');
    currentFileId = data.file_id;
    
    const outreachType = document.querySelector('input[name="outreach_type"]:checked')?.value;
    
    if (outreachType === 'investor') {
        // Handle investor research results
        const successHtml = `
            <div class="message success-message" style="opacity: 0; transform: translateY(20px);">
                <h3>Investor Research & Email Completed!</h3>
                <p>Generated ${data.insights_count || '10-12'} key insights and personalized email successfully</p>
            </div>
        `;
        
        resultDiv.innerHTML = successHtml;
        
        // Show investor results section
        investorResultSection.style.display = 'block';
        investorResultSection.style.opacity = '0';
        investorResultSection.style.transform = 'translateY(20px)';
        
        // Populate insights
        investorInsights.value = data.investor_insights || 'No insights generated';
        
        // Animate sections
        setTimeout(() => {
            const message = resultDiv.querySelector('.message');
            message.style.transition = 'var(--transition-base)';
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
            
            investorResultSection.style.transition = 'var(--transition-base)';
            investorResultSection.style.opacity = '1';
            investorResultSection.style.transform = 'translateY(0)';
        }, 100);
        
        // Show email section for investor mode with generated email
        emailSection.style.display = 'block';
        emailSection.style.opacity = '0';
        emailSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            emailSection.style.transition = 'var(--transition-base)';
            emailSection.style.opacity = '1';
            emailSection.style.transform = 'translateY(0)';
        }, 300);
        
        // Populate email content
        emailSubject.value = data.email_subject || 'Investment Opportunity';
        emailContent.value = data.email_content || 'Email content generation failed';
        
        // Auto-populate recipient email with user email from stored task data
        if (data.recipient_email) {
            document.getElementById('recipientEmail').value = data.recipient_email;
        }
        
        autoResizeTextarea();
        
    } else if (outreachType === 'any') {
        // Handle any outreach results - show only email section
        const successHtml = `
            <div class="message success-message" style="opacity: 0; transform: translateY(20px);">
                <h3>Email Generated Successfully!</h3>
                <p>Generated personalized email successfully</p>
            </div>
        `;
        
        resultDiv.innerHTML = successHtml;
        
        // Animate success message
        setTimeout(() => {
            const message = resultDiv.querySelector('.message');
            message.style.transition = 'var(--transition-base)';
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
        }, 100);
        
        // Show email section with animation
        emailSection.style.display = 'block';
        emailSection.style.opacity = '0';
        emailSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            emailSection.style.transition = 'var(--transition-base)';
            emailSection.style.opacity = '1';
            emailSection.style.transform = 'translateY(0)';
        }, 300);
        
        emailSubject.value = data.email_subject || 'Outreach Opportunity';
        emailContent.value = data.email_content || 'Email content generation failed';
        
        // Auto-populate recipient email with user email from stored task data
        if (data.recipient_email) {
            document.getElementById('recipientEmail').value = data.recipient_email;
        }
        
        autoResizeTextarea();
        
        // Hide investor result section
        investorResultSection.style.display = 'none';
        
    } else {
        // Handle founder presentation results (existing logic)
        const successHtml = `
            <div class="message success-message" style="opacity: 0; transform: translateY(20px);">
                <div class="results-viewer-full">
                    ${data.has_pdf ? `
                    <div class="pdf-viewer-container">
                        <h4>Preview</h4>
                        <iframe 
                            src="/view-pdf/${data.file_id}" 
                            class="pdf-viewer"
                            title="Generated Presentation Preview">
                        </iframe>
                        <div class="download-buttons-bottom">
                            <a href="/download-pptx/${data.file_id}" class="download-btn pptx-btn" download>
                                Download PowerPoint
                            </a>
                            <a href="/download-pdf/${data.file_id}" class="download-btn pdf-btn" download>
                                Download PDF
                            </a>
                        </div>
                    </div>
                    ` : `
                    <div class="pdf-pending">
                        <h4>PDF Preview</h4>
                        <p>PDF conversion is in progress. Please refresh in a moment to view the preview.</p>
                        <button onclick="window.location.reload()" class="btn btn-secondary">Refresh Page</button>
                        <div class="download-buttons-bottom">
                            <a href="/download-pptx/${data.file_id}" class="download-btn pptx-btn" download>
                                Download PowerPoint
                            </a>
                        </div>
                    </div>
                    `}
                </div>
            </div>
        `;
        
        resultDiv.innerHTML = successHtml;
        
        // Animate success message
        setTimeout(() => {
            const message = resultDiv.querySelector('.message');
            message.style.transition = 'var(--transition-base)';
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
        }, 100);
        
        // Show email section with animation
        emailSection.style.display = 'block';
        emailSection.style.opacity = '0';
        emailSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            emailSection.style.transition = 'var(--transition-base)';
            emailSection.style.opacity = '1';
            emailSection.style.transform = 'translateY(0)';
        }, 300);
        
        emailSubject.value = data.email_subject || 'Partnership Opportunity';
        emailContent.value = data.email_content || 'Email content generation failed';
        
        // Auto-populate recipient email with founder email from stored task data
        if (data.recipient_email) {
            document.getElementById('recipientEmail').value = data.recipient_email;
        }
        
        autoResizeTextarea();
    }
    
    setLoadingState(false);
    
    // Scroll to results
    setTimeout(() => {
            if (outreachType === 'investor') {
        investorResultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (outreachType === 'any') {
        emailSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    }, 500);
}

// Enhanced error handler
function showError(message) {
    const errorHtml = `
        <div class="message error-message" style="opacity: 0; transform: translateY(20px);">
            <h3>Generation Failed</h3>
            <p>${message}</p>
        </div>
    `;
    
    resultDiv.innerHTML = errorHtml;
    
    // Animate error message
    setTimeout(() => {
        const errorElement = resultDiv.querySelector('.message');
        errorElement.style.transition = 'var(--transition-base)';
        errorElement.style.opacity = '1';
        errorElement.style.transform = 'translateY(0)';
    }, 100);
    
    setLoadingState(false);
    
    // Scroll to error
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// Modern notification system
window.showNotification = function showNotification(message, type = 'info', duration = 5000) {
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
    
    // Add to container (newest at top)
    container.insertBefore(notification, container.firstChild);
    
    // Close button functionality
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
    
    // Auto-hide after specified duration
    if (duration > 0) {
        setTimeout(closeNotification, duration);
    }
    
    // Limit number of notifications (keep only 5 most recent)
    const notifications = container.querySelectorAll('.notification');
    if (notifications.length > 5) {
        notifications[notifications.length - 1].remove();
    }
    
    return notification;
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + Enter to submit form
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !submitBtn.disabled) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
    }
});

// Prevent form submission on disabled state
form.addEventListener('submit', (e) => {
    console.log('[DEBUG] Second form submit handler - button disabled?', submitBtn.disabled);
    if (submitBtn.disabled) {
        console.log('[DEBUG] Preventing form submission due to disabled button');
        e.preventDefault();
    }
});

// Authentication functionality
async function handleAuthAction() {
    // Add visual feedback
    authBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        authBtn.style.transform = 'scale(1)';
    }, 100);
    
    if (isSignedIn) {
        // Sign out
        try {
            window.location.href = '/logout';
        } catch (error) {
            showNotification('Sign out failed. Please try again.', 'error');
        }
    } else {
        // Sign in
        try {
            window.location.href = '/login';
        } catch (error) {
            showNotification('Sign in failed. Please try again.', 'error');
        }
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/status');
        if (response.ok) {
            const authData = await response.json();
            const wasSignedIn = isSignedIn;
            isSignedIn = authData.authenticated;
            updateAuthButton(authData);
            
            // Show success notification if user just signed in
            if (isSignedIn && !wasSignedIn && authData.user_name) {
                // showNotification(`Welcome, ${authData.user_name}! You're now signed in.`, 'success');
            }
        } else {
            isSignedIn = false;
            updateAuthButton();
        }
    } catch (error) {
        console.warn('Failed to check auth status:', error);
        isSignedIn = false;
        updateAuthButton();
    }
}

function updateAuthButton(authData = null) {
    // Get fresh DOM elements
    const currentAuthBtn = document.getElementById('authBtn');
    const currentUserDropdown = document.getElementById('userDropdown');
    const currentUserName = document.getElementById('userName');
    
    if (isSignedIn && authData) {
        // User is signed in - only update user info, don't change visibility
        // (Server-side rendering already shows the correct state)
        
        // Update user dropdown with latest user info if needed
        if (currentUserName && authData.user_name && currentUserName.textContent !== authData.user_name) {
            currentUserName.textContent = authData.user_name;
        }
        
        // Update user avatar if needed
        const userAvatar = currentUserDropdown?.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.textContent = '';
        }
        
        // Only adjust visibility if server rendered wrong state (fallback)
        if (currentAuthBtn && currentAuthBtn.style.display !== 'none') {
            currentAuthBtn.style.display = 'none';
        }
        if (currentUserDropdown && currentUserDropdown.style.display === 'none') {
            currentUserDropdown.style.display = 'flex';
        }
    } else {
        // User is not signed in - only change if server rendered wrong state
        if (currentUserDropdown && currentUserDropdown.style.display !== 'none') {
            currentUserDropdown.style.display = 'none';
        }
        if (currentAuthBtn && currentAuthBtn.style.display === 'none') {
            currentAuthBtn.style.display = 'flex';
        }
        
        // Update auth button text
        const authText = currentAuthBtn?.querySelector('.auth-text');
        if (authText && authText.textContent !== 'Sign In') {
            authText.textContent = 'Sign In';
        }
        
        if (currentAuthBtn) {
            currentAuthBtn.setAttribute('aria-label', 'Sign in to your Outlook account');
            currentAuthBtn.title = 'Sign in with Microsoft Outlook';
        }
    }
}

// History Management
function addToHistory(data) {
    const historyItem = {
        id: Date.now().toString(),
        taskId: data.taskId || currentTaskId,
        url: data.url || null,
        investorName: data.investorName || null,
        fundName: data.fundName || null,
        outreachType: data.outreachType || 'founder',
        sector: data.sector || null,
        status: data.status || 'in-progress',
        timestamp: new Date(),
        fileId: data.fileId,
        emailContent: data.emailContent,
        investorInsights: data.investorInsights,
        recipientEmail: data.recipientEmail
    };
    
    // Add computed display name
    historyItem.displayName = getDisplayName(historyItem);
    
    generationHistory.unshift(historyItem);
    saveHistory();
    renderHistory();
}

function updateHistoryStatus(taskId, status, additionalData = {}) {
    const item = generationHistory.find(h => h.taskId === taskId);
    if (item) {
        item.status = status;
        Object.assign(item, additionalData);
        saveHistory();
        renderHistory();
    }
}

function extractCompanyName(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '').split('.')[0].toUpperCase();
    } catch (e) {
        return 'Unknown Company';
    }
}

function getDisplayName(historyItem) {
    // Handle batch jobs
    if (historyItem.item_type === 'batch' || historyItem.outreach_type?.startsWith('batch_')) {
        const batchType = historyItem.batch_type || historyItem.outreach_type?.replace('batch_', '');
        return `Batch ${batchType} (${historyItem.total_rows || 0} entries)`;
    }
    
    if (historyItem.outreachType === 'investor' && historyItem.investorName) {
        return historyItem.investorName;
    } else if (historyItem.outreachType === 'investor' && historyItem.fundName) {
        return historyItem.fundName;
    } else if (historyItem.outreachType === 'any' && historyItem.personName) {
        return historyItem.personName;
    } else if (historyItem.outreachType === 'any' && historyItem.organization) {
        return historyItem.organization;
    } else if (historyItem.url) {
        return extractCompanyName(historyItem.url);
    } else if (historyItem.recipientEmail) {
        // Extract domain from email as fallback
        const domain = historyItem.recipientEmail.split('@')[1];
        return domain ? domain.split('.')[0].toUpperCase() : 'Email Outreach';
    }
    
    // Better fallback based on outreach type
    const typeNames = {
        'investor': 'Investor Outreach',
        'founder': 'Founder Outreach', 
        'any': 'General Outreach'
    };
    return typeNames[historyItem.outreachType] || 'Outreach Task';
}

async function loadHistory() {
    // First load from localStorage (for immediate display)
    const saved = localStorage.getItem('generationHistory');
    if (saved) {
        try {
            generationHistory = JSON.parse(saved);
            // Convert timestamp strings back to Date objects
            generationHistory.forEach(item => {
                item.timestamp = new Date(item.timestamp);
            });
        } catch (e) {
            console.warn('Failed to load local history:', e);
            generationHistory = [];
        }
    }
    
    // Then load from server database (for persistent history)
    try {
        const response = await fetch('/api/history');
        
        // Check for authentication error
        if (handleAuthError(response)) {
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.history) {
                // Merge server history with local history
                const serverHistory = data.history.map(item => ({
                    ...item,
                    timestamp: new Date(item.timestamp),
                    displayName: getDisplayNameFromItem(item)
                }));
                
                // Create a map of existing task IDs to avoid duplicates
                const existingTaskIds = new Set(generationHistory.map(item => item.taskId));
                
                // Add server items that aren't already in local storage
                serverHistory.forEach(serverItem => {
                    if (!existingTaskIds.has(serverItem.taskId)) {
                        generationHistory.unshift(serverItem);
                    }
                });
                
                // Sort by timestamp (newest first)
                generationHistory.sort((a, b) => b.timestamp - a.timestamp);
                
                // Save the merged history back to localStorage
                saveHistory();
                
                console.log(`Loaded ${serverHistory.length} items from server, ${generationHistory.length} total`);
            }
        }
    } catch (error) {
        console.warn('Failed to load server history:', error);
    }
}

function getDisplayNameFromItem(item) {
    if (item.outreachType === 'investor' && item.investorName) {
        return item.investorName;
    } else if (item.outreachType === 'investor' && item.fundName) {
        return item.fundName;
    } else if (item.outreachType === 'any' && item.personName) {
        return item.personName;
    } else if (item.outreachType === 'any' && item.organization) {
        return item.organization;
    } else if (item.url) {
        return extractCompanyName(item.url);
    } else if (item.recipientEmail) {
        // Extract domain from email as fallback
        const domain = item.recipientEmail.split('@')[1];
        return domain ? domain.split('.')[0].toUpperCase() : 'Email Outreach';
    }
    
    // Better fallback based on outreach type
    const typeNames = {
        'investor': 'Investor Outreach',
        'founder': 'Founder Outreach', 
        'any': 'General Outreach'
    };
    return typeNames[item.outreachType] || 'Outreach Task';
}

function saveHistory() {
    try {
        localStorage.setItem('generationHistory', JSON.stringify(generationHistory));
    } catch (e) {
        console.warn('Failed to save history:', e);
    }
}

function renderHistory() {
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    
    const filteredHistory = generationHistory.filter(item => {
        // Status filter
        if (currentFilter !== 'all' && item.status !== currentFilter) {
            return false;
        }
        
        // Search filter - search across multiple fields
        if (searchTerm) {
            const displayName = (item.displayName || getDisplayName(item)).toLowerCase();
            const url = (item.url || '').toLowerCase();
            const investorName = (item.investorName || '').toLowerCase();
            const fundName = (item.fundName || '').toLowerCase();
            const organization = (item.organization || '').toLowerCase();
            const personName = (item.personName || '').toLowerCase();
            const sector = (item.sector || '').toLowerCase();
            const outreachType = (item.outreachType || '').toLowerCase();
            const batchType = (item.batch_type || '').toLowerCase();
            
            return displayName.includes(searchTerm) ||
                   url.includes(searchTerm) ||
                   investorName.includes(searchTerm) ||
                   fundName.includes(searchTerm) ||
                   organization.includes(searchTerm) ||
                   personName.includes(searchTerm) ||
                   sector.includes(searchTerm) ||
                   outreachType.includes(searchTerm) ||
                   batchType.includes(searchTerm) ||
                   'batch'.includes(searchTerm);
        }
        
        return true;
    });
    
    if (filteredHistory.length === 0) {
        const emptyMessage = searchTerm ? 
            `No results found for "${searchTerm}"` : 
            `No ${currentFilter === 'all' ? '' : currentFilter + ' '}generations yet`;
        const emptySubtext = searchTerm ? 
            'Try a different search term' : 
            'Start by entering a company URL on the left';
            
        historyList.innerHTML = `
            <div class="history-empty">
                <div class="empty-icon"></div>
                <p>${emptyMessage}</p>
                <small>${emptySubtext}</small>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = filteredHistory.map(item => createHistoryItemHTML(item)).join('');
}

function createHistoryItemHTML(item) {
    const timeAgo = getTimeAgo(item.timestamp);
    
    // Proper heroicons for status
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
    
    const displayName = item.displayName || getDisplayName(item);
    
    // Create type tag instead of prefix
    let typeTag;
    if (item.item_type === 'batch' || item.outreach_type?.startsWith('batch_')) {
        const batchType = (item.batch_type || item.outreach_type?.replace('batch_', '') || 'unknown').toUpperCase();
        typeTag = `<span class="type-tag batch">BATCH ${batchType}</span>`;
    } else {
        typeTag = {
            'investor': `<span class="type-tag investor">INV</span>`,
            'any': `<span class="type-tag any">ANY</span>`,
            'founder': `<span class="type-tag founder">FDR</span>`
        }[item.outreachType] || `<span class="type-tag">UNK</span>`;
    }
    
    // Determine meta information to display
    let metaInfo = timeAgo;
    if (item.item_type === 'batch' || item.outreach_type?.startsWith('batch_')) {
        const completedRows = item.completed_rows || 0;
        const totalRows = item.total_rows || 0;
        metaInfo += ` • ${completedRows}/${totalRows} completed`;
        if (item.sector) {
            metaInfo += ` • ${item.sector}`;
        }
    } else if (item.outreachType === 'investor') {
        metaInfo += ` • ${item.fundName || 'Unknown Fund'}`;
    } else if (item.outreachType === 'any') {
        metaInfo += ` • ${item.organization || 'Unknown Organization'}`;
    } else if (item.url) {
        try {
            metaInfo += ` • ${new URL(item.url).hostname}`;
        } catch (e) {
            metaInfo += ' • Invalid URL';
        }
    }
    
    // Create status indicator with icon
    const getStatusIndicator = (status) => {
        const icons = {
            'completed': '✓',
            'failed': '✕',
            'in-progress': '●',
            'submitted': `<svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
            </svg>`
        };
        return `<div class="history-status-indicator ${status}">${icons[status] || '?'}</div>`;
    };

    return `
        <div class="history-item ${item.status}" data-task-id="${item.taskId || item.task_id || item.id}" onclick="window.location.href='/history/${item.taskId || item.task_id || item.id}'" style="cursor: pointer;">
            ${getStatusIndicator(item.status)}
            <div class="history-header">
                <h3 class="history-company">${displayName}</h3>
            </div>
        </div>
    `;
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

function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
}

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        // Mobile behavior
        historySidebar.classList.toggle('mobile-open');
        
        // Add/remove overlay
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.addEventListener('click', () => {
                historySidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
            document.body.appendChild(overlay);
        }
        
        overlay.classList.toggle('active', historySidebar.classList.contains('mobile-open'));
    } else {
        // Desktop behavior
        const appLayout = document.querySelector('.app-layout');
        const extendedHeader = document.querySelector('.extended-header');
        
        historySidebar.classList.toggle('collapsed');
        appLayout.classList.toggle('sidebar-collapsed', historySidebar.classList.contains('collapsed'));
        
        // Reset any transforms when toggling
        if (historySidebar && extendedHeader) {
            historySidebar.style.transform = '';
            extendedHeader.style.transform = '';
        }
        
        // Update extended header position to match sidebar state with smooth transition
        if (historySidebar.classList.contains('collapsed')) {
            if (extendedHeader) {
                extendedHeader.style.left = '60px';
                extendedHeader.style.width = 'calc(100% - 60px)';
            }
        } else {
            if (extendedHeader) {
                extendedHeader.style.left = '320px';
                extendedHeader.style.width = 'calc(100% - 320px)';
            }
        }
        
        // Note: Sidebar now stays static - no scroll animations
    }
}

// DEPRECATED: This function is replaced by the dedicated history page
function viewGeneration(taskId) {
    const item = generationHistory.find(h => h.taskId === taskId);
    if (item) {
        const displayName = item.displayName || getDisplayName(item);
        
        if (item.outreachType === 'investor') {
            // Select investor outreach mode
            document.getElementById('outreach_investor').checked = true;
            handleOutreachTypeChange();
            
            // Populate investor fields
            if (item.investorName) investorNameInput.value = item.investorName;
            if (item.fundName) fundNameInput.value = item.fundName;
            if (item.outreachContext) outreachContextInput.value = item.outreachContext;
            
            // Show investor insights if available
            if (item.investorInsights && investorInsights) {
                investorResultSection.style.display = 'block';
                investorInsights.value = item.investorInsights;
            }
        } else if (item.outreachType === 'any') {
            // Select any outreach mode
            document.getElementById('outreach_any').checked = true;
            handleOutreachTypeChange();
            
            // Populate any outreach fields
            if (item.personName) personNameInput.value = item.personName;
            if (item.organization) organizationInput.value = item.organization;
            if (item.outreachRequest) outreachRequestInput.value = item.outreachRequest;
            
            // Show email content if available
            if (item.emailContent && emailContent) {
                emailContent.value = item.emailContent;
                autoResizeTextarea();
            }
        } else {
            // Select founder outreach mode (default)
            document.getElementById('outreach_founder').checked = true;
            handleOutreachTypeChange();
            
            // Populate founder fields
            if (item.url) urlInput.value = item.url;
            if (item.emailContent && emailContent) {
                emailContent.value = item.emailContent;
                autoResizeTextarea();
            }
        }
        
        // Set common fields
        if (item.sector) {
            const sectorRadio = document.querySelector(`input[name="sector"][value="${item.sector}"]`);
            if (sectorRadio) sectorRadio.checked = true;
        }
        if (item.recipientEmail) {
            document.getElementById('recipient_email').value = item.recipientEmail;
        }
        
        showNotification(`Loaded generation for ${displayName}`, 'success');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            historySidebar.classList.remove('mobile-open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.classList.remove('active');
        }
    }
}

// Project Management Functions
async function loadProjects() {
    try {
        const response = await fetch('/api/projects', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError(response);
                return;
            }
            throw new Error('Failed to load projects');
        }
        
        projects = await response.json();
        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('Failed to load projects', 'error');
    }
}

function renderProjects() {
    if (!projectList) return;
    
    projectList.innerHTML = '';
    
    projects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = `project-item ${project.id === currentProjectId ? 'active' : ''}`;
        projectItem.dataset.projectId = project.id;
        
        projectItem.innerHTML = `
            <div class="project-info">
                <span class="project-name">${project.name}</span>
                <span class="project-count">${project.task_count || 0}</span>
            </div>
        `;
        
        // Add delete button for non-General projects
        if (project.id !== 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'project-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete Project';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteProject(project.id);
            };
            projectItem.appendChild(deleteBtn);
        }
        
        projectItem.onclick = () => switchProject(project.id);
        projectList.appendChild(projectItem);
    });
}

function switchProject(projectId) {
    currentProjectId = projectId;
    renderProjects();
    loadHistoryForProject(projectId);
    
    // Update form to include current project
    const projectName = projects.find(p => p.id === projectId)?.name || 'Unknown';
}

async function loadHistoryForProject(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/tasks`, {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError(response);
                return;
            }
            throw new Error('Failed to load project tasks');
        }
        
        const tasks = await response.json();
        // Convert to the format expected by existing history code
        generationHistory = tasks.map(task => ({
            id: task.task_id,
            fileId: task.file_id,
            companyName: task.company_name,
            timestamp: new Date(task.created_at).getTime(),
            status: 'completed', // Assume completed for now
            outreachType: task.outreach_type,
            personName: task.person_name,
            organization: task.organization,
            investorName: task.investor_name,
            fundName: task.fund_name,
            outreachRequest: task.outreach_request,
            investorInsights: task.investor_insights
        }));
        
        renderHistory();
    } catch (error) {
        console.error('Error loading project tasks:', error);
        showNotification('Failed to load project history', 'error');
    }
}

async function createProject(name, description, color) {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ name, description, color })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError(response);
                return;
            }
            const error = await response.json();
            throw new Error(error.error || 'Failed to create project');
        }
        
        const newProject = await response.json();
        projects.push(newProject);
        renderProjects();
        showNotification(`Project "${name}" created successfully`, 'success');
        return newProject;
    } catch (error) {
        console.error('Error creating project:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

async function deleteProject(projectId) {
    if (projectId === 1) {
        showNotification('Cannot delete the General project', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this project? All tasks will be moved to the General project.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                handleAuthError(response);
                return;
            }
            throw new Error('Failed to delete project');
        }
        
        // Remove from local array
        projects = projects.filter(p => p.id !== projectId);
        
        // Switch to General project if current project was deleted
        if (currentProjectId === projectId) {
            switchProject(1);
        } else {
            renderProjects();
        }
        
        showNotification('Project deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Failed to delete project', 'error');
    }
}

function showProjectModal() {
    projectModalOverlay.classList.add('show');
    projectNameInput.focus();
}

function hideProjectModal() {
    projectModalOverlay.classList.remove('show');
    projectForm.reset();
    projectColorInput.value = '#4FD1C5';
}

// Project Modal Event Listeners
if (createProjectBtn) {
    createProjectBtn.addEventListener('click', showProjectModal);
}

if (closeProjectModal) {
    closeProjectModal.addEventListener('click', hideProjectModal);
}

if (cancelProjectBtn) {
    cancelProjectBtn.addEventListener('click', hideProjectModal);
}

if (projectModalOverlay) {
    projectModalOverlay.addEventListener('click', (e) => {
        if (e.target === projectModalOverlay) {
            hideProjectModal();
        }
    });
}

if (createProjectSubmit) {
    createProjectSubmit.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const name = projectNameInput.value.trim();
        const description = projectDescInput.value.trim();
        const color = projectColorInput.value;
        
        if (!name) {
            showNotification('Project name is required', 'error');
            return;
        }
        
        try {
            await createProject(name, description, color);
            hideProjectModal();
        } catch (error) {
            // Error already handled in createProject function
        }
    });
}

// Color preset handlers
colorPresets.forEach(preset => {
    if (preset) {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            projectColorInput.value = color;
        });
    }
});

// Initialize projects when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    startBatchNotificationChecking();
    initializeTabs();
});

// ===== TAB FUNCTIONALITY =====

function initializeTabs() {
    const headerTabs = document.querySelectorAll('.header-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (headerTabs.length === 0) return; // No tabs on this page
    
    headerTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = tab.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
    
    console.log('[TABS] Header tab system initialized');
}

function switchTab(targetTab) {
    const headerTabs = document.querySelectorAll('.header-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Remove active class from all header tabs and contents
    headerTabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to target header tab and content
    const targetTab_element = document.querySelector(`.header-tab[data-tab="${targetTab}"]`);
    const targetContent = document.getElementById(`${targetTab}Content`);
    
    if (targetTab_element) targetTab_element.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
    
    console.log(`[TABS] Switched to ${targetTab} tab`);
    
    // Trigger any tab-specific initialization
    if (targetTab === 'finder' && window.finderApp) {
        // Finder tab activated - any special handling can go here
        console.log('[TABS] Finder tab activated');
    } else if (targetTab === 'batch') {
        // Batch tab activated - initialize batch processing
        console.log('[TABS] Batch tab activated');
        initializeBatchProcessing();
    }
}

// ===========================
// BATCH PROCESSING FUNCTIONALITY
// ===========================

let batchJobs = [];
let batchProcessingInitialized = false;

function initializeBatchProcessing() {
    if (batchProcessingInitialized) return;
    
    console.log('[BATCH] Initializing batch processing...');
    
    // Get batch elements
    const uploadArea = document.getElementById('batchUploadArea');
    const csvFileInput = document.getElementById('batchCsvFile');
    const csvPreview = document.getElementById('batchCsvPreview');
    const previewTable = document.getElementById('batchPreviewTable');
    const submitBatchBtn = document.getElementById('submitBatchBtn');
    const refreshBtn = document.getElementById('refreshBatchJobs');
    const statusFilter = document.getElementById('batchStatusFilter');
    
    if (!uploadArea || !csvFileInput) {
        console.error('[BATCH] Required elements not found');
        return;
    }
    
    // Upload area click handler
    uploadArea.addEventListener('click', () => {
        csvFileInput.click();
    });
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'text/csv') {
            handleBatchCsvFile(files[0]);
        }
    });
    
    // File input change handler
    csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleBatchCsvFile(file);
        }
    });
    
    // Submit batch button handler
    if (submitBatchBtn) {
        submitBatchBtn.addEventListener('click', handleBatchSubmission);
    }
    
    // Refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadBatchJobs);
    }
    
    // Status filter change handler
    if (statusFilter) {
        statusFilter.addEventListener('change', filterBatchJobs);
    }
    
    // Load existing batch jobs
    loadBatchJobs();
    
    // Auto-refresh every 30 seconds
    setInterval(loadBatchJobs, 30000);
    
    batchProcessingInitialized = true;
    console.log('[BATCH] Initialization complete');
}

async function handleBatchCsvFile(file) {
    console.log('[BATCH] Processing CSV file:', file.name);
    
    const formData = new FormData();
    formData.append('csv_file', file);
    
    try {
        const response = await fetch('/api/batch/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Always show validation UI, regardless of errors
        displayBatchCsvValidation(data);
        
    } catch (error) {
        console.error('[BATCH] Error uploading CSV:', error);
        showNotification('Error uploading CSV file. Please try again.', 'error');
    }
}

function displayBatchCsvValidation(data) {
    const validationContainer = document.getElementById('batchCsvValidation');
    const summaryContainer = document.getElementById('batchValidationSummary');
    const detailsContainer = document.getElementById('batchValidationDetails');
    const submitBtn = document.getElementById('submitBatchBtn');
    const submitText = document.getElementById('batchSubmitText');
    
    // Hide upload text elements once CSV is uploaded
    const uploadTitle = document.getElementById('batchUploadTitle');
    const uploadDescription = document.getElementById('batchUploadDescription');
    const uploadHint = document.getElementById('batchUploadHint');
    
    if (uploadTitle) uploadTitle.style.display = 'none';
    if (uploadDescription) uploadDescription.style.display = 'none';
    if (uploadHint) uploadHint.style.display = 'none';
    
    if (!validationContainer || !summaryContainer || !detailsContainer) return;
    
    const totalRows = data.total_rows || 0;
    const validRows = data.rows || [];
    const invalidRows = data.errors || [];
    const validCount = validRows.length;
    const invalidCount = invalidRows.length;
    
    // Show validation summary
    summaryContainer.innerHTML = `
        <div class="validation-stat">
            <span class="validation-stat-value">${totalRows}</span>
            <span class="validation-stat-label">Total Rows</span>
        </div>
        <div class="validation-stat valid">
            <span class="validation-stat-value">${validCount}</span>
            <span class="validation-stat-label">Valid Entries</span>
        </div>
        <div class="validation-stat invalid">
            <span class="validation-stat-value">${invalidCount}</span>
            <span class="validation-stat-label">Invalid Entries</span>
        </div>
    `;
    
    let detailsHTML = '';
    
    // Show valid entries
    if (validCount > 0) {
        detailsHTML += `
            <div class="validation-section valid">
                <h4>
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Valid Entries (${validCount})
                </h4>
                <div class="validation-list valid-entries-highlight">
                    ${validRows.slice(0, 10).map(row => `
                        <div class="validation-item valid">
                            <div class="validation-item-info">
                                <div class="validation-item-company">${row.company || 'N/A'}</div>
                                <div class="validation-item-email">${row.email || 'N/A'}</div>
                            </div>
                            <div class="validation-item-status valid">Valid</div>
                        </div>
                    `).join('')}
                    ${validCount > 10 ? `
                        <div class="validation-item valid">
                            <div class="validation-item-info">
                                <div class="validation-item-company">... and ${validCount - 10} more valid entries</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Show invalid entries
    if (invalidCount > 0) {
        detailsHTML += `
            <div class="validation-section invalid">
                <h4>
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    Invalid Entries (${invalidCount})
                </h4>
                <div class="validation-list invalid-entries-highlight">
                    ${invalidRows.slice(0, 10).map(error => `
                        <div class="validation-item invalid">
                            <div class="validation-item-info">
                                <div class="validation-item-company">${error.row_data?.company || 'Missing company'}</div>
                                <div class="validation-item-email">${error.row_data?.email || 'Missing email'}</div>
                                <div style="color: var(--coral-pink); font-size: var(--text-xs); margin-top: var(--space-1);">
                                    ${error.error || 'Validation error'}
                                </div>
                            </div>
                            <div class="validation-item-status invalid">Invalid</div>
                        </div>
                    `).join('')}
                    ${invalidCount > 10 ? `
                        <div class="validation-item invalid">
                            <div class="validation-item-info">
                                <div class="validation-item-company">... and ${invalidCount - 10} more invalid entries</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    detailsContainer.innerHTML = detailsHTML;
    
    // Update submit button
    if (validCount > 0) {
        submitBtn.disabled = false;
        submitText.textContent = `Proceed with ${validCount} valid ${validCount === 1 ? 'entry' : 'entries'}`;
        // Store only valid rows for submission
        window.batchCsvRows = validRows;
    } else {
        submitBtn.disabled = true; 
        submitText.textContent = 'No valid entries to process';
        window.batchCsvRows = null;
    }
    
    validationContainer.style.display = 'block';
}

async function handleBatchSubmission() {
    const batchType = document.querySelector('input[name="batch_type"]:checked')?.value;
    const sector = document.querySelector('input[name="batch_sector"]:checked')?.value;
    const submitBtn = document.getElementById('submitBatchBtn');
    
    if (!batchType || !window.batchCsvRows) {
        showNotification('Please select batch type and upload a CSV file', 'error');
        return;
    }
    
    console.log('[BATCH] Submitting batch job:', batchType, window.batchCsvRows.length, 'rows');
    
    // Set loading state
    setLoadingState(true, submitBtn, 'Processing...');
    
    try {
        const response = await fetch('/api/batch/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                batch_type: batchType,
                sector: sector || '',
                rows: window.batchCsvRows
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit batch job');
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Batch job submitted successfully!', 'success');
            
            // Reset form
            document.getElementById('batchCsvValidation').style.display = 'none';
            document.getElementById('batchCsvFile').value = '';
            // Reset sector to default (infra)
            document.getElementById('batch_sector_infra').checked = true;
            document.getElementById('submitBatchBtn').disabled = true;
            window.batchCsvRows = null;
            
            // Show upload text elements again
            const uploadTitle = document.getElementById('batchUploadTitle');
            const uploadDescription = document.getElementById('batchUploadDescription');
            const uploadHint = document.getElementById('batchUploadHint');
            
            if (uploadTitle) uploadTitle.style.display = 'block';
            if (uploadDescription) uploadDescription.style.display = 'block';
            if (uploadHint) uploadHint.style.display = 'block';
            
            // Refresh batch jobs list
            setTimeout(loadBatchJobs, 1000);
        } else {
            throw new Error(result.error || 'Failed to submit batch job');
        }
        
    } catch (error) {
        console.error('[BATCH] Submission error:', error);
        showNotification('Error submitting batch job: ' + error.message, 'error');
    } finally {
        setLoadingState(false, submitBtn, 'Process Batch');
    }
}

async function loadBatchJobs() {
    try {
        const response = await fetch('/api/batch/list');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            batchJobs = data.batch_jobs || [];
            renderBatchJobs();
        } else {
            throw new Error(data.error || 'Failed to load batch jobs');
        }
    } catch (error) {
        console.error('[BATCH] Error loading batch jobs:', error);
        showNotification('Failed to load batch jobs. Please try again.', 'error');
    }
}

function renderBatchJobs() {
    const container = document.getElementById('mainBatchJobsList');
    if (!container) return;
    
    const statusFilter = document.getElementById('batchStatusFilter')?.value || 'all';
    
    // Filter jobs
    let filteredJobs = batchJobs;
    if (statusFilter !== 'all') {
        filteredJobs = batchJobs.filter(job => job.status === statusFilter);
    }
    
    if (filteredJobs.length === 0) {
        container.innerHTML = `
            <div class="batch-jobs-empty">
                <div class="empty-icon">
                    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                </div>
                <h4>No batch jobs found</h4>
                <p>Upload a CSV file above to create your first batch job</p>
            </div>
        `;
        return;
    }
    
    // Render jobs (limit to first 10 for main page)
    const displayJobs = filteredJobs.slice(0, 10);
    const jobsHTML = displayJobs.map(job => renderBatchJobCardMain(job)).join('');
    container.innerHTML = jobsHTML;
}

function renderBatchJobCardMain(job) {
    const typeLabel = getTypeLabel(job.batch_type);
    const createdAt = new Date(job.created_at).toLocaleString();
    
    return `
        <div class="batch-job-card-main" data-job-id="${job.batch_id}">
            <div class="batch-job-header-main">
                <div class="batch-job-info-main">
                    <div class="batch-job-id-main">Job #${job.batch_id.substring(0, 8)}</div>
                    <div class="batch-job-type-main">${typeLabel}</div>
                </div>
                <div class="batch-job-status ${getStatusClass(job.status)}">
                    <span class="status-dot"></span>
                    ${formatStatus(job.status)}
                </div>
            </div>
            
            <div class="batch-job-meta-main">
                <div class="batch-meta-item">
                    <span class="batch-meta-value">${job.total_rows || 0}</span>
                    <span class="batch-meta-label">Rows</span>
                </div>
                <div class="batch-meta-item">
                    <span class="batch-meta-value">${job.sector || 'N/A'}</span>
                    <span class="batch-meta-label">Sector</span>
                </div>
                <div class="batch-meta-item">
                    <span class="batch-meta-value">${createdAt.split(',')[0]}</span>
                    <span class="batch-meta-label">Created</span>
                </div>
            </div>
            
            ${renderBatchProgress(job.status)}
            
            ${job.error_message ? `
                <div class="batch-job-error">
                    <strong>Error:</strong> ${job.error_message}
                </div>
            ` : ''}
            
            <div class="batch-job-actions-main">
                ${renderBatchJobActions(job)}
            </div>
        </div>
    `;
}

function renderBatchProgress(status) {
    const progressClass = getBatchProgressClass(status);
    const nodes = [
        {
            id: 'submitted',
            label: 'Submitted',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />`,
            state: getNodeState(status, 0)
        },
        {
            id: 'processing',
            label: 'Processing by Anthropic',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />`,
            state: getNodeState(status, 1)
        },
        {
            id: 'ready',
            label: 'Ready to Use',
            icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />`,
            state: getNodeState(status, 2)
        }
    ];
    
    return `
        <div class="batch-progress ${progressClass}">
            ${nodes.map(node => `
                <div class="progress-node ${node.state}">
                    <div class="progress-node-circle">
                        <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            ${node.icon}
                        </svg>
                    </div>
                    <div class="progress-node-label">${node.label}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function getBatchProgressClass(status) {
    switch (status) {
        case 'submitted':
        case 'in_progress':
            return 'progress-submitted';
        case 'completed':
            return 'progress-completed';
        default:
            return '';
    }
}

function getNodeState(status, nodeIndex) {
    switch (status) {
        case 'pending':
            return nodeIndex === 0 ? 'active' : '';
        case 'submitted':
            if (nodeIndex === 0) return 'completed';
            if (nodeIndex === 1) return 'active';
            return '';
        case 'in_progress':
            if (nodeIndex === 0) return 'completed';
            if (nodeIndex === 1) return 'processing';
            return '';
        case 'completed':
            return 'completed';
        case 'failed':
            if (nodeIndex === 0) return 'completed';
            return '';
        default:
            return '';
    }
}

function renderBatchJobActions(job) {
    let actions = [];
    
    if (job.status === 'completed') {
        actions.push(`
            <button onclick="downloadBatchResults('${job.batch_id}')" class="batch-action-btn primary">
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Results
            </button>
        `);
    }
    
    if (job.status === 'failed') {
        actions.push(`
            <button onclick="retryBatchJob('${job.batch_id}')" class="batch-action-btn secondary">
                <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Retry
            </button>
        `);
    }
    
    return actions.join('');
}

function filterBatchJobs() {
    renderBatchJobs();
}

// Helper functions
function getTypeLabel(type) {
    const typeLabels = {
        'founder': 'Founder Outreach',
        'investor': 'Investor Research',
        'any': 'General Outreach'
    };
    return typeLabels[type] || type;
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

// Action functions for batch jobs
async function downloadBatchResults(batchId) {
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
        console.error('[BATCH] Error downloading results:', error);
        showNotification('Failed to download results. Please try again.', 'error');
    }
}

async function retryBatchJob(batchId) {
    if (!confirm('Are you sure you want to retry this batch job?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/batch/${batchId}/retry`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('Batch job retry initiated', 'success');
            loadBatchJobs(); // Refresh the list
        } else {
            throw new Error('Failed to retry job');
        }
    } catch (error) {
        console.error('[BATCH] Error retrying job:', error);
        showNotification('Failed to retry job. Please try again.', 'error');
    }
}