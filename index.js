const memoize = (limit=1000,optimizePromises=true,log)=>{
	return func=>prepare(func,{limit,optimizePromises,log})
}


const prepare = (func,{limit,optimizePromises,log})=>{
	
	let sorted = []
	let cache = {}
	
	if (!limit)
		limit=1000


	let m = function(key,...args){
		if (typeof key !== 'string')
			throw new Error('must use string as first arg to memoized func, you used ' + key + ' ' +args)
		let c
		if (key in cache) {
			c = cache[key]
			
			c.count++
			sorted = sort(sorted,c)
			
			if (c.promise) {
				if (c.error) {
					return Promise.reject(c.error)
				} else {
					return Promise.resolve(c.value)
				}
			}
			return c.value
		} else {
			
			
		}
		args = [key,...args]
		c = cache[key] = {count:1,key}
		sorted = insert(sorted,c)
		if (sorted.length > m.limit) {
			let removed = sorted.pop()
			removed.removed=true
			if (log)
				log('removing %s from cache',removed.key)
			delete cache[removed.key] //remove it	
		}

		//now that entry is in cache, let's actually get the value/promise
		//we do this after inserting, in case the func throws an error

		let value = func(...args)
		c.value = value
		
		
		
		if (m.optimizePromises && typeof value.then == 'function') {
			//overwrite cache with result
			c.promise=true
			value.then(result=>{
				if (c.removed)
					c.value=undefined
				else
					c.value = result
			}).catch(error=>{
				c.value=undefined
				if (!c.removed)
					c.error=error
			})
		}
		return value
	}
	m.remove = key=>{
		let c = cache[key]
		if (!c)
			return
		delete cache[key]
		let n = []
		let j
		let len = sorted.length
		for (j=0;j<c.index;j++) {
			n[j] = sorted[j]
		}
		for (j=c.index+1;j<len;j++) {
			let v =sorted[j]
			let k = --v.index
			n[k] = v
		}
		sorted = n
		c.removed=true
	}
	
	m.limit = limit
	m.optimizePromises = optimizePromises
	return m
}
const firstIndex = (sorted,c)=>{
	let len = sorted.length
	for (let i=0;i<len;i++) {
		if (sorted[i].count<=c)
			return i
	}
	return len
}
const insert = (sorted,c)=>{
	let len = sorted.length
	if (len==0) {
	 	sorted.push(c)
	 	c.index = 0
	 	return sorted
	}
	
	let i = firstIndex(sorted,c.count)
	let n = []
	n.length = len+1
	let j
	for (j=0;j<i;j++) {
		n[j] = sorted[j]
	}
	n[j] = c
	for (;j<len;j++) {
		let v =sorted[j]
		let k = ++v.index
		n[k] = v
	}
	c.index = i
	
	return n
}

const sort = (sorted,c)=>{
	let len = sorted.length
	
	if (len==1 ||  len==0) {
		return sorted
	}

	let i = firstIndex(sorted,c.count)
	if (i==c.index) {
		return sorted
	}
	let ci = c.index

	
	let n = []
	n.length=len
	let j
	for (j=0;j<i;j++) {
		n[j] = sorted[j]
	}
	n[j] = c
	for (;j<ci;j++) {
		let v =sorted[j]
		let k = ++v.index
		n[k] = v
	}
	for (j=ci+1;j<len;j++) {
		let v =sorted[j]
		n[v.index] = v
	}
	c.index = i
	
	return n
}
module.exports = memoize