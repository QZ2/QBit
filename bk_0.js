'use strict';

let BkScreenInfo = function(width, height)
{
	this.updateSize = function(width, height) {
		this.w = width;
		this.h = height;
		this.dx = width * 0.5;
		this.dy = height * 0.5;
		this.scale = this.dx < this.dy ? this.dx : this.dy;
		this.invScale = 1 / this.scale;
	}

	this.screenToNormalizedDelta = function(dx, dy) {
		return {dx : dx * this.invScale, dy : dy * this.invScale};
	}
	
	this.updateSize(width, height);
}

let BkCoord = function(x = 0, y = 0, w = 0, h = 0, flavor = 0)
{
	// x, y coordinates of the object center
	// w, h object dimensions
	// flavor is the flavor of coordinates
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.flavor = flavor;
	
	// Type 0: Screen coordinates
	// x, y, w, h in pixels
	// Center in x, y
	// Can be docked
	
	// Type 1: Normalized coordinates
	// x, y, w, h in normalized coordinates:
	// x is guaranteed to be in screen for [-1..1]
	// y is guaranteed to be in screen for [-1..1]
	// either w or h is 2, the other >= 2.
	// Center in x, y 
	// Can be docked

	// Type 6: Used to define GUI areas
	// x, y, w, h are relative to current canvas dimensions
	// x, y are guaranteed to be in screen for [0..1[
	// if x, y are negative [-1..0[ they are relative to right or bottom.
	// h, w in [0..1[ and proportional to the smaller canvas dimension.
	// A negative h or w makes it the complement of a positive w or h
	// Center in x + w/2, y + h/2
	// Becomes Type 1 when undocked
	
	// Type 7: Used to define GUI areas
	// x, y, w, h are relative to current canvas dimensions
	// x, y are guaranteed to be in screen for [0..1[
	// if x, y are negative [-1..0[ they are relative to right or bottom.
	// h, w in [0..1[ relative to canvas dimensions.
	// A negative h or w makes it the complement of a positive w or h in flavor 6
	// Center in x + w/2, y + h/2
	// Becomes Type 1 when undocked
	
	// Type 8: Relative to container, used for docking.
	// x, y, w, h are relative to current canvas dimensions
	// x, y are guaranteed to be in screen for [0..1[
	// h, w are proportional to current canvas dimensions [0..1[
	// Center in x, y
	
	// Type 9: Relative to container, used for areas
	// x, y, w, h are relative to current canvas dimensions
	// x, y are guaranteed to be in screen for [0..1[
	// h, w are proportional to current canvas dimensions [0..1[
	// Center in x + w/2, y + h/2
}

BkCoord.prototype.getScreenCoord = function(screenInfo)
{
	const flavor = this.flavor;
	if (flavor === 1)
	{
		const scale = screenInfo.scale ? screenInfo.scale :
			(screenInfo.w < screenInfo.h ? screenInfo.w : screenInfo.h) * 0.5;
		return new BkCoord(
			this.x * scale + screenInfo.w * 0.5,
			this.y * scale + screenInfo.h * 0.5,
			this.w * scale,
			this.h * scale);
	}
	else if (flavor === 8)
	{
		const sw = screenInfo.w;
		const sh = screenInfo.h;
		return new BkCoord(
			this.x * sw,
			this.y * sh,
			this.w * sw,
			this.h * sh);
	}
	else if (flavor === 9)
	{
		const sw = screenInfo.w;
		const sh = screenInfo.h;
		return new BkCoord(
			(this.x + this.w * 0.5) * sw,
			(this.y + this.h * 0.5) * sh,
			this.w * sw,
			this.h * sh);
	}
	else if (flavor === 6)
	{
		const sw = screenInfo.w;
		const sh = screenInfo.h;
		let sm, uw, uh;
		if (sw < sh)
		{
			sm = sw;
			uw = 1;
			uh = sh / sm;
		}
		else
		{
			sm = sh;
			uh = 1;
			uw = sw / sm;
		}
		let w = this.w;
		if (w < 0) w += uw;
		let h = this.h;
		if (h < 0) h += uh;
		
		return new BkCoord(
			(this.x + ((this.x < 0) ? (uw - w * 0.5) : (w * 0.5))) * sm,
			(this.y + ((this.y < 0) ? (uh - h * 0.5) : (h * 0.5))) * sm,
			w * sm,
			h * sm);
	}
	else if (flavor === 7)
	{
		let sw = screenInfo.w;
		let sh = screenInfo.h;
		let uw = 1;
		let uh = 1;
		const sm = sw < sh ? sw : sh;
		let w = this.w;
		if (w < 0)
		{
			uw = sw / sm;
			w += uw;
			sw = sm;
		}
		let h = this.h;
		if (h < 0)
		{
			uh = sh / sm;
			h += uh;
			sh = sm;
		}
		return new BkCoord(
			(this.x + ((this.x < 0) ? (uw - w * 0.5) : (w * 0.5))) * sw,
			(this.y + ((this.y < 0) ? (uh - h * 0.5) : (h * 0.5))) * sh,
			w * sw,
			h * sh);
	}
	else if (flavor === 0)
	{
		return this.clone();
	}
	return null;
}

BkCoord.prototype.getNormalized = function(screenInfo)
{
	// Only for non normalized coordinates
	const flavor = this.flavor;
	if (flavor === 8)
	{
		const scaleFactor = screenInfo.invScale;
		const sw = screenInfo.dx * 2;
		const sh = screenInfo.dy * 2;
		return new BkCoord(
			(this.x * sw - screenInfo.dx) * scaleFactor,
			(this.y * sh - screenInfo.dy) * scaleFactor,
			(this.w * sw) * scaleFactor,
			(this.h * sh) * scaleFactor,
			1);
	}
	else if (flavor === 0)
	{
		const scaleFactor = screenInfo.inv_scale;
		return new BkCoord(
			(this.x - screenInfo.dx) * scaleFactor ,
			(this.y - screenInfo.dy) * scaleFactor ,
			this.w * scaleFactor,
			this.h * scaleFactor,
			1);
	} 
	else if (flavor === 1)
	{
		return this.clone();
	}
	return null;
}

BkCoord.prototype.fixForDocking = function(screenInfo)
{
	if (this.flavor === 8) return;
	if (this.flavor !== 1) return;

	const swFactor = screenInfo.scale / (screenInfo.dx * 2);
	const shFactor = screenInfo.scale / (screenInfo.dy * 2);
	this.x *= swFactor;
	this.x += 0.5;
	this.y *= shFactor;
	this.y += 0.5;
	this.w *= swFactor;
	this.h *= shFactor;
	this.flavor = 8;
}

BkCoord.prototype.fixForArea = function(screenInfo)
{
	if (this.flavor === 9) return;
	if (this.flavor !== 0) return;

	const isw = 1 / (screenInfo.dx * 2);
	const ish = 1 / (screenInfo.dy * 2);
	this.x = (this.x - this.w * 0.5) * isw;
	this.y = (this.y - this.h * 0.5) * ish;
	this.w *= isw;
	this.h *= ish;
	if (this.w < 0) {
		this.x -= this.w;
		this.w = -this.w;
	}
	if (this.h < 0) {
		this.y -= this.h;
		this.h = -this.h;
	}
	if (this.x < 0) {
		this.w += this.x;
		this.x = 0;
	}
	if (this.y < 0) {
		this.h += this.y;
		this.y = 0;
	}
	if (this.x > 1) this.x = 1;
	if (this.y > 1) this.y = 1;
	
	if (this.x + this.w > 1) this.w = 1 - this.x;
	if (this.y + this.h > 1) this.h = 1 - this.y;
	this.flavor = 9;
}

/**
 * Gets an screen coordinate using an screen coordinate as screen info
 * @param coord Must be screen coordinates (flavor 0)
 */
BkCoord.prototype.getMetaScreenCoord = function(screenCoord)
{
	const nCoord = this.getScreenCoord(screenCoord);
	nCoord.x += screenCoord.x - screenCoord.w * 0.5;
	nCoord.y += screenCoord.y - screenCoord.h * 0.5;
	return nCoord;
}

/**
 * Only for screen coordinates: this.flavor == 0
 * Resize width and height by a factor of the shorter.
 */
BkCoord.prototype.resizeByShortFactor = function(factor)
{
	const amountPx = (this.w < this.h ? this.w : this.h) * (factor - 1);
	return new BkCoord(
		this.x,
		this.y,
		this.w + amountPx,
		this.h + amountPx);
}

BkCoord.prototype.clone = function(scale)
{
	return Object.assign({}, this); 
}

