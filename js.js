/**
 * =============================================================================
 * AUTHENTICATION SERVICE (with Firebase)
 * =============================================================================
 */
const AuthService = {
    async signup(email, password) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const userDocRef = db.collection('users').doc(userCredential.user.uid);
            await userDocRef.set({
                pfp: 'https://i.imgur.com/V4RclNb.png', // Default PFP
                email: email 
            });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    async login(email, password) {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout() {
      
        document.title = "schlkatsu by rei";
        return auth.signOut();
    },

    getCurrentUser() {
        return auth.currentUser;
    },
    
    
    async getUserPfp(userId) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data().pfp || 'https://i.imgur.com/V4RclNb.png';
        }
        return 'https://i.imgur.com/V4RclNb.png';
    },

    async updateUserPfp(userId, pfpUrl) {
         if (!userId) return false;
         await db.collection('users').doc(userId).set({ pfp: pfpUrl }, { merge: true });
         return true;
    }
};
/**
 * =============================================================================
 * DATA SERVICE (with Firebase Firestore)
 * =============================================================================
 */
const DataService = {
    async loadData(userId) {
        if (!userId) return null;
        try {
            
            const docRef = db.collection('users').doc(userId);
            const doc = await docRef.get();
            if (doc.exists) {
                
                return doc.data().appData || null; 
            } else {
                console.log("No data document for this user yet.");
                return null;
            }
        } catch (error) {
            console.error("Error loading data: ", error);
            return null;
        }
    },

    async saveData(userId, data) {
        if (!userId) return;
        try {
            
            const docRef = db.collection('users').doc(userId);
            
          
            await docRef.set({ appData: data }, { merge: true });
        } catch (error) {
            console.error("Error saving data: ", error);
        }
    }
};


/**
 * =============================================================================
 * MORE CONSTANT / LOCAL STUFF
 * =============================================================================
 */
let currentUser = null;
let subjects = [];
let tasks = [];
let flashcardFolders = [];
let notebooks = [];
let extracurriculars = [];
let theme = 'light';
let themeColors = {};

const gradesDropdownOptions = ["1.00", "1.25", "1.50", "1.75", "2.00", "2.25", "2.50", "2.75", "3.00", "4.00", "5.00"];
const gradesOptionsNumeric = gradesDropdownOptions.map(g => parseFloat(g));

const GRADE_COMPONENTS = {
    'Chemistry': { 'Quiz / FA': 0.25, 'LT / SA': 0.35, 'AA / LA': 0.40 },
    'Physics': { 'Quiz / FA': 0.25, 'AA': 0.25, 'LT1': 0.25, 'LT2': 0.25 },
    'Biology': { 'Final LT': 0.25, 'LT1, LT2, Quiz / FA': 0.30, 'LA': 0.25, 'AA': 0.20 },
    'Math': { 'Quiz / FA': 0.25, 'SW and HW': 0.05, 'LT1': 0.25, 'LT2': 0.25, 'AA': 0.20 },
    'Statistics': { 'Quiz / FA': 0.20, 'Mini Tasks': 0.05, 'LA': 0.25, 'Project': 0.25, 'LT': 0.25 },
    'Socsci': { 'Quiz / FA': 0.25, 'LT': 0.35, 'AA': 0.40 },
    'English': { 'Quiz / FA': 0.25, 'LT': 0.35, 'AA': 0.40 },
    'Filipino': { 'Quiz / FA': 0.25, 'LT': 0.35, 'AA': 0.40 }
};

const SUBJECT_ORDER = ["Physics", "Chemistry", "Biology", "Math", "Statistics", "Computer Science", "Filipino", "English", "PEHM", "Social Science"];


function sortSubjects(subjectList) {
    subjectList.sort((a, b) => {
        const indexA = SUBJECT_ORDER.indexOf(a.name);
        const indexB = SUBJECT_ORDER.indexOf(b.name);
        
 
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }

        if (indexA !== -1) return -1;
 
        if (indexB !== -1) return 1;

        return a.name.localeCompare(b.name);
    });
}


let currentActiveTab = 'dashboard-content';
let currentFlashcardFolder = null;
let currentReviewSessionCards = []; 
let currentCardIndex = 0;
let currentNotebook = null;
let quillEditor = null;
let plannerDate = new Date();
let currentlyEditingSubject = null;
let currentlyEditingExtracurricularId = null;
let currentlyEditingCardId = null; 
let reviewTimer = {
    timerId: null,
    timeLeft: 0,
    duration: 5
};
let itemToShare = { id: null, type: null };
let pomodoro = {
    timerId: null,
    timeLeft: 25 * 60,
    isPaused: true,
    defaultTime: 25 * 60
};

/**
 * =============================================================================
 * CONSTANT VARIABALLS
 * =============================================================================
 */
const appContainer = document.querySelector('.app-container');
const modalOverlay = document.getElementById('modal-overlay');

const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const continueGuestBtn = document.getElementById('continue-guest');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const profilePic = document.getElementById('profile-pic');
const rightSidebar = document.querySelector('.right-sidebar');
const mainContent = document.querySelector('.main-content');
const gwaGuestMessage = document.getElementById('gwa-guest-message');
const shareModal = document.getElementById('share-modal');
const shareUserEmailInput = document.getElementById('share-user-email-input'); 
const executeShareBtn = document.getElementById('execute-share-btn');
const settingsModal = document.getElementById('settings-modal');
const rightSidebarSettingsBtn = document.getElementById('right-sidebar-settings-btn');
const themeToggleSwitch = document.getElementById('theme-toggle');
const pfpUrlInput = document.getElementById('pfp-url-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const flashcardModal = document.getElementById('flashcard-modal');
const flashcardFrontInput = document.getElementById('flashcard-front');
const flashcardBackInput = document.getElementById('flashcard-back');
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
const saveNewSubjectBtn = document.getElementById('save-new-subject-btn');
const createNotebookBtn = document.getElementById('create-notebook-btn');
const notebookTypeModal = document.getElementById('notebook-type-modal');
const createTextNotebookBtn = document.getElementById('create-text-notebook-btn');
const notebookEditorModal = document.getElementById('notebook-editor-modal');
const notebookTitleInput = document.getElementById('notebook-title-input');
const notebookSubjectSelect = document.getElementById('notebook-subject-select');
const saveNotebookBtn = document.getElementById('save-notebook-btn');
const textEditorView = document.getElementById('text-editor-view');
const addExtracurricularModal = document.getElementById('add-extracurricular-modal');
const extracurricularDetailModal = document.getElementById('extracurricular-detail-modal');
const dashboardSubjectsGrid = document.getElementById('dashboard-subjects-grid');
const gwaDisplay = document.getElementById('gwa-display');
const gwaBody = document.getElementById('gwa-body');
const gradeCalcSubjectSelect = document.getElementById('grade-calc-subject-select');
const gradeCalcComponentsGrid = document.getElementById('grade-calc-components');
const gradeCalcResults = document.getElementById('grade-calc-results');
const calendarDays = document.getElementById('calendar-days');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const addExtracurricularBtn = document.getElementById('add-extracurricular-btn');
const extracurricularsGrid = document.getElementById('extracurriculars-grid');
const saveExtracurricularBtn = document.getElementById('save-extracurricular-btn');
const pomodoroMinutes = document.getElementById('minutes');
const pomodoroSeconds = document.getElementById('seconds');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resetTimerBtn = document.getElementById('reset-timer');
const pomodoroTaskSelect = document.getElementById('task-select');
const pomodoroCurrentTask = document.getElementById('current-task');
const customMinutesInput = document.getElementById('custom-minutes');

const startManualFlipBtn = document.getElementById('start-manual-flip');
const startAutoFlipBtn = document.getElementById('start-auto-flip');
const startTypeAnswerBtn = document.getElementById('start-type-answer');

const flipperFlashcardDisplay = document.getElementById('flipper-flashcard-display');
const flipperCardFront = document.getElementById('flipper-card-front');
const flipperCardBack = document.getElementById('flipper-card-back');
const prevFlipperCardBtn = document.getElementById('prev-flipper-card');
const flipFlipperCardBtn = document.getElementById('flip-flipper-card');
const nextFlipperCardBtn = document.getElementById('next-flipper-card');

const typeFlashcardDisplay = document.getElementById('type-flashcard-display');
const typeCardFront = document.getElementById('type-card-front');
const typeCardBack = document.getElementById('type-card-back');
const typeAnswerInput = document.getElementById('type-answer-input');
const typeAnswerFeedback = document.getElementById('type-answer-feedback');
const checkTypeAnswerBtn = document.getElementById('check-type-answer');
const revealTypeAnswerBtn = document.getElementById('reveal-type-answer');
const nextTypeCardBtn = document.getElementById('next-type-card');

/**
 * =============================================================================
 * CORE STUFF
 * =============================================================================
 */

function saveAllData(options = {}) {
    const dataToSave = {
        subjects,
        tasks,
        flashcardFolders,
        notebooks,
        extracurriculars,
        theme,
        themeColors
    };
    if (currentUser !== 'guest' && currentUser) {
        DataService.saveData(currentUser, dataToSave);
    }

   
    if (!options.skipRender) {
        renderRightSidebarTasks();
        updateProgressCircle();
 
        if (currentActiveTab === 'planner-content') renderCalendar();
        if (currentActiveTab === 'dashboard-content') renderDashboard();
        if (currentActiveTab === 'gwa-content') renderGwaCalculator();
    }
}


/**
 * =============================================================================
 * EVENT LISTENERS: AUTHENTICATION
 * =============================================================================
 */


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const result = await AuthService.login(email, password);
    if (!result.success) {
        loginError.textContent = result.message;
        loginError.classList.remove('hidden');
    }
   
});


signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.classList.add('hidden');
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const result = await AuthService.signup(email, password);
    if (!result.success) {
        signupError.textContent = result.message;
        signupError.classList.remove('hidden');
    }
    
});


logoutBtn.addEventListener('click', () => {
    AuthService.logout();
});


showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});


continueGuestBtn.addEventListener('click', (e) => {
    e.preventDefault();
    enterGuestMode();
});



/**
 * =============================================================================
 * FUNCTION: UI STUFF 
 * =============================================================================
 */

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
    
   
    let title = (type === 'notification') ? 'Success!' : 'Alert';
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
            <h3><i class="fas fa-question-circle" style="margin-right: 10px;"></i>Confirm Action</h3>
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
    
    const sortedSubjects = [...subjects];
    sortSubjects(sortedSubjects);
    
    subjectSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select Subject --</option>';
        sortedSubjects.forEach(subject => {
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

    const newTabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (newTabButton) newTabButton.classList.add('active');

    const newTabContent = document.getElementById(tabId);
    if (newTabContent) newTabContent.classList.remove('hidden');

    currentActiveTab = tabId;

    if (tabId === 'dashboard-content') renderDashboard();
    else if (tabId === 'todo-content') renderTasks();
    else if (tabId === 'gwa-content') renderGwaCalculator();
    else if (tabId === 'grade-calc-content') setupGradeCalculator();
    else if (tabId === 'extracurriculars-content') renderExtracurriculars();
    else if (tabId === 'pomodoro-content') updatePomodoroTasks();
    else if (tabId === 'flashcards-content') showFlashcardFoldersView();
    else if (tabId === 'notes-content') renderNotebooks();
    else if (tabId === 'planner-content') renderCalendar();
}

function applyTheme(newTheme) {
    theme = newTheme;
    document.body.classList.toggle('dark-mode', theme === 'dark');
    themeToggleSwitch.checked = (theme === 'dark');

    applyCustomColors();
}

function applyCustomColors() {

    const colors = themeColors[theme] || {};
    const root = document.documentElement;
    const colorVars = ['--accent-color', '--bg-color-primary', '--bg-color-secondary', '--text-color-primary'];

    colorVars.forEach(v => {
        if (colors[v]) {
            root.style.setProperty(v, colors[v]);
        } else {
           
            root.style.removeProperty(v);
        }
    });


    const settingsColorPickers = settingsModal.querySelectorAll('input[type="color"]');
    settingsColorPickers.forEach(picker => {
        const varName = picker.dataset.var;
        
        const currentVal = getComputedStyle(root).getPropertyValue(varName).trim();
        picker.value = colors[varName] || currentVal;
    });
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
    currentlyEditingExtracurricularId = null;
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

/**
 * =============================================================================
 * FUNCTION: GUEST MODE
 * =============================================================================
 */

function enterGuestMode() {
    currentUser = 'guest';
    hideAuthModal();
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.disabled = (btn.dataset.tab !== 'gwa-content');
    });

    rightSidebar.classList.add('hidden');
    mainContent.style.width = 'calc(100% - 70px)';
    mainContent.style.marginLeft = '70px';

    const defaultSubjectNames = ["Physics", "Chemistry", "Biology", "Math", "Statistics", "Computer Science", "Social Science", "English", "Filipino", "PEHM"];
    subjects = defaultSubjectNames.map(name => ({
        name: name,
        units: 1,
        grade: null,
        previousGrade: null,
        currentGrade: null
    }));
    
    sortSubjects(subjects); 

    switchTab('gwa-content');

    gwaGuestMessage.classList.remove('hidden');
    document.getElementById('login-from-guest').addEventListener('click', () => window.location.reload());
    document.getElementById('signup-from-guest').addEventListener('click', () => window.location.reload());
}

async function initializeApp(user) {
    currentUser = user.uid;
    hideAuthModal();

    const [savedData, pfp] = await Promise.all([
        DataService.loadData(user.uid),
        AuthService.getUserPfp(user.uid)
    ]);

    subjects = (savedData && Array.isArray(savedData.subjects)) ? savedData.subjects : [];
    subjects.forEach(s => {
        s.units = s.units || 1;
        s.previousGrade = s.previousGrade !== undefined ? s.previousGrade : null;
        s.currentGrade = s.currentGrade !== undefined ? s.currentGrade : null;
        s.detailedGrades = s.detailedGrades || {};
    });

    tasks = (savedData && Array.isArray(savedData.tasks)) ? savedData.tasks : [];
    flashcardFolders = (savedData && Array.isArray(savedData.flashcardFolders)) ? savedData.flashcardFolders : [];
    notebooks = (savedData && Array.isArray(savedData.notebooks)) ? savedData.notebooks : [];
    extracurriculars = (savedData && Array.isArray(savedData.extracurriculars)) ? savedData.extracurriculars : [];
    extracurriculars.forEach(e => {
        e.meetings = e.meetings || [];
        e.projects = e.projects || [];
        e.tasks = e.tasks || [];
    });
    

    sortSubjects(subjects);

    theme = (savedData && typeof savedData.theme === 'string') ? savedData.theme : 'light';
    themeColors = (savedData && typeof savedData.themeColors === 'object' && savedData.themeColors) ? savedData.themeColors : {};


    if (subjects.length === 0) {
        const defaultSubjectNames = ["Physics", "Chemistry", "Biology", "Math", "Statistics", "Computer Science", "Social Science", "English", "Filipino", "PEHM"];
        subjects = defaultSubjectNames.map(name => ({
            name: name,
            units: 1,
            grade: null,
            previousGrade: null,
            currentGrade: null,
            detailedGrades: {}
        }));
        sortSubjects(subjects); 
        saveAllData();
    }

    usernameDisplay.textContent = user.email;
    profilePic.src = pfp;
    pfpUrlInput.value = pfp;

    applyTheme(theme);
    rightSidebar.classList.remove('hidden');
    mainContent.style.width = '';
    mainContent.style.marginLeft = '';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.disabled = false);

    populateSubjectDropdowns();
    switchTab('dashboard-content');
    renderRightSidebarTasks();
    showDueTodayNotification();
}



