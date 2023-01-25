import express, {Express} from 'express';

const app:Express = express();

app.use((_, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

app.use(express.static('dist/public'));

app.listen(9000);
console.log('App listening on port 9000');