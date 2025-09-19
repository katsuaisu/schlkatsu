
const AuthService = {
    _users: JSON.parse(localStorage.getItem('schlkatsu_users')) || {},

    signup(username, password, pfpUrl) {
        if (this._users[username]) {
            return { success: false, message: 'Username already exists.' };
        }
        this._users[username] = { 
            password, 
            pfp: pfpUrl || 'https://i.imgur.com/V4RclNb.png' 
        };
        localStorage.setItem('schlkatsu_users', JSON.stringify(this._users));
        return { success: true };
    },

    login(username, password) {
        if (!this._users[username] || this._users[username].password !== password) {
            return { success: false, message: 'Invalid username or password.' };
        }
        sessionStorage.setItem('schlkatsu_currentUser', username);
        return { success: true, username };
    },

    logout() {
        sessionStorage.removeItem('schlkatsu_currentUser');
    },

    getCurrentUser() {
        return sessionStorage.getItem('schlkatsu_currentUser');
    },
    
    getUserData(username) {
        return this._users[username];
    },
    
    updateUserPfp(username, pfpUrl) {
        if (this._users[username]) {
            this._users[username].pfp = pfpUrl;
            localStorage.setItem('schlkatsu_users', JSON.stringify(this._users));
            return true;
        }
        return false;
    },

    userExists(username) {
        return !!this._users[username];
    }
};

const DataService = {
    loadData(username) {
        const data = localStorage.getItem(`schlkatsu_data_${username}`);
        return data ? JSON.parse(data) : null;
    },

    saveData(username, data) {
        if (!username) return;
        localStorage.setItem(`schlkatsu_data_${username}`, JSON.stringify(data));
    }
};


let currentUser = null;
let subjects = [];
let tasks = [];
let flashcardFolders = [];
let notebooks = [];
let schedule = [];
let extracurriculars = [];
let theme = 'light'; 

const gradesDropdownOptions = ["1.00", "1.25", "1.50", "1.75", "2.00", "2.25", "2.50", "2.75", "3.00", "4.00", "5.00"];
const gradesOptionsNumeric = gradesDropdownOptions.map(g => parseFloat(g));
let currentActiveTab = 'dashboard-content';
let currentFlashcardFolder = null;
let currentCardIndex = 0;
let timedReviewInterval;
let timedFlipInterval;
let typeAnswerCard;
let currentNotebook = null;
let currentNotebookPageIndex = 0;
let quillEditor = null;
let plannerDate = new Date();
let currentlyEditingSubject = null; 
let itemToShare = { id: null, type: null };



const appContainer = document.querySelector('.app-container');
const modalOverlay = document.getElementById('modal-overlay');

const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const profilePic = document.getElementById('profile-pic');

const shareModal = document.getElementById('share-modal');
const shareUsernameInput = document.getElementById('share-username-input');
const executeShareBtn = document.getElementById('execute-share-btn');

const settingsModal = document.getElementById('settings-modal');
const rightSidebarSettingsBtn = document.getElementById('right-sidebar-settings-btn');
const themeToggleSwitch = document.getElementById('theme-toggle');
const pfpUrlInput = document.getElementById('pfp-url-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');

const flashcardModal = document.getElementById('flashcard-modal');
const flashcardFrontInput = document.getElementById('flashcard-front');
const flashcardBackInput = document.getElementById('flashcard-back');
const flashcardSubjectSelect = document.getElementById('flashcard-subject-select');
const saveFlashcardBtn = document.getElementById('save-flashcard-btn');

const subjectDetailModal = document.getElementById('subject-detail-modal');
const subjectDetailTitle = document.getElementById('subject-detail-title');
const subjectDetailTabBtns = subjectDetailModal.querySelectorAll('.subject-detail-tab-btn');
const subjectDetailContents = subjectDetailModal.querySelectorAll('.detail-tab-content');
const subjectTasksList = document.getElementById('subject-tasks-list');
const subjectNotebooksGrid = document.getElementById('subject-notebooks-grid');
const subjectFlashcardsList = document.getElementById('subject-flashcards-list');

const addSubjectModal = document.getElementById('add-subject-modal');
const addSubjectModalTitle = document.getElementById('add-subject-modal-title');
const newSubjectNameInput = document.getElementById('new-subject-name-input');
const newSubjectUnitsInput = document.getElementById('new-subject-units-input');
const saveNewSubjectBtn = document.getElementById('save-new-subject-btn');


const createNotebookBtn = document.getElementById('create-notebook-btn');
const notebookTypeModal = document.getElementById('notebook-type-modal');
const createTextNotebookBtn = document.getElementById('create-text-notebook-btn');
const createDrawingNotebookBtn = document.getElementById('create-drawing-notebook-btn');
const notebookEditorModal = document.getElementById('notebook-editor-modal');
const notebookTitleInput = document.getElementById('notebook-title-input');
const notebookSubjectSelect = document.getElementById('notebook-subject-select');
const saveNotebookBtn = document.getElementById('save-notebook-btn');
const textEditorView = document.getElementById('text-editor-view');

const dashboardSubjectsGrid = document.getElementById('dashboard-subjects-grid');

const gwaDisplay = document.getElementById('gwa-display');
const gwaBody = document.getElementById('gwa-body');


const calendarDays = document.getElementById('calendar-days');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');


const addClassScheduleBtn = document.getElementById('add-class-schedule-btn');
const addExtracurricularBtn = document.getElementById('add-extracurricular-btn');
const scheduleGrid = document.getElementById('schedule-grid');
const extracurricularsGrid = document.getElementById('extracurriculars-grid');




function saveAllData() {
    const dataToSave = {
        subjects,
        tasks,
        flashcardFolders,
        notebooks,
        schedule,
        extracurriculars,
        theme,
    };
    DataService.saveData(currentUser, dataToSave);
    
    renderRightSidebarTasks();
    if(currentActiveTab === 'planner-content') renderCalendar();
    if(currentActiveTab === 'dashboard-content') renderDashboard();
    updateProgressCircle();
}