const BK_INV_255 = 1 / 255;
function bkColorToStr(intColor)
{
	let result = 'rgba(';
	result += ((intColor >> 16) & 0xFF); result += ',';
	result += ((intColor >> 8) & 0xFF); result += ',';
	result += (intColor & 0xFF); result += ',';
	result += (((intColor >> 24) & 0xFF) * BK_INV_255).toFixed(3); result += ')';
	return result;
}

function bkShadowColor(color)
{
	let alpha = ((color >> 24) & 0xFF) * BK_INV_255;
	let shadowAlpha = (1 - alpha)
	shadowAlpha *= shadowAlpha;
	shadowAlpha = Math.floor((1 - shadowAlpha) * 128);
	let colorIntensity = 1 - alpha;
	
	let r = Math.floor(((color >> 16) & 0xFF) * colorIntensity);
	let g = Math.floor(((color >> 8) & 0xFF) * colorIntensity);
	let b = Math.floor((color & 0xFF) * colorIntensity);
	
	return b + (g << 8) + (r << 16) | (shadowAlpha << 24);
}

function bkColorMix(colorA, colorB)
{
	return ((((colorA >> 1) & 0x7F807F80) + ((colorB >> 1) & 0x7F807F80)) & 0xFF00FF00) |
		((((colorA & 0xFF00FF) + (colorB & 0xFF00FF)) >> 1) & 0x00FF00FF);
}

function bkColorMixRetainAlpha(colorA, colorB)
{
	return ((((colorA & 0xFF00) + (colorB & 0xFF00)) >> 1 ) & 0xFF00) |
		((((colorA & 0xFF00FF) + (colorB & 0xFF00FF)) >> 1) & 0x00FF00FF) |
		(colorA & 0xFF000000);
}

function bkColorMix31(colorA, colorB)
{
	return (((((colorA >> 2) & 0x3FC03FC0) * 3) + ((colorB >> 2) & 0x3FC03FC0)) & 0xFF00FF00) |
		(((((colorA & 0xFF00FF) * 3) + (colorB & 0xFF00FF)) >> 2) & 0x00FF00FF);
}

function bkColorMix31RetainAlpha(colorA, colorB)
{
	return ((((colorA & 0xFF00) * 3 + (colorB & 0xFF00)) >> 2 ) & 0xFF00) |
		(((((colorA & 0xFF00FF) * 3) + (colorB & 0xFF00FF)) >> 2) & 0x00FF00FF) |
		(colorA & 0xFF000000);
}

function bkColorMix13RetainAlpha(colorA, colorB)
{
	return ((((colorA & 0xFF00) + (colorB & 0xFF00) * 3) >> 2 ) & 0xFF00) |
		(((((colorA & 0xFF00FF)) + (colorB & 0xFF00FF) * 3) >> 2) & 0x00FF00FF) |
		(colorA & 0xFF000000);
}

function bkColorDesaturate(color)
{
	let r = (color >> 16) & 0xFF;
	let g = (color >> 8) & 0xFF;
	let b = color & 0xFF;
	let v = Math.round(Math.max(r, g, b) * 0.4 + r * 0.18 + g * 0.348 + b * 0.072);
	return (v * 0x10101) | (color & 0xFF000000);
}

function bkColorSaturate(color)
{
	let r = (color >> 16) & 0xFF;
	let g = (color >> 8) & 0xFF;
	let b = color & 0xFF;
	let m = Math.min(r, g, b);
	let M = Math.max(r, g, b);
	let delta = M - m;
	if (delta === 0) return color;
	
	let factor = M / delta;
	r = Math.floor((r - m) * factor);
	g = Math.floor((g - m) * factor);
	b = Math.floor((b - m) * factor);
	return b + (g << 8) + (r << 16) | (color & 0xff000000);
}

function bkColorDarken(color)
{
	return bkColorMixRetainAlpha(color, bkColorMix31(bkColorSaturate(color), 0));
}
	
function bkColorLighten(color)
{
	let r = (color >> 16) & 0xFF;
	let g = (color >> 8) & 0xFF;
	let b = color & 0xFF;
	let m = Math.max(r, g, b);
	if (m === 0) return (color | 0x808080);
	if (m === 255) return bkColorMixRetainAlpha(color, 0xFFFFFF);
	
	let factor = 255 / m;
	r = Math.floor(r * factor);
	g = Math.floor(g * factor);
	b = Math.floor(b * factor);
	return b + (g << 8) + (r << 16) | (color & 0xff000000);
}

function bkObjectIsSelected(o)
{
	return (o.flags & 0x80000000) !== 0;
}

function bkObjectSetSelected(o, state = true)
{
	if (state) o.flags |= 0x80000000; else o.flags &= 0x7FFFFFFF;
}

function bkWriteXY(ctx, text, x = 2, y = 4)
{
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = "24px Sans";
	ctx.fillStyle = "#888";
	ctx.fillText(text, x, y);
}

let BkArea = function(ratio = 1, areaType = 0, margin = 0.04,
	padding= 0.1, areaFlags = 0)
{
	// Coords flavors allowed: 6 and 7 with no negative values.
	this.coord = null;
	this.ratio = ratio;
	// Type -1: Cover all the area, some items are larger, ratio is optional.
	// Type 0: Minimize unused area, uniform item size, try to follow ratio.
	// Type 1: Uniform item size with specified ratio, unused area.
	// Type 2: Type 1 and item size calculated at least "type" elements.
	this.areaType = areaType;
	this.margin = margin;
	this.padding = padding;

	// Bit 0x1 Flip horizontally
	// Bit 0x2 Flip vertically
	// Bit 0x4 Center horizontally
	// Bit 0x8 Center vertically
	// Bit 0x10 No left margin
	// Bit 0x20 No right margin
	// Bit 0x40 No top margin
	// Bit 0x80 No bottom margin
	// Bit 0x100 Allow in place dock
	// Bit 0x200 Allow stack dock
	// Bit 0x400 Allow ? dock
	// Bit 0x800 Allow ? dock
	this.areaFlags = areaFlags;
	this.__redistribute = false;
}

