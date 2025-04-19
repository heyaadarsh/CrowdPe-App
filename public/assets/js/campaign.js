import { auth, db } from './firebase.js';
import { 
    doc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    increment
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class CampaignPage {
    constructor() {
        this.campaignId = new URLSearchParams(window.location.search).get('id');
        if (!this.campaignId) {
            window.location.href = '../index.html';
            return;
        }

        this.campaign = null;
        this.comments = [];
        this.selectedAmount = null;
        this.setupEventListeners();
        this.loadCampaign();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Donation amount selection
        document.querySelectorAll('.amount-option').forEach(option => {
            option.addEventListener('click', () => this.selectAmount(option));
        });

        // Custom amount input
        const customAmount = document.getElementById('customAmount');
        if (customAmount) {
            customAmount.addEventListener('input', (e) => {
                this.selectedAmount = parseFloat(e.target.value) || 0;
                document.querySelectorAll('.amount-option').forEach(opt => 
                    opt.classList.remove('selected'));
            });
        }

        // Donation form submission
        const donateForm = document.getElementById('donateForm');
        if (donateForm) {
            donateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processDonation();
            });
        }

        // Comment form submission
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitComment();
            });
        }
    }

    async loadCampaign() {
        try {
            const docRef = doc(db, 'campaigns', this.campaignId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                this.showError('Campaign not found');
                return;
            }

            this.campaign = {
                id: docSnap.id,
                ...docSnap.data()
            };

            this.renderCampaign();
            this.setupCommentListener();
        } catch (error) {
            console.error('Error loading campaign:', error);
            this.showError('Failed to load campaign data');
        }
    }

    renderCampaign() {
        // Update campaign header
        document.querySelector('.campaign-image').src = this.campaign.imageData;
        document.querySelector('.campaign-title').textContent = this.campaign.title;
        document.querySelector('.campaign-description').textContent = this.campaign.description;

        // Update campaign stats
        const progress = (this.campaign.currentAmount / this.campaign.goalAmount) * 100;
        document.querySelector('.progress-fill').style.width = `${Math.min(progress, 100)}%`;
        
        document.querySelector('.raised-amount').textContent = 
            `$${this.campaign.currentAmount.toLocaleString()}`;
        document.querySelector('.goal-amount').textContent = 
            `$${this.campaign.goalAmount.toLocaleString()}`;
        document.querySelector('.backer-count').textContent = 
            this.campaign.backers.toLocaleString();

        // Calculate and display time remaining
        const endDate = new Date(this.campaign.createdAt.toDate());
        endDate.setDate(endDate.getDate() + this.campaign.duration);
        const now = new Date();
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        document.querySelector('.time-remaining').textContent = 
            daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Campaign ended';

        // Render rewards
        this.renderRewards();

        // Render milestones
        this.renderMilestones();

        // Show appropriate tab content
        this.switchTab('updates');
    }

    renderRewards() {
        const rewardsGrid = document.querySelector('.rewards-grid');
        if (!rewardsGrid) return;

        rewardsGrid.innerHTML = this.campaign.rewards.map(reward => `
            <div class="reward-card">
                <div class="reward-amount">$${reward.amount}</div>
                <h3 class="reward-title">${reward.title}</h3>
                <p class="reward-description">${reward.description}</p>
                <div class="reward-meta">
                    <span>${reward.quantity - (reward.claimed || 0)} of ${reward.quantity} remaining</span>
                    <span>${reward.estimatedDelivery || 'No delivery date'}</span>
                </div>
                <button class="btn btn-primary" 
                        onclick="selectReward(${reward.amount})"
                        ${reward.quantity <= (reward.claimed || 0) ? 'disabled' : ''}>
                    Select Reward
                </button>
            </div>
        `).join('');
    }

    renderMilestones() {
        const milestonesList = document.querySelector('.milestones-list');
        if (!milestonesList) return;

        milestonesList.innerHTML = this.campaign.milestones.map(milestone => {
            const progress = Math.min(
                (this.campaign.currentAmount / milestone.amount) * 100,
                100
            );
            
            return `
                <div class="milestone-item">
                    <h3>${milestone.title}</h3>
                    <p>${milestone.description}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="milestone-meta">
                        <span>$${milestone.amount.toLocaleString()}</span>
                        <span>${progress >= 100 ? 'Achieved!' : `${progress.toFixed(1)}%`}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupCommentListener() {
        const q = query(
            collection(db, 'comments'),
            where('campaignId', '==', this.campaignId),
            orderBy('createdAt', 'desc')
        );

        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.comments.unshift({
                        id: change.doc.id,
                        ...change.doc.data()
                    });
                }
            });
            this.renderComments();
        });
    }

    renderComments() {
        const commentsList = document.querySelector('.comments-list');
        if (!commentsList) return;

        commentsList.innerHTML = this.comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.authorName}</span>
                    <span class="comment-date">
                        ${new Date(comment.createdAt.toDate()).toLocaleDateString()}
                    </span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button onclick="likeComment('${comment.id}')">
                        ${comment.likes || 0} ❤️
                    </button>
                    <button onclick="replyToComment('${comment.id}')">Reply</button>
                </div>
            </div>
        `).join('');
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}Tab`);
        });
    }

    selectAmount(option) {
        document.querySelectorAll('.amount-option').forEach(opt => 
            opt.classList.remove('selected'));
        option.classList.add('selected');
        this.selectedAmount = parseFloat(option.dataset.amount);
        document.getElementById('customAmount').value = '';
    }

    async processDonation() {
        if (!auth.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        if (!this.selectedAmount || this.selectedAmount <= 0) {
            this.showError('Please select or enter a valid amount');
            return;
        }

        try {
            document.querySelector('.loading-overlay').classList.add('show');

            // Create donation record
            await addDoc(collection(db, 'donations'), {
                campaignId: this.campaignId,
                userId: auth.currentUser.uid,
                amount: this.selectedAmount,
                createdAt: serverTimestamp()
            });

            // Update campaign stats
            await updateDoc(doc(db, 'campaigns', this.campaignId), {
                currentAmount: increment(this.selectedAmount),
                backers: increment(1)
            });

            // Show success message and reset form
            this.showSuccess('Thank you for your donation!');
            this.selectedAmount = null;
            document.querySelectorAll('.amount-option').forEach(opt => 
                opt.classList.remove('selected'));
            document.getElementById('customAmount').value = '';

        } catch (error) {
            console.error('Error processing donation:', error);
            this.showError('Failed to process donation. Please try again.');
        } finally {
            document.querySelector('.loading-overlay').classList.remove('show');
        }
    }

    async submitComment() {
        if (!auth.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        const content = document.getElementById('commentContent').value.trim();
        if (!content) {
            this.showError('Please enter a comment');
            return;
        }

        try {
            document.querySelector('.loading-overlay').classList.add('show');

            await addDoc(collection(db, 'comments'), {
                campaignId: this.campaignId,
                userId: auth.currentUser.uid,
                authorName: auth.currentUser.email.split('@')[0],
                content: content,
                createdAt: serverTimestamp(),
                likes: 0
            });

            document.getElementById('commentContent').value = '';
            this.showSuccess('Comment posted successfully!');

        } catch (error) {
            console.error('Error posting comment:', error);
            this.showError('Failed to post comment. Please try again.');
        } finally {
            document.querySelector('.loading-overlay').classList.remove('show');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('campaignError');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }

    showSuccess(message) {
        const successElement = document.getElementById('campaignSuccess');
        successElement.textContent = message;
        successElement.classList.add('show');
        setTimeout(() => {
            successElement.classList.remove('show');
        }, 5000);
    }
}

// Initialize campaign page
const campaignPage = new CampaignPage();

// Make functions available globally for event handlers
window.selectReward = (amount) => {
    document.getElementById('customAmount').value = amount;
    document.querySelectorAll('.amount-option').forEach(opt => 
        opt.classList.remove('selected'));
    campaignPage.selectedAmount = amount;
    document.querySelector('.donation-form').scrollIntoView({ behavior: 'smooth' });
};

window.likeComment = async (commentId) => {
    if (!auth.currentUser) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await updateDoc(doc(db, 'comments', commentId), {
            likes: increment(1)
        });
    } catch (error) {
        console.error('Error liking comment:', error);
        campaignPage.showError('Failed to like comment');
    }
};

window.replyToComment = (commentId) => {
    const commentContent = document.getElementById('commentContent');
    const comment = campaignPage.comments.find(c => c.id === commentId);
    if (comment) {
        commentContent.value = `@${comment.authorName} `;
        commentContent.focus();
    }
};
