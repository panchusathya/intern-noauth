/**
 * Finder - Natural Language Lead Discovery
 * Handles the finder tab functionality
 */

class FinderApp {
    constructor() {
        this.currentSession = null;
        this.currentStage = 'query';
        this.orchestrationData = null;
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        // Stages
        this.queryStage = document.getElementById('queryStage');
        this.clarificationStage = document.getElementById('clarificationStage');
        this.strategyStage = document.getElementById('strategyStage');
        this.progressStage = document.getElementById('progressStage');
        this.resultsStage = document.getElementById('resultsStage');
        
        // Input elements
        this.finderQuery = document.getElementById('finderQuery');
        this.finderLeadCount = document.getElementById('finderLeadCount');
        this.analyzeQueryBtn = document.getElementById('analyzeQueryBtn');
        this.analyzeQueryBtnText = document.getElementById('analyzeQueryBtnText');
        
        // Clarification elements
        this.clarificationQuestions = document.getElementById('clarificationQuestions');
        this.submitClarificationBtn = document.getElementById('submitClarificationBtn');
        this.skipClarificationBtn = document.getElementById('skipClarificationBtn');
        
        // Strategy elements
        this.strategyOverview = document.getElementById('strategyOverview');
        this.csvSchemaPreview = document.getElementById('csvSchemaPreview');
        this.executeSearchBtn = document.getElementById('executeSearchBtn');
        this.executeSearchBtnText = document.getElementById('executeSearchBtnText');
        
        // Progress elements
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.workerStatus = document.getElementById('workerStatus');
        
        // Results elements
        this.resultsSummary = document.getElementById('resultsSummary');
        this.downloadCsvBtn = document.getElementById('downloadCsvBtn');
        this.previewCsvBtn = document.getElementById('previewCsvBtn');
        this.newSearchBtn = document.getElementById('newSearchBtn');
        this.csvPreviewContainer = document.getElementById('csvPreviewContainer');
    }
    
