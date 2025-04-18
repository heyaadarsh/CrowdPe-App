import { auth } from './firebase.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

class Auth {
    constructor() {
        this.user = null;
        this.setupAuthListener();
        this.setupLogoutHandler();
    }

    setupAuthListener() {
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            this.updateUI();
            
            // Dispatch auth state change event
            const event = new CustomEvent('authStateChanged', { detail: { user } });
            document.dispatchEvent(event);
        });
    }

    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    updateUI() {
        const authRequired = document.querySelectorAll('.auth-required');
        const authNotRequired = document.querySelectorAll('.auth-not-required');

        if (this.user) {
            authRequired.forEach(elem => elem.style.display = 'block');
            authNotRequired.forEach(elem => elem.style.display = 'none');
        } else {
            authRequired.forEach(elem => elem.style.display = 'none');
            authNotRequired.forEach(elem => elem.style.display = 'block');
        }
    }

    async login(email, password) {
        try {
            const spinner = document.querySelector('.loading-spinner');
            const errorElem = document.getElementById('loginError');
            const submitBtn = document.querySelector('.auth-submit');

            // Show loading state
            spinner?.classList.add('show');
            submitBtn?.setAttribute('disabled', 'true');
            errorElem?.classList.remove('show');

            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = '../index.html'; // Redirect to homepage after successful login
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginError', this.getErrorMessage(error.code));
        } finally {
            // Hide loading state
            document.querySelector('.loading-spinner')?.classList.remove('show');
            document.querySelector('.auth-submit')?.removeAttribute('disabled');
        }
    }

    async signup(email, password, confirmPassword) {
        const errorElem = document.getElementById('signupError');

        if (password !== confirmPassword) {
            this.showError('signupError', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showError('signupError', 'Password should be at least 6 characters');
            return;
        }

        try {
            const spinner = document.querySelector('.loading-spinner');
            const submitBtn = document.querySelector('.auth-submit');

            // Show loading state
            spinner?.classList.add('show');
            submitBtn?.setAttribute('disabled', 'true');
            errorElem?.classList.remove('show');

            await createUserWithEmailAndPassword(auth, email, password);
            window.location.href = '../index.html'; // Redirect to homepage after successful signup
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('signupError', this.getErrorMessage(error.code));
        } finally {
            // Hide loading state
            document.querySelector('.loading-spinner')?.classList.remove('show');
            document.querySelector('.auth-submit')?.removeAttribute('disabled');
        }
    }

    async logout() {
        try {
            await signOut(auth);
            // Check if we're in a subdirectory
            const isInSubdir = window.location.pathname.includes('/pages/');
            window.location.href = isInSubdir ? '../index.html' : 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    showError(elementId, message) {
        const errorElem = document.getElementById(elementId);
        if (errorElem) {
            errorElem.textContent = message;
            errorElem.classList.add('show');
        }
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Email/password accounts are not enabled',
            'auth/weak-password': 'Password is too weak',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/network-request-failed': 'Network error. Please check your internet connection.',
            'auth/too-many-requests': 'Too many unsuccessful attempts. Please try again later.',
        };
        return errorMessages[errorCode] || 'An error occurred during authentication';
    }
}

// Initialize auth manager
const authManager = new Auth();

// Export for use in other modules
export default authManager;
