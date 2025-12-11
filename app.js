// ===================================
// State Management
// ===================================
let expenses = [];
let editingId = null;
let currentCurrency = 'USD';
let isDarkMode = true;
let currentUser = null; // Current logged-in user

// ===================================
// Authentication State
// ===================================
const AUTH_KEY = 'exptrack_users';
const CURRENT_USER_KEY = 'exptrack_current_user';

// Currency symbols mapping
const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'NPR': 'रू',
    'JPY': '¥',
    'AUD': 'A$',
    'CAD': 'C$'
};

// Category icons mapping
const categoryIcons = {
    'Food': '🍔',
    'Transport': '🚗',
    'Shopping': '🛍️',
    'Entertainment': '🎬',
    'Bills': '💡',
    'Health': '🏥',
    'Education': '📚',
    'Other': '📌'
};

// Chart instances
let categoryChart = null;
let trendChart = null;

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupAuthEventListeners();
});

function checkAuthStatus() {
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
        initializeApp();
        setupEventListeners();
        loadExpenses();
        updateDashboard();
        renderExpenses();
        renderCharts();
    } else {
        showAuthScreen();
    }
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.main').style.display = 'none';
    document.querySelector('.footer').style.display = 'none';
}

function showMainApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.querySelector('.header').style.display = 'block';
    document.querySelector('.main').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';

    // Update user email display
    if (currentUser) {
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('logout-btn').style.display = 'inline-flex';
    }
}

function initializeApp() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expense-date').value = today;

    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        isDarkMode = false;
    }

    // Load currency preference
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) {
        currentCurrency = savedCurrency;
        document.getElementById('currency-selector').value = savedCurrency;
    }
}

// ===================================
// Event Listeners
// ===================================
function setupEventListeners() {
    // Form submission
    document.getElementById('expense-form').addEventListener('submit', handleFormSubmit);

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Currency selector
    document.getElementById('currency-selector').addEventListener('change', handleCurrencyChange);

    // Filters
    document.getElementById('filter-category').addEventListener('change', renderExpenses);
    document.getElementById('filter-start-date').addEventListener('change', renderExpenses);
    document.getElementById('filter-end-date').addEventListener('change', renderExpenses);
    document.getElementById('search-input').addEventListener('input', renderExpenses);
    document.getElementById('sort-by').addEventListener('change', renderExpenses);

    // Export and clear
    document.getElementById('export-btn').addEventListener('click', showExportModal);
    document.getElementById('clear-all-btn').addEventListener('click', clearAllExpenses);

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeExportModal);
    document.getElementById('export-csv').addEventListener('click', () => exportData('csv'));
    document.getElementById('export-json').addEventListener('click', () => exportData('json'));

    // Cancel edit
    document.getElementById('cancel-btn').addEventListener('click', cancelEdit);

    // Close modal on outside click
    document.getElementById('export-modal').addEventListener('click', (e) => {
        if (e.target.id === 'export-modal') {
            closeExportModal();
        }
    });
}

// ===================================
// Authentication Event Listeners
// ===================================
function setupAuthEventListeners() {
    // Login form
    document.getElementById('login-form-element').addEventListener('submit', handleLogin);

    // Signup form
    document.getElementById('signup-form-element').addEventListener('submit', handleSignup);

    // Toggle between login and signup
    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

// ===================================
// Authentication Functions
// ===================================
function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    // Get existing users
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');

    // Check if user already exists
    if (users[email]) {
        alert('An account with this email already exists!');
        return;
    }

    // Create new user
    const newUser = {
        name,
        email,
        password: btoa(password), // Simple encoding (not secure for production)
        createdAt: new Date().toISOString(),
        expenses: []
    };

    users[email] = newUser;
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));

    // Auto login
    currentUser = newUser;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

    // Reset form
    e.target.reset();

    // Show main app
    showMainApp();
    initializeApp();
    setupEventListeners();
    loadExpenses();
    updateDashboard();
    renderExpenses();
    renderCharts();

    showNotification(`Welcome, ${name}! Your account has been created.`);
}

function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    // Get existing users
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');

    // Check if user exists
    if (!users[email]) {
        alert('No account found with this email!');
        return;
    }

    // Verify password
    if (atob(users[email].password) !== password) {
        alert('Incorrect password!');
        return;
    }

    // Login successful
    currentUser = users[email];
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

    // Reset form
    e.target.reset();

    // Show main app
    showMainApp();
    initializeApp();
    setupEventListeners();
    loadExpenses();
    updateDashboard();
    renderExpenses();
    renderCharts();

    showNotification(`Welcome back, ${currentUser.name}!`);
}

