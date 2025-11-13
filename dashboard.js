// Check if user is logged in
const userId = localStorage.getItem('user_id');
if (!userId) {
    alert("Please log in first.");
    window.location.href = "login.html";
}

// Configuration for API endpoint
const API_CONFIG = {
    //baseUrl: 'http://localhost:8000', 
    baseUrl: 'https://nutriapp-backend-mnnq.onrender.com',
    endpoints: {
        sugarReadings: '/api/sugar-readings',
        waterIntake: '/api/water-intake',
        exercise: '/api/exercise',
        getReadings: '/api/readings',
        getDashboardData: '/api/dashboard-data'
    }
};

// Populate dashboard immediately after login
function populateDashboard(userData) {
    // Greeting
    document.querySelector(".user-name").textContent = userData.username || "User";
    document.querySelector(".welcome-title").textContent = `Good morning, ${userData.username || "User"}!`;

    // Last stats (handle blanks for new users)
    const stats = userData.last_stats || {};

    document.getElementById("currentReading").textContent = stats.current_reading ?? "--";
    document.getElementById("mainSugarReading").innerHTML = 
        stats.current_reading ? `${stats.current_reading}<span class="sugar-unit">mg/dL</span>` : "--";

    document.querySelector(".quick-stats .stat-item:nth-child(2) .stat-value").textContent = 
        stats.avg_a1c ? `${stats.avg_a1c}%` : "--";

    document.querySelector(".quick-stats .stat-item:nth-child(3) .stat-value").textContent = 
        stats.in_range ? `${stats.in_range}%` : "--";

    document.querySelector(".quick-stats .stat-item:nth-child(4) .stat-value").textContent = 
        stats.streak ? stats.streak : "--";

    // Status indicator (basic example)
    if (stats.current_reading) {
        let statusText = "Normal";
        let statusClass = "status-normal";
        if (stats.current_reading > 180) {
            statusText = "High";
            statusClass = "status-high";
        } else if (stats.current_reading < 70) {
            statusText = "Low";
            statusClass = "status-low";
        }
        const statusIndicator = document.getElementById("statusIndicator");
        statusIndicator.className = `status-indicator ${statusClass}`;
        statusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> ${statusText}`;
    } else {
        document.getElementById("statusIndicator").innerHTML = "--";
    }
}

// Global variables
let currentModal = null;
let sugarTrendChart = null;
let weeklyChart = null;

// API Helper functions
async function makeAPICall(endpoint, method = 'GET', data = null) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showNotification('Connection error. Please try again.', 'error');
        throw error;
    }
}

// Load dashboard data from API
async function loadDashboardData() {
    try {
        const userId = localStorage.getItem("user_id");
        const data = await makeAPICall(`${API_CONFIG.endpoints.getDashboardData}?user_id=${userId}`);
        updateDashboardUI(data);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        loadFallbackData();
    }
}

// Load recent readings
async function loadRecentReadings() {
    try {
        const userId = localStorage.getItem("user_id");
        const readings = await makeAPICall(
            `${API_CONFIG.endpoints.getReadings}?user_id=${userId}&limit=5`
        );
        updateRecentReadingsList(readings);
    } catch (error) {
        console.error('Failed to load recent readings:', error);
        updateRecentReadingsList([]);
    }
}

// Update recent readings list
function updateRecentReadingsList(readings) {
    const readingsList = document.getElementById('recentReadingsList');

    if (!readings || readings.length === 0) {
        readingsList.innerHTML = `
            <div class="reading-item">
                <span class="reading-time">No readings yet</span>
                <span class="reading-value">-- mg/dL</span>
            </div>
        `;
        return;
    }

    readingsList.innerHTML = readings.map(reading => {
        const date = new Date(reading.timestamp);
        const timeStr = date.toLocaleDateString() === new Date().toLocaleDateString()
            ? `Today ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
            : date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const colorClass = getReadingColor(reading.value);

        return `
            <div class="reading-item">
                <span class="reading-time">${timeStr}</span>
                <span class="reading-value" style="color: var(--${colorClass}-color);">${reading.value} mg/dL</span>
            </div>
        `;
    }).join('');
}

// Determine color based on blood sugar reading
function getReadingColor(value) {
    if (value < 70 || value > 180) return 'error';
    if (value < 80 || value > 140) return 'warning';
    return 'success';
}

