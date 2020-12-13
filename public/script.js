let socket = io();
let game, seat = 0, doubles = 1, points_idx = 2, mahjong_calculating = 0, self_mahjong_calculating = 0, overlay_diff = {scores: [0,0,0,0], table: 0, calls: [0,0,0,0]};
let round_display, stack_display, table_display, seat_display, player_displays, doubles_display, points_display, calc_score, discard_seat, overlay_display;
const points_numbers = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110], score_max = [0, 20, 20, 20, 20, 20, 30, 30, 40, 40, 40, 60, 60, 80];
const winds = ["東", "南", "西", "北"];
window.addEventListener("DOMContentLoaded", ()=>$("div#overlay").hide());
window.onload = ()=>{
	round_display = $("#round_display")[0];
	stack_display = $("#stack_display")[0];
	table_display = $("#table_display")[0];
	seat_display = $("#seat_display")[0];
	doubles_display = $("#doubles_display")[0];
	points_display = $("#points_display")[0];
	calc_score = $("#calc_score")[0];
	discard_seat = $("select#discard_seat")[0];
	player_displays = [$("#self_player_display").children("span"), $("#right_player_display").children("span"), $("#opposite_player_display").children("span"), $("#left_player_display").children("span")];
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
	$("button#other_func").on("touchstart", ()=>{
		overlay_diff = {scores: [0,0,0,0], table: 0, calls: game.calls.slice()};
		render_game();
		$("div#overlay").show();
	});
	$("button#overlay_confirm").on("touchstart", ()=>{
		let overlay_diff_total = overlay_diff.scores.reduce((s,c)=>s+c)+overlay_diff.table;
		if(overlay_diff_total==0){
			socket.emit("point", overlay_diff);
			$("div#overlay").hide();
		}
	});
	$("button#overlay_close").on("touchstart", ()=>{
		$("div#overlay").hide();
	});
	for(let i=0; i<4; i++){
		$("button#player"+String(i)+"_minus_1000").on("touchstart", ()=>{overlay_diff.scores[i]-=10; render_game()});
		$("button#player"+String(i)+"_minus_100").on("touchstart", ()=>{overlay_diff.scores[i]-=1; render_game()});
		$("button#player"+String(i)+"_plus_100").on("touchstart", ()=>{overlay_diff.scores[i]+=1; render_game()});
		$("button#player"+String(i)+"_plus_1000").on("touchstart", ()=>{overlay_diff.scores[i]+=10; render_game()});
		$("div#overlay_player"+String(i)+"_seat_name").on("touchstart", ()=>{overlay_diff.calls[i]^=1; render_game()});
	}
	$("button#table_minus_1000").on("touchstart", ()=>{overlay_diff.table-=10; render_game()});
	$("button#table_minus_100").on("touchstart", ()=>{overlay_diff.table-=1; render_game()});
	$("button#table_plus_100").on("touchstart", ()=>{overlay_diff.table+=1; render_game()});
	$("button#table_plus_1000").on("touchstart", ()=>{overlay_diff.table+=10; render_game()});
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
			discard_seat.disabled=false;
		}else{
			discard_seat.value=-1;
			discard_seat.disabled=true;
		}
	}else{
		$("button#confirm_mahjong").addClass("disabled");
		discard_seat.value=-1;
		discard_seat.disabled=true;
	}
	let [ret, diff]=calc_mahjong_score(!mahjong_calculating, seat, points_idx, doubles, parseInt(discard_seat.value));
	if(ret == 0){
		calc_score.innerHTML = diff.scores[seat]+"00";
	}
	change_seat(0);
}
function change_seat(value){
	seat=(seat+value)%4;
	seat_display.innerHTML = winds[seat];
	for(let i=0; i<4; i++){
		player_displays[i][0].innerHTML=winds[(seat+i)%4]+" "+game.names[(seat+i)%4]+(i==0?'<i class="material-icons em-1">edit</i>':'');
		$("div#overlay_player"+String(i)+"_seat_name").html(winds[i]+" "+game.names[i]);
		$("div#overlay_player"+String(i)+"_score").html(game.scores[i]*100);
		$("div#overlay_player"+String(i)+"_diff").html((overlay_diff.scores[i]>0?"+":"")+overlay_diff.scores[i]*100);
		if(overlay_diff.calls[i]){
			$("div#overlay_player"+String(i)+"_seat_name").css("borderLeft", "solid 5px red");
		}else{
			$("div#overlay_player"+String(i)+"_seat_name").css("borderLeft", "solid 5px white");
		}
		if(game.calls[(seat+i)%4]){
			player_displays[i][0].classList.add("called");
		}else{
			player_displays[i][0].classList.remove("called");
		}
		player_displays[i][1].innerHTML = game.scores[(seat+i)%4]*100;
	}
	$("div#overlay_table_seat_name").html("供託");
	$("div#overlay_table_score").html(game.table*100);
	$("div#overlay_table_diff").html((overlay_diff.table>0?"+":"")+overlay_diff.table*100);
	let overlay_diff_total = overlay_diff.scores.reduce((s,c)=>s+c)+overlay_diff.table;
	$("div#overlay_diff_total").html((overlay_diff_total>0?"+":"")+overlay_diff_total*100);
	if(overlay_diff_total==0){
		$("div#overlay_diff_total_ok").html("OK");
		$("button#overlay_confirm").removeClass("disabled");
	}else{
		$("div#overlay_diff_total_ok").html("NG");
		$("button#overlay_confirm").addClass("disabled");
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
		[ret, diff] = calc_mahjong_score(false, seat, points_idx, doubles, (seat+target)%4);
		if(ret < 0){
			alert("illegal seat or point");
			return;
		}
	}
	diff.calls=[false,false,false,false];
	self_mahjong_calculating=false;
	mahjong_calculating=false;
	socket.emit("point", diff);
}