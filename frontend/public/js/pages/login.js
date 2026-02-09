// Diamond Stats - Login Page

export class LoginPage {
    constructor(app) {
        this.app = app;
        this.isSignUp = false;
    }

    render(container) {
        container.innerHTML = `
            <div class="page flex justify-center items-center" style="min-height: 100dvh;">
                <div class="card" style="max-width: 400px; width: 100%;">
                    <div style="text-align: center; margin-bottom: var(--space-lg);">
                        <h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--space-xs);">
                            Diamond Stats
                        </h1>
                        <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                            Baseball & Softball Statistics Tracker
                        </p>
                    </div>

                    <div class="tabs" style="margin-bottom: var(--space-lg);">
                        <button class="tab active" id="tab-login">Sign In</button>
                        <button class="tab" id="tab-signup">Sign Up</button>
                    </div>

                    <form id="auth-form">
                        <div class="form-group">
                            <label class="form-label" for="email">Email</label>
                            <input class="form-input" type="email" id="email" required
                                   placeholder="coach@example.com" autocomplete="email">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="password">Password</label>
                            <input class="form-input" type="password" id="password" required
                                   placeholder="Enter password" autocomplete="current-password"
                                   minlength="6">
                        </div>
                        <div id="auth-error" style="color: var(--offline); font-size: var(--font-size-sm); margin-bottom: var(--space-md); display: none;"></div>
                        <button class="btn btn-primary btn-lg" type="submit" style="width: 100%;" id="auth-submit">
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('tab-login').addEventListener('click', () => this.setMode(false));
        document.getElementById('tab-signup').addEventListener('click', () => this.setMode(true));
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setMode(isSignUp) {
        this.isSignUp = isSignUp;
        document.getElementById('tab-login').classList.toggle('active', !isSignUp);
        document.getElementById('tab-signup').classList.toggle('active', isSignUp);
        document.getElementById('auth-submit').textContent = isSignUp ? 'Create Account' : 'Sign In';
        document.getElementById('password').autocomplete = isSignUp ? 'new-password' : 'current-password';
    }

    async handleSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit');

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';

        try {
            if (this.isSignUp) {
                await this.app.auth.signUp(email, password);
                this.app.showToast('Account created! Check your email to verify.', 'success');
            } else {
                await this.app.auth.signIn(email, password);
                window.location.hash = '#/dashboard';
            }
        } catch (err) {
            errorEl.textContent = err.message || 'Authentication failed';
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = this.isSignUp ? 'Create Account' : 'Sign In';
        }
    }
}
