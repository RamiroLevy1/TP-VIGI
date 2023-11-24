const express = require('express');
const mysql = require('mysql2');

const app = express();
app.use(express.json());
const PORT = 9000;
const bcrypt = require('bcrypt');  


const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "burgertic",
});

connection.connect((err) => {
    if (err) {
        console.error("Error conectándose: " + err);
        return;
    }

    console.log("Base de datos conectada");
});
//Crear un endpoint GET /menu que devuelva el menú completo del restaurante.
app.get('/menu', (_, res) => {
    connection.query('SELECT * FROM platos', (err, rows) => {
        if (err) {
            console.error("Error consultando: " + err);
            return;
        }
        res.status(200).json(rows);
    });
});

//Crear un endpoint GET /menu/:id que devuelva el plato con el id indicado.
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

//Crear un endpoint GET /combos que devuelva únicamente los combos del menú.
app.get('/combos', (_, res) => {
    connection.query('SELECT * FROM platos WHERE tipo = ?', ['combo'], (err, rows) => {
        if (err) {
            return res.status(500).json(err);
            
        }
        res.status(200).json(rows);
    });
});

//Crear un endpoint GET /principales que devuelva únicamente los platos principales del menú.
app.get('/principales', (_, res) => {
    connection.query('SELECT * FROM platos where tipo = ?',['principal'],(err,rows)=>{
        if(err){
            return res.status(500).json(err);
            
        }
        res.status(200).json(rows);
    });
});

//Crear un endpoint GET /postres que devuelva únicamente los postres del menú.
app.get('/postres', (_, res) => {
    connection.query('SELECT * FROM platos where tipo = ?',['postre'],(err,rows)=>{
        if(err){
            return res.status(500).json(err);
        }
        res.status(200).json(rows);
    });
});

//Crear un endpoint POST /pedido que reciba un array de id's de platos y devuelva el precio total del pedido. El array de platos debe ser pasado en el cuerpo de la petición. 

app.post('/pedido', (req, res) => {
  const { productos } = req.body;
  const  idusuario  = req.headers.authorization;
  if (!idusuario) {
    return res.status(401).json({ msg: 'Unauthorized: Missing Authorization header' });
  }
  if (!Array.isArray(productos) || productos.length === 0) {
     return res.status(400).json('La solicitud debe incluir un array de platos o al menos un plato');
    }
    connection.query('SELECT id FROM usuarios WHERE id = ?', [idusuario], (err, userRows) => {
      if (err) {
        console.error('Error verificando el usuario: ' + err);
        return res.status(500).json({
          msg: 'Error al verificar la existencia del usuario en la base de datos',
        });
      }
  
      if (userRows.length === 0) {
        return res.status(404).json({ msg: 'El usuario no existe en la base de datos' });
      }
  
    connection.query('SELECT * FROM platos', (err, rows) => {
      if (err) {
        console.error('Error consultando: ' + err);
        return res.status(500).json({
          msg: 'Error al consultar los platos en la base de datos',
        });
      }

    const menu = rows.map((row) => ({
    id: row.id,
            
}));

      for (let i = 0; i < productos.length; i++) {
        const plato = menu.find((p) => p.id === productos[i].id);
        if (!plato) {
              return res.status(400).json('El id del plato no es válido');
          }
          }
      
      
        connection.query(
            'INSERT INTO pedidos (id_usuario, fecha,estado) VALUES (?, ?,?)',
            [idusuario, new Date(),"pendiente"],
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
    });
   //Crear un endpoint que permita obtener todos los pedidos de un usuario (GET /pedidos/:id).
   
app.get("/pedidos", (req, res) => {
    const id = req.headers.authorization;

    connection.query("SELECT pedidos.*, platos.*, pedidos_platos.id_pedido, pedidos_platos.cantidad FROM pedidos INNER JOIN pedidos_platos ON pedidos.id = pedidos_platos.id_pedido INNER JOIN platos ON pedidos_platos.id_plato=platos.id WHERE pedidos.id_usuario=?", id, (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    if(result.length === 0 || !result) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
     }
     else {
     let pedidos = [];
     result.forEach((row) => {
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
       const agregarPedido = pedidos.find((p) => p.id === row.id_pedido);
        agregarPedido.platos.push({
           "id": row.id,
           "nombre": row.nombre,
            "precio": row.precio,
              "cantidad": row.cantidad});
                    pedidos = pedidos.filter((p) => p.id !== row.id_pedido);
                    pedidos.push(agregarPedido);
                }
            });
            res.json(pedidos);
        }
    });
});

//Crear un endpoint que permita registrar un usuario (POST /usuarios).
app.post("/usuarios", (req, res) => {
  const {nombre, apellido, email, password} = req.body;
  if (!nombre || !apellido || !email || !password) {
    return res.status(400).json("Faltan datos obligatorios");
  }

  try{
    const hashedPassword = bcrypt.hashSync(password, 10);

    connection.query("SELECT * FROM usuarios WHERE email = ?", email, (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }
      if (result.length > 0) {
        return res.status(409).json("El usuario ya existe");
      }
      const insertQuery = "INSERT INTO usuarios(nombre,apellido,email,password) VALUES (?,?,?,?)";
      connection.query(insertQuery, [nombre, apellido, email, hashedPassword], (err,result) => {
      if(err){
        return res.status(500).json("No se pudo insertar correctamente", err); 
      }
      const userId = result.insertId;
      return res.status(201).json({id: userId});
        
        
      });
  });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error);
  }
});

app.post("/login", (req, res) => {
const { email, password } = req.body;
if (!email || !password) {
  return res.status(400).json("Faltan datos obligatorios");
}
connection.query("SELECT * FROM usuarios WHERE email = ?", email, (err, result) => {
  if (err) {
    return res.status(500).json(err);
  }
  if(result.length === 0 || !result) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
   }
  const usuario = result[0];
  if (!bcrypt.compareSync(password, usuario.password)) {
    return res.status(401).json("Usuario o contraseña incorrectos");
  }
  return res.status(200).json({ 
  id: usuario.ID,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email, 

  });
});
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});