auth.onAuthStateChanged(async user => {
    if (user) {
        await initializeApp(user); 
    } else {
        currentUser = null;
        showAuthModal();
    }
});

/**
 * =============================================================================
 * FUNCTION: SHARING
 * =============================================================================
 */

function openShareModal(id, type) {
    itemToShare = { id, type };
    closeAllModals();
    shareUserEmailInput.value = '';
    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(shareModal);
    shareModal.classList.remove('hidden');
    shareUserEmailInput.focus();
}


async function handleExecuteShare() {
    const targetEmail = shareUserEmailInput.value.trim().toLowerCase();
    const currentUserEmail = auth.currentUser.email;

    if (!targetEmail) return showCustomAlert("Please enter a user's email.", "alert");
    if (targetEmail === currentUserEmail) return showCustomAlert("You cannot share an item with yourself.", "alert");

    try {
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', targetEmail).limit(1).get();

        if (snapshot.empty) {
            return showCustomAlert(`User with email "${escapeHTML(targetEmail)}" was not found.`, "alert");
        }
        
        const targetUserId = snapshot.docs[0].id;
        
        
        const targetAppData = await DataService.loadData(targetUserId) || { subjects: [], tasks: [], flashcardFolders: [], notebooks: [], extracurriculars: [] };

        let itemCopy;
        let successMessage = '';
        
        
        if (itemToShare.type === 'notebook') {
            const originalItem = notebooks.find(n => n.id === itemToShare.id);
            if (!originalItem) return showCustomAlert("Notebook not found.", "alert");
            if ((targetAppData.notebooks || []).some(n => n.originalId === originalItem.id)) return showCustomAlert(`This notebook has already been shared with ${escapeHTML(targetEmail)}.`, "alert");

            itemCopy = JSON.parse(JSON.stringify(originalItem));
            itemCopy.isShared = true;
            itemCopy.sharedBy = currentUserEmail;
            itemCopy.originalId = originalItem.id; 
            itemCopy.id = Date.now(); 
            targetAppData.notebooks = targetAppData.notebooks || [];
            targetAppData.notebooks.push(itemCopy);
            successMessage = 'Notebook';

        } else if (itemToShare.type === 'flashcardFolder') {
            const originalItem = flashcardFolders.find(f => f.id === itemToShare.id);
            if (!originalItem) return showCustomAlert("Flashcard folder not found.", "alert");
            if ((targetAppData.flashcardFolders || []).some(f => f.originalId === originalItem.id)) return showCustomAlert(`This folder has already been shared with ${escapeHTML(targetEmail)}.`, "alert");

            itemCopy = JSON.parse(JSON.stringify(originalItem));
            itemCopy.isShared = true;
            itemCopy.sharedBy = currentUserEmail;
            itemCopy.originalId = originalItem.id;
            itemCopy.id = Date.now();
            targetAppData.flashcardFolders = targetAppData.flashcardFolders || [];
            targetAppData.flashcardFolders.push(itemCopy);
            successMessage = 'Flashcard Folder';

        } else if (itemToShare.type === 'task') {
            const originalItem = tasks.find(t => t.id === itemToShare.id);
            if (!originalItem) return showCustomAlert("Task not found.", "alert");
            if ((targetAppData.tasks || []).some(t => t.originalId === originalItem.id)) return showCustomAlert(`This task has already been shared with ${escapeHTML(targetEmail)}.`, "alert");

            itemCopy = JSON.parse(JSON.stringify(originalItem));
            itemCopy.isShared = true;
            itemCopy.sharedBy = currentUserEmail;
            itemCopy.originalId = originalItem.id;
            itemCopy.id = Date.now();
            itemCopy.done = false; 
            targetAppData.tasks = targetAppData.tasks || [];
            targetAppData.tasks.push(itemCopy);
            successMessage = 'Task';
        }

        await DataService.saveData(targetUserId, targetAppData);
        showCustomAlert(`${successMessage} successfully shared with ${escapeHTML(targetEmail)}!`);
        closeAllModals();

    } catch (error) {
        console.error("Sharing error:", error);
        showCustomAlert("An error occurred while trying to share. Please try again.", "alert");
    }
}


/**
 * =============================================================================
 * FUNCTION: SUBJECT MANAGEMENT
 * =============================================================================
 */
function openAddSubjectModal() {
    closeAllModals();
    currentlyEditingSubject = null;
    addSubjectModalTitle.textContent = "Add New Subject";
    saveNewSubjectBtn.textContent = "Add Subject";
    newSubjectNameInput.value = '';

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

    if (!newName) return showCustomAlert('Subject name cannot be empty!', 'alert');

    const isNameTaken = subjects.some(s => s.name.toLowerCase() === newName.toLowerCase() && s.name.toLowerCase() !== (currentlyEditingSubject || '').toLowerCase());
    if (isNameTaken) return showCustomAlert('A subject with this name already exists!', 'alert');

    if (currentlyEditingSubject) {
        const subjectIndex = subjects.findIndex(s => s.name === currentlyEditingSubject);
        if (subjectIndex > -1) {
            const oldName = subjects[subjectIndex].name;
            subjects[subjectIndex].name = newName;

            tasks.forEach(t => { if (t.subject === oldName) t.subject = newName; });
            notebooks.forEach(n => { if (n.subject === oldName) n.subject = newName; });
            flashcardFolders.forEach(f => { if (f.subject === oldName) f.subject = newName; });

            showCustomAlert(`Subject "${oldName}" was updated.`);
        }
    } else {
        subjects.push({
            name: newName,
            units: 1,
            grade: null,
            previousGrade: null,
            currentGrade: null,
            detailedGrades: {}
        });
        showCustomAlert(`Subject "${newName}" added!`);
    }
    
    sortSubjects(subjects); 
    saveAllData();
    populateSubjectDropdowns();
    renderDashboard();
    renderGwaCalculator();
    closeAllModals();
});


/**
 * =============================================================================
 * FUNCTION: DASHBOARD
 * =============================================================================
 */
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
                <span class="icon-group" title="${flashcardCount} Flashcard Folders"><i class="fas fa-layer-group"></i> ${flashcardCount}</span>
            </div>
            <div class="card-actions">
                <button class="edit-subject-btn cute-button-icon-only" title="Edit Subject"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-subject-btn cute-button-icon-only" title="Delete Subject"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if(e.target.closest('.card-actions')) return;
            openSubjectDetail(subject.name)
        });
        
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
    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(subjectDetailModal);
    subjectDetailModal.classList.remove('hidden');
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
            card.innerHTML = `<h4><i class="fas fa-layer-group"></i> ${escapeHTML(folder.name)}</h4><p>${folder.cards.length} cards</p>`;
            card.addEventListener('click', () => { closeAllModals(); switchTab('flashcards-content'); openFlashcardFolder(folder.id); });
            subjectFlashcardsList.appendChild(card);
        });
    }
}

/**
 * =============================================================================
 * FUNCTION: SIDEBAR RIGHT SIDE
 * =============================================================================
 */