function loadUserData(username) {
    const data = DataService.loadData(username);
    const userData = AuthService.getUserData(username);

    subjects = (data && Array.isArray(data.subjects)) ? data.subjects : [];
    subjects.forEach(s => {
        s.previousGrade = s.previousGrade || null;
        s.currentGrade = s.currentGrade || null;
    });

    tasks = (data && Array.isArray(data.tasks)) ? data.tasks : [];
    flashcardFolders = (data && Array.isArray(data.flashcardFolders)) ? data.flashcardFolders : [];
    notebooks = (data && Array.isArray(data.notebooks)) ? data.notebooks : [];
    schedule = (data && Array.isArray(data.schedule)) ? data.schedule : [];
    extracurriculars = (data && Array.isArray(data.extracurriculars)) ? data.extracurriculars : [];
    theme = (data && typeof data.theme === 'string') ? data.theme : 'light';
    
    if (userData) {
        profilePic.src = userData.pfp || 'https://i.imgur.com/V4RclNb.png';
        pfpUrlInput.value = userData.pfp || '';
    }
    
    
    if (subjects.length === 0) {
        const defaultSubjectNames = ["Physics", "Chemistry", "Biology", "Math", "Statistics", "Computer Science", "Social Science", "English", "Filipino", "PEHM"];
        subjects = defaultSubjectNames.map(name => ({
            name: name,
            units: 3,
            grade: null,
            previousGrade: null,
            currentGrade: null
        }));
    }

    saveAllData(); 
}




function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function showCustomAlert(message, type = 'notification') {
    closeAllModals();
    modalOverlay.innerHTML = '';
    modalOverlay.classList.remove('hidden');
    appContainer.classList.add('blurred');

    const alertModal = document.createElement('div');
    alertModal.className = 'modal-content';
    alertModal.style.maxWidth = '400px';

    let title = (type === 'notification') ? 'Notification' : 'Alert';
    let icon = (type === 'notification') ? 'fa-check-circle' : 'fa-exclamation-triangle';

    alertModal.innerHTML = `
        <div class="modal-header">
            <h3><i class="fas ${icon}" style="margin-right: 10px; color: var(--accent-color);"></i>${title}</h3>
            <button class="modal-close-btn cute-button-icon-only">&times;</button>
        </div>
        <p style="text-align: center; margin-top: 10px;">${escapeHTML(message)}</p>
        <div class="modal-buttons">
            <button class="cute-button" id="alert-ok-btn">OK</button>
        </div>
    `;
    modalOverlay.appendChild(alertModal);
    alertModal.addEventListener('click', (e) => e.stopPropagation());

    const closeAlert = () => {
        modalOverlay.classList.add('hidden');
        appContainer.classList.remove('blurred');
        alertModal.remove();
    };

    alertModal.querySelector('.modal-close-btn').addEventListener('click', closeAlert);
    document.getElementById('alert-ok-btn').addEventListener('click', closeAlert);
    document.getElementById('alert-ok-btn').focus();
}

function showDueTodayNotification() {
    const today = new Date().toISOString().slice(0, 10);
    const dueTodayTasks = tasks.filter(task => task.dueDate === today && !task.done);

    if (dueTodayTasks.length > 0) {
        const taskList = dueTodayTasks.map(task => `<li><strong>${escapeHTML(task.name)}</strong> (${escapeHTML(task.subject)})</li>`).join('');
        const message = `You have the following task(s) due today:<ul>${taskList}</ul>`;
        
        closeAllModals();
        modalOverlay.innerHTML = '';
        modalOverlay.classList.remove('hidden');
        appContainer.classList.add('blurred');

        const notificationModal = document.createElement('div');
        notificationModal.className = 'modal-content';
        notificationModal.style.maxWidth = '450px';
        notificationModal.innerHTML = `
            <div class="modal-header">
                <h3><i class="fas fa-bell" style="margin-right: 10px; color: var(--accent-color);"></i>Tasks Due Today!</h3>
                <button class="modal-close-btn cute-button-icon-only">&times;</button>
            </div>
            <div style="text-align: left; margin-top: 10px;">${message}</div>
            <div class="modal-buttons">
                <button class="cute-button" id="notif-ok-btn">Got it!</button>
            </div>
        `;
        modalOverlay.appendChild(notificationModal);
        notificationModal.addEventListener('click', (e) => e.stopPropagation());

        const closeNotification = () => {
            modalOverlay.classList.add('hidden');
            appContainer.classList.remove('blurred');
            notificationModal.remove();
        };

        notificationModal.querySelector('.modal-close-btn').addEventListener('click', closeNotification);
        document.getElementById('notif-ok-btn').addEventListener('click', closeNotification);
    }
}


function showCustomConfirm(message, onConfirm) {
    closeAllModals();
    modalOverlay.innerHTML = '';
    modalOverlay.classList.remove('hidden');
    appContainer.classList.add('blurred');

    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal-content';
    confirmModal.style.maxWidth = '400px';
    confirmModal.innerHTML = `
        <div class="modal-header">
            <h3>Confirm Action</h3>
            <button class="modal-close-btn cute-button-icon-only">&times;</button>
        </div>
        <p>${escapeHTML(message)}</p>
        <div class="modal-buttons">
            <button class="cute-button reset-btn" id="confirm-cancel-btn">Cancel</button>
            <button class="cute-button" id="confirm-ok-btn">OK</button>
        </div>
    `;
    modalOverlay.appendChild(confirmModal);
    confirmModal.addEventListener('click', (e) => e.stopPropagation());

    const closeConfirm = () => {
        modalOverlay.classList.add('hidden');
        appContainer.classList.remove('blurred');
        confirmModal.remove();
    };

    confirmModal.querySelector('.modal-close-btn').addEventListener('click', closeConfirm);
    document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirm);
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
        onConfirm();
        closeConfirm();
    });
}

function populateSubjectDropdowns() {
    const subjectSelects = document.querySelectorAll('.subject-select');
    subjectSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select Subject --</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.name;
            option.textContent = subject.name;
            select.appendChild(option);
        });
        select.value = currentValue;
    });
}

