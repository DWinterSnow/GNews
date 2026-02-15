// === Profile Dropdown & Modals ===
document.addEventListener('DOMContentLoaded', () => {
  const profileBtn = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutModal = document.getElementById('logoutModal');
  const closeLogoutModal = document.getElementById('closeLogoutModal');
  const confirmLogout = document.getElementById('confirmLogout');
  const cancelLogout = document.getElementById('cancelLogout');

  // Populate dropdown header with user info and profile picture
  function updateDropdownInfo() {
    const userSession = sessionStorage.getItem('user');
    if (userSession) {
      try {
        const user = JSON.parse(userSession);
        const usernameEl = document.getElementById('dropdownUsername');
        const emailEl = document.getElementById('dropdownEmail');
        if (usernameEl && user.username) usernameEl.textContent = user.username;
        if (emailEl && user.email) emailEl.textContent = user.email;

        // Load profile picture
        if (user.id) {
          const dropdownProfilePic = document.getElementById('dropdownProfilePic');
          const navProfilePic = document.getElementById('navProfilePic');
          const defaultSrc = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23fcc419%22/%3E%3Ccircle cx=%2250%22 cy=%2235%22 r=%2215%22 fill=%22%231a1a2e%22/%3E%3Cellipse cx=%2250%22 cy=%2270%22 rx=%2225%22 ry=%2218%22 fill=%22%231a1a2e%22/%3E%3C/svg%3E';

          // Load for dropdown
          if (dropdownProfilePic) {
            dropdownProfilePic.src = `/api/users/profile-picture/${user.id}`;
            dropdownProfilePic.onerror = () => {
              dropdownProfilePic.src = defaultSrc;
            };
          }

          // Load for nav
          if (navProfilePic) {
            navProfilePic.src = `/api/users/profile-picture/${user.id}`;
            navProfilePic.onerror = () => {
              navProfilePic.src = defaultSrc;
            };
          }
        }
      } catch (e) {
        console.error('Error parsing user session:', e);
      }
    }
  }

  // Show/hide dropdown
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateDropdownInfo();
      profileDropdown.classList.toggle('hidden');
    });
    
    // Hide dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
        profileDropdown.classList.add('hidden');
      }
    });
  }

  // Navigate to settings page
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
      window.location.href = 'parametres.html';
    });
  }

  // Open logout modal
  if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
      logoutModal.classList.remove('hidden');
    });
  }
  if (closeLogoutModal) closeLogoutModal.onclick = () => logoutModal.classList.add('hidden');
  if (cancelLogout) cancelLogout.onclick = () => logoutModal.classList.add('hidden');

  // Confirm logout
  if (confirmLogout) {
    confirmLogout.onclick = async () => {
      logoutModal.classList.add('hidden');
      if (typeof logoutUser === 'function') {
        await logoutUser();
        window.location.reload();
      }
    };
  }

  // Load profile picture on page load
  updateDropdownInfo();
});
