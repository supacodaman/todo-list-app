document.addEventListener('DOMContentLoaded', () => {
    const taskTable = document.getElementById('task-table').getElementsByTagName('tbody')[0];
    const priorityList = document.getElementById('priority-list');
    const addTaskButton = document.getElementById('add-task-btn');
    let typingTimeout;

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function getStatusColor(status) {
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

    function addTask(taskText) {
        const today = new Date().toISOString().split('T')[0];
        const task = { id: Date.now().toString(), text: taskText, dateCreated: today, status: 'Not started', priority: false };
        tasks.push(task);
        saveTasks();
        renderTasks();
    }

    function renderTasks() {
        tasks.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));

        taskTable.innerHTML = '';
        tasks.forEach((task, index) => {
            const row = taskTable.insertRow();
            row.setAttribute('data-id', task.id);
            row.innerHTML = `
                <td contenteditable="true" class="task-text">${task.text}</td>
                <td contenteditable="true" class="date-created">${task.dateCreated}</td>
                <td>
                    <div class="status-box" data-index="${index}" style="background-color: ${getStatusColor(task.status)}">${task.status}</div>
                </td>
                <td>
                    <button class="priority-btn ${task.priority ? 'active' : ''}" data-index="${index}" ${task.status === 'Done' ? 'disabled' : ''}>🔥</button>
                    <button class="delete-btn" data-index="${index}">🗑️</button>
                </td>
            `;
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
                    <button class="remove-priority-btn" data-id="${task.id}">✂️</button>
                </span>
            `;
            priorityList.appendChild(listItem);
        });

        addDragAndDropHandlers(priorityList, 'li', false);
    }

    function addDragAndDropHandlers(container, childSelector, isVerticalOnly) {
        const listItems = container.querySelectorAll(childSelector);

        listItems.forEach(item => {
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

        const afterElement = getDragAfterElement(e.currentTarget, e.clientY, isVerticalOnly);
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

    function getDragAfterElement(container, y, isVerticalOnly) {
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
        addTask('New Task');
    });

    taskTable.addEventListener('input', (e) => {
        const index = e.target.closest('tr').rowIndex - 1;
        if (e.target.classList.contains('task-text')) {
            tasks[index].text = e.target.textContent.trim();
            saveTasks();
            renderPriorityTasks();
        } else if (e.target.classList.contains('date-created')) {
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                tasks[index].dateCreated = e.target.textContent.trim();
                saveTasks();
                renderTasks(); // Re-render tasks to ensure correct order
            }, 500); // Wait 500ms after user stops typing
        }
    });

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
