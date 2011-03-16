/**
 * TIBCO PageBus(TM) version 2.0.0
 * 
 * Copyright (c) 2006-2009, TIBCO Software Inc.
 * All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not 
 * use this file except in compliance with the License. You may obtain a copy 
 * of the License at http://www.apache.org/licenses/LICENSE-2.0 . Unless
 * required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the 
 * specific language governing permissions and limitations under the License.
 *
 *
 * Includes code from the official reference implementation of the OpenAjax
 * Hub that is provided by OpenAjax Alliance. Specification is available at:
 *
 *  http://www.openajax.org/member/wiki/OpenAjax_Hub_Specification
 *
 * Copyright 2006-2009 OpenAjax Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not 
 * use this file except in compliance with the License. You may obtain a copy 
 * of the License at http://www.apache.org/licenses/LICENSE-2.0 . Unless
 * required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the 
 * specific language governing permissions and limitations under the License.
 *
 ******************************************************************************/

// prevent re-definition of the OpenAjax object
if(!window["OpenAjax"]){
	OpenAjax = new function(){
		var t = true;
		var f = false;
		var g = window;
		var ooh = "org.openajax.hub.";

		var h = {};
		this.hub = h;
		h.implementer = "http://openajax.org";
		h.implVersion = "2.0";
		h.specVersion = "2.0";
		h.implExtraData = {};
		var libs = {};
		h.libraries = libs;

		h.registerLibrary = function(prefix, nsURL, version, extra){
			libs[prefix] = {
				prefix: prefix,
				namespaceURI: nsURL,
				version: version,
				extraData: extra 
			};
			this.publish(ooh+"registerLibrary", libs[prefix]);
		}
		h.unregisterLibrary = function(prefix){
			this.publish(ooh+"unregisterLibrary", libs[prefix]);
			delete libs[prefix];
		}

		h._subscriptions = { c:{}, s:[] };
		h._cleanup = [];
		h._subIndex = 0;
		h._pubDepth = 0;

		h.subscribe = function(name, callback, scope, subscriberData, filter)			
		{
			if(!scope){
				scope = window;
			}
			var handle = name + "." + this._subIndex;
			var sub = { scope: scope, cb: callback, fcb: filter, data: subscriberData, sid: this._subIndex++, hdl: handle };
			var path = name.split(".");
	 		this._subscribe(this._subscriptions, path, 0, sub);
			return handle;
		}

		h.publish = function(name, message)		
		{
			var path = name.split(".");
			this._pubDepth++;
			this._publish(this._subscriptions, path, 0, name, message);
			this._pubDepth--;
			if((this._cleanup.length > 0) && (this._pubDepth == 0)) {
				for(var i = 0; i < this._cleanup.length; i++) 
					this.unsubscribe(this._cleanup[i].hdl);
				delete(this._cleanup);
				this._cleanup = [];
			}
		}

		h.unsubscribe = function(sub) 
		{
			var path = sub.split(".");
			var sid = path.pop();
			this._unsubscribe(this._subscriptions, path, 0, sid);
		}
		
		h._subscribe = function(tree, path, index, sub) 
		{
			var token = path[index];
			if(index == path.length) 	
				tree.s.push(sub);
			else { 
				if(typeof tree.c == "undefined")
					 tree.c = {};
				if(typeof tree.c[token] == "undefined") {
					tree.c[token] = { c: {}, s: [] }; 
					this._subscribe(tree.c[token], path, index + 1, sub);
				}
				else 
					this._subscribe( tree.c[token], path, index + 1, sub);
			}
		}

		h._publish = function(tree, path, index, name, msg, pid) {
			if(typeof tree != "undefined") {
				var node;
				if(index == path.length) {
					node = tree;
				} else {
					this._publish(tree.c[path[index]], path, index + 1, name, msg, pid);
					this._publish(tree.c["*"], path, index + 1, name, msg, pid);
					node = tree.c["**"];
				}
				if(typeof node != "undefined") {
					var callbacks = node.s;
					var max = callbacks.length;
					for(var i = 0; i < max; i++) {
						if(callbacks[i].cb) {
							var sc = callbacks[i].scope;
							var cb = callbacks[i].cb;
							var fcb = callbacks[i].fcb;
							var d = callbacks[i].data;
							if(typeof cb == "string"){
								// get a function object
								cb = sc[cb];
							}
							if(typeof fcb == "string"){
								// get a function object
								fcb = sc[fcb];
							}
							if((!fcb) || (fcb.call(sc, name, msg, d))) {
								cb.call(sc, name, msg, d, pid);
							}
						}
					}
				}
			}
		}
			
		h._unsubscribe = function(tree, path, index, sid) {
			if(typeof tree != "undefined") {
				if(index < path.length) {
					var childNode = tree.c[path[index]];
					this._unsubscribe(childNode, path, index + 1, sid);
					if(childNode.s.length == 0) {
						for(var x in childNode.c) 
					 		return;		
						delete tree.c[path[index]];	
					}
					return;
				}
				else {
					var callbacks = tree.s;
					var max = callbacks.length;
					for(var i = 0; i < max; i++) 
						if(sid == callbacks[i].sid) {
							if(this._pubDepth > 0) {
								callbacks[i].cb = null;	
								this._cleanup.push(callbacks[i]);						
							}
							else
								callbacks.splice(i, 1);
							return; 	
						}
				}
			}
		}
	};
	// Register the OpenAjax Hub itself as a library.
	OpenAjax.hub.registerLibrary("OpenAjax", "http://openajax.org/hub", "1.0", {});
}

