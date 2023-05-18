const { Worker } = require('node:worker_threads')
const { writeFile } = require('node:fs/promises')

nCols = 3
nRows = 2

const nWorkers = nCols * nRows

const WORKER_PATH = './test_worker.js'

const GRID_SIZE_X = 180
const GRID_SIZE_Y = 150

const commonDataItem = new SharedArrayBuffer(GRID_SIZE_X * GRID_SIZE_Y)
const view = new Uint8Array(commonDataItem)

const workerTest = []

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

const grids = processArea(-2.1, 1.1, -1.1, 1.1, GRID_SIZE_X, GRID_SIZE_Y, nCols, nRows)

for(let i = 0; i < nWorkers; i++) {
	const workerThread = new Worker(WORKER_PATH)
	const workerFulfillment = new Promise(resolve => {
		workerThread.on('message', () => { 
			workerThread.unref()
			resolve(1)
		})
		workerThread.postMessage({ arr: view, ...grids[i] })
	})
	workerTest.push(workerFulfillment)
}

(async function() {
	const result = await Promise.all(workerTest)
	let res = ''
	for(let i = 0; i < GRID_SIZE_Y; i++) {
		const row = view.slice(i * GRID_SIZE_X, (i + 1) * GRID_SIZE_X)
		res += Array.from(row).map(i => {
			if (i < 5) return ' '
			if (i < 10) return '.'
			if (i < 25) return ','
			if (i < 45) return '*'
			if (i < 65) return '+'
			if (i < 85) return 'x'
			return '#'
		}).join('') + '\n'
	}
	
	await writeFile('result.txt', res)
	console.log('result saved')	
})();
