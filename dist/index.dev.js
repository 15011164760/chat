"use strict";

var express = require('express');

var app = require('express')();

var http = require('http').Server(app);

var io = require('socket.io')(http);

var bodyParser = require('body-parser'); // 创建 application/x-www-form-urlencoded 编码解析


var urlencodedParser = bodyParser.urlencoded({
  extended: false
});

var MongoClient = require('mongodb').MongoClient;

var _require = require('console'),
    Console = _require.Console;

var url = "mongodb://localhost:27017/runoob"; //操作数据库封装

function loadDb(callback, params, dbCollectionMethod) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    console.log("数据库已创建!");
    var dbase = db.db("chat");
    callback(db, dbase, params, dbCollectionMethod);
  });
} //静态


app.use('/public', express["static"]('public')); //用户页面

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
}); //获取用户列表 urlencodedParser, 

app.get('/chat/getUserList', function (req, res) {
  console.log("req.query===", req.query);
  var _req$query = req.query,
      username = _req$query.username,
      password = _req$query.password;

  if (username == 'admin' && password == 'admin') {
    //  res.end(data.first_name);
    loadDb(function (db, dbase) {
      dbase.collection("userList").find().toArray(function (err, result) {
        if (err) {
          var data = {
            code: 100,
            message: '请求失败',
            data: err
          };
          res.send(data);
        } else {
          console.log("result========>", result);
          var _data = {
            code: 200,
            message: '请求成功',
            data: result
          };
          res.send(_data);
          db.close();
        }
      });
    });
  } else {
    res.end("参数错误");
  }
}); //聊天记录查看

app.get('/chat/findUserChatMsg', function (req, res) {
  console.log("req.query===", req.query);
  loadDb(function (db, dbase) {
    dbase.collection("saveUserChatMsg").find({
      id: req.query.id
    }).toArray(function (err, result) {
      if (err) {
        var data = {
          code: 100,
          message: '请求失败',
          data: err
        };
        res.send(data);
      } else {
        console.log("result========>", result);
        var _data2 = {
          code: 200,
          message: '请求成功',
          data: result
        };
        res.send(_data2);
        db.close();
      }
    });
  });
}); //聊天记录存储 

app.post('/chat/saveUserChatMsg', urlencodedParser, function (req, res) {
  console.log("req.body.urlencoded===", req.body);
  loadDb(function (db, dbase) {
    var params = JSON.parse(req.body.sendObj);
    console.log("params===>", params);
    dbase.collection("saveUserChatMsg").insertOne(params, function (err, result) {
      if (err) {
        var data = {
          code: 100,
          message: '请求失败',
          data: err
        };
        res.send(data);
      } else {
        console.log("result========>", result);
        var _data3 = {
          code: 200,
          message: '请求成功',
          data: result
        };
        res.send(_data3);
        db.close();
      }
    });
  });
}); //客服页面

app.get('/online', function (req, res) {
  res.sendFile(__dirname + '/onlineService.html');
});
var userList = [];
io.on('connection', function (socket) {
  console.log('a user connected', socket.id);
  socket.on('disconnect', function () {
    console.log('user disconnected'); //用户下线

    userList = userList.filter(function (item) {
      return item.id != socket.id;
    });
    io.emit('loginOut', userList);
  }); //存储用户

  socket.emit('postUsername', socket.id); //加用户

  socket.on('login', function (msg) {
    userList.push(msg);
    msg.time = new Date().toLocaleString();
    loadDb(function (db, dbase, params, dbCollectionMethod) {
      dbase.collection("userList")[dbCollectionMethod](params, function (err, res) {
        if (err) throw err;
        console.log("文档插入成功");
        db.close();
      });
    }, msg, "insertOne");
    console.log("userList", userList); //获取在线的人数的列表数据

    io.emit('getAllList', userList);
  }); //有人打开页面就更新在线人数列表

  socket.on('addUser', function (msg) {
    //有人打开页面就更新缓存 删除之前的数据
    // userList=userList.filter(item=>item.id!==msg.removeMsgId);
    //对数据更新之后加入
    // userList.push(msg);
    //获取在线的人数的列表数据
    io.emit('getAllList', userList);
  });
  socket.on('chat message', function (msg) {
    console.log('message: ' + msg); //客服接收

    io.emit('servicePeople', msg);
  }); //单发给某个人

  socket.on('toOne', function (msgObj) {
    console.log(msgObj, "========msgObj"); //客服接收

    io.emit('toOne', msgObj); // let arr=Array.from(io.sockets.sockets);
    // console.log(arr)
    // var toSocket=arr.filter(id=>id==msgObj.to);
    // toSocket.emit('toOne',msgObj);
  });
});
var server = http.listen(1991, function () {
  console.log('listening on *:1991');
  var host = server.address().address;
  var port = server.address().port;
  console.log("应用实例，访问地址为 http://%s:%s", host, port);
});