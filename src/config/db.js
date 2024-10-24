

const mysql = require('mysql2/promise');

// Configure suas credenciais de conexão aqui
const db = mysql.createPool({
    host: "eon-database.cz0u0aqciatk.sa-east-1.rds.amazonaws.com",
    user: "digital",
    password: "Dmakers123",
    database: "digital",
    port: 3306,
});

module.exports = db;
