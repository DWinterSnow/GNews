// Login Page JavaScript
// Handles tab switching, multi-step registration, form submission, and profile picture upload

// ============================================
// MOBILE NAV HAMBURGER MENU
// ============================================

function initMobileNav() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileNavClose = document.getElementById('mobileNavClose');

    if (!hamburgerBtn || !mobileNav) return;

    function openMobileNav() {
        mobileNav.classList.add('active');
        if (mobileNavOverlay) mobileNavOverlay.classList.add('active');
        hamburgerBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileNav() {
        mobileNav.classList.remove('active');
        if (mobileNavOverlay) mobileNavOverlay.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        document.body.style.overflow = '';
    }

    hamburgerBtn.addEventListener('click', function() {
        if (mobileNav.classList.contains('active')) {
            closeMobileNav();
        } else {
            openMobileNav();
        }
    });

    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', closeMobileNav);
    }

    if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', closeMobileNav);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            closeMobileNav();
        }
    });
}

document.addEventListener('DOMContentLoaded', initMobileNav);

// ============================================
// REGISTRATION STATE MANAGEMENT
// ============================================

const registrationData = {
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  age: '',
  country: '',
  profilePictureData: null,
  profilePictureName: null
};

let currentStep = 1;

// ============================================
// AUTH UI MANAGEMENT (Show/Hide buttons based on login state)
// ============================================

async function updateAuthUI() {
  const authButtons = document.getElementById('authButtons');
  const userIcons = document.getElementById('userIcons');
  
  if (!authButtons || !userIcons) return;
  
  try {
    if (typeof checkAuthStatus === 'function') {
      const auth = await checkAuthStatus();
      if (auth.isLoggedIn) {
        authButtons.classList.add('hidden');
        userIcons.classList.remove('hidden');
        loadNavProfilePicture(auth.user.id);
      } else {
        authButtons.classList.remove('hidden');
        userIcons.classList.add('hidden');
      }
      return;
    }
  } catch (e) {}
  
  const userSession = sessionStorage.getItem('user');
  if (userSession) {
    authButtons.classList.add('hidden');
    userIcons.classList.remove('hidden');
    try {
      const user = JSON.parse(userSession);
      if (user && user.id) loadNavProfilePicture(user.id);
    } catch (e) {}
  } else {
    authButtons.classList.remove('hidden');
    userIcons.classList.add('hidden');
  }
}

function loadNavProfilePicture(userId) {
  const navPic = document.getElementById('navProfilePic');
  if (!navPic) return;
  const defaultSrc = navPic.src;
  navPic.src = '/api/users/profile-picture/' + userId;
  navPic.onerror = () => { navPic.src = defaultSrc; };
}

// Call updateAuthUI on page load
document.addEventListener('DOMContentLoaded', updateAuthUI);

// ============================================
// TAB SWITCHING WITH ANIMATION
// ============================================

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (tab === 'login') {
    // Slide register out to right, slide login in from left
    registerForm.classList.add('exit-right');
    registerForm.classList.remove('active', 'exit-left');
    
    setTimeout(() => {
      loginForm.classList.add('active');
      loginForm.classList.remove('exit-left', 'exit-right');
      registerForm.style.display = 'none';
    }, 200);
  } else {
    // Slide login out to left, slide register in from right
    loginForm.classList.add('exit-left');
    loginForm.classList.remove('active', 'exit-right');
    
    setTimeout(() => {
      registerForm.style.display = 'block';
      registerForm.classList.add('active');
      registerForm.classList.remove('exit-left', 'exit-right');
      goToStep(1);
    }, 200);
  }
  
  clearAllErrors();
}

function switchToRegister() {
  switchAuthTab('register');
}

// ============================================
// ERROR/SUCCESS CLEARING
// ============================================

function clearAllErrors() {
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  document.querySelectorAll('.success-message').forEach(el => el.textContent = '');
}

// ============================================
// PROFILE PICTURE HANDLING
// ============================================

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

