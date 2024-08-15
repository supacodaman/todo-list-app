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
    let themeIndex = 0;
    const themes = ['', 'theme-light-brown', 'theme-dark-navy'];
    let toggleDoneState = 0; // 0: Show all tasks, 1: Hide done tasks, 2: Show only done tasks
    let priorityFilterState = false; // False: Show both lists, True: Show only priority list

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};

    // Load saved settings
    if (savedSettings.themeIndex !== undefined) {
        themeIndex = savedSettings.themeIndex;
        document.body.className = themes[themeIndex] + ' ' + (savedSettings.fontClass || 'font-arial');
        fontSelect.value = savedSettings.fontClass || 'font-arial';
        toggleColumnVisibility('date-created', savedSettings.showDateCreated !== false);
        toggleColumnVisibility('action-column', savedSettings.showActions !== false);
        dateCreatedToggle.checked = savedSettings.showDateCreated !== false;
        actionsToggle.checked = savedSettings.showActions !== false;
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
        renderTasks(); // Re-render tasks to apply the correct status colors
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
            priorityListContainer.style.display = 'block'; // Ensure the priority list is visible
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
        const currentTheme = document.body.className;
        if (currentTheme.includes('theme-dark-navy')) {
            switch (status) {
                case 'Not started':
                    return '#cc6666'; // Muted red
                case 'Working on':
                    return '#ffcc66'; // Muted yellow
                case 'Done':
                    return '#669966'; // Muted green
                default:
                    return '#cc6666'; // Default muted red
            }
        } else {
            switch (status) {
                case 'Not started':
                    return '#F4655A';
                case 'Working on':
                    return '#FFDC6D';
                case 'Done':
                    return '#92D050';
                default:
                    return '#F4655A';
            }
        }
    }

    function addTask(taskText = '') {
        const today = new Date().toISOString().split('T')[0];
        const task = { id: Date.now().toString(), text: taskText, dateCreated: today, status: 'Not started', priority: false };
        tasks.push(task);
        saveTasks();
        renderTasks();
        const newTaskInput = taskTable.querySelector(`tr[data-id="${task.id}"] .task-text-input`);
        newTaskInput.focus();
    }

    function renderTasks() {
        taskTable.innerHTML = '';
        const isMobile = window.innerWidth <= 600;

        tasks.forEach((task, index) => {
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

            let dateCreatedContent = task.dateCreated;
            if (isMobile) {
                const date = new Date(task.dateCreated);
                dateCreatedContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            const dateCreatedColumn = `<td class="date-created date-created-column" style="text-align: center; ${dateCreatedToggle.checked ? '' : 'display: none;'}">${dateCreatedContent}</td>`;

            const actionContent = isMobile ? `
                <div class="swipe-buttons">
                    <button class="action-btn prioritize-btn" data-index="${index}">⭐</button>
                    <button class="action-btn delete-btn" data-index="${index}">🗑️</button>
                </div>
            ` : `
                <td class="action-column" style="text-align: center; ${actionsToggle.checked ? '' : 'display: none;'}">
                    <div class="action-wrapper">
                        <button class="priority-btn ${task.priority ? 'active' : ''}" data-index="${index}" ${task.status === 'Done' ? 'disabled' : ''}>🔥</button>
                        <button class="delete-btn" data-index="${index}">🗑️</button>
                    </div>
                </td>
            `;

            row.innerHTML = `
                <td class="task-column">
                    <input type="text" class="task-text-input ${task.text ? '' : 'placeholder'}" value="${task.text}" placeholder="New Task">
                    ${actionContent}
                </td>
                ${dateCreatedColumn}
                <td class="status-column" style="text-align: center;">
                    <div class="status-box" data-index="${index}" style="background-color: ${getStatusColor(task.status)}" role="status" aria-live="polite"></div>
                </td>
            `;

            if (isMobile) {
                setupSwipeGestures(row);
            }

            const taskTextInput = row.querySelector('.task-text-input');
            taskTextInput.addEventListener('focus', handleFocus);
            taskTextInput.addEventListener('blur', handleBlur);
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
            // User swiped left to reveal delete button
            row.querySelector('.swipe-buttons').style.transform = 'translateX(-100%)';
        } else if (swipeDistance < -50) {
            // User swiped right to reveal prioritize button
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

    addTaskButton.addEventListener('click', () => {
        addTask();
    });

    taskTable.addEventListener('input', debounce((e) => {
        const index = e.target.closest('tr').rowIndex - 1;
        if (e.target.classList.contains('task-text-input')) {
            tasks[index].text = e.target.value.trim();
            if (!tasks[index].text) {
                e.target.classList.add('placeholder');
            } else {
                e.target.classList.remove('placeholder');
            }
            saveTasks();
            renderPriorityTasks();
        } else if (e.target.classList.contains('date-created')) {
            tasks[index].dateCreated = e.target.textContent.trim();
            saveTasks();
            renderTasks();
        }
    }, 300));

    taskTable.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        if (e.target.classList.contains('delete-btn')) {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        } else if (e.target.classList.contains('status-box')) {
            const task = tasks[index];
            const currentStatus = task.status;
            let newStatus;
            switch (currentStatus) {
                case 'Not started':
                    newStatus = 'Working on';
                    break;
                case 'Working on':
                    newStatus = 'Done';
                    break;
                case 'Done':
                    newStatus = 'Not started';
                    break;
                default:
                    newStatus = 'Not started';
                    break;
            }
            task.status = newStatus;
            if (newStatus === 'Done') {
                task.priority = false;
            }
            saveTasks();
            renderTasks();
        } else if (e.target.classList.contains('priority-btn')) {
            const task = tasks[index];
            if (task.status !== 'Done') {
                task.priority = !task.priority;
                saveTasks();
                renderTasks();
            }
        }
    });

    priorityList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-priority-btn')) {
            const taskId = e.target.getAttribute('data-id');
            const task = tasks.find(task => task.id === taskId);
            if (task) {
                task.priority = false;
                saveTasks();
                renderTasks();
            }
        }
    });

    updatePriorityFilterState();
    renderTasks();
});

function handleFocus(e) {
    if (e.target.value === '') {
        e.target.classList.remove('placeholder');
    }
}

function handleBlur(e) {
    if (!e.target.value.trim()) {
e.target.value = ‘’;
e.target.classList.add(‘placeholder’);
}
}

function debounce(func, wait) {
let timeout;
return function(…args) {
const later = () => {
clearTimeout(timeout);
func(…args);
};
clearTimeout(timeout);
timeout = setTimeout(later, wait);
};
}