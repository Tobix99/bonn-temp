var mqtt = require('mqtt')
var mysql = require('mysql2');
var http = require('http');
var fs = require('fs');
var WebSocket = require('ws')

var DEBUG = false
port = 80
if(DEBUG) {
    port = 8080
}

var firstRun = true;

var client = mqtt.connect('mqtt://10.10.2.5', {
    username: 'node_temp_server',
    password: Buffer.from('qFdp5c56x5BKhvEAy8')
})

var mysqlconn = mysql.createConnection({host: '10.10.2.5', user: 'temp', password: 'XqbUW7tnMa4h9hdvRK', database: 'temp_bonn', port: 4276});

mysqlconn.connect();

function initTables(){
    if(firstRun){
        firstRun = false;
        mysqlconn.query("SHOW TABLES LIKE 'temp_room'", function (error, results, fields) {
            if (error) 
                throw error;
            if(results.length == 0) {
                console.log("table not exists")
        
                mysqlconn.query("CREATE TABLE temp_room (tempID int NOT NULL AUTO_INCREMENT, intime DATETIME, temp float, PRIMARY KEY (tempID))", function (error, results, fields) {
                    if (error) 
                        throw error;
                });
            }
        });
        
        mysqlconn.query("SHOW TABLES LIKE 'hum_room'", function (error, results, fields) {
            if (error) 
                throw error;
            if(results.length == 0) {
                console.log("table not exists")
        
                mysqlconn.query("CREATE TABLE hum_room (humID int NOT NULL AUTO_INCREMENT, intime DATETIME, humidity float, PRIMARY KEY (humID))", function (error, results, fields) {
                    if (error) 
                        throw error;
                });
            }
        });
    }
    
}



client.on('connect', function (err) {
    console.log(err)
    client.subscribe('bonn_temp/sensor/bonn_temperature/state', function (err) {
        if (! err) {
            //console.log("Subscribed to bonn_temp/sensor/bonn_temperature/state")
        }
    })
    client.subscribe('bonn_temp/sensor/bonn_humidity/state', function (err) {
        if (! err) {
            //console.log("Subscribed to bonn_temp/sensor/bonn_humidity/state")
        }
    })
})

client.on('message', function (topic, message) { // message is Buffer
    console.log(topic + ": " + message.toString())

    initTables();
    
    if(topic == "bonn_temp/sensor/bonn_temperature/state") {
        for (let conn of wsserver.clients) {
            var currTime = new Date().toISOString();
            var sendOBJ = {"resp": "getTemp", "intime": currTime, "temp": parseFloat(message.toString())}
            conn.send(JSON.stringify(sendOBJ))
        }
        mysqlconn.query("INSERT INTO temp_room (intime, temp) VALUES (NOW(), ?)", parseFloat(message.toString()), function (error, results, fields) {
            if (error) 
                throw error;
        });
    }else if(topic == "bonn_temp/sensor/bonn_humidity/state") {
        mysqlconn.query("INSERT INTO hum_room (intime, humidity) VALUES (NOW(), ?)", parseFloat(message.toString()), function (error, results, fields) {
            if (error) 
                throw error;
        });

    }
})


var webserver = http.createServer(function(request, response) {

    switch (request.url) {
        case "/":
            fs.readFile(__dirname + "/index.html", function(err, data) {  
                response.writeHead(200, {  
                    'Content-Type': 'text/html'  
                });  
                response.write(data);  
                response.end();  
            });
            break;
        case "/favicon.ico":
            fs.readFile(__dirname + "/fav.png", function(err, data) {  
                response.writeHead(200, {  
                    'Content-Type': 'image/png'  
                });  
                response.write(data);  
                response.end();  
            });
            break;
        default:
            response.writeHead(401, {  
                'Content-Type': 'text/html'  
            });  
            response.write("Not found!");  
            response.end();  
            break;
    }
});

const wsserver = new WebSocket.Server({server: webserver.listen(port)});

wsserver.on('connection', conn => {
    console.log("New connection")
    conn.on("message", function (input) {
        //console.log("Received "+input)
        switch (input) {
            case "getallTemp":
                getTemp(function(allTemps) {
                    for (index = 0; index < allTemps.length; ++index) {
                        var sendOBJ = {"resp": "getTemp", ...allTemps[index]}
                        conn.send(JSON.stringify(sendOBJ));
                    }
                })
                
                break;
        
            default:
                break;
        }
    })
    conn.on("close", function (code, reason) {
        console.log("Connection closed, " + reason)
    })
});

function getTemp(callback) {

    var date = new Date();
    stringDate = date.getFullYear() + "-" + pad(date.getMonth() + 1, 2) + "-" + pad(date.getDate(), 2) // 2020-05-16 23:59:59.999
    stringDatein = stringDate + " 00:00:00.00"
    stringDateOut = stringDate + " 23:59:59.999"

    mysqlconn.query({
        sql: 'SELECT intime, temp FROM temp_room WHERE intime BETWEEN ? AND ? ORDER BY `temp_room`.`intime` ASC',
        timeout: 40000, // 40s
        values: [stringDatein, stringDateOut]
      }, function (error, results, fields) {
        if (error) 
            throw error;
        callback(results)
    });
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}