function switchTab(tabId) {
    document.querySelector('.tab-btn.active')?.classList.remove('active');
    document.getElementById(currentActiveTab)?.classList.add('hidden');
    
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(tabId)?.classList.remove('hidden');
    
    currentActiveTab = tabId;

    if (tabId === 'dashboard-content') renderDashboard();
    else if (tabId === 'todo-content') renderTasks();
    else if (tabId === 'gwa-content') renderGwaCalculator();
    else if (tabId === 'pomodoro-content') updatePomodoroTasks();
    else if (tabId === 'flashcards-content') showFlashcardFoldersView();
    else if (tabId === 'notes-content') renderNotebooks();
    else if (tabId === 'planner-content') renderCalendar();
    else if (tabId === 'schedule-content') renderSchedule();
    else if (tabId === 'extracurriculars-content') renderExtracurriculars();
}

function applyTheme(newTheme) {
    theme = newTheme;
    document.body.classList.toggle('dark-mode', theme === 'dark');
    themeToggleSwitch.checked = (theme === 'dark');
}

function closeAllModals() {
    document.querySelectorAll('#modal-overlay > .modal-content').forEach(modal => {
        modal.classList.add('hidden');
    });
    if (quillEditor) quillEditor = null;
    currentNotebook = null;
    modalOverlay.classList.add('hidden');
    appContainer.classList.remove('blurred');
    currentlyEditingSubject = null; 
}



function showAuthModal() {
    modalOverlay.classList.remove('hidden');
    modalOverlay.innerHTML = ''; 
    modalOverlay.appendChild(authModal);
    authModal.classList.remove('hidden');
    appContainer.classList.add('blurred');
}

function hideAuthModal() {
    modalOverlay.classList.add('hidden');
    authModal.classList.add('hidden');
    appContainer.classList.remove('blurred');
}

function initializeApp(username) {
    currentUser = username;
    hideAuthModal();
    loadUserData(username);
    
    usernameDisplay.textContent = username;
    applyTheme(theme);

    populateSubjectDropdowns();
    switchTab('dashboard-content');
    renderRightSidebarTasks();
    showDueTodayNotification();
}

document.addEventListener('DOMContentLoaded', () => {
    const user = AuthService.getCurrentUser();
    if (user) {
        initializeApp(user);
    } else {
        showAuthModal();
    }
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const result = AuthService.login(username, password);
        if (result.success) {
            initializeApp(result.username);
        } else {
            loginError.textContent = result.message;
            loginError.classList.remove('hidden');
        }
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;
        const pfpUrl = document.getElementById('signup-pfp').value;
        const result = AuthService.signup(username, password, pfpUrl);
        if (result.success) {
            const loginResult = AuthService.login(username, password);
            if(loginResult.success) {
                initializeApp(loginResult.username);
            }
        } else {
            signupError.textContent = result.message;
            signupError.classList.remove('hidden');
        }
    });

    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        loginError.classList.add('hidden');
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        signupError.classList.add('hidden');
    });

    logoutBtn.addEventListener('click', () => {
        showCustomConfirm("Are you sure you want to logout?", () => {
            AuthService.logout();
            currentUser = null;
            window.location.reload();
        });
    });

    themeToggleSwitch.addEventListener('change', (e) => {
        applyTheme(e.target.checked ? 'dark' : 'light');
        saveAllData();
    });
    
    saveSettingsBtn.addEventListener('click', () => {
        const newPfpUrl = pfpUrlInput.value.trim();
        if (newPfpUrl) {
            profilePic.src = newPfpUrl;
            AuthService.updateUserPfp(currentUser, newPfpUrl);
        }
        applyTheme(themeToggleSwitch.checked ? 'dark' : 'light');
        saveAllData();
        showCustomAlert("Settings saved!");
        closeAllModals();
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeAllModals();
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllModals();
        });
    });

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    createNotebookBtn.addEventListener('click', () => {
        closeAllModals();
        modalOverlay.classList.remove('hidden');
        modalOverlay.appendChild(notebookTypeModal);
        notebookTypeModal.classList.remove('hidden');
    });

    createTextNotebookBtn.addEventListener('click', () => createNewNotebook('text'));
    createDrawingNotebookBtn.addEventListener('click', () => createNewNotebook('drawing'));
    
    executeShareBtn.addEventListener('click', handleExecuteShare);
    
  
    addClassScheduleBtn.addEventListener('click', () => console.log("Add Class clicked"));
    addExtracurricularBtn.addEventListener('click', () => console.log("Add Activity clicked"));
});




function openShareModal(id, type) {
    itemToShare = { id, type };
    closeAllModals();
    shareUsernameInput.value = '';
    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(shareModal);
    shareModal.classList.remove('hidden');
    shareUsernameInput.focus();
}

function handleExecuteShare() {
    const targetUsername = shareUsernameInput.value.trim();

    if (!targetUsername) return showCustomAlert("Please enter a username.", "alert");
    if (targetUsername === currentUser) return showCustomAlert("You cannot share an item with yourself.", "alert");
    if (!AuthService.userExists(targetUsername)) return showCustomAlert(`User "${escapeHTML(targetUsername)}" does not exist.`, "alert");

    const targetUserData = DataService.loadData(targetUsername) || { subjects: [], tasks: [], flashcardFolders: [], notebooks: [], theme: 'light' };
    let itemCopy;

    if (itemToShare.type === 'notebook') {
        const originalItem = notebooks.find(n => n.id === itemToShare.id);
        if (!originalItem) return showCustomAlert("Notebook not found.", "alert");
        if (targetUserData.notebooks.some(n => n.originalId === originalItem.id)) return showCustomAlert(`This notebook has already been shared with ${escapeHTML(targetUsername)}.`, "alert");
        
        itemCopy = JSON.parse(JSON.stringify(originalItem));
        itemCopy.isShared = true;
        itemCopy.sharedBy = currentUser;
        itemCopy.originalId = originalItem.id; 
        itemCopy.id = Date.now(); 
        targetUserData.notebooks.push(itemCopy);

    } else if (itemToShare.type === 'flashcardFolder') {
        const originalItem = flashcardFolders.find(f => f.id === itemToShare.id);
        if (!originalItem) return showCustomAlert("Flashcard folder not found.", "alert");
        if (targetUserData.flashcardFolders.some(f => f.originalId === originalItem.id)) return showCustomAlert(`This folder has already been shared with ${escapeHTML(targetUsername)}.`, "alert");

        itemCopy = JSON.parse(JSON.stringify(originalItem));
        itemCopy.isShared = true;
        itemCopy.sharedBy = currentUser;
        itemCopy.originalId = originalItem.id;
        itemCopy.id = Date.now();
        targetUserData.flashcardFolders.push(itemCopy);
    } else if (itemToShare.type === 'task') {
        const originalItem = tasks.find(t => t.id === itemToShare.id);
        if (!originalItem) return showCustomAlert("Task not found.", "alert");
        if (targetUserData.tasks.some(t => t.originalId === originalItem.id)) return showCustomAlert(`This task has already been shared with ${escapeHTML(targetUsername)}.`, "alert");

        itemCopy = JSON.parse(JSON.stringify(originalItem));
        itemCopy.isShared = true;
        itemCopy.sharedBy = currentUser;
        itemCopy.originalId = originalItem.id;
        itemCopy.id = Date.now();
        itemCopy.done = false; 
        targetUserData.tasks.push(itemCopy);
    }

    DataService.saveData(targetUsername, targetUserData);
    showCustomAlert(`Successfully shared with ${escapeHTML(targetUsername)}!`);
    closeAllModals();
}



