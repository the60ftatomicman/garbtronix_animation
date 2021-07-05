console.log('Welcome to the Grid');
var Garbtronix = function(url,sId,b){
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
		this.bounds     = {
			x: b ? b.x : undefined,
			y: b ? b.y : undefined
		}
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
		if(anim_data[i].match(/^(\*{1} R)/)){
			//Repeat if designated as repeater
			//
			let repeat_loops = anim_data[i].split('L ')[1];
			repeat_loops = repeat_loops ? parseInt(repeat_loops) : 1;
			//
			let repeat_range = anim_data[i].split('L ')[0].split('R ')[1];
			repeat_range = repeat_range ? repeat_range.split(',') : [scns.length-1,scns.length-1];
			
			let repeat_start = repeat_range[0] != '' ? parseInt(repeat_range[0]) : scns.length-1;
			if(repeat_start >= scns.length){
				console.log('Invalid start length!');
			}
			let repeat_end   = repeat_range[1] != '' ? parseInt(repeat_range[1]) : repeat_start;
			if(repeat_end >= scns.length){
				console.log('Invalid end length!');
			}
			//If we omitted or run into a weird issue just set to one away so we repeat the first index
			repeat_end = repeat_end || repeat_start;
			console.log('Repeating ['+repeat_start+'] to ['+repeat_end+']: ['+repeat_loops+'] times');
			for(let l=0;l<repeat_loops;l++){
				for(let r=repeat_start;r<=repeat_end;r++){
					scns.push(scns[r]);
				}
			}
		}else if(anim_data[i].match(/^(\*{1} S)/)){
			//shift last scene
			//
			let scene = scns[scns.length -1];
			let modify_data = anim_data[i].split('') || [];
			if (modify_data != []){
				// X or Y
				let modify_coord = modify_data[3] || '';
				//P or N for Positive or Negative. Assumed Posituve
				let modify_dir = modify_data[4] == 'N' ? -1:1;
				//numeric value or 1
				let modify_amt = parseInt(modify_data.slice(5).join('')) || 1;
				//If we were given a coord
				if(modify_coord != ''){
					for(let l=1;l<=modify_amt;l++){
						let new_scene = {
							count: scene.count,
							data : [[]],
							instr: scene.instr,
							text : ''
						};
						for(let s=0;s<scene.instr.length;s++){
							let scnData = scene.instr[s].split(' ')[1].split(',');
							let objRef  = scnData[0];
							let frame   = scnData[1] || 0;   
							let x       = parseInt(scnData[2]) || 0;
							let y       = parseInt(scnData[3]) || 0;
							x = modify_coord == 'X' ? x+(l*modify_dir) : x;
							y = modify_coord == 'Y' ? y+(l*modify_dir) : y;
							let offsetX = x >  0 ? 0 : Math.abs(x);
							let offsetY = y >  0 ? 0 : Math.abs(y);
							console.log("Getting Object: "+objRef+" frame: "+frame+ " at "+x+","+y);
							//console.log(objs[objRef]);
							this.fillScene(y,x,new_scene);
							//Add Our Characters from object
							this.fillCharacters(objs,objRef,frame,offsetY,offsetX,x,y,new_scene);
							//Join -- I hate to rebuild this string EACH time but fuuuudge it it works
							this.buildText(new_scene);
						}
						scns.push(new_scene);
					}
				}
			}

		}else if(anim_data[i].match(/^(\*{1} M)/)){
			//Move specific indexes from last scene. this is "modify"
			let scene               = scns[scns.length -1];
			let modify_instructions = [];
			let modify_amt          = parseInt(anim_data[i].slice(3)) || 1;
			//Get all of our instructions
			for(let j=i+1;j<anim_data.length;j+=anim_data[j].match(/^\*{3} E/) ? anim_data.length : 1){
				//compile all instructions...gunna have to do this all dirty like.
				if(!anim_data[j].match(/^\*{3} E/)){
					//** 2XP10
					let coord_position = anim_data[j].indexOf('X') > -1 ? anim_data[j].indexOf('X') : anim_data[j].indexOf('Y');
					modify_instructions.push({
						idx: anim_data[j].slice(3,coord_position),
						coord: anim_data[j][coord_position],
						dir: anim_data[j][coord_position+1] == 'N' ? -1 : 1,
						delta: parseInt(anim_data[j].slice(coord_position+2)),
						text: ''
					});
				}
			}
			//Now build scenes
			for(let l=1;l<=modify_amt;l++){
				let new_scene = {
					count: scene.count,
					data : [[]],
					instr: scene.instr,
					text : ''
				};
				//Do instruction replacement
				modify_instructions_idx = 0;
				for(let s=0;s<new_scene.instr.length;s++){
					let split_data = new_scene.instr[s].split(',');
					if(modify_instructions[modify_instructions_idx] && s == modify_instructions[modify_instructions_idx].idx){
						let delta = (modify_instructions[modify_instructions_idx].dir * modify_instructions[modify_instructions_idx].delta) * l;
						if(modify_instructions[modify_instructions_idx].coord == 'X'){
							split_data[2] = (parseInt(split_data[2])+delta).toString();
						}
						if(modify_instructions[modify_instructions_idx].coord == 'Y'){
							split_data[3] = (parseInt(split_data[3])+delta).toString();
						}
						new_scene.instr[s] = split_data.join(',');
						modify_instructions_idx++;
					}
					//Now do the classical scene add
					let scnData = new_scene.instr[s].split(' ')[1].split(',');
					let objRef  = scnData[0];
					let frame   = scnData[1] || 0;   
					let x       = parseInt(scnData[2]) || 0;
					let y       = parseInt(scnData[3]) || 0;
					let offsetX = x >  0 ? 0 : Math.abs(x);
					let offsetY = y >  0 ? 0 : Math.abs(y);
					console.log("Getting Object: "+objRef+" frame: "+frame+ " at "+x+","+y);
					//console.log(objs[objRef]);
					this.fillScene(y,x,new_scene);
					//Add Our Characters from object
					this.fillCharacters(objs,objRef,frame,offsetY,offsetX,x,y,new_scene);
					//Join -- I hate to rebuild this string EACH time but fuuuudge it it works
					this.buildText(new_scene);
				}
				scns.push(new_scene);
			}
			//Now loop again and push scenes
			
		}
		else if(anim_data[i].match(/^\*{1} [0-9]{1,}$/)){
			//Brand new scene!
			let scene_count = anim_data[i].split(' ')[1] || 1;
			scns.push({
				count: scene_count,
				data : [[]],
				instr: [],
				text : ''
			})
			console.log('Line '+i+' Count '+scene_count);
			for(let j=i;j<anim_data.length;j+=anim_data[j].match(/^\*{3} E/)?anim_data.length:1){
				if(anim_data[j].match(/^\*{2} /)){
					let currScn = scns[scns.length-1];
					currScn.instr.push(anim_data[j]);
					let scnData = anim_data[j].split(' ')[1].split(',');
					let objRef  = scnData[0];
					let frame   = scnData[1] || 0;   
					let x       = parseInt(scnData[2]) || 0;
					let y       = parseInt(scnData[3]) || 0;
					let offsetX = x >  0 ? 0 : Math.abs(x);
					let offsetY = y >  0 ? 0 : Math.abs(y);
					console.log("Getting Object: "+objRef+" frame: "+frame+ " at "+x+","+y);
					//console.log(objs[objRef]);
					this.fillScene(y,x,currScn);
					//Add Our Characters from object
					this.fillCharacters(objs,objRef,frame,offsetY,offsetX,x,y,currScn);
					//Join -- I hate to rebuild this string EACH time but fuuuudge it it works
					this.buildText(currScn)
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
Garbtronix.prototype.fillScene = function(y,x,currScn){
	//Fills in blank spaces to populate later. May not necessarily be needed.
	for(let cy=0;cy<=y;cy++){
		if(!currScn.data[cy]){currScn.data.push([]);}
		for(let cx=0;cx<=x;cx++){
			if(!currScn.data[cy][cx]){currScn.data[cy].push(' ');}							
		}
	}
}
Garbtronix.prototype.fillCharacters = function(objs,objRef,frame,offsetY,offsetX,x,y,currScn){
		var escaped_frame = objs[objRef].frames[frame];
		let frame_ln = objs[objRef].frames[frame].replace(/\\/g,"\\").split(/\r?\n/);
		for(let ln=0+offsetY;ln<=frame_ln.length;ln++){
			if(frame_ln[ln]!=undefined){
				let frame_ch = frame_ln[ln].split('');
				for(let ch=0+offsetX;ch<frame_ch.length;ch++){
					let cx = x+ch;
					let cy = y+ln;
					if(!currScn.data[cy]){currScn.data.push([]);}
					currScn.data[cy][cx] = frame_ch[ch];
				}

			}
		}
}
Garbtronix.prototype.buildText = function(currScn){
	currScn.text = '';
	var maxLineLength = this.bounds.y || currScn.data.length;
	for(let fd=0;fd<maxLineLength;fd++){
		if(currScn.data[fd]){
			var maxCharLength = this.bounds.x || currScn.data[fd].length || 10000;
			currScn.text += currScn.data[fd].slice(0,maxCharLength).join('').replace(/,/g,'');
			currScn.text += this.symbols.newline
		}
	}
}