function renderRightSidebarTasks() {
    const dueTomorrowList = document.getElementById('due-tomorrow-list');
    const due7DaysList = document.getElementById('due-7-days-list');

    dueTomorrowList.innerHTML = '';
    due7DaysList.innerHTML = '';

    const toYYYYMMDD = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    const today = new Date();
    
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const tomorrowStr = toYYYYMMDD(tomorrow);
    const sevenDaysFromNowStr = toYYYYMMDD(sevenDaysFromNow);
    const todayStr = toYYYYMMDD(today);
    
    const tasksDueTomorrow = tasks.filter(task => !task.done && task.dueDate === tomorrowStr);
    const tasksDueIn7Days = tasks.filter(task => !task.done && task.dueDate > tomorrowStr && task.dueDate <= sevenDaysFromNowStr);
    
    const renderTaskListItem = (list, task) => {
        const li = document.createElement('li');
        const displayDate = new Date(task.dueDate + 'T00:00:00');
        li.innerHTML = `<div class="task-content"><span class="task-name">${escapeHTML(task.name)}</span><span class="task-course">${escapeHTML(task.subject)}</span></div><span class="task-date">${displayDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>`;
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
        tasksDueIn7Days.sort((a,b) => a.dueDate.localeCompare(b.dueDate)).forEach(task => renderTaskListItem(due7DaysList, task));
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
    applyCustomColors();
});

/**
 * =============================================================================
 * FUNCTION: GWA CALCULATOR
 * =============================================================================
 */
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
        const calculatedGrade = (currentGrade * (2 / 3)) + (previousGrade * (1 / 3));
        subjectToUpdate.grade = roundToNearestGrade(calculatedGrade);
    } else if (currentGrade !== null && previousGrade === null) {
        subjectToUpdate.grade = currentGrade;
    } else {
        subjectToUpdate.grade = null;
    }
    
    saveAllData({ skipRender: true }); 
    renderGwaCalculator(); 
}

function renderGwaCalculator() {
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
        gwaDisplay.textContent = `Your GWA: ${finalGwa.toFixed(2)}`;
    } else {
        gwaDisplay.textContent = 'Select grades to calculate your GWA.';
    }
}

/**
 * =============================================================================
 * FUNCTION: GRADE CALCU PER SUBJECT
 * =============================================================================
 */
function transmuteGrade(percentage) {
    if (isNaN(percentage) || percentage === null) return null;
    if (percentage >= 96) return 1.00;
    if (percentage >= 90) return 1.25;
    if (percentage >= 84) return 1.50;
    if (percentage >= 78) return 1.75;
    if (percentage >= 72) return 2.00;
    if (percentage >= 66) return 2.25;
    if (percentage >= 60) return 2.50;
    if (percentage >= 55) return 2.75;
    if (percentage >= 50) return 3.00;
    if (percentage >= 40) return 4.00;
    return 5.00;
}

function setupGradeCalculator() {
    
    const sortedSubjects = [...subjects];
    sortSubjects(sortedSubjects);
    gradeCalcSubjectSelect.innerHTML = '<option value="">-- Select a Subject --</option>' +
        sortedSubjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    gradeCalcComponentsGrid.innerHTML = '';
    gradeCalcResults.textContent = 'Select a subject to start calculating.';

    gradeCalcSubjectSelect.onchange = (e) => {
        renderGradeCalculatorUI(e.target.value);
    };
}

function renderGradeCalculatorUI(subjectName) {
    gradeCalcComponentsGrid.innerHTML = '';
    if (!subjectName) {
        gradeCalcResults.textContent = 'Select a subject to start calculating.';
        return;
    }
    const componentKey = Object.keys(GRADE_COMPONENTS).find(key => subjectName.toLowerCase().includes(key.toLowerCase()));
    if (!componentKey) {
        gradeCalcComponentsGrid.innerHTML = '<p class="empty-message">Grade components are not defined for this subject.</p>';
        recalculateAndDisplayGrade(subjectName);
        return;
    }
    const components = GRADE_COMPONENTS[componentKey];
    const subject = subjects.find(s => s.name === subjectName);
    if (!subject.detailedGrades) subject.detailedGrades = {};

    for (const [name, weight] of Object.entries(components)) {
        if (!subject.detailedGrades[name]) subject.detailedGrades[name] = [];

        let scoreRowsHTML = subject.detailedGrades[name].map((score, index) => `
            <div class="grade-calc-score-row" data-index="${index}">
                <label>#${index + 1}</label>
                <input type="number" class="score-input" placeholder="Score" value="${score.score || ''}">
                <span>/</span>
                <input type="number" class="total-input" placeholder="Total" value="${score.total || ''}">
                <button class="action-btn delete-score-btn cute-button-icon-only" title="Delete Score">&times;</button>
            </div>
        `).join('');

        const fieldsetHTML = `
            <fieldset class="grade-calc-component" data-component-name="${name}">
                <legend>${name} (${weight * 100}%)</legend>
                <div class="scores-container">${scoreRowsHTML}</div>
                <button class="cute-button add-score-btn" style="width: 100%; margin-top: 10px;">+ Add Score</button>
            </fieldset>
        `;
        gradeCalcComponentsGrid.insertAdjacentHTML('beforeend', fieldsetHTML);
    }
    recalculateAndDisplayGrade(subjectName);
}

gradeCalcComponentsGrid.addEventListener('click', (e) => {
    const subjectName = gradeCalcSubjectSelect.value;
    if (!subjectName) return;

    const addBtn = e.target.closest('.add-score-btn');
    if (addBtn) {
        const componentName = addBtn.closest('.grade-calc-component').dataset.componentName;
        const subject = subjects.find(s => s.name === subjectName);
        subject.detailedGrades[componentName].push({ score: '', total: '' });
        renderGradeCalculatorUI(subjectName);
    }

    const deleteBtn = e.target.closest('.delete-score-btn');
    if (deleteBtn) {
        const componentName = deleteBtn.closest('.grade-calc-component').dataset.componentName;
        const scoreIndex = parseInt(deleteBtn.closest('.grade-calc-score-row').dataset.index);
        const subject = subjects.find(s => s.name === subjectName);
        subject.detailedGrades[componentName].splice(scoreIndex, 1);
        renderGradeCalculatorUI(subjectName);
    }
});

gradeCalcComponentsGrid.addEventListener('input', (e) => {
    const subjectName = gradeCalcSubjectSelect.value;
    if (e.target.classList.contains('score-input') || e.target.classList.contains('total-input')) {
        recalculateAndDisplayGrade(subjectName);
    }
});

function recalculateAndDisplayGrade(subjectName) {
    if (!subjectName) {
        gradeCalcResults.textContent = 'Select a subject to start calculating.';
        return;
    };

    const subject = subjects.find(s => s.name === subjectName);
    const componentKey = Object.keys(GRADE_COMPONENTS).find(key => subjectName.toLowerCase().includes(key.toLowerCase()));
    
    let totalWeightedScore = 0;
    
    if (componentKey) {
        const componentElements = gradeCalcComponentsGrid.querySelectorAll('.grade-calc-component');
        componentElements.forEach(compEl => {
            const componentName = compEl.dataset.componentName;
            const weight = GRADE_COMPONENTS[componentKey][componentName];
            let componentTotalScore = 0;
            let componentTotalItems = 0;
            
            const newScores = [];
            compEl.querySelectorAll('.grade-calc-score-row').forEach(row => {
                const score = parseFloat(row.querySelector('.score-input').value) || 0;
                const total = parseFloat(row.querySelector('.total-input').value) || 0;
                newScores.push({ score, total });
                if (total > 0) {
                    componentTotalScore += score;
                    componentTotalItems += total;
                }
            });
    
            subject.detailedGrades[componentName] = newScores;
            
            if (componentTotalItems > 0) {
                const componentAverage = componentTotalScore / componentTotalItems;
                totalWeightedScore += componentAverage * weight;
            }
        });
    }

    const finalPercentage = totalWeightedScore * 100;
    const transmuted = transmuteGrade(finalPercentage);

    if (componentKey) {
        gradeCalcResults.innerHTML = `Raw Percentage: <strong>${finalPercentage.toFixed(2)}%</strong> / Calculated Grade: <strong>${transmuted ? transmuted.toFixed(2) : 'N/A'}</strong>`;
    } else {
        gradeCalcResults.textContent = 'Grade components not defined for this subject.';
    }
    
    saveAllData();
}

