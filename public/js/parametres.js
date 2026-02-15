// parametres.js - Settings Page Handler

let croppedImageData = null;
let currentImageData = null;
let originalImageData = null;
let cropBoxState = {
  isResizing: false,
  isDragging: false,
  handle: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  startLeft: 0,
  startTop: 0,
  imgRelativeLeft: 0,
  imgRelativeTop: 0,
  imgWidth: 0,
  imgHeight: 0
};
let currentUser = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const auth = await checkAuthStatus();
  if (!auth.isLoggedIn) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = auth.user;

  // Initialize page
  updateAuthUI();
  loadUserSettings(auth.user);
  setupEventListeners();
  initTabNavigation();
  initMobileNav();
});

// ==================== LOAD USER SETTINGS ====================

function loadUserSettings(user) {
  if (!user) return;

  // Populate profile form fields
  document.getElementById('settingsUsername').value = user.username || '';
  document.getElementById('settingsAge').value = user.age || '';
  document.getElementById('settingsCountry').value = user.country || '';

  // Display masked email
  displayMaskedEmail(user.email);

  // Load profile picture
  if (user.id) {
    const settingsProfilePic = document.getElementById('settingsProfilePic');
    const defaultSrc = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23fcc419%22/%3E%3Ccircle cx=%2250%22 cy=%2235%22 r=%2215%22 fill=%22%231a1a2e%22/%3E%3Cellipse cx=%2250%22 cy=%2270%22 rx=%2225%22 ry=%2218%22 fill=%22%231a1a2e%22/%3E%3C/svg%3E';

    settingsProfilePic.src = `/api/users/profile-picture/${user.id}`;
    settingsProfilePic.onerror = () => {
      settingsProfilePic.src = defaultSrc;
    };
  }
}

// ==================== MASK EMAIL ====================

function displayMaskedEmail(email) {
  if (!email) return;

  const parts = email.split('@');
  const localPart = parts[0];
  const domain = parts[1];

  // Mask local part: show first char and last char
  let maskedLocal = localPart[0];
  if (localPart.length > 2) {
    maskedLocal += '•'.repeat(Math.max(1, localPart.length - 2));
  }
  maskedLocal += localPart[localPart.length - 1];

  // Mask domain: show only first char and after @
  let maskedDomain = domain[0];
  maskedDomain += '•'.repeat(Math.max(1, domain.split('.')[0].length - 1));
  maskedDomain += '.' + domain.split('.').slice(1).join('.');

  const maskedEmail = maskedLocal + '@' + maskedDomain;
  const maskedEmailEl = document.getElementById('maskedEmail');
  if (maskedEmailEl) {
    maskedEmailEl.textContent = maskedEmail;
  }
}

// ==================== TAB NAVIGATION ====================

function initTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Hide all tabs
  const allTabs = document.querySelectorAll('.tab-content');
  allTabs.forEach(tab => tab.classList.remove('active'));

  // Remove active class from all buttons
  const allButtons = document.querySelectorAll('.tab-button');
  allButtons.forEach(btn => btn.classList.remove('active'));

  // Show selected tab
  const selectedTab = document.getElementById(`${tabName}-tab`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Add active class to clicked button
  const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }
}

// ==================== EVENT LISTENERS ==================== 

