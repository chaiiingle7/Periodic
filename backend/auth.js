const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ewmxubtkavtdoedtrkca.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bXh1YnRrYXZ0ZG9lZHRya2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0Njk0MDAsImV4cCI6MjEwNzA0NTQwMH0.RUyrtsNCltNvFLE1tJIByTm0KJk7oIetwccIXrrAbpE
const supabase = createClient(supabaseUrl, supabaseKey);

exports.register = async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${req.headers.origin}/auth/callback`,
                data: { name }
            }
        });
        if (error) return res.status(400).json({ error: error.message });
        res.json({ message: 'User registered successfully', user: data.user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) return res.status(400).json({ error: error.message });
        res.json({ message: 'Logged in successfully', user: data.session.user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.logout = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signOut();
        if (error) return res.status(400).json({ error: error.message });
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.isAuthenticated = async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user: session.user });
};
