import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const porta = 3000;
app.use(cors());
app.use(express.json());

let db;
(async () => {
    db = await open({ filename: './barbearia.db', driver: sqlite3.Database });
    await db.exec(`CREATE TABLE IF NOT EXISTS agendamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, whats TEXT, hora TEXT, barbeiro TEXT)`);
    await db.exec(`CREATE TABLE IF NOT EXISTS candidaturas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, telefone TEXT, endereco TEXT, curriculo TEXT)`);
    console.log("Banco de dados pronto!");
})();

app.post('/dono/entrar', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === "admin" && senha === "admin123") {
        return res.json({ logado: true, chave: "passe-livre-2026" });
    }
    res.status(401).json({ erro: "Usuário ou senha inválidos." });
});

app.get('/horarios-ocupados', async (req, res) => {
    const lista = await db.all('SELECT hora, barbeiro FROM agendamentos');
    res.json(lista);
});

app.post('/agendar', async (req, res) => {
    const { nome, whats, hora, barbeiro } = req.body;
    if (!nome || !whats || !hora || !barbeiro) return res.status(400).json({ erro: "Preencha tudo!" });

    const ocupado = await db.get('SELECT id FROM agendamentos WHERE hora = ? AND barbeiro = ?', [hora, barbeiro]);
    if (ocupado) return res.status(400).json({ erro: "Horário já reservado por outro cliente." });

    await db.run('INSERT INTO agendamentos (nome, whats, hora, barbeiro) VALUES (?, ?, ?, ?)', [nome, whats, hora, barbeiro]);
    res.status(201).json({ mensagem: "Horário reservado com sucesso!" });
});

app.get('/consultar/:whatsapp', async (req, res) => {
    const dados = await db.all('SELECT whats, hora, barbeiro, nome FROM agendamentos WHERE whats = ?', [req.params.whatsapp]);
    res.json(dados);
});

app.delete('/cancelar', async (req, res) => {
    await db.run('DELETE FROM agendamentos WHERE hora = ? AND barbeiro = ?', [req.body.hora, req.body.barbeiro]);
    res.json({ mensagem: "Cancelado!" });
});

app.post('/candidatura-barbeiro', async (req, res) => {
    const { nome, telefone, endereco, curriculo } = req.body;
    if (!nome || !telefone || !endereco) return res.status(400).json({ erro: "Preencha os campos obrigatórios." });
    
    await db.run('INSERT INTO candidaturas (nome, telefone, endereco, curriculo) VALUES (?, ?, ?, ?)', [nome, telefone, endereco, curriculo]);
    res.status(201).json({ mensagem: "Candidatura enviada!" });
});

app.get('/dono/todos-agendamentos', async (req, res) => {
    if (req.headers['authorization'] !== "passe-livre-2026") return res.status(403).json({ erro: "Bloqueado!" });
    res.json(await db.all('SELECT * FROM agendamentos ORDER BY hora ASC'));
});

app.get('/dono/todas-candidaturas', async (req, res) => {
    if (req.headers['authorization'] !== "passe-livre-2026") return res.status(403).json({ erro: "Bloqueado!" });
    res.json(await db.all('SELECT * FROM candidaturas'));
});

app.listen(porta, () => console.log(`Servidor na porta ${porta}`));
