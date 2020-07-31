console.log('Welcome to the Grid');
var Garbtronix = function(url,sId){
		this.frames = {
			count  :0,
			current:0
		};
		this.keys    = [];
		this.symbols = {
			newline   : '\r\n',
			startFrame: '*',
			endFrame  : '**',
			gotoFrame : 'GOTO',
			metaSplit :',',
			schematicSection : '****'
		};
		this.frameDelay = 66; // 15ish frames a second.
		this.screenId   = sId || '#screen';
		this.sourceURL  = url || '';
		// Call functions to prep
		$(this.screenId).css({"white-space":"pre","font-family":"Lucida, Console, monospace"});
		this.setToLoading();
};
Garbtronix.prototype.splitOnNewLine = function(str){
	return str.split(/\r?\n/g);
}
Garbtronix.prototype.setToClear = function(){
	this.frames = {
		count  :0,
		current:0
	};
	this.keys = [];
}
Garbtronix.prototype.setToLoading = function(){
	this.frames = {
			count  :10,
			current:0
	};
	this.keys = [
		{idx:0,line:3 ,total:1,count:1,data:'L'},
		{idx:1,line:7 ,total:1,count:1,data:'LO'},
		{idx:2,line:11,total:1,count:1,data:'LOA'},
		{idx:3,line:15,total:1,count:1,data:'LOAD'},
		{idx:4,line:19,total:1,count:1,data:'LOADI'},
		{idx:5,line:23,total:1,count:1,data:'LOADIN'},
		{idx:6,line:27,total:1,count:1,data:'LOADING'},
		{idx:7,line:31,total:9,count:9,data:'LOADING.'},
		{idx:8,line:35,total:9,count:9,data:'LOADING..'},
		{idx:9,line:39,total:9,count:9,data:'LOADING...'}
	];
}
Garbtronix.prototype.play = function(){
	var self = this;
	setTimeout(function(){
		if(self.keys[self.frames.current].count == self.keys[self.frames.current].total){
			$(self.screenId).text(self.keys[self.frames.current].data);
			self.keys[self.frames.current].count--;
		}else if(self.keys[self.frames.current].count == 0){
			self.keys[self.frames.current].count = self.keys[self.frames.current].total;
			self.frames.current = self.frames.current < self.keys.length-1 ? self.frames.current+1 : 0;
		}else{
			self.keys[self.frames.current].count--;
		}
		self.play();
	}, self.frameDelay);
}
Garbtronix.prototype.load = function(){
	var self = this;
	$.get(self.sourceURL,function(response) {
		self.setToClear();
		self.parseAnimation(response);
	});
}
Garbtronix.prototype.parseAnimation = function(data){
	let anim_data = this.splitOnNewLine(data);
	let isFrameData = false;
	let frame_data  = '';
	let frame_meta  = [];
	let skip_index  = -1;
	for(let i=0;i<anim_data.length;i++){
		if(i == skip_index){
			if(i==skip_index+1){
				skip_index=-1;
			}
		}else{
			if(anim_data[i]==this.symbols.startFrame){
				frame_meta = anim_data[i-1].split(this.symbols.metaSplit);
				if(frame_meta[0] == this.symbols.gotoFrame){
					for(let j=0;j<this.keys.length;j++){
						if(this.keys[j].idx == frame_meta[1]){
							skip_index = i;
							i = this.keys[j].line-1;
						}
					}
				}else{
					isFrameData = true;
					this.frames.count++;
					this.keys.push({
						idx   : frame_meta[0],
						line  : i,
						total : frame_meta[1],
						count : frame_meta[1],
						data  : ''
					})
				}
			}
			if(anim_data[i]==this.symbols.endFrame){
				this.keys[this.frames.count-1].data=frame_data;
				//reset
				isFrameData = false;
				frame_data  = '';
				frame_meta  = [];
			}
			if(isFrameData && anim_data[i]!=this.symbols.startFrame){
				frame_data+=anim_data[i]+this.symbols.newline;
			}
		}
	}
}
Garbtronix.prototype.parseSchematic = function(data){
	let anim_data = this.splitOnNewLine(data);
	let idxs      = {};
	let objs      = {};
	let scns      = [];
	//Get Sections
	for(let i=0;i<anim_data.length;i++){
		if(anim_data[i].match(/^\*{4} /)){
			let section = anim_data[i].slice(5).trim().toLowerCase();
			idxs[section] = i;
		}
	}
	//Get Objects
	for(let i=idxs.objects;i<idxs.scene;i++){
		if(anim_data[i].match(/^\*{1}$/)){
			let name = anim_data[i-1];
			let obj_frames    = [];
			let collectFrames = false;
			for(let j=i;j<idxs.scene;j+=anim_data[j].match(/^\*{3} E/)?idxs.scene:1){
				let isFrameSeperator = anim_data[j].match(/^\*{2} /);
				if(isFrameSeperator){
					//console.log("Line "+j+" "+anim_data[j]);
					collectFrames = true;
					obj_frames.push('');
				}else if(anim_data[j].match(/^\*{3} E/)){
					//console.log("End Object on line "+j+" "+anim_data[j]);
					collectFrames = false;
				}
				if(collectFrames && !isFrameSeperator){
					obj_frames[obj_frames.length-1] += anim_data[j]+this.symbols.newline;
				}
				
			}
			objs[name] = {
				line  :i,
				frames:obj_frames
			};
		}
	}
	//Get Scenes
	for(let i=idxs.scene;i<anim_data.length;i++){
		console.log(i);
		if(anim_data[i].match(/^\*{1} [0-5]{1,}$/)){
			let scene_count = anim_data[i].split(' ')[1] || 1;
			scns.push({
				count: scene_count,
				data : [[]],
				text : ''
			})
			console.log('Line '+i+' Count '+scene_count);
			for(let j=i;j<anim_data.length;j+=anim_data[j].match(/^\*{3} E/)?anim_data.length:1){
				if(anim_data[j].match(/^\*{2} /)){
					let currScn = scns[scns.length-1];
					let scnData = anim_data[j].split(' ')[1].split(',');
					let objRef  = scnData[0];
					let frame   = scnData[1] || 0;   
					let x       = parseInt(scnData[2]) || 0;
					let y       = parseInt(scnData[3]) || 0;
					console.log("Getting Object: "+objRef+" frame: "+frame+ " at "+x+","+y);
					//console.log(objs[objRef]);
					//Fill in Scene
					for(let cy=0;cy<=y;cy++){
						if(!currScn.data[cy]){currScn.data.push([]);}
						for(let cx=0;cx<=x;cx++){
							if(!currScn.data[cy][cx]){currScn.data[cy].push(' ');}							
						}
					}
					//Add Our Characters from object
					let frame_ln = objs[objRef].frames[frame].split(/\r?\n/);
					for(let ln=0;ln<frame_ln.length;ln++){
						let frame_ch = frame_ln[ln].split('');
						for(let ch=0;ch<frame_ch.length;ch++){
							let cx = x+ch;
							let cy = y+ln;
							if(!currScn.data[cy]){currScn.data.push([]);}
							currScn.data[cy][cx] = frame_ch[ch];
						}
					}
					//Join -- I hate to rebuild this string EACH time but fuuuudge it it works
					currScn.text = '';
					for(let fd=0;fd<currScn.data.length;fd++){
						currScn.text += currScn.data[fd].join('').replace(/,/g,'')+this.symbols.newline;
					}
				}
			}
		}
	}
	//Debug
	console.log(scns);
	console.log(objs);
	console.log(idxs);
	//Convert to .txt file
	var output = '';
	for(let i=0;i<scns.length;i++){
		let s = scns[i];
		output += i+','+s.count+this.symbols.newline;
		output += '*\r\n';
		output += s.text;
		output += '**\r\n';
	}
	console.log(output);
}