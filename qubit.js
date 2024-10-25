'use strict';
{

const DEFAULT_FONT = "Roboto, Tahoma";
const BUTTON_COLOR = 0x80A09890;
const BUTTON_STYLE = bkColorToStr(0x80A09890);
const LIGHT_BUTTON_COLOR = bkColorMixRetainAlpha(BUTTON_COLOR, 0xFFFFFF);
const LIGHT_BUTTON_STYLE = bkColorToStr(LIGHT_BUTTON_COLOR);
const DARK_BUTTON_STYLE = bkColorToStr(0xFF000000 | bkColorMix(0, BUTTON_COLOR));

class Button {
	constructor(text, area) {
		this.coord = new BkCoord();
		this.text = text;
		this.area = area;
		this.uiText = new BkText(
			new BkCoord(0.05,0.1,0.9,0.8,7), text, DEFAULT_FONT);
	}
	
	draw() {
		let coord = this.screenCoord();
		const ctx = this.system.ctx;
		const isSelected = this.system.mouse.selObj === this;
		const glow = isSelected || this.system.mouse.hover === this;
		if (isSelected) coord = coord.resizeByShortFactor(0.9);
		
		/*
		bkDrawGlassButton(ctx, coord,
			glow ? LIGHT_BUTTON_COLOR : BUTTON_COLOR);
		*/
		
		bkDrawRoundRectangle(ctx, coord,
			glow ? LIGHT_BUTTON_STYLE : BUTTON_STYLE,
			glow ? BUTTON_STYLE : DARK_BUTTON_STYLE,
			0.25);
		
		ctx.fillStyle = isSelected ? '#000' : DARK_BUTTON_STYLE;
		this.uiText.draw(ctx, coord);
	}
	
	resize() {
		this.uiText.resize();
	}
}

// Inner product friendly
//const QBitText = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
// Bloch sphere friendly
const QBitText = ["↑", "→", "↓", "←", "↑", "→", "↓", "←"];

//const INV_SQRT_2 = 1 / Math.sqrt(2);
//const QBitValA = [0, INV_SQRT_2, 1, INV_SQRT_2, 0, -INV_SQRT_2, -1, -INV_SQRT_2];
//const QBitValB = [1, INV_SQRT_2, 0, -INV_SQRT_2, -1, -INV_SQRT_2, 0, INV_SQRT_2];

const QOperators = [
	{name : 'I', transition : [0, 1, 2, 3, 4, 5, 6, 7]},
	{name : 'X', transition : [2, 1, 0, 7, 6, 5, 4, 3]},
	{name : 'Z', transition : [4, 3, 2, 1, 0, 7, 6, 5]},
	//{name : '-I', transition : [4, 5, 6, 7, 0, 1, 2, 3]},
	//{name : '-iY', transition : [6, 7, 0, 1, 2, 3, 4, 5]},
	{name : 'H', transition : [3, 2, 1, 0, 7, 6, 5, 4]}
	]

// Calculate absolute inner product between machine state values a and b
// 01, 10, -+, +- : 0
// 00, 11, --, ++ : 1
// otherwise : 0.5
function QDotProduct(a, b){
	const state = (a - b) & 0x3;
	return state & 1 ? 0.5 : +!state;
}

let bkSystem;
let g_buttonsArea;
let g_braketArea;
let g_heapArea;
let g_tiles;
let g_textArea;

class TileCategory{
	constructor(color){
		this.color = color;
		this.lightColor = bkColorLighten(color);
		this.darkStyle = 'rgba(0,0,0,0.6)';
		this.braketStyle = bkColorToStr(bkColorMix31(color, 0));
		this.lightBraketStyle = bkColorToStr(bkColorMix31(this.lightColor, 0));
	}
}

const BraketCat = new TileCategory(0xC000C0F0);
const FixedBraketCat = new TileCategory(0xC0C0D8F0);
const OperatorCat = new TileCategory(0xC0F0C000);

function evaluateCards(tile) {
	const cards = tile ? g_braketArea.objects : [g_tiles[0], g_tiles[1]];
	if (tile) {
		if (g_braketArea === tile.area){
			cards.push(tile);
			cards.sort(function(a, b){return a.comparable - b.comparable;});
		} else {
			cards.splice(cards.indexOf(tile), 1);
		}
	}
	if (tile && tile.disableSelect) return;
	
	let stackText = '';
	let pairsText = '';
	let bra = null;
	let operators = [];
	let impossible = false;
	let halfCount = 0;
	
	for (const card of cards){
		if (card.ket !== null){
			
			if (stackText) stackText += ', ';
			stackText += QBitText[bra];
			
			let ket = card.ket;
			operators.reverse();
			for (const op of operators) ket = op.transition[ket];
			operators = [];
			stackText += QBitText[ket];
			if (pairsText) pairsText += ' · ';
			const pairProb = QDotProduct(bra, ket);
			pairsText += pairProb === 0.5 ? '½' : pairProb;
			if (!impossible)
			{
				if (pairProb === 0){
					impossible = true;
				} else if (pairProb !== 1) {
					++halfCount;
				}
			}
		}
		if (card.bra !== null){
			//if (stackText) stackText += ', ';
			//stackText += QBitText[card.bra];
			bra = card.bra;
		} 
		if (card.op !== null){
			//stackText += card.op.name;
			//bra = card.op.transition[bra];
			operators.push(card.op);
		}
	}

	pairsText += ' = ';
	pairsText += impossible ? '0' : '1';
	if (!impossible && halfCount) {
		pairsText += '/';
		pairsText += Math.pow(2, halfCount);
	}
	g_textArea.text = stackText + '\n' + pairsText;
}

class CardTile {
	constructor(id, bra, ket, op = null) {
		this.redrawOnHover = true;
		this.id = id;
		this.coord = new BkCoord();
		this.category = op ? OperatorCat : 
			(bra !== null && ket !== null) ? BraketCat : FixedBraketCat;
		this.disableSelect = bra === null ^ ket === null;
		this.bra = bra;
		this.ket = ket;
		this.op = op;
		this.ketText = bra !== null ? new BkText(new BkCoord(0.55,0.08,0.4,0.8,7),
			QBitText[bra], DEFAULT_FONT, 4, 0.5) : null;
		this.braText = ket !== null ? new BkText(new BkCoord(0.05,0.08,0.4,0.8,7),
			QBitText[ket], DEFAULT_FONT, 4, 0.5) : null;
		this.opText = op ? new BkText(new BkCoord(0,0.1,1,0.8,7),
			op.name, DEFAULT_FONT) : null;
	}
	
	draw() {
		const category = this.category;
		let coord = this.screenCoord();
		const ctx = this.system.ctx;

		const isSelected = this.system.mouse.selObj === this;
		const isHover = this === this.system.mouse.hover;
		if (isSelected) coord = coord.resizeByShortFactor(0.95);
		const itemColor = (isSelected || isHover) ? 
			category.lightColor : category.color;
		
		bkDrawGlassBoard(ctx, coord, itemColor, false, false);
		
		ctx.strokeStyle = (isSelected || isHover) ?
			category.lightBraketStyle : category.braketStyle;
		ctx.lineWidth = 1 + coord.h * 0.02;
		const h = coord.h * 0.3;
		const w = coord.w * 0.15;
		const sw = coord.w * 0.02;
		if ((this.braText)){
			ctx.beginPath();
			ctx.moveTo(coord.x - w, coord.y - h);
			ctx.lineTo(coord.x - sw, coord.y);
			ctx.lineTo(coord.x - w, coord.y + h);
			ctx.stroke();
		}
		if ((this.ketText)){
			ctx.beginPath();
			ctx.moveTo(coord.x + w, coord.y - h);
			ctx.lineTo(coord.x + sw, coord.y);
			ctx.lineTo(coord.x + w, coord.y + h);
			ctx.stroke();
		}
		
		ctx.fillStyle = '#000';
		if (this.braText){
			this.braText.draw(ctx, coord);
		}
		if (this.ketText){
			this.ketText.draw(ctx, coord);
		}
		if (!isSelected) ctx.fillStyle = category.darkStyle;
		if (this.opText) this.opText.draw(ctx, coord);
	}
	
	resize() {
		if (this.braText) this.braText.resize();
		if (this.ketText) this.ketText.resize();
		if (this.opText) this.opText.resize();
	}
	
	onmousedown(mouse) {
		if (!this.disableSelect){
			const doEvaluation = this.area === g_braketArea;
			if (this.undock()){
				if (doEvaluation) evaluateCards(this);
			}
		}
	}
	
	onmouseout(mouse) {
		this.onmouseup(mouse);
	}
	
	onmouseup(mouse) {
		if (this.dock(mouse.x, mouse.y)){
			if (this.area === g_braketArea) evaluateCards(this);
		} else {
			this.cancelUndock();
			if (this.area === g_braketArea) evaluateCards(this);
		}
	}
}

function resetGame(){
	for (const tile of g_tiles)
	{
		tile.undock();
		tile.comparable = tile.id;
		tile.dockToArea(tile.disableSelect ? g_braketArea : g_heapArea);
	}
	evaluateCards();
}

function newGame(){
	const cards = [...Array(64).keys()];
	shuffleArray(cards);
	
	let i = 0;
	for (const tile of g_tiles){
		if (tile.bra !== null && tile.ket !== null){
			tile.bra = cards[i] & 7;
			tile.ket = cards[i] >> 3;
			if (tile.ketText) tile.ketText.text = QBitText[tile.bra];
			if (tile.braText) tile.braText.text = QBitText[tile.ket];
			++i;
		}
	}
	
	resetGame();
}


function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; --i) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