function openAddSubjectModal() {
    closeAllModals();
    currentlyEditingSubject = null;
    addSubjectModalTitle.textContent = "Add New Subject";
    saveNewSubjectBtn.textContent = "Add Subject";
    newSubjectNameInput.value = '';
    newSubjectUnitsInput.value = '';
    
    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(addSubjectModal);
    addSubjectModal.classList.remove('hidden');
    newSubjectNameInput.focus();
}

function openEditSubjectModal(subjectName) {
    const subject = subjects.find(s => s.name === subjectName);
    if (!subject) return;

    closeAllModals();
    currentlyEditingSubject = subjectName; 
    addSubjectModalTitle.textContent = "Edit Subject";
    saveNewSubjectBtn.textContent = "Save Changes";
    newSubjectNameInput.value = subjectName;
    newSubjectUnitsInput.value = subject.units;

    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(addSubjectModal);
    addSubjectModal.classList.remove('hidden');
    newSubjectNameInput.focus();
}

function handleDeleteSubject(subjectName) {
    showCustomConfirm(`Are you sure you want to delete "${subjectName}"? This will also delete all associated tasks, notebooks, and flashcards. This action cannot be undone.`, () => {
        subjects = subjects.filter(s => s.name !== subjectName);
        tasks = tasks.filter(t => t.subject !== subjectName);
        notebooks = notebooks.filter(n => n.subject !== subjectName);
        flashcardFolders = flashcardFolders.filter(f => f.subject !== subjectName);
        
        saveAllData();
        populateSubjectDropdowns();
        renderDashboard();
        showCustomAlert(`Subject "${subjectName}" and all its data have been deleted.`);
    });
}

document.getElementById('add-new-subject-dashboard').addEventListener('click', openAddSubjectModal);

saveNewSubjectBtn.addEventListener('click', () => {
    const newName = newSubjectNameInput.value.trim();
    const newUnits = parseFloat(newSubjectUnitsInput.value);

    if (!newName) return showCustomAlert('Subject name cannot be empty!', 'alert');
    if (isNaN(newUnits) || newUnits <= 0) return showCustomAlert('Please enter a valid number of units!', 'alert');
    
    const isNameTaken = subjects.some(s => s.name.toLowerCase() === newName.toLowerCase() && s.name.toLowerCase() !== (currentlyEditingSubject || '').toLowerCase());
    if (isNameTaken) return showCustomAlert('A subject with this name already exists!', 'alert');

    if (currentlyEditingSubject) {
        const subjectIndex = subjects.findIndex(s => s.name === currentlyEditingSubject);
        if (subjectIndex > -1) {
            const oldName = subjects[subjectIndex].name;
            subjects[subjectIndex].name = newName;
            subjects[subjectIndex].units = newUnits;

            tasks.forEach(t => { if (t.subject === oldName) t.subject = newName; });
            notebooks.forEach(n => { if (n.subject === oldName) n.subject = newName; });
            flashcardFolders.forEach(f => { if (f.subject === oldName) f.subject = newName; });

            showCustomAlert(`Subject "${oldName}" was updated.`);
        }
    } else {
        subjects.push({
            name: newName,
            units: newUnits,
            grade: null,
            previousGrade: null,
            currentGrade: null
        });
        showCustomAlert(`Subject "${newName}" added!`);
    }

    subjects.sort((a, b) => a.name.localeCompare(b.name));
    saveAllData();
    populateSubjectDropdowns();
    renderDashboard();
    renderGwaCalculator();
    closeAllModals();
});



function renderDashboard() {
    dashboardSubjectsGrid.innerHTML = '';
    if (subjects.length === 0) {
        dashboardSubjectsGrid.innerHTML = '<p class="empty-message">No subjects added yet. Add one to get started!</p>';
        return;
    }
    subjects.forEach((subject) => {
        const card = document.createElement('div');
        card.className = 'dashboard-card';
        const gradeText = subject.grade ? subject.grade.toFixed(2) : 'N/A';
        
        const taskCount = tasks.filter(t => t.subject === subject.name).length;
        const notebookCount = notebooks.filter(n => n.subject === subject.name).length;
        const flashcardCount = flashcardFolders.filter(f => f.subject === subject.name).length;

        card.innerHTML = `
            <div class="dashboard-card-main">
                <span class="card-grade">${gradeText}</span>
                <h4>${escapeHTML(subject.name)}</h4>
                <p class="card-units">${subject.units} Unit(s)</p>
            </div>
            <div class="card-item-icons">
                <span class="icon-group" title="${taskCount} Tasks"><i class="fas fa-clipboard-list"></i> ${taskCount}</span>
                <span class="icon-group" title="${notebookCount} Notebooks"><i class="fas fa-book"></i> ${notebookCount}</span>
                <span class="icon-group" title="${flashcardCount} Flashcard Folders"><i class="fas fa-sticky-note"></i> ${flashcardCount}</span>
            </div>
            <div class="card-actions">
                <button class="edit-subject-btn cute-button-icon-only" title="Edit Subject"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-subject-btn cute-button-icon-only" title="Delete Subject"><i class="fas fa-trash"></i></button>
            </div>
        `;
        card.querySelector('.dashboard-card-main').addEventListener('click', () => openSubjectDetail(subject.name));
        card.querySelector('.edit-subject-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditSubjectModal(subject.name);
        });
        card.querySelector('.delete-subject-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteSubject(subject.name);
        });

        dashboardSubjectsGrid.appendChild(card);
    });
}