let BkSystem = function()
{
	const canvasObject = document.createElement("canvas");
	document.body.appendChild(canvasObject);
	this.items = [];
	this.areas = [];
	this._isInteracting = false;
	this.__wasInteracting = false;
	this.disabledColor = null;
	this._screenInfo = new BkScreenInfo(1, 1);
	this.canvas = canvasObject;
	this.ctx = this.canvas.getContext('2d');
	this._redraw = false;
	this.mouse = {
		selObj: null,
		hover: null,
		buttons: 0,
		x0: 0,
		y0: 0,
		x: 0,
		y: 0,
		dx: 0,
		dy: 0
	};
	
	this.enableHover = !bkIsTouchDevice;
	this.__autoDockUndock = false;

	this.touchId = null;
	
	
	this.canvas.oncontextmenu = function(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	};
	
	const MAX_ANIMATION_MS = 300;
	const INV_MAX_ANIMATION_MS = 1 / MAX_ANIMATION_MS;
	
	this.doOnResize = function() {
		if (this.resizeCallbackId) clearTimeout(this.resizeCallbackId);
		this.resizeCallbackId = setTimeout(this.resize.bind(this), 100 /* ms */);
	}
	
	function _bkGetSquareDist(w, h, n)
	{
		if (w <= 0 || h <= 0 || n <= 0) return new BkCoord(1, 1, 0);

		const h_div_w = h / w;
		const w_div_h = w / h;
		// check against full h
		let xh = Math.ceil(Math.sqrt(n * h_div_w));
		let yh = Math.floor(xh * w_div_h);
		while (xh * yh < n)
		{
			if (yh < 1)
			{
				yh = 1;
				xh = Math.ceil(yh * h_div_w);
			}
			else
			{
				++xh;
				yh = Math.floor(xh * w_div_h);
			}
		}
		let lh = h / xh;

		// check against full w
		let xw = Math.ceil(Math.sqrt(n * w_div_h));
		let yw = Math.floor(xw * h_div_w);
		while (xw * yw < n)
		{
			if (yw < 1)
			{
				yw = 1;
				xw = Math.ceil(yw * w_div_h);
			}
			else
			{
				++xw;
				yw = Math.floor(xw * h_div_w);
			}
		}
		let lw = w / xw;
		
		if (lw < lh)
		{
			xw = yh;
			yw = xh;
			lw = lh;
		}
		
		// Prefer lower differences in dimensions
		if ((xw - 1) * yw >= n) --xw;
		if (xw * (yw - 1) >= n) --yw;
		return new BkCoord(xw, yw, lw);
	}

	function _bkGetRectDist(w, h, boxRatio, count)
	{
		let sw = w / boxRatio;
		let result = _bkGetSquareDist(sw, h, count);
		result.h = result.w;
		result.w *= boxRatio;
		return result;
	}

	function _bkRedistributeArea(area, animateResize)
	{
		const screenInfo = area.system._screenInfo;
		const items = area.system.items;
		
		area.objects = [];
		const objects = area.objects;
		for (const item of items)
		{
			if (item.area === area) objects.push(item);
		}
		
		const totalItems = objects.length;
		let count = totalItems;
		if (count <= 0) return;
		
		if (area.areaType > 1 && count < area.areaType) count = area.areaType;

		const comparableType = typeof objects[0].comparable;
		if (comparableType === 'number')
		{
			objects.sort(function(a, b){return a.comparable - b.comparable;});
		}
		else if (comparableType === 'string')
		{
			objects.sort(function(a, b){
					return a.comparable === b.comparable ? 0 :
						(a.comparable < b.comparable ? -1 : 1);
				});
		}

		// We need flavor 9 coordinates, fix screen coord for areas.
		if (area.coord.flavor !== 9)
		{
			const c = area.coord.getScreenCoord(screenInfo);
			c.fixForArea(screenInfo);
			area.coord = c;
		}
		
		// We are interested in width and height proportional to screen
		const scoord = area.coord.getScreenCoord(screenInfo);
		let sw = scoord.w;
		let sh = scoord.h;
		const coord = area.coord;

		let factorW, factorH;
		if (sw < sh)
		{
			factorW = 1;
			factorH = sw / sh;
		}
		else
		{
			factorW = sh / sw;
			factorH = 1;
		}
		
		const noMarginW = (area.areaFlags & 0x30) === 0x30;
		const noMarginH = (area.areaFlags & 0xC0) === 0xC0;

		const marginW = noMarginW ? 0 : area.margin * factorW;
		sw *= (1 - marginW);
		const marginH = noMarginH ? 0 : area.margin * factorH;
		sh *= (1 - marginH);

		let padW, padH, cellW, cellH;
		
		const nPadding = area.ratio >= 1 ? area.padding : area.padding * area.ratio;
		const cellRatio = (area.ratio + nPadding) / (1 + nPadding);
		const dim = _bkGetRectDist(sw, sh, cellRatio, count);
		
		if (area.areaType < 1)
		{
			if (area.areaType < 0)
			{
				// Use all the space
				if (dim.x > dim.y)
				{
					dim.x = Math.ceil(count / dim.y);
				}
				else
				{
					dim.y = Math.ceil(count / dim.x);
				}
			}
			
			cellW = (1 - marginW) / dim.x;
			cellH = (1 - marginH) / dim.y;
			
			if (cellW * sw < cellH * sh)
			{
				padW = area.padding;
				padH = area.padding * (cellW * sw) / (cellH * sh);
			}
			else
			{
				padW = area.padding * (cellH * sh) / (cellW * sw);
				padH = area.padding;
			}
		}
		else if (area.areaType > 0)
		{
			cellW = (1 - marginW) * (dim.w * dim.x) / (dim.x * sw);
			cellH = (1 - marginH) * (dim.h * dim.y) / (dim.y * sh);
			
			padW = 1 - (area.ratio / (area.ratio + nPadding));
			padH = 1 - (1 / (1 + nPadding));
		}

		let oPadW = padW;
		
		const flipFlagW = area.areaFlags & 1;
		const flipFlagH = area.areaFlags & 2;
		const centerFlagW = area.areaFlags & 4;
		const centerFlagH = area.areaFlags & 8;
		
		// 1 : no flip (no flag), -1 : flip (with flag)
		const flipW = -flipFlagW * 2 + 1;
		const flipH = -flipFlagH + 1;
		
		let offsetW = marginW * 0.5;
		if (centerFlagW)
		{
			const usedX = (dim.y === 1) ? count : dim.x ;
			offsetW += ((1 - marginW) - (usedX * cellW)) * 0.5;
		}
		let offsetH = marginH * 0.5;
		if (centerFlagH)
		{
			let usedY = Math.ceil(count / dim.x);
			offsetH += ((1 - marginH) - (usedY * cellH)) * 0.5;
		}

		offsetW = flipFlagW ? (1 - offsetW) : offsetW;
		offsetH = flipFlagH ? (1 - offsetH) : offsetH;
		
		const endTime = animateResize ? performance.now() + MAX_ANIMATION_MS : 0;
		let index = 0;
		
		for (let j = 0; j < dim.y; ++j)
		{
			let rowCols = dim.x;
			
			if (area.areaType < 0)
			{
				if ((j === 0) && ((dim.y * dim.x) > count))
				{
					rowCols = count - (dim.y - 1) * dim.x;
				}
				cellW = (1 - marginW) / rowCols;
				padW = oPadW * rowCols / dim.x;
			}

			for (let i = 0; i < rowCols; ++i)
			{
				if (index >= totalItems) break;
				const o = objects[index];
				++index;
				
				const oIsSelected = bkObjectIsSelected(o);
				
				factorW = oIsSelected ? cellW : cellW * (1 - padW);
				factorH = oIsSelected ? cellH : cellH * (1 - padH);
				
				const x = (cellW * flipW * (i + 0.5) + offsetW) * coord.w + coord.x;
				const y = (cellH * flipH * (j + 0.5) + offsetH) * coord.h + coord.y;
				const w = factorW * coord.w;
				const h = factorH * coord.h;
				
				if (animateResize)
				{
					o.coord.fixForDocking(screenInfo);
					o.nextCoord = new BkCoord(x, y, w, h, 8);
					o.nextCoord.endTime = endTime;
				}
				else
				{
					o.nextCoord = null;
					o.coord.x = x;
					o.coord.y = y;
					o.coord.w = w;
					o.coord.h = h;
					o.coord.flavor = 8;
					o.resize();
				}
			}
		}
		
		// Check in place dock flag
		if ((area.areaFlags & 0x100) && (dim.x === 1 || dim.y === 1))
		{
			for (const o of objects)
			{
				const c = animateResize ? o.nextCoord : o.coord;
				o.comparable = area.coord.w > area.coord.h ?
					(c.x - 0.5) * flipW: 
					(c.y - 0.5) * flipH;
			}
		}
	}

	this.resize = function() {
		this.canvas.width = this.canvas.clientWidth;
		this.canvas.height = this.canvas.clientHeight;

		this.__screenCoord = new BkCoord(
			this.canvas.width * 0.5, this.canvas.height * 0.5,
			this.canvas.width, this.canvas.height);
		this._screenInfo.updateSize(this.canvas.width, this.canvas.height);
		
		if (this.onresize) this.onresize();
		
		for (const area of this.areas) _bkRedistributeArea(area, false);

		this._redraw = true;
	}

	this.screenCoord = function() {
		return this.__screenCoord;
	}
	
	this.doOnClick = function(e) {
		if (!this._isInteracting)
		{
			if (this.__wasInteracting)
			{
				this.__wasInteracting = false;
				return false;
			}
			
			this.startInteracting();
		}
		
		if (this.onclick) this.onclick(this.mouse);
		return false;
	}
	this.canvas.onclick = this.doOnClick.bind(this);

	this.__handleHover = function(hover){
		const oldHover = this.mouse.hover;
		if (hover === oldHover) return;
		this.mouse.hover = hover;
		
		const cursorStyle = hover && hover.onclick ? 'pointer' : 'auto';
		if (this.canvas.style.cursor !== cursorStyle)
		{
			this.canvas.style.cursor = cursorStyle;
		}
		
		if ((hover && hover.redrawOnHover) || (oldHover && oldHover.redrawOnHover))
		{
			this._redraw = true;
		}
	}

	this.doOnMouseMove = function(e) {
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const mouse = this.mouse;
		mouse.buttons = e.buttons;
		mouse.dx = x - mouse.x;
		mouse.dy = y - mouse.y;
		mouse.x = x;
		mouse.y = y;
		
		if (this.enableHover && !mouse.buttons)
		{
			this.__handleHover(this.select(mouse.x, mouse.y));
		}
		
		if (mouse.selObj)
		{
			const selObj = mouse.selObj;
			if (this.__autoDockUndock)
			{
				if (selObj.__oldArea) selObj.move(mouse.dx, mouse.dy);
			}
			if (selObj.onmousemove) selObj.onmousemove(mouse);
		}
		if (this.onmousemove) this.onmousemove(mouse);
		return false;
	}

	this.doOnTouchMove = function(e) {
		if (e.changedTouches.length < 1) return false;
		const t = e.changedTouches[0];
		if (t.identifier !== this.touchId) return false;
		t.buttons = 1;
		this.doOnMouseMove(t);
		return false;
	}

	this.doOnMouseEnter = function(e) {
		if (this.onmouseenter) this.onmouseenter();
		return false;
	}

	this.doOnMouseOut = function(e) {
		const mouse = this.mouse;

		if (mouse.selObj) this._redraw = true;
		if (this.enableHover) this.__handleHover(null);
		
		if (mouse.selObj && mouse.selObj !== this && mouse.selObj.onmouseout) mouse.selObj.onmouseout(mouse);
		if (this.onmouseout) this.onmouseout(mouse);
		
		mouse.hover = null;
		mouse.selObj = null;
		return false;
	}

	this.doOnTouchEnd = function(e) {
		if (e.changedTouches.length < 1) return false;
		const t = e.changedTouches[0];
		if (t.identifier !== this.touchId) return false;
		
		this.touchId = null;
		this.doOnMouseUp(t);
		
		return false;
	}

	this.doOnMouseUp = function(e) {
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const mouse = this.mouse;
		mouse.x = x;
		mouse.y = y;
		
		if (mouse.selObj) this._redraw = true;
		
		const hover = this.select(mouse.x, mouse.y);
		if (this.enableHover) this.__handleHover(hover);
		
		if (this.onmouseup) this.onmouseup(mouse);
		if (hover && mouse.selObj === hover && hover.onclick) hover.onclick(mouse);
		if (mouse.selObj && mouse.selObj.onmouseup) mouse.selObj.onmouseup(mouse);
		
		this.mouse.buttons = 0;
		this.mouse.selObj = null;
		
		
		return false;
	}

	this.doOnTouchStart = function(e) {
		
		if (this.canvas.onmousedown)
		{
			this.canvas.onmousemove = null;
			this.canvas.onmouseout = null;
			this.canvas.onmouseenter = null;
			this.canvas.onmouseup = null;
			this.canvas.onmousedown = null;
		}
		
		if (e.changedTouches.length < 1) return false;
		const t = e.changedTouches[0];
		
		if (this.touchId === null) {
			this.touchId = t.identifier;
			
			t.buttons = 1;
			this.doOnMouseDown(t);
		}
		return false;
	}

	this.doOnMouseDown = function(e) {
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const mouse = this.mouse;
		mouse.x0 = x
		mouse.y0 = y
		mouse.dx = 0;
		mouse.dy = 0;
		mouse.x = x;
		mouse.y = y;
		mouse.buttons = e.buttons;
		
		const hover = this.select(mouse.x, mouse.y);
		if (this.enableHover) mouse.hover = hover;
		mouse.selObj = hover;
		
		if (this.onmousedown) this.onmousedown();
		if (hover && hover.onmousedown) hover.onmousedown(mouse);
		if (hover) this._redraw = true;

		return false;
	}

	this.doOnTouchCancel = function(e) {
		if (e.changedTouches.length < 1) return false;
		const t = e.changedTouches[0];
		if (t.identifier !== this.touchId) return false;
		
		this.touchId = null;
		this.doOnMouseOut();
		
		return false;
	}

	
	let drawingInstance = null;
	function bkMainUpdateFrame()
	{
		if (drawingInstance === null) return;
		if (drawingInstance._redraw) drawingInstance.__draw();
		window.requestAnimationFrame(bkMainUpdateFrame);
	}
	
	/**
	 * Register to resize events and drawing updates
	 */
	this.startDrawing = function() {
		if (drawingInstance) return;
		drawingInstance = this;
		window.addEventListener("resize", this.doOnResize.bind(this));
		this.resize();
		bkMainUpdateFrame();
	}

	this.stopDrawing = function() {
		if (drawingInstance === null) return;
		drawingInstance = null;
		window.removeEventListener("resize", this.doOnResize.bind(this), false);
	}

	/**
	 * Start processing input events
	 */
	this.startInteracting = function() {
		if (this._isInteracting === true) return;
		
		if (this.onmousemove || this.enableHover ||
			this.__autoDockUndock)
		{
			this.canvas.onmousemove = this.doOnMouseMove.bind(this);
			this.canvas.ontouchmove = this.doOnTouchMove.bind(this);
		}

		this.canvas.onmouseout = this.doOnMouseOut.bind(this);
		this.canvas.onmouseenter = this.doOnMouseEnter.bind(this);
		
		this.canvas.ontouchcancel = this.doOnTouchCancel.bind(this);

		this.canvas.ontouchstart = this.doOnTouchStart.bind(this);
		this.canvas.onmousedown = this.doOnMouseDown.bind(this);
		
		this.canvas.ontouchend = this.doOnTouchEnd.bind(this);
		this.canvas.onmouseup = this.doOnMouseUp.bind(this);

		
		this._isInteracting = true;
		if (this.disabledColor) this._redraw = true;
	}

	/**
	 * Stop processing input events
	 */
	this.stopInteracting = function() {
		if (this._isInteracting === false) return;
		this.__wasInteracting = true;
		
		this.canvas.onmousemove = null;
		this.canvas.onmouseout = null;
		this.canvas.onmouseenter = null;
		this.canvas.onmouseup = null;
		this.canvas.onmousedown = null;
		this.canvas.ontouchstart = null;
		this.canvas.ontouchend = null;
		this.canvas.ontouchmove = null;
		this.canvas.ontouchcancel = null;
		
		
		this._isInteracting = false;
		if (this.disabledColor) this._redraw = true;
	}

	/*
	let g_frame_count = 0;
	let g_last_second_count = 0;
	let g_fls = 0;
	let g_fps = 0;
	let g_last_frame_time = performance.now();
	let g_last_second_time = g_last_frame_time;
	//*/

	this.__draw = function() {
		if ((this.canvas.width < 1) || (this.canvas.height < 1)) return;
		this._redraw = false;

		for (const area of this.areas)
		{
			if (area.__redistribute)
			{
				area.__redistribute = false;
				_bkRedistributeArea(area, true);
			}
		}
		
		const currentTime = performance.now();
		for (const o of this.items)
		{
			if (!o.nextCoord || o.coord.flavor !== 8) continue;
			
			const nextCoord = o.nextCoord;
			const coord = o.coord;
			const timeSpan = nextCoord.endTime - currentTime;

			if ((coord.flavor !== nextCoord.flavor) || (timeSpan <= 0))
			{
				o.coord = nextCoord;
				o.nextCoord = null;
			}
			else
			{
				const f0 = timeSpan * INV_MAX_ANIMATION_MS;
				const f1 = 1 - f0;
				coord.x = coord.x * f0 + nextCoord.x * f1;
				coord.y = coord.y * f0 + nextCoord.y * f1;
				coord.w = coord.w * f0 + nextCoord.w * f1;
				coord.h = coord.h * f0 + nextCoord.h * f1;
				this._redraw = true;
			}
			o.resize();
		}
		
		if (this.ondraw){
			this.ondraw(); 
		} else {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}

		for (const o of this.items) o.draw();
		
		/*
		this._redraw = true;
		++g_frame_count;
		const now = performance.now();
		const timeBeyondLimit = (now - g_last_second_time - 1000);
		if (timeBeyondLimit >= 0) {
			g_last_second_time = timeBeyondLimit < 1000 ?
				g_last_second_time + 1000 : now;
			const fls = g_frame_count - g_last_second_count;
			g_fls = g_fls ? g_fls * 0.5 + fls * 0.5 : fls;
			g_last_second_count = g_frame_count;
		}
		const fps = 1000 / (now - g_last_frame_time);
		g_fps = g_fps * 0.9 + fps * 0.1;
		g_last_frame_time = now;
		bkWriteXY(this.ctx, 'FPS: ' + Math.round(g_fps) +
			' FLS: ' + Math.round(g_fls));
		//*/
		
		//+ ' Screen: ' + screen.width + 'x' + screen.height
		//console.log(++g_frame_count);
		
		if (this.disabledColor && !this._isInteracting)
		{
			this.ctx.fillStyle = this.disabledColor;
			bkFillRect(this.ctx, this.__screenCoord);
		}
	}
	
	this.addArea = function(area) { 
		let index = this.areas.indexOf(area);
		if (index === -1)
		{
			if (area.areaFlags & 0xF00)
			{
				this.__autoDockUndock = true;
			}
			
			index = this.areas.length;
			area.system = this;
			area.screenCoord = __bkGetScreenCoord.bind(area);
			this.areas.push(area);
		}
		return index;
	}

	// Returns areas and items, if clear is true sets them to empty arrays
	this.getState = function(clear) {
		const areas_ = this.areas;
		const items_ = this.items;
		const onresize_ = this.onresize;
		if (clear) {
			this.areas = [];
			this.items = [];
			this.onresize = null;
		}
		return {areas: areas_, items: items_, onresize: onresize_};
	}

	// Uses state to sets areas and items
	this.setState = function(state) {
		this.stopDrawing();
		this.areas = state.areas;
		this.items = state.items;
		this.onresize = state.onresize;
		this.startDrawing();
	}
	
	function __bkGetMetaScreenCoord(item)
	{
		if (item.parent && item.parent.coord)
		{
			return item.coord.getMetaScreenCoord(__bkGetMetaScreenCoord(item.parent));
		}
		return item.coord.getScreenCoord(item.system._screenInfo);
	}

	function __bkGetScreenCoord()
	{
		if (this.coord.flavor === 0) return this.coord.clone();
		if (!this.parent) return this.coord.getScreenCoord(this.system._screenInfo);
		return __bkGetMetaScreenCoord(this);
	}

	function __bkSystemAdd()
	{
		const items = this.system.items;
		if (items.indexOf(this) !== -1) return;
		items.push(this);
	}

	function __bkSystemRemove()
	{
		const items = this.system.items;
		const i = items.indexOf(this);
		if (i !== -1) items.splice(i, 1);
	}

	function __bkMoveToTail(item)
	{
		const items = item.system.items;
		const i = items.indexOf(item);
		if (i < 0) return;

		items.splice(i, 1);
		items.push(item);
	}

	function __bkUndock()
	{
		if (!this.area) return false;
		this.__oldArea = this.area;
		this.area = null;
		this.coord = this.coord.getNormalized(this.system._screenInfo);
		
		// Necessary for GUI usability
		__bkMoveToTail(this);
		
		if (this.__oldArea.areaFlags & 0x100)
		{
			const comparable = this.comparable;
			this.comparable = this.__comparable;
			this.__comparable = comparable;
		}
		this.__oldArea.__redistribute = true;
		return true;
	}

	function __bkCancelUndock()
	{
		if (!this.__oldArea || this.area === this.__oldArea) return false;

		if (this.__oldArea.areaFlags & 0x100)
		{
			const comparable = this.comparable;
			this.comparable = this.__comparable;
			this.__comparable = comparable;
		}
		this.area = this.__oldArea;
		this.area.__redistribute = true;
		return true;
	}

	function __bkDockToArea(area)
	{
		this.__oldArea = null;
		this.area = area;
		area.__redistribute = true;
	}

	function __bkDock(x, y)
	{
		for (const area of this.system.areas)
		{
			// Check if the area is dockable
			if ((area.areaFlags & 0xF00) === 0) continue;
			
			const c = area.screenCoord();
			
			if ((Math.abs(x - c.x) > c.w * 0.5) || (Math.abs(y - c.y) > c.h * 0.5))
			{
				continue;
			}
			
			// Check in place dock flag
			if (area.areaFlags & 0x100)
			{
				// 1 : normal (no flag), -1 : reversed (with flag)
				const xAligmentFactor = -(area.areaFlags & 0x1) * 2 + 1;
				const yAligmentFactor = -(area.areaFlags & 0x2) + 1;
				
				const oldComparable = this.comparable;
				this.comparable = c.w > c.h ? 
					((x - c.x) / c.w) * xAligmentFactor:
					((y - c.y) / c.h) * yAligmentFactor;
				
				if (area.onplacedock && !area.onplacedock(this)){
					this.comparable = oldComparable;
					break;
				}
				this.__comparable = oldComparable;
			}

			this.__oldArea = null;
			this.area = area;
			area.__redistribute = true;
			
			return true;
		}
		return false;
	}
	
	function __bkMove(dx, dy)
	{ 
		const coord = this.coord;
		if (coord.flavor === 1)
		{
			const d = this.system._screenInfo.screenToNormalizedDelta(dx, dy);
			coord.x += d.dx;
			coord.y += d.dy;
			this.system._redraw = true;
			return true;
		}
		return false;
	}


	this.add = function(o) { 
		if (this.items.indexOf(o) !== -1) return;
		
		o.system = this;
		if (o.onclick) o.redrawOnHover = true;
		o.screenCoord = __bkGetScreenCoord.bind(o);
		
		o.add = __bkSystemAdd.bind(o);
		o.remove = __bkSystemRemove.bind(o);
		
		o.move = __bkMove.bind(o);
		o.dock = __bkDock.bind(o);
		o.dockToArea = __bkDockToArea.bind(o);
		o.undock = __bkUndock.bind(o);
		o.cancelUndock = __bkCancelUndock.bind(o);
		
		this.items.push(o);
	}

	this.select = function(x, y) {
		const count = this.items.length;
		for (let i = count - 1; i >= 0; --i)
		{
			const item = this.items[i];
			if (item.disableSelect) continue;
				
			const c = item.screenCoord();
			if (Math.abs(x - c.x) < c.w * 0.5 && Math.abs(y - c.y) < c.h * 0.5)
			{
				return item;
			}
		}
		return null;
	}

	/**
	 * @param src Image source.
	 * @param imgObject The object previous reference to the image. If src and
	 *        imgObject.src are the same the image is not created again.
	 * @return Either a new image or imgObject if src is the same.
	 */
	this.createImage = function(src, imgObject = null) {
		if ((src === null) || (0 === src.length)) return imgObject;
		
		// If property is undefined, null or src doesn't match with the new src
		if ((imgObject === null) || (imgObject.src !== src))
		{
			imgObject = new Image();
			imgObject.src = src;
			imgObject.system = this;
			if (!imgObject.complete)
			{
				imgObject.onload = function(){ this.system._redraw = true; };
			}
		}
		return imgObject;
	}
	
};