function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;

    // Save current expenses before logout
    saveExpenses();

    // Clear current user
    currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);

    // Clear app state
    expenses = [];

    // Show auth screen
    showAuthScreen();

    showNotification('You have been logged out successfully.');
}

// ===================================
// Expense Management
// ===================================
function handleFormSubmit(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const description = document.getElementById('expense-description').value;

    const expense = {
        id: editingId || Date.now(),
        amount,
        category,
        date,
        description,
        currency: currentCurrency,
        createdAt: editingId ? expenses.find(e => e.id === editingId).createdAt : new Date().toISOString()
    };

    if (editingId) {
        const index = expenses.findIndex(e => e.id === editingId);
        expenses[index] = expense;
        editingId = null;
        document.getElementById('submit-btn').innerHTML = '<span>Add Expense</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M13 8H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        document.getElementById('cancel-btn').style.display = 'none';
    } else {
        expenses.unshift(expense);
    }

    saveExpenses();
    updateDashboard();
    renderExpenses();
    renderCharts();

    // Reset form
    e.target.reset();
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

    // Show success animation
    showNotification('Expense saved successfully!');
}

function editExpense(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    editingId = id;

    document.getElementById('expense-amount').value = expense.amount;
    document.getElementById('expense-category').value = expense.category;
    document.getElementById('expense-date').value = expense.date;
    document.getElementById('expense-description').value = expense.description;

    document.getElementById('submit-btn').innerHTML = '<span>Update Expense</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L6 10L4 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.getElementById('cancel-btn').style.display = 'inline-flex';

    // Scroll to form
    document.querySelector('.expense-form-section').scrollIntoView({ behavior: 'smooth' });
}

function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    expenses = expenses.filter(e => e.id !== id);
    saveExpenses();
    updateDashboard();
    renderExpenses();
    renderCharts();

    showNotification('Expense deleted successfully!');
}

function cancelEdit() {
    editingId = null;
    document.getElementById('expense-form').reset();
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('submit-btn').innerHTML = '<span>Add Expense</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M13 8H3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    document.getElementById('cancel-btn').style.display = 'none';
}

function clearAllExpenses() {
    if (!confirm('Are you sure you want to delete ALL expenses? This action cannot be undone.')) return;

    expenses = [];
    saveExpenses();
    updateDashboard();
    renderExpenses();
    renderCharts();

    showNotification('All expenses cleared!');
}

// ===================================
// Data Persistence
// ===================================
function saveExpenses() {
    if (!currentUser) return;

    // Update user's expenses in the users database
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    if (users[currentUser.email]) {
        users[currentUser.email].expenses = expenses;
        localStorage.setItem(AUTH_KEY, JSON.stringify(users));

        // Also update current user object
        currentUser.expenses = expenses;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }
}

function loadExpenses() {
    if (!currentUser) return;

    // Load expenses from current user
    expenses = currentUser.expenses || [];
}

// ===================================
// Dashboard Updates
// ===================================
function updateDashboard() {
    const symbol = currencySymbols[currentCurrency];

    // Total expenses
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('total-expenses').textContent = `${symbol}${total.toFixed(2)}`;

    // This month expenses
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('month-expenses').textContent = `${symbol}${monthTotal.toFixed(2)}`;

    // Update month label
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('month-trend').textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Categories count
    const categories = new Set(expenses.map(exp => exp.category));
    document.getElementById('category-count').textContent = categories.size;

    // Average per day this month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const avgPerDay = monthTotal / daysInMonth;
    document.getElementById('avg-expenses').textContent = `${symbol}${avgPerDay.toFixed(2)}`;
}

