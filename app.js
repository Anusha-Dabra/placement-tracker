/**
 * PlacementPal Application
 * A modern placement and internship tracking application
 * Built with vanilla JavaScript
 */

const app = (() => {
    // Application State
    let state = {
        currentUser: null,
        companies: [],
        editingId: null,
        currentFilter: 'all',
        currentSort: 'deadline'
    };

    // Constants
    const STATUSES = [
        { id: 'interested', label: 'Interested' },
        { id: 'applied', label: 'Applied' },
        { id: 'interview', label: 'Interview' },
        { id: 'offer', label: 'Offer' },
        { id: 'rejected', label: 'Rejected' }
    ];

    const STORAGE_KEYS = {
        users: 'placementpal_users',
        lastUser: 'placementpal_lastUser',
        placements: (user) => `placements_${user}`,
        lastCheck: (user) => `placementpal_lastCheck_${user}`
    };

    // DOM Elements Cache
    const elements = {};

    /**
     * Initialize the application
     */
    function init() {
        cacheElements();
        loadUsers();
        requestNotificationPermission();
        setupEventListeners();
    }

    /**
     * Cache frequently used DOM elements
     */
    function cacheElements() {
        elements.welcomeScreen = document.getElementById('welcomeScreen');
        elements.mainHeader = document.getElementById('mainHeader');
        elements.mainApp = document.getElementById('mainApp');
        elements.userNameInput = document.getElementById('userNameInput');
        elements.currentUserName = document.getElementById('currentUserName');
        elements.userDropdown = document.getElementById('userDropdown');
        elements.notificationBanner = document.getElementById('notificationBanner');
        elements.notificationBadge = document.getElementById('notificationBadge');
        elements.bannerText = document.getElementById('bannerText');
        elements.companyForm = document.getElementById('companyForm');
        elements.companiesGrid = document.getElementById('companiesGrid');
        elements.emptyState = document.getElementById('emptyState');
        elements.moreDetails = document.getElementById('moreDetails');
        elements.toggleIcon = document.getElementById('toggleIcon');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Close dropdowns when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.user-menu')) {
                closeUserMenu();
            }
        });
    }

    /**
     * Request notification permission from browser
     */
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // ========================================================================
    // User Management
    // ========================================================================

    /**
     * Load existing users from localStorage
     */
    function loadUsers() {
        const savedUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '[]');
        const lastUser = localStorage.getItem(STORAGE_KEYS.lastUser);

        if (lastUser && savedUsers.includes(lastUser)) {
            loginUser(lastUser);
        } else {
            showExistingUsers();
        }
    }

    /**
     * Create a new user
     */
    function createUser() {
        const name = elements.userNameInput.value.trim();

        if (!name) {
            alert('Please enter your name');
            return;
        }

        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '[]');
        if (!users.includes(name)) {
            users.push(name);
            localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
        }

        loginUser(name);
    }

    /**
     * Login user and show main app
     */
    function loginUser(userName) {
        state.currentUser = userName;
        localStorage.setItem(STORAGE_KEYS.lastUser, userName);

        elements.welcomeScreen.classList.add('hidden');
        elements.mainHeader.classList.remove('hidden');
        elements.mainApp.classList.remove('hidden');
        elements.currentUserName.textContent = userName;

        loadUserData();
        updateUserDropdown();
        checkNotifications();
    }

    /**
     * Logout current user
     */
    function logout() {
        state.currentUser = null;
        state.companies = [];

        elements.mainHeader.classList.add('hidden');
        elements.mainApp.classList.add('hidden');
        elements.welcomeScreen.classList.remove('hidden');
        elements.userNameInput.value = '';

        showExistingUsers();
        closeUserMenu();
    }

    /**
     * Show existing users on welcome screen
     */
    function showExistingUsers() {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '[]');
        const container = document.getElementById('existingUsers');

        if (users.length > 0) {
            container.innerHTML = '<p style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; opacity: 0.6;">Or continue as:</p>';
            users.forEach(user => {
                const btn = document.createElement('button');
                btn.className = 'btn btn-secondary';
                btn.style.width = '100%';
                btn.style.marginBottom = '0.5rem';
                btn.textContent = user;
                btn.onclick = () => loginUser(user);
                container.appendChild(btn);
            });
        } else {
            container.innerHTML = '';
        }
    }

    /**
     * Update user dropdown menu
     */
    function updateUserDropdown() {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '[]');
        const container = document.getElementById('otherUsers');
        container.innerHTML = '';

        users.filter(u => u !== state.currentUser).forEach(user => {
            const btn = document.createElement('button');
            btn.textContent = user;
            btn.onclick = () => {
                closeUserMenu();
                loginUser(user);
            };
            container.appendChild(btn);
        });
    }

    /**
     * Toggle user menu dropdown
     */
    function toggleUserMenu() {
        elements.userDropdown.classList.toggle('active');
    }

    /**
     * Close user menu dropdown
     */
    function closeUserMenu() {
        elements.userDropdown.classList.remove('active');
    }

    /**
     * Handle Enter key on welcome screen
     */
    function handleWelcomeEnter(event) {
        if (event.key === 'Enter') {
            createUser();
        }
    }

    // ========================================================================
    // Data Management
    // ========================================================================

    /**
     * Load user data from localStorage
     */
    function loadUserData() {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.placements(state.currentUser)) || '[]');
        state.companies = data;
        renderCompanies();
        updateStats();
    }

    /**
     * Save user data to localStorage
     */
    function saveUserData() {
        localStorage.setItem(STORAGE_KEYS.placements(state.currentUser), JSON.stringify(state.companies));
        renderCompanies();
        updateStats();
        checkNotifications();
    }

    // ========================================================================
    // Priority and Date Calculations
    // ========================================================================

    /**
     * Calculate priority based on deadline
     */
    function calculatePriority(deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) return 'high';
        if (diffDays <= 15) return 'medium';
        return 'low';
    }

    /**
     * Calculate days remaining until deadline
     */
    function calculateDaysRemaining(deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        return Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get priority color scheme
     */
    function getPriorityColor(priority) {
        const colors = {
            high: { bg: '#FECDD3', text: '#E11D48' },
            medium: { bg: '#FEF08A', text: '#CA8A04' },
            low: { bg: '#BBF7D0', text: '#15803D' }
        };
        return colors[priority] || colors.low;
    }

    /**
     * Get urgency color based on days remaining
     */
    function getUrgencyColor(daysLeft) {
        if (daysLeft <= 2) return '#E11D48';
        if (daysLeft <= 5) return '#F97316';
        return '#15803D';
    }

    // ========================================================================
    // Form Management
    // ========================================================================

    /**
     * Toggle company form visibility
     */
    function toggleForm() {
        elements.companyForm.classList.toggle('hidden');
        if (!elements.companyForm.classList.contains('hidden')) {
            state.editingId = null;
            document.getElementById('formTitle').textContent = 'Add New Company';
            document.getElementById('submitBtn').textContent = 'Add Company';
            resetForm();
        }
    }

    /**
     * Toggle more details section
     */
    function toggleMoreDetails() {
        elements.moreDetails.classList.toggle('active');
        elements.toggleIcon.textContent = elements.moreDetails.classList.contains('active') ? '▴' : '▾';
    }

    /**
     * Reset form fields
     */
    function resetForm() {
        document.getElementById('companyName').value = '';
        document.getElementById('deadline').value = '';
        document.getElementById('role').value = '';
        document.getElementById('stipend').value = '';
        document.getElementById('location').value = '';
        document.getElementById('notes').value = '';
        elements.moreDetails.classList.remove('active');
        elements.toggleIcon.textContent = '▾';
    }

    /**
     * Cancel form and hide
     */
    function cancelForm() {
        elements.companyForm.classList.add('hidden');
        state.editingId = null;
        resetForm();
    }

    /**
     * Save company (add or update)
     */
    function saveCompany(event) {
        event.preventDefault();

        const company = {
            id: state.editingId || Date.now().toString(),
            companyName: document.getElementById('companyName').value,
            deadline: document.getElementById('deadline').value,
            role: document.getElementById('role').value,
            stipend: document.getElementById('stipend').value,
            location: document.getElementById('location').value,
            notes: document.getElementById('notes').value,
            status: state.editingId ? state.companies.find(c => c.id === state.editingId).status : 'interested',
            createdAt: state.editingId ? state.companies.find(c => c.id === state.editingId).createdAt : Date.now()
        };

        company.priority = calculatePriority(company.deadline);

        if (state.editingId) {
            const index = state.companies.findIndex(c => c.id === state.editingId);
            state.companies[index] = company;
        } else {
            state.companies.push(company);
        }

        saveUserData();
        cancelForm();
    }

    /**
     * Edit existing company
     */
    function editCompany(id) {
        const company = state.companies.find(c => c.id === id);
        if (!company) return;

        state.editingId = id;
        document.getElementById('formTitle').textContent = 'Edit Company';
        document.getElementById('submitBtn').textContent = 'Update Company';
        document.getElementById('companyName').value = company.companyName;
        document.getElementById('deadline').value = company.deadline;
        document.getElementById('role').value = company.role || '';
        document.getElementById('stipend').value = company.stipend || '';
        document.getElementById('location').value = company.location || '';
        document.getElementById('notes').value = company.notes || '';

        elements.companyForm.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Delete company
     */
    function deleteCompany(id) {
        if (confirm('Are you sure you want to delete this company?')) {
            state.companies = state.companies.filter(c => c.id !== id);
            saveUserData();
        }
    }

    /**
     * Update company status
     */
    function updateStatus(id, status) {
        const company = state.companies.find(c => c.id === id);
        if (company) {
            company.status = status;
            saveUserData();
        }
    }

    // ========================================================================
    // Filtering and Sorting
    // ========================================================================

    /**
     * Set filter
     */
    function setFilter(filter) {
        state.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const isActive = btn.dataset.filter === filter;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
        renderCompanies();
    }

    /**
     * Set sort order
     */
    function setSort(sort) {
        state.currentSort = sort;
        document.querySelectorAll('.sort-btn').forEach(btn => {
            const isActive = btn.dataset.sort === sort;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
        renderCompanies();
    }

    /**
     * Get filtered and sorted companies
     */
    function getFilteredAndSortedCompanies() {
        let filtered = state.currentFilter === 'all'
            ? state.companies
            : state.companies.filter(c => c.status === state.currentFilter);

        return filtered.sort((a, b) => {
            if (state.currentSort === 'deadline') {
                return new Date(a.deadline) - new Date(b.deadline);
            }
            if (state.currentSort === 'priority') {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return b.createdAt - a.createdAt;
        });
    }

    // ========================================================================
    // Rendering
    // ========================================================================

    /**
     * Render companies grid
     */
    function renderCompanies() {
        const filtered = getFilteredAndSortedCompanies();

        if (filtered.length === 0) {
            elements.companiesGrid.innerHTML = '';
            elements.emptyState.classList.remove('hidden');
            return;
        }

        elements.emptyState.classList.add('hidden');
        elements.companiesGrid.innerHTML = filtered.map(company => {
            const daysLeft = calculateDaysRemaining(company.deadline);
            const priorityColor = getPriorityColor(company.priority);
            const urgencyColor = getUrgencyColor(daysLeft);

            return `
                <div class="company-card" role="listitem">
                    <div class="company-header">
                        <div>
                            <div class="company-name">${escapeHtml(company.companyName)}</div>
                            <span class="priority-badge" style="background: ${priorityColor.bg}; color: ${priorityColor.text};">
                                🔥 ${company.priority.toUpperCase()}
                            </span>
                        </div>
                        <div class="company-actions">
                            <button class="icon-btn" onclick="app.editCompany('${company.id}')" title="Edit" aria-label="Edit ${escapeHtml(company.companyName)}">
                                ${getSvgIcon('edit')}
                            </button>
                            <button class="icon-btn" onclick="app.deleteCompany('${company.id}')" title="Delete" style="color: #E11D48;" aria-label="Delete ${escapeHtml(company.companyName)}">
                                ${getSvgIcon('delete')}
                            </button>
                        </div>
                    </div>
                    
                    <div class="days-remaining">
                        <div class="days-number" style="color: ${urgencyColor};">${daysLeft > 0 ? daysLeft : 0}</div>
                        <div class="days-label">Days Left</div>
                    </div>
                    
                    <div class="company-details">
                        <div class="detail-item">
                            ${getSvgIcon('calendar')}
                            <span>Deadline: ${new Date(company.deadline).toLocaleDateString()}</span>
                        </div>
                        ${company.role ? `
                            <div class="detail-item">
                                ${getSvgIcon('building')}
                                <span>${escapeHtml(company.role)}</span>
                            </div>
                        ` : ''}
                        ${company.location ? `
                            <div class="detail-item">
                                ${getSvgIcon('location')}
                                <span>${escapeHtml(company.location)}</span>
                            </div>
                        ` : ''}
                        ${company.stipend ? `
                            <div class="detail-item">
                                ${getSvgIcon('dollar')}
                                <span>${escapeHtml(company.stipend)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${company.notes ? `
                        <div class="notes-section">
                            <div class="notes-label">Notes:</div>
                            <div style="font-size: 0.875rem;">${escapeHtml(company.notes)}</div>
                        </div>
                    ` : ''}
                    
                    <div class="status-section">
                        <div class="status-label">Status:</div>
                        <div class="status-buttons">
                            ${STATUSES.map(status => `
                                <button 
                                    class="status-btn ${company.status === status.id ? 'active' : ''}"
                                    onclick="app.updateStatus('${company.id}', '${status.id}')"
                                    aria-label="Set status to ${status.label}">
                                    ${status.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update statistics
     */
    function updateStats() {
        document.getElementById('statTotal').textContent = state.companies.length;
        document.getElementById('statApplied').textContent = state.companies.filter(c =>
            c.status === 'applied' || c.status === 'interview' || c.status === 'offer'
        ).length;
        document.getElementById('statInterviews').textContent = state.companies.filter(c => c.status === 'interview').length;
        document.getElementById('statOffers').textContent = state.companies.filter(c => c.status === 'offer').length;
    }

    // ========================================================================
    // Notifications
    // ========================================================================

    /**
     * Check for upcoming deadlines and show notifications
     */
    function checkNotifications() {
        if (!state.currentUser) return;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const upcoming = state.companies.filter(c => {
            const deadlineDate = new Date(c.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            const deadlineDateStr = deadlineDate.toISOString().split('T')[0];
            return deadlineDateStr === tomorrowStr && c.status === 'interested';
        });

        if (upcoming.length > 0) {
            elements.notificationBadge.textContent = upcoming.length;
            elements.notificationBadge.classList.remove('hidden');

            const companyNames = upcoming.map(c => c.companyName).join(', ');
            elements.bannerText.textContent = `⏰ ${upcoming.length} application${upcoming.length > 1 ? 's' : ''} due tomorrow: ${companyNames}`;
            elements.notificationBanner.classList.add('active');

            const lastCheck = localStorage.getItem(STORAGE_KEYS.lastCheck(state.currentUser));
            const today = new Date().toDateString();

            if (lastCheck !== today && 'Notification' in window && Notification.permission === 'granted') {
                localStorage.setItem(STORAGE_KEYS.lastCheck(state.currentUser), today);
                upcoming.forEach(company => {
                    new Notification('⏰ PlacementPal Reminder', {
                        body: `Apply at ${company.companyName} — deadline is TOMORROW!`,
                        icon: 'https://static.prod-images.emergentagent.com/jobs/bb2135b2-eb25-40e1-bd4d-51eb150daefb/images/b072e466a0231372db3235fffb5bc91e960e1c94c4d7b0668f3bc73967e98425.png'
                    });
                });
            }
        } else {
            elements.notificationBadge.classList.add('hidden');
            elements.notificationBanner.classList.remove('active');
        }
    }

    /**
     * Toggle notification banner
     */
    function toggleBanner() {
        elements.notificationBanner.classList.toggle('active');
    }

    /**
     * Close notification banner
     */
    function closeBanner() {
        elements.notificationBanner.classList.remove('active');
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get SVG icon markup
     */
    function getSvgIcon(name) {
        const icons = {
            edit: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
            delete: '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
            calendar: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            building: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>',
            location: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
            dollar: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
        };
        return icons[name] || '';
    }

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        createUser,
        loginUser,
        logout,
        handleWelcomeEnter,
        toggleUserMenu,
        toggleForm,
        toggleMoreDetails,
        saveCompany,
        editCompany,
        deleteCompany,
        updateStatus,
        setFilter,
        setSort,
        toggleBanner,
        closeBanner,
        cancelForm
    };
})();