Image.prototype.drawFit = function(ctx, coord)
{
	try
	{
		let w = this.width;
		let h = this.height;
		let f = ((w * coord.h) > (coord.w * h)) ?
			(coord.w / this.width) : (coord.h / this.height);
		w *= f;
		h *= f;
		ctx.drawImage(this, 0, 0, this.width, this.height,
			coord.x - w * 0.5, coord.y - h * 0.5,
			w, h);
	}
	catch(err)
	{
	}
}

Image.prototype.draw = function(ctx, coord)
{
	try
	{
		ctx.drawImage(this, 0, 0, this.width, this.height,
			coord.x - coord.w * 0.5, coord.y - coord.h * 0.5,
			coord.w, coord.h);
	}
	catch(err)
	{
	}
}

Image.prototype.drawFill = function(ctx, coord)
{
	try
	{
		let x = 0;
		let y = 0;
		let w = this.width;
		let h = this.height;
		if ((w * coord.h) < (coord.w * h))
		{
			h = (w * coord.h) / coord.w;
			y = (this.height - h) * 0.5;
		}
		else
		{
			w = (h * coord.w) / coord.h;
			x = (this.width - w) * 0.5;
		}
		
		ctx.drawImage(this, x, y, w, h,
			coord.x - coord.w * 0.5, coord.y - coord.h * 0.5,
			coord.w, coord.h);
	}
	catch(err)
	{
	}
}

