# PowerShell script to fix Step 3 in login.html

$file = 'c:\Users\ruben\OneDrive\Documents\Formation\Cours\Projet tutoret\GNews\public\login.html'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Step 1: Replace the form groups with review section
$old_form_groups = '
                        <div class="form-group">
                            <label for="registerPassword">🔐 Mot de passe</label>
                            <input type="password" id="registerPassword" name="password" placeholder="Min. 6 caractères" required minlength="6">
                            <div class="error-message" id="registerPasswordError"></div>
                        </div>

                        <div class="form-group">
                            <label for="registerConfirmPassword">🔐 Confirmer le mot de passe</label>
                            <input type="password" id="registerConfirmPassword" name="confirmPassword" placeholder="Confirmez votre mot de passe" required minlength="6">
                            <div class="error-message" id="registerConfirmPasswordError"></div>
                        </div>'

$new_review_section = '
                        <div class="review-section">
                            <div class="review-group">
                                <h4>👤 Informations personnelles</h4>
                                <div class="review-item">
                                    <span class="review-label">Photo de profil:</span>
                                    <span class="review-value" id="reviewPhoto">Non définie</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Nom d''utilisateur:</span>
                                    <span class="review-value" id="reviewUsername">-</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Âge:</span>
                                    <span class="review-value" id="reviewAge">Non défini</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Pays:</span>
                                    <span class="review-value" id="reviewCountry">Non défini</span>
                                </div>
                            </div>

                            <div class="review-group">
                                <h4>📧 Compte</h4>
                                <div class="review-item">
                                    <span class="review-label">Email <span class="required">*</span>:</span>
                                    <span class="review-value" id="reviewEmail">-</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Mot de passe <span class="required">*</span>:</span>
                                    <span class="review-value">••••••••</span>
                                </div>
                            </div>

                            <div class="review-note">
                                <p><span class="required">*</span> = Information obligatoire</p>
                            </div>
                        </div>'

$content = $content -replace [regex]::Escape($old_form_groups), $new_review_section

# Step 2: Save the updated content
[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)

Write-Host "✅ Step 3 has been updated successfully!" -ForegroundColor Green