function openSubjectDetail(subjectName) {
    closeAllModals();
    subjectDetailModal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(subjectDetailModal);
    subjectDetailTitle.textContent = subjectName;
    subjectDetailTabBtns.forEach(btn => btn.classList.remove('active'));
    subjectDetailContents.forEach(content => content.classList.add('hidden'));
    document.querySelector('.subject-detail-tab-btn[data-detail-tab="subject-tasks"]').classList.add('active');
    document.getElementById('subject-tasks').classList.remove('hidden');
    renderSubjectDetailContent(subjectName, 'subject-tasks');
}

subjectDetailTabBtns.forEach(button => {
    button.addEventListener('click', () => {
        subjectDetailTabBtns.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        subjectDetailContents.forEach(content => content.classList.add('hidden'));
        const targetTabId = button.dataset.detailTab;
        document.getElementById(targetTabId).classList.remove('hidden');
        renderSubjectDetailContent(subjectDetailTitle.textContent, targetTabId);
    });
});

function renderSubjectDetailContent(subjectName, tabId) {
    if (tabId === 'subject-tasks') {
        const filteredTasks = tasks.filter(task => task.subject === subjectName);
        subjectTasksList.innerHTML = '';
        document.getElementById('subject-tasks-empty').classList.toggle('hidden', filteredTasks.length > 0);
        filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).forEach(task => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<div class="task-content"><span class="task-name">${escapeHTML(task.name)}</span></div><span class="task-date">${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>`;
            subjectTasksList.appendChild(listItem);
        });
    } else if (tabId === 'subject-notebooks') {
        const filteredNotebooks = notebooks.filter(notebook => notebook.subject === subjectName);
        subjectNotebooksGrid.innerHTML = '';
        document.getElementById('subject-notebooks-empty').classList.toggle('hidden', filteredNotebooks.length > 0);
        filteredNotebooks.forEach(notebook => {
            const card = document.createElement('div');
            card.className = 'notebook-card';
            card.innerHTML = `<h4><i class="fas fa-${notebook.type === 'text' ? 'file-alt' : 'paint-brush'}"></i> ${escapeHTML(notebook.title)}</h4><p>Last edited: ${new Date(notebook.lastEdited).toLocaleDateString()}</p>`;
            card.addEventListener('click', () => { closeAllModals(); switchTab('notes-content'); openNotebookEditor(notebook); });
            subjectNotebooksGrid.appendChild(card);
        });
    } else if (tabId === 'subject-flashcards') {
        const filteredFlashcards = flashcardFolders.filter(folder => folder.subject === subjectName);
        subjectFlashcardsList.innerHTML = '';
        document.getElementById('subject-flashcards-empty').classList.toggle('hidden', filteredFlashcards.length > 0);
        filteredFlashcards.forEach(folder => {
            const card = document.createElement('div');
            card.className = 'folder-card';
            card.innerHTML = `<h4>${escapeHTML(folder.name)}</h4><p>${folder.cards.length} cards</p>`;
            card.addEventListener('click', () => { closeAllModals(); switchTab('flashcards-content'); openFlashcardFolder(folder.id); });
            subjectFlashcardsList.appendChild(card);
        });
    }
}




function renderRightSidebarTasks() {
    const dueTomorrowList = document.getElementById('due-tomorrow-list');
    const due7DaysList = document.getElementById('due-7-days-list');

    dueTomorrowList.innerHTML = '';
    due7DaysList.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const tasksDueTomorrow = [];
    const tasksDueIn7Days = [];

    tasks.filter(task => !task.done && task.dueDate).forEach(task => {
        const taskDueDate = new Date(task.dueDate + 'T00:00:00');
        if (taskDueDate.getTime() === tomorrow.getTime()) {
            tasksDueTomorrow.push(task);
        } else if (taskDueDate > tomorrow && taskDueDate <= sevenDaysFromNow) {
            tasksDueIn7Days.push(task);
        }
    });

    const renderTaskListItem = (list, task) => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="task-content"><span class="task-name">${escapeHTML(task.name)}</span><span class="task-course">${escapeHTML(task.subject)}</span></div><span class="task-date">${new Date(task.dueDate+'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>`;
        list.appendChild(li);
    };

    if (tasksDueTomorrow.length === 0) {
        dueTomorrowList.innerHTML = '<li class="empty-list-item">No tasks due tomorrow.</li>';
    } else {
        tasksDueTomorrow.forEach(task => renderTaskListItem(dueTomorrowList, task));
    }

    if (tasksDueIn7Days.length === 0) {
        due7DaysList.innerHTML = '<li class="empty-list-item">No tasks due in the next 7 days.</li>';
    } else {
        tasksDueIn7Days.forEach(task => renderTaskListItem(due7DaysList, task));
    }
    updateProgressCircle();
}

function updateProgressCircle() {
    const completedTasks = tasks.filter(task => task.done).length;
    const totalTasks = tasks.length;
    let percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const progressRingProgress = document.querySelector('.progress-ring-progress');
    const radius = progressRingProgress.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    progressRingProgress.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRingProgress.style.strokeDashoffset = offset;
    
    document.getElementById('progress-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-count').textContent = `${completedTasks}/${totalTasks}`;
    document.getElementById('total-tasks-stat').textContent = totalTasks;
    document.getElementById('completed-tasks-stat').textContent = completedTasks;
}

rightSidebarSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllModals();
    settingsModal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(settingsModal);
});