// The following functions only use screen coordinates
function bkFillRect(ctx, coord)
{
	ctx.fillRect(coord.x - coord.w * 0.5, coord.y - coord.h * 0.5, coord.w, coord.h);
}

function bkDrawRoundRectangle(ctx, coord, fillStyle, strokeStyle, relRadius) {
	const s = coord.h;
	coord = coord.resizeByShortFactor(0.94);
	const thickness = s - coord.h;
	const radius = thickness * 16.667 * relRadius;
	ctx.lineWidth = thickness;
	ctx.fillStyle = fillStyle;
	ctx.strokeStyle = strokeStyle;
	const w = coord.w;
	const h = coord.h;
	const x = coord.x - w * 0.5;
	const y = coord.y - h * 0.5;
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + w, y, x + w, y + h, radius);
	ctx.arcTo(x + w, y + h, x, y + h, radius);
	ctx.arcTo(x, y + h, x, y, radius);
	ctx.arcTo(x, y, x + w, y, radius);
	ctx.fill();
	ctx.stroke();
}

function bkDrawGlassButton(ctx, coord, nColor, drawFlat = false, relRadius = 0.25)
{
	const darkColor = bkColorToStr(bkColorDarken(nColor));
	const colorStr = bkColorToStr(nColor);
	const lightColor = bkColorToStr(bkColorLighten(nColor));

	const x0 = coord.x - coord.w * 0.5;
	const y0 = coord.y - coord.h * 0.5;
	
	const fgrad = drawFlat ? colorStr : ctx.createLinearGradient(
		x0, y0, x0, y0 + coord.h);
	if (!drawFlat) {
		fgrad.addColorStop(0, lightColor);
		fgrad.addColorStop(0.16, darkColor);
		fgrad.addColorStop(0.67, darkColor);
		fgrad.addColorStop(1, lightColor);
	}

	const sgrad = ctx.createLinearGradient(
		x0, y0, x0 + coord.w, y0 + coord.h);
	sgrad.addColorStop(0, colorStr);
	sgrad.addColorStop(0.18, lightColor);
	sgrad.addColorStop(0.2, '#fff');
	sgrad.addColorStop(0.22, lightColor);
	sgrad.addColorStop(0.6, colorStr);
	sgrad.addColorStop(0.7, darkColor);
	sgrad.addColorStop(0.8, colorStr);
	sgrad.addColorStop(0.88, lightColor);
	sgrad.addColorStop(0.9, '#fff');
	sgrad.addColorStop(0.92, lightColor);
	sgrad.addColorStop(1, colorStr);

	bkDrawRoundRectangle(ctx, coord, fgrad, sgrad, relRadius);
}