document.getElementById('profilePicture')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  
  if (file) {
    // Convert to base64 and store
    const reader = new FileReader();
    reader.onload = function(event) {
      originalImageData = event.target.result;
      currentImageData = event.target.result;
      displayProfileImage(currentImageData);
    };
    reader.readAsDataURL(file);
  }
});

function displayProfileImage(imageData) {
  const preview = document.getElementById('profilePreview');
  const buttonsContainer = document.getElementById('profileButtonsContainer');
  const uploadBtn = document.getElementById('uploadPhotoBtn');
  
  preview.src = imageData;
  preview.classList.remove('hidden');
  buttonsContainer.classList.remove('hidden');
  uploadBtn.style.display = 'none';
}

function changeImage() {
  // Reset both original and current image data
  originalImageData = null;
  currentImageData = null;
  document.getElementById('profilePicture').value = '';
  document.getElementById('profilePicture').click();
}

function cropImage() {
  if (!originalImageData) return;
  
  const cropModal = document.getElementById('cropModal');
  const cropImg = document.getElementById('cropImage');
  
  // Set image source to the ORIGINAL
  cropImg.src = originalImageData;
  
  // Show modal
  cropModal.classList.remove('hidden');
  
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
    
    // Convert to Base64and update currentImageData (but keep originalImageData)
    currentImageData = canvas.toDataURL('image/jpeg', 0.9);
    displayProfileImage(currentImageData);
    closeCropModal();
  };
  // Use the ORIGINAL image for cropping
  img.src = originalImageData;
}

function closeCropModal() {
  const cropModal = document.getElementById('cropModal');
  const cropBox = document.getElementById('cropBox');
  cropModal.classList.add('hidden');
  cropBox.style.display = 'none';
  cropBoxState.isDragging = false;
  cropBoxState.isResizing = false;
}

// ============================================
// MULTI-STEP WIZARD NAVIGATION
// ============================================

function goToStep(step) {
  // Hide all steps
  document.querySelectorAll('.register-step').forEach(s => {
    s.classList.remove('active');
  });
  
  // Show selected step
  const selectedStep = document.getElementById(`step${step}`);
  if (selectedStep) {
    selectedStep.classList.add('active');
  }
  
  // Update progress indicator
  updateProgressIndicator(step);
  
  currentStep = step;
  clearAllErrors();
}

function updateProgressIndicator(activeStep) {
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    
    if (stepNum === activeStep) {
      step.classList.add('active');
    } else if (stepNum < activeStep) {
      step.classList.add('completed');
    }
  });
  
  // Update progress bar fill
  const progressIndicator = document.querySelector('.progress-indicator');
  if (progressIndicator) {
    // Calculate progress: 0% for step 1, 50% for step 2, 100% for step 3
    const progressPercentage = ((activeStep - 1) / 2) * 100;
    progressIndicator.style.setProperty('--progress-width', progressPercentage + '%');
  }
}

function nextStep(step) {
  // Validate current step before moving to next
  if (currentStep === 1) {
    if (!validateStep1()) {
      return;
    }
  } else if (currentStep === 2) {
    if (!validateStep2()) {
      return;
    }
  } else if (currentStep === 3) {
    // On step 3, validate password
    if (!validateStep3()) {
      return;
    }
  }
  
  // Move to next step
  goToStep(step);
  
  // If moving to step 3, display the review data
  if (step === 3) {
    updateReviewDisplay();
  }
}

function previousStep(step) {
  goToStep(step);
}

// ============================================
// STEP VALIDATION
// ============================================

function validateStep1() {
  const username = document.getElementById('registerUsername').value.trim();
  const errorEl = document.getElementById('step1Error');
  
  errorEl.textContent = '';
  
  // Photo is optional but if provided, should be set in currentImageData
  // Username is REQUIRED
  if (!username) {
    errorEl.textContent = 'Veuillez entrer votre nom d\'utilisateur';
    return false;
  }
  
  if (username.length < 3) {
    errorEl.textContent = 'Le pseudo doit faire au moins 3 caractères';
    return false;
  }
  
  // Check if username contains only alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errorEl.textContent = 'Le pseudo ne peut contenir que des lettres, chiffres et _ (tiret bas)';
    return false;
  }
  
  // Get age and country (both optional)
  const age = document.getElementById('registerAge').value.trim();
  const country = document.getElementById('registerCountry').value;
  
  // Store in registration data
  registrationData.username = username;
  registrationData.age = age || '';
  registrationData.country = country || '';
  
  return true;
}

