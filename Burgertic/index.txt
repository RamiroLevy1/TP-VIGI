const express = require('express');
const mysql2 = require('mysql2');
const cors = require("cors");
const bcrypt = require("bcrypt");

const connection = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'burguertic'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected!');
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express());

// 1
app.get('/menu', (_, res) => {
    connection.query("SELECT * FROM platos;", (err, rows) => {
        if (err) return res.status(500).json(err);
        res.status(200).json(rows);
    });
});

// 2
app.get('/menu/:id', (req, res) => {
    connection.query("SELECT * FROM platos WHERE id = ?;", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.sendStatus(404);
        res.status(200).json(rows[0]);
    });
});


// 3
app.get('/combos', (_, res) => {
    connection.query("SELECT * FROM platos WHERE tipo = 'principal';", (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.sendStatus(404);
        res.status(200).json(rows);
    });
});


// 4
app.get('/principales', (_, res) => {
    connection.query("SELECT * FROM platos WHERE tipo = 'principal';", (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.sendStatus(404);
        res.status(200).json(rows);
    });
});

// 5
app.get('/postres', (_, res) => {
    connection.query("SELECT * FROM platos WHERE tipo = 'postre';", (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.sendStatus(404);
        res.status(200).json(rows);
    });
});

// 6
app.post('/pedido', (req, res) => {
    const { productos } = req.body;
    const id = req.headers.authorization;
    if (!id) return res.sendStatus(401);

    connection.query("INSERT INTO pedidos (id_usuario, fecha, estado) VALUES (?, ?, 'pendiente');", [id, new Date().toISOString().slice(0, 19).replace('T', ' ')], (err, rows) => {
        if (err) return res.status(500).json(err);
        connection.query("INSERT INTO pedidos_platos (id_pedido, id_plato, cantidad) VALUES " + productos.map(x => `(${rows.insertId}, ?, ?)`).join(', ') + ";",
            productos.map(x => [parseInt(x.id), parseInt(x.cantidad)]).flat(), (err, rows) => {
                if (err) return res.status(500).json(err);
                return res.status(201).json({
                    id: rows.insertId
                });
            });
    });
});

app.get('/pedidos', (req, res) => {
    const id = req.headers.authorization;
    if (!id) return res.sendStatus(401);

    connection.query("SELECT pedidos.id as id_pedido, pedidos.fecha, pedidos.estado, platos.id as id_plato, platos.nombre, platos.precio, pedidos_platos.cantidad FROM pedidos JOIN pedidos_platos ON pedidos.id = pedidos_platos.id_pedido JOIN platos ON pedidos_platos.id_plato = platos.id WHERE pedidos.id_usuario = ?;",
        [parseInt(id)],
        (err, rows) => {
            if (err) {
                console.log(err);
                return res.status(500).json(err);
            }
            let response = [];
            rows.forEach(x => {
                let i = response.findIndex(y => y.id == x.id_pedido)
                if (i == -1)
                {
                    response.push(
                    {
                        id: x.id_pedido,
                        fecha: x.fecha,
                        estado: x.estado,
                        id_usuario: id,
                        platos: []
                    }
                    );
                    i = response.length-1;
                }
                response[i].platos.push(
                    {
                        id: x.id_plato,
                        nombre: x.nombre,
                        precio: x.precio,
                        cantidad: x.cantidad
                    }
                );
            })
            return res.status(200).json(response);
        });
});

app.post("/usuarios", (req, res) => {
    let { nombre, apellido, email, password } = req.body;
    let ret = false;
    connection.query("SELECT usuarios.* FROM usuarios WHERE usuarios.email = ?;",
    [email], (err, rows) => {
        if (err)
        {
            ret = true;
            return res.status(500).json(err);
        }
        else if (rows.length != 0)
        {
            ret = true;
            return res.sendStatus(400);
        }
    });

    if (ret) return;

    bcrypt.genSalt(10, function(err, salt) {
        if (err)
        {
            ret = true;
            return res.status(500).json(err);
        }
        bcrypt.hash(password, salt, function(err, hash) {
            if (err)
            {
                ret = true;
                return res.status(500).json(err);
            }
            console.log(hash);
            connection.query("INSERT INTO usuarios (nombre, apellido, email, password) VALUES (?, ?, ?, ?);",
            [nombre, apellido, email, hash], (err, rows) => {
                if (err) return res.status(500).json(err);
                return res.status(200).json({
                    id: rows.insertId
                });
            });
        });
    });
});

app.post("/login", (req, res) => {
    let { email, password } = req.body;
    connection.query("SELECT usuarios.* FROM usuarios WHERE usuarios.email = ?;",
    [email], (err, rows) =>
    {
        if (err) return res.status(500).json(err);
        if (!rows) return res.status(401).json({
            error: "Usuario o contraseña incorrectos"
        });
        console.log(rows[0].password);
        bcrypt.compare(password, rows[0].password, function(err, result) {
            if (err) return res.status(500).json(err);
            if (!result) return res.status(401).json({
                error: "Usuario o contraseña incorrectos"
            });
            delete rows[0].password;
            return res.status(200).json(rows[0]);
        });
    });
});

app.listen(9000, () => {
    console.log('Escuchando en puerto 9000');
});