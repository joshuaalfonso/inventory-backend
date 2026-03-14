import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { brandRoute } from './module/brand/brand.route.js'
import { testConnection } from './config/connection.js';
import { prettyJSON } from 'hono/pretty-json';
import { cors } from 'hono/cors';

const app = new Hono();

await testConnection();

app.use("*", prettyJSON());

app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
)

app.get('/', (c) => {
  return c.text('Hello!') 
});


app.route('/brand', brandRoute)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