function setupEventListeners() {
  // Photo upload
  const photoUpload = document.getElementById('photoUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', handlePhotoUpload);
  }

  // Profile form submission
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileFormSubmit);
  }

  // Username real-time validation
  const usernameInput = document.getElementById('settingsUsername');
  if (usernameInput) {
    usernameInput.addEventListener('input', validateUsernameInput);
    usernameInput.addEventListener('blur', validateUsernameInput);
  }

  // Change image button
  const changeImageBtn = document.getElementById('changeImageBtn');
  if (changeImageBtn) {
    changeImageBtn.addEventListener('click', changeProfileImage);
  }

  // Password form controls
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const cancelPasswordForm = document.getElementById('cancelPasswordForm');
  const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
  const backToConfirm = document.getElementById('backToConfirm');
  const submitPasswordChange = document.getElementById('submitPasswordChange');
  const confirmCurrentPassword = document.getElementById('confirmCurrentPassword');

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', showPasswordChangeForm);
  }
  if (cancelPasswordForm) cancelPasswordForm.addEventListener('click', hidePasswordChangeForm);
  if (confirmPasswordBtn) confirmPasswordBtn.addEventListener('click', handlePasswordConfirmation);
  if (backToConfirm) backToConfirm.addEventListener('click', goBackToPasswordConfirm);
  if (submitPasswordChange) submitPasswordChange.addEventListener('click', handlePasswordFormSubmit);
  if (confirmCurrentPassword) {
    confirmCurrentPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handlePasswordConfirmation();
    });
  }

  // Close crop modal when clicking outside
  document.addEventListener('click', (e) => {
    const cropperModal = document.getElementById('cropperModal');

    // Close cropper modal if clicking outside
    if (cropperModal && e.target === cropperModal) {
      closeCropModal();
    }
  });
}

// ==================== PHOTO UPLOAD & CROPPING ====================

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Veuillez sélectionner une image');
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('L\'image doit faire moins de 5MB');
    return;
  }

  // Read file
  const reader = new FileReader();
  reader.onload = (event) => {
    originalImageData = event.target.result;
    currentImageData = event.target.result;
    // Directly open the crop modal
    cropImage();
  };
  reader.readAsDataURL(file);
}

function displayProfileImage(imageData) {
  const preview = document.getElementById('settingsProfilePic');
  if (preview) {
    preview.src = imageData;
    preview.classList.remove('hidden');
  }
}

function changeImage() {
  // Reset both original and current image data
  originalImageData = null;
  currentImageData = null;
  document.getElementById('photoUpload').value = '';
  document.getElementById('photoUpload').click();
}

function cropImage() {
  if (!originalImageData) return;
  
  const cropModal = document.getElementById('cropperModal');
  const cropImg = document.getElementById('cropImage');
  
  // Set image source to the ORIGINAL
  cropImg.src = originalImageData;
  
  // Show modal
  cropModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('crop-open');
  
  // Wait for image to load, then setup crop box
  if (cropImg.complete) {
    // Image is already cached
    setupCropBox();
  } else {
    // Wait for image to load
    cropImg.onload = function() {
      setupCropBox();
    };
  }
}

function setupCropBox() {
  const cropImg = document.getElementById('cropImage');
  const cropBox = document.getElementById('cropBox');
  const container = document.querySelector('.crop-container');
  
  // Ensure the image has finished rendering
  setTimeout(() => {
    // Get rendered dimensions
    const imgRect = cropImg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Image position relative to container
    const relativeLeft = imgRect.left - containerRect.left;
    const relativeTop = imgRect.top - containerRect.top;
    const imgWidth = imgRect.width;
    const imgHeight = imgRect.height;
    
    // Create circular crop box (70% of smaller dimension)
    const size = Math.min(imgWidth, imgHeight) * 0.7;
    
    // Center the crop box in the middle of the image
    const left = relativeLeft + (imgWidth - size) / 2;
    const top = relativeTop + (imgHeight - size) / 2;
    
    cropBox.style.width = size + 'px';
    cropBox.style.height = size + 'px';
    cropBox.style.left = left + 'px';
    cropBox.style.top = top + 'px';
    cropBox.style.display = 'block';
    
    // Store initial state for calculations
    cropBoxState.imgRelativeLeft = relativeLeft;
    cropBoxState.imgRelativeTop = relativeTop;
    cropBoxState.imgWidth = imgWidth;
    cropBoxState.imgHeight = imgHeight;
    
    // Add event listeners for dragging and resizing
    addCropBoxListeners();
  }, 0);
}