/**
 * =============================================================================
 * FUNCTION: CALENDAR
 * =============================================================================
 */
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
        const dateString = new Date(Date.UTC(year, month, i)).toISOString().slice(0, 10);
        
        const today = new Date();
        const todayString = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0, 10);
        
        let dayClass = 'calendar-day';
        if (dateString === todayString) {
            dayClass += ' today';
        }

        let dayHTML = `<div class="${dayClass}" data-date="${dateString}"><div class="day-number">${i}</div>`;
        const eventsForDay = tasks.filter(t => t.dueDate === dateString);
        if (eventsForDay.length > 0) {
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

/**
 * =============================================================================
 * FUNCTION: TODO LIST
 * =============================================================================
 */
function renderTasks() {
    const todoBody = document.getElementById('todo-body');
    todoBody.innerHTML = '';

    tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
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

/**
 * =============================================================================
 * FUNCTION: EXTRACURIC
 * =============================================================================
 */
function renderExtracurriculars() {
    extracurricularsGrid.innerHTML = '';
    if (extracurriculars.length === 0) {
        extracurricularsGrid.innerHTML = '<p class="empty-message">No activities added yet. Click "Add Activity" to start.</p>';
        return;
    }
    extracurriculars.forEach(activity => {
        const card = document.createElement('div');
        card.className = 'extracurricular-card';
        card.dataset.id = activity.id;
        card.innerHTML = `
            <div class="card-actions">
                <button class="action-btn delete-extracurricular-btn" data-id="${activity.id}" title="Delete Activity"><i class="fas fa-trash"></i></button>
            </div>
            <div class="category">${escapeHTML(activity.category)}</div>
            <h4>${escapeHTML(activity.name)}</h4>
            <p class="role">${escapeHTML(activity.role)}</p>
        `;
        extracurricularsGrid.appendChild(card);
    });

    extracurricularsGrid.querySelectorAll('.extracurricular-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.delete-extracurricular-btn')) return;
            openExtracurricularDetail(parseInt(card.dataset.id));
        });
    });

    extracurricularsGrid.querySelectorAll('.delete-extracurricular-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const activityId = parseInt(e.currentTarget.dataset.id);
            showCustomConfirm("Are you sure you want to delete this activity?", () => {
                extracurriculars = extracurriculars.filter(a => a.id !== activityId);
                saveAllData();
                renderExtracurriculars();
            });
        });
    });
}

addExtracurricularBtn.addEventListener('click', () => {
    closeAllModals();
    addExtracurricularModal.querySelector('#add-extracurricular-modal-title').textContent = "Add Activity";
    addExtracurricularModal.querySelector('form')?.reset();
    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(addExtracurricularModal);
    addExtracurricularModal.classList.remove('hidden');
});

saveExtracurricularBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = document.getElementById('extracurricular-name-input').value.trim();
    const category = document.getElementById('extracurricular-category-select').value;
    const role = document.getElementById('extracurricular-role-input').value.trim();

    if (!name || !role) {
        return showCustomAlert("Activity Name and Role are required.", "alert");
    }

    extracurriculars.push({
        id: Date.now(),
        name,
        category,
        role,
        meetings: [],
        projects: [],
        tasks: []
    });
    saveAllData();
    renderExtracurriculars();
    closeAllModals();
});

function openExtracurricularDetail(activityId) {
    currentlyEditingExtracurricularId = activityId;
    const activity = extracurriculars.find(a => a.id === activityId);
    if (!activity) return;

    closeAllModals();
    extracurricularDetailModal.querySelector('#extracurricular-detail-title').textContent = activity.name;

    extracurricularDetailModal.querySelectorAll('.subject-detail-tab-btn').forEach(btn => btn.classList.remove('active'));
    extracurricularDetailModal.querySelectorAll('.detail-tab-content').forEach(content => content.classList.add('hidden'));
    extracurricularDetailModal.querySelector('.subject-detail-tab-btn[data-detail-tab="activity-meetings"]').classList.add('active');
    extracurricularDetailModal.querySelector('#activity-meetings').classList.remove('hidden');

    renderExtracurricularDetailContent('activity-meetings');

    modalOverlay.classList.remove('hidden');
    modalOverlay.appendChild(extracurricularDetailModal);
    extracurricularDetailModal.classList.remove('hidden');
}

extracurricularDetailModal.querySelectorAll('.subject-detail-tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        extracurricularDetailModal.querySelectorAll('.subject-detail-tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        extracurricularDetailModal.querySelectorAll('.detail-tab-content').forEach(content => content.classList.add('hidden'));
        const tabId = button.dataset.detailTab;
        document.getElementById(tabId).classList.remove('hidden');
        renderExtracurricularDetailContent(tabId);
    });
});

function renderExtracurricularDetailContent(tabId) {
    const activity = extracurriculars.find(a => a.id === currentlyEditingExtracurricularId);
    if (!activity) return;

    let listEl, items;
    if (tabId === 'activity-meetings') {
        listEl = document.getElementById('meetings-list');
        items = activity.meetings || [];
    } else if (tabId === 'activity-projects') {
        listEl = document.getElementById('projects-list');
        items = activity.projects || [];
    } else if (tabId === 'activity-tasks') {
        listEl = document.getElementById('activity-tasks-list');
        items = activity.tasks || [];
    }

    listEl.innerHTML = '';
    items.forEach((item, index) => {
        const li = document.createElement('li');
        const mainText = item.topic || item.name || item.description;
        const dateText = item.datetime ? new Date(item.datetime).toLocaleString() : (item.deadline ? new Date(item.deadline + 'T00:00:00').toLocaleDateString() : '');
        li.innerHTML = `
            <span>${escapeHTML(mainText)} ${dateText ? `(${dateText})` : ''}</span>
            <button class="action-btn delete-extracurricular-item-btn" data-index="${index}" data-tab="${tabId}">&times;</button>
        `;
        listEl.appendChild(li);
    });
}

document.getElementById('add-meeting-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = e.target.children[0].value;
    const datetime = e.target.children[1].value;
    const activity = extracurriculars.find(a => a.id === currentlyEditingExtracurricularId);
    if (activity && topic && datetime) {
        activity.meetings.push({ topic, datetime });
        saveAllData();
        renderExtracurricularDetailContent('activity-meetings');
        e.target.reset();
    }
});
document.getElementById('add-project-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = e.target.children[0].value;
    const deadline = e.target.children[1].value;
    const activity = extracurriculars.find(a => a.id === currentlyEditingExtracurricularId);
    if (activity && name) {
        activity.projects.push({ name, deadline });
        saveAllData();
        renderExtracurricularDetailContent('activity-projects');
        e.target.reset();
    }
});
document.getElementById('add-activity-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const description = e.target.children[0].value;
    const dueDate = e.target.children[1].value;
    const activity = extracurriculars.find(a => a.id === currentlyEditingExtracurricularId);
    if (activity && description) {
        activity.tasks.push({ description, dueDate });
        saveAllData();
        renderExtracurricularDetailContent('activity-tasks');
        e.target.reset();
    }
});

