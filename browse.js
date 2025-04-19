import { auth, db } from './firebase.js';
import { 
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class BrowsePage {
    constructor() {
        this.campaigns = [];
        this.lastDoc = null;
        this.loading = false;
        this.filters = {
            categories: [],
            progress: [],
            sort: 'newest'
        };
        this.searchQuery = '';
        this.itemsPerPage = 12;

        this.setupEventListeners();
        this.initializeFromUrl();
        this.loadCampaigns();
    }

    setupEventListeners() {
        // Search form
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        // Category filters
        document.querySelectorAll('input[name="category"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.handleFilterChange('categories', checkbox.value, checkbox.checked);
            });
        });

        // Progress filters
        document.querySelectorAll('input[name="progress"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.handleFilterChange('progress', checkbox.value, checkbox.checked);
            });
        });

        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.filters.sort = sortSelect.value;
                this.resetAndReload();
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Load more
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMore());
        }

        // Mobile filter toggle
        const filterToggle = document.createElement('button');
        filterToggle.className = 'filter-toggle';
        filterToggle.innerHTML = '🔍';
        filterToggle.addEventListener('click', () => {
            document.querySelector('.filters-sidebar').classList.toggle('show');
        });
        document.body.appendChild(filterToggle);
    }

    initializeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        
        // Set search query
        const search = params.get('search');
        if (search) {
            this.searchQuery = search;
            document.getElementById('searchInput').value = search;
        }

        // Set category filter
        const category = params.get('category');
        if (category) {
            const checkbox = document.querySelector(`input[name="category"][value="${category}"]`);
            if (checkbox) {
                checkbox.checked = true;
                this.filters.categories.push(category);
            }
        }

        // Update active filters display
        this.updateActiveFilters();
    }

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        this.searchQuery = searchInput.value.trim();
        this.resetAndReload();
    }

    handleFilterChange(filterType, value, checked) {
        if (checked) {
            this.filters[filterType].push(value);
        } else {
            this.filters[filterType] = this.filters[filterType].filter(v => v !== value);
        }
        
        this.updateActiveFilters();
        this.resetAndReload();
    }

    updateActiveFilters() {
        const activeFiltersContainer = document.querySelector('.active-filters');
        if (!activeFiltersContainer) return;

        const activeFilters = [
            ...this.filters.categories.map(cat => ({ type: 'category', value: cat })),
            ...this.filters.progress.map(prog => ({ type: 'progress', value: prog }))
        ];

        if (this.searchQuery) {
            activeFilters.unshift({ type: 'search', value: this.searchQuery });
        }

        activeFiltersContainer.innerHTML = activeFilters.map(filter => `
            <div class="filter-tag">
                ${filter.value}
                <button onclick="browsePage.removeFilter('${filter.type}', '${filter.value}')">×</button>
            </div>
        `).join('');
    }

    removeFilter(type, value) {
        if (type === 'search') {
            this.searchQuery = '';
            document.getElementById('searchInput').value = '';
        } else {
            this.filters[type + 's'] = this.filters[type + 's'].filter(v => v !== value);
            const checkbox = document.querySelector(`input[name="${type}"][value="${value}"]`);
            if (checkbox) checkbox.checked = false;
        }

        this.updateActiveFilters();
        this.resetAndReload();
    }

    clearFilters() {
        this.filters = {
            categories: [],
            progress: [],
            sort: 'newest'
        };
        this.searchQuery = '';
        
        // Reset UI
        document.getElementById('searchInput').value = '';
        document.getElementById('sortSelect').value = 'newest';
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.updateActiveFilters();
        this.resetAndReload();
    }

    async loadCampaigns(loadMore = false) {
        if (this.loading) return;
        this.loading = true;

        try {
            this.showLoading(true);
            
            // Build query
            let q = query(collection(db, 'campaigns'));
            const conditions = [];

            // Status condition
            conditions.push(where('status', '==', 'active'));

            // Category filter
            if (this.filters.categories.length > 0) {
                conditions.push(where('category', 'in', this.filters.categories));
            }

            // Progress filters
            if (this.filters.progress.includes('new')) {
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                conditions.push(where('createdAt', '>=', threeDaysAgo));
            }

            if (this.filters.progress.includes('ending')) {
                const twoDaysFromNow = new Date();
                twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
                conditions.push(where('endDate', '<=', twoDaysFromNow));
            }

            if (this.filters.progress.includes('funded')) {
                conditions.push(where('currentAmount', '>=', where('goalAmount')));
            }

            // Apply conditions
            conditions.forEach(condition => {
                q = query(q, condition);
            });

            // Apply sorting
            switch (this.filters.sort) {
                case 'mostFunded':
                    q = query(q, orderBy('currentAmount', 'desc'));
                    break;
                case 'mostBackers':
                    q = query(q, orderBy('backers', 'desc'));
                    break;
                case 'endingSoon':
                    q = query(q, orderBy('endDate', 'asc'));
                    break;
                default: // newest
                    q = query(q, orderBy('createdAt', 'desc'));
            }

            // Apply pagination
            q = query(q, limit(this.itemsPerPage));
            if (loadMore && this.lastDoc) {
                q = query(q, startAfter(this.lastDoc));
            }

            const snapshot = await getDocs(q);
            
            // Update last document for pagination
            this.lastDoc = snapshot.docs[snapshot.docs.length - 1];

            // Process results
            const newCampaigns = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter by search query if present
            if (this.searchQuery) {
                const searchLower = this.searchQuery.toLowerCase();
                newCampaigns = newCampaigns.filter(campaign => 
                    campaign.title.toLowerCase().includes(searchLower) ||
                    campaign.description.toLowerCase().includes(searchLower)
                );
            }

            // Update campaigns array
            if (loadMore) {
                this.campaigns.push(...newCampaigns);
            } else {
                this.campaigns = newCampaigns;
            }

            this.renderCampaigns();
            this.updateLoadMoreButton(snapshot.docs.length === this.itemsPerPage);

        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.showError('Failed to load campaigns');
        } finally {
            this.loading = false;
            this.showLoading(false);
        }
    }

    renderCampaigns() {
        const campaignsGrid = document.querySelector('.campaigns-grid');
        if (!campaignsGrid) return;

        if (this.campaigns.length === 0) {
            campaignsGrid.innerHTML = `
                <div class="no-results">
                    <h3>No campaigns found</h3>
                    <p>Try adjusting your filters or start your own campaign</p>
                    <button class="btn btn-primary" onclick="window.location.href='/pages/create-campaign.html'">
                        Start a Campaign
                    </button>
                </div>
            `;
            return;
        }

        campaignsGrid.innerHTML = this.campaigns.map(campaign => {
            const progress = (campaign.currentAmount / campaign.goalAmount) * 100;
            const daysLeft = this.calculateDaysLeft(campaign.createdAt.toDate(), campaign.duration);

            return `
                <div class="campaign-card">
                    <img src="${campaign.imageData}" alt="${campaign.title}" class="campaign-image">
                    <div class="campaign-content">
                        <h3 class="campaign-title">${campaign.title}</h3>
                        <p class="campaign-description">${campaign.description}</p>
                        <div class="campaign-meta">
                            <span>${campaign.category}</span>
                            <span>${daysLeft} days left</span>
                        </div>
                        <div class="campaign-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                            </div>
                        </div>
                        <div class="campaign-stats">
                            <div class="stat-item">
                                <div class="value">$${campaign.currentAmount.toLocaleString()}</div>
                                <div class="label">raised of $${campaign.goalAmount.toLocaleString()}</div>
                            </div>
                            <div class="stat-item">
                                <div class="value">${campaign.backers}</div>
                                <div class="label">backers</div>
                            </div>
                        </div>
                        <a href="/pages/campaign.html?id=${campaign.id}" class="btn btn-primary btn-block">
                            View Campaign
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateDaysLeft(startDate, duration) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);
        const now = new Date();
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysLeft);
    }

    updateLoadMoreButton(hasMore) {
        const loadMoreContainer = document.querySelector('.load-more');
        if (loadMoreContainer) {
            loadMoreContainer.style.display = hasMore ? 'block' : 'none';
        }
    }

    showLoading(show) {
        const loadingSpinner = document.querySelector('.loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('browseError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            setTimeout(() => {
                errorElement.classList.remove('show');
            }, 5000);
        }
    }

    resetAndReload() {
        this.lastDoc = null;
        this.loadCampaigns();
    }

    loadMore() {
        this.loadCampaigns(true);
    }
}

// Initialize browse page and make it globally available for event handlers
window.browsePage = new BrowsePage();