window.addEventListener("load", function() {
	bkSystem = new BkSystem();
	
	// Areas creation
	g_buttonsArea = new BkArea(4, 1, 0, 0.1, 1); 
	bkSystem.addArea(g_buttonsArea);
	g_braketArea = new BkArea(1, 1, 0.12, 0, 0x10C);
	bkSystem.addArea(g_braketArea);
	g_heapArea = new BkArea(1, 9, 0.1, 0, 0x20C);
	bkSystem.addArea(g_heapArea);
	g_textArea = new BkTextArea(null, '', DEFAULT_FONT, 3, 0.25, 1.6);
	
	// New game
	const btnNewGame = new Button("New", g_buttonsArea);
	btnNewGame.onclick = newGame;
	bkSystem.add(btnNewGame);
	
	// Reset game
	const btnReset = new Button("Restart", g_buttonsArea);
	btnReset.onclick = resetGame;
	bkSystem.add(btnReset);
	
	// Full screen logic
	const btnFullScreen = new Button("Full Screen", g_buttonsArea);
	btnFullScreen.onclick = function (){
		bkSystem.canvas.requestFullscreen();
	}
	bkSystem.btnFullScreen = btnFullScreen;
	document.onfullscreenchange = function (e){
		if (document.fullscreenElement === null){
			bkSystem.btnFullScreen.add();
		} else {
			bkSystem.btnFullScreen.remove();
		}
	};
	bkSystem.add(btnFullScreen);
	
	// Tiles creation
	{
		let id = 0;
		g_tiles = [];
		g_tiles.push(new CardTile(id++, 2, null));
		g_tiles.push(new CardTile(id++, null, 6));
		for (const op of QOperators) {
			g_tiles.push(new CardTile(id++, null, null, op));
		}

		for (let i = 0; i < 10; ++i) {
			g_tiles.push(new CardTile(id++, 0, 0));
		}
	
		for (const tile of g_tiles){
			bkSystem.add(tile);
		}
		newGame();
	}
	
	bkSystem.onresize = function () {
		const ratio = this.canvas.width / this.canvas.height;
		if (ratio > 1) {
			g_buttonsArea.coord = new BkCoord(0, 0, 1, 0.09, 7);
			g_braketArea.coord = new BkCoord(0, 0.45,1, 0.2,7);
			g_heapArea.coord = new BkCoord(0.05, 0.65, 0.9, 0.35, 7);
			g_textArea.coord = new BkCoord(0.04, 0.105, 0.92, 0.3, 7);
		} else {
			g_buttonsArea.coord = new BkCoord(0,0,0.8, 0.05,7);
			g_braketArea.coord = new BkCoord(0.8,0,0.2, 1,7);
			g_heapArea.coord = new BkCoord(0.025, 0.5, 0.75, 0.5, 7);
			g_textArea.coord = new BkCoord(0.04, 0.075, 0.72, 0.4, 7);
		}
		g_textArea.resize();
	};

	bkSystem.ondraw = function () {
		const ctx = this.ctx;
		ctx.fillStyle = '#e6e6e6';
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.fillStyle = '#fff';
		bkFillRect(ctx, g_braketArea.screenCoord());
		ctx.fillStyle = '#000';
		g_textArea.draw(ctx, this.screenCoord());
	}
	
	g_braketArea.onplacedock = function(o) {
		if (g_braketArea.objects.length >= 10) return false;
		
		if (o.comparable <= g_tiles[0].comparable) {
			o.comparable = g_tiles[0].comparable + 1E-9;
		}
		if (o.comparable >= g_tiles[1].comparable) {
			o.comparable = g_tiles[1].comparable - 1E-9;
		}
		return true;
	}

	bkSystem.startDrawing();
	bkSystem.startInteracting();
});

}