function addCropBoxListeners() {
  const cropBox = document.getElementById('cropBox');
  const handles = cropBox.querySelectorAll('.crop-box-handle');
  const container = document.querySelector('.crop-container');
  
  // Dragging the entire box
  cropBox.addEventListener('mousedown', function(e) {
    if (!e.target.classList.contains('crop-box-handle')) {
      cropBoxState.isDragging = true;
      cropBoxState.startX = e.clientX;
      cropBoxState.startY = e.clientY;
      cropBoxState.startLeft = cropBox.offsetLeft;
      cropBoxState.startTop = cropBox.offsetTop;
    }
  });
  
  // Resizing from handles
  handles.forEach(handle => {
    handle.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      cropBoxState.isResizing = true;
      cropBoxState.handle = handle.classList[1]; // Get handle class like 'crop-handle-se'
      cropBoxState.startX = e.clientX;
      cropBoxState.startY = e.clientY;
      cropBoxState.startWidth = cropBox.offsetWidth;
      cropBoxState.startHeight = cropBox.offsetHeight;
      cropBoxState.startLeft = cropBox.offsetLeft;
      cropBoxState.startTop = cropBox.offsetTop;
    });
  });
  
  // Global mouse move
  document.addEventListener('mousemove', function(e) {
    const cropBox = document.getElementById('cropBox');
    
    if (cropBoxState.isDragging) {
      const deltaX = e.clientX - cropBoxState.startX;
      const deltaY = e.clientY - cropBoxState.startY;
      
      let newLeft = cropBoxState.startLeft + deltaX;
      let newTop = cropBoxState.startTop + deltaY;
      
      const cropBoxWidth = parseInt(cropBox.style.width);
      const cropBoxHeight = parseInt(cropBox.style.height);
      
      const imgLeft = cropBoxState.imgRelativeLeft;
      const imgTop = cropBoxState.imgRelativeTop;
      const imgWidth = cropBoxState.imgWidth;
      const imgHeight = cropBoxState.imgHeight;
      
      // Constrain within image bounds
      newLeft = Math.max(imgLeft, Math.min(newLeft, imgLeft + imgWidth - cropBoxWidth));
      newTop = Math.max(imgTop, Math.min(newTop, imgTop + imgHeight - cropBoxHeight));
      
      cropBox.style.left = newLeft + 'px';
      cropBox.style.top = newTop + 'px';
    }
    
    if (cropBoxState.isResizing) {
      const deltaX = e.clientX - cropBoxState.startX;
      const deltaY = e.clientY - cropBoxState.startY;
      
      const handle = cropBoxState.handle;
      let newWidth = cropBoxState.startWidth;
      let newHeight = cropBoxState.startHeight;
      let newLeft = cropBoxState.startLeft;
      let newTop = cropBoxState.startTop;
      
      // Calculate size change based on handle
      let sizeChange = 0;
      if (handle.includes('e')) {
        sizeChange = deltaX;
      } else if (handle.includes('w')) {
        sizeChange = -deltaX;
      } else if (handle.includes('s')) {
        sizeChange = deltaY;
      } else if (handle.includes('n')) {
        sizeChange = -deltaY;
      }
      
      // Keep it circular (same width and height)
      newWidth = cropBoxState.startWidth + sizeChange;
      newHeight = newWidth; // Keep square
      
      // Adjust position based on which handle is being dragged
      if (handle.includes('w')) {
        newLeft = cropBoxState.startLeft - sizeChange;
      }
      if (handle.includes('n')) {
        newTop = cropBoxState.startTop - sizeChange;
      }
      
      // Minimum size
      newWidth = Math.max(50, newWidth);
      newHeight = newWidth;
      
      // Maximum size - should not exceed image
      const imgLeft = cropBoxState.imgRelativeLeft;
      const imgTop = cropBoxState.imgRelativeTop;
      const imgWidth = cropBoxState.imgWidth;
      const imgHeight = cropBoxState.imgHeight;
      
      newWidth = Math.min(newWidth, Math.min(imgWidth, imgHeight));
      newHeight = newWidth;
      
      // Constrain to image bounds
      newLeft = Math.max(imgLeft, newLeft);
      newTop = Math.max(imgTop, newTop);
      
      if (newLeft + newWidth > imgLeft + imgWidth) {
        newLeft = imgLeft + imgWidth - newWidth;
      }
      if (newTop + newHeight > imgTop + imgHeight) {
        newTop = imgTop + imgHeight - newHeight;
      }
      
      cropBox.style.width = newWidth + 'px';
      cropBox.style.height = newHeight + 'px';
      cropBox.style.left = newLeft + 'px';
      cropBox.style.top = newTop + 'px';
    }
  });
  
  // Global mouse up
  document.addEventListener('mouseup', function() {
    cropBoxState.isDragging = false;
    cropBoxState.isResizing = false;
  });
}