    bindEvents() {
        if (this.analyzeQueryBtn) {
            this.analyzeQueryBtn.addEventListener('click', () => this.analyzeQuery());
        }
        
        if (this.submitClarificationBtn) {
            this.submitClarificationBtn.addEventListener('click', () => this.submitClarification());
        }
        
        if (this.skipClarificationBtn) {
            this.skipClarificationBtn.addEventListener('click', () => this.skipClarification());
        }
        
        if (this.executeSearchBtn) {
            this.executeSearchBtn.addEventListener('click', () => this.executeSearch());
        }
        
        if (this.downloadCsvBtn) {
            this.downloadCsvBtn.addEventListener('click', () => this.downloadCsv());
        }
        
        if (this.previewCsvBtn) {
            this.previewCsvBtn.addEventListener('click', () => this.toggleCsvPreview());
        }
        
        if (this.newSearchBtn) {
            this.newSearchBtn.addEventListener('click', () => this.resetSearch());
        }
        
        // Enter key support for query
        if (this.finderQuery) {
            this.finderQuery.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.analyzeQuery();
                }
            });
        }
    }
    
    async analyzeQuery() {
        const query = this.finderQuery.value.trim();
        const leadCount = parseInt(this.finderLeadCount.value) || 50;
        
        if (!query) {
            this.showNotification('Please enter a query describing the leads you want to find.', 'error');
            return;
        }
        
        if (leadCount < 1 || leadCount > 200) {
            this.showNotification('Please enter a lead count between 1 and 200.', 'error');
            return;
        }
        
        this.setButtonLoading(this.analyzeQueryBtn, this.analyzeQueryBtnText, true, 'Analyzing...');
        
        try {
            const response = await fetch('/api/finder/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    query: query,
                    lead_count: leadCount 
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to analyze query');
            }
            
            this.currentSession = result.session_id;
            
            if (result.status === 'needs_clarification') {
                this.showClarificationQuestions(result.questions);
            } else if (result.status === 'orchestration_complete') {
                this.orchestrationData = {
                    csv_schema: result.csv_schema,
                    search_strategy: result.search_strategy
                };
                this.showSearchStrategy(result);
            }
            
        } catch (error) {
            console.error('[FINDER] Error analyzing query:', error);
            this.showNotification('Error analyzing query: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(this.analyzeQueryBtn, this.analyzeQueryBtnText, false, 'Analyze Query');
        }
    }
    
    showClarificationQuestions(questions) {
        this.clarificationQuestions.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'clarification-question';
            questionDiv.innerHTML = `
                <h4>Question ${index + 1}</h4>
                <p>${question}</p>
                <input type="text" 
                       class="clarification-input" 
                       data-question-index="${index}"
                       placeholder="Your answer...">
            `;
            this.clarificationQuestions.appendChild(questionDiv);
        });
        
        this.transitionToStage('clarification');
    }
    
    async submitClarification() {
        const inputs = this.clarificationQuestions.querySelectorAll('.clarification-input');
        const responses = Array.from(inputs).map(input => input.value.trim()).filter(val => val);
        
        console.log('[FINDER] Clarification responses:', responses);
        
        if (responses.length === 0) {
            this.showNotification('Please provide at least one answer.', 'error');
            return;
        }
        
        this.setButtonLoading(this.submitClarificationBtn, null, true, 'Processing...');
        
        try {
            console.log('[FINDER] Sending clarification to server');
            console.log('[FINDER] Session ID:', this.currentSession);
            console.log('[FINDER] Responses:', responses);
            
            const response = await fetch('/api/finder/clarification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession,
                    responses: responses
                })
            });
            
            console.log('[FINDER] Clarification response status:', response.status);
            console.log('[FINDER] Clarification response ok:', response.ok);
            
            const result = await response.json();
            console.log('[FINDER] Clarification result:', result);
            
            if (!response.ok) {
                throw new Error(result.error || `Server error: ${response.status}`);
            }
            
            if (result.status === 'orchestration_complete') {
                console.log('[FINDER] Orchestration complete, storing data');
                this.orchestrationData = {
                    csv_schema: result.csv_schema,
                    search_strategy: result.search_strategy
                };
                console.log('[FINDER] Stored orchestration data:', this.orchestrationData);
                this.showSearchStrategy(result);
            } else if (result.status === 'needs_clarification') {
                console.warn('[FINDER] Got more clarification questions, but we already answered some. Auto-skipping...');
                // If we get more clarification questions after already answering some,
                // it means the AI is being too picky. Force proceed with current responses.
                // Don't call skipClarification() to avoid recursion, just show error
                throw new Error('Too many clarification rounds - please try a more specific query');
            } else if (result.status === 'error') {
                throw new Error(result.error || 'Unknown error from server');
            } else {
                console.warn('[FINDER] Unexpected result status:', result.status);
                throw new Error(`Unexpected response status: ${result.status}`);
            }
            
        } catch (error) {
            console.error('[FINDER] Error processing clarification:', error);
            this.showNotification('Error processing clarification: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(this.submitClarificationBtn, null, false, 'Continue with Search');
        }
    }
    
    skipClarification() {
        // Force proceed with original query by sending empty responses
        console.log('[FINDER] Skipping clarification, proceeding with original query');
        
        // Create a special request to skip clarification
        this.setButtonLoading(this.skipClarificationBtn, null, true, 'Skipping...');
        
        fetch('/api/finder/clarification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: this.currentSession,
                responses: ['skip clarification'],  // Special marker to skip
                skip: true
            })
        })
        .then(response => response.json())
        .then(result => {
            console.log('[FINDER] Skip clarification result:', result);
            
            if (result.status === 'orchestration_complete') {
                this.orchestrationData = {
                    csv_schema: result.csv_schema,
                    search_strategy: result.search_strategy
                };
                this.showSearchStrategy(result);
            } else {
                throw new Error(result.error || 'Failed to skip clarification');
            }
        })
        .catch(error => {
            console.error('[FINDER] Error skipping clarification:', error);
            this.showNotification('Error skipping clarification: ' + error.message, 'error');
        })
        .finally(() => {
            this.setButtonLoading(this.skipClarificationBtn, null, false, 'Skip & Use Original Query');
        });
    }
    
    showSearchStrategy(result) {
        // Show strategy overview
        const strategy = result.search_strategy;
        this.strategyOverview.innerHTML = `
            <div class="strategy-item">
                <span class="strategy-label">Target Count:</span>
                <span class="strategy-value">${strategy.target_count} leads</span>
            </div>
            <div class="strategy-item">
                <span class="strategy-label">Parallel Workers:</span>
                <span class="strategy-value">4 agents</span>
            </div>
            <div class="strategy-item">
                <span class="strategy-label">Searches per Worker:</span>
                <span class="strategy-value">${strategy.searches_per_worker} searches</span>
            </div>
            <div class="strategy-item">
                <span class="strategy-label">Estimated Time:</span>
                <span class="strategy-value">${result.estimated_time}</span>
            </div>
        `;
        
        // Show CSV schema preview
        const schema = result.csv_schema;
        this.csvSchemaPreview.innerHTML = `
            <h4>Output CSV Columns:</h4>
            <div class="schema-columns">
                ${schema.map(col => `
                    <div class="schema-column" title="${col.description}">
                        ${col.column}
                    </div>
                `).join('')}
            </div>
        `;
        
        this.transitionToStage('strategy');
    }
    
    async executeSearch() {
        if (!this.orchestrationData) {
            this.showNotification('No search strategy available', 'error');
            return;
        }
        
        console.log('[FINDER] Starting search with orchestration:', this.orchestrationData);
        console.log('[FINDER] Session ID:', this.currentSession);
        
        this.setButtonLoading(this.executeSearchBtn, this.executeSearchBtnText, true, 'Starting Search...');
        this.transitionToStage('progress');
        
        // Initialize progress
        this.updateProgress(0, '');
        this.initializeWorkerStatus(4);  // Always 4 workers for Clado integration
        
        try {
            console.log('[FINDER] Sending request to /api/finder/search');
            
            const response = await fetch('/api/finder/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession,
                    orchestration: this.orchestrationData
                })
            });
            
            console.log('[FINDER] Response status:', response.status);
            console.log('[FINDER] Response ok:', response.ok);
            
            const result = await response.json();
            console.log('[FINDER] Response data:', result);
            
            if (!response.ok) {
                throw new Error(result.error || `Server error: ${response.status}`);
            }
            
            // Update progress to 100%
            this.updateProgress(100, 'Search completed!');
            
            // Store CSV for download
            if (result.csv_content) {
                sessionStorage.setItem(`finder_csv_${this.currentSession}`, result.csv_content);
                console.log('[FINDER] CSV content stored in session storage');
            } else {
                console.warn('[FINDER] No CSV content in result');
            }
            
            this.showSearchResults(result);
            
        } catch (error) {
            console.error('[FINDER] Error executing search:', error);
            this.updateProgress(0, 'Search failed');
            
            // Show error in results stage
            this.resultsSummary.innerHTML = `
                <h4 style="color: var(--coral-pink);">Search Failed</h4>
                <p>Error: ${error.message}</p>
                <button type="button" class="btn btn-secondary" onclick="finderApp.transitionToStage('strategy')">
                    Try Again
                </button>
            `;
            this.transitionToStage('results');
            
            this.showNotification('Error executing search: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(this.executeSearchBtn, this.executeSearchBtnText, false, 'Start Lead Search');
        }
    }
    
    initializeWorkerStatus(workerCount) {
        this.workerStatus.innerHTML = '';
        for (let i = 0; i < workerCount; i++) {
            const workerDiv = document.createElement('div');
            workerDiv.className = 'worker-item';
            workerDiv.innerHTML = `
                <div class="worker-title">Agent ${i + 1}</div>
                <div class="worker-progress">Initializing...</div>
            `;
            this.workerStatus.appendChild(workerDiv);
        }
    }
    
    updateProgress(percentage, message) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = message;
    }
    
    showSearchResults(result) {
        console.log('[FINDER] Search result:', result);
        
        // Handle error case
        if (result.status === 'error') {
            this.resultsSummary.innerHTML = `
                <h4 style="color: var(--coral-pink);">Search Failed</h4>
                <p>Error: ${result.error}</p>
                <button type="button" class="btn btn-secondary" onclick="finderApp.transitionToStage('strategy')">
                    Try Again
                </button>
            `;
            this.transitionToStage('results');
            return;
        }
        
        // Get lead count and update download button
        const totalLeads = result.total_leads || 0;
        
        // Clear the results summary (no text needed)
        this.resultsSummary.innerHTML = '';
        
        // Update download button text with lead count
        if (this.downloadCsvBtn) {
            // Find the text node after the icon and update it
            const iconSpan = this.downloadCsvBtn.querySelector('.btn-icon');
            if (iconSpan && iconSpan.nextSibling) {
                iconSpan.nextSibling.textContent = `Download CSV with ${totalLeads} leads`;
            } else {
                // Fallback: replace all text content while preserving the icon
                const iconHtml = this.downloadCsvBtn.querySelector('.btn-icon').outerHTML;
                this.downloadCsvBtn.innerHTML = iconHtml + `Download CSV with ${totalLeads} leads`;
            }
        }
        
        this.transitionToStage('results');
    }
    
    downloadCsv() {
        if (!this.currentSession) {
            this.showNotification('No session data available', 'error');
            return;
        }
        
        // Try to get CSV from session storage first
        const csvContent = sessionStorage.getItem(`finder_csv_${this.currentSession}`);
        if (csvContent) {
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finder_results_${this.currentSession.substring(0, 8)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            // Fallback to server download
            window.open(`/api/finder/download/${this.currentSession}`, '_blank');
        }
    }
    
    toggleCsvPreview() {
        if (this.csvPreviewContainer.style.display === 'none') {
            this.showCsvPreview();
            // Update button text while preserving the icon
            const buttonText = this.previewCsvBtn.querySelector('.btn-icon').nextSibling;
            if (buttonText) {
                buttonText.textContent = 'Hide Preview';
            }
        } else {
            this.csvPreviewContainer.style.display = 'none';
            // Update button text while preserving the icon
            const buttonText = this.previewCsvBtn.querySelector('.btn-icon').nextSibling;
            if (buttonText) {
                buttonText.textContent = 'Preview Results';
            }
        }
    }
    
    showCsvPreview() {
        const csvContent = sessionStorage.getItem(`finder_csv_${this.currentSession}`);
        if (!csvContent) {
            this.showNotification('No CSV data available for preview', 'error');
            return;
        }
        
        // Parse CSV and create table
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',');
        const rows = lines.slice(1, 11); // Show first 10 rows
        
        let tableHtml = `
            <table class="csv-preview-table">
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header.trim()}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${row.split(',').map(cell => `<td>${cell.trim()}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        if (lines.length > 11) {
            tableHtml += `<p style="text-align: center; margin-top: 10px; color: var(--text-secondary);">
                Showing first 10 of ${lines.length - 1} results
            </p>`;
        }
        
        this.csvPreviewContainer.innerHTML = tableHtml;
        this.csvPreviewContainer.style.display = 'block';
    }
    
    resetSearch() {
        // Reset all stages
        this.transitionToStage('query');
        
        // Clear form data
        this.finderQuery.value = '';
        this.finderLeadCount.value = '50';  // Reset to default
        this.currentSession = null;
        this.orchestrationData = null;
        
        // Clear previews
        this.clarificationQuestions.innerHTML = '';
        this.strategyOverview.innerHTML = '';
        this.csvSchemaPreview.innerHTML = '';
        this.resultsSummary.innerHTML = '';
        this.csvPreviewContainer.innerHTML = '';
        this.csvPreviewContainer.style.display = 'none';
        
        // Reset progress
        this.updateProgress(0, '');
        this.workerStatus.innerHTML = '';
        
        this.showNotification('Ready for new search', 'success');
    }
    
    transitionToStage(stageName) {
        // Hide all stages
        const stages = [this.queryStage, this.clarificationStage, this.strategyStage, this.progressStage, this.resultsStage];
        stages.forEach(stage => {
            if (stage) stage.style.display = 'none';
        });
        
        // Show target stage
        switch (stageName) {
            case 'query':
                if (this.queryStage) this.queryStage.style.display = 'block';
                break;
            case 'clarification':
                if (this.clarificationStage) this.clarificationStage.style.display = 'block';
                break;
            case 'strategy':
                if (this.strategyStage) this.strategyStage.style.display = 'block';
                break;
            case 'progress':
                if (this.progressStage) this.progressStage.style.display = 'block';
                break;
            case 'results':
                if (this.resultsStage) this.resultsStage.style.display = 'block';
                break;
        }
        
        this.currentStage = stageName;
    }
    
    setButtonLoading(button, textElement, loading, loadingText) {
        if (!button) return;
        
        const spinner = button.querySelector('.spinner');
        
        if (loading) {
            button.disabled = true;
            if (textElement) textElement.textContent = loadingText;
            if (spinner) spinner.style.display = 'inline-block';
        } else {
            button.disabled = false;
            if (spinner) spinner.style.display = 'none';
        }
    }
    
    showNotification(message, type = 'info') {
        // Use the existing notification system from main.js
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Fallback alert
            alert(message);
        }
    }
}

// Initialize finder when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page with finder elements
    if (document.getElementById('finderContent')) {
        window.finderApp = new FinderApp();
        console.log('[FINDER] Finder app initialized');
    }
});