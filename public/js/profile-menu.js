// === Profile Dropdown & Modals ===
document.addEventListener('DOMContentLoaded', () => {
  const profileBtn = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const editProfileModal = document.getElementById('editProfileModal');
  const closeEditProfile = document.getElementById('closeEditProfile');
  const logoutModal = document.getElementById('logoutModal');
  const closeLogoutModal = document.getElementById('closeLogoutModal');
  const confirmLogout = document.getElementById('confirmLogout');
  const cancelLogout = document.getElementById('cancelLogout');
  const editProfileForm = document.getElementById('editProfileForm');
  const editUsername = document.getElementById('editUsername');
  const editProfilePic = document.getElementById('editProfilePic');

  // Show/hide dropdown
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      profileDropdown.classList.toggle('hidden');
    });
    // Hide dropdown on click outside
    document.addEventListener('mousedown', (e) => {
      if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
        profileDropdown.classList.add('hidden');
      }
    });
  }

  // Open edit profile modal
  if (editProfileBtn && editProfileModal) {
    editProfileBtn.addEventListener('click', () => {
      profileDropdown.classList.add('hidden');
      editProfileModal.classList.remove('hidden');
      // Pre-fill username (from session)
      if (window.sessionStorage.getItem('user')) {
        try {
          const user = JSON.parse(window.sessionStorage.getItem('user'));
          if (user && user.username) editUsername.value = user.username;
        } catch {}
      }
    });
  }
  if (closeEditProfile) closeEditProfile.onclick = () => editProfileModal.classList.add('hidden');

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

  // Edit profile form submit
  if (editProfileForm) {
    editProfileForm.onsubmit = async (e) => {
      e.preventDefault();
      // TODO: Implement API call to update username/profile picture
      alert('Modification du profil à implémenter.');
      editProfileModal.classList.add('hidden');
    };
  }
});
