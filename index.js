var request = require('request');
var url = require('url');
var querystring = require('querystring');


function flatten(arr) {
	var tmp = Array.prototype.concat.apply([], arr);
	return tmp.some(Array.isArray) ? flatten(tmp) : tmp;
}

/*	response filters
	filters = {
		show: ['field1', 'field2'],
		hide: ['field3'],
		slice: [
			{ field4: "1:5" },
			{ field5: "1:3" }
		]
	}*/
function encodeFilters(filters) {
	var result = flatten(Object.keys(filters).map(function(k) {
		var v = Array.prototype.concat.apply([], filters[k]);
		return v.map(function(vi) {
			if (vi instanceof Object) {
				return Object.keys(vi).map(function(ki) {
					return k + '[' + ki + ']=' + querystring.escape(vi[ki]); // e.g. slice[field1]=1:5
				});
			} else {
				return k + '[]=' + querystring.escape(vi); // e.g. show[]=foo
			}
		});
	}));
	return result;
}

// Handles encoding with filters
/*	response filters
	filters = {
		parent_id: '8a1e4714bb3951d9',
	}*/
function encodeWithFilters(filters) {
	return flatten(Object.keys(filters).map(function(k) {
			// TODO: Is this a use case?
			// if(filters[k] instanceof Object){
			// 	var v = Array.prototype.concat.apply([], filters[k]);
			// 	console.log(v);
			// 	return v.map(function(vi) {
			// 		console.log(vi);
			// 		return Object.keys(vi).map(function(ki) {
			// 			console.log(ki);
			// 			console.log(vi[ki]);
			// 			return 'filter[' + ki + ']=' + querystring.escape(vi[ki]); // e.g. slice[field1]=1:5
			// 		});
			// 	});
			return '';
		} else {
			return 'filter[fields][' + k + '][]=' + querystring.escape(filters[k]); // e.g. filter[parent_id]=8a1e4714bb3951d9
		}
	}));
}

// Handles encoding with facets
// See https://octopart.com/api/docs/v3/rest-api#object-schemas-category
function encodeWithFacets(facets, transform) {
	var acceptedTransforms = ['include','exclude_filter','start','limit'];
	if(!transform){
		transform = acceptedTransforms[0];
	} else {
		if(acceptedTransforms.indexOf(transform) < 0){
			// Was not able to find this option. Force to "include"
			transform = acceptedTransforms[0];
		}
	}
	return flatten(Object.keys(filters).map(function(k) {
		if(filters[k] instanceof Object){
			// TODO: Is this a use case?
			// var v = Array.prototype.concat.apply([], filters[k]);
			// return v.map(function(vi) {
			// 	return Object.keys(vi).map(function(ki) {
			// 		return 'facet[' + ki + ']=' + querystring.escape(vi[ki]); // e.g. slice[field1]=1:5
			// 	});
			// });
			return '';
		} else {
			return 'facet[fields][' + k + '][' + transform + ']=' + querystring.escape(filters[k]); // e.g. filter[parent_id]=8a1e4714bb3951d9
		}
	}));
	}));
}

// Handles encoding with stats
// Figure out a clever way to add exclude_filter
// See https://octopart.com/api/docs/v3/rest-api#object-schemas-category
function encodeWithStats(filters) {
	var acceptedTransforms = ['include','exclude_filter','start','limit'];
	if(!transform){
		transform = acceptedTransforms[0];
	} else {
		if(acceptedTransforms.indexOf(transform) < 0){
			// Was not able to find this option. Force to "include"
			transform = acceptedTransforms[0];
		}
	}
	return flatten(Object.keys(filters).map(function(k) {
		if(filters[k] instanceof Object){
			// TODO: Is this a use case?
			// var v = Array.prototype.concat.apply([], filters[k]);
			// return v.map(function(vi) {
			// 	return Object.keys(vi).map(function(ki) {
			// 		return 'facet[' + ki + ']=' + querystring.escape(vi[ki]); // e.g. slice[field1]=1:5
			// 	});
			// });
			return '';
		} else {
			return 'stats[fields][' + k + '][' + transform + ']=' + querystring.escape(filters[k]); // e.g. filter[parent_id]=8a1e4714bb3951d9
		}
	}));
	}));
}

