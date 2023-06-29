const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const ws = require('ws');

dotenv.config();
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    // Connection successful, do something here
  } catch (error) {
    // Connection failed, handle the error
    throw error;
  }
}

connectToDatabase();


const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  credentials: true,
  origin: 'http://localhost:5173',
}));

app.get('/test' , (req,res) => {
  res.json('test ok');
});

app.get('/profile', (req,res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json('no token');
  }
});

app.post('/login', async (req,res) => {
  const {username, password} = req.body;
  const foundUser = await User.findOne({username});
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign({userId:foundUser._id,username}, jwtSecret, {}, (err, token) => {
        res.cookie('token', token, {sameSite:'none', secure:true}).json({
          id: foundUser._id,
        });
      });
    }
  }
});



app.post('/register', async (req,res) => {
  const {username,password} = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username:username,
      password:hashedPassword,
    });
    jwt.sign({userId:createdUser._id,username}, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
        id: createdUser._id,
      });
    });
  } catch(err) {
    if (err) throw err;
    res.status(500).json('error');
  }
});

const server = app.listen(4000);

//since we want the id and username of the connected user stored in the cookies so we will
//grab them by decoding from the cookies.
const wss = new ws.WebSocketServer({server});
wss.on('connection',(connection, req) => {
  console.log(req.headers);
  const cookies = req.headers?.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(cookie => cookie.trim().startsWith('token='));
    if(tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if(token) {
        //Now we need to decode the token using jwt.
        jwt.verify(token, jwtSecret, {},(err, userData) => {
          if (err) throw err;
          const {userId, username} = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

});









// app.post('/register', async (req,res) => {
//   const {username,password} = req.body;
//   try {
//     const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
//     const createdUser = await User.create({
//       username:username,
//       password:hashedPassword,
//     });
    // jwt.sign({userId:createdUser._id,username}, jwtSecret, {}, (err, token) => {
    //   if (err) throw err;
    //   res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
    //     id: createdUser._id,
    //   });
    // });
//   } catch(err) {
//     if (err) throw err;
//     res.status(500).json('error');
//   }
// });