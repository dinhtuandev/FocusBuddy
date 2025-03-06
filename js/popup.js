// State management
let state = {
    isRunning: false,
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    tasks: [],
    blockedSites: [],
    isBlocking: false,
    stats: {
        focusTime: 0,
        completedSessions: 0,
        completedTasks: 0,
        successRate: 0
    }
};

// DOM Elements
const elements = {
    timer: {
        display: document.querySelector('.timer-display'),
        startBtn: document.getElementById('startTimer'),
        pauseBtn: document.getElementById('pauseTimer'),
        resetBtn: document.getElementById('resetTimer'),
        progress: document.querySelector('.progress-bar-fill')
    },
    tasks: {
        input: document.getElementById('taskInput'),
        addBtn: document.getElementById('addTaskBtn'),
        list: document.getElementById('taskList')
    },
    blocking: {
        input: document.querySelector('.website-input'),
        typeSelect: document.getElementById('blockType'),
        list: document.querySelector('.blocked-sites-list'),
        toggleBtn: document.getElementById('toggleBlocking')
    },
    stats: {
        focusTime: document.getElementById('totalFocusTime'),
        completedSessions: document.getElementById('completedSessions'),
        completedTasks: document.getElementById('completedTasks'),
        successRate: document.getElementById('successRate')
    },
    tabs: {
        buttons: document.querySelectorAll('.tab-btn'),
        contents: document.querySelectorAll('.tab-content')
    }
};

// Timer functionality
let timerInterval;

function updateTimerDisplay() {
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    elements.timer.display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const progress = ((state.totalTime - state.timeLeft) / state.totalTime) * 100;
    elements.timer.progress.style.width = `${progress}%`;
}

function startTimer() {
    if (!state.isRunning) {
        state.isRunning = true;
        elements.timer.startBtn.disabled = true;
        elements.timer.pauseBtn.disabled = false;
        
        timerInterval = setInterval(() => {
            if (state.timeLeft > 0) {
                state.timeLeft--;
                updateTimerDisplay();
            } else {
                completeSession();
            }
        }, 1000);
    }
}

function pauseTimer() {
    if (state.isRunning) {
        state.isRunning = false;
        elements.timer.startBtn.disabled = false;
        elements.timer.pauseBtn.disabled = true;
        clearInterval(timerInterval);
    }
}

function resetTimer() {
    state.isRunning = false;
    state.timeLeft = state.totalTime;
    elements.timer.startBtn.disabled = false;
    elements.timer.pauseBtn.disabled = true;
    clearInterval(timerInterval);
    updateTimerDisplay();
}

function completeSession() {
    clearInterval(timerInterval);
    state.isRunning = false;
    state.stats.completedSessions++;
    state.stats.focusTime += state.totalTime / 60;
    updateStats();
    resetTimer();
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'Focus Session Complete!',
        message: 'Great job! Take a break.'
    });
}

// Task functionality
function addTask() {
    console.log('Adding task...'); // Debug log
    const taskText = elements.tasks.input.value.trim();
    
    if (taskText) {
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false
        };
        
        state.tasks.push(task);
        renderTask(task);
        elements.tasks.input.value = '';
        saveTasks();
    }
}

function renderTask(task) {
    console.log('Rendering task:', task); // Debug log
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;
    
    li.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span>${task.text}</span>
        <button class="btn btn-danger">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    const checkbox = li.querySelector('input[type="checkbox"]');
    const deleteBtn = li.querySelector('.btn-danger');
    
    checkbox.addEventListener('change', () => toggleTask(task.id));
    deleteBtn.addEventListener('click', () => removeTask(task.id));
    
    elements.tasks.list.appendChild(li);
}

function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            state.stats.completedTasks++;
            updateStats();
        }
        saveTasks();
        
        // Update UI
        const taskElement = elements.tasks.list.querySelector(`[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.toggle('completed', task.completed);
            taskElement.querySelector('input[type="checkbox"]').checked = task.completed;
        }
    }
}

function removeTask(taskId) {
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    const taskElement = elements.tasks.list.querySelector(`[data-id="${taskId}"]`);
    if (taskElement) {
        taskElement.remove();
    }
    saveTasks();
}

// Website blocking functionality
function addBlockedWebsite() {
    const url = elements.blocking.input.value.trim();
    const blockType = elements.blocking.typeSelect.value;
    
    if (url && !state.blockedSites.some(site => site.url === url)) {
        const site = {
            id: Date.now(),
            url: url,
            blockType: blockType
        };
        
        state.blockedSites.push(site);
        renderBlockedSite(site);
        elements.blocking.input.value = '';
        saveBlockedSites();
    }
}

function renderBlockedSite(site) {
    const li = document.createElement('li');
    li.className = 'blocked-site-item';
    li.dataset.id = site.id;
    
    li.innerHTML = `
        <div class="site-info">
            <span class="site-url">${site.url}</span>
            <span class="block-type">${site.blockType}</span>
        </div>
        <button class="btn btn-danger">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    li.querySelector('button').addEventListener('click', () => removeBlockedSite(site.id));
    elements.blocking.list.appendChild(li);
}