extracurricularDetailModal.addEventListener('click', (e) => {
    if (e.target.closest('.delete-extracurricular-item-btn')) {
        const btn = e.target.closest('.delete-extracurricular-item-btn');
        const index = parseInt(btn.dataset.index);
        const tabId = btn.dataset.tab;
        const activity = extracurriculars.find(a => a.id === currentlyEditingExtracurricularId);

        if (tabId === 'activity-meetings') activity.meetings.splice(index, 1);
        else if (tabId === 'activity-projects') activity.projects.splice(index, 1);
        else if (tabId === 'activity-tasks') activity.tasks.splice(index, 1);

        saveAllData();
        renderExtracurricularDetailContent(tabId);
    }
});

/**
 * =============================================================================
 * FUNCTION: NOTES
 * i don't like this but oh well 
 * =============================================================================
 */

function generatePreviewFromDelta(delta) {
    if (!delta || !Array.isArray(delta.ops)) return '';
    let text = delta.ops
        .filter(op => typeof op.insert === 'string')
        .map(op => op.insert)
        .join('');
    
    text = text.replace(/\n\s*\n/g, '\n').trim();
    return text.slice(0, 120) + (text.length > 120 ? '...' : '');
}
 
function renderNotebooks() {
    const notebooksGrid = document.getElementById('notebooks-grid');
    notebooksGrid.innerHTML = '';
    if (notebooks.length === 0) {
        notebooksGrid.innerHTML = '<p class="empty-message">No notebooks created yet. Create one to get started!</p>';
        return;
    }
    notebooks.forEach(notebook => {
        const card = document.createElement('div');
        card.className = 'notebook-card';
        // preview of notes
        const contentPreview = notebook.type === 'text' && notebook.content 
                               ? generatePreviewFromDelta(notebook.content)
                               : 'No content yet.';
                               
        card.innerHTML = `
             <div class="resource-actions">
                ${!notebook.isShared ? `<button class="action-btn share-notebook-btn" title="Share Notebook" data-id="${notebook.id}"><i class="fas fa-share-alt"></i></button>` : ''}
                <button class="action-btn delete-notebook-btn" title="Delete Notebook" data-id="${notebook.id}"><i class="fas fa-trash"></i></button>
            </div>
            <h4><i class="fas fa-${notebook.type === 'text' ? 'file-alt' : 'paint-brush'}"></i> ${escapeHTML(notebook.title)}</h4>
            <p class="notebook-subject">Subject: ${escapeHTML(notebook.subject)}</p>
            <p class="notebook-preview">${escapeHTML(contentPreview)}</p>
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
    if (content) quillEditor.setContents(content);
}

saveNotebookBtn.addEventListener('click', () => {
    const title = notebookTitleInput.value.trim();
    const subject = notebookSubjectSelect.value;
    if (!title || !subject) return showCustomAlert("Title and subject are required.", "alert");

    if (currentNotebook && currentNotebook.id) {
        const nb = notebooks.find(n => n.id === currentNotebook.id);
        if (nb) {
            nb.title = title;
            nb.subject = subject;
            if (nb.type === 'text') nb.content = quillEditor.getContents();
            nb.lastEdited = new Date().toISOString();
        }
    } else {
        notebooks.push({
            id: Date.now(),
            title,
            subject,
            type: currentNotebook.type,
            content: currentNotebook.type === 'text' ? quillEditor.getContents() : null,
            lastEdited: new Date().toISOString()
        });
    }

    saveAllData();
    renderNotebooks();
    closeAllModals();
});

/**
 * =============================================================================
 * FUNCTION: FLASHCARDS
 * =============================================================================
 */
function showFlashcardFoldersView() {
    document.querySelector('.flashcard-folders-view').classList.remove('hidden');
    document.querySelector('.flashcard-detail-view').classList.add('hidden');
    document.querySelector('.flashcard-flipper-view').classList.add('hidden');
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
            <h4><i class="fas fa-layer-group"></i> ${escapeHTML(folder.name)}</h4>
            <p>${escapeHTML(folder.subject)}</p>
            <p>${folder.cards.length} cards</p>
            ${folder.isShared ? `<p class="shared-by-indicator">Shared by ${escapeHTML(folder.sharedBy)}</p>` : ''}
             <div class="resource-actions">
                ${!folder.isShared ? `
                    <button class="action-btn edit-folder-btn" title="Edit Folder" data-folder-id="${folder.id}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="action-btn delete-folder-btn" title="Delete Folder" data-folder-id="${folder.id}"><i class="fas fa-trash"></i></button>
                    <button class="action-btn share-folder-btn" title="Share Folder" data-folder-id="${folder.id}"><i class="fas fa-share-alt"></i></button>
                ` : ''}
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn')) return;
            openFlashcardFolder(folder.id);
        });
        
        card.querySelector('.share-folder-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            openShareModal(folder.id, 'flashcardFolder');
        });

        foldersGrid.appendChild(card);
    });
}

document.getElementById('folders-grid').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-folder-btn');
    const deleteBtn = e.target.closest('.delete-folder-btn');

    if (editBtn) {
        e.stopPropagation();
        const folderId = parseInt(editBtn.dataset.folderId);
        const folderToEdit = flashcardFolders.find(f => f.id === folderId);
        if (folderToEdit) {
            const newName = prompt("Enter new folder name:", folderToEdit.name);
            if (newName === null || newName.trim() === '') return;

            const newSubject = prompt("Enter new subject:", folderToEdit.subject);
            if (newSubject === null) return; 

            if (subjects.find(s => s.name.toLowerCase() === newSubject.toLowerCase())) {
                folderToEdit.name = newName.trim();
                folderToEdit.subject = newSubject;
                saveAllData();
                renderFlashcardFolders();
                showCustomAlert("Folder updated successfully!");
            } else {
                showCustomAlert("Invalid subject. The subject must already exist in your dashboard.", "alert");
            }
        }
    }

    if (deleteBtn) {
        e.stopPropagation();
        const folderId = parseInt(deleteBtn.dataset.folderId);
        showCustomConfirm("Are you sure you want to delete this folder and all the cards inside it?", () => {
            flashcardFolders = flashcardFolders.filter(f => f.id !== folderId);
            saveAllData();
            renderFlashcardFolders();
        });
    }
});


document.getElementById('create-folder-btn').addEventListener('click', () => {
    const name = prompt("Enter new folder name:");
    if (!name) return;
    const subject = prompt("Enter subject for this folder (must be an existing subject):");
    if (name && subject && subjects.find(s => s.name.toLowerCase() === subject.toLowerCase())) {
        flashcardFolders.push({
            id: Date.now(),
            name,
            subject,
            cards: []
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
    document.querySelector('.flashcard-flipper-view').classList.add('hidden');
    document.querySelector('.flashcard-review-type-view').classList.add('hidden');

    document.getElementById('current-folder-name').textContent = `Folder: ${currentFlashcardFolder.name}`;

    const isReadOnly = !!currentFlashcardFolder.isShared;
    document.getElementById('add-flashcard-btn').style.display = isReadOnly ? 'none' : 'inline-flex';
    
    const hasCards = currentFlashcardFolder.cards.length > 0;
    startManualFlipBtn.disabled = !hasCards;
    startAutoFlipBtn.disabled = !hasCards;
    startTypeAnswerBtn.disabled = !hasCards;

    renderFlashcardsList(currentFlashcardFolder.id);
}

function renderFlashcardsList(folderId) {
    const listEl = document.getElementById('flashcards-list');
    const folder = flashcardFolders.find(f => f.id === folderId);
    listEl.innerHTML = '';
    if (!folder || folder.cards.length === 0) {
        listEl.innerHTML = '<p class="empty-message">No cards in this folder. Click "Add Flashcard" to create one!</p>';
        return;
    }
    
    const isReadOnly = !!folder.isShared;

    folder.cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'flashcard-item';
        item.innerHTML = `
            <div class="flashcard-item-content">
                <div class="flashcard-item-front"><strong>Front:</strong> ${escapeHTML(card.front)}</div>
                <div class="flashcard-item-back"><strong>Back:</strong> ${escapeHTML(card.back)}</div>
            </div>
            ${!isReadOnly ? `
            <div class="flashcard-item-actions">
                <button class="action-btn edit-flashcard-btn" data-card-id="${card.id}" title="Edit Card"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-btn delete-flashcard-btn" data-card-id="${card.id}" title="Delete Card"><i class="fas fa-trash"></i></button>
            </div>
            ` : ''}
        `;
        listEl.appendChild(item);
    });
}

document.getElementById('flashcards-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-flashcard-btn');
    if (editBtn) {
        const cardId = parseInt(editBtn.dataset.cardId);
        const cardToEdit = currentFlashcardFolder.cards.find(c => c.id === cardId);
        if (cardToEdit) {
            openFlashcardModal(cardToEdit);
        }
    }

    const deleteBtn = e.target.closest('.delete-flashcard-btn');
    if (deleteBtn) {
        const cardId = parseInt(deleteBtn.dataset.cardId);
        showCustomConfirm("Are you sure you want to delete this flashcard?", () => {
            currentFlashcardFolder.cards = currentFlashcardFolder.cards.filter(c => c.id !== cardId);
            saveAllData();
            renderFlashcardsList(currentFlashcardFolder.id);
            const hasCards = currentFlashcardFolder.cards.length > 0;
            startManualFlipBtn.disabled = !hasCards;
            startAutoFlipBtn.disabled = !hasCards;
            startTypeAnswerBtn.disabled = !hasCards;
        });
    }
});


document.getElementById('add-flashcard-btn').addEventListener('click', () => {
    if (!currentFlashcardFolder) return;
    openFlashcardModal();
});

function openFlashcardModal(card = null) {
    closeAllModals();
    
    if (card) {
        currentlyEditingCardId = card.id;
        document.getElementById('flashcard-modal-title').textContent = "Edit Flashcard";
        flashcardFrontInput.value = card.front;
        flashcardBackInput.value = card.back;
        saveFlashcardBtn.textContent = "Save Changes";
    } else {
        currentlyEditingCardId = null;
        document.getElementById('flashcard-modal-title').textContent = "Add Flashcard";
        flashcardFrontInput.value = '';
        flashcardBackInput.value = '';
        saveFlashcardBtn.textContent = "Save Flashcard";
    }

    modalOverlay.appendChild(flashcardModal);
    flashcardModal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
}

saveFlashcardBtn.addEventListener('click', () => {
    const front = flashcardFrontInput.value.trim();
    const back = flashcardBackInput.value.trim();
    if (!front || !back || !currentFlashcardFolder) return showCustomAlert("Front and back fields are required.", "alert");

    if (currentlyEditingCardId) {
        const cardToUpdate = currentFlashcardFolder.cards.find(c => c.id === currentlyEditingCardId);
        if (cardToUpdate) {
            cardToUpdate.front = front;
            cardToUpdate.back = back;
        }
    } else {
        currentFlashcardFolder.cards.push({ id: Date.now(), front, back });
    }

    saveAllData();
    renderFlashcardsList(currentFlashcardFolder.id);
    closeAllModals();
    currentlyEditingCardId = null;
});

// FIX: start of review to shuffle cards
function startReviewSession() {
    if (!currentFlashcardFolder || currentFlashcardFolder.cards.length === 0) return;
    // actual shuffle
    currentReviewSessionCards = [...currentFlashcardFolder.cards].sort(() => Math.random() - 0.5);
    currentCardIndex = 0;
    
    document.querySelector('.flashcard-detail-view').classList.add('hidden');
}


function startFlipperReview(isAuto) {
    startReviewSession();
    if (currentReviewSessionCards.length === 0) return;

    document.querySelector('.flashcard-flipper-view').classList.remove('hidden');
    document.getElementById('flipper-review-folder-name').textContent = `Reviewing: ${currentFlashcardFolder.name}`;
    
    const timerDisplay = document.getElementById('flipper-timer-display');
    if (isAuto) {
        reviewTimer.duration = parseInt(document.getElementById('auto-flip-seconds').value) || 5;
        timerDisplay.classList.remove('hidden');
    } else {
        timerDisplay.classList.add('hidden');
    }

    displayFlipperCard(isAuto);
}

function displayFlipperCard(isAuto) {
    if (reviewTimer.timerId) clearInterval(reviewTimer.timerId);

    const card = currentReviewSessionCards[currentCardIndex];
    flipperCardFront.textContent = card.front;
    flipperCardBack.textContent = card.back;
    flipperFlashcardDisplay.classList.remove('flipped');
    
    prevFlipperCardBtn.disabled = (currentCardIndex === 0);
    nextFlipperCardBtn.disabled = (currentCardIndex >= currentReviewSessionCards.length - 1);

    if (isAuto) {
        startCardTimer();
    }
}

function startCardTimer() {
    reviewTimer.timeLeft = reviewTimer.duration;
    document.getElementById('flipper-timer-countdown').textContent = reviewTimer.timeLeft;

    reviewTimer.timerId = setInterval(() => {
        reviewTimer.timeLeft--;
        document.getElementById('flipper-timer-countdown').textContent = reviewTimer.timeLeft;
        if (reviewTimer.timeLeft <= 0) {
            clearInterval(reviewTimer.timerId);
            flipperFlashcardDisplay.classList.add('flipped');
        }
    }, 1000);
}


function startTypeAnswerReview() {
    startReviewSession();
    if (currentReviewSessionCards.length === 0) return;

    document.querySelector('.flashcard-review-type-view').classList.remove('hidden');
    document.getElementById('type-review-folder-name').textContent = `Reviewing: ${currentFlashcardFolder.name}`;
    displayTypeAnswerCard();
}

function displayTypeAnswerCard() {
    const card = currentReviewSessionCards[currentCardIndex];
    typeCardFront.textContent = card.front;
    typeCardBack.textContent = card.back;

    typeCardBack.classList.add('hidden');
    typeAnswerInput.value = '';
    typeAnswerInput.disabled = false;
    typeAnswerFeedback.textContent = '';
    typeAnswerFeedback.className = 'feedback-message';
    checkTypeAnswerBtn.disabled = false;
    revealTypeAnswerBtn.disabled = false;
    nextTypeCardBtn.disabled = true;
}

startManualFlipBtn.addEventListener('click', () => startFlipperReview(false));
startAutoFlipBtn.addEventListener('click', () => startFlipperReview(true));
startTypeAnswerBtn.addEventListener('click', startTypeAnswerReview);

flipFlipperCardBtn.addEventListener('click', () => flipperFlashcardDisplay.classList.toggle('flipped'));
prevFlipperCardBtn.addEventListener('click', () => {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        const isAuto = !document.getElementById('flipper-timer-display').classList.contains('hidden');
        displayFlipperCard(isAuto);
    }
});
nextFlipperCardBtn.addEventListener('click', () => {
    if (currentCardIndex < currentReviewSessionCards.length - 1) {
        currentCardIndex++;
        const isAuto = !document.getElementById('flipper-timer-display').classList.contains('hidden');
        displayFlipperCard(isAuto);
    } else {
        showCustomAlert("Review complete!");
        openFlashcardFolder(currentFlashcardFolder.id);
    }
});


checkTypeAnswerBtn.addEventListener('click', () => {
    const card = currentReviewSessionCards[currentCardIndex];
    const userAnswer = typeAnswerInput.value.trim();
    if (userAnswer.toLowerCase() === card.back.toLowerCase()) {
        typeAnswerFeedback.textContent = "Correct!";
        typeAnswerFeedback.classList.add('correct');
    } else {
        typeAnswerFeedback.textContent = "Incorrect. Try again!";
        typeAnswerFeedback.classList.add('incorrect');
    }
    typeAnswerInput.disabled = true;
    checkTypeAnswerBtn.disabled = true;
    revealTypeAnswerBtn.disabled = true;
    nextTypeCardBtn.disabled = false;
    nextTypeCardBtn.focus();
});

revealTypeAnswerBtn.addEventListener('click', () => {
    typeCardBack.classList.remove('hidden');
    typeAnswerFeedback.textContent = `The answer is: ${currentReviewSessionCards[currentCardIndex].back}`;
    typeAnswerInput.disabled = true;
    checkTypeAnswerBtn.disabled = true;
    revealTypeAnswerBtn.disabled = true;
    nextTypeCardBtn.disabled = false;
    nextTypeCardBtn.focus();
});

nextTypeCardBtn.addEventListener('click', () => {
    if (currentCardIndex < currentReviewSessionCards.length - 1) {
        currentCardIndex++;
        displayTypeAnswerCard();
        typeAnswerInput.focus();
    } else {
        showCustomAlert("Review complete!");
        openFlashcardFolder(currentFlashcardFolder.id);
    }
});

document.getElementById('back-to-folders').addEventListener('click', showFlashcardFoldersView);
document.getElementById('back-from-flipper-review').addEventListener('click', () => {
    if (reviewTimer.timerId) clearInterval(reviewTimer.timerId);
    openFlashcardFolder(currentFlashcardFolder.id)
});
document.getElementById('back-from-type-review').addEventListener('click', () => openFlashcardFolder(currentFlashcardFolder.id));

/**
 * =============================================================================
 * FUNCTION: POMODORO
 * fix: made ui slightly better
 * =============================================================================
 */
function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoro.timeLeft / 60);
    const seconds = pomodoro.timeLeft % 60;
    pomodoroMinutes.textContent = String(minutes).padStart(2, '0');
    pomodoroSeconds.textContent = String(seconds).padStart(2, '0');
    
    
    if (pomodoro.timerId) {
        document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - Working`;
    }
}

function updatePomodoroTasks() {
    pomodoroTaskSelect.innerHTML = '<option value="">-- Select a Task --</option>';
    tasks.filter(t => !t.done).forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = `${task.name} (${task.subject})`;
        pomodoroTaskSelect.appendChild(option);
    });
    pomodoroCurrentTask.textContent = pomodoroTaskSelect.selectedOptions[0]?.text || "No task selected";
}

