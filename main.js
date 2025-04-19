import { auth, db } from './firebase.js';
import { 
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class HomePage {
    constructor() {
        this.featuredCampaigns = [];
        this.categories = [
            { id: 'technology', name: 'Technology', icon: '💻' },
            { id: 'creative', name: 'Creative', icon: '🎨' },
            { id: 'community', name: 'Community', icon: '🤝' },
            { id: 'business', name: 'Business', icon: '💼' }
        ];
        this.setupEventListeners();
        this.loadFeaturedCampaigns();
        this.setupAuthStateListener();
        this.loadStatistics();
    }

    setupEventListeners() {
        // Category filtering
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const categoryId = card.dataset.category;
                window.location.href = `pages/browse.html?category=${categoryId}`;
            });
        });

        // Search functionality
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = document.getElementById('searchInput').value.trim();
                if (query) {
                    window.location.href = `pages/browse.html?search=${encodeURIComponent(query)}`;
                }
            });
        }

        // Start Campaign button
        const startCampaignBtn = document.getElementById('startCampaignBtn');
        if (startCampaignBtn) {
            startCampaignBtn.addEventListener('click', () => {
                if (auth.currentUser) {
                    window.location.href = 'pages/create-campaign.html';
                } else {
                    window.location.href = 'pages/login.html';
                }
            });
        }
    }

    setupAuthStateListener() {
        auth.onAuthStateChanged(user => {
            const authButtons = document.querySelector('.auth-buttons');
            const userMenu = document.querySelector('.user-menu');
            
            if (user) {
                if (authButtons) authButtons.style.display = 'none';
                if (userMenu) {
                    userMenu.style.display = 'flex';
                    const userEmail = userMenu.querySelector('.user-email');
                    if (userEmail) userEmail.textContent = user.email;
                }
            } else {
                if (authButtons) authButtons.style.display = 'flex';
                if (userMenu) userMenu.style.display = 'none';
            }
        });
    }

    async loadFeaturedCampaigns() {
        try {
            // Query for featured campaigns
            const q = query(
                collection(db, 'campaigns'),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(6)
            );

            const querySnapshot = await getDocs(q);
            this.featuredCampaigns = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderFeaturedCampaigns();
        } catch (error) {
            console.error('Error loading featured campaigns:', error);
            this.showError('Failed to load featured campaigns');
        }
    }

    renderFeaturedCampaigns() {
        const campaignsGrid = document.querySelector('.campaigns-grid');
        if (!campaignsGrid) return;

        if (this.featuredCampaigns.length === 0) {
            campaignsGrid.innerHTML = `
                <div class="no-campaigns">
                    <p>No campaigns found. Be the first to start one!</p>
                    <button class="btn btn-primary" onclick="window.location.href='pages/create-campaign.html'">
                        Start a Campaign
                    </button>
                </div>
            `;
            return;
        }

        campaignsGrid.innerHTML = this.featuredCampaigns.map(campaign => {
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
                        <a href="pages/campaign.html?id=${campaign.id}" class="btn btn-primary btn-block">
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

    showError(message) {
        const errorElement = document.getElementById('homeError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            setTimeout(() => {
                errorElement.classList.remove('show');
            }, 5000);
        }
    }

    async loadStatistics() {
        try {
            // Get total campaigns
            const campaignsQuery = query(collection(db, 'campaigns'));
            const campaignsSnapshot = await getDocs(campaignsQuery);
            const totalCampaigns = campaignsSnapshot.size;

            // Calculate total funding and backers
            let totalFunding = 0;
            let totalBackers = 0;
            let successfulCampaigns = 0;

            campaignsSnapshot.forEach(doc => {
                const campaign = doc.data();
                totalFunding += campaign.currentAmount || 0;
                totalBackers += campaign.backers || 0;
                
                // Count as successful if reached 100% or more of goal
                if (campaign.currentAmount >= campaign.goalAmount) {
                    successfulCampaigns++;
                }
            });

            // Calculate success rate
            const successRate = totalCampaigns > 0 ? 
                Math.round((successfulCampaigns / totalCampaigns) * 100) : 0;

            // Update the UI
            document.getElementById('totalCampaigns').textContent = totalCampaigns.toLocaleString();
            document.getElementById('totalFunding').textContent = `$${totalFunding.toLocaleString()}`;
            document.getElementById('totalBackers').textContent = totalBackers.toLocaleString();
            document.getElementById('successRate').textContent = `${successRate}%`;

        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showError('Failed to load statistics');
        }
    }
}

// Initialize homepage
const homePage = new HomePage();
