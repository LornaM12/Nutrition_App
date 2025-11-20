// logout.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is logged in on page load
    checkLoginStatus();

    // Attach event listener to the logout button if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

/**
 * Checks for a user ID in localStorage to determine login status.
 * Updates the UI accordingly (hiding/showing auth buttons or logout button).
 */
function checkLoginStatus() {
    const userId = localStorage.getItem('user_id');
    const authButtons = document.getElementById('authButtons');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userId) {
        // User is logged in
        console.log('User is logged in. User ID:', userId);
        if (authButtons) authButtons.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'flex'; // Show logout button
    } else {
        // User is not logged in
        console.log('User is not logged in.');
        if (authButtons) authButtons.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'none'; // Hide logout button
    }
}

/**
 * Handles the logout process by clearing the user ID from localStorage
 * and redirecting to the index page.
 */
function handleLogout() {
    console.log('Logging out...');
    localStorage.removeItem('user_id');
    // For a more secure app, you might also want to call a backend logout endpoint here.

    // Redirect the user to the home page
    window.location.href = 'index.html';
}