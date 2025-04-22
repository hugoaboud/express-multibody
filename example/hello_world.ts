import express from 'express';
import multibody from 'express-multibody';

const app = express();
app.use(multibody());

app.post('/', (req, res) => {
    console.log(JSON.stringify(req.body, undefined, 2));
    res.send(req.body);
});

app.listen(3420, () => {
    console.log('Loopback server running at http://localhost:3420');
    console.log('Make a POST call with either JSON of FormData and check the console');
});
