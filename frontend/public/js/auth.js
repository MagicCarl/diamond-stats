// Diamond Stats - Auth (Supabase client)

export class Auth {
    constructor() {
        this.client = null;
        this.user = null;
        this.token = null;
    }

    async init() {
        // Wait for Supabase JS to load
        if (typeof supabase === 'undefined') {
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (typeof supabase !== 'undefined') {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });
        }

        const url = window.SUPABASE_URL || 'https://your-project.supabase.co';
        const key = window.SUPABASE_ANON_KEY || 'your-anon-key';

        this.client = supabase.createClient(url, key);

        // Check existing session
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            this.user = session.user;
            this.token = session.access_token;
        }

        // Listen for auth changes
        this.client.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.user = session.user;
                this.token = session.access_token;
            } else {
                this.user = null;
                this.token = null;
            }
        });
    }

    async signUp(email, password) {
        const { data, error } = await this.client.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    }

    async signIn(email, password) {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.user = data.user;
        this.token = data.session.access_token;
        return data;
    }

    async signOut() {
        await this.client.auth.signOut();
        this.user = null;
        this.token = null;
    }

    isAuthenticated() {
        return !!this.token;
    }

    getToken() {
        return this.token;
    }

    getUserId() {
        return this.user?.id;
    }

    getEmail() {
        return this.user?.email;
    }
}
