import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { brandRoute } from './module/brand/brand.route.js'
import { testConnection } from './config/connection.js';
import { prettyJSON } from 'hono/pretty-json';
import { cors } from 'hono/cors';
import { ZodError } from 'zod/v3';
import { categoryRoute } from './module/category/category.route.js';
import { itemTypeRoute } from './module/item-type/item-type.route.js';
import { unitOfMeasureRoute } from './module/unit-of-measure/unit-of-measure.route.js';
import { itemRoute } from './module/item/item.route.js';
import { departmentRoute } from './module/department/department.route.js';

const app = new Hono();

await testConnection();

app.use("*", prettyJSON());

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
)

app.get('/', (c) => {
  return c.text('Hello!') 
});


app.route('item', itemRoute);
app.route('brand', brandRoute);
app.route('category', categoryRoute);
app.route('item-type', itemTypeRoute);
app.route('unit-of-measure', unitOfMeasureRoute);
app.route('department', departmentRoute);

serve({ 
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})