if(!window["PageBus"]) {
PageBus = new function() {
	var D = 0;  
	var Q = []; 
	var that = this;
	
	this.version = "2.0.0";
	this._debug = function() {
		debugger;
	};

	_badParm = function() { 
		throw new Error("OpenAjax.hub.Errors.BadParameters"); 
	}

	_valPub = function(name) {
		if((name == null) || (name.indexOf("*") != -1) || (name.indexOf("..") != -1) || 
			(name.charAt(0) == ".") || (name.charAt(name.length-1) == ".")) 
			_badParm();
	}
	
	_valSub = function(name) {
		var path = name.split(".");
		var len = path.length;
		for(var i = 0; i < len; i++) {
			if((path[i] == "") ||
			  ((path[i].indexOf("*") != -1) && (path[i] != "*") && (path[i] != "**")))
				_badParm();
			if((path[i] == "**") && (i < len - 1))
				_badParm();
		}
		return path;
	}
	
	_cacheIt = function( subData ) {
		return ( (subData) && (typeof subData == "object") && (subData["PageBus"]) && (subData.PageBus["cache"]) );
	};

	
	/////////////////////////////////
	
	_TopicMatcher = function() {
		this._items = {};
	};
	
	_TopicMatcher.prototype.store = function( topic, val ) {
		var path = topic.split(".");
		var len = path.length;
		_recurse = function(tree, index) {
			if (index == len)
				tree["."] = { topic: topic, value: val };
			else { 
				var token = path[index];
				if (!tree[token])
					tree[token] = {}; 
				_recurse(tree[token], index + 1);
			}
		};
		_recurse( this._items, 0 );
	};
	
	_TopicMatcher.prototype.match = function( topic, exactMatch ) {
		var path = topic.split(".");
		var len = path.length;
		var res = [];
		_recurse = function(tree, index) {
			if(!tree)
				return;
			var node;
			if (index == len)
				node = tree;
			else {	
				_recurse(tree[path[index]], index + 1);
				if(exactMatch)
					return;
				if(path[index] != "**") 
					_recurse(tree["*"], index + 1);
				node = tree["**"];
			}
			if ( (!node) || (!node["."]) )
				return;
			res.push(node["."]);
		};
		_recurse( this._items, 0 );
		return res;
	};
	
	_TopicMatcher.prototype.exists = function( topic, exactMatch ) {
		var path = topic.split(".");
		var len = path.length;
		var res = false;
		_recurse = function(tree, index) {
			if(!tree)
				return;
			var node;
			if (index == len)
				node = tree;
			else {	
				_recurse(tree[path[index]], index + 1);
				if(res || exactMatch)
					return;
				if(path[index] != "**") {
					_recurse(tree["*"], index + 1);
					if(res)
						return;
				}
				node = tree["**"];
			}
			if ( (!node) || (!node["."]) )
				return;
			res = true;
		};
		_recurse( this._items, 0 );
		return res;
	};
	
	_TopicMatcher.prototype.clear = function( topic ) {
		var path = topic.split(".");
		var len = path.length;
		_recurse = function(tree, index) {
			if(!tree)
				return;
			if (index == len) {
				if (tree["."])
					delete tree["."];
			}
			else {	
				_recurse(tree[path[index]], index + 1);
				for(var x in tree[path[index]]) {
					return;
				}
				delete tree[path[index]];
			}
		};
		_recurse( this._items, 0 );
	};
	
	_TopicMatcher.prototype.wildcardMatch = function( topic ) {
		var path = topic.split(".");
		var len = path.length;
		var res = [];
		_recurse = function( tree, index ) {
			var tok = path[index];
			var node;
			if( (!tree) || (index == len) )
				return;		
			if( tok == "**" ) {
				for( var n in tree ) {
					if( n != "." ) {
						node = tree[n];
						if( node["."] )
							res.push( node["."] );
						_recurse( node, index );
					}
				}
			}
			else if( tok == "*" ) {
				for( var n in tree ) {
					if( (n != ".") && (n != "**") ){
						node = tree[n];
						if( index == len - 1 ) {
							if( node["."] )			
								res.push( node["."] );
						}
						else
							_recurse( node, index + 1 );
					}
				}
			} 
			else {
				node = tree[tok];
				if(!node)
					return;
				if( index == len - 1 ) {
					if( node["."] )
						res.push( node["."] );
				}
				else 
					_recurse( node, index + 1 );
			}
		};
		_recurse( this._items, 0 );
		return res;
	};
	
	
	/////////////////////////////////
	
	this._refs = {};
	this._doCache = new _TopicMatcher();
	this._caches = new _TopicMatcher();
	
	_isCaching = function( topic ) {
		return that._doCache.exists( topic, false );
	};	
	
	_copy = function(obj) {
		var c;
		if( typeof(obj) == "object" ) {
			if(obj == null)
				return null;
			else if(obj.constructor == Array) {
				c = [];
				for(var i = 0; i < obj.length; i++)
					c[i] = _copy(obj[i]);
				return c;
			}
			else if(obj.constructor == Date) {
				c = new Date();
				c.setDate(obj.getDate());
				return c;
			}
			c = {};
			for(var p in obj) 
				c[p] = _copy(obj[p]);
			return c;
		}
		else {
			return obj;
		}
	};
		
	this._add = function( topic, subID ) {
		var dc;
		var dca = this._doCache.match( topic, true );
		if( dca.length > 0 )
			dc = dca[0].value;
		else {
			dc = { rc: 0 };
			this._doCache.store( topic, dc );
		}
		dc.rc++;
		this._refs[subID] = topic;
	};
	
	this._remove = function( subID ) {
		var topic = this._refs[subID];
		if( !topic )
			return;
		delete this._refs[subID];
		var dca = this._doCache.match( topic, true );
		if(dca.length == 0) 
			return;	
		dca[0].value.rc--;
		if(dca[0].value.rc == 0) {			
			this._doCache.clear(topic);
			var caches = this._caches.wildcardMatch(topic);
			for(var i = 0; i < caches.length; i++) {
				if( !(this._doCache.exists(caches[i].topic, false)) )
					this._caches.clear(caches[i].topic);
			}
		}
	};

	this.subscribe = function( topic, scope, onData, subscriberData ) {
		if(!subscriberData)
			subscriberData = null;
		var sid = OpenAjax.hub.subscribe( topic, onData, scope, subscriberData );
		
		// Create caches after we subscribe
		
		if( _cacheIt( subscriberData ) ) {
			this._add( topic, sid );
			var vals = this.query( topic );
			for (var i = 0; i < vals.length; i++) {
				try {
					onData.call(scope ? scope : window, vals[i].topic, vals[i].value, subscriberData);
				}
				catch(e) {
					PageBus._debug();
				}
			}
		}
		return sid;
	}
	
	this.publish = function ( topic, data ) {	
		_valPub( topic );
		Q.push({ n: topic, m: data, d: (D + 1) });
		
		
		if( _isCaching( topic ) ) {
			
			// Cache a copy of the message before we deliver the message
			
			try {	
				this._caches.store( topic, data );
			} catch(e) {
				_badParm();
			}
			
		}
		
		if(D == 0) {
			while(Q.length > 0) {
				var qitem = Q.shift();
				var path = qitem.n.split(".");
				try {
					D = qitem.d;
					OpenAjax.hub.publish(qitem.n, qitem.m);
					D = 0;
				}
				catch(err) {
					D = 0;
					throw(err);
				}
			}
		}
	}
	
	this.unsubscribe = function(sub) {
		try {
			this._remove(sub); 
			OpenAjax.hub.unsubscribe(sub);
		}
		catch(err) {
			_badParm();
		}
	}
	
	this.store = function( topic, data ) {
		if( !_isCaching( topic ) )
			throw new Error( "PageBus.cache.NoCache" );
		this.publish( topic, data );
	};
	
	this.query = function( topic ) {
		try {
			_valSub( topic ); 
			return this._caches.wildcardMatch( topic );
		} catch(e) {
			_badParm();
		}
	};
};

OpenAjax.hub.registerLibrary("PageBus", "http://tibco.com/PageBus", "1.2.0", {});
}

