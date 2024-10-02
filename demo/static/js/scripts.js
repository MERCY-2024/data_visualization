document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const messageDiv = document.getElementById('message');
    const buttonsDiv = document.getElementById('buttons');
    const chartCanvas = document.getElementById('chart');
    const ctx = chartCanvas.getContext('2d');
    let currentChart = null;
    let chartUrls = [];

    // Handle File Upload
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) {
            displayMessage('Please select a file to upload.', 'danger');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressBar.value = percentComplete;
                progressText.textContent = `${percentComplete}%`;
            }
        };

        xhr.onloadstart = function () {
            progressContainer.style.display = 'block';
            progressBar.value = 0;
            progressText.textContent = '0%';
            displayMessage('');
        };

        xhr.onload = function () {
            progressContainer.style.display = 'none';
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                displayMessage(response.message, 'success');
                buttonsDiv.style.display = 'block';
            } else {
                const response = JSON.parse(xhr.responseText);
                displayMessage(response.message, 'danger');
            }
        };

        xhr.onerror = function () {
            progressContainer.style.display = 'none';
            displayMessage('An error occurred during the upload.', 'danger');
        };

        xhr.send(formData);
    });

    // Function to Display Messages
    function displayMessage(message, type) {
        if (message === '') {
            messageDiv.innerHTML = '';
            return;
        }
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        messageDiv.innerHTML = '';
        messageDiv.appendChild(alertDiv);
    }

    // Generate Chart Function
    window.generateChart = function(chartType = 'bar') {
        const filename = fileInput.files[0]?.name;
        if (!filename) {
            displayMessage('Please upload a file first.', 'warning');
            return;
        }

        fetch('/generate_chart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: chartType, filename: filename })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                displayMessage('Chart generated successfully.', 'success');
                const img = new Image();
                img.src = `/${data.chart_url}`;
                img.alt = `${chartType} chart`;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                messageDiv.appendChild(img);
                chartUrls.push(data.chart_url);
            } else {
                displayMessage(data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error generating chart:', error);
            displayMessage('An error occurred while generating the chart.', 'danger');
        });
    };

    // Clear Charts Function
    window.clearChart = function() {
        fetch('/clear', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    displayMessage(data.message, 'success');
                    chartUrls = [];
                    // Clear any displayed images
                    const images = messageDiv.getElementsByTagName('img');
                    while(images.length > 0){
                        images[0].parentNode.removeChild(images[0]);
                    }
                    // Optionally, clear the canvas if used
                    if (currentChart) {
                        currentChart.destroy();
                        currentChart = null;
                    }
                } else {
                    displayMessage(data.message, 'danger');
                }
            })
            .catch(error => {
                console.error('Error clearing files:', error);
                displayMessage('An error occurred while clearing files.', 'danger');
            });
    };

    // Download Report Function
    window.downloadReport = function() {
        if (chartUrls.length === 0) {
            displayMessage('No charts to include in the report.', 'warning');
            return;
        }

        // Assuming the latest uploaded filename is used for report generation
        const filename = fileInput.files[0]?.name;
        if (!filename) {
            displayMessage('Please upload a file first.', 'warning');
            return;
        }

        fetch('/generate_report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: filename, charts: chartUrls })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                displayMessage('Report generated successfully.', 'success');
                // Redirect to download the report
                window.location.href = data.report_url;
            } else {
                displayMessage(data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error generating report:', error);
            displayMessage('An error occurred while generating the report.', 'danger');
        });
    };
});
