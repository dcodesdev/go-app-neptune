const API_URL = '/api/todos';

let todos = [];
let currentFilter = 'all';

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const todoCount = document.getElementById('todoCount');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');

async function fetchTodos() {
    try {
        const response = await fetch(API_URL);
        todos = await response.json() || [];
        renderTodos();
        updateStats();
    } catch (error) {
        console.error('Error fetching todos:', error);
        todos = [];
        renderTodos();
    }
}

async function addTodo() {
    const title = todoInput.value.trim();
    if (!title) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
        });

        if (response.ok) {
            todoInput.value = '';
            await fetchTodos();
        }
    } catch (error) {
        console.error('Error adding todo:', error);
    }
}

async function toggleTodo(id, completed) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed }),
        });

        if (response.ok) {
            await fetchTodos();
        }
    } catch (error) {
        console.error('Error updating todo:', error);
    }
}

async function deleteTodo(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            await fetchTodos();
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
    }
}

async function clearCompletedTodos() {
    const completedTodos = todos.filter(todo => todo.completed);

    try {
        await Promise.all(
            completedTodos.map(todo => deleteTodo(todo.id))
        );
    } catch (error) {
        console.error('Error clearing completed todos:', error);
    }
}

function getFilteredTodos() {
    switch (currentFilter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        default:
            return todos;
    }
}

function renderTodos() {
    const filteredTodos = getFilteredTodos();

    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No todos yet. Add one above!</div>';
        return;
    }

    todoList.innerHTML = filteredTodos.map(todo => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}">
            <input
                type="checkbox"
                class="todo-checkbox"
                ${todo.completed ? 'checked' : ''}
                onchange="toggleTodo(${todo.id}, ${!todo.completed})"
            />
            <span class="todo-text">${escapeHtml(todo.title)}</span>
            <button class="delete-btn" onclick="deleteTodo(${todo.id})">Delete</button>
        </li>
    `).join('');
}

function updateStats() {
    const activeTodos = todos.filter(todo => !todo.completed).length;
    todoCount.textContent = `${activeTodos} item${activeTodos !== 1 ? 's' : ''} left`;
}

function setFilter(filter) {
    currentFilter = filter;

    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    renderTodos();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

clearCompleted.addEventListener('click', clearCompletedTodos);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

fetchTodos();
