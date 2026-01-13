// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        window.location.href = 'dashboard.html';
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Simple authentication (in a real app, this would be done server-side)
        if (authenticateUser(username, password)) {
            // Store login state and username
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('username', username);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = 'Invalid username or password';
            errorMessage.style.display = 'block';
        }
    });

    // Clear error message when user starts typing
    document.getElementById('username').addEventListener('input', clearError);
    document.getElementById('password').addEventListener('input', clearError);

    function clearError() {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }
});

// Simple authentication function
// In a real application, this would validate against a backend server
function authenticateUser(username, password) {
    // Demo credentials
    const validCredentials = {
        'demo': 'demo123',
        'admin': 'admin123',
        'user': 'user123'
    };

    return validCredentials[username] === password;
}
