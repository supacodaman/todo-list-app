document.addEventListener('DOMContentLoaded', () => {
    const taskTableContainer = document.querySelector('.task-table-container');
    const priorityListContainer = document.querySelector('.priority-list-container');
    const taskTable = document.getElementById('task-table').getElementsByTagName('tbody')[0];
    const priorityList = document.getElementById('priority-list');
    const addTaskButton = document.getElementById('add-task-btn');
    const settingsToggleBtn = document.querySelector('.settings-toggle');
    const settingsPopup = document.getElementById('settings-popup');
    const closeSettingsBtn = document.querySelector('.close-settings');
    const toggleDoneBtn = document.querySelector('.toggle-done');
    const priorityFilterBtn = document.querySelector('.priority-filter');
    const fontSelect = document.getElementById('font-select');
    const dateCreatedToggle = document.getElementById('toggle-date-created');
    const actionsToggle = document.getElementById('toggle-actions');
    const listTitle = document.getElementById('list-title');
    let themeIndex = 0;
    const themes = ['', 'theme-light-brown', 'theme-dark-navy'];
    let toggleDoneState = 0;
    let priorityFilterState = false;

    let tasks = loadTasksFromStorage();
    let savedSettings = loadUserSettings();

    if (savedSettings.themeIndex !== undefined) {
        themeIndex = savedSettings.themeIndex;
        document.body.className = themes[themeIndex] + ' ' + (savedSettings.fontClass || 'font-arial');
        fontSelect.value = savedSettings.fontClass || 'font-arial';
        toggleColumnVisibility('date-created', savedSettings.showDateCreated !== false);
        toggleColumnVisibility('action-column', savedSettings.showActions !== false);
        dateCreatedToggle.checked = savedSettings.showDateCreated !== false;
        actionsToggle.checked = savedSettings.showActions !== false;
        listTitle.value = savedSettings.listTitle || 'To-Do List';
    }

    settingsToggleBtn.addEventListener('click', () => {
        settingsPopup.style.display = 'block';
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsPopup.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == settingsPopup) {
            settingsPopup.style.display = 'none';
        }
    });

    fontSelect.addEventListener('change', () => {
        document.body.className = fontSelect.value + ' ' + themes[themeIndex];
        saveUserSettings();
    });

    dateCreatedToggle.addEventListener('change', () => {
        toggleColumnVisibility('date-created', dateCreatedToggle.checked);
        saveUserSettings();
    });

    actionsToggle.addEventListener('change', () => {
        toggleColumnVisibility('action-column', actionsToggle.checked);
        saveUserSettings();
    });

    const themeToggleBtn = document.querySelector('.theme-toggle');
    themeToggleBtn.addEventListener('click', () => {
        themeIndex = (themeIndex + 1) % themes.length;
        document.body.className = themes[themeIndex] + ' ' + fontSelect.value;
        saveUserSettings();
        renderTasks();
    });

    toggleDoneBtn.addEventListener('click', () => {
        toggleDoneState = (toggleDoneState + 1) % 3;
        updateDoneButtonState();
        renderTasks();
    });

    priorityFilterBtn.addEventListener('click', () => {
        priorityFilterState = !priorityFilterState;
        updatePriorityFilterState();
    });

    listTitle.addEventListener('input', () => {
        saveUserSettings();
    });

    function updateDoneButtonState() {
        if (toggleDoneState === 0) {
            toggleDoneBtn.classList.remove('button-done-toggled', 'button-toggled');
        } else if (toggleDoneState === 1) {
            toggleDoneBtn.classList.add('button-toggled');
            toggleDoneBtn.classList.remove('button-done-toggled');
        } else if (toggleDoneState === 2) {
            toggleDoneBtn.classList.add('button-done-toggled');
            toggleDoneBtn.classList.remove('button-toggled');
        }
    }

    function updatePriorityFilterState() {
        if (priorityFilterState) {
            taskTableContainer.style.display = 'none';
            addTaskButton.style.display = 'none';
            priorityListContainer.style.display = 'block';
        } else {
            taskTableContainer.style.display = 'block';
            addTaskButton.style.display = 'flex';
            priorityListContainer.style.display = 'block';
        }
        renderTasks();
    }

    function saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (e) {
            console.error('Could not save tasks', e);
        }
    }

    function saveUserSettings() {
        const userSettings = {
            themeIndex: themeIndex,
            fontClass: fontSelect.value,
            showDateCreated: dateCreatedToggle.checked,
            showActions: actionsToggle.checked,
            listTitle: listTitle.value,
        };
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
    }

    function toggleColumnVisibility(columnClass, show) {
        const elements = document.querySelectorAll(`.${columnClass}`);
        elements.forEach(el => {
            el.style.display = show ? '' : 'none';
        });

        adjustColumnWidths();
    }

    function adjustColumnWidths() {
        const taskColumn = document.querySelector('.task-column');
        const statusColumn = document.querySelector('.status-column');
        const dateCreatedVisible = dateCreatedToggle.checked;
        const actionsVisible = actionsToggle.checked;

        taskColumn.style.width = dateCreatedVisible ? (actionsVisible ? '50%' : '65%') : (actionsVisible ? '60%' : '80%');
        statusColumn.style.width = dateCreatedVisible || actionsVisible ? '25%' : '30%';
    }

    function getStatusColor(status) {
        switch (status) {
            case 'Not started':
                return 'status-not-started';
            case 'Working on':
                return 'status-working-on';
            case 'Done':
                return 'status-done';
            default:
                return 'status-not-started';
        }
    }

    function addTask(taskText = '') {
        const today = new Date().toISOString().split('T')[0];
        const task = { id: Date.now().toString(), text: taskText, dateCreated: today, status: 'Not started', priority: false };
        tasks.push(task);
        saveTasks();
        renderTasks();
        focusNewTask(task.id);
    }

    function renderTasks() {
        taskTable.innerHTML = '';
        const isMobile = window.innerWidth <= 600;

        tasks.forEach((task) => {
            if (toggleDoneState === 1 && task.status === 'Done') {
                return;
            }
            if (toggleDoneState === 2 && task.status !== 'Done') {
                return;
            }
            if (priorityFilterState && !task.priority) {
                return;
            }

            const row = taskTable.insertRow();
            row.setAttribute('data-id', task.id);
            row.classList.add('task-row');

            let dateCreatedContent = task.dateCreated;
            if (isMobile) {
                const date = new Date(task.dateCreated);
                dateCreatedContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '-');
            } else {
                dateCreatedContent = task.dateCreated; // YYYY-MM-DD for desktop mode
            }

            row.innerHTML = `
                <td class="task-column">
                    <input type="text" class="task-text-input ${task.text ? '' : 'placeholder'}" value="${task.text}" placeholder="New Task">
                </td>
                <td class="date-created date-created-column" style="text-align: center; ${dateCreatedToggle.checked ? '' : 'display: none;'}">
                    <input type="text" class="date-created-input" value="${dateCreatedContent}" maxlength="10">
                </td>
                <td class="status-column" style="text-align: center;">
                    <div class="status-box ${getStatusColor(task.status)}" data-id="${task.id}" role="status" aria-live="polite">${isMobile ? '' : task.status}</div>
                </td>
                <td class="action-column" style="text-align: center; ${actionsToggle.checked ? '' : 'display: none;'}">
                    <div class="action-wrapper">
                        <span class="priority-btn ${task.priority ? 'active' : ''}" data-id="${task.id}" ${task.status === 'Done' ? 'disabled' : ''}>🔥</span>
                        <span class="delete-btn" data-id="${task.id}">🗑️</span>
                    </div>
                </td>
            `;

            if (isMobile) {
                setupSwipeGestures(row);
            }

            attachEventListeners(row, task.id);
        });

        renderPriorityTasks();
        adjustColumnWidths();
    }

    function setupSwipeGestures(row) {
        let touchStartX = 0;
        let touchEndX = 0;

        row.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        row.addEventListener('touchmove', (e) => {
            touchEndX = e.changedTouches[0].screenX;
        });

        row.addEventListener('touchend', () => {
            handleSwipeGesture(row, touchStartX, touchEndX);
        });
    }

    function handleSwipeGesture(row, startX, endX) {
        const swipeDistance = startX - endX;

        if (swipeDistance > 50) {
            row.querySelector('.swipe-buttons').style.transform = 'translateX(-100%)';
        } else if (swipeDistance < -50) {
            row.querySelector('.swipe-buttons').style.transform = 'translateX(0)';
        }
    }

    function renderPriorityTasks() {
        priorityList.innerHTML = '';

        const priorityTasks = tasks.filter(task => task.priority && task.status !== 'Done');

        if (priorityTasks.length === 0) {
            priorityList.innerHTML = '<li class="no-priority-tasks">No priority tasks</li>';
        } else {
            priorityTasks.forEach((task) => {
                const listItem = document.createElement('li');
                listItem.setAttribute('data-id', task.id);
                listItem.style.display = 'flex';
                listItem.style.justifyContent = 'space-between';
                listItem.style.alignItems = 'center';
                listItem.innerHTML = `
                    <span>${task.text}</span>
                    <span class="priority-controls">
                        <button class="remove-priority-btn" data-id="${task.id}" aria-label="Remove priority">✂️</button>
                    </span>
                `;
                priorityList.appendChild(listItem);
            });
        }
    }

    function focusNewTask(taskId) {
        const newTaskInput = taskTable.querySelector(`tr[data-id="${taskId}"] .task-text-input`);
        newTaskInput.focus();
    }

    function attachEventListeners(row, taskId) {
        row.querySelector('.task-text-input').addEventListener('input', debounce((e) => {
            const task = tasks.find(t => t.id === taskId);
            task.text = e.target.value.trim();
            saveTasks();
            renderPriorityTasks();
        }, 300));

        row.querySelector('.date-created-input').addEventListener('input', (e) => {
            const task = tasks.find(t => t.id === taskId);
            const inputDate = e.target.value.trim();
            if (isValidDate(inputDate)) {
                task.dateCreated = formatDateForStorage(inputDate);
            } else {
                task.dateCreated = new Date().toISOString().split('T')[0]; // Replace with today's date
            }
            saveTasks();
            renderTasks();
        });

        row.querySelector('.status-box').addEventListener('click', () => {
            const task = tasks.find(t => t.id === taskId);
            task.status = cycleStatus(task.status);
            if (task.status === 'Done') {
                task.priority = false;
            }
            saveTasks();
            renderTasks();
        });

        if (row.querySelector('.priority-btn')) {
            row.querySelector('.priority-btn').addEventListener('click', () => {
                const task = tasks.find(t => t.id === taskId);
                if (task.status !== 'Done') {
                    task.priority = !task.priority;
                    saveTasks();
                    renderTasks();
                }
            });
        }

        if (row.querySelector('.delete-btn')) {
            row.querySelector('.delete-btn').addEventListener('click', () => {
                tasks = tasks.filter(t => t.id !== taskId);
                saveTasks();
                renderTasks();
            });
        }
    }

    function cycleStatus(status) {
        switch (status) {
            case 'Not started':
                return 'Working on';
            case 'Working on':
                return 'Done';
            case 'Done':
                return 'Not started';
            default:
                return 'Not started';
        }
    }

    function isValidDate(date) {
        return !isNaN(Date.parse(date));
    }

    function formatDateForDisplay(date) {
        const [year, month, day] = date.split('-');
        return `${monthToShortName(month)}-${day}`;
    }

    function formatDateForStorage(displayDate) {
        const [month, day] = displayDate.split('-');
        return `${new Date().getFullYear()}-${shortNameToMonth(month)}-${day.padStart(2, '0')}`;
    }

    function monthToShortName(month) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return monthNames[parseInt(month) - 1];
    }

    function shortNameToMonth(shortName) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return (monthNames.indexOf(shortName) + 1).toString().padStart(2, '0');
    }

    function loadTasksFromStorage() {
        try {
            return JSON.parse(localStorage.getItem('tasks')) || [];
        } catch (e) {
            console.error('Could not load tasks from storage', e);
            return [];
        }
    }

    function loadUserSettings() {
        try {
            return JSON.parse(localStorage.getItem('userSettings')) || {};
        } catch (e) {
            console.error('Could not load user settings', e);
            return {};
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    addTaskButton.addEventListener('click', () => {
        addTask();
    });

    updatePriorityFilterState();
    renderTasks();
});