function roundToNearestGrade(calculatedGrade) {
    if (isNaN(calculatedGrade) || calculatedGrade === null) return null;
    return gradesOptionsNumeric.reduce((prev, curr) => {
        return (Math.abs(curr - calculatedGrade) < Math.abs(prev - calculatedGrade) ? curr : prev);
    });
}

function handleGradeChange(e) {
    const subjectName = e.target.dataset.subject;
    const gradeType = e.target.dataset.type;
    const selectedValue = e.target.value;

    const subjectToUpdate = subjects.find(s => s.name === subjectName);
    if (!subjectToUpdate) return;

    if (gradeType === 'previous') {
        subjectToUpdate.previousGrade = selectedValue ? parseFloat(selectedValue) : null;
    } else {
        subjectToUpdate.currentGrade = selectedValue ? parseFloat(selectedValue) : null;
    }
    
    const { previousGrade, currentGrade } = subjectToUpdate;
    if (previousGrade !== null && currentGrade !== null) {
        const calculatedGrade = (currentGrade * (2/3)) + (previousGrade * (1/3));
        subjectToUpdate.grade = roundToNearestGrade(calculatedGrade);
    } else {
        subjectToUpdate.grade = null;
    }
    
    saveAllData();
    renderGwaCalculator();
}

function renderGwaCalculator() {
    
    document.querySelector('#gwa-content thead tr').innerHTML = `
        <th>Subject</th>
        <th>Previous Grade (1/3)</th>
        <th>Current Grade (2/3)</th>
        <th>Final Grade</th>
    `;
    
    gwaBody.innerHTML = '';
    let totalWeightedGrade = 0;
    let totalUnitsWithGrades = 0;

    subjects.forEach(subject => {
        const tr = document.createElement('tr');

        const createGradeSelect = (type) => {
            const select = document.createElement('select');
            select.className = 'grade-dropdown';
            select.dataset.subject = subject.name;
            select.dataset.type = type;
            
            let optionsHTML = '<option value="">N/A</option>';
            const gradeValue = (type === 'previous' ? subject.previousGrade : subject.currentGrade);
            gradesDropdownOptions.forEach(grade => {
                const selected = gradeValue !== null && parseFloat(gradeValue) === parseFloat(grade) ? 'selected' : '';
                optionsHTML += `<option value="${grade}" ${selected}>${grade}</option>`;
            });
            select.innerHTML = optionsHTML;
            select.addEventListener('change', handleGradeChange);
            return select;
        };

        const prevGradeSelect = createGradeSelect('previous');
        const currentGradeSelect = createGradeSelect('current');

        const prevGradeCell = document.createElement('td');
        prevGradeCell.dataset.label = "Previous Grade";
        prevGradeCell.appendChild(prevGradeSelect);

        const currentGradeCell = document.createElement('td');
        currentGradeCell.dataset.label = "Current Grade";
        currentGradeCell.appendChild(currentGradeSelect);
        
        const finalGradeCell = document.createElement('td');
        finalGradeCell.dataset.label = "Final Grade";
        finalGradeCell.className = 'final-grade-display';
        finalGradeCell.textContent = subject.grade ? subject.grade.toFixed(2) : 'N/A';

        tr.innerHTML = `<td data-label="Subject">${escapeHTML(subject.name)}</td>`;
        tr.appendChild(prevGradeCell);
        tr.appendChild(currentGradeCell);
        tr.appendChild(finalGradeCell);
        gwaBody.appendChild(tr);

        if (subject.grade !== null && !isNaN(subject.grade)) {
            totalWeightedGrade += subject.grade * subject.units;
            totalUnitsWithGrades += subject.units;
        }
    });

    if (totalUnitsWithGrades > 0) {
        const finalGwa = totalWeightedGrade / totalUnitsWithGrades;
        gwaDisplay.textContent = `Your GWA: ${finalGwa.toFixed(4)}`;
    } else {
        gwaDisplay.textContent = 'Select grades to calculate your GWA.';
    }
}