function startTimer() {
    if (pomodoro.timerId) return;
    pomodoro.isPaused = false;
    startTimerBtn.disabled = true;
    pauseTimerBtn.disabled = false;
    document.querySelector('.pomodoro-timer-screen').classList.add('running'); // UI IMPROVEMENT: For potential CSS animations
    pomodoro.timerId = setInterval(() => {
        pomodoro.timeLeft--;
        updatePomodoroDisplay();
        if (pomodoro.timeLeft <= 0) {
            clearInterval(pomodoro.timerId);
            pomodoro.timerId = null;
            document.title = "Time's up! 🎉";
            showCustomAlert("Pomodoro session finished! Take a short break.", "notification");
            resetTimer();
        }
    }, 1000);
}

function pauseTimer() {
    pomodoro.isPaused = true;
    clearInterval(pomodoro.timerId);
    pomodoro.timerId = null;
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
    document.querySelector('.pomodoro-timer-screen').classList.remove('running');
    document.title = "Paused | schlKatsu";
}

function resetTimer() {
    clearInterval(pomodoro.timerId);
    pomodoro.timerId = null;
    pomodoro.isPaused = true;
    const customMins = parseInt(customMinutesInput.value);
    pomodoro.defaultTime = (customMins > 0 && customMins <= 120) ? customMins * 60 : 25 * 60;
    pomodoro.timeLeft = pomodoro.defaultTime;
    updatePomodoroDisplay();
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
    document.querySelector('.pomodoro-timer-screen').classList.remove('running');
    document.title = "schlkatsu by rei";
}