// ===================================
// Rendering
// ===================================
function renderExpenses() {
    const container = document.getElementById('expenses-list');
    const filtered = getFilteredExpenses();

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💸</div>
                <h3>No expenses found</h3>
                <p>Try adjusting your filters or add a new expense!</p>
            </div>
        `;
        return;
    }

    const symbol = currencySymbols[currentCurrency];

    container.innerHTML = filtered.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-category-icon">${categoryIcons[expense.category]}</div>
                <div class="expense-details">
                    <h4>${expense.description}</h4>
                    <div class="expense-meta">
                        <span>📁 ${expense.category}</span>
                        <span>📅 ${formatDate(expense.date)}</span>
                    </div>
                </div>
            </div>
            <div class="expense-amount">${symbol}${expense.amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="icon-btn edit" onclick="editExpense(${expense.id})" aria-label="Edit expense">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M12.5 2.5L15.5 5.5L6 15H3V12L12.5 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="icon-btn delete" onclick="deleteExpense(${expense.id})" aria-label="Delete expense">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 5H15M7 8V13M11 8V13M4 5L5 15C5 15.5 5.5 16 6 16H12C12.5 16 13 15.5 13 15L14 5M7 5V3C7 2.5 7.5 2 8 2H10C10.5 2 11 2.5 11 3V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function getFilteredExpenses() {
    let filtered = [...expenses];

    // Filter by category
    const categoryFilter = document.getElementById('filter-category').value;
    if (categoryFilter) {
        filtered = filtered.filter(exp => exp.category === categoryFilter);
    }

    // Filter by date range
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;

    if (startDate) {
        filtered = filtered.filter(exp => exp.date >= startDate);
    }

    if (endDate) {
        filtered = filtered.filter(exp => exp.date <= endDate);
    }

    // Search filter
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(exp =>
            exp.description.toLowerCase().includes(searchTerm) ||
            exp.category.toLowerCase().includes(searchTerm)
        );
    }

    // Sort
    const sortBy = document.getElementById('sort-by').value;
    switch (sortBy) {
        case 'date-desc':
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'amount-desc':
            filtered.sort((a, b) => b.amount - a.amount);
            break;
        case 'amount-asc':
            filtered.sort((a, b) => a.amount - b.amount);
            break;
    }

    return filtered;
}

// ===================================
// Charts
// ===================================
function renderCharts() {
    renderCategoryChart();
    renderTrendChart();
}

function renderCategoryChart() {
    const ctx = document.getElementById('category-chart');

    // Calculate category totals
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (categoryChart) {
        categoryChart.destroy();
    }

    if (labels.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(240, 147, 251, 0.8)',
                    'rgba(245, 87, 108, 0.8)',
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(0, 242, 254, 0.8)',
                    'rgba(250, 112, 154, 0.8)',
                    'rgba(254, 225, 64, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#b4b4c8' : '#4a4a5e',
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const symbol = currencySymbols[currentCurrency];
                            return `${context.label}: ${symbol}${context.parsed.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderTrendChart() {
    const ctx = document.getElementById('trend-chart');

    // Get last 6 months data
    const monthlyData = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = 0;
    }

    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        const key = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData.hasOwnProperty(key)) {
            monthlyData[key] += exp.amount;
        }
    });

    const labels = Object.keys(monthlyData).map(key => {
        const [year, month] = key.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    const data = Object.values(monthlyData);

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Expenses',
                data: data,
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const symbol = currencySymbols[currentCurrency];
                            return `${symbol}${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: isDarkMode ? '#b4b4c8' : '#4a4a5e',
                        callback: function (value) {
                            const symbol = currencySymbols[currentCurrency];
                            return symbol + value;
                        }
                    }
                },
                x: {
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: isDarkMode ? '#b4b4c8' : '#4a4a5e'
                    }
                }
            }
        }
    });
}

// ===================================
// Theme & Currency
// ===================================
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    isDarkMode = !isDarkMode;
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

    // Re-render charts with new theme colors
    renderCharts();
}

function handleCurrencyChange(e) {
    currentCurrency = e.target.value;
    localStorage.setItem('currency', currentCurrency);
    updateDashboard();
    renderExpenses();
    renderCharts();
}

// ===================================
// Export
// ===================================
function showExportModal() {
    document.getElementById('export-modal').classList.add('active');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.remove('active');
}

function exportData(format) {
    if (expenses.length === 0) {
        alert('No expenses to export!');
        return;
    }

    let content, filename, type;

    if (format === 'csv') {
        content = convertToCSV(expenses);
        filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        type = 'text/csv';
    } else {
        content = JSON.stringify(expenses, null, 2);
        filename = `expenses_${new Date().toISOString().split('T')[0]}.json`;
        type = 'application/json';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    closeExportModal();
    showNotification(`Data exported as ${format.toUpperCase()}!`);
}

function convertToCSV(data) {
    const headers = ['ID', 'Date', 'Category', 'Description', 'Amount', 'Currency'];
    const rows = data.map(exp => [
        exp.id,
        exp.date,
        exp.category,
        `"${exp.description}"`,
        exp.amount,
        exp.currency
    ]);

    return [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
}

// ===================================
// Utilities
// ===================================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
