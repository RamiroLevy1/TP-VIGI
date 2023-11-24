const express = require('express');
const mysql = require('mysql2');

// Crea una aplicación Express
const app = express();
app.use(express.json());

const PORT = 9000;
const bycrypt = require('bcrypt');

// Establece una conexión a la base de datos MySQL
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "burguertic",
});

// Conéctate a la base de datos
connection.connect((err) => {
    if (err) {
        console.error("Error conectándose: " + err);
        return;
    }

    console.log("Base de datos conectada");
});

// Endpoint para obtener el menú completo
app.get('/menu', (_, res) => {
    connection.query('SELECT * FROM platos', (err, rows) => {
        if (err) {
            console.error("Error consultando: " + err);
            return;
        }
        res.status(200).json(rows);
    });
});

// Endpoint para obtener un plato específico por ID
app.get('/menu/:id', (req, res) => {
    connection.query('SELECT * FROM platos WHERE id = ?', [req.params.id], (err, rows) => {
        if (err) {
            return res.status(500).json(err);
        }
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Plato no encontrado' });
        }
        res.status(200).json(rows[0]);
    });
});

// Endpoint para obtener solo platos de combo
app.get('/combos', (_, res) => {
    connection.query('SELECT * FROM platos WHERE tipo = ?', ['combo'], (err, rows) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.status(200).json(rows);
    });
});

// Endpoint para obtener solo platos principales
app.get('/principales', (_, res) => {
    connection.query('SELECT * FROM platos where tipo = ?', ['principal'], (err, rows) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.status(200).json(rows);
    });
});

// Endpoint para obtener solo postres
app.get('/postres', (_, res) => {
    connection.query('SELECT * FROM platos where tipo = ?', ['postre'], (err, rows) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.status(200).json(rows);
    });
});

// Endpoint para realizar un pedido
app.post('/pedido', (req, res) => {
    // Obtén el array de IDs de platos desde el cuerpo de la solicitud
    const { productos } = req.body;

    // Valida la solicitud
    if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json('La solicitud debe incluir un array de platos o al menos un plato');
    }

    // Obtiene el menú desde la base de datos
    connection.query('SELECT * FROM platos', (err, rows) => {
        if (err) {
            console.error('Error consultando: ' + err);
            return res.status(500).json({
                msg: 'Error al consultar los platos en la base de datos',
            });
        }

        // Mapea las filas a un array de IDs de platos
        const menu = rows.map((row) => ({
            id: row.id,
        }));

        // Valida cada ID de plato en la solicitud
        for (let i = 0; i < productos.length; i++) {
            const plato = menu.find((p) => p.id === productos[i].id);
            if (!plato) {
                return res.status(400).json('El id del plato no es válido');
            }
        }

        // Inserta el pedido y los detalles del pedido en la base de datos
        connection.query(
            'INSERT INTO pedidos (id_usuario, fecha,estado) VALUES (?, ?,?)',
            [1, new Date(), "pendiente"],
            (err, response) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        msg: 'Error al crear el pedido' + err,
                    });
                }

                const pedidoID = response.insertId;
                for (let i = 0; i < productos.length; i++) {
                    connection.query(
                        'INSERT INTO pedidos_platos (id_pedido, id_plato, cantidad) VALUES (?, ?, ?)',
                        [pedidoID, productos[i].id, productos[i].cantidad],
                        (err) => {
                            if (err) {
                                console.error('Error al insertar plato en el pedido: ' + err);
                            }
                        }
                    );
                }

                res.status(200).json({
                    id: pedidoID,
                });
            }
        );
    });
});

// Endpoint para obtener todos los pedidos de un usuario
app.get("/pedidos/:id", (req, res) => {
    const id = req.params.id;
    connection.query("SELECT pedidos.*, platos.*, pedidos_platos.id_pedido, pedidos_platos.cantidad FROM pedidos INNER JOIN pedidos_platos ON pedidos.id = pedidos_platos.id_pedido INNER JOIN platos ON pedidos_platos.id_plato=platos.id WHERE pedidos.id_usuario=?", id, (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }
        if (result.length === 0 || !result) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        } else {
            let pedidos = [];
            result.forEach((row) => {
                if (!pedidos.find((p) => p.id === row.id_pedido)) {
                    pedidos.push({
                        "id": row.id_pedido,
                        "fecha": row.fecha,
                        "estado": row.estado,
                        "id_usuario": row.id_usuario,
                        "platos": [
                            {
                                "id": row.id,
                                "nombre": row.nombre,
                                "precio": row.precio,
                                "cantidad": row.cantidad
                            }
                        ]
                    })
                } else {
                    const agregarPedido = pedidos.find((p) => p.id === row.id_pedido);
                    agregarPedido.platos.push({
                        "id": row.id,
                        "nombre": row.nombre,
                        "precio": row.precio,
                        "cantidad": row.cantidad
                    });
                    pedidos = pedidos.filter((p) => p.id !== row.id_pedido);
                    pedidos.push(agregarPedido);
                }
            });
            res.json(pedidos);
        }
    });
});

// Endpoint para crear un nuevo usuario
app.post("/usuarios", (req, res) => {
    // Agrega el código para crear un nuevo usuario
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});