// Update dashboard UI with loaded data
function updateDashboardUI(data) {
    if (data.currentReading) {
        const currentElement = document.getElementById('currentReading');
        const mainReadingElement = document.getElementById('mainSugarReading');
        const statusElement = document.getElementById('statusIndicator');

        if (currentElement) currentElement.textContent = data.currentReading.value;
        if (mainReadingElement) {
            const colorClass = getReadingColor(data.currentReading.value);
            mainReadingElement.innerHTML = `${data.currentReading.value}<span class="sugar-unit" style="font-size: 0.8rem;">mg/dL</span>`;
            mainReadingElement.style.color = `var(--${colorClass}-color)`;

            // Update status indicator
            const statusText = data.currentReading.value < 70 || data.currentReading.value > 180 ? 'High Risk' :
                             data.currentReading.value < 80 || data.currentReading.value > 140 ? 'Warning' : 'Normal';
            const statusIcon = statusText === 'Normal' ? 'fa-check-circle' :
                              statusText === 'Warning' ? 'fa-exclamation-triangle' : 'fa-times-circle';
            const statusClass = statusText === 'Normal' ? 'status-normal' :
                               statusText === 'Warning' ? 'status-warning' : 'status-danger';

            statusElement.className = `status-indicator ${statusClass}`;
            statusElement.innerHTML = `<i class="fas ${statusIcon}"></i> ${statusText}`;
        }
    }

    // Update progress bars
    if (data.todaysGoals) {
        updateProgressBars(data.todaysGoals);
    }

    // Update charts
    if (data.chartData) {
        updateCharts(data.chartData);
    }
}

// Update progress bars
function updateProgressBars(goals) {
    const elements = {
        readings: { progress: 'readingsProgress', bar: 'readingsProgressBar' },
        water: { progress: 'waterProgress', bar: 'waterProgressBar' },
        exercise: { progress: 'exerciseProgress', bar: 'exerciseProgressBar' }
    };

    Object.keys(elements).forEach(key => {
        if (goals[key]) {
            const progressEl = document.getElementById(elements[key].progress);
            const barEl = document.getElementById(elements[key].bar);

            if (progressEl && barEl) {
                progressEl.textContent = `${goals[key].current}/${goals[key].target} ${goals[key].unit || ''}`;
                const percentage = (goals[key].current / goals[key].target) * 100;
                barEl.style.width = `${Math.min(percentage, 100)}%`;
            }
        }
    });
}