function bkDrawShadowCircle(ctx, coord, blur, col)
{
	let fadeCol = col & 0xFFFFFF;
	let fade13Col = bkColorMix31(col, fadeCol);
	let fade31Col = bkColorMix31(fadeCol, col);
	
	let colStr = bkColorToStr(col);
	let fade13Str = bkColorToStr(fade13Col);
	let fade31Str = bkColorToStr(fade31Col);
	let fadeStr = bkColorToStr(fadeCol);

	let x = coord.x;
	let y = coord.y;
	let r = (coord.w < coord.h ? coord.w : coord.h) * 0.5;
	let grad = ctx.createRadialGradient(
		x, y, r * (1 - blur), x, y, r);
	grad.addColorStop(0, colStr);
	grad.addColorStop(0.2, fade13Str);
	grad.addColorStop(0.6, fade31Str);
	grad.addColorStop(1, fadeStr);
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.fill();
}

function bkDrawShadowRect(ctx, coord, blur, col)
{
	let colStr = bkColorToStr(col);
	let fade = bkColorToStr(col & 0xFFFFFF);
	let w = coord.w;
	let h = coord.h;
	if (blur > 1)
	{
		w += blur;
		h += blur;
	}
	else
	{
		blur *= (w < h ? w : h);
	}
	let x0 = coord.x - w * 0.5;
	let y0 = coord.y - h * 0.5;
	
	let x1 = x0 + w;
	let y1 = y0 + h;
	let blur2 = blur * 2;
	let epsilon = 0.1;
	
	ctx.fillStyle = colStr;
	ctx.fillRect(x0 + blur, y0 + blur, w - blur2 + epsilon, h - blur2 + epsilon);
	
	let grad = ctx.createLinearGradient(
		0, y0, 0, y0 + blur);
	grad.addColorStop(0, fade);
	grad.addColorStop(1, colStr);
	
	ctx.fillStyle = grad;
	ctx.fillRect(x0 + blur, y0, w - blur2 + epsilon, blur + epsilon);
	
	grad = ctx.createLinearGradient(
		0, y1 - blur, 0, y1);
	grad.addColorStop(0, colStr);
	grad.addColorStop(1, fade);
	
	ctx.fillStyle = grad;
	ctx.fillRect(x0 + blur, y1 - blur, w - blur2 + epsilon, blur + epsilon);
	
	grad = ctx.createLinearGradient(
		x0, 0, x0 + blur, 0);
	grad.addColorStop(0, fade);
	grad.addColorStop(1, colStr);
	
	ctx.fillStyle = grad;
	ctx.fillRect(x0, y0 + blur, blur + epsilon, h - blur2 + epsilon);
	
	grad = ctx.createLinearGradient(
		x1 - blur, 0, x1, 0);
	grad.addColorStop(0, colStr);
	grad.addColorStop(1, fade);

	ctx.fillStyle = grad;
	ctx.fillRect(x1 - blur, y0 + blur, blur + epsilon, h - blur2 + epsilon);
	
	let x = x0 + blur;
	let y = y0 + blur;
	
	grad = ctx.createRadialGradient(x, y, 0, x, y, blur)
	grad.addColorStop(0, colStr);
	grad.addColorStop(1, fade);
	ctx.fillStyle = grad;
	ctx.fillRect(x - blur, y - blur, blur + epsilon, blur + epsilon);
	
	y = y1 - blur;
	
	grad = ctx.createRadialGradient(x, y, 0, x, y, blur)
	grad.addColorStop(0, colStr);
	grad.addColorStop(1, fade);
	ctx.fillStyle = grad;
	ctx.fillRect(x - blur, y, blur + epsilon, blur + epsilon);
	
	x = x1 - blur;
	
	grad = ctx.createRadialGradient(x, y, 0, x, y, blur)
	grad.addColorStop(0, colStr);
	grad.addColorStop(1, fade);
	ctx.fillStyle = grad;
	ctx.fillRect(x, y, blur + epsilon, blur + epsilon);
	
	y = y0 + blur;
	
	grad = ctx.createRadialGradient(x, y, 0, x, y, blur)
	grad.addColorStop(0, colStr);
	grad.addColorStop(1, fade);
	ctx.fillStyle = grad;
	ctx.fillRect(x, y - blur, blur + epsilon, blur + epsilon);
}

function _bkDrawGlassScrew(ctx, x, y, r)
{
	ctx.translate(x, y);
	ctx.beginPath();
	ctx.arc(0, 0, r, 0, 2 * Math.PI);
	ctx.fill();
	ctx.translate(-x, -y);
}

function bkDrawGlassBoard(ctx, coord, nColor, drawShadow = false, drawBubbles = false)
{
	const innerCoord = coord.resizeByShortFactor(0.96);
	const border = coord.h - innerCoord.h;
	const color = bkColorToStr(nColor);
	const darkerColor = bkColorToStr(bkColorDarken(nColor));
	
	if (drawShadow)
	{
		const sCoord = coord.clone();
		sCoord.x += border * 1.5;
		sCoord.y += border * 1.5;
		bkDrawShadowRect(ctx, sCoord, 0.03, bkShadowColor(nColor));
	}
	
	const x = coord.x;
	const y = coord.y;
	const w = coord.w * 1.2;
	const h = coord.h * 0.8;
	const x0 = x - w * 0.5;
	const y0 = y - h * 0.5;
	
	const sgrd = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
	sgrd.addColorStop(0, darkerColor);
	sgrd.addColorStop(0.2, color);
	sgrd.addColorStop(0.25, "#fff");
	sgrd.addColorStop(0.3, color);
	sgrd.addColorStop(0.5, darkerColor);
	sgrd.addColorStop(0.7, color);
	sgrd.addColorStop(0.75, "#fff");
	sgrd.addColorStop(0.8, color);
	sgrd.addColorStop(1, darkerColor);

	const fgrd = !drawBubbles ? color : ctx.createRadialGradient(
		x + w * 0.1, y + h * 2, 0, x + w * 0.1, y + h * 1.4, h * 2);
	if (drawBubbles)
	{
		const lightColor = bkColorToStr(bkColorLighten(nColor));
		fgrd.addColorStop(0.6, lightColor);
		fgrd.addColorStop(0.75, color);
		fgrd.addColorStop(0.755, lightColor);
		fgrd.addColorStop(1, color);
	}
	
	ctx.lineWidth = border;
	ctx.fillStyle = fgrd;
	ctx.strokeStyle = sgrd;
	ctx.beginPath();
	ctx.rect(innerCoord.x - innerCoord.w * 0.5 + border * 0.5,
		innerCoord.y - innerCoord.h * 0.5 + border * 0.5,
		innerCoord.w - border, innerCoord.h - border);
	ctx.stroke();
	ctx.fill();
	
	if (drawBubbles) {
		const grd = ctx.createLinearGradient(-border, -border, border, border);
		grd.addColorStop(0, "#fff");
		grd.addColorStop(0.2, color);
		grd.addColorStop(0.8, darkerColor);
		ctx.fillStyle = grd;

		const c = coord.resizeByShortFactor(0.8);
		_bkDrawGlassScrew(ctx, c.x - c.w * 0.5, c.y - c.h * 0.5, border);
		_bkDrawGlassScrew(ctx, c.x + c.w * 0.5, c.y - c.h * 0.5, border);
		_bkDrawGlassScrew(ctx, c.x - c.w * 0.5, c.y + c.h * 0.5, border);
		_bkDrawGlassScrew(ctx, c.x + c.w * 0.5, c.y + c.h * 0.5, border);
	}
}

function _bkSplitText(text)
{
	let result = [];
	let endLine = true;
	let count = text.length;
	let i = 0;
	let start;
	while (i < count)
	{
		start = i;
		while (text[i] === ' ')
		{
			++i;
			if (i >= count)
			{
				return result;
			}
		}
		
		if (endLine)
		{
			endLine = false;
		}
		else if (start < i)
		{
			// Avoid consuming space after end line
			++start;
		}
		
		while ((text[i] !== ' ') && (text[i] !== '\n')) 
		{
			++i;
			if (i >= count)
			{
				result.push(text.substring(start, i));
				return result;
			}
		}
		
		if (text[i] === '\n')
		{
			endLine = true;
			++i;
		}
		else
		{
			// detect case: '   \n'
			let j = i + 1;
			while ((j < count) && (text[j] === ' '))
			{
				++j;
			}
			
			if (text[j] === '\n')
			{
				result.push(text.substring(start, i) + '\n');
				i = j + 1;
				continue;
			}
		}
		
		result.push(text.substring(start, i));
	}
	return result;
}

