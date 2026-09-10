document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadBox = document.getElementById('uploadBox');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const uploadStatus = document.getElementById('uploadStatus');
    const jobIdInput = document.getElementById('jobIdInput');
    const statusBtn = document.getElementById('statusBtn');
    const statusResult = document.getElementById('statusResult');
    const recentJobsContainer = document.getElementById('recentJobs');

    let selectedFile = null;
    let recentJobs = [];

    // Load recent jobs from localStorage
    loadRecentJobs();

    // --- File Upload ---

    // Click upload box to trigger file input
    uploadBox.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            fileInput.click();
        }
    });

    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            uploadBtn.disabled = false;
            uploadBox.querySelector('p:first-of-type').textContent = `📁 ${selectedFile.name}`;
            uploadBox.querySelector('.small').textContent = `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`;
        }
    });

    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];

            // Check if it's a video
            if (!file.type.startsWith('video/')) {
                showUploadStatus('Please upload a video file', 'error');
                return;
            }

            selectedFile = file;
            uploadBtn.disabled = false;
            uploadBox.querySelector('p:first-of-type').textContent = `📁 ${file.name}`;
            uploadBox.querySelector('.small').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

            // Auto-upload
            uploadVideo();
        }
    });

    // Upload button click
    uploadBtn.addEventListener('click', uploadVideo);

    // --- Upload Video ---

    async function uploadVideo() {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('video', selectedFile);

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
        showUploadStatus('Uploading video...', 'info');

        try {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    progressFill.style.width = percent + '%';
                }
            });

            xhr.open('POST', '/api/videos/upload');

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    progressFill.style.width = '100%';
                    showUploadStatus(`✅ Upload complete! Job ID: ${response.jobId}`, 'success');

                    // Add to recent jobs
                    addRecentJob({
                        jobId: response.jobId,
                        status: 'PENDING',
                        createdAt: new Date().toISOString()
                    });

                    // Reset after delay
                    setTimeout(() => {
                        resetUpload();
                    }, 3000);
                } else {
                    const error = JSON.parse(xhr.responseText);
                    showUploadStatus(`❌ Upload failed: ${error.message || 'Unknown error'}`, 'error');
                    resetUpload();
                }
            };

            xhr.onerror = () => {
                showUploadStatus('❌ Network error. Please try again.', 'error');
                resetUpload();
            };

            xhr.send(formData);

        } catch (error) {
            showUploadStatus(`❌ Error: ${error.message}`, 'error');
            resetUpload();
        }
    }

    function resetUpload() {
        selectedFile = null;
        fileInput.value = '';
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Upload Video';
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
        uploadBox.querySelector('p:first-of-type').textContent = 'Drag & drop your video here';
        uploadBox.querySelector('.small').textContent = 'or click to browse';
    }

    function showUploadStatus(message, type) {
        uploadStatus.textContent = message;
        uploadStatus.className = type || '';
    }

    // --- Check Status ---

    statusBtn.addEventListener('click', checkStatus);
    jobIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkStatus();
        }
    });

    async function checkStatus() {
        const jobId = jobIdInput.value.trim();
        if (!jobId) {
            statusResult.className = 'visible error';
            statusResult.innerHTML = `
                <div class="status-label">❌ Please enter a Job ID</div>
            `;
            return;
        }

        statusResult.className = 'visible pending';
        statusResult.innerHTML = `
            <div class="status-label">⏳ Checking status...</div>
        `;

        try {
            const response = await fetch(`/api/videos/status/${jobId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    statusResult.className = 'visible error';
                    statusResult.innerHTML = `
                        <div class="status-label">❌ Job not found</div>
                        <div class="status-detail">No job found with ID: ${jobId}</div>
                    `;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
                return;
            }

            const data = await response.json();
            const statusClass = data.status.toLowerCase();

            statusResult.className = `visible ${statusClass}`;
            statusResult.innerHTML = `
                <div class="status-label">Job Status</div>
                <div class="status-value status-${statusClass}">📊 ${data.status}</div>
                <div class="status-detail">Job ID: ${data.jobId}</div>
                <div class="status-detail">Created: ${formatDate(data.createdAt)}</div>
                <div class="status-detail">Updated: ${formatDate(data.updatedAt)}</div>
                ${data.errorMessage ? `<div class="status-detail" style="color:#c62828;">Error: ${data.errorMessage}</div>` : ''}
            `;

            // Update recent jobs
            updateRecentJob(data.jobId, data.status);

        } catch (error) {
            statusResult.className = 'visible error';
            statusResult.innerHTML = `
                <div class="status-label">❌ Error</div>
                <div class="status-detail">${error.message}</div>
            `;
        }
    }

    // --- Recent Jobs ---

    function loadRecentJobs() {
        try {
            const stored = localStorage.getItem('recentJobs');
            if (stored) {
                recentJobs = JSON.parse(stored);
                renderRecentJobs();
            }
        } catch (e) {
            console.error('Failed to load recent jobs:', e);
        }
    }

    function saveRecentJobs() {
        try {
            localStorage.setItem('recentJobs', JSON.stringify(recentJobs));
        } catch (e) {
            console.error('Failed to save recent jobs:', e);
        }
    }

    function addRecentJob(job) {
        // Check if already exists
        const existing = recentJobs.find(j => j.jobId === job.jobId);
        if (!existing) {
            recentJobs.unshift(job);
            if (recentJobs.length > 20) {
                recentJobs.pop();
            }
            saveRecentJobs();
            renderRecentJobs();
        }
    }

    function updateRecentJob(jobId, status) {
        const job = recentJobs.find(j => j.jobId === jobId);
        if (job) {
            job.status = status;
            saveRecentJobs();
            renderRecentJobs();
        }
    }

    function renderRecentJobs() {
        if (recentJobs.length === 0) {
            recentJobsContainer.innerHTML = '<p class="no-jobs">No jobs processed yet</p>';
            return;
        }

        let html = '';
        recentJobs.forEach(job => {
            const statusClass = job.status.toLowerCase();
            const statusDisplay = job.status.charAt(0) + job.status.slice(1).toLowerCase();
            html += `
                <div class="job-item">
                    <span class="job-id">${job.jobId}</span>
                    <span class="job-status ${statusClass}">${statusDisplay}</span>
                </div>
            `;
        });
        recentJobsContainer.innerHTML = html;
    }

    // --- Helper Functions ---

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // Auto-check status when clicking on recent job
    document.addEventListener('click', (e) => {
        const jobItem = e.target.closest('.job-item');
        if (jobItem) {
            const jobId = jobItem.querySelector('.job-id')?.textContent;
            if (jobId) {
                jobIdInput.value = jobId;
                checkStatus();
            }
        }
    });
});