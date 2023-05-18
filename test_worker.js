'use strict'

const { parentPort } = require('node:worker_threads')

const ITER_MAX = 95

function mandelbrot(X, Y) {
	let _X = X
	let _Y = Y
	let x2 = X * X
	let y2 = Y * Y
	let x_temp = 0
	let i = 0
	for(i; i < ITER_MAX; i++) {
		if (x2 + y2 >= 4) break;
		x2 = _X * _X
		y2 = _Y * _Y
		x_temp = x2 - y2 + X
		_Y = 2 * _X * _Y + Y
		_X = x_temp
	}
	
	return i
}

function processSegment(arr, x0, y0, dX, dY, i0, j0, nX, nY, rowSize) {
	const nPoints = nX * nY
	let k = 0
	let x = x0
	let y = y0
	let index = rowSize * j0 + i0
	let indexBase = index
	let t0 = performance.now()
	for(let i = 0; i < nPoints; i++) {
		let point = mandelbrot(x, y)
		x += dX
		k++
		arr[index] = point
		index++
		if(k === nX) {
			k = 0
			x = x0
			y += dY
			indexBase += rowSize
			index = indexBase
		}
	}
}

parentPort.on('message', msg => {
	processSegment(
		msg.arr,
		msg.x0,
		msg.y0,
		msg.dX,
		msg.dY,
		msg.i0,
		msg.j0,
		msg.nX,
		msg.nY,
		msg.rowSize
	)
	parentPort.postMessage(1)	
})