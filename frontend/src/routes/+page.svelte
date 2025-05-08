<script lang="ts">
  import { onMount } from 'svelte';

  interface Task {
    id: number;
    description: string;
    completed: boolean;
    created_at?: string;
    updated_at?: string;
  }

  let tasks: Task[] = [];
  let newTaskDescription: string = '';
  let editingTaskId: number | null = null;
  let editingTaskDescription: string = '';
  let isLoading: boolean = true;
  let error: string | null = null;

  const API_URL: string = 'http://localhost:3001/api/tasks'; // URL do seu backend

  // Função para buscar todas as tarefas
  async function fetchTasks(): Promise<void> {
    isLoading = true;
    error = null;
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      tasks = await response.json();
    } catch (e) {
      console.error('Falha ao buscar tarefas:', e);
      error = 'Não foi possível carregar as tarefas. O backend está rodando?';
    } finally {
      isLoading = false;
    }
  }

  // Função para adicionar uma nova tarefa
  async function addTask(): Promise<void> {
    if (!newTaskDescription.trim()) return;
    isLoading = true;
    error = null;
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: newTaskDescription }),
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const addedTask: Task = await response.json();
      tasks = [addedTask, ...tasks]; // Adiciona no início para aparecer primeiro
      newTaskDescription = '';
    } catch (e) {
      console.error('Falha ao adicionar tarefa:', e);
      error = 'Não foi possível adicionar a tarefa.';
    } finally {
      isLoading = false;
    }
  }

  // Função para alternar o estado de concluído de uma tarefa
  async function toggleTaskCompleted(task: Task): Promise<void> {
    isLoading = true;
    error = null;
    try {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const updatedTask: Task = await response.json();
      tasks = tasks.map(t => (t.id === updatedTask.id ? updatedTask : t));
    } catch (e) {
      console.error('Falha ao atualizar tarefa:', e);
      error = 'Não foi possível atualizar a tarefa.';
    } finally {
      isLoading = false;
    }
  }

  // Função para iniciar a edição de uma tarefa
  function startEditTask(task: Task): void {
    editingTaskId = task.id;
    editingTaskDescription = task.description;
  }

  // Função para salvar a tarefa editada
  async function saveEditedTask(task: Task): Promise<void> {
    if (!editingTaskDescription.trim()) return;
    isLoading = true;
    error = null;
    try {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: editingTaskDescription, completed: task.completed }),
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const updatedTask: Task = await response.json();
      tasks = tasks.map(t => (t.id === updatedTask.id ? updatedTask : t));
      editingTaskId = null;
    } catch (e) {
      console.error('Falha ao salvar tarefa editada:', e);
      error = 'Não foi possível salvar a tarefa editada.';
    } finally {
      isLoading = false;
    }
  }

  // Função para cancelar a edição
  function cancelEdit(): void {
    editingTaskId = null;
    editingTaskDescription = '';
  }

  // Função para deletar uma tarefa
  async function deleteTask(taskId: number): Promise<void> {
    isLoading = true;
    error = null;
    try {
      const response = await fetch(`${API_URL}/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      tasks = tasks.filter(t => t.id !== taskId);
    } catch (e) {
      console.error('Falha ao deletar tarefa:', e);
      error = 'Não foi possível deletar a tarefa.';
    } finally {
      isLoading = false;
    }
  }

  // Carrega as tarefas quando o componente é montado
  onMount(fetchTasks);
</script>

<main>
  <h1>To Do List App</h1>

  <form on:submit|preventDefault={addTask} class="add-task-form">
    <input
      type="text"
      bind:value={newTaskDescription}
      placeholder="O que precisa ser feito?"
      aria-label="Nova tarefa"
    />
    <button type="submit" disabled={isLoading || !newTaskDescription.trim()}>Adicionar</button>
  </form>

  {#if isLoading && tasks.length === 0}
    <p>Carregando tarefas.</p>
  {/if}

  {#if error}
    <p class="error-message">{error}</p>
  {/if}

  <ul class="task-list">
    {#each tasks as task (task.id)}
      <li class:completed={task.completed}>
        {#if editingTaskId === task.id}
          <input type="text" bind:value={editingTaskDescription} class="edit-input" />
          <button on:click={() => saveEditedTask(task)} disabled={isLoading}>Salvar</button>
          <button on:click={cancelEdit} disabled={isLoading}>Cancelar</button>
        {:else}
          <input
            type="checkbox"
            checked={task.completed}
            on:change={() => toggleTaskCompleted(task)}
            aria-label="Marcar como concluída"
          />
          <span on:dblclick={() => startEditTask(task)}>{task.description}</span>
          <button on:click={() => startEditTask(task)} disabled={isLoading} class="edit-btn">✏️</button>
          <button on:click={() => deleteTask(task.id)} disabled={isLoading} class="delete-btn">🗑️</button>
        {/if}
      </li>
    {/each}
  </ul>

  {#if !isLoading && tasks.length === 0 && !error}
    <p>Nenhuma tarefa ainda. Que tal adicionar uma?</p>
  {/if}
</main>

<style>
  main {
    max-width: 700px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: 'Roboto', sans-serif;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  h1 {
    color: #2c3e50;
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2rem;
    font-weight: bold;
  }

  .add-task-form {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .add-task-form input[type="text"] {
    flex-grow: 1;
    padding: 1rem;
    border: 2px solid #ecf0f1;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s;
  }

  .add-task-form input[type="text"]:focus {
    border-color: #3498db;
    outline: none;
  }

  .add-task-form button {
    padding: 1rem 1.5rem;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
    transition: background-color 0.3s;
  }

  .add-task-form button:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }

  .add-task-form button:hover:not(:disabled) {
    background-color: #2980b9;
  }

  .task-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .task-list li {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    margin-bottom: 1rem;
    background-color: #f9f9f9;
    transition: box-shadow 0.3s;
  }

  .task-list li:hover {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }

  .task-list li.completed span {
    text-decoration: line-through;
    color: #95a5a6;
  }

  .task-list li span {
    flex-grow: 1;
    font-size: 1rem;
    cursor: pointer;
  }

  .task-list li .edit-input {
    flex-grow: 1;
    padding: 0.75rem;
    border: 2px solid #ecf0f1;
    border-radius: 8px;
    font-size: 1rem;
  }

  .task-list li button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    font-size: 1.2rem;
    transition: color 0.3s;
  }

  .task-list li .edit-btn {
    color: #3498db;
  }

  .task-list li .edit-btn:hover {
    color: #2980b9;
  }

  .task-list li .delete-btn {
    color: #e74c3c;
  }

  .task-list li .delete-btn:hover {
    color: #c0392b;
  }

  .error-message {
    color: #e74c3c;
    text-align: center;
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: #fdecea;
    border: 1px solid #e74c3c;
    border-radius: 8px;
  }
</style>