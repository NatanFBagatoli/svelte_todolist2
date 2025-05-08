const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const fs = require('fs').promises; // Para ler arquivos de forma assíncrona
const mysql = require('mysql2/promise'); // Importar para criar conexão temporária
const path = require('path'); // Para construir caminhos de arquivo de forma segura

const app = express();
const port = process.env.PORT || 3001;

// Função para inicializar o banco de dados
async function initializeDatabase() {
  let tempConnection;
  try {
    // Etapa 1: Garantir que o banco de dados exista usando uma conexão temporária
    // que não especifica um 'database' na sua configuração inicial.
    console.log(`Tentando garantir a existência do banco de dados '${process.env.DB_NAME}'...`);
    tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // NENHUMA propriedade 'database' aqui, para conectar ao servidor MySQL em geral
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`Banco de dados '${process.env.DB_NAME}' verificado/criado com sucesso.`);
    await tempConnection.end(); // Fechar a conexão temporária

    // Etapa 2: Agora que o banco de dados existe, podemos usar o pool principal
    // (que é configurado em db.js para usar DB_NAME) para aplicar o restante do schema.
    const schemaPath = path.join(__dirname, '..', 'mysql', 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf-8');

    // Divide os comandos SQL. Simples para este schema, pode precisar de mais robustez para SQL complexo.
    const commands = sql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);

    // Obtém uma conexão do pool principal. Agora deve funcionar, pois o DB_NAME existe.
    const poolConnection = await pool.getConnection();
    console.log(`Conectado ao banco de dados '${process.env.DB_NAME}' via pool para aplicar o schema.`);

    for (const command of commands) {
      // O comando CREATE DATABASE IF NOT EXISTS é seguro para ser executado novamente.
      // O comando USE DB_NAME também é seguro; a conexão do pool já está nesse contexto.
      await poolConnection.query(command);
      console.log(`Executado do schema.sql: ${command.substring(0, 60)}...`);
    }
    poolConnection.release();
    console.log('Schema do arquivo bancodedados/schema.sql aplicado/verificado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar o schema do banco de dados:', error);
    if (tempConnection) { // Garante que a conexão temporária seja fechada em caso de erro
      await tempConnection.end();
    }
    // Decide se quer parar a aplicação ou continuar mesmo com o erro
    // process.exit(1); // Descomente para parar a aplicação se o DB não puder ser inicializado
  }
}

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173' // Permite requisições do frontend Svelte (servidor de desenvolvimento Vite)
}));
app.use(express.json()); // Para parsear JSON no corpo das requisições

// Rotas da API

// Rota para LISTAR todas as tarefas
app.get('/api/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tarefas ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Falha ao buscar tarefas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar uma nova tarefa
// Rota para CRIAR uma nova tarefa
app.post('/api/tasks', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'A descrição é obrigatória' });
  }
  try {
    const [result] = await pool.query('INSERT INTO tarefas (description) VALUES (?)', [description]);
    res.status(201).json({ id: result.insertId, description, completed: false });
  } catch (error) {
    console.error('Falha ao criar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Editar uma tarefa (descrição e/ou status de concluída)
// Rota para EDITAR uma tarefa (descrição e/ou status de concluída)
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { description, completed } = req.body;

  if (description === undefined && completed === undefined) {
    return res.status(400).json({ error: 'Pelo menos um campo (descrição ou concluída) deve ser fornecido para atualização.' });
  }

  try {
    // Primeiro, busca a tarefa atual para obter os valores existentes caso nem todos sejam passados
    const [currentTaskRows] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [id]);
    if (currentTaskRows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    const currentTask = currentTaskRows[0];

    const newDescription = description !== undefined ? description : currentTask.description;
    // O MySQL converte boolean para 0 ou 1, então tratamos explicitamente
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : currentTask.completed;

    await pool.query('UPDATE tarefas SET description = ?, completed = ? WHERE id = ?', [newDescription, newCompleted, id]);
    res.json({ id: parseInt(id), description: newDescription, completed: !!newCompleted }); // Retorna boolean para o frontend
  } catch (error) {
    console.error('Falha ao atualizar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar uma tarefa
// Rota para DELETAR uma tarefa
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM tarefas WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada para exclusão' });
    }
    res.status(204).send(); // Resposta "Sem Conteúdo" para indicar sucesso na exclusão
  } catch (error) {
    console.error('Falha ao deletar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

async function startServer() {
  await initializeDatabase(); // Garante que o DB esteja pronto antes de iniciar o servidor
  app.listen(port, () => {
    console.log(`Servidor backend iniciado e ouvindo na porta ${port}. Acesse em http://localhost:${port}`);
  });
}

startServer();