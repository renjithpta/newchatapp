var http = require("http");
var express = require("express");
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var app = express();
var fs = require('fs');
var events = require('events');
var eventEmitter = new events.EventEmitter();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Express CORS setup
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});
const MongoConfig = require('./config/mongodb.js');
mongoose.Promise = global.Promise;
mongoose.connect(MongoConfig.url,{ useMongoClient: true, connectTimeoutMS: 100000 });
mongoose.connection.openUri(MongoConfig.url)
.once('open', () => console.log('Database Connection Established Successfully!'))
  .on('error', (error) => {
    console.warn('Warning', error);
  });
	
	
//including models files
fs.readdirSync("./models").forEach(function(file){
  if(file.indexOf(".js")){
    require("./models/"+file);
  }
});

var server = app.listen(3000);

var io = require('socket.io').listen(server);

var path = __dirname + '/views/';

var usersCollection = [];

// Express routes
app.set("view engine", "vash");

app.get("*",function(req, res){
  res.render("index");
});

app.post("/usrlist",function(req, res){
  var clonedArray = usersCollection.slice();

  // Getting the userId from the request body as this is just a demo 
  // Ideally in a production application you would change this to a session value or something else
  var i = usersCollection.findIndex(x => x.id == req.body.userId);

  clonedArray.splice(i,1);

  res.json(clonedArray);
});

var oldChats;

// Socket.io operations
io.on('connection', function(socket){
  console.log('A user has connected to the server.');

  socket.on('join', function(username) {
    // Same contract as ng-chat.User
    usersCollection.push({  
      id: socket.id, // Assigning the socket ID as the user ID in this example
      displayName: username,
      status: 0, // ng-chat UserStatus.Online,
      avatar: null
    });

    socket.broadcast.emit("usrlist", usersCollection);

    console.log(username + " has joined the chat room.");

    // This is the user's unique ID to be used on ng-chat as the connected user.
    socket.emit("generatedUserId", socket.id);

    // On disconnect remove this socket client from the users collection
    socket.on('disconnect', function() {
      console.log('User disconnected!');

      var i = usersCollection.findIndex(x => x.id == socket.id);
      usersCollection.splice(i, 1);

      socket.broadcast.emit("usrlist", usersCollection);
   });
  });

  //emits event to read old chats from database.
   socket.on('old-chats', function(data) {
      eventEmitter.emit('read-chat', data);
    });

//sending old chats to client.
    oldChats = function(result, username, userId) {
	 console.log("history result");
	 console.log(result);
      io.to(userId).emit('old-chats', {
        result: result,
        userId: userId
      });
    }


  socket.on("sendMessage", function(message){
    console.log("Message received:");
    console.log(message);

    io.to(message.toId).emit("messageReceived", {
      user: usersCollection.find(x => x.id == message.fromId),
      message: message
    });
	  var userFrom=usersCollection.find(x => x.id == message.fromId);
	  var userTo= usersCollection.find(x => x.id == message.toId);
	  console.log("From user ");
      console.log(userFrom);
	  var userFromName='';
	  var userToName='';
	  if(userFrom)
		  userFromName =userFrom.displayName;
	  if(userTo)
            userToName =userTo.displayName;
	 
	  //emits event to save chat to database.
      eventEmitter.emit('save-chat', {
        msgFrom:userFromName,
        msgTo:userToName,
		msgFromId :message.fromId,
        msgToId : message.toId,
        msg: message.message,
        date: Date.now()
      });

    console.log("Message dispatched.");
  });
});
var chatModel = mongoose.model('Chat');
//database operations are kept outside of socket.io code.
  //saving chats to database.
  eventEmitter.on('save-chat', function(data) {

    // var today = Date.now();

    var newChat = new chatModel({

      msgFrom: data.msgFrom,
      msgTo: data.msgTo,
      msgFromId :data.msgFromId ,
      msgToId : data.msgToId,
      msg: data.msg,
      createdOn: data.date

    });
console.log(newChat);
    newChat.save(function(err, result) {
      if (err) {
        console.log("Error : " + err);
      } else if (result == undefined || result == null || result == "") {
        console.log("Chat Is Not Saved.");
      } else {
        console.log("Chat Saved.");
        //console.log(result);
      }
    });

  }); //end of saving chat.


  //reading chat from database.
  eventEmitter.on('read-chat', function(data) {

    chatModel.find({})
      .where('msgFrom').equals(data.msgFrom)
      .sort('-createdOn')
      .skip(data.msgCount)
      .lean()
      .limit(10)
      .exec(function(err, result) {
        if (err) {
          console.log("Error : " + err);
        } else {
          //calling function which emits event to client to show chats.
          oldChats(result, data.username, data.fromId);
        }
      });
  }); //end of reading chat from database.