startTimerBtn.addEventListener('click', startTimer);
pauseTimerBtn.addEventListener('click', pauseTimer);
resetTimerBtn.addEventListener('click', resetTimer);
customMinutesInput.addEventListener('input', resetTimer);
pomodoroTaskSelect.addEventListener('change', (e) => {
    pomodoroCurrentTask.textContent = e.target.selectedOptions[0]?.text || "No task selected";
});

updatePomodoroDisplay();

/**
 * =============================================================================
 * FUNCTION: Modal fixing
 * don't fix YET 
 * =============================================================================
 */
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeAllModals();
    }
});

/**
 * =============================================================================
 * FUNCTION: EVENT LISTENERS
 * dont fix with question mark
 * =============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.querySelector('.left-sidebar');
    sidebar.addEventListener('click', (e) => {
        const tabButton = e.target.closest('.tab-btn');
        if (tabButton && !tabButton.disabled) {
            const tabId = tabButton.dataset.tab;
            switchTab(tabId);
        }
    });

    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay || e.target.closest('.modal-close-btn')) {
            closeAllModals();
        }
    });

    executeShareBtn.addEventListener('click', handleExecuteShare);

    const createNotebookBtn = document.getElementById('create-notebook-btn');
    const notebookTypeModal = document.getElementById('notebook-type-modal');
    const createTextNotebookBtn = document.getElementById('create-text-notebook-btn');
    
    createNotebookBtn.addEventListener('click', () => {
        closeAllModals();
        modalOverlay.classList.remove('hidden');
        modalOverlay.appendChild(notebookTypeModal);
        notebookTypeModal.classList.remove('hidden');
    });

    createTextNotebookBtn.addEventListener('click', () => {
        closeAllModals();
        createNewNotebook('text');
    });
    
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const pfpUrlInput = document.getElementById('pfp-url-input');
    const themeToggleSwitch = document.getElementById('theme-toggle');
    const resetThemeBtn = document.getElementById('reset-theme-btn');

    saveSettingsBtn.addEventListener('click', async () => {
        const newTheme = themeToggleSwitch.checked ? 'dark' : 'light';
      
        theme = newTheme; 

        
        if (!themeColors) themeColors = {}; 
        themeColors[theme] = themeColors[theme] || {}; 
        settingsModal.querySelectorAll('input[type="color"]').forEach(picker => {
            themeColors[theme][picker.dataset.var] = picker.value;
        });
        
        applyTheme(newTheme);

        const newPfpUrl = pfpUrlInput.value.trim();
        if (newPfpUrl && currentUser !== 'guest') {
            try {
                // url validation 
                new URL(newPfpUrl);
                await AuthService.updateUserPfp(currentUser, newPfpUrl);
                profilePic.src = newPfpUrl;
            } catch (_) {
                showCustomAlert("The provided PFP URL is not valid.", "alert");
                return;
            }
        }

        saveAllData({ skipRender: true });
        showCustomAlert('Settings saved!', 'notification');
        closeAllModals();
    });
    
    themeToggleSwitch.addEventListener('change', (e) => {
        // theme changing 
        applyTheme(e.target.checked ? 'dark' : 'light');
    });

    resetThemeBtn.addEventListener('click', () => {
        if(themeColors) themeColors[theme] = {};
        applyCustomColors(); // applies the css styles normally 
        showCustomAlert(`Colors for ${theme} mode have been reset.`, 'notification');
    });
});