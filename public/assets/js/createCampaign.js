import { auth, db } from './firebase.js';
import { 
    collection,
    addDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

class CampaignWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {
            title: '',
            description: '',
            category: '',
            goalAmount: 0,
            duration: 30,
            image: null,
            imageUrl: '',
            milestones: [],
            rewards: []
        };
        
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.wizard-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const direction = e.target.dataset.direction;
                this.navigate(direction);
            });
        });

        // Form inputs
        document.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateFormData(e.target.name, e.target.value);
            });
        });

        // Image upload
        const imageInput = document.getElementById('campaignImage');
        const dropZone = document.querySelector('.media-upload');

        dropZone.addEventListener('click', () => imageInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            this.handleImageUpload(file);
        });

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            this.handleImageUpload(file);
        });

        // Milestone and reward buttons
        document.getElementById('addMilestone').addEventListener('click', () => {
            this.addMilestone();
        });

        document.getElementById('addReward').addEventListener('click', () => {
            this.addReward();
        });

        // Form submission
        document.getElementById('campaignForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                await this.submitCampaign();
            }
        });
    }

    updateFormData(field, value) {
        this.formData[field] = value;
        this.updatePreview();
    }

    handleImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.showError('Please upload an image file');
            return;
        }

        // Check file size (max 1MB)
        if (file.size > 1024 * 1024) {
            this.showError('Image size should be less than 1MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.querySelector('.media-preview');
            preview.src = e.target.result;
            preview.classList.add('show');
            this.formData.image = file;
            this.updatePreview();
        };
        reader.readAsDataURL(file);
    }

    getBase64Image(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    addMilestone() {
        const milestoneList = document.querySelector('.milestone-list');
        const milestoneId = Date.now();
        
        const milestoneHtml = `
            <div class="milestone-item" data-id="${milestoneId}">
                <button type="button" class="remove-milestone">&times;</button>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="milestone-title-${milestoneId}" required>
                </div>
                <div class="form-group">
                    <label>Target Amount</label>
                    <input type="number" name="milestone-amount-${milestoneId}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="milestone-description-${milestoneId}" required></textarea>
                </div>
            </div>
        `;

        milestoneList.insertAdjacentHTML('beforeend', milestoneHtml);
        this.setupMilestoneListeners(milestoneId);
    }

    addReward() {
        const rewardList = document.querySelector('.reward-list');
        const rewardId = Date.now();
        
        const rewardHtml = `
            <div class="reward-item" data-id="${rewardId}">
                <button type="button" class="remove-reward">&times;</button>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="reward-title-${rewardId}" required>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" name="reward-amount-${rewardId}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="reward-description-${rewardId}" required></textarea>
                </div>
                <div class="form-group">
                    <label>Quantity Available</label>
                    <input type="number" name="reward-quantity-${rewardId}" required>
                </div>
            </div>
        `;

        rewardList.insertAdjacentHTML('beforeend', rewardHtml);
        this.setupRewardListeners(rewardId);
    }

    setupMilestoneListeners(id) {
        const milestone = document.querySelector(`[data-id="${id}"]`);
        milestone.querySelector('.remove-milestone').addEventListener('click', () => {
            milestone.remove();
            this.updateFormData('milestones', this.collectMilestones());
        });

        milestone.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                this.updateFormData('milestones', this.collectMilestones());
            });
        });
    }

    setupRewardListeners(id) {
        const reward = document.querySelector(`[data-id="${id}"]`);
        reward.querySelector('.remove-reward').addEventListener('click', () => {
            reward.remove();
            this.updateFormData('rewards', this.collectRewards());
        });

        reward.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                this.updateFormData('rewards', this.collectRewards());
            });
        });
    }

    collectMilestones() {
        const milestones = [];
        document.querySelectorAll('.milestone-item').forEach(item => {
            const id = item.dataset.id;
            milestones.push({
                title: item.querySelector(`[name="milestone-title-${id}"]`).value,
                amount: parseFloat(item.querySelector(`[name="milestone-amount-${id}"]`).value) || 0,
                description: item.querySelector(`[name="milestone-description-${id}"]`).value
            });
        });
        return milestones;
    }

    collectRewards() {
        const rewards = [];
        document.querySelectorAll('.reward-item').forEach(item => {
            const id = item.dataset.id;
            rewards.push({
                title: item.querySelector(`[name="reward-title-${id}"]`).value,
                amount: parseFloat(item.querySelector(`[name="reward-amount-${id}"]`).value) || 0,
                description: item.querySelector(`[name="reward-description-${id}"]`).value,
                quantity: parseInt(item.querySelector(`[name="reward-quantity-${id}"]`).value) || 0
            });
        });
        return rewards;
    }

    navigate(direction) {
        if (direction === 'next' && !this.validateCurrentStep()) {
            return;
        }

        if (direction === 'next' && this.currentStep < this.totalSteps) {
            this.currentStep++;
        } else if (direction === 'prev' && this.currentStep > 1) {
            this.currentStep--;
        }

        this.updateUI();
    }

    validateCurrentStep() {
        const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        return isValid;
    }

    validateForm() {
        // Basic validation
        if (!this.formData.title || !this.formData.description || !this.formData.goalAmount) {
            this.showError('Please fill in all required fields');
            return false;
        }

        if (!this.formData.image) {
            this.showError('Please upload a campaign image');
            return false;
        }

        if (this.formData.milestones.length === 0) {
            this.showError('Please add at least one milestone');
            return false;
        }

        if (this.formData.rewards.length === 0) {
            this.showError('Please add at least one reward');
            return false;
        }

        return true;
    }

    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.add('error');
        const validationMessage = formGroup.querySelector('.validation-message') || 
            formGroup.appendChild(document.createElement('div'));
        validationMessage.className = 'validation-message';
        validationMessage.textContent = message;
    }

    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.remove('error');
        const validationMessage = formGroup.querySelector('.validation-message');
        if (validationMessage) {
            validationMessage.remove();
        }
    }

    updateUI() {
        // Update progress steps
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else if (index + 1 < this.currentStep) {
                step.classList.remove('active');
                step.classList.add('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });

        // Show current form step
        document.querySelectorAll('.form-step').forEach(step => {
            if (parseInt(step.dataset.step) === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Update navigation buttons
        const prevBtn = document.querySelector('[data-direction="prev"]');
        const nextBtn = document.querySelector('[data-direction="next"]');
        const submitBtn = document.querySelector('[type="submit"]');

        prevBtn.style.display = this.currentStep === 1 ? 'none' : 'block';
        nextBtn.style.display = this.currentStep === this.totalSteps ? 'none' : 'block';
        submitBtn.style.display = this.currentStep === this.totalSteps ? 'block' : 'none';

        this.updatePreview();
    }

    updatePreview() {
        const preview = document.querySelector('.preview-panel');
        if (!preview) return;

        const imagePreview = preview.querySelector('.preview-image');
        if (this.formData.image) {
            imagePreview.src = URL.createObjectURL(this.formData.image);
            imagePreview.style.display = 'block';
        }

        preview.querySelector('.preview-title').textContent = this.formData.title || 'Campaign Title';
        preview.querySelector('.preview-description').textContent = this.formData.description || 'Campaign description will appear here...';
        preview.querySelector('.preview-goal').textContent = this.formData.goalAmount ? 
            `$${parseFloat(this.formData.goalAmount).toLocaleString()}` : '$0';
        preview.querySelector('.preview-duration').textContent = `${this.formData.duration || 30} days`;
    }

    showError(message) {
        const errorElement = document.getElementById('wizardError');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }

    async submitCampaign() {
        try {
            document.querySelector('.loading-overlay').classList.add('show');

            // Convert image to base64
            const base64Image = await this.getBase64Image(this.formData.image);

            // Create campaign document
            const campaignData = {
                title: this.formData.title,
                description: this.formData.description,
                category: this.formData.category,
                goalAmount: parseFloat(this.formData.goalAmount),
                currentAmount: 0,
                duration: parseInt(this.formData.duration),
                imageData: base64Image,
                creatorId: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                status: 'active',
                milestones: this.formData.milestones,
                rewards: this.formData.rewards,
                backers: 0
            };

            const docRef = await addDoc(collection(db, 'campaigns'), campaignData);
            window.location.href = `campaign.html?id=${docRef.id}`;
        } catch (error) {
            console.error('Error creating campaign:', error);
            this.showError('Failed to create campaign. Please try again.');
        } finally {
            document.querySelector('.loading-overlay').classList.remove('show');
        }
    }
}

// Initialize wizard
const wizard = new CampaignWizard();