function removeBlockedSite(siteId) {
    state.blockedSites = state.blockedSites.filter(s => s.id !== siteId);
    const siteElement = elements.blocking.list.querySelector(`[data-id="${siteId}"]`);
    if (siteElement) {
        siteElement.remove();
    }
    saveBlockedSites();
}

function toggleBlocking() {
    state.isBlocking = !state.isBlocking;
    elements.blocking.toggleBtn.innerHTML = state.isBlocking ? 
        '<i class="fas fa-shield-alt"></i> Stop Blocking' :
        '<i class="fas fa-shield-alt"></i> Start Blocking';
    elements.blocking.toggleBtn.classList.toggle('btn-danger');
    elements.blocking.toggleBtn.classList.toggle('btn-success');
    
    chrome.storage.sync.set({ isBlocking: state.isBlocking });
}

// Stats functionality
function updateStats() {
    elements.stats.focusTime.textContent = Math.round(state.stats.focusTime / 60);
    elements.stats.completedSessions.textContent = state.stats.completedSessions;
    elements.stats.completedTasks.textContent = state.stats.completedTasks;
    
    const totalSessions = state.stats.completedSessions + (state.stats.focusTime > 0 ? 1 : 0);
    state.stats.successRate = totalSessions > 0 ? 
        Math.round((state.stats.completedSessions / totalSessions) * 100) : 0;
    
    elements.stats.successRate.textContent = `${state.stats.successRate}%`;
    saveStats();
}

// Tab functionality
function switchTab(tabId) {
    elements.tabs.buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    elements.tabs.contents.forEach(content => {
        content.style.display = content.id === tabId ? 'block' : 'none';
    });
}

// Storage functionality
function saveTasks() {
    chrome.storage.sync.set({ tasks: state.tasks }, () => {
        console.log('Tasks saved:', state.tasks); // Debug log
    });
}

function saveBlockedSites() {
    chrome.storage.sync.set({ blockedSites: state.blockedSites });
}

function saveStats() {
    chrome.storage.sync.set({ stats: state.stats });
}

// Load saved data
function loadSavedData() {
    chrome.storage.sync.get(['tasks', 'blockedSites', 'stats', 'isBlocking'], (data) => {
        console.log('Loaded data:', data); // Debug log
        
        if (data.tasks) {
            state.tasks = data.tasks;
            state.tasks.forEach(task => renderTask(task));
        }
        
        if (data.blockedSites) {
            state.blockedSites = data.blockedSites;
            state.blockedSites.forEach(site => renderBlockedSite(site));
        }
        
        if (data.stats) {
            state.stats = data.stats;
            updateStats();
        }
        
        if (data.isBlocking !== undefined) {
            state.isBlocking = data.isBlocking;
            if (state.isBlocking) {
                elements.blocking.toggleBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Stop Blocking';
                elements.blocking.toggleBtn.classList.add('btn-success');
                elements.blocking.toggleBtn.classList.remove('btn-danger');
            }
        }
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded'); // Debug log
    
    // Timer controls
    elements.timer.startBtn.addEventListener('click', startTimer);
    elements.timer.pauseBtn.addEventListener('click', pauseTimer);
    elements.timer.resetBtn.addEventListener('click', resetTimer);
    
    // Task controls
    if (elements.tasks.addBtn) {
        console.log('Add task button found'); // Debug log
        elements.tasks.addBtn.addEventListener('click', () => {
            console.log('Add task button clicked'); // Debug log
            addTask();
        });
    } else {
        console.error('Add task button not found'); // Debug log
    }
    
    if (elements.tasks.input) {
        elements.tasks.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter pressed in task input'); // Debug log
                addTask();
            }
        });
    } else {
        console.error('Task input not found'); // Debug log
    }
    
    // Blocking controls
    elements.blocking.toggleBtn.addEventListener('click', toggleBlocking);
    elements.blocking.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addBlockedWebsite();
    });
    
    // Tab navigation
    elements.tabs.buttons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Initialize
    updateTimerDisplay();
    loadSavedData();
});