// Initialize charts
function initCharts() {
    // Sugar Trend Chart
    const ctx1 = document.getElementById('sugarTrendChart');
    if (ctx1) {
        sugarTrendChart = new Chart(ctx1.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jul 15', 'Jul 16', 'Jul 17', 'Jul 18', 'Jul 19', 'Jul 20', 'Today'],
                datasets: [{
                    label: 'Blood Sugar',
                    data: [125, 118, 132, 128, 135, 122, 127],
                    borderColor: '#FF8C42',
                    backgroundColor: 'rgba(255, 140, 66, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FF8C42',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 80,
                        max: 180,
                        grid: {
                            color: 'rgba(78, 205, 196, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' mg/dL';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    // Weekly Overview Chart
    const ctx2 = document.getElementById('weeklyChart');
    if (ctx2) {
        weeklyChart = new Chart(ctx2.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['In Range', 'Above Range', 'Below Range'],
                datasets: [{
                    data: [85, 12, 3],
                    backgroundColor: ['#48BB78', '#ECC94B', '#E53E3E'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }
}

// Update charts with new data
function updateCharts(chartData) {
    if (chartData.sugarTrend && sugarTrendChart) {
        sugarTrendChart.data.labels = chartData.sugarTrend.labels;
        sugarTrendChart.data.datasets[0].data = chartData.sugarTrend.data;
        sugarTrendChart.update();
    }

    if (chartData.weeklyOverview && weeklyChart) {
        weeklyChart.data.datasets[0].data = chartData.weeklyOverview.data;
        weeklyChart.update();
    }
}

// Fallback data when API is not available
function loadFallbackData() {
    const fallbackData = {
        currentReading: { value: 127, timestamp: new Date() },
        todaysGoals: {
            readings: { current: 3, target: 4, unit: '' },
            water: { current: 6, target: 8, unit: 'cups' },
            exercise: { current: 22, target: 30, unit: 'min' }
        }
    };
    updateDashboardUI(fallbackData);
}

// Modal functions
function openModal(type) {
    const modals = {
        'sugar': 'sugarModal',
        'water': 'waterModal',
        'exercise': 'exerciseModal'
    };

    const modalId = modals[type];
    if (!modalId) return;

    const modal = document.getElementById(modalId);
    currentModal = modalId;

    // Set current date and time
    const now = new Date();
    const localDateTime = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + 'T' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');

    // Set time inputs based on modal type
    if (type === 'sugar') {
        document.getElementById('sugarTime').value = localDateTime;
    } else if (type === 'water') {
        document.getElementById('waterTime').value = localDateTime;
    } else if (type === 'exercise') {
        document.getElementById('exerciseTime').value = localDateTime;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (currentModal) {
        const modal = document.getElementById(currentModal);
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Reset forms and buttons
        const form = modal.querySelector('form');
        if (form) form.reset();

        // Reset submit buttons
        const submitBtns = ['sugarSubmitBtn', 'waterSubmitBtn', 'exerciseSubmitBtn'];
        submitBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = btn.innerHTML.replace('<div class="loading-spinner"></div>', '');
            }
        });
    }
    currentModal = null;
}

// Show loading state on button
function setButtonLoading(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (loading) {
        button.disabled = true;
        button.innerHTML = '<div class="loading-spinner"></div> Saving...';
    } else {
        button.disabled = false;
        // Reset to original text
        const originalTexts = {
            'sugarSubmitBtn': 'Save Reading',
            'waterSubmitBtn': 'Save Intake',
            'exerciseSubmitBtn': 'Save Exercise'
        };
        button.innerHTML = originalTexts[buttonId] || 'Save';
    }
}

// Handle form submissions
document.addEventListener('DOMContentLoaded', function() {
    // Sugar Form
    const sugarForm = document.getElementById('sugarForm');
    if (sugarForm) {
        sugarForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            setButtonLoading('sugarSubmitBtn', true);

            const formData = {
                value: parseFloat(document.getElementById('sugarReading').value),
                timestamp: document.getElementById('sugarTime').value,
                meal_context: document.getElementById('mealType').value,
                user_id: userId
            };

            try {
                await makeAPICall(API_CONFIG.endpoints.sugarReadings, 'POST', formData);
                showNotification(`Blood sugar reading of ${formData.value} mg/dL saved successfully!`, 'success');
                closeModal();

                // Refresh dashboard data
                await loadDashboardData();
                await loadRecentReadings();

            } catch (error) {
                console.error('Failed to save sugar reading:', error);
                showNotification('Failed to save reading. Please try again.', 'error');
            } finally {
                setButtonLoading('sugarSubmitBtn', false);
            }
        });
    }

    // Water Form
    const waterForm = document.getElementById('waterForm');
    if (waterForm) {
        waterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            setButtonLoading('waterSubmitBtn', true);

            const formData = {
                amount: parseFloat(document.getElementById('waterAmount').value),
                unit: document.getElementById('waterUnit').value,
                timestamp: document.getElementById('waterTime').value,
                source: document.getElementById('waterSource').value || null,
                user_id: userId
            };

            try {
                await makeAPICall(API_CONFIG.endpoints.waterIntake, 'POST', formData);
                showNotification(`Water intake of ${formData.amount} ${formData.unit} saved successfully!`, 'success');
                closeModal();

                // Refresh dashboard data
                await loadDashboardData();

            } catch (error) {
                console.error('Failed to save water intake:', error);
                showNotification('Failed to save water intake. Please try again.', 'error');
            } finally {
                setButtonLoading('waterSubmitBtn', false);
            }
        });
    }

    // Exercise Form
    const exerciseForm = document.getElementById('exerciseForm');
    if (exerciseForm) {
        exerciseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            setButtonLoading('exerciseSubmitBtn', true);

            const formData = {
                exercise_type: document.getElementById('exerciseType').value,
                duration_minutes: parseInt(document.getElementById('exerciseDuration').value),
                intensity: document.getElementById('exerciseIntensity').value,
                timestamp: document.getElementById('exerciseTime').value,
                notes: document.getElementById('exerciseNotes').value || null,
                user_id: userId
            };

            try {
                await makeAPICall(API_CONFIG.endpoints.exercise, 'POST', formData);
                showNotification(`${formData.exercise_type} exercise (${formData.duration_minutes} min) saved successfully!`, 'success');
                closeModal();

                // Refresh dashboard data
                await loadDashboardData();

            } catch (error) {
                console.error('Failed to save exercise:', error);
                showNotification('Failed to save exercise. Please try again.', 'error');
            } finally {
                setButtonLoading('exerciseSubmitBtn', false);
            }
        });
    }
});

// Close modal when clicking outside
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
});

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' :
                      type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48BB78' :
                     type === 'error' ? '#E53E3E' : '#4ECDC4'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
        max-width: 350px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (userData) {
        populateDashboard(userData);
    }

    initCharts();

    // Load data from API
    await loadDashboardData();
    await loadRecentReadings();

    // Animate progress bars
    setTimeout(() => {
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 100);
        });
    }, 500);

    // Add greeting based on time of day
    const hour = new Date().getHours();
    const welcomeTitle = document.querySelector('.welcome-title');
    let greeting = 'Good morning';

    if (hour >= 12 && hour < 17) {
        greeting = 'Good afternoon';
    } else if (hour >= 17) {
        greeting = 'Good evening';
    }

    const username = localStorage.getItem('username') || 'User';
    if (welcomeTitle) {
        welcomeTitle.textContent = `${greeting}, ${username}!`;
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        openModal('sugar');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        openModal('water');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        openModal('exercise');
    }

    if (e.key === 'Escape' && currentModal) {
        closeModal();
    }
});

// Enhanced form validation
const sugarReadingInput = document.getElementById('sugarReading');
if (sugarReadingInput) {
    sugarReadingInput.addEventListener('input', function(e) {
        const value = parseInt(e.target.value);
        const inputGroup = e.target.closest('.input-group');

        const existingMsg = inputGroup.querySelector('.validation-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        if (value && (value < 50 || value > 400)) {
            const message = document.createElement('div');
            message.className = 'validation-message';
            message.style.cssText = `
                color: #E53E3E;
                font-size: 0.8rem;
                margin-top: 0.25rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            `;
            message.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                Reading should be between 50-400 mg/dL
            `;
            inputGroup.appendChild(message);
        }
    });
}

// Periodic data refresh (every 5 minutes)
setInterval(async () => {
    await loadRecentReadings();
}, 5 * 60 * 1000);