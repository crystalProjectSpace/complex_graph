const { Worker } = require('node:worker_threads')
const { writeFile } = require('node:fs/promises')

const WORKER_PATH = './test_worker.js'

const TEST_GRID = {
	gridSizeX: 420,
	gridSizeY: 240,
	nCols: 6,
	nRows: 5
}

const MANDELBROT_AREA =	{
	x0: -2.1,
	x1: 1.1,
	y0: -1.1,
	y1: 1.1
}
/**
* @description сформировать области для отрисовки фрактала
* @param x0 - начало области отрисовки по OX
* @param x1 - окончание области отрисовки по OX
* @param y0 - начало области отрисовки по OY
* @param y1 - окончание области отрисовки по OY
* @param nX_total - разрешение результата по OX (количество точек)
* @param nY_total - разрешение результата по OY (количество точек)
* @param n_segments_X - количество секторов по OX
* @param n_segments_Y - количество секторов по OY
*/
function processArea(x0, x1, y0, y1, nX_total, nY_total, n_segments_X, n_segments_Y) {
	const nPoints = nX_total * nY_total
	const nSegments = n_segments_X * n_segments_Y
	
	dX = (x1 - x0) / n_segments_X
	dY = (y1 - y0) / n_segments_Y
	
	_dX = (x1 - x0) / nX_total
	_dY = (y1 - y0) / nY_total
	
	
	nPoints_X = Math.floor(nX_total / n_segments_X)
	nPoints_Y = Math.floor(nY_total / n_segments_Y)
	
	const result = []
	let k = 0
	let _x = x0
	let _y = y0
	let _i = 0
	let _j = 0
	for(let i = 0; i < nSegments; i++) {
		result.push({
			x0: _x,
			y0: _y,
			dX: _dX,
			dY: _dY,
			i0: _i,
			j0: _j,
			nX: nPoints_X,
			nY:  nPoints_Y,
			rowSize: nX_total
		})
		_x += dX
		_i += nPoints_X
		k++
		if(k === n_segments_X) {
			_i = 0
			_j += nPoints_Y
			_x = x0
			_y += dY
			k = 0
		}
	}
	
	return result
}
/**
* @description сформировать набор воркеров для отрисовки фрактала и запитать их исходными данными
* @param bufferView - общий массив , в котором идет отрисовка фрактала
* @param fractalArea - описание сетки, на которую будет отображаться фрактал (разрешение и количество секторов)
* @param renderArea - координаты "реального" пространства, в котором рисуется фрактал
* @param workerPath - путь к скрипту формирования фрактала
*/
const createFractalRenderer = function(bufferView, fractalArea, renderArea, workerPath) {
	const { gridSizeX, gridSizeY, nCols, nRows } = fractalArea
	const { x0, x1, y0, y1 } = renderArea
	
	const nWorkers = nCols * nRows
	
	const grids = processArea(x0, x1, y0, y1, gridSizeX, gridSizeY, nCols, nRows)
	const result = []
	
	for(let i = 0; i < nWorkers; i++) {
		const workerThread = new Worker(WORKER_PATH)
		const workerFulfillment = new Promise(resolve => {
			workerThread.on('message', () => { 
				workerThread.unref()
				resolve(1)
			})
			workerThread.postMessage({ arr: bufferView, ...grids[i] })
		})
		result.push(workerFulfillment)
	}
	
	return result
}

const symbolicRender = function(value) {
	if (value < 5) return ' '
	if (value < 10) return '.'
	if (value < 25) return ','
	if (value < 45) return '*'
	if (value < 65) return '+'
	if (value < 85) return 'x'
	return '#'
}

const createFractal = function(fractalArea, renderArea, renderFunction, workerPath) {
	const dataSize = fractalArea.gridSizeX * fractalArea.gridSizeY
	const commonDataItem = new SharedArrayBuffer(dataSize)
	const view = new Uint8Array(commonDataItem)
	const renderer = createFractalRenderer(view, fractalArea, renderArea, workerPath);
	
	(async function() {
		const fractal = await Promise.all(renderer)
		const { gridSizeX, gridSizeY } = fractalArea
		let res = ''
		let delta0 = 0
		let delta1 = delta0 + gridSizeX
		for(let i = 0; i < gridSizeY; i++) {
			for(let j = delta0; j < delta1; j++) {
				res += renderFunction(view[j])
			}
			delta0 += gridSizeX
			delta1 += gridSizeX
			res += '\n'
		}
		
		await writeFile('result.txt', res)
		console.log('result saved')	
	})()
}

createFractal(TEST_GRID, MANDELBROT_AREA, symbolicRender, WORKER_PATH)
