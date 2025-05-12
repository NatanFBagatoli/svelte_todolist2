<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';

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

  //busca todas as tarefas
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
      error = 'Não foi possível carregar as tarefas.';
    } finally {
      isLoading = false;
    }
  }

  //adiciona uma nova tarefa
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
      tasks = [addedTask, ...tasks]; 
      newTaskDescription = '';
    } catch (e) {
      console.error('Falha ao adicionar tarefa:', e);
      error = 'Não foi possível adicionar a tarefa.';
    } finally {
      isLoading = false;
    }
  }

  //muda o estado de concluído de uma tarefa
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

  //inicia a edição de uma tarefa
  function startEditTask(task: Task): void {
    editingTaskId = task.id;
    editingTaskDescription = task.description;
  }

  //salva a tarefa editada
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

  //cancela a edição
  function cancelEdit(): void {
    editingTaskId = null;
    editingTaskDescription = '';
  }

  //deleta uma tarefa
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

  //Carrega as tarefas ao montar o componente
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
    <p>Carregando as tarefas.</p>
  {/if}

  {#if error}
    <p class="error-message">{error}</p>
  {/if}

  <ul class="task-list">
    {#each tasks as task (task.id)}
      <li class:completed={task.completed}>
        {#if editingTaskId === task.id}
          <input type="text" bind:value={editingTaskDescription} class="edit-input" aria-label="Editar descrição da tarefa" />
          <button class="save-edit-btn" on:click={() => saveEditedTask(task)} disabled={isLoading || !editingTaskDescription.trim()}>Salvar</button>
          <button class="cancel-edit-btn" on:click={cancelEdit} disabled={isLoading}>Cancelar</button>
        {:else}
          <input
            type="checkbox"
            checked={task.completed}
            on:change={() => toggleTaskCompleted(task)}
            aria-label="Marcar como concluída"
          />
          <span on:dblclick={() => startEditTask(task)}>{task.description}</span>
          <button on:click={() => startEditTask(task)} disabled={isLoading} class="edit-btn" aria-label="Editar tarefa"><Icon icon="mdi:pencil" /></button>
          <button on:click={() => deleteTask(task.id)} disabled={isLoading} class="delete-btn" aria-label="Deletar tarefa"><Icon icon="mdi:delete-outline" /></button>
        {/if}
      </li>
    {/each}
  </ul>

  {#if !isLoading && tasks.length === 0 && !error}
    <p>Nenhuma tarefa ainda.</p>
  {/if}
</main>

<style>
 :global(body) {
    background-color: var(--background-color, #791717);
    margin: 0;
    line-height: 1.6;
 
  }
  main {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: 'Roboto', sans-serif;
    background-color: #8a1b1b;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgb(240, 65, 65);
    
  }

  h1 {
    color: #ffffff;
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
    border-color: #e25151;
    outline: none;
    box-shadow: 0 4px 10px rgb(240, 65, 65);
  }

  .add-task-form button {
    padding: 1rem 1.5rem;
    background-color: #d62626;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
    transition: background-color 0.3s;
  }

  .add-task-form button:disabled {
    background-color: #fc5d5d;
    cursor: not-allowed;
  }

  .add-task-form button:hover:not(:disabled) {
    background-color: #680000;
    box-shadow: 0 4px 10px rgb(185, 2, 2);
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
    box-shadow: 0 4px 10px rgb(240, 65, 65);
  }

  .task-list li.completed span {
    text-decoration: line-through;
    color: #000000;
  }

  .task-list li span {
    flex-grow: 1;
    font-size: 1rem;
    cursor: pointer;
  }

  .task-list li .edit-input {
    flex-grow: 1;
    padding: 0.75rem;
    border: 2px solid #e25151;
    border-radius: 8px;
    font-size: 1rem;
  }

  .task-list li button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    font-size: 1.2rem; /* Principalmente para ícones */
    transition: color 0.3s, background-color 0.3s, border-color 0.3s;
  }

  .task-list li .edit-btn {
    color: #038f16;
  }

  .task-list li .edit-btn:hover:not(:disabled) {
    color: #01500c;
  }

  .task-list li .delete-btn {
    color: #e74c3c;
  }
  .task-list li .delete-btn:hover:not(:disabled) {
    color: #942519;
  }

  /* Botões Salvar e Cancelar na edição */
  .task-list li .save-edit-btn,
  .task-list li .cancel-edit-btn {
    padding: 0.6rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    border-width: 1.5px; /* Espessura da borda */
    border-style: solid;
    /* Herdam background: none inicialmente */
  }

  .task-list li .save-edit-btn {
    color: #27ae60; /* Verde (Nephritis) */
    border-color: #27ae60;
  }
  .task-list li .save-edit-btn:hover:not(:disabled) {
    background-color: #27ae60;
    color: white;
  }

  .task-list li .cancel-edit-btn {
    color: #c0392b; /* Vermelho (Pomegranate) */
    border-color: #c0392b;
  }
  .task-list li .cancel-edit-btn:hover:not(:disabled) {
    background-color: #c0392b;
    color: white;
  }

  /* Estilo para botões desabilitados na lista */
  .task-list li button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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