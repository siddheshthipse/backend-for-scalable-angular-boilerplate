//This file contains our main code i.e application
const express = require("express");
const app = express();
const http = require('http').Server(app);
const io = require("socket.io")(http, {
    cors: {
      origin: "http://localhost:4200",
      methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const methodOverride = require("method-override");
const passport = require("passport");
const util = require("util");
const OutlookStrategy = require("passport-outlook").Strategy;

require("./db/conn");
const User = require("./models/users");


var OUTLOOK_CLIENT_ID = "eb3c0985-4ec9-4335-911c-19504d5b76da";
var OUTLOOK_CLIENT_SECRET = "~7C3~e8nqHf4_Elvdn1e25O4x_Z5lvjaXf";

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(
  new OutlookStrategy(
    {
      clientID: OUTLOOK_CLIENT_ID,
      clientSecret: OUTLOOK_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
        console.log("Inside Process Tick");
        console.log(profile);
        User.findOne({ email: profile.emails[0].value }).then((returnData) => {
          if (returnData) {
            console.log(profile.displayName + " has logged in");
          } else {
            console.log(profile.emails[0].value);
            console.log(
              "Invalid credentials, please contact your respective admin"
            );
          }
        });
        return done(null, profile);
      });
    }
  )
);

app.use(cookieParser());
app.use(express.json()); //use to fetch data in json format
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(methodOverride());
app.use(session({ secret: "keyboard cat" }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/outlook",passport.authenticate("windowslive", {
    scope: [
      "openid",
      "profile",
      "offline_access",
      "https://outlook.office.com/Mail.Read",
    ],
  }),
  function (req, res) {
    // The request will be redirected to Outlook for authentication, so
    // this function will not be called.
  }
);

app.get(
  "/auth/callback",
  passport.authenticate("windowslive", { failureRedirect: "/ipl" }),
  function (req, res) {
    console.log("Inside the Callback function");
    res.redirect("http://localhost:4200");
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/')
}

//API Part
app.get("/home", (req, res) => {
  console.log("This is the awesome cookie");
  console.log(req.cookies.session_id);
  res.send("Welcome Home");
});

app.get("/ipl", (req, res) => {
  console.log("Inside IPL");
  res.status(200).json({ message: "Failure redirect route" });
});

//Fetching all Users
app.get("/users", (req, res) => {
  User.find((err, returnData) => {
    if (err) {
      console.log("Error in fetching Users");
    } else {
      res.status(200).send(returnData);
    }
  });
});

//Fetching Single User
app.get("/users/:id", (req, res) => {
  const userid = req.params.id;
  User.findById(userid, (err, returnData) => {
    if (err) {
      console.log("Error in fetching data");
    } else {
      console.log("User found");
      console.log(returnData);
      res.status(201).send(returnData);
    }
  });
});

//User Login
app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const userData = await User.findOne({ email: email });

  const token = await userData.generateAuthToken();
  console.log("Generated token is:-");
  console.log(token);

  if (password === userData.password) {
    // console.log('Login cookie')
    // res.cookie('login_token',token,{
    //     expires:new Date(Date.now()+90000)
    // });

    console.log("Welcome Here User");
    console.log("The user info is:-");
    console.log(userData);
    res.send(userData);
  } else {
    res.status(401).json({ message: "Wrong Password" });
  }
});

//Change Language
app.put('/changelang/:id',async (req,res)=>{
  const _id=req.params.id;

  console.log('Change requested');
  User.findByIdAndUpdate(req.params.id,{$set:req.body},{new:true}, function(err, result){
    if(err){
        console.log(err);
    }
    console.log(req.body);
    console.log(result);
    // res.send('Settings Updated');
    res.status(200);
  });
})

//Is Authenticated
app.get("/verifyuser", verifyToken, (req, res) => {
  console.log("Token Verified");
  res.status(201).json({ message: "User Verified" });
});

function verifyToken(req, res, next) {
  if (!req.headers.authorization) {
    console.log("Header Error");
    return res.status(403).send("Bad request");
  }

  let token = req.headers.authorization.split(" ")[1];
  console.log(req.headers.authorization);
  console.log(`the token is:-${token}`);
  if (token === "null") {
    res.status(401).send("Unauthorized request");
  }

  const decodeddata = jwt.verify(
    token,
    "appleorangelemonpineapplewatermelonguavacherry"
  );
  console.log(decodeddata);
  if (decodeddata) {
    next();
  } else {
    res.status(401).send("Unauthorized request");
  }
}

//Creating a New User
app.post("/users", async (req, res) => {
  const newUser = new User({
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    setting:{
      language:"en",
      dateformat:"d/M/yy"
    }
  });

  const token = await newUser.generateAuthToken();
  console.log("Generated token is:-");
  console.log(token);

  // console.log('register cookie')
  // res.cookie('register_token',token,{
  //     expires:new Date(Date.now()+90000)
  // });

  await newUser.save((err, returnData) => {
    if (err) {
      console.log("Failed to add New User");
      res.status(501).json({ message: "Internal Server Error" });
    } else {
      console.log("User registered successfully");
      io.emit('user register', 'SocketIO:Account created successfully');
      res.send(newUser);
    }
  });
});

//Deleting a User
app.delete("/users/:id", (req, res) => {
  const userid = req.params.id;
  User.findByIdAndRemove(userid, (err, returnData) => {
    if (err) {
      console.log("User with given ID does not exist");
      res.status(404).send("User with given ID does not exist");
    } else {
      console.log("User deleted");
      res.send(returnData);
    }
  });
});

//Setting a backend cookie
// app.get('/signin',(req,res)=>{
//     res.cookie('token', 'wandavision', {
//         maxAge: new Date() * 0.001 + 300,
//     });
//     console.log('Cookie lala');
//     res.status(200).json({message:'Cookie Set'});
// })

//Error Simulation
app.get("/badrequest", (req, res) => {
  res.status(400).send("BAD REQUEST ERROR");
});

app.get("/resourceNotFound", (req, res) => {
  res.status(404).send("RESOURCE NOT FOUND");
});

app.get("/internalServerError", (req, res) => {
  res.status(500).send("INTERNAL SERVER ERROR");
});

//Listening to the port
http.listen(port, () => {
  console.log(`Connected at port ${port}`);
});

//SocketIO
io.on('connection', (socket) => {
  console.log(`A user with ID:-${socket.id} connected`);

  socket.on('client message', msg => {
    console.log(msg);
    if(msg=='Hello Server'){
        io.emit('server message', 'Hi Siddhesh');
    }else if(msg=='Bye'){
        io.emit('server message', 'Will miss you');
    }
  });

  socket.on('disconnect', () => {
    console.log(`User with ID:-${socket.id} disconnected`);
  });
});
