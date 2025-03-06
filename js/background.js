// Background service worker for Focus Buddy

// Handle website blocking
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.storage.sync.get(['blockedSites', 'blockSchedule'], async (data) => {
            const currentTime = new Date();
            const currentHour = currentTime.getHours();
            
            // Check if blocking is scheduled for current time
            const isBlockingTime = data.blockSchedule?.some(schedule => 
                currentHour >= schedule.startHour && 
                currentHour < schedule.endHour && 
                schedule.days.includes(currentTime.getDay())
            ) ?? false;

            if (isBlockingTime && data.blockedSites) {
                const url = changeInfo.url.toLowerCase();
                const isBlocked = data.blockedSites.some(site => {
                    switch (site.blockType) {
                        case 'exact':
                            return url === site.url.toLowerCase();
                        case 'contains':
                            return url.includes(site.url.toLowerCase());
                        case 'pattern':
                            return new RegExp(site.url.replace('*', '.*')).test(url);
                        default:
                            return false;
                    }
                });

                if (isBlocked) {
                    // Redirect to blocked page
                    chrome.tabs.update(tabId, {
                        url: chrome.runtime.getURL('blocked.html')
                    });
                    
                    // Update block statistics
                    updateBlockStats();
                }
            }
        });
    }
});

// Handle focus session tracking
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_SESSION') {
        trackFocusSession(message.duration);
    } else if (message.type === 'END_SESSION') {
        completeFocusSession();
    }
});

// Track focus sessions
async function trackFocusSession(duration) {
    const session = {
        startTime: new Date().toISOString(),
        duration: duration,
        completed: false
    };

    const { focusSessions = [] } = await chrome.storage.sync.get('focusSessions');
    focusSessions.push(session);
    await chrome.storage.sync.set({ focusSessions });
}

async function completeFocusSession() {
    const { focusSessions = [] } = await chrome.storage.sync.get('focusSessions');
    if (focusSessions.length > 0) {
        const lastSession = focusSessions[focusSessions.length - 1];
        lastSession.completed = true;
        lastSession.endTime = new Date().toISOString();
        await chrome.storage.sync.set({ focusSessions });
        updateProductivityStats();
    }
}

// Update block statistics
async function updateBlockStats() {
    const date = new Date().toISOString().split('T')[0];
    const { blockStats = {} } = await chrome.storage.sync.get('blockStats');
    
    if (!blockStats[date]) {
        blockStats[date] = { count: 0, totalTime: 0 };
    }
    
    blockStats[date].count++;
    blockStats[date].totalTime = Math.floor((new Date() - new Date(date)) / 1000 / 60);
    
    await chrome.storage.sync.set({ blockStats });
}

// Update productivity statistics
async function updateProductivityStats() {
    const { focusSessions = [] } = await chrome.storage.sync.get('focusSessions');
    const date = new Date().toISOString().split('T')[0];
    
    const dailyStats = focusSessions
        .filter(session => session.startTime.includes(date))
        .reduce((stats, session) => {
            stats.totalSessions++;
            stats.totalMinutes += session.duration;
            if (session.completed) stats.completedSessions++;
            return stats;
        }, { totalSessions: 0, completedSessions: 0, totalMinutes: 0 });
    
    const { productivityStats = {} } = await chrome.storage.sync.get('productivityStats');
    productivityStats[date] = dailyStats;
    
    await chrome.storage.sync.set({ productivityStats });
}

// Handle alarms for scheduled blocking
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkBlockSchedule') {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                // Trigger URL check for each tab
                chrome.tabs.update(tab.id, { url: tab.url });
            });
        });
    }
});

// Set up periodic check for scheduled blocking
chrome.alarms.create('checkBlockSchedule', {
    periodInMinutes: 1
});
