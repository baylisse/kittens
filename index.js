
const bcrypt = require('bcrypt');
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const { User } = require('./db');

const SALT_COUNT = 12;
//const {JWT_SECRET = 'abc123'} = process.env;

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error)
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware

// const setUser = async (req, res, next) => {
//   const auth = req.header("Authorization");
//   if (!auth) {
//     res.sendStatus(401);
//   } else {
//     const [, token] = auth.split(" ");
//     const decrypt = jwt.verify(token, JWT_SECRET);
//     const user = await User.findOne({ where: { username: decrypt.username } });
//     req.user = user;
//     next();
//   }
// };

// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password

app.post("/register", setUser, async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, SALT_COUNT);

  await User.create({
    username: username,
    password: hash,
  });

  res.status(200).send({
    message: "success",
    token
  });
});

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB
app.post("/login", setUser, async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findAll({
    where: { username: username },
    limit: 1,
  });

  const isFound = await bcrypt.compare(password, user[0].password);

  if (isFound) {
    res.status(200).send({
        message: "success",
        token
      });
  } else {
    res.status(401).send("Unauthorized");
  }
});

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id
app.get("/kittens/:id", setUser, async (req, res, next) => {
  const cat = await Kitten.findByPk(req.params.id);
  const user = req.user;
  if (user.id === cat.ownerId) {
    res.send(cat);
  } else {
    res.sendStatus(401);
  }
});

// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color

app.post("/kittens", setUser, async (req, res, next) => {
  const user = req.user;
  if (user) {
    const { name, age, color } = req.body;
    const cat = await Kitten.create({ age, color, name, ownerId: user.id });
    res.status(201).send({ name: cat.name, age: cat.age, color: cat.color });
  } else {
    res.sendStatus(401);
  }
});

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id

app.delete("/kittens/:id", setUser, async (req, res, next) => {
  const cat = await Kitten.findByPk(req.params.id);
  const user = req.user;
  if (!user) {
    res.sendStatus(401);
  }
  if (user.id === cat.ownerId) {
    await cat.destroy();
    res.send({ message: "success" }).sendStatus(204);
  } else {
    res.sendStatus(401);
  }
});

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;