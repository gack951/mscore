let socket = io();
let game, seat = 0, doubles = 1, points_idx = 2, mahjong_calculating = 0, self_mahjong_calculating = 0;
let round_display, stack_display, table_display, seat_display, player_displays, doubles_display, points_display, calc_score;
const points_numbers = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110], score_max = [0, 20, 20, 20, 20, 20, 30, 30, 40, 40, 40, 60, 60, 80];
const winds = ["東", "南", "西", "北"];
window.onload = ()=>{
	round_display = $("#round_display")[0];
	stack_display = $("#stack_display")[0];
	table_display = $("#table_display")[0];
	seat_display = $("#seat_display")[0];
	doubles_display = $("#doubles_display")[0];
	points_display = $("#points_display")[0];
	calc_score = $("#calc_score")[0];
	player_displays = [$("#self_player_display").children(), $("#right_player_display").children(), $("#opposite_player_display").children(), $("#left_player_display").children()];
	$("button").on({"touchstart":(e)=>$(e.target).addClass("hover"), "touchend":(e)=>$(e.target).removeClass("hover")});
	$("button#round_minus").on("touchstart", ()=>socket.emit("round", -1));
	$("button#round_plus").on("touchstart", ()=>socket.emit("round", 1));
	$("button#stack_zero").on("touchstart", ()=>socket.emit("stack", 0));
	$("button#stack_minus").on("touchstart", ()=>socket.emit("stack", -1));
	$("button#stack_plus").on("touchstart", ()=>socket.emit("stack", 1));
	$("button#seat_minus").on("touchstart", ()=>change_seat(3));
	$("button#seat_plus").on("touchstart", ()=>change_seat(1));
	$("button#doubles_minus").on("touchstart", ()=>{doubles=doubles>1?doubles-1:doubles; render_game()});
	$("button#doubles_plus").on("touchstart", ()=>{doubles=doubles<13?doubles+1:doubles; render_game()});
	$("button#points_minus").on("touchstart", ()=>{points_idx=points_idx>0?points_idx-1:points_idx; render_game()});
	$("button#points_plus").on("touchstart", ()=>{points_idx=points_idx<10?points_idx+1:points_idx; render_game()});
	$("button#reset").on("touchstart", ()=>socket.emit("reset"));
	$("button#get").on("touchstart", ()=>socket.emit("get"));
	$("button#call").on("touchstart", ()=>socket.emit("call", seat));
	$("button#mahjong").on("touchstart", ()=>{self_mahjong_calculating=0; mahjong_calculating^=1; render_game()});
	$("button#self_mahjong").on("touchstart", ()=>{mahjong_calculating=0; self_mahjong_calculating^=1; render_game()});
	$("button#confirm_mahjong").on("touchstart", ()=>{confirm_mahjong()});
	$("button#confirm_mahjong").addClass("disabled");
	$("div#self_player_display").on("touchstart", ()=>{
		let name = window.prompt("ユーザー名:", game.names[seat]);
		if(name != null && name != ""){
			socket.emit("name", {seat: seat, name: name});
		}
	});
	socket.on("game", g=>{
		// console.log(g);
		game = g;
		render_game();
	});
	socket.on("error", e=>{
		console.log(e);
	});
	socket.on("next_seat", v=>{
		seat = (seat+(v==1?3:1))%4;
	});
	socket.emit("get");
};
function render_game(){
	round_display.innerHTML = winds[Math.floor(game.round/4)]+String(game.round%4+1);
	stack_display.innerHTML = game.stack;
	table_display.innerHTML = game.table*100;
	doubles_display.innerHTML = doubles;
	points_display.innerHTML = points_numbers[points_idx];
	if(mahjong_calculating || self_mahjong_calculating){
		$("button#confirm_mahjong").removeClass("disabled");
		if(mahjong_calculating){
			$("select#discard_seat")[0].disabled=false;
		}else{
			$("select#discard_seat")[0].value=-1;
			$("select#discard_seat")[0].disabled=true;
		}
	}else{
		$("button#confirm_mahjong").addClass("disabled");
		$("select#discard_seat")[0].value=-1;
		$("select#discard_seat")[0].disabled=true;
	}
	let [ret, diff]=calc_mahjong_score(!mahjong_calculating, seat, points_idx, doubles, parseInt($("select#discard_seat")[0].value));
	if(ret == 0){
		calc_score.innerHTML = diff.scores[seat]+"00";
	}
	change_seat(0);
}
function change_seat(value){
	seat=(seat+value)%4;
	seat_display.innerHTML = winds[seat];
	for(let i=0; i<4; i++){
		player_displays[i][0].innerHTML=winds[(seat+i)%4]+" "+game.names[(seat+i)%4];
		if(game.calls[i]){
			player_displays[i][0].classList.add("called");
		}else{
			player_displays[i][0].classList.remove("called");
		}
		player_displays[i][1].innerHTML=game.scores[(seat+i)%4]+"00";
	}
}
function calc_mahjong_score(is_self, seat, points_idx, doubles, target = -1){
	let diff = {scores: [0,0,0,0], table:0};
	if(is_self){	// ツモ
		if(seat >= 0 && seat <= 3 && points_idx >= 0 && points_idx <= 10 && doubles >= 1 && doubles <= 13){
			if(seat == 0){	//親ツモ
				let score = Math.min(Math.ceil(points_numbers[points_idx]*(2**(2+doubles))/100*2), score_max[doubles]*2);
				diff.scores[0] += (score+game.stack)*3+game.table;
				diff.scores[1] -= score+game.stack;
				diff.scores[2] -= score+game.stack;
				diff.scores[3] -= score+game.stack;
				diff.table -= game.table;
			}else{	// 子ツモ
				let score = Math.min(Math.ceil(points_numbers[points_idx]*(2**(2+doubles))/100*2), score_max[doubles]*2);
				diff.scores[seat] += score*2+game.stack*3+game.table;
				diff.scores[0] -= score+game.stack;
				diff.scores[(seat+1)%3+1] -= Math.ceil(score/2)+game.stack;
				diff.scores[(seat+3)%3+1] -= Math.ceil(score/2)+game.stack;
				diff.table -= game.table;
			}
		}else{
			return [-1, null];
		}
	}else{	// ロン
		if(seat >= 0 && seat <= 3 && target >= 0 && target <= 3 && seat != target && points_idx >= 0 && points_idx <= 10 && doubles >= 1 && doubles <= 13){
			if(seat == 0){	//親ロン
				let score = Math.min(Math.ceil(points_numbers[points_idx]*(2**(2+doubles))/100*6), score_max[doubles]*6);
				diff.scores[0] += score+game.stack*3+game.table;
				diff.scores[target] -= score+game.stack*3;
				diff.table -= game.table;
			}else{	// 子ロン
				let score = Math.min(Math.ceil(points_numbers[points_idx]*(2**(2+doubles))/100*4), score_max[doubles]*4);
				diff.scores[seat] += score+game.stack*3+game.table;
				diff.scores[target] -= score+game.stack*3;
				diff.table -= game.table;
			}
		}else{
			return [-1, null];
		}
	}
	return [0, diff];
}
function confirm_mahjong(){
	let diff;
	if($("button#confirm_mahjong").hasClass("disabled") || (!self_mahjong_calculating && !mahjong_calculating)){
		alert("not calculating");
		return;
	}
	if(self_mahjong_calculating){	// ツモ
		let ret;
		[ret, diff] = calc_mahjong_score(true, seat, points_idx, doubles);
		if(ret < 0){
			alert("illegal seat or point");
			return;
		}
	}else{	// ロン
		let target=$("select#discard_seat")[0].value;
		if(target<0){
			alert("target not selected");
			return;
		}
		let ret;
		[ret, diff] = calc_mahjong_score(false, seat, points_idx, doubles, target);
		if(ret < 0){
			alert("illegal seat or point");
			return;
		}
	}
	diff.calls=[false,false,false,false];
	socket.emit("point", diff);
}