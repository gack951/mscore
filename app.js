var express = require('express');
var app = express();
var http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 59463;

let game = {
	round: 0,	// 東1局～北4局: 0-15
	stack: 0,	// 0本場～: 0-
	table: 0,	// 供託: 0-
	names: ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"],
	scores: [250, 250, 250, 250],
	calls: [0, 0, 0, 0],
}

app.use("/", express.static('public'));

io.on('connection',socket=>{
	console.log("connected: "+socket.id+" ("+socket.handshake.address+")");
	socket.on("get", ()=>{
		io.to(socket.id).emit("game", game);
	});
	socket.on("reset", ()=>{
		if(game.round == 0 && game.stack == 0 && game.table == 0 && game.scores.toString() == [250, 250, 250, 250].toString() && game.calls.toString() == [0, 0, 0, 0].toString()){
			game.names = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"];
		}else{
			game.round = 0;
			game.stack = 0;
			game.table = 0;
			game.scores = [250, 250, 250, 250];
			game.calls = [0, 0, 0, 0];
		}
		io.emit("game", game);
	});
	socket.on("name", player=>{
		if(player.seat >= 0 && player.seat <= 3 && typeof(player.name) == "string"){
			game.names[player.seat] = player.name;
		}else{
			io.to(socket.id).emit("error", player);
			return;
		}
		io.emit("game", game);
	});
	socket.on("round", value=>{
		if(value==1){
			game.round = (game.round + 1) % 16;
			game.names = [game.names[1], game.names[2], game.names[3], game.names[0]];
		}else if(value==-1){
			game.round = (game.round + 15) % 16;
			game.names = [game.names[3], game.names[0], game.names[1], game.names[2]];
		}else{
			io.to(socket.id).emit("error", value);
			return;
		}
		io.emit("next_seat", value);
		io.emit("game", game);
	});
	socket.on("stack", value=>{
		if(value==1){
			game.stack += 1;
		}else if(value==-1 && game.stack>0){
			game.stack -= 1;
		}else if(value==0){
			game.stack =0;
		}else{
			io.to(socket.id).emit("error", value);
			return;
		}
		io.emit("game", game);
	});
	socket.on("call", seat=>{
		if(seat >= 0 && seat <= 3 && !game.calls[seat]){
			game.calls[seat] = true;
			game.scores[seat] -= 10;
			game.table += 10;
		}else{
			io.to(socket.id).emit("error", seat);
			return;
		}
		io.emit("game", game);
	});
	socket.on("point", diff=>{
		if(diff.scores.reduce((s,c)=>s+c)+diff.table!=0){
			io.emit("error",diff);
			return;
		}
		for(let i=0; i<4; i++){
			game.scores[i] += diff.scores[i];
			game.calls[i] = diff.calls[i];
		}
		game.table += diff.table;
		io.emit("game", game);
	});
});

http.listen(PORT, ()=>{
		console.log('server listening. Port:' + PORT);
});

console.log(game);