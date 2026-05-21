import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const [rows] = await connection.execute('SELECT id, name, email, role, tipoConta FROM users ORDER BY id');
console.log('Usuários no banco:');
console.table(rows);

await connection.end();