function validateStep2() {
  const email = document.getElementById('registerEmail').value.trim();
  const errorEl = document.getElementById('step2Error');
  
  errorEl.textContent = '';
  
  if (!email) {
    errorEl.textContent = 'Veuillez entrer votre adresse email';
    return false;
  }
  
  // Check if email contains at least one letter
  if (!/[a-zA-Z]/.test(email)) {
    errorEl.textContent = 'Email invalide - doit contenir au moins une lettre';
    return false;
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorEl.textContent = 'Veuillez entrer une adresse email valide';
    return false;
  }
  
  // Store in registration data
  registrationData.email = email;
  return true;
}

function validateStep3() {
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const errorEl = document.getElementById('step3Error');
  
  errorEl.textContent = '';
  
  if (!password) {
    errorEl.textContent = 'Veuillez entrer votre mot de passe';
    return false;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'Le mot de passe doit faire au moins 6 caractères';
    return false;
  }
  
  // Check if password contains at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    errorEl.textContent = 'Mot de passe invalide - doit contenir au moins une lettre';
    return false;
  }
  
  // Check if password looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(password)) {
    errorEl.textContent = 'Le mot de passe ne peut pas être une adresse email';
    return false;
  }
  
  if (!confirmPassword) {
    errorEl.textContent = 'Veuillez confirmer votre mot de passe';
    return false;
  }
  
  if (password !== confirmPassword) {
    errorEl.textContent = 'Les mots de passe ne correspondent pas';
    return false;
  }
  
  registrationData.password = password;
  registrationData.confirmPassword = confirmPassword;
  return true;
}

// ============================================
// CANCEL REGISTRATION
// ============================================

function confirmCancelRegistration() {
  document.getElementById('cancelModal').classList.remove('hidden');
}

function closeCancelModal() {
  document.getElementById('cancelModal').classList.add('hidden');
}

function cancelRegistration() {
  // Clear all data
  Object.keys(registrationData).forEach(key => {
    registrationData[key] = null;
  });
  
  currentImageData = null;
  originalImageData = null;
  
  // Clear form
  document.getElementById('registerForm').reset();
  document.getElementById('profilePreview').classList.add('hidden');
  document.getElementById('profileButtonsContainer').classList.add('hidden');
  document.getElementById('uploadPhotoBtn').style.display = 'inline-block';
  document.getElementById('registerAge').value = '';
  document.getElementById('registerCountry').value = '';
  
  // Go back to login tab and step 1
  closeCancelModal();
  switchAuthTab('login');
  goToStep(1);
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('cancelModal');
  if (event.target === modal) {
    closeCancelModal();
  }
});

// ============================================
// LOGIN HANDLER
// ============================================

async function handleLogin(event) {
  event.preventDefault();
  clearAllErrors();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const loginBtn = document.getElementById('loginBtn');
  const loginSpinner = document.getElementById('loginSpinner');
  
  // Show loading
  loginBtn.disabled = true;
  loginSpinner.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    const result = await loginUser(email, password);
    
    if (result.success) {
      // Show success message
      document.getElementById('loginSuccess').textContent = 'Connexion réussie! Redirection...';
      
      // Store user info
      sessionStorage.setItem('user', JSON.stringify(result.user));
      updateAuthUI();
      
      // Redirect after 1.5 seconds
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      document.getElementById('loginError').textContent = '' + result.message;
    }
  } catch (error) {
    document.getElementById('loginError').textContent = 'Erreur: ' + error.message;
  } finally {
    loginBtn.disabled = false;
    loginSpinner.innerHTML = '';
  }
}

// ============================================
// REGISTER HANDLER (FINAL STEP)
// ============================================

