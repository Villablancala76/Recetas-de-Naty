const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwI4fSqXAeY9U_sjYD9Wr4QiZyQUNX2m78paR_g5d0Z22Zh6Ff1_-tCm2BKFgXdComl/exec"; // Se reemplazará luego

// ==========================================
// STATE MANAGEMENT
// ==========================================
let currentUser = null; // null o { nombre, role } (role: 'user' | 'admin')
let base64Photo = null;
let currentIngredients = [];
let allRecipesCache = []; // almacena las recetas descargadas

// ==========================================
// DOM ELEMENTS
// ==========================================
const viewHome = document.getElementById('view-home');
const viewAuth = document.getElementById('view-auth');
const viewApp = document.getElementById('view-dashboard');

const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

const btnEnterApp = document.getElementById('btn-enter-app');

// ==========================================
// NAVIGATION (SPA)
// ==========================================
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.add('hidden');
        v.classList.remove('active');
        v.style.opacity = '0';
    });
    const target = document.getElementById(viewId);
    if(target) {
        target.classList.remove('hidden');
        setTimeout(() => {
            target.classList.add('active');
            target.style.opacity = '1';
        }, 50);
    }
}

// BOTON DEL LOGO PRINCIPAL -> va a Auth (Login/Register)
btnEnterApp.addEventListener('click', () => {
    switchView('view-auth');
});

// AUTH TABS
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.body.appendChild(document.querySelector(`.tab-btn[onclick="switchAuthTab('${tab}')"]`)); // fix trigger visually
    
    // Quick visual fix for tabs
    const buttons = document.querySelectorAll('.tab-btn');
    if (tab === 'login') {
        buttons[0].classList.add('active');
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
    } else {
        buttons[1].classList.add('active');
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
    }
}

// ==========================================
// EYE ICON TOGGLE PASSWORD
// ==========================================
function togglePassword(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
        if (el.type === 'password') {
            el.type = 'text';
        } else {
            el.type = 'password';
        }
    }
}

// ==========================================
// AUTHENTICATION LOGIC (Mock/API)
// ==========================================

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    showToast("Iniciando sesión...");
    
    // Request a Google Apps Script (mocking local for now if no URL)
    if(APPS_SCRIPT_URL.includes("PROXIMO")) {
        // MOCK LOGIN FOR TESTING UI
        setTimeout(() => {
            currentUser = { 
                nombre: user, 
                // Admin mock if user is 'admin', else 'user'
                role: user.toLowerCase() === 'admin' ? 'admin' : 'user' 
            };
            finalizeLogin(currentUser);
        }, 1000);
        return;
    }

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=login&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`, {
            method: 'GET'
        });
        const data = await res.json();
        
        if(data.success) {
            currentUser = data.user; // { nombre, role }
            finalizeLogin(currentUser);
        } else {
            showToast("Error: " + data.message);
        }
    } catch (err) {
        showToast("Error de conexión con el servidor.");
        console.error(err);
    }
});

formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    showToast("Registrando usuario...");
    
    const payload = {
        action: 'register',
        nombre: document.getElementById('reg-nombre').value,
        tel: document.getElementById('reg-tel').value,
        dir: document.getElementById('reg-dir').value,
        pass: document.getElementById('reg-pass').value,
        super_code: document.getElementById('reg-super-code').value
    };

    if(APPS_SCRIPT_URL.includes("PROXIMO")) {
        // MOCK REGISTRATION
        setTimeout(() => {
            showToast("¡Registro Exitoso! Por favor, inicia sesión.");
            switchAuthTab('login');
        }, 1000);
        return;
    }

    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.success) {
            showToast("Registro exitoso. ¡Inicia sesión!");
            switchAuthTab('login');
        } else {
            showToast("Error: " + data.message);
        }
    } catch(err) {
        showToast("Error al conectar con la base de datos");
    }
});

function finalizeLogin(user) {
    showToast(`¡Bienvenido/a, ${user.nombre}!`);
    document.getElementById('user-greeting').innerText = `Hola, ${user.nombre}`;
    
    // Check Role to show Admin Button
    if(user.role === 'admin') {
        document.getElementById('btn-new-recipe').classList.remove('hidden');
    } else {
        document.getElementById('btn-new-recipe').classList.add('hidden');
    }

    switchView('view-dashboard');
    loadRecipes(); // Cargar recetas desde Backend
}

function logout() {
    currentUser = null;
    document.getElementById('form-login').reset();
    document.getElementById('form-register').reset();
    switchView('view-home');
}

// ==========================================
// RECIPE LOGIC
// ==========================================

async function loadRecipes() {
    const grid = document.getElementById('recipes-grid');
    grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando sabores...</p></div>';

    if(APPS_SCRIPT_URL.includes("PROXIMO")) {
        // MOCK RECIPES
        setTimeout(() => {
            allRecipesCache = [
                { id: 1, name: "Torta de Frutilla y Crema", image: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?q=80&w=400&auto=format&fit=crop", instructions: "Mezclar los ingredientes, hornear 40 mins, decorar con frutillas." },
                { id: 2, name: "Pastas Caseras de Naty", image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?q=80&w=400&auto=format&fit=crop", instructions: "Hacer la masa." }
            ];
            renderRecipes(allRecipesCache);
        }, 1500);
        return;
    }

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getRecipes`);
        const data = await res.json();
        if(data.success) {
            allRecipesCache = data.recipes;
            renderRecipes(allRecipesCache);
        } else {
            grid.innerHTML = `<p style="color:var(--danger)">Error: ${data.message}</p>`;
        }
    } catch(err) {
        grid.innerHTML = `<p>Error de conexión</p>`;
    }
}