function _bkCountRightSpaces(text)
{
	let i = text.length - 1;
	while (i >= 0)
	{
		let c = text[i];
		if ((c !== ' ') && (c !== '\n') && (c !== '\r') && (c !== '\t'))
		{
			break;
		}
		--i;
	}
	return text.length - (i + 1);
}

function _bkSetFlagsFixWords(flags, words)
{
	let count = words.length;
	for (let i = 0; i < count; ++i)
	{
		let spaceCount = _bkCountRightSpaces(words[i]);
		if (spaceCount > 0)
		{
			flags[i] = 1;
			words[i] = words[i].slice(0, -spaceCount);
		}
		else
		{
			flags[i] = 0;
		}
	}
}

/**
 * Just one text line resized to fit in coord.
 * Text can be changed at any time.
 * @param alignment Nine available [0..8] from top left to bottom right.
 *                  Flag: 0x10 Pad when not horizontally centered.
 *                  Flag: 0x100 Avoid non symmetric two lines 
 * @param fontHeight From 0 to 1: Maximum of area height
 *                   Above 1: Maximum height in pixels 
 */
let BkText = function(coord, text, fontName, alignment = 4, fontHeight = 1)
{
	this.fontName = fontName;
	this.alignment = alignment;
	this.desiredFontHeight = fontHeight;
	this.__oldText = null;
	// relative to the coord to provide when drawing
	this.coord = coord;
	this.text = text;
}

BkText.prototype.resize = function()
{
	this.__oldText = null;
}

BkText.prototype.draw = function(ctx, screenCoord, border = null)
{
	if (this.text.length <= 0) return;
	
	const coord = this.coord.getMetaScreenCoord(screenCoord);
	let done = this.__oldText === this.text;
	if (!done)
	{
		this.fontHeight = this.desiredFontHeight > 1 ?
			this.desiredFontHeight : coord.h * this.desiredFontHeight;
		if (this.fontHeight > coord.h) this.fontHeight = coord.h;
		this.__oldText = this.text;
	}

	for(;;)
	{
		if (this.fontHeight < 1) return;
		this.fontHeight = Math.round(this.fontHeight);
		ctx.font = this.fontHeight + 'px ' + this.fontName;
		if (done) break;
		
		let tw = ctx.measureText(this.text).width;
		if (coord.w >= tw) break;
		this.fontHeight *= coord.w / tw;
		done = true;
	}

	_bkDrawTextLines(ctx, [this.text], coord, this.fontHeight, this.alignment, border);
}

/**
 * Several text lines auto distributed and resized to fit inside coord.
 * Doesn't allow text changes.
 * @param alignment Nine available [0..8] from top left to bottom right.
 *                  Flag: 0x10 Pad when not horizontally centered.
 *                  Flag: 0x100 Avoid non symmetric two lines 
 * @param fontHeight From 0 to 1: Maximum of area height
 *                   Above 1: Maximum height in pixels
 * @param leadingFactor Spacing between lines, multiplied by font height gives
 *                      the line height.
 */
let BkTextArea = function(coord, text, fontName, alignment = 4,
	fontHeight = 0.5, leadingFactor = 1.2)
{
	this.lines = [];
	this.fontName = fontName;
	this.fontHeight = fontHeight;
	this.alignment = alignment;
	// relative to the coord to provide when drawing
	this.coord = coord;
	this.leadingFactor = leadingFactor;
	this.padding = 0;
	this.__updateText(text);
}

BkTextArea.prototype.__updateText = function(text)
{
	this._currentFontHeight = null;
	this._requiresResize = true;
	this.words = _bkSplitText(text);
	{
		let count = this.words.length;
		this.__flagsBuffer = new ArrayBuffer(count);
		this.__flags = new Uint8Array(this.__flagsBuffer);
		_bkSetFlagsFixWords(this.__flags, this.words);
		
		this.text = this.words.join(' ');
		this.__endPositionBuffer = new ArrayBuffer(count * 4);
		this.__endPosition = new Int32Array(this.__endPositionBuffer);
		this.__textWidthBuffer = new ArrayBuffer(count * 2);
		this.__textWidth = new Int16Array(this.__textWidthBuffer);
		this.__spaceWidth = 0;
		this.__measuredFontHeight = null;
		this.__measuredW = 0.01;
		this.__measuredH = 0.01;
		this.__linesIndexesBuffer = new ArrayBuffer(count * 4);
		this.__linesIndexes = new Int16Array(this.__linesIndexesBuffer);
		this.__linesIndexesUsed = 0;

		let index = 0;
		for (let i = 0; i < count; ++i)
		{
			index += this.words[i].length;
			this.__endPosition[i] = index;
			++index;
		}
	}
	this._oldText = this.text;
}

BkTextArea.prototype.resize = function()
{
	this._requiresResize = true;
}

BkTextArea.prototype.defineLines = function(maxWidth, fontHeight)
{
	maxWidth *= this.__measuredFontHeight / fontHeight;
	
	let prevlineWidth, lineWidth, usedWords;
	let spaceWidth = this.__spaceWidth;
	let maxLineWidth = 0;
	let baseIndex = 0;
	let linesCount = 0;
	let done = false;
	let count = this.words.length;
	while (baseIndex < count)
	{
		lineWidth = 0;
		usedWords = 0;
		do
		{
			prevlineWidth = lineWidth;
			if (usedWords !== 0)
			{
				if (this.__flags[baseIndex + usedWords - 1])
				{
					break;
				}
			}
			
			if (baseIndex + usedWords >= count)
			{
				done = true;
				break;
			}
			
			if (usedWords !== 0) lineWidth += spaceWidth;
			lineWidth += this.__textWidth[baseIndex + usedWords];
			++usedWords;
		}
		while (lineWidth < maxWidth);
		
		if ((usedWords > 1) && !done)
		{
			if (lineWidth >= maxWidth)
			{
				lineWidth = prevlineWidth;
				--usedWords;
			}
		}
		
		this.__linesIndexes[linesCount++] = baseIndex + usedWords - 1;
		
		baseIndex += usedWords;
		if (maxLineWidth < lineWidth)
		{
			maxLineWidth = lineWidth;
		}
	}
	
	this.__linesIndexesUsed = linesCount;
	this.padding = 1 - maxLineWidth / maxWidth;
	return fontHeight * (this.leadingFactor * (this.__linesIndexesUsed - 1) + 1);
}

BkTextArea.prototype._getLineWidthRelative = function(index)
{
	let wordStart = index ? (this.__linesIndexes[index - 1] + 1) : 0;
	let wordEnd = this.__linesIndexes[index];
	let lineWidth = 0;
	
	for (let i = wordStart; i <= wordEnd; ++i)
	{	
		if (i > wordStart) lineWidth += this.__spaceWidth;
		lineWidth += this.__textWidth[i];
	}
	return lineWidth;
}

// Returns line width for font height = this.__measuredFontHeight
BkTextArea.prototype._getLineWidth = function(index)
{
	let wordStart = index ? (this.__linesIndexes[index - 1] + 1) : 0;
	let wordEnd = this.__linesIndexes[index];
	let lineWidth = 0;
	
	for (let i = wordStart; i <= wordEnd; ++i)
	{	
		if (i > wordStart) lineWidth += this.__spaceWidth;
		lineWidth += this.__textWidth[i];
	}
	
	return lineWidth;
}

BkTextArea.prototype.__measureText = function(ctx, fontHeight, precision)
{
	if (Math.abs(fontHeight - this.__measuredFontHeight) < 0.1) return;
	
	ctx.font = fontHeight.toFixed(2) + 'px ' + this.fontName;
	
	// Check if measure is necessary
	let oldSampleWidth = this.__textWidth[0];
	let sampleWidth = ctx.measureText(this.words[0]).width;

	if (this.__measuredFontHeight && (fontHeight > 16) &&
		(this.__measuredFontHeight > 16) &&
		(Math.floor(precision * oldSampleWidth / this.__measuredFontHeight) ===
			Math.floor(precision * sampleWidth / fontHeight))) return;

	this.__textWidth[0] = sampleWidth;
	
	// Measure each word
	const wordCount = this.words.length;
	for (let i = 1; i < wordCount; ++i)
	{
		this.__textWidth[i] = ctx.measureText(this.words[i]).width;
	}
	this.__spaceWidth = ctx.measureText(' ').width;
	this.__measuredFontHeight = fontHeight;
}