async function handleRegister(event) {
  event.preventDefault();
  
  // Validate step 3 (password)
  if (!validateStep3()) {
    return;
  }
  
  // Use current image data if available
  if (currentImageData) {
    registrationData.profilePictureData = currentImageData;
    registrationData.profilePictureName = 'profile-picture.jpg';
  }
  
  const registerBtn = document.getElementById('registerBtn');
  const registerSpinner = document.getElementById('registerSpinner');
  
  // Show loading
  registerBtn.disabled = true;
  registerSpinner.innerHTML = '<div class="loading-spinner"></div>';
  
  try {
    // Register user with all collected data
    const result = await registerUser(
      registrationData.username,
      registrationData.email,
      registrationData.password,
      registrationData.confirmPassword,
      registrationData.profilePictureData,
      registrationData.profilePictureName,
      registrationData.age,
      registrationData.country
    );
    
    if (result.success) {
      document.getElementById('step3Success').textContent = `Compte cree! Bienvenue ${registrationData.username}. Redirection...`;
      
      // Save credentials before clearing
      const loginEmail = registrationData.email;
      const loginPassword = registrationData.password;
      
      // Clear registration data
      Object.keys(registrationData).forEach(key => {
        registrationData[key] = null;
      });
      
      // Auto-login after registration
      setTimeout(async () => {
        const loginResult = await loginUser(loginEmail, loginPassword);
        if (loginResult.success) {
          sessionStorage.setItem('user', JSON.stringify(loginResult.user));
          window.location.href = 'index.html';
        }
      }, 1500);
    } else {
      document.getElementById('step3Error').textContent = '' + result.message;
    }
  } catch (error) {
    document.getElementById('step3Error').textContent = 'Erreur: ' + error.message;
  } finally {
    registerBtn.disabled = false;
    registerSpinner.innerHTML = '';
  }
}

// ============================================
// COUNTRIES INITIALIZATION & SELECT
// ============================================

// List of all countries
const COUNTRIES_LIST = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
  'Anguilla', 'Antarctique', 'Antigua-et-Barbuda', 'Arabie Saoudite', 'Argentine', 'Arménie',
  'Aruba', 'Australie', 'Autriche', 'Azerbaïdjan', 'Bahamas', 'Bahreïn', 'Bangladesh',
  'Barbade', 'Belgique', 'Belize', 'Bénin', 'Bermudes', 'Bhoutan', 'Biélorussie', 'Birmanie',
  'Bissau-Guinée', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 'Brésil', 'Brunei', 'Bulgarie',
  'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun', 'Canada', 'Cap-Vert', 'Chili', 'Chine',
  'Chypre', 'Colombie', 'Comores', 'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica',
  'Côte d\'Ivoire', 'Croatie', 'Cuba', 'Curaçao', 'Danemark', 'Djibouti', 'Dominique',
  'Égypte', 'Émirats Arabes Unis', 'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'États-Unis',
  'Éthiopie', 'Fidji', 'Finlande', 'Formose', 'France', 'Gabon', 'Gambie', 'Géorgie',
  'Ghana', 'Gibraltar', 'Grèce', 'Grenade', 'Groenland', 'Guadeloupe', 'Guam', 'Guatemala',
  'Guernesey', 'Guinée', 'Guinée Équatoriale', 'Guyana', 'Guyane Française', 'Haïti',
  'Honduras', 'Hong Kong', 'Hongrie', 'Île Bouvet', 'Île Christmas', 'Île Norfolk',
  'Îles Åland', 'Îles Caïmans', 'Îles Cocos', 'Îles Cook', 'Îles Féroé', 'Îles Heard',
  'Îles Malouines', 'Îles Mariannes du Nord', 'Îles Marshall', 'Îles Pitcairn',
  'Îles Salomon', 'Îles Turques-et-Caïques', 'Îles Vierges Britanniques',
  'Îles Vierges des États-Unis', 'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande',
  'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jersey', 'Jordanie', 'Kazakhstan',
  'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Laos', 'Lesotho', 'Lettonie',
  'Liban', 'Liberia', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg', 'Macao',
  'Macédoine', 'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte',
  'Maroc', 'Martinique', 'Mauritanie', 'Maurice', 'Mayotte', 'Mexique', 'Micronésie',
  'Moldavie', 'Monaco', 'Mongolie', 'Monténégro', 'Montserrat', 'Mozambique', 'Namibie',
  'Nauru', 'Népal', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norvège', 'Nouvelle-Calédonie',
  'Nouvelle-Zélande', 'Oman', 'Ouganda', 'Ouzbékistan', 'Pakistan', 'Palaos', 'Palestine',
  'Panama', 'Papouasie-Nouvelle-Guinée', 'Pâques (Île de)', 'Paraguay', 'Pays-Bas', 'Pérou',
  'Philippines', 'Pologne', 'Polynésie Française', 'Porto Rico', 'Portugal', 'Qatar',
  'La Réunion', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Sahara Occidental',
  'Saint-Barthélemy', 'Saint-Martin', 'Saint-Marin', 'Saint-Vincent-et-les-Grenadines',
  'Sainte-Hélène', 'Sainte-Lucie', 'Samoa', 'Samoa Américaines', 'Samoa Occidentales',
  'San Marin', 'Sao Tomé-et-Principe', 'Sénégal', 'Serbie', 'Seychelles', 'Sierra Leone',
  'Singapour', 'Sint Maarten', 'Slovaquie', 'Slovénie', 'Somalie', 'Somaliland', 'Soudan',
  'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suisse', 'Suriname', 'Svalbard et Jan Mayen',
  'Swaziland', 'Syrie', 'Tadjikistan', 'Taïwan', 'Tanzanie', 'Tchad', 'Terres Australes Françaises',
  'Territoire Britannique de l\'Océan Indien', 'Thaïlande', 'Timor Oriental', 'Togo',
  'Tokelau', 'Tonga', 'Trinité-et-Tobago', 'Tristan da Cunha', 'Tunisie', 'Turkménistan',
  'Turquie', 'Tuvalu', 'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela', 'Viêt Nam',
  'Wallis et Futuna', 'Yémen', 'Zambie', 'Zimbabwe'
];

function initializeCountries() {
  const countrySelect = document.getElementById('registerCountry');
  
  if (!countrySelect) return;
  
  // Populate select with all countries
  COUNTRIES_LIST.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });
}

function updateReviewDisplay() {
  // Update review section with current form values
  const photoImg = document.getElementById('reviewPhoto');
  const photoText = document.getElementById('reviewPhotoText');
  const usernameEl = document.getElementById('reviewUsername');
  const ageEl = document.getElementById('reviewAge');
  const countryEl = document.getElementById('reviewCountry');
  const emailEl = document.getElementById('reviewEmail');
  
  if (photoImg && photoText) {
    if (currentImageData) {
      photoImg.src = currentImageData;
      photoImg.style.display = 'block';
      photoText.style.display = 'none';
    } else {
      photoImg.style.display = 'none';
      photoText.style.display = 'block';
      photoText.textContent = 'Non définie';
    }
  }
  
  if (usernameEl) {
    usernameEl.textContent = registrationData.username || '-';
  }
  
  if (ageEl) {
    ageEl.textContent = registrationData.age ? registrationData.age + ' ans' : 'Non défini';
  }
  
  if (countryEl) {
    countryEl.textContent = registrationData.country || 'Non défini';
  }
  
  if (emailEl) {
    emailEl.textContent = registrationData.email || '-';
  }
}

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user already logged in
  const auth = await checkAuthStatus();
  
  if (auth.isLoggedIn) {
    // Redirect to home if already logged in
    window.location.href = 'index.html';
  }
  
  // Check URL parameters to determine which tab should be shown
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('signup') === 'true') {
    switchAuthTab('register');
  }
  
  // Initialize countries dropdown
  initializeCountries();
  
  // Initialize registration wizard to step 1
  goToStep(1);
});

// ============================================
// FORGOT PASSWORD
// ============================================

let forgotPasswordData = {
  email: '',
  username: ''
};