function renderCalendar() {
    calendarDays.innerHTML = '';
    const month = plannerDate.getMonth();
    const year = plannerDate.getFullYear();
    calendarMonthYear.textContent = `${plannerDate.toLocaleString('default', { month: 'long' })} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.insertAdjacentHTML('beforeend', `<div class="calendar-day other-month"></div>`);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const dateString = dayDate.toISOString().slice(0, 10);
        let dayClass = 'calendar-day';
        if (i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) {
            dayClass += ' today';
        }
        
        let dayHTML = `<div class="${dayClass}" data-date="${dateString}"><div class="day-number">${i}</div>`;
        const eventsForDay = tasks.filter(t => t.dueDate === dateString);
        if(eventsForDay.length > 0) {
            dayHTML += '<div class="events">';
            eventsForDay.forEach(event => {
                dayHTML += `<div class="calendar-event" title="${escapeHTML(event.name)} (${escapeHTML(event.subject)})">${escapeHTML(event.name)}</div>`;
            });
            dayHTML += '</div>';
        }
        dayHTML += `</div>`;
        calendarDays.insertAdjacentHTML('beforeend', dayHTML);
    }
    
    calendarDays.querySelectorAll('.calendar-day').forEach(day => {
        if (!day.classList.contains('other-month')) {
            day.addEventListener('click', () => {
                switchTab('todo-content');
                document.getElementById('due-date').value = day.dataset.date;
                document.getElementById('assignment-name').focus();
            });
        }
    });
}

prevMonthBtn.addEventListener('click', () => {
    plannerDate.setMonth(plannerDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    plannerDate.setMonth(plannerDate.getMonth() + 1);
    renderCalendar();
});




function renderTasks() {
    const todoBody = document.getElementById('todo-body');
    todoBody.innerHTML = '';

    tasks.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
         .forEach(task => {
        const tr = document.createElement('tr');
        tr.className = task.done ? 'completed' : '';
        tr.innerHTML = `
            <td data-label="Done"><input type="checkbox" class="task-done-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}></td>
            <td data-label="Assignment">${escapeHTML(task.name)} ${task.isShared ? `<span class="shared-by-indicator">Shared by ${escapeHTML(task.sharedBy)}</span>` : ''}</td>
            <td data-label="Subject">${escapeHTML(task.subject)}</td>
            <td data-label="Status"><button class="status-btn ${task.done ? 'completed' : 'not-started'}">${task.done ? 'Completed' : 'Not Started'}</button></td>
            <td data-label="Due Date">${task.dueDate}</td>
            <td data-label="Actions">
                ${!task.isShared ? `<button class="action-btn share-task-btn" data-id="${task.id}" title="Share Task"><i class="fas fa-share-alt"></i></button>` : ''}
                <button class="action-btn delete-task-btn" data-id="${task.id}" title="Delete Task"><i class="fas fa-trash"></i></button>
            </td>
        `;
        todoBody.appendChild(tr);
    });

    todoBody.querySelectorAll('.task-done-checkbox').forEach(box => {
        box.addEventListener('change', (e) => {
            const taskId = parseInt(e.target.dataset.id);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.done = e.target.checked;
                saveAllData();
                renderTasks();
            }
        });
    });

    todoBody.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = parseInt(e.currentTarget.dataset.id);
            showCustomConfirm("Are you sure you want to delete this task?", () => {
                tasks = tasks.filter(t => t.id !== taskId);
                saveAllData();
                renderTasks();
            });
        });
    });
    
    todoBody.querySelectorAll('.share-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = parseInt(e.currentTarget.dataset.id);
            openShareModal(taskId, 'task');
        });
    });
}

document.getElementById('todo-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('assignment-name').value;
    const subject = document.getElementById('todo-subject-select').value;
    const dueDate = document.getElementById('due-date').value;

    if (!name || !subject || !dueDate) {
        showCustomAlert("Please fill out all task fields.", "alert");
        return;
    }

    tasks.push({
        id: Date.now(),
        name,
        subject,
        dueDate,
        done: false,
    });
    saveAllData();
    renderTasks();
    e.target.reset();
});



function renderSchedule() {
    scheduleGrid.innerHTML = `
        <div class="schedule-header">Time</div>
        <div class="schedule-header">Monday</div>
        <div class="schedule-header">Tuesday</div>
        <div class="schedule-header">Wednesday</div>
        <div class="schedule-header">Thursday</div>
        <div class="schedule-header">Friday</div>
    `;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let timeSlotsHTML = '<div class="schedule-times">';
    for (let hour = 7; hour <= 18; hour++) {
        timeSlotsHTML += `<div class="schedule-time-slot">${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}</div>`;
    }
    timeSlotsHTML += '</div>';
    scheduleGrid.innerHTML += timeSlotsHTML;

    days.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'schedule-day';
        dayDiv.dataset.day = day;
        
       
        const lunchDiv = document.createElement('div');
        lunchDiv.className = 'schedule-class';
        lunchDiv.style.backgroundColor = 'var(--border-color)';
        lunchDiv.style.border = 'none';
        
        const lunchStartMinutes = 12 * 60 + 10; 
        const lunchEndMinutes = 13 * 60 + 5; 
        const totalDayMinutes = (18 - 7) * 60;

        const topPercent = ((lunchStartMinutes - (7 * 60)) / totalDayMinutes) * 100;
        const heightPercent = ((lunchEndMinutes - lunchStartMinutes) / totalDayMinutes) * 100;

        lunchDiv.style.top = `${topPercent}%`;
        lunchDiv.style.height = `${heightPercent}%`;
        lunchDiv.innerHTML = '<strong>Lunch</strong>';
        dayDiv.appendChild(lunchDiv);

        scheduleGrid.appendChild(dayDiv);
    });
}

function renderExtracurriculars() {
    extracurricularsGrid.innerHTML = '';
    if (extracurriculars.length === 0) {
        extracurricularsGrid.innerHTML = '<p class="empty-message">No activities added yet.</p>';
        return;
    }
    extracurriculars.forEach(activity => {
        const card = document.createElement('div');
        card.className = 'extracurricular-card';
        card.innerHTML = `
            <div class="category">${escapeHTML(activity.category)}</div>
            <h4>${escapeHTML(activity.name)}</h4>
            <p class="role">${escapeHTML(activity.role)}</p>
        `;
        extracurricularsGrid.appendChild(card);
    });
}



function renderNotebooks() {
    const notebooksGrid = document.getElementById('notebooks-grid');
    notebooksGrid.innerHTML = '';
    if (notebooks.length === 0) {
        notebooksGrid.innerHTML = '<p class="empty-message">No notebooks created yet.</p>';
        return;
    }
    notebooks.forEach(notebook => {
        const card = document.createElement('div');
        card.className = 'notebook-card';
        card.innerHTML = `
             <div class="resource-actions">
                ${!notebook.isShared ? `<button class="action-btn share-notebook-btn" title="Share Notebook" data-id="${notebook.id}"><i class="fas fa-share-alt"></i></button>` : ''}
                <button class="action-btn delete-notebook-btn" title="Delete Notebook" data-id="${notebook.id}"><i class="fas fa-trash"></i></button>
            </div>
            <h4><i class="fas fa-${notebook.type === 'text' ? 'file-alt' : 'paint-brush'}"></i> ${escapeHTML(notebook.title)}</h4>
            <p>Subject: ${escapeHTML(notebook.subject)}</p>
            ${notebook.isShared ? `<p class="shared-by-indicator">Shared by ${escapeHTML(notebook.sharedBy)}</p>` : ''}
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn')) return;
            openNotebookEditor(notebook);
        });

        card.querySelector('.delete-notebook-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showCustomConfirm("Are you sure you want to delete this notebook?", () => {
                notebooks = notebooks.filter(n => n.id !== notebook.id);
                saveAllData();
                renderNotebooks();
            });
        });
        
        card.querySelector('.share-notebook-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openShareModal(notebook.id, 'notebook');
        });
        
        notebooksGrid.appendChild(card);
    });
}

function createNewNotebook(type) {
    currentNotebook = { id: null, type: type, isShared: false }; 
    openNotebookEditor(currentNotebook);
}