BkTextArea.prototype.adjustLines = function(ctx, desiredWidth, desiredHeight)
{
	this._requiresResize = false;
	
	if ((this.words.length <= 0) || (desiredHeight < 1))
	{
		this._currentFontHeight = null;
		return;
	}
	
	if (this._currentFontHeight) 
	{
		// Not necessary if dimensions change less than one pixel
		if (Math.abs(this.__measuredW - desiredWidth) < 1 && 
			Math.abs(this.__measuredH - desiredHeight) < 1)
		{
			return;
		}
	}

	/**************************************************************************/
	// Guessing the biggest font height without overflowing the target area
	/**************************************************************************/
	let h = Math.sqrt((desiredWidth * desiredHeight * 1.618) / this.text.length);
	if (h < 1)
	{
		this._currentFontHeight = null;
		return;
	}
	let epsilon = 0.5;
	let minh = 0;
	let maxh = this.fontHeight * (this.fontHeight > 1 ? 1 : desiredHeight);
	
	let useSqrtApproximation = true;
	let besth = null;
	let minimumError = desiredHeight;
	let e, e0, h0, th, de, dh, adh, h_a, h_b;
	
	if (h > maxh) h = maxh;
	this.__measureText(ctx, h, 128);
	th = this.defineLines(desiredWidth, h);
	
	for (let i = 4;; --i)
	{
		// Verify if there is a word that couldn't fit in width
		if (this.padding < 0)
		{
			h /= 1 - this.padding;
			if (h < 1) break;
			
			if (h > maxh) h = maxh;
			this.__measureText(ctx, h, 1024);
			th = this.defineLines(desiredWidth, h);
			
			// Check if fits
			if (th <= desiredHeight)
			{
				if (this.padding < 0)
				{
					--h;
					this.__measureText(ctx, h, 1024);
					th = this.defineLines(desiredWidth, h);
				}
				else if (h <= 16)
				{
					// Last calculation may shrink small fonts far than necessary
					++h;
					if (h > maxh) h = maxh;
					
					this.__measureText(ctx, h, 1024);
					th = this.defineLines(desiredWidth, h);

					if ((this.padding < 0) || (th > desiredHeight))
					{
						--h;
						this.__measureText(ctx, h, 1024);
						this.defineLines(desiredWidth, h);
					}
				}
				besth = h;
				break;
			}
			maxh = h - epsilon;
		}

		e0 = e;
		e = th - desiredHeight;

		if (e <= 0)
		{
			if (-e < minimumError)
			{
				// We need the negative closer to zero
				besth = h;
				minimumError = -e;
				// Stop if we got lucky
				if (e === 0) break;
			}
		}
		if (i <= 0) break;
		
		if (e < 0) minh = h + epsilon;
		if (e > 0) maxh = h - epsilon;
		if (minh >= maxh) break;
		
		if (useSqrtApproximation)
		{
			// Second guess
			h0 = h;
			h *= Math.sqrt(desiredHeight / th);
			if (h > maxh) h = maxh;
			if (h < minh) h = minh;
			useSqrtApproximation = false;
		}
		else
		{
			// Third and later guesses
			dh = h - h0;
			de = e - e0;

			h0 = h;
			if (de === 0)
			{
				h_a = (minh + maxh) * 0.5;
				adh = Math.abs(dh);
				h_b = h + (e < 0) ? adh : -adh;
				if (h_b > maxh) h_b = maxh;
				if (h_b < minh) h_b = minh;
				h = (Math.abs(h_a - h) < Math.abs(h_b - h)) ? h_a : h_b;
			}
			else
			{
				h -= e * (dh / de);
				if (h > maxh) h = maxh;
				if (h < minh) h = minh;
			}
		}
		
		this.__measureText(ctx, h, 8192 >> (i * 2));
		th = this.defineLines(desiredWidth, h);
	}
	if (besth && (besth !== h))
	{
		h = besth;
		this.__measureText(ctx, h, 8192);
		this.defineLines(desiredWidth, h);
	}
	if (h < 1)
	{
		this._currentFontHeight = null;
		return;
	}
	this._currentFontHeight = Math.round(h);
	/**************************************************************************/
	
	// Fix ugly two lines for centred and left padding alignments
	if ((this.__linesIndexesUsed == 2) && (this.alignment & 0x100))
	{
		while (this.__linesIndexes[0] >= 1)
		{
			if (this._getLineWidth(0) > this._getLineWidth(1) * 1.5)
			{
				--this.__linesIndexes[0];
				if (this._getLineWidth(0) > this._getLineWidth(1) * 0.8)
				{
					continue;
				}
				++this.__linesIndexes[0];
			}
			break;
		}
		// Fix padding when matters
		if (this.alignment & 0x10)
		{
			let w0 = this._getLineWidth(0);
			let w1 = this._getLineWidth(1);
			this.padding = 1 - (w0 > w1 ? w0 : w1) * h / (this.__measuredFontHeight * desiredWidth);
		}
	}
	
	let endPos = this.__endPosition;
	let text = this.text;
	let lines = [];
	for (let i = 0; i < this.__linesIndexesUsed; ++i)
	{
		lines.push(text.substring(
			(i === 0 ? 0 : endPos[this.__linesIndexes[i - 1]] + 1), 
			endPos[this.__linesIndexes[i]]));
	}

	this.__measuredW = desiredWidth;
	this.__measuredH = desiredHeight
	this.lines = lines;
}

BkTextArea.prototype.draw = function(ctx, screenCoord, border = null)
{
	if (this.text !== this._oldText) this.__updateText(this.text);
	
	if (this.words.length <= 0) return;
	
	const coord = this.coord.getMetaScreenCoord(screenCoord);
	if (this._requiresResize) this.adjustLines(ctx, coord.w, coord.h);
	
	if (this._currentFontHeight)
	{
		const fontH = this._currentFontHeight;
		ctx.font = fontH.toString() + 'px ' + this.fontName;
		_bkDrawTextLines(ctx, this.lines, coord, fontH, this.alignment, border,
			this.padding, this.leadingFactor);
	}
}

function _bkDrawTextLines(ctx, lines, coord, fontH, alignment, borderStyle,
	padding = 0, leadingFactor = 1)
{
	let maxLines = lines.length;
	let lineHeight = fontH * leadingFactor;
	let x, y;
	
	// Firefox and Chrome agree on alphabetic
	ctx.textBaseline = 'alphabetic';

	// Get flags information
	padding = (alignment & 0x10) ? padding * coord.w : 0;
	
	// Remove flags
	alignment &= 0xF;
	
	// Horizontal alignment
	x = coord.x;
	let hAlignment = alignment % 3;
	switch(hAlignment)
	{
	case 1:
		ctx.textAlign = 'center';
		break;
	case 0:
		ctx.textAlign = 'left';
		x += (padding - coord.w) * 0.5;
		break;
	case 2:
		ctx.textAlign = 'right';
		x += (coord.w - padding) * 0.5;
		break;
	}

	// Adjusting to middle from alphabetic
	y = coord.y + fontH * 0.35;
	
	// Vertical alignment
	switch(alignment - hAlignment)
	{
	case 0:
		y += (fontH - coord.h) * 0.5;
		break;
	case 3:
		y += lineHeight * (1 - maxLines) * 0.5;
		break;
	case 6:
		y += (coord.h - fontH) * 0.5 + lineHeight * (1 - maxLines);
		break;
	}

	// Draw text border
	if (borderStyle && (fontH >= 4))
	{
		if (fontH < 60)
		{
			let oldStyle = ctx.fillStyle;
			ctx.fillStyle = borderStyle;
			let amount = fontH < 30 ? 1 : 1.45;
			for (let i = 0; i < maxLines; ++i)
			{
				let py = y + lineHeight * i;
				ctx.fillText(lines[i], x + amount, py);
				ctx.fillText(lines[i], x - amount, py);
				ctx.fillText(lines[i], x, py + amount);
				ctx.fillText(lines[i], x, py - amount);
			}
			ctx.fillStyle = oldStyle;
		}
		else
		{
			ctx.lineWidth = (fontH >= 100) ? 4 : (fontH * 0.04);
			ctx.strokeStyle = borderStyle;
			for (let i = 0; i < maxLines; ++i)
			{
				ctx.strokeText(lines[i], x, y + lineHeight * i);
			}
		}
	}
	
	for (let i = 0; i < maxLines; ++i)
	{
		ctx.fillText(lines[i], x, y + lineHeight * i);
	}
}

const bkIsTouchDevice = (() => {
	const ua = navigator.userAgent;
	return ua.match(/Android/i) ||
		ua.match(/webOS/i) ||
		ua.match(/iPhone/i) ||
		ua.match(/iPad/i);
})();