function openForgotPassword() {
  forgotPasswordData = { email: '', username: '' };
  document.getElementById('forgotPasswordModal').classList.remove('hidden');
  // Reset to step 1
  document.querySelectorAll('.forgot-step').forEach(s => s.classList.remove('active'));
  document.getElementById('forgotStep1').classList.add('active');
  // Clear all inputs and messages
  document.getElementById('forgotEmail').value = '';
  document.getElementById('forgotUsername').value = '';
  document.getElementById('forgotNewPassword').value = '';
  document.getElementById('forgotConfirmPassword').value = '';
  document.getElementById('forgotStep1Error').textContent = '';
  document.getElementById('forgotStep2Error').textContent = '';
  document.getElementById('forgotStep3Error').textContent = '';
  document.getElementById('forgotStep3Success').textContent = '';
}

function closeForgotPassword() {
  document.getElementById('forgotPasswordModal').classList.add('hidden');
}

async function forgotStep1Next() {
  const email = document.getElementById('forgotEmail').value.trim();
  const errorEl = document.getElementById('forgotStep1Error');
  errorEl.textContent = '';

  if (!email) {
    errorEl.textContent = 'Veuillez entrer votre adresse email';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorEl.textContent = 'Veuillez entrer une adresse email valide';
    return;
  }

  forgotPasswordData.email = email;

  // Go to step 2
  document.querySelectorAll('.forgot-step').forEach(s => s.classList.remove('active'));
  document.getElementById('forgotStep2').classList.add('active');
}

async function forgotStep2Next() {
  const username = document.getElementById('forgotUsername').value.trim();
  const errorEl = document.getElementById('forgotStep2Error');
  errorEl.textContent = '';

  if (!username) {
    errorEl.textContent = 'Veuillez entrer votre nom d\'utilisateur';
    return;
  }

  forgotPasswordData.username = username;

  // Verify email + username match
  try {
    const result = await verifyResetIdentity(forgotPasswordData.email, forgotPasswordData.username);
    if (result.success) {
      // Go to step 3
      document.querySelectorAll('.forgot-step').forEach(s => s.classList.remove('active'));
      document.getElementById('forgotStep3').classList.add('active');
    } else {
      errorEl.textContent = '' + result.message;
    }
  } catch (error) {
    errorEl.textContent = 'Erreur: ' + error.message;
  }
}

async function forgotResetPassword() {
  const newPassword = document.getElementById('forgotNewPassword').value;
  const confirmPassword = document.getElementById('forgotConfirmPassword').value;
  const errorEl = document.getElementById('forgotStep3Error');
  const successEl = document.getElementById('forgotStep3Success');
  const resetBtn = document.getElementById('forgotResetBtn');
  errorEl.textContent = '';
  successEl.textContent = '';

  if (!newPassword) {
    errorEl.textContent = 'Veuillez entrer un nouveau mot de passe';
    return;
  }

  if (newPassword.length < 6) {
    errorEl.textContent = 'Le mot de passe doit faire au moins 6 caractères';
    return;
  }

  if (!/[a-zA-Z]/.test(newPassword)) {
    errorEl.textContent = 'Le mot de passe doit contenir au moins une lettre';
    return;
  }

  if (!confirmPassword) {
    errorEl.textContent = 'Veuillez confirmer le mot de passe';
    return;
  }

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'Les mots de passe ne correspondent pas';
    return;
  }

  resetBtn.disabled = true;

  try {
    const result = await resetUserPassword(forgotPasswordData.email, forgotPasswordData.username, newPassword);
    if (result.success) {
      successEl.textContent = 'Mot de passe réinitialisé avec succès ! Redirection...';
      setTimeout(() => {
        closeForgotPassword();
        // Pre-fill email in login form
        document.getElementById('loginEmail').value = forgotPasswordData.email;
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();
      }, 1500);
    } else {
      errorEl.textContent = '' + result.message;
    }
  } catch (error) {
    errorEl.textContent = 'Erreur: ' + error.message;
  } finally {
    resetBtn.disabled = false;
  }
}

// Close forgot password modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('forgotPasswordModal');
  if (event.target === modal) {
    closeForgotPassword();
  }
});