function openNotebookEditor(notebook) {
    currentNotebook = notebook;
    closeAllModals();
    
    notebookTitleInput.value = notebook.title || '';
    populateSubjectDropdowns();
    setTimeout(() => { 
         notebookSubjectSelect.value = notebook.subject || '';
    }, 0);
    
    textEditorView.classList.toggle('hidden', notebook.type !== 'text');
    

    const isReadOnly = !!notebook.isShared;
    saveNotebookBtn.style.display = isReadOnly ? 'none' : 'inline-flex';
    notebookTitleInput.disabled = isReadOnly;
    notebookSubjectSelect.disabled = isReadOnly;

    if (notebook.type === 'text') {
        initQuillEditor(notebook.content || '');
        if (quillEditor) quillEditor.enable(!isReadOnly);
    }
    
    modalOverlay.appendChild(notebookEditorModal);
    notebookEditorModal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
}

function initQuillEditor(content) {
    const container = document.getElementById('quill-editor-container');
    container.innerHTML = ''; 
    quillEditor = new Quill(container, { 
        theme: 'snow',
        readOnly: (currentNotebook && currentNotebook.isShared) 
    });
    if(content) quillEditor.setContents(content);
}

saveNotebookBtn.addEventListener('click', () => {
    const title = notebookTitleInput.value.trim();
    const subject = notebookSubjectSelect.value;
    if (!title || !subject) return showCustomAlert("Title and subject are required.", "alert");
    
    if (currentNotebook && currentNotebook.id) { 
        const nb = notebooks.find(n => n.id === currentNotebook.id);
        if(nb) {
            nb.title = title;
            nb.subject = subject;
            if(nb.type === 'text') nb.content = quillEditor.getContents();
            nb.lastEdited = new Date().toISOString();
        }
    } else { 
        notebooks.push({
            id: Date.now(),
            title, subject,
            type: currentNotebook.type,
            content: currentNotebook.type === 'text' ? quillEditor.getContents() : null,
            lastEdited: new Date().toISOString()
        });
    }
    
    saveAllData();
    renderNotebooks();
    closeAllModals();
});

function showFlashcardFoldersView() {
    document.querySelector('.flashcard-folders-view').classList.remove('hidden');
    document.querySelector('.flashcard-detail-view').classList.add('hidden');
    document.querySelector('.flashcard-review-timed-view').classList.add('hidden');
    document.querySelector('.flashcard-review-type-view').classList.add('hidden');
    renderFlashcardFolders();
}

function renderFlashcardFolders() {
    const foldersGrid = document.getElementById('folders-grid');
    foldersGrid.innerHTML = '';
    if (flashcardFolders.length === 0) {
        foldersGrid.innerHTML = '<p class="empty-message">No flashcard folders created.</p>';
        return;
    }
    flashcardFolders.forEach(folder => {
        const card = document.createElement('div');
        card.className = 'folder-card';
        card.innerHTML = `
            <h4>${escapeHTML(folder.name)}</h4>
            <p>${escapeHTML(folder.subject)}</p>
            <p>${folder.cards.length} cards</p>
            ${folder.isShared ? `<p class="shared-by-indicator">Shared by ${escapeHTML(folder.sharedBy)}</p>` : ''}
             <div class="resource-actions">
                ${!folder.isShared ? `<button class="action-btn share-folder-btn" title="Share Folder"><i class="fas fa-share-alt"></i></button>` : ''}
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn')) return;
            openFlashcardFolder(folder.id)
        });
        card.querySelector('.share-folder-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            openShareModal(folder.id, 'flashcardFolder');
        })
        foldersGrid.appendChild(card);
    });
}

document.getElementById('create-folder-btn').addEventListener('click', () => {
    const name = prompt("Enter new folder name:");
    if (!name) return;
    const subject = prompt("Enter subject for this folder (must be an existing subject):");
    if(name && subject && subjects.find(s => s.name.toLowerCase() === subject.toLowerCase())) {
        flashcardFolders.push({
            id: Date.now(), name, subject, cards: []
        });
        saveAllData();
        renderFlashcardFolders();
    } else {
        showCustomAlert("Invalid folder name or subject. The subject must already exist in your dashboard.", "alert");
    }
});

function openFlashcardFolder(folderId) {
    currentFlashcardFolder = flashcardFolders.find(f => f.id === folderId);
    if (!currentFlashcardFolder) return;

    document.querySelector('.flashcard-folders-view').classList.add('hidden');
    document.querySelector('.flashcard-detail-view').classList.remove('hidden');
    
    document.getElementById('current-folder-name').textContent = `Folder: ${currentFlashcardFolder.name}`;
    
    const isReadOnly = !!currentFlashcardFolder.isShared;
    document.getElementById('add-flashcard-btn').style.display = isReadOnly ? 'none' : 'inline-flex';
    
    renderFlashcardsList(currentFlashcardFolder.id);
}

function renderFlashcardsList(folderId) {
    const listEl = document.getElementById('flashcards-list');
    const folder = flashcardFolders.find(f => f.id === folderId);
    listEl.innerHTML = '';
    if (!folder || folder.cards.length === 0) {
        listEl.innerHTML = '<p class="empty-message">No cards in this folder.</p>';
        return;
    }
    folder.cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'flashcard-item';
        item.textContent = card.front;
        listEl.appendChild(item);
    });
}

document.getElementById('add-flashcard-btn').addEventListener('click', () => {
    if (!currentFlashcardFolder) return;
    openFlashcardModal();
});

function openFlashcardModal() {
    closeAllModals();
    flashcardFrontInput.value = '';
    flashcardBackInput.value = '';

    modalOverlay.appendChild(flashcardModal);
    flashcardModal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
}

saveFlashcardBtn.addEventListener('click', () => {
    const front = flashcardFrontInput.value.trim();
    const back = flashcardBackInput.value.trim();
    if (!front || !back || !currentFlashcardFolder) return showCustomAlert("All fields required.", "alert");

    currentFlashcardFolder.cards.push({ id: Date.now(), front, back });
    saveAllData();
    renderFlashcardsList(currentFlashcardFolder.id);
    closeAllModals();
});


document.getElementById('back-to-folders').addEventListener('click', showFlashcardFoldersView);
document.getElementById('back-from-timed-review').addEventListener('click', () => openFlashcardFolder(currentFlashcardFolder.id));
document.getElementById('back-from-type-review').addEventListener('click', () => openFlashcardFolder(currentFlashcardFolder.id));