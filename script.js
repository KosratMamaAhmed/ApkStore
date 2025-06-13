document.addEventListener('DOMContentLoaded', () => {
    // ---- Global State & API ----
    let state = { apps: [] };
    let currentUser = null; 

    const API = {
        getApps: async () => fetch('/.netlify/functions/get-apps'),
        addApp: async (data) => fetch('/.netlify/functions/add-app', { method: 'POST', body: JSON.stringify(data) }),
        updateApp: async (data) => fetch('/.netlify/functions/update-app', { method: 'PUT', body: JSON.stringify(data) }),
        deleteApp: async (id) => fetch('/.netlify/functions/delete-app', { method: 'POST', body: JSON.stringify({ id }) }),
        updateDownloads: async (id) => fetch('/.netlify/functions/update-downloads', { method: 'POST', body: JSON.stringify({ id }) }),
        uploadFile: async (data) => fetch('/.netlify/functions/upload-file', { method: 'POST', body: JSON.stringify(data) })
    };

    const getEl = (id) => document.getElementById(id);

    // ---- UI Feedback ----
    const showToast = (message, type = 'info') => {
        const toastContainer = getEl('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    // ---- Data Management ----
    const loadData = async () => {
        try {
            const response = await API.getApps();
            if (!response.ok) throw new Error(`Server Error: ${response.status}`);
            state.apps = await response.json();
            renderAll();
        } catch (error) {
            console.error("Error loading data:", error);
            showToast("کێشەیەک لە وەرگرتنی داتادا ڕوویدا", "error");
        }
    };

    // ---- Rendering ----
    const renderAll = () => {
        renderApps();
        if (currentUser && currentUser.role === 'admin') {
            renderDashboard();
        }
    };

    const renderApps = (appsToRender = state.apps) => {
        const appCategoriesContainer = getEl('app-categories');
        appCategoriesContainer.innerHTML = '';
        const categories = { games: { title: 'یارییەکان', apps: [] }, tools: { title: 'ئامرازەکان', apps: [] }, social: { title: 'کۆمەڵایەتی', apps: [] } };
        (appsToRender || []).forEach(app => {
            if (app.category && categories[app.category]) {
                categories[app.category].apps.push(app);
            }
        });
        const isAdmin = currentUser && currentUser.role === 'admin';
        for (const key in categories) {
            if (categories[key].apps.length > 0) {
                const section = document.createElement('section');
                section.className = 'category-section';
                const appsHtml = categories[key].apps.map(app => `
                    <div class="app-card" data-id="${app.id}">
                        ${isAdmin ? `<div class="admin-actions"><button class="btn edit-app-btn" data-id="${app.id}">✏️</button><button class="btn delete-app-btn" data-id="${app.id}">🗑️</button></div>` : ''}
                        <img src="${app.icon}" alt="${app.name}" class="app-icon" onerror="this.src='https://i.ibb.co/9vjYpQZ/apk-store-logo.png'">
                        <span class="app-name">${app.name}</span>
                    </div>`).join('');
                section.innerHTML = `<h2 class="category-title">${categories[key].title}</h2><div class="app-grid">${appsHtml}</div>`;
                appCategoriesContainer.appendChild(section);
            }
        }
    };

    const renderDashboard = () => {
        getEl('total-apps').textContent = state.apps.length;
        getEl('total-downloads').textContent = state.apps.reduce((sum, app) => sum + (app.downloads || 0), 0).toLocaleString();
        getEl('most-downloaded-list').innerHTML = [...state.apps]
            .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
            .slice(0, 5)
            .map(app => `<div class="list-item"><span>${app.name}</span><span class="views-count">${(app.downloads || 0).toLocaleString()} داگرتن</span></div>`)
            .join('');
    };

    const renderAppDetails = (appId) => {
        const app = state.apps.find(a => a.id === parseInt(appId));
        if (!app) { navigateToPage('apps'); return; }
        getEl('details-app-icon').src = app.icon;
        getEl('details-app-name').textContent = app.name;
        getEl('details-app-category').textContent = app.category;
        getEl('details-app-description').textContent = app.description;
        getEl('details-app-version').textContent = app.version;
        getEl('details-app-downloads').textContent = (app.downloads || 0).toLocaleString();
        const downloadBtn = getEl('details-download-btn');
        downloadBtn.href = app.download_url;
        downloadBtn.setAttribute('download', `${app.name}.apk`);
        downloadBtn.dataset.id = app.id;
    };

    // ---- Actions ----
    const handleEditApp = (id) => {
        const app = state.apps.find(a => a.id === parseInt(id));
        if (app) {
            resetAppForm();
            getEl('form-title').textContent = "دەستکاری کردنی ئەپ";
            getEl('submit-app-btn').textContent = "پاشەکەوتکردن";
            getEl('app-id-input').value = app.id;
            getEl('app-name').value = app.name;
            getEl('app-description').value = app.description;
            getEl('app-category').value = app.category;
            getEl('app-version').value = app.version;
            const iconPreview = getEl('icon-preview');
            iconPreview.src = app.icon;
            iconPreview.classList.remove('hidden');
        }
    };

    const handleDeleteApp = async (id) => {
        if (confirm("دڵنیایت لە سڕینەوەی ئەم ئەپە؟")) {
            try {
                const response = await API.deleteApp(parseInt(id));
                if (!response.ok) throw new Error('Failed to delete on server');
                showToast("ئەپ سڕایەوە", "success");
                await loadData();
            } catch (error) {
                showToast(error.message, "error");
            }
        }
    };

    const handleDownloadClick = async (e) => {
        const appId = e.currentTarget.dataset.id;
        try {
            await API.updateDownloads(appId);
            const app = state.apps.find(a => a.id === parseInt(appId));
            if (app) {
                app.downloads = (app.downloads || 0) + 1;
                renderAppDetails(appId);
                if (currentUser && currentUser.role === 'admin') renderDashboard();
            }
        } catch (error) {
            console.error("Failed to update download count:", error);
        }
    };

    const navigateToPage = (pageId, appId = null) => {
        document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
        const targetPage = getEl(`${pageId}-page`);
        if (targetPage) targetPage.classList.remove('hidden');
        if (pageId === 'app-details' && appId) renderAppDetails(appId);
        else if (pageId === 'add-app') {
            resetAppForm();
            if (appId) handleEditApp(appId);
        }
        document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === pageId));
        getEl('page-title').textContent = document.querySelector(`.nav-link[data-page="${pageId}"]`)?.textContent || 'وردەکاریی ئەپ';
        getEl('sidebar').classList.remove('open');
        getEl('overlay').classList.add('hidden');
    };

    const setupUIForRole = () => {
        const isAdmin = currentUser && currentUser.role === 'admin';
        document.querySelectorAll('[data-role="admin"]').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
        getEl('admin-login-btn').style.display = isAdmin ? 'none' : '';
        getEl('logout-btn').style.display = isAdmin ? '' : 'none';
        renderAll();
    };

    const handleLogin = (event) => {
        event.preventDefault();
        const email = getEl('email').value.trim();
        const password = getEl('password').value;
        if (email === 'admin@store.com' && password === '1234') {
            currentUser = { role: 'admin' };
            sessionStorage.setItem('kurdAppAdmin', JSON.stringify(currentUser));
            getEl('login-modal-overlay').classList.add('hidden');
            setupUIForRole();
            showToast('بەخێربێیتەوە ئەدمین!', 'success');
        } else {
            getEl('login-error').textContent = 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.';
        }
    };
    
    const checkSession = () => {
        const storedAdmin = sessionStorage.getItem('kurdAppAdmin');
        if (storedAdmin) {
            currentUser = JSON.parse(storedAdmin);
        }
        setupUIForRole();
    };
    
    const handleLogout = () => {
        currentUser = null;
        sessionStorage.removeItem('kurdAppAdmin');
        setupUIForRole();
        navigateToPage('apps');
        showToast('چوونەدەرەوە ئەنجامدرا');
    };
    
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const handleAddOrUpdateApp = async (event) => {
        event.preventDefault();
        const submitBtn = getEl('submit-app-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '...پاشەکەوت دەکرێت';
        try {
            const id = getEl('app-id-input').value ? parseInt(getEl('app-id-input').value) : null;
            const iconFile = getEl('app-icon-file').files[0];
            const apkFile = getEl('app-apk-file').files[0];
            let iconUrl, downloadUrl;
            if (id) {
                const existingApp = state.apps.find(a => a.id === id);
                iconUrl = existingApp.icon;
                downloadUrl = existingApp.download_url;
            }
            if (!id && !iconFile) throw new Error('پێویستە ئایکۆنێک هەڵبژێریت.');
            if (iconFile) {
                showToast('خەریکی ئەپلۆدکردنی ئایکۆنە...', 'info');
                const fileBody = await toBase64(iconFile);
                const response = await API.uploadFile({ bucket: 'icons', fileName: `${Date.now()}-${iconFile.name}`, fileBody, contentType: iconFile.type });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to upload icon');
                iconUrl = result.publicUrl;
            }
            if (apkFile) {
                showToast('خەریکی ئەپلۆدکردنی APKـەیە...', 'info');
                const fileBody = await toBase64(apkFile);
                const response = await API.uploadFile({ bucket: 'apks', fileName: `${Date.now()}-${apkFile.name}`, fileBody, contentType: 'application/vnd.android.package-archive' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to upload APK');
                downloadUrl = result.publicUrl;
            }
            const appData = {
                name: getEl('app-name').value.trim(),
                description: getEl('app-description').value.trim(),
                category: getEl('app-category').value,
                version: getEl('app-version').value.trim(),
                icon: iconUrl,
                download_url: downloadUrl
            };
            const response = id ? await API.updateApp({ ...appData, id }) : await API.addApp(appData);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "کێشەیەک لە پاشەکەوتکردن لە داتابەیسدا ڕوویدا");
            }
            showToast(id ? "ئەپ نوێکرایەوە" : "ئەپ زیادکرا", 'success');
            await loadData();
            navigateToPage('apps');
        } catch (error) {
            showToast(`کێشەیەک ڕوویدا: ${error.message}`, "error");
        } finally {
            submitBtn.disabled = false;
            resetAppForm();
        }
    };
    
    const resetAppForm = () => {
        const form = getEl('add-app-form');
        if (form) form.reset();
        if(getEl('app-id-input')) getEl('app-id-input').value = '';
        if(getEl('icon-preview')) getEl('icon-preview').classList.add('hidden');
        if(getEl('apk-file-name')) getEl('apk-file-name').textContent = '';
        if(getEl('form-title')) getEl('form-title').textContent = "زیادکردنی ئەپی نوێ";
        if(getEl('submit-app-btn')) getEl('submit-app-btn').textContent = "زیادکردن";
    };

    // ---- App Initialization ----
    function init() {
        getEl('login-form').addEventListener('submit', handleLogin);
        getEl('logout-btn').addEventListener('click', handleLogout);
        getEl('admin-login-btn').addEventListener('click', () => getEl('login-modal-overlay').classList.remove('hidden'));
        getEl('close-login-btn').addEventListener('click', () => getEl('login-modal-overlay').classList.add('hidden'));
        getEl('menu-toggle-btn').addEventListener('click', () => getEl('sidebar').classList.add('open'));
        getEl('close-btn').addEventListener('click', () => getEl('sidebar').classList.remove('open'));
        getEl('overlay').addEventListener('click', (e) => {
            if (e.target.id === 'overlay') {
                getEl('sidebar').classList.remove('open');
            }
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => { e.preventDefault(); navigateToPage(e.currentTarget.dataset.page); });
        });

        getEl('app-categories').addEventListener('click', (e) => {
            const card = e.target.closest('.app-card');
            if (!card) return;
            const appId = card.dataset.id;
            if (e.target.closest('.edit-app-btn')) { navigateToPage('add-app', appId); } 
            else if (e.target.closest('.delete-app-btn')) { handleDeleteApp(appId); }
            else { navigateToPage('app-details', appId); }
        });

        const addAppForm = getEl('add-app-form');
        if (addAppForm) {
            addAppForm.addEventListener('submit', handleAddOrUpdateApp);
            getEl('app-icon-file').addEventListener('change', () => {
                const file = getEl('app-icon-file').files[0];
                if (file) { getEl('icon-preview').src = URL.createObjectURL(file); getEl('icon-preview').classList.remove('hidden'); }
            });
            getEl('app-apk-file').addEventListener('change', () => {
                const file = getEl('app-apk-file').files[0];
                if (file) { getEl('apk-file-name').textContent = file.name; }
            });
        }
        
        getEl('details-download-btn').addEventListener('click', handleDownloadClick);
        document.querySelector('.back-btn').addEventListener('click', () => navigateToPage('apps'));
        getEl('app-search-input').addEventListener('input', (e) => renderApps(state.apps.filter(app => app.name.toLowerCase().includes(e.target.value.toLowerCase()))));
        
        checkSession();
        loadData();
    }

    init();
});