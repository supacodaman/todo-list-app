document.addEventListener('DOMContentLoaded', () => {
    const taskTable = document.getElementById('task-table').getElementsByTagName('tbody')[0];
    const priorityList = document.getElementById('priority-list');
    const addTaskButton = document.getElementById('add-task-btn');
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const toggleDoneBtn = document.querySelector('.toggle-done');
    const priorityFilterBtn = document.querySelector('.priority-filter');
    let typingTimeout;
    let themeIndex = 0;
    const themes = ['', 'theme-light-brown', 'theme-dark-navy'];
    let toggleDoneState = 0;

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    themeToggleBtn.addEventListener('click', () => {
        themeIndex = (themeIndex + 1) % themes.length;
        document.body.className = themes[themeIndex];
    });

    toggleDoneBtn.addEventListener('click', () => {
        toggleDoneState = (toggleDoneState + 1) % 3;
        updateDoneButtonState();
        renderTasks();
    });

    function updateDoneButtonState() {
        if (toggleDoneState === 0) {
            toggleDoneBtn.classList.add('button-toggled');
            toggleDoneBtn.classList.remove('button-done-toggled');
        } else if (toggleDoneState === 1) {
            toggleDoneBtn.classList.remove('button-toggled');
            toggleDoneBtn.classList.add('button-done-toggled');
        } else {
            toggleDoneBtn.classList.remove('button-toggled', 'button-done-toggled');
        }
    }

    function saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (e) {
            console.error('Could not save tasks', e);
        }
    }

    function getStatusColor(status) {
        const currentTheme = document.body.className;
        if (currentTheme === 'theme-dark-navy') {
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
        // Automatically focus and select the new task text input
        const newTaskInput = taskTable.querySelector(`tr[data-id="${task.id}"] .task-text-input`);
        newTaskInput.focus();
    }

    function renderTasks() {
        tasks.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));

        taskTable.innerHTML = '';
        tasks.forEach((task, index) => {
            if (toggleDoneState === 2 && task.status === 'Done') {
                return;
            }
            if (toggleDoneState === 1 && task.status !== 'Done') {
                return;
            }
            const row = taskTable.insertRow();
            row.setAttribute('data-id', task.id);
            row.innerHTML = `
                <td>
                    <input type="text" class="task-text-input ${task.text ? '' : 'placeholder'}" value="${task.text}" placeholder="New Task">
                </td>
                <td contenteditable="true" class="date-created">${task.dateCreated}</td>
                <td>
                    <div class="status-box" data-index="${index}" style="background-color: ${getStatusColor(task.status)}" role="status" aria-live="polite">${task.status}</div>
                </td>
                <td class="action-column">
                    <button class="priority-btn ${task.priority ? 'active' : ''}" data-index="${index}" ${task.status === 'Done' ? 'disabled' : ''}>🔥</button>
                    <button class="delete-btn" data-index="${index}">🗑️</button>
                </td>
            `;

            // Attach event listeners for placeholder behavior
            const taskTextInput = row.querySelector('.task-text-input');
            taskTextInput.addEventListener('focus', handleFocus);
            taskTextInput.addEventListener('blur', handleBlur);
        });

        renderPriorityTasks();
    }

    function renderPriorityTasks() {
        priorityList.innerHTML = '';
        const priorityTasks = tasks.filter(task => task.priority && task.status !== 'Done');

        priorityTasks.forEach(task => {
            const listItem = document.createElement('li');
            listItem.setAttribute('draggable', true);
            listItem.setAttribute('data-id', task.id);
            listItem.innerHTML = `
                ${task.text}
                <span class="priority-controls">
                    <button class="drag-btn" data-id="${task.id}" aria-label="Drag to reorder">↕️</button>
                    <button class="remove-priority-btn" data-id="${task.id}" aria-label="Remove priority">✂️</button>
                </span>
            `;
            priorityList.appendChild(listItem);
        });

        addDragAndDropHandlers(priorityList, 'li', true);
    }

    function addDragAndDropHandlers(container, childSelector, isVerticalOnly) {
        const listItems = container.querySelectorAll(childSelector);

        listItems.forEach(item => {
            const dragHandle = item.querySelector('.drag-btn');
            dragHandle.addEventListener('mousedown', (e) => {
                item.setAttribute('draggable', 'true');
            });
            dragHandle.addEventListener('mouseup', (e) => {
                item.removeAttribute('draggable');
            });

            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', e => handleDragOver(e, isVerticalOnly));
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });
    }

    function handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e, isVerticalOnly) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
        const draggingItem = document.querySelector('.dragging');
        
        if (afterElement == null) {
            e.currentTarget.appendChild(draggingItem);
        } else {
            e.currentTarget.insertBefore(draggingItem, afterElement);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const droppedItemId = e.dataTransfer.getData('text/plain');
        const isPriorityList = e.currentTarget.id === 'priority-list';

        const draggedIndex = tasks.findIndex(task => task.id === droppedItemId);
        const droppedIndex = [...e.currentTarget.children].indexOf(draggingItem);

        if (isPriorityList) {
            const priorityTasks = tasks.filter(task => task.priority && task.status !== 'Done');
            priorityTasks.splice(droppedIndex, 0, priorityTasks.splice(draggedIndex, 1)[0]);
            priorityTasks.forEach((task, i) => {
                tasks[tasks.findIndex(t => t.id === task.id)].priorityOrder = i;
            });
        }

        saveTasks();
        renderTasks();
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(':scope > *:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
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

    renderTasks();
});

function handleFocus(e) {
    if (e.target.value === '') {
        e.target.classList.remove('placeholder');
    }
}

function handleBlur(e) {
    if (!e.target.value.trim()) {
        e.target.value = '';
        e.target.classList.add('placeholder');
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