function confirmCrop() {
  const cropImg = document.getElementById('cropImage');
  const cropBox = document.getElementById('cropBox');
  
  // Create canvas for cropping
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const cropWidth = parseInt(cropBox.style.width);
  const cropHeight = parseInt(cropBox.style.height);
  const cropLeft = parseInt(cropBox.style.left);
  const cropTop = parseInt(cropBox.style.top);
  
  // Get actual image position relative to container
  const imgRelativeLeft = cropBoxState.imgRelativeLeft;
  const imgRelativeTop = cropBoxState.imgRelativeTop;
  
  // Calculate crop position relative to the image (not container)
  const cropLeftRelativeToImage = cropLeft - imgRelativeLeft;
  const cropTopRelativeToImage = cropTop - imgRelativeTop;
  
  // Get image scale factor (displayed size vs actual size)
  const img = new Image();
  img.onload = function() {
    const imgDisplayRect = cropImg.getBoundingClientRect();
    const scaleX = img.width / imgDisplayRect.width;
    const scaleY = img.height / imgDisplayRect.height;
    
    // Set canvas size to be square
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // Draw cropped image from ORIGINAL
    ctx.drawImage(
      img,
      cropLeftRelativeToImage * scaleX,
      cropTopRelativeToImage * scaleY,
      cropWidth * scaleX,
      cropHeight * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    // Convert to Base64 and update currentImageData (but keep originalImageData)
    croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
    currentImageData = croppedImageData;
    
    // Update preview
    const settingsProfilePic = document.getElementById('settingsProfilePic');
    if (settingsProfilePic) {
      settingsProfilePic.src = croppedImageData;
    }
    
    closeCropModal();
    
    // Show picture action buttons
    document.getElementById('uploadPhotoLabel').classList.add('hidden');
    document.getElementById('changeImageBtn').classList.remove('hidden');
    document.getElementById('pictureActionButtons').classList.remove('hidden');
    
    const message = 'Photo recadrée avec succès! Vous pouvez enregistrer la photo seule ou cliquer sur "Enregistrer les modifications" pour mettre à jour votre profil complet.';
    console.log(message); // For debugging
  };
  // Use the ORIGINAL image for cropping
  img.src = originalImageData;
}

function cropAgain() {
  // Reset the crop box and reopen crop modal
  if (originalImageData) {
    const cropBox = document.getElementById('cropBox');
    const cropImg = document.getElementById('cropImage');
    
    // Reset crop box
    if (cropBox) {
      cropBox.style.display = 'none';
    }
    
    // Reset image to original
    currentImageData = originalImageData;
    cropImg.src = originalImageData;
    
    // Wait for image to load and setup new crop box
    if (cropImg.complete) {
      setupCropBox();
    } else {
      cropImg.onload = function() {
        setupCropBox();
      };
    }
  }
}

function closeCropModal() {
  const cropModal = document.getElementById('cropperModal');
  const cropBox = document.getElementById('cropBox');
  if (cropModal) {
    cropModal.classList.add('hidden');
  }
  if (cropBox) {
    cropBox.style.display = 'none';
  }
  document.body.style.overflow = '';
  document.body.classList.remove('crop-open');
  cropBoxState.isDragging = false;
  cropBoxState.isResizing = false;
}

// ==================== PROFILE FORM SUBMISSION ====================

async function handleProfileFormSubmit(e) {
  e.preventDefault();

  // Get form values
  const username = document.getElementById('settingsUsername').value.trim();
  const age = document.getElementById('settingsAge').value.trim();
  const country = document.getElementById('settingsCountry').value.trim();
  const usernameError = document.getElementById('usernameError');

  // Reset error message
  if (usernameError) usernameError.style.display = 'none';

  // Validation
  if (!username) {
    alert('Le nom d\'utilisateur est obligatoire');
    return;
  }

  if (username.length < 3) {
    alert('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    return;
  }

  // Username validation: only alphanumeric and underscore
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    const errorMsg = 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores (_)';
    alert(errorMsg);
    if (usernameError) {
      usernameError.textContent = errorMsg;
      usernameError.style.display = 'block';
    }
    return;
  }

  // Check if username has changed
  if (currentUser && username === currentUser.username) {
    const errorMsg = 'Le nouveau nom d\'utilisateur doit être différent de votre nom actuel';
    alert(errorMsg);
    if (usernameError) {
      usernameError.textContent = errorMsg;
      usernameError.style.display = 'block';
    }
    return;
  }

  // Age validation: optional but must be valid if provided
  if (age) {
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      alert('L\'âge doit être entre 13 et 120');
      return;
    }
  }

  // Country is optional

  // Build update payload
  const payload = {
    username,
    country: country || null,
    age: age ? parseInt(age) : null
  };

  if (croppedImageData) {
    payload.profilePictureData = croppedImageData;
  }

  // Submit
  try {
    const response = await fetch('/api/users/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      alert('Profil mis à jour avec succès!');
      
      // Update session
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      Object.assign(user, payload);
      if (data.data && data.data.id) user.id = data.data.id;
      sessionStorage.setItem('user', JSON.stringify(user));

      // Reset cropped image
      croppedImageData = null;

      // Reload page to show updates
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      alert('Erreur: ' + (data.message || 'La mise à jour a échoué'));
    }
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    alert('Erreur lors de la mise à jour du profil');
  }
}