var OctoNode = function(apikey, apipath) {
	var self = this;

	var send = function(path, params, filters, cb) {
		if (typeof filters === 'function') {
			cb = filters; // skip filters
		} else if (filters) {
			params = params.concat(encodeFilters(filters));
		}
		var opt = {
			headers: {
				Accept: 'application/json' },
				url: url.format({
				protocol: 'https',
				host: 'octopart.com',
				pathname: apipath + path,
				search: params.join('&') + '&apikey=' + apikey
			})
		};
		return request.get(opt, cb ? function(err, res, body) {
			if (err)
				cb(err);
			else if (res.statusCode != 200)
				cb(new Error(JSON.parse(body).message));
			else
				cb(null, JSON.parse(body));
		} : null);
	};

	var sendWithFilters = function(path, params, filters, cb) {
		if (typeof filters === 'function') {
			cb = filters; // skip filters
		} else if (filters) {
			params = params.concat(encodeWithFilters(filters));
		}
		var opt = {
			headers: {
				Accept: 'application/json' },
				url: url.format({
				protocol: 'https',
				host: 'octopart.com',
				pathname: apipath + path,
				search: params.join('&') + '&apikey=' + apikey
			})
		};
		return request.get(opt, cb ? function(err, res, body) {
			if (err)
				cb(err);
			else if (res.statusCode != 200)
				cb(new Error(JSON.parse(body).message));
			else
				cb(null, JSON.parse(body));
		} : null);
	};

	['brands', 'categories', 'parts', 'sellers'].forEach(function(name) {
		// uids = '2239e3330e2df5fe' or ['2239e3330e2df5fe', ...]
		// filters = response filters
		self[name + 'ByID'] = function(uids, filters, cb) {
			if (Array.isArray(uids)) {
				var params = [].concat(uids).map(function(uid) {
					return 'uid[]=' + uid;
				});
				return send(name + '/get_multi', params, filters, cb);
			} else
				return send(name + '/' + uids, [], filters, cb);
		};
		// args = {q: 'foobar'} or [{q: 'foobar'}, ...]
		// filters = response filters
		self[name + 'Search'] = function(args, filters, cb) {
			var params = [].concat(args).map(function(key) {
				return querystring.stringify(key);
			});
			return send(name + '/search', params, filters, cb);
		};
	});

	// Handles searching for parts via category id(s)
	// ex. partsByCategory([8a1e4714bb3951d9], {limit: 15}, cb)
	self.partsByCategory = function(filters, args, cb){
		var params = [].concat(args).map(function(key) {
			return querystring.stringify(key);
		});
		if (Array.isArray(filters.include)) {
			filters.include = [].concat(filters.include).map(function(include) {
				return include;
			});
		}
		if (Array.isArray(filters.uids)) {
			filters.category_uids = [].concat(filters.uids).map(function(uid) {
				return uid;
			});
			delete filters.uids;
		}
		return sendWithFilters('parts/search', params, filters, cb);
	}

	// Handles finding categories that share the passed parent_id
	// https://octopart.com/api/v3/categories/search?apikey=API_KEY&filter[fields][parent_uid][]=8a1e4714bb3951d9
	// 8a1e4714bb3951d9 = Electronic Parts
	self.categoriesByFilter = function(args, filters, cb){
		var params = [].concat(args).map(function(key) {
			return querystring.stringify(key);
		});

		return sendWithFilters('parts/search', params, filters, cb);
	}

	// args = { queries: [{...}, {...}], exact_only: true }
	// filters = response filters
	self.partsMatch = function(args, filters, cb) {
		var params = Object.keys(args).map(function(key) {
			// Bug fix: Octopart doesn't like it when include items have quotes around them.
			// Also added ability to use includes[]
			// Usage example:
			// 		cli.partsMatch({
			//			queries: queries,
			//			exact_only: false,
			//			include: ['datasheets','imagesets'],
			// 		}
			if(key === 'include'){
				// Split the array and make separate includes like Octopart likes.
				if (Array.isArray(args[key])){
					var keys = '';
					for(var i = 0; i < args[key].length; i++) {
						if(i > 0){
							keys += '&' + key + '[]=' + querystring.escape(args[key][i]);
						} else {
							keys = key + '[]=' + querystring.escape(args[key][i]);
						}
					}
					return keys;
				} else {
					return key + '=' + querystring.escape(args[key]);
				}

			} else {
				return key + '=' + querystring.escape(JSON.stringify(args[key]));
			}
		});
		return send('parts/match', params, filters, cb);
	};

	return self;
};

exports.createV3 = function(apikey) {
	return new OctoNode(apikey, '/api/v3/');
};
