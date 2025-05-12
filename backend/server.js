const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const fs = require('fs').promises; // Módulo para operações de arquivo assíncronas
const mysql = require('mysql2/promise'); // Cliente MySQL para conexões diretas
const path = require('path'); // Utilitário para manipulação de caminhos de arquivo

const app = express();
const port = process.env.PORT || 3001;

// Procedimento para configurar o banco de dados na inicialização
async function initializeDatabase() {
  let tempConnection;
  try {
    // Passo 1: Assegurar a existência do banco de dados.
    // Uma conexão temporária é usada, sem especificar um banco de dados, para criar o DB se necessário.
    console.log(`Verificando/criando o banco de dados '${process.env.DB_NAME}'...`);
    tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // A propriedade 'database' é omitida para permitir a conexão ao servidor MySQL antes da criação do DB.
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`O banco de dados '${process.env.DB_NAME}' está pronto.`);
    await tempConnection.end(); // Encerra a conexão temporária

    // Passo 2: Com o banco de dados garantido, o schema é aplicado usando o pool de conexões principal.
    // O pool (definido em db.js) já está configurado para usar o DB_NAME.
    const schemaPath = path.join(__dirname, '..', 'mysql', 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf-8');

    // Separa os comandos SQL do arquivo. Adequado para schemas simples; SQL mais complexo pode exigir um parser.
    const commands = sql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);

    // Adquire uma conexão do pool. Esta operação deve ser bem-sucedida, pois o DB_NAME já existe.
    const poolConnection = await pool.getConnection();
    console.log(`Conexão estabelecida com '${process.env.DB_NAME}' via pool para aplicação do schema.`);

    for (const command of commands) {
      // Comandos como CREATE DATABASE IF NOT EXISTS e USE DB_NAME são idempotentes ou já contextuais à conexão do pool.
      await poolConnection.query(command);
      console.log(`Comando do schema.sql executado: ${command.substring(0, 60)}...`);
    }
    poolConnection.release();
    console.log('Schema do arquivo (mysql/schema.sql) aplicado/verificado com êxito!');
  } catch (error) {
    console.error('Erro ao inicializar o schema do banco de dados:', error);
    if (tempConnection) { // Garante que a conexão temporária seja fechada em caso de erro
      await tempConnection.end();
    }
    // Decide se quer parar a aplicação ou continuar mesmo com o erro
    // process.exit(1); // Descomente para parar a aplicação se o DB não puder ser inicializado
    // process.exit(1); // Avalie se a aplicação deve ser interrompida em caso de falha na inicialização do DB.
  }
}

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173' // Configura CORS para permitir requisições do frontend Svelte (Vite dev server)
}));
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// Rotas da API

// Endpoint para OBTER todas as tarefas
app.get('/api/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tarefas ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Não foi possível buscar as tarefas:', error);
    res.status(500).json({ message: 'Ocorreu um erro no servidor ao buscar tarefas.' });
  }
});

// Endpoint para ADICIONAR uma nova tarefa
app.post('/api/tasks', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ message: 'O campo "description" é mandatório.' });
  }
  try {
    const [result] = await pool.query('INSERT INTO tarefas (description) VALUES (?)', [description]);
    res.status(201).json({ id: result.insertId, description, completed: false });
  } catch (error) {
    console.error('Não foi possível criar a tarefa:', error);
    res.status(500).json({ message: 'Ocorreu um erro no servidor ao criar a tarefa.' });
  }
});

// Endpoint para ATUALIZAR uma tarefa existente (descrição e/ou status)
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { description, completed } = req.body;

  if (description === undefined && completed === undefined) {
    return res.status(400).json({ message: 'É necessário fornecer "description" ou "completed" para atualizar.' });
  }

  try {
    // Busca a tarefa atual para usar seus valores caso nem todos os campos sejam enviados na requisição.
    const [currentTaskRows] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [id]);
    if (currentTaskRows.length === 0) {
      return res.status(404).json({ message: 'Tarefa com o ID especificado não foi encontrada.' });
    }
    const currentTask = currentTaskRows[0];

    const newDescription = description !== undefined ? description : currentTask.description;
    // O MySQL converte boolean para 0 ou 1, então tratamos explicitamente
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : currentTask.completed;

    await pool.query('UPDATE tarefas SET description = ?, completed = ? WHERE id = ?', [newDescription, newCompleted, id]);
    res.json({ id: parseInt(id), description: newDescription, completed: !!newCompleted }); // Assegura que 'completed' seja booleano na resposta.
  } catch (error) {
    console.error('Não foi possível atualizar a tarefa:', error);
    res.status(500).json({ message: 'Ocorreu um erro no servidor ao atualizar a tarefa.' });
  }
});

// Endpoint para REMOVER uma tarefa
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM tarefas WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Nenhuma tarefa encontrada com este ID para exclusão.' });
    }
    res.status(204).send(); // HTTP 204 No Content indica sucesso na remoção.
  } catch (error) {
    console.error('Não foi possível deletar a tarefa:', error);
    res.status(500).json({ message: 'Ocorreu um erro no servidor ao deletar a tarefa.' });
  }
});

async function startServer() {
  await initializeDatabase(); // Assegura a inicialização do banco de dados antes de iniciar o servidor HTTP.
  app.listen(port, () => {
    console.log(`Servidor backend iniciado e ouvindo na porta ${port}. Acesse em http://localhost:${port}`);
  });
}

startServer();