// ==================== PASSWORD FORM MANAGEMENT ====================

function showPasswordChangeForm() {
  const passwordChangeForm = document.getElementById('passwordChangeForm');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const passwordConfirmStep = document.getElementById('passwordConfirmStep');
  const passwordChangeStep = document.getElementById('passwordChangeStep');

  // Show the form and hide the button
  passwordChangeForm.classList.remove('hidden');
  changePasswordBtn.classList.add('hidden');

  // Reset both steps
  passwordConfirmStep.classList.remove('hidden');
  passwordChangeStep.classList.add('hidden');
  document.getElementById('confirmCurrentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmNewPassword').value = '';

  // Focus on password input
  document.getElementById('confirmCurrentPassword').focus();
}

function hidePasswordChangeForm() {
  const passwordChangeForm = document.getElementById('passwordChangeForm');
  const changePasswordBtn = document.getElementById('changePasswordBtn');

  // Hide the form and show the button
  passwordChangeForm.classList.add('hidden');
  changePasswordBtn.classList.remove('hidden');

  // Clear all fields
  document.getElementById('confirmCurrentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmNewPassword').value = '';

  // Clear all errors
  const currentPasswordError = document.getElementById('currentPasswordError');
  const newPasswordError = document.getElementById('newPasswordError');
  const confirmNewPasswordError = document.getElementById('confirmNewPasswordError');

  if (currentPasswordError) {
    currentPasswordError.style.display = 'none';
    currentPasswordError.textContent = '';
  }
  if (newPasswordError) {
    newPasswordError.style.display = 'none';
    newPasswordError.textContent = '';
  }
  if (confirmNewPasswordError) {
    confirmNewPasswordError.style.display = 'none';
    confirmNewPasswordError.textContent = '';
  }
}

function goBackToPasswordConfirm() {
  const passwordConfirmStep = document.getElementById('passwordConfirmStep');
  const passwordChangeStep = document.getElementById('passwordChangeStep');

  // Go back to step 1
  passwordConfirmStep.classList.remove('hidden');
  passwordChangeStep.classList.add('hidden');

  // Clear new password fields
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmNewPassword').value = '';

  // Clear errors
  const newPasswordError = document.getElementById('newPasswordError');
  const confirmNewPasswordError = document.getElementById('confirmNewPasswordError');

  if (newPasswordError) {
    newPasswordError.style.display = 'none';
    newPasswordError.textContent = '';
  }
  if (confirmNewPasswordError) {
    confirmNewPasswordError.style.display = 'none';
    confirmNewPasswordError.textContent = '';
  }

  // Focus on confirm password
  document.getElementById('confirmCurrentPassword').focus();
}

async function handlePasswordConfirmation() {
  const currentPassword = document.getElementById('confirmCurrentPassword').value.trim();
  const currentPasswordError = document.getElementById('currentPasswordError');

  // Clear previous error
  if (currentPasswordError) {
    currentPasswordError.style.display = 'none';
    currentPasswordError.textContent = '';
  }

  // Validation
  if (!currentPassword) {
    if (currentPasswordError) {
      currentPasswordError.textContent = 'Veuillez entrer votre mot de passe actuel';
      currentPasswordError.style.display = 'block';
    }
    return;
  }

  try {
    // Verify current password
    const response = await fetch('/api/users/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentPassword
      })
    });

    const data = await response.json();

    if (data.success) {
      // Move to step 2
      const passwordConfirmStep = document.getElementById('passwordConfirmStep');
      const passwordChangeStep = document.getElementById('passwordChangeStep');

      passwordConfirmStep.classList.add('hidden');
      passwordChangeStep.classList.remove('hidden');

      // Focus on new password field
      document.getElementById('newPassword').focus();
    } else {
      const errorMsg = data.message || 'Le mot de passe est incorrect';
      if (currentPasswordError) {
        currentPasswordError.textContent = errorMsg;
        currentPasswordError.style.display = 'block';
      }
      document.getElementById('confirmCurrentPassword').value = '';
    }
  } catch (error) {
    console.error('Erreur vérification mot de passe:', error);
    if (currentPasswordError) {
      currentPasswordError.textContent = 'Erreur lors de la vérification du mot de passe';
      currentPasswordError.style.display = 'block';
    }
  }
}

// ==================== PASSWORD FORM SUBMISSION ====================

async function handlePasswordFormSubmit() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  const currentPassword = document.getElementById('confirmCurrentPassword').value;

  // Get error elements
  const newPasswordError = document.getElementById('newPasswordError');
  const confirmNewPasswordError = document.getElementById('confirmNewPasswordError');

  // Clear previous errors
  if (newPasswordError) {
    newPasswordError.style.display = 'none';
    newPasswordError.textContent = '';
  }
  if (confirmNewPasswordError) {
    confirmNewPasswordError.style.display = 'none';
    confirmNewPasswordError.textContent = '';
  }

  // Validation
  if (newPassword.length < 6) {
    const errorMsg = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
    if (newPasswordError) {
      newPasswordError.textContent = errorMsg;
      newPasswordError.style.display = 'block';
    }
    return;
  }

  if (newPassword !== confirmNewPassword) {
    const errorMsg = 'Les mots de passe ne correspondent pas';
    if (confirmNewPasswordError) {
      confirmNewPasswordError.textContent = errorMsg;
      confirmNewPasswordError.style.display = 'block';
    }
    return;
  }

  if (currentPassword === newPassword) {
    const errorMsg = 'Le nouveau mot de passe doit être différent du mot de passe actuel';
    if (newPasswordError) {
      newPasswordError.textContent = errorMsg;
      newPasswordError.style.display = 'block';
    }
    return;
  }

  try {
    const response = await fetch('/api/users/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: newPassword,
        currentPassword: currentPassword // Already verified in previous step
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Mot de passe modifié avec succès!');
      hidePasswordChangeForm();
      // Re-login may be required
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      const errorMsg = data.message || 'La modification a échoué';
      if (newPasswordError) {
        newPasswordError.textContent = errorMsg;
        newPasswordError.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Erreur modification mot de passe:', error);
    if (newPasswordError) {
      newPasswordError.textContent = 'Erreur lors de la modification du mot de passe';
      newPasswordError.style.display = 'block';
    }
  }
}

// ==================== UTILITY FUNCTIONS ====================

async function updateAuthUI() {
  const authButtons = document.getElementById('authButtons');
  const userIcons = document.getElementById('userIcons');
  
  if (!authButtons || !userIcons) return;

  try {
    const auth = await checkAuthStatus();
    if (auth.isLoggedIn) {
      authButtons.classList.add('hidden');
      userIcons.classList.remove('hidden');
      loadNavProfilePicture(auth.user.id);
    } else {
      authButtons.classList.remove('hidden');
      userIcons.classList.add('hidden');
    }
  } catch (e) {
    console.error('Erreur auth UI:', e);
  }
}

function loadNavProfilePicture(userId) {
  const navPic = document.getElementById('navProfilePic');
  if (!navPic) return;
  
  const defaultSrc = navPic.src;
  navPic.src = '/api/users/profile-picture/' + userId;
  navPic.onerror = () => {
    navPic.src = defaultSrc;
  };
}

function initMobileNav() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavClose = document.getElementById('mobileNavClose');

  if (!hamburgerBtn || !mobileNav) return;

  hamburgerBtn.addEventListener('click', () => {
    mobileNav.classList.add('active');
    if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
  });

  if (mobileNavClose && mobileNav) {
    mobileNavClose.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
    });
  }

  if (mobileNavOverlay && mobileNav) {
    mobileNavOverlay.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      mobileNavOverlay.classList.remove('active');
    });
  }
}

// ==================== USERNAME VALIDATION ====================

function validateUsernameInput() {
  const usernameInput = document.getElementById('settingsUsername');
  const usernameError = document.getElementById('usernameError');
  const username = usernameInput.value.trim();

  // Reset error display
  if (usernameError) {
    usernameError.style.display = 'none';
    usernameError.textContent = '';
  }

  if (!username) {
    return; // Allow empty until submit
  }

  // Username validation: only alphanumeric and underscore
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    const errorMsg = 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores (_)';
    if (usernameError) {
      usernameError.textContent = errorMsg;
      usernameError.style.display = 'block';
    }
    return false;
  }

  if (username.length < 3) {
    const errorMsg = 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
    if (usernameError) {
      usernameError.textContent = errorMsg;
      usernameError.style.display = 'block';
    }
    return false;
  }

  return true;
}

// ==================== PROFILE PICTURE MANAGEMENT ====================

function changeProfileImage() {
  document.getElementById('photoUpload').click();
}

function cancelProfilePictureChange() {
  // Reset cropped image
  croppedImageData = null;
  currentImageData = null;
  originalImageData = null;
  
  // Reset file input
  document.getElementById('photoUpload').value = '';
  
  // Hide action buttons and change button
  document.getElementById('changeImageBtn').classList.add('hidden');
  document.getElementById('pictureActionButtons').classList.add('hidden');
  document.getElementById('uploadPhotoLabel').classList.remove('hidden');
}

async function savePictureOnly() {
  if (!croppedImageData) {
    alert('Aucune image à enregistrer');
    return;
  }

  try {
    const response = await fetch('/api/users/upload-profile-picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profilePictureData: croppedImageData
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Photo de profil mise à jour avec succès!');
      
      // Reset
      croppedImageData = null;
      document.getElementById('photoUpload').value = '';
      document.getElementById('changeImageBtn').classList.add('hidden');
      document.getElementById('pictureActionButtons').classList.add('hidden');
      document.getElementById('uploadPhotoLabel').classList.remove('hidden');
      
      // Reload to see the new picture
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      alert('Erreur: ' + (data.message || 'Impossible de mettre à jour la photo'));
    }
  } catch (error) {
    console.error('Erreur sauvegarde photo:', error);
    alert('Erreur lors de la sauvegarde de la photo');
  }
}

// Search support
async function performSearch() {
  const query = document.getElementById('searchInput')?.value?.trim();
  if (!query) return;
  window.location.href = `jeux.html?search=${encodeURIComponent(query)}`;
}
