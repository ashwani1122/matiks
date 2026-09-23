import express, { type Express, type Request, type Response } from 'express';
import { authRoute } from './routes/auth.route.ts';
import cors from "cors";


const app: Express = express();
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );

app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  
    res.send('Hello World!');

});




app.use("/api/v1/auth", authRoute);

// app.use("/api/v1/")

app.listen(4000, () => {
  console.log('Server is running on http://localhost:4000');
})