function renderRecipes(recipesList) {
    const grid = document.getElementById('recipes-grid');
    grid.innerHTML = '';
    
    if(recipesList.length === 0) {
        grid.innerHTML = '<p>No se encontraron recetas.</p>';
        return;
    }

    recipesList.forEach(rec => {
        // IMAGE WORKAROUND FOR DRIVE
        let imgUrl = rec.image;
        if (imgUrl && imgUrl.includes("uc?export=view&id=")) {
            const fileId = imgUrl.split("id=")[1];
            // Thumbnail API is usually more reliable than uc export
            imgUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
        }

        const div = document.createElement('div');
        div.className = 'recipe-card';
        // HTML INJECTION CON BOTONES PROTEGIDOS
        let actionButtons = `<button class="btn-primary" onclick="viewRecipe('${rec.id}')">Ver Receta</button>`;
        
        if (currentUser && currentUser.role === 'admin') {
            actionButtons += `
                <button class="btn-secondary" onclick="editRecipe('${rec.id}')">✎ Modificar</button>
                <button class="btn-secondary" style="color:var(--danger); border-color:var(--danger);" onclick="deleteRecipe('${rec.id}')">🗑 Borrar</button>
            `;
        }

        div.innerHTML = `
            <img src="${imgUrl || 'https://placehold.co/400x200/2a2a2a/fff?text=Sin+Foto'}" alt="${rec.name}" class="recipe-image" loading="lazy" onclick="viewRecipe('${rec.id}')">
            <div class="recipe-info">
                <h3 onclick="viewRecipe('${rec.id}')">${rec.name}</h3>
                <p>${rec.instructions.substring(0, 60)}...</p>
                <div class="recipe-actions">${actionButtons}</div>
            </div>
        `;
        grid.appendChild(div);
    });
}

// SEARCH
document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allRecipesCache.filter(r => 
        r.name.toLowerCase().includes(query) || 
        r.instructions.toLowerCase().includes(query) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(query))
    );
    renderRecipes(filtered);
});

// ==========================================
// MODAL & NEW RECIPE LOGIC
// ==========================================

let editingRecipeOldId = null;

function openRecipeModal() {
    base64Photo = null;
    currentIngredients = [];
    editingRecipeOldId = null;
    document.getElementById('form-recipe').reset();
    document.getElementById('preview-img').className = 'hidden';
    document.getElementById('upload-text').style.opacity = '1';
    renderIngredients();
    
    document.getElementById('modal-recipe').classList.remove('hidden');
}

function closeRecipeModal() {
    document.getElementById('modal-recipe').classList.add('hidden');
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Get raw Base64 (remove Data URI scheme for Drive API later, or keep it depending on script)
            base64Photo = e.target.result;
            
            const img = document.getElementById('preview-img');
            img.src = base64Photo;
            img.classList.remove('hidden');
            document.getElementById('upload-text').style.opacity = '0';
        }
        // Resize could go here for optimization, for now read as data URL
        reader.readAsDataURL(file);
    }
}

function addIngredient() {
    const nameInput = document.getElementById('ing-name');
    const qtyInput = document.getElementById('ing-qty');
    
    if(nameInput.value.trim() !== '') {
        currentIngredients.push({
            name: nameInput.value.trim(),
            qty: qtyInput.value.trim()
        });
        nameInput.value = '';
        qtyInput.value = '';
        nameInput.focus();
        renderIngredients();
    }
}

function removeIngredient(index) {
    currentIngredients.splice(index, 1);
    renderIngredients();
}

function renderIngredients() {
    const list = document.getElementById('ingredients-list');
    list.innerHTML = '';
    currentIngredients.forEach((ing, i) => {
        const item = document.createElement('div');
        item.className = 'ing-item';
        item.innerHTML = `
            <span>• ${ing.name} ${ing.qty ? `(${ing.qty})` : ''}</span>
            <button type="button" onclick="removeIngredient(${i})">X</button>
        `;
        list.appendChild(item);
    });
}

document.getElementById('form-recipe').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!base64Photo && !editingRecipeOldId) {
        // En edición, si no sube foto nueva, idealmente reusamos la anterior. 
        // Para simplificar: exigimos foto siempre.
        showToast("Por favor, selecciona al menos la foto de la receta.");
        return;
    }
    if(currentIngredients.length === 0) {
        showToast("Añade al menos un ingrediente.");
        return;
    }

    const payload = {
        action: 'addRecipe',
        name: document.getElementById('rec-name').value,
        instructions: document.getElementById('rec-instructions').value,
        image_base64: base64Photo || "", 
        ingredients: currentIngredients,
        author: currentUser.nombre
    };

    // Si estamos editando, primero borramos la vieja.
    if (editingRecipeOldId) {
        await executeDeleteRecipe(editingRecipeOldId, false);
    }

    showToast("Subiendo a Google Drive... (puede tardar)");
    const btnSave = document.getElementById('btn-save-recipe');
    btnSave.disabled = true;
    btnSave.innerText = "Guardando...";

    if(APPS_SCRIPT_URL.includes("PROXIMO")) {
        // MOCK SAVE
        setTimeout(() => {
            showToast("Receta guardada exitosamente (Mock)");
            closeRecipeModal();
            loadRecipes(); // reload
            btnSave.disabled = false;
            btnSave.innerText = "Guardar en Drive";
        }, 2000);
        return;
    }

    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            showToast("¡Receta guardada en Drive!");
            closeRecipeModal();
            loadRecipes(); // Recargar grilla
        } else {
            showToast("Error: " + data.message);
        }
    } catch(err) {
        showToast("Error de conexión");
        console.error(err);
    } finally {
        btnSave.disabled = false;
        btnSave.innerText = "Guardar en Drive";
    }
});

// ==========================================
// VIEWER & ACTIONS (VER, EDITAR, BORRAR)
// ==========================================

function viewRecipe(id) {
    const rec = allRecipesCache.find(r => r.id === id);
    if (!rec) return;

    let imgUrl = rec.image;
    if (imgUrl && imgUrl.includes("uc?export=view&id=")) {
        imgUrl = `https://drive.google.com/thumbnail?id=${imgUrl.split("id=")[1]}&sz=w1000`;
    }

    const content = document.getElementById('view-recipe-content');
    content.innerHTML = `
        <img src="${imgUrl || 'https://placehold.co/800x400/2a2a2a/fff?text=Sin+Foto'}" alt="${rec.name}">
        <h2>${rec.name}</h2>
        <div class="recipe-meta-text">Subido por ${rec.author}</div>
        
        <div class="detail-section">
            <h4>Ingredientes</h4>
            <ul>
                ${rec.ingredients.map(ing => `<li>• ${ing.name} <strong>${ing.qty}</strong></li>`).join('')}
            </ul>
        </div>
        
        <div class="detail-section">
            <h4>Instrucciones Especiales</h4>
            <p>${rec.instructions}</p>
        </div>
    `;
    
    document.getElementById('modal-view-recipe').classList.remove('hidden');
}

function closeViewRecipeModal() {
    document.getElementById('modal-view-recipe').classList.add('hidden');
}

async function deleteRecipe(id) {
    if(!confirm("¿Estás seguro/a de borrar permanentemente esta receta?")) return;
    showToast("Borrando reserva...");
    await executeDeleteRecipe(id, true);
}

async function executeDeleteRecipe(id, shouldFormatUI = true) {
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteRecipe', recipeId: id })
        });
        const data = await res.json();
        if(data.success && shouldFormatUI) {
            showToast("Receta eliminada.");
            loadRecipes();
        }
    } catch(err) {
        if(shouldFormatUI) showToast("Error al borrar.");
        console.error(err);
    }
}

function editRecipe(id) {
    const rec = allRecipesCache.find(r => r.id === id);
    if(!rec) return;

    // Poblar formulario
    document.getElementById('rec-name').value = rec.name;
    document.getElementById('rec-instructions').value = rec.instructions;
    
    // Configurar ingredientes
    currentIngredients = [...rec.ingredients];
    renderIngredients();

    // Notas de edición
    showToast("Modificando receta (Por favor selecciona la foto nuevamente si quieres mantenerla)");
    base64Photo = null; 
    document.getElementById('preview-img').className = 'hidden';
    document.getElementById('upload-text').style.opacity = '1';
    
    // Guardar rastro para borrar en el POST
    editingRecipeOldId = id;

    // Mostrar modal
    document.getElementById('modal-recipe').classList.remove('hidden');
}

// ==========================================
// UTILS
// ==========================================
let toastTimeout;
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// ==========================================
// BACKGROUND INTERACTION
// ==========================================
window.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
});
