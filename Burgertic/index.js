const express = require('express');
const mysql2 = require('mysql2');
const bcrypt = require('bcrypt');

const connection = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'rootroot',
    database: 'burguertic'
});

connection.connect((err) => {
    if (err){
       return console.error("No se pudo conectar " + err)
    }
});

const app = express();

app.use(express.json());



app.get('/menu', (_, res) => {
    connection.query("SELECT * FROM platos", (err, rows) => {
        if (err) return res.status(500).json(err);
        res.status(200).json(rows);
    });
});


app.get('/menu/:id', (req, res) => {
    connection.query("SELECT * FROM platos WHERE id = ?;", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.status(404).json("Plato no encontrado");
        res.status(200).json(rows[0]);
    });
});



app.get('/combos', (_, res) => {
    connection.query("SELECT * FROM platos WHERE tipo = 'combo';", (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.Status(404);
        res.status(200).json(rows);
    });
});



app.get('/principales', (_, res) => {
    connection.query("SELECT * FROM platos WHERE tipo = 'principal';", (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.sendStatus(404);
        res.status(200).json(rows);
    });
});


app.get('/postres', (_, res) => {
    connection.query("SELECT * FROM platos WHERE tipo = 'postre';", (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0)
            return res.sendStatus(404);
        res.status(200).json(rows);
    });
});

//5
app.post('/pedido', (req, res) => {
    const { productos } = req.body; // OBTIENE LA LISTA DE PRODUCTOS DEL CUERPO DE LA SOLICITUD


    // VERIFICA SI NO HAY PRODUCTOS O SI EL PEDIDO ESTÁ VACÍO, RESPONDE CON UN ERROR
    if (!productos || productos.length == 0) {
        return res.status(404).json({ msg: 'No se han agregado productos al pedido' });
    }

    // REALIZA UNA INSERCIÓN EN LA TABLA 'pedidos' 
    connection.query("INSERT INTO pedidos (id_usuario, fecha, estado) VALUES (?,?,? )", [1,new Date(),"pendiente"],(err, response) => {
        if (err) {
            console.error("Error consultando: " + err);
            return;
        } else {
            const id_pedido = response.insertId; // OBTIENE EL ID DEL PEDIDO INSERTADO

            // QUERY PARA INSERTAR LOS PRODUCTOS EN LA TABLA 'pedidos_platos'
            let insert = "INSERT INTO pedidos_platos (id_pedido, id_plato, cantidad) VALUES ";
            let argumentos = [];
            productos.forEach((plato, i) => {
                insert += "(?, ?, ?)"; 
                argumentos.push(id_pedido, plato.id, plato.cantidad); // AGREGA LOS ARGUMENTOS PARA EL PRODUCTO ACTUAL
                if (i !== productos.length - 1) {
                    insert += ", "; 
                }
            });

            // QUERY PARA INSERTAR LOS PRODUCTOS EN LA TABLA 'pedidos_platos'zzz
            
            connection.query(insert, argumentos, (err, result) => {
                if (err) {
                    console.error("Error consultando: " + err); // SI HAY UN ERROR EN LA CONSULTA SQL, MUESTRA UN MENSAJE DE ERROR EN LA CONSOLA
                    return;
                } else {
                    res.status(200).json({ id_pedido }); // SI TODO ES EXITOSO, RESPONDE CON UN MENSAJE DE ÉXITO
                }
            });
        }
    });
});




   
//6
       
app.get("/pedidos/:id", (req, res) => {
    const id = req.params.id;
    connection.query("SELECT pedidos.*, platos.*, pedidos_platos.id_pedido, pedidos_platos.cantidad FROM pedidos INNER JOIN pedidos_platos ON pedidos.id = pedidos_platos.id_pedido INNER JOIN platos ON pedidos_platos.id_plato=platos.id WHERE pedidos.id_usuario=?", id, (err, rows) => {
        if (err) {
            console.error("Error consultando: " + err);
            return;
        }
        else {
            let pedidos = []
            rows.forEach((row) => {
                if (!pedidos.find((p) => p.id === row.id_pedido)){
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
                    const newPedido = pedidos.find((p) => p.id === row.id_pedido);
                    newPedido.platos.push({
                        "id": row.id,
                        "nombre": row.nombre,
                        "precio": row.precio,
                        "cantidad": row.cantidad});
                    pedidos = pedidos.filter((p) => p.id !== row.id_pedido);
                    pedidos.push(newPedido);
                }
            });
            res.json(pedidos);
        }
    });
});

app.listen(9000, () => {
    console.log('Escuchando en puerto 9000');
});




//INTENTO DE ALGO?

app.post('/usuarios', async (req, res) => {
    try {
        const { nombre, apellido, email, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const id = await pool.query('INSERT INTO usuarios SET ?', [{ nombre, apellido, email, password: hash }]);
        res.json({ id: id.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Algo salió mal, por favor intente nuevamente' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [user] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        res.json({ id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Algo salió mal, por favor intente nuevamente' });
    }
}); 

app.post('/pedidos', async (req, res) => {
    try {
        const id = req.header('Authorization');
        
    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!usuario) {
        return res.status(400).json({ error: 'Usuario no encontrado' });
    }
    const pedido = { usuario_id: id, ...req.body };
    const idPedido = await pool.query('INSERT INTO pedidos SET ?', [pedido]);
    res.json({ id: idPedido.insertId });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Algo salió mal, por favor intente nuevamente' });
}
});

app.get('/pedidos', async (req, res) => {
    try {
        const id = req.header('Authorization');
        const pedidos = await pool.query('SELECT * FROM pedidos WHERE usuario_id = ?', [id]);
        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Algo salió mal, por favor intente nuevamente' });
    }
});

app.post('/usuarios', async (req, res) => {
    try {
        const { nombre, apellido, email, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const id = await pool.query('INSERT INTO usuarios SET ?', [{ nombre, apellido, email, password: hash }]);
        res.json({ id: id.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Algo salió mal, por favor intente nuevamente' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [user] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        res.json({ id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Algo salió mal, por favor intente nuevamente' });
    }
});

app.post('/pedidos', async (req, res) => {
    try {
        const id = req.header('Authorization');
        const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
        if (!usuario) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        const pedido = { usuario_id: id, ...req.body };
        const idPedido = await pool.query('INSERT INTO pedidos SET ?', [pedido]);
        res.json({ 
