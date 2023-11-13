_dB = (d) => 10*Math.log10(d)
_mean = (d) => _.reduce(d,(memo, num) => memo + num, 0) / d.length || 1
_mag = (d,e) => Math.sqrt(d*d+e*e)
_ph = (d,e) => Math.atan2(e,d)

function waterfall(container){
    var self=this;
    this.container=container

    this.kotekan_url = "localhost"
    this.kotekan_port= 12048

	this.num_freqs=1024;
	this.waterfall_buffer_length=1000;
	this.waterfall_buffer_display_length=300;
	this.plot_width=512;
	this.margin=[100,100];
	this.waterfall_plot_height=500;

    this.n_inputs=2;
    this.datatype=[['auto','auto'],['real','imag']]
    this.datatype=[['auto','auto'],['mag','phase']]

    this.spectrum_baseline=[];
	this.timearr=[];
	this.ms_per_datum=25.;
	this.freq_list=[];

	this.cb = new imgPlotter();
	this.cb_rect;
	this.cb.min=0;
	this.cb.max=20;

	this.cb_phase = new imgPlotter();
    this.cb_phase.min = -Math.PI
    this.cb_phase.max = Math.PI

	this.cb_ri = new imgPlotter();
    this.cb_ri.min = -0.1
    this.cb_ri.max = 0.1

	this.time=new Date().getTime();

    $("#"+this.container).width(this.plot_width+this.margin[0])
    this.jqcontainer=$("#"+this.container)
    	.css('position','relative')
    	.attr('width',this.plot_width+this.margin[0])
    	.attr('height',this.waterfall_plot_height+this.margin[1])
		.width(this.plot_width+this.margin[0])
    	.height(this.waterfall_plot_height+this.margin[1])

    var yaxis_div = $( "<div/>").uniqueId()
        .css({'width':this.margin[0],
                'font-size':'10pt',
                'float':'left'})
        .appendTo(this.jqcontainer)
	this.yaxis_scale = d3.time.scale.utc()
			    .domain([new Date(this.time),
			    		 new Date(this.time+this.waterfall_buffer_display_length*this.ms_per_datum)])
			    .range([0, this.waterfall_plot_height]);
    this.yaxis = d3.svg.axis().ticks(this.waterfall_plot_height*this.ms_per_datum/1000/2)
				              .scale(this.yaxis_scale).orient("left").tickFormat(d3.time.format('%H:%M:%S'))
    this.yaxisplot=d3.select('#'+yaxis_div[0].id).append("svg")
	    .style("position","relative")
	    .attr("height", this.waterfall_plot_height)
		.append("g")
	    .attr("transform", "translate(" + this.margin[0] + "," + 0 + ")")
	    .call(this.yaxis)
    this.yaxisplot.select('path').style({'stroke': 'black', 'fill': 'none', 'stroke-width': '1px'})
    this.yaxisplot.append("text")
			.attr("text-anchor","middle")
			.attr("font-size",20)
			.attr("y",-this.margin[0]+35)
			.attr("x",-this.waterfall_plot_height/2)
			.attr("transform", "rotate(-90)")
			.text("Time");

    var waterfall_plot_div=$( "<div/>").uniqueId()
                            .css({
                                'position':'relative',
                                'font-size':'8pt',
                                'float':'left',
                                'width':this.plot_width,
                        //    				'height':this.waterfall_plot_height,'width':this.margin[0],
                            })
                            .attr('class','axis')
                            .appendTo(this.jqcontainer)
    this.scroll_canvas=[]
    this.scroll_data=[]
    for (xi = 0; xi<this.n_inputs; xi++){
        this.scroll_canvas[xi] = [];
        this.scroll_data[xi] = []
        for (yi = 0; yi<this.n_inputs; yi++){
            this.scroll_data[xi][yi] = []
            this.scroll_canvas[xi][yi]=$( "<canvas/>")
                                    .width(this.plot_width/this.n_inputs-2)
                                    .height(this.waterfall_plot_height/this.n_inputs-2)
                                    .css({position:'relative',float:'left',border:'1px solid black'})//this.margin[0]})
                                    .appendTo(waterfall_plot_div)
        }
    }
                        
    var freq_div = $("<div/>").uniqueId().height(20)
    						.css({
		           				'position':'relative','float':'left',
		        				'font-size':'8pt',
	    	    				'height':20,'width':this.plot_width,
//	    	    				'left':this.margin[0]
	            			})
	            			.attr('class','axis')
							.appendTo(this.jqcontainer)
	this.freq_scale = d3.scale.linear().range([0,this.plot_width]).domain([1,2]);
	this.freq_axis = d3.svg.axis().scale(this.freq_scale).orient("bottom")
	this.freq_axisplot=d3.select('#'+freq_div[0].id).append("svg")
	    .style("position","absolute")
	    .style("left",-10)
	    .attr("width", this.plot_width+20)
		.append("g")
	    .attr("transform", "translate(" + 10 + "," + 0 + ")")
	    .call(this.freq_axis)
	
	this.freq_axisplot.append("text")
			.attr("text-anchor","middle")
			.attr("font-size",20)
			.attr("x",this.plot_width/2)
			.attr("y",this.margin[1]/2)
			.text("Frequency [MHz]");

}

waterfall.prototype.draw =
	function()  {
		var self=this
		var now = new Date().getTime();
		var dt = now - (this.time || now);
		if (dt < 50) return;
		this.time = now;
		if (this.r > 0) {return;}
		this.r=requestAnimationFrame(function(){self.dodraw(); self.r=0;});
	}


waterfall.prototype.dodraw =
	function()  {
		var scd=this.scroll_data;
		var scroll_img=[];

        for (xi = 0; xi<this.n_inputs; xi++)
            for (yi = 0; yi<this.n_inputs; yi++) {
                this.scroll_canvas[xi][yi].attr('height', this.waterfall_buffer_display_length)
            }
        for (xi = 0; xi<this.n_inputs; xi++)
            for (yi = 0; yi<this.n_inputs; yi++) {
        	 	var c = this.scroll_canvas[xi][yi][0].getContext("2d");
                c.imageSmoothingEnabled = false;
                imageData = c.createImageData(this.num_freqs,this.waterfall_buffer_display_length)
                var disp_start=Math.max(0,scd[xi][yi].length-this.waterfall_buffer_display_length);
                if ((this.datatype[xi][yi] == 'auto') || (this.datatype[xi][yi] == 'mag')) blitter=this.cb
                else if ((this.datatype[xi][yi] == 'real') || (this.datatype[xi][yi] == 'imag')) blitter=this.cb_ri
                else if (this.datatype[xi][yi] == 'phase') blitter=this.cb_phase
                else{
                    console.log("Unknown data type!")
                    return
                }
                for (j=disp_start; j<scd[xi][yi].length; j++){
                    scroll_img[j]=[]
                    for (i=0; i<this.num_freqs; i++){
                        if (this.datatype[xi][yi] == 'auto') {
                            scroll_img[j][i]=10*Math.log10(scd[xi][yi][j][i])
                        }
                        else if (this.datatype[xi][yi] == 'mag') {
                            scroll_img[j][i]=_mag(scd[1][0][j][i], scd[1][1][j][i])
                        }
                        else if ((this.datatype[xi][yi] == 'real') || (this.datatype[xi][yi] == 'imag')){
                            scroll_img[j][i]=scd[xi][yi][j][i]
                        }
                        else if (this.datatype[xi][yi] == 'phase'){
                            scroll_img[j][i]=_ph(scd[1][1][j][i],scd[1][0][j][i])
                        }
                        else{
                            console.log("Unknown data type!")
                            return
                        }
                        blitter.setPixel(imageData,i,j-disp_start,scroll_img[j][i])
                    }
                }
                c.putImageData(imageData, 0, 0);

                if (scd[xi][yi].length > this.waterfall_buffer_display_length)
                {
                    this.yaxis_scale.domain([ new Date(this.timearr[this.timearr.length-this.waterfall_buffer_display_length]*1e3),
                                        new Date(this.timearr[this.timearr.length-1]*1e3) ])
                    this.yaxisplot.call(this.yaxis)
                }
            }
/*
		this.spectrum = _.map(_.transpose(this.scroll_data),_mean)
		this.spectrum_latest = _.map(_.transpose(this.scroll_data),_.last)
		
		var f = Array.from(this.freq_list)
		var spectrum_plot_data_update = {
			x: [f,f,f],
			y: [_.map(this.spectrum,_dB),_.map(this.spectrum_latest,_dB),_.map(this.spectrum_baseline,_dB)],
		}
		var spectrum_plot_layout_update = {
			'yaxis.range':[this.cb.min,this.cb.max],
			'yaxis.visible':[this.show_spectrum_mean,this.show_spectrum_latest,this.show_spectrum_baseline]
		}
		Plotly.update(this.spectrum_plot, spectrum_plot_data_update,spectrum_plot_layout_update);


		var spectrum_excess_plot_data_update = {
			x: [f,f],
			y: [_.map(_.map(this.spectrum,(v, i) => v / this.spectrum_baseline[i]),_dB),
				_.map(_.map(this.spectrum_latest,(v, i) => v / this.spectrum_baseline[i]),_dB),
				],
		}
		Plotly.restyle(this.spectrum_excess_plot, spectrum_excess_plot_data_update);
*/
	}

waterfall.prototype.openSocket =
	function()
	{
		this.isopen=false;
	    this.socket = new WebSocket("ws://localhost:8539");
	    this.socket.binaryType = "arraybuffer";
	    self=this
	    this.socket.onopen = function() {
	       console.log("Connected!");
	       this.isopen = true;
	    }
	    this.socket.onmessage = function(e) {
	       if (typeof e.data == "string") {
	       	  msg=JSON.parse(e.data)
	          console.log("Text message received: " + e.data)
	          for (var key in msg)
	          {
	          	console.log(key,msg[key])
	          }
     		  self.num_freqs=msg['nfreq'];
              for (xi = 0; xi<self.n_inputs; xi++)
                   for (yi = 0; yi<self.n_inputs; yi++) {
                    self.scroll_canvas[xi][yi].attr('width', self.num_freqs)
                }
	       } else {
	       	  var msgtype = new Int8Array(e.data.slice(0,1))[0]

	       	  switch (msgtype) {
	       	  	case 1: //freq list
	       	  	  self.freq_list = new Float32Array(e.data.slice(1))
				  self.freq_scale.domain([self.freq_list[0],self.freq_list[self.num_freqs-1]])
				  self.freq_axisplot.call(self.freq_axis)
				  break;
	       	  	case 2: //timestep
		       	  var timestamp = new Float64Array(e.data.slice(1,9))[0]
		       	  while (self.timearr.length>self.waterfall_buffer_length) {self.timearr.shift();}
		       	  self.timearr.push(timestamp);
		          var arr = new Float32Array(e.data.slice(9));
                  var dat = _.chunk(arr,self.num_freqs)
                  for (var xi=0; xi<self.n_inputs; xi++)
                    for (var yi=0; yi<self.n_inputs; yi++)
                    {
                        while (self.scroll_data[xi][yi].length>self.waterfall_buffer_length) {self.scroll_data[xi][yi].shift();}
                        self.scroll_data[xi][yi].push(dat[xi*self.n_inputs + yi]);  
                    }
				  break;
			  }
	       }
	       self.draw();
	    }
	    this.socket.onerror = function(error) {
		};

	    this.socket.onclose = function(e) {
 			console.log("Connection closed.");
// 	        this.socket = null;
	        this.isopen = false;
	    }
	}

waterfall.prototype.closeSocket =
	function()
	{
		this.socket.close()
	}

waterfall.prototype.addColorSlider = 
	function(target,range)
	{
		var width=$("#"+target).width()
	    var self=this
	    var inrange=[-1000,1000]
	    var scale=(inrange[1]-inrange[0])/(range[1]-range[0])
	    var slider_height=50
		var slider_text=[]
		var marg=15
		var width=$("#"+target).width()

	    wrapper=$("<div style='margin:0px'/>").uniqueId().height(slider_height).appendTo($("#"+target))
	    cbslider=$("<div/>").uniqueId().appendTo(wrapper)
	    	.css({left:marg, width:width-2*marg})

		cbslider.slider({min:inrange[0],max:inrange[1],range:true,
						values:[(this.cb.min-range[0])*scale+inrange[0],
								(this.cb.max-range[0])*scale+inrange[0]],
						slide:function(event, ui){
							self.cb.min=(ui.values[0]-inrange[0])/scale+range[0];
							self.cb.max=(ui.values[1]-inrange[0])/scale+range[0];
							slider_text[0].attr({"text":self.cb.min.toFixed(2)});
							slider_text[0].attr({"x":(ui.values[0]-inrange[0])/(inrange[1]-inrange[0])*(width-2*marg)+marg});
							slider_text[1].attr({"text":self.cb.max.toFixed(2)});
							slider_text[1].attr({"x":(ui.values[1]-inrange[0])/(inrange[1]-inrange[0])*(width-2*marg)+marg});	

							for (i=0; i<self.cb_tags.length; i++){
								self.cb_tags[i].attr({"text":(i/(self.cb_tags.length-1)*(self.cb.max-self.cb.min)+self.cb.min).toFixed(2)});
							}
							self.draw();
						}})
//		cbslider.width(width);


		var rr=Raphael($("<div style='position:relative'/>").uniqueId().appendTo(wrapper)[0].id,width, 50);
		rr.canvas.style.position="absolute";
		rr.canvas.style.zIndex="100";
		rr.setStart();
		slider_text[0]=rr.text((this.cb.min-range[0])/(range[1]-range[0])*(width-2*marg)+marg,13,self.cb.min.toFixed(2));
		slider_text[0].attr({'font-size': 12});
		slider_text[1]=rr.text((this.cb.max-range[0])/(range[1]-range[0])*(width-2*marg)+marg,13,self.cb.max.toFixed(2));
		slider_text[1].attr({'font-size': 12});
		rr.text(width/2,30,"Color Bar Range [dB]").attr({'font-size':14});
		rr.setFinish()
	}

waterfall.prototype.addColorBar = 
	function(target)
	{
		var cb_height=50
		var marg=15
		var width=$("#"+target).width()

	    wrapper=$("<div style='margin:0px'/>").uniqueId().height(cb_height).appendTo($("#"+target))
	    cb=$( "<div/>").uniqueId().appendTo(wrapper)

		var rr = Raphael(cb[0].id, width,cb_height);
		rr.setStart()
		this.cb_rect=rr.rect(marg,0,width-2*marg,30).attr({fill:this.cb.cb_grad});

		this.cb_tags=[]
		var ntags=5
		for (i=0; i<ntags; i++)
		{
			this.cb_tags[i]=rr.text(i/(ntags-1)*(width-2*marg),40,(i/(ntags-1)*(this.cb.max-this.cb.min)+this.cb.min).toFixed(2))
							.attr({'text-anchor':'start'});	
		}

		rr.setFinish();
	}

waterfall.prototype.addColorSelect =
	function(target,cb2use)
	{
		var self=this
		var marg=15
		var width=$("#"+target).width()

		cp=$("<select/>").appendTo($("<div/>").appendTo("#"+target).css({margin:marg}))
		for (var newcm of cb2use){
			if (newcm in this.cb.colormaps){
			    cp.append("<option>"+newcm+"</option>")}
			else {console.log(newcm+" not a known colormap!")}
		}
		cp.selectmenu({
			change: function(event, data){self.change_palette(event, data);},
			width: width-2*marg}
		)
		.data("ui-selectmenu")
		._renderItem=function(ul, item) {
			self.li = $( "<li>", {text: item.label});
			var im = $( "<span/>")
						.appendTo(self.li)
						.css('float','right');

			var rr = Raphael(im[0],"100%",Math.ceil(this.button[0].clientHeight/2));
			rr.setStart();
			rr.rect(0,0,"100%","100%").attr({fill:self.cb.gradString(self.cb.colormaps[item.label])});
			rr.setFinish();

			return self.li.appendTo(ul);
		};

	}

waterfall.prototype.start = function() {
	self=this
/*
    fetch('http://'+self.kotekan_url+':'+self.kotekan_port+'/airspy_input/get_config',{})
		.then(r => r.json().then(data => {
			self.airspy_config=data
			self.slider_gain_lna.slider('value',self.airspy_config["lna_gain"])
			self.slider_gain_lnat.text(self.airspy_config["lna_gain"])
			self.slider_gain_mix.slider('value',self.airspy_config["lna_gain"])
			self.slider_gain_mixt.text(self.airspy_config["mix_gain"])
			self.slider_gain_if.slider('value',self.airspy_config["lna_gain"])
			self.slider_gain_ift.text(self.airspy_config["if_gain"])
		}))
        */
	this.openSocket();
}
waterfall.prototype.stop = function() {
	this.closeSocket();
}

waterfall.prototype.addStartStop =
	function(target)
	{
		self=this
	    wrapper=$("<div/>").uniqueId().appendTo($("#"+target)).css({margin:45})
		self.startstop_btn = $("<button/>").appendTo($("<div/>").appendTo(wrapper))
				.button({label:'Start',icons:{primary: "ui-icon-play"}})
				.css({margin:"0 auto",display:"block"})
				.css({'border':'1px solid'})
				.click(function() {
				 	if ( $( this ).text() === "Stop" ) {
						$( this ).button( "option", {label: "Start", icons: {primary: "ui-icon-play"}})
							.css({'border':'1px solid'})
						self.stop();
				    } else {
						$( this ).button( "option", {label: "Stop", icons: {primary: "ui-icon-stop"}})
							.css({'border':'3px solid green'})
						self.start();
					}
				});
	}

waterfall.prototype.addRecordButton = 
	function(target)
	{
		self = this
		this.recording = false
		this.fn_idx = 0
		var marg=15
		var width=$("#"+target).width()
	    wrapper=$("<div/>").uniqueId().css({'margin':marg,'width':'100%'})
	    			.height(45).width(width-2*marg).appendTo($("#"+target))

		this.record_fn=$("<input type='text'/>")
				.css({'width':'50%','float':'left', 'font-size':'16pt', 'margin-top':5})
				.val("output"+("000" + this.fn_idx).slice(-4)+".dat")
				.appendTo(wrapper)

		this.record_btn = $("<button/>").appendTo($( "<div style='margin:10px'/>").appendTo(wrapper))
				.css({'float':'right'})
				.button({label:'Record', icons: {primary: "ui-icon-disk"}})
				.click(function() {
					if (!self.recording) {
						self.socket.send(JSON.stringify({'type': 'record', 'state': true, 'file': self.record_fn.val()}))
						$ (this ).button( "option", {label: "Recording", icons: {primary: "ui-icon-bullet"}})
						self.recording = true
					}
					else {
						self.socket.send(JSON.stringify({'type': 'record', 'state': false, 'file': "null"}))
						$ (this ).button( "option", {label: "Record", icons: {primary: "ui-icon-blank"}})
						self.recording = false
						self.fn_idx = self.fn_idx+1;
						self.record_fn.val("output"+("000" + self.fn_idx).slice(-4)+".dat")
					}
				});
	}

waterfall.prototype.addAirspyGainControl =
	function(target)
	{
		self=this
		this.adc={'mean':0, 'rms':0, 'railfrac':0};

		change_gain = function(type,value,o){
			fetch('http://'+o.kotekan_url+':'+o.kotekan_port+'/airspy_input/config', {
				mode: 'no-cors',
			    method: 'POST',
			    headers: {
			        'Accept': 'application/json',
			        'Content-Type': 'application/json'
			    },
			    body: JSON.stringify({[type]: value})
			})
		   .then(r =>
			   	fetch('http://'+o.kotekan_url+':'+o.kotekan_port+'/airspy_input/adcstat',{})
			   		 .then(r => r.json().then(data => {
			   		 		self.adc=data
			   		 		self.adcmean.text("Mean: "+self.adc['mean'].toFixed(2))
			   		 		self.adcrms.text("RMS: "+self.adc['rms'].toFixed(2))
			   		 		self.adcrailfrac.text("Rail %: "+(self.adc['railfrac']*100).toFixed(2))
					 }))
		   )
		}

		var marg=15
		var width=$("#"+target).width()
	    var slider_width=50
	    var slider_height=200
	    wrapper=$("<div style='margin:10px,width:100%'/>").uniqueId()
	    			.height(slider_height).width(width-2*marg).appendTo($("#"+target))

	    gainwrap=$('<div/>').uniqueId().css({width:3*(slider_width+4)}).appendTo(wrapper)
		$("<p/>").css({'font-family':'sans-serif','text-align':'center','margin':marg})
		    		.text("Gain").appendTo(gainwrap)

	    adcwrap=$('<div/>').uniqueId().css({width:'auto'}).appendTo(wrapper)
			    .css({'font-family':'sans-serif','font-size':'10pt','text-align':'left','margin':marg})
		$("<p>").text("ADC Stats").css({'font-size':'14pt','text-align':'center'}).appendTo(adcwrap)
		this.adcmean = $("<div/>").css({'position':'relative','left':'30px'})
				.text("Mean: "+this.adc['mean']).appendTo(adcwrap)
		this.adcrms = $("<p/>").css({'position':'relative','left':'30px'})
				.text("RMS: "+this.adc['rms']).appendTo(adcwrap)
		this.adcrailfrac = $("<p/>").css({'position':'relative','left':'30px'})
				.text("Rail %: "+this.adc['railfrac']).appendTo(adcwrap)


	    {
		    lnawrap = $("<div style='float:left'/>").width(slider_width)
		    			.css({'font-family':'sans-serif','text-align':'center','margin':2}).appendTo(gainwrap)
		    $("<p/>").css({'font-family':'sans-serif', 'margin':2, 'margin-bottom':15})
		    		.text("LNA").appendTo(lnawrap)

		    this.slider_gain_lna=$("<div/>").uniqueId().appendTo(lnawrap).css({'margin':'auto'})
						.slider({min:0,max:14,value:10,step:1,
							orientation: "vertical",
							slide:function(event, ui){
								lna_gain=ui.value;
								change_gain("gain_lna",lna_gain,self)
								self.slider_gain_lnat.text(ui.value);
							}
						})
		    this.slider_gain_lnat=$("<p/>").css({'font-family':'sans-serif','text-align':'center','margin':2})
		    		.text(10).appendTo(lnawrap)
    	}
	    {
		    mixwrap = $("<div style='float:left'/>").width(slider_width)
		    			.css({'font-family':'sans-serif','text-align':'center','margin':2}).appendTo(gainwrap)
		    $("<p/>").css({'font-family':'sans-serif','margin':2, 'margin-bottom':15})
		    		.text("MIX").appendTo(mixwrap)

			this.slider_gain_mix=$("<div/>").uniqueId().appendTo(mixwrap).css({'margin':'auto'})
						.slider({min:0,max:15,value:10,step:1,
							orientation: "vertical",
							slide:function(event, ui){
								mix_gain=ui.value;
								change_gain("gain_mix",mix_gain,self)
								self.slider_gain_mixt.text(ui.value);
							}
						})
			this.slider_gain_mixt=$("<p/>").css({'font-family':'sans-serif', 'margin':2})
		    		.text("10").appendTo(mixwrap)
    	}
	    {
		    ifwrap = $("<div style='float:left'/>").width(slider_width)
		    			.css({'font-family':'sans-serif','text-align':'center','margin':2}).appendTo(gainwrap)
		    $("<p/>").css({'font-family':'sans-serif', 'margin':2, 'margin-bottom':15})
		    		.text("IF").appendTo(ifwrap)

			this.slider_gain_if=$("<div/>").uniqueId().appendTo(ifwrap).css({'margin':'auto'})
						.slider({min:0,max:15,value:10,step:1,
							orientation: "vertical",
							slide:function(event, ui){
								if_gain=ui.value;
								change_gain("gain_if",if_gain,self)
								self.slider_gain_ift.text(ui.value);
							}
						})
			this.slider_gain_ift=$("<p/>").css({'font-family':'sans-serif', 'margin':2})
		    		.text("10").appendTo(ifwrap)
    	}
	}


waterfall.prototype.addWaterfallControl =
	function(target)
	{
		self=this

		var width=$("#"+target).width()
		var marg=15
	    var self=this
	    var slider_height=50
	    var wfslider

	    wrapper=$("<div style='margin:10px'/>").uniqueId().height(slider_height).width(width-2*marg).appendTo($("#"+target))
		var bins_text=$("<input type='number'/>")
				.attr({min:200,max:this.waterfall_buffer_length})
				.css({'width':'25%','float':'right', 'font-size':'16pt', 'margin-top':5})
				.val(this.waterfall_buffer_display_length)
				.appendTo(wrapper)
				.change(
					function(){
						if (parseInt(this.value) < ($(this).attr("min"))) {this.value=$(this).attr("min")}
						if (parseInt(this.value) > ($(this).attr("max"))) {this.value=$(this).attr("max")}
						wfslider.slider('value',this.value)
						self.waterfall_buffer_display_length=parseInt(this.value);
						self.draw()
					}
				)
		bins_text.numeric()

	    var bintext=$("<p/>").css({'font-family':'sans-serif', 'margin':2})
	    		.text("Time Samples in Waterfall:").appendTo(wrapper)

	    wfslider=$("<div style='width:70%'/>").uniqueId().appendTo(wrapper)
					.slider({min:200,max:this.waterfall_buffer_length,value:this.waterfall_buffer_display_length,
						slide:function(event, ui){
							self.waterfall_buffer_display_length=ui.value;
							self.draw()
							bins_text.val(ui.value);
						}})

	}

waterfall.prototype.change_palette=
	function(event, data)
	{
		this.cb.gradientScale(this.cb.colormaps[data.item.label]);
		this.cb_rect.attr({fill:this.cb.cb_grad})
		this.draw();
	}

waterfall.prototype.addLagcorr=
    function(target){
        self=this
        wrapper=$("<div style='margin:0px'/>").uniqueId().appendTo($("#"+target))
            .height(300).width(this.plot_width)
        negcorr_plot_data = {x: [],y: [],type: 'scatter',name:'Negative Lag (A ahead)'}
        poscorr_plot_data = {x: [],y: [],type: 'scatter',name:'Positive Lag (B ahead)'}

        self.baseline_btn = $("<button/>").appendTo($("<div/>").appendTo(wrapper))
            .button({label:'Calculate Lag Corr',icons:{primary: "ui-icon-play"}})
            .css({margin:"0 auto",display:"block"})
            .click(function() {
                fetch('http://'+self.kotekan_url+':'+self.kotekan_port+'/lag_align/go',{})
                    .then(r => r.json().then(data => {
                        lagcorr_plot_update = {
                            x: [_.range(0,-data.corr_neg.length,-1),_.range(0,data.corr_pos.length)],
                            y: [data.corr_neg,data.corr_pos]
                        }
                        Plotly.restyle(self.lagcorr_plot, lagcorr_plot_update);
                    }))
                });

        var plotdiv = $("<div/>").uniqueId().appendTo(wrapper)
            .height("100%").width("100%")
        this.lagcorr_plot = plotdiv.attr('id')

        var layout = {
			title: {text:'Airspy Lag Correlation'},
			xaxis: {title: {text: 'Lag (Samples)'},linecolor: 'black',zeroline:false},
			yaxis: {title: {text: 'Correlation Strength (arb)'},linecolor: 'black',zeroline:false},
			margin: {t:30, l:50, r:10, b:40},
			legend: {xanchor:'right',x:1.0,y:0.}
		}

        Plotly.newPlot(this.lagcorr_plot, [negcorr_plot_data,poscorr_plot_data], layout, {staticPlot: true});
    }

    /*
waterfall.prototype.add_spectrum=
	function(target){
		this.freeze_baseline = false
	    wrapper=$("<div style='margin:0px'/>").uniqueId().appendTo($("#"+target))
				.height(300).width(this.plot_width+this.margin[0]/2-1)
				.css({'margin-left':this.margin[0]/2})
		spectrum_plot_data_mean     = {x: [],y: [],type: 'scatter',name:'Mean'}			
		spectrum_plot_data_latest   = {x: [],y: [],type: 'scatter',name:'Latest'}
		spectrum_plot_data_baseline = {x: [],y: [],type: 'scatter',name:'Baseline'}			
		var data = [spectrum_plot_data_mean, spectrum_plot_data_latest, spectrum_plot_data_baseline];
		this.show_spectrum_mean = true
		this.show_spectrum_latest = true
		this.show_spectrum_baseline = true

		this.spectrum_plot = wrapper.attr('id')

		var layout = {
			title: {text:'Spectral Power'},
			xaxis: {title: {text: 'Frequency (MHz)'},linecolor: 'black',zeroline:false},
			yaxis: {title: {text: 'Power (dB bits^2)'},linecolor: 'black',zeroline:false},
			margin: {t:30, l:50, r:10, b:40},
			legend: {xanchor:'right',x:1.0,y:0.}
		}

		Plotly.newPlot(this.spectrum_plot, data, layout, {staticPlot: true});
	}

waterfall.prototype.add_baseline_control=
	function(target){
		self=this
		wrapper=$("<div/>").uniqueId().appendTo($("#"+target)).css({margin:45})
		self.baseline_btn = $("<button/>").appendTo($("<div/>").appendTo(wrapper))
				.button({label:'Take a Spectral Baseline',icons:{primary: "ui-icon-play"}})
				.css({margin:"0 auto",display:"block"})
				.click(function() {
						self.spectrum_baseline = _.map(_.transpose(self.scroll_data),_mean)
				});
	}

waterfall.prototype.add_spectrum_excess=
	function(target){
		this.freeze_baseline = false
	    wrapper=$("<div style='margin:0px'/>").uniqueId().appendTo($("#"+target))
				.height(200).width(this.plot_width+this.margin[0]/2-1)
				.css({'margin-left':this.margin[0]/2})
		spectrum_plot_excess_mean     = {x: [],y: [],type: 'scatter',name:'Mean'}			
		spectrum_plot_excess_latest   = {x: [],y: [],type: 'scatter',name:'Latest'}
		var data = [spectrum_plot_excess_mean, spectrum_plot_excess_latest];
		this.show_spectrum_excess_mean = true
		this.show_spectrum_excess_latest = true

		this.spectrum_excess_plot = wrapper.attr('id')

		var layout = {
			title: {text:'Excess Spectral Power'},
			xaxis: {title: {text: 'Frequency (MHz)'},linecolor: 'black',zeroline:false},
			yaxis: {title: {text: 'Excess Power (dB bits^2)'},linecolor: 'black',zeroline:false,range:[-5,5]},
			margin: {t:30, l:50, r:10, b:40},
			legend: {xanchor:'right',x:1.0,y:0.}
		}

		Plotly.newPlot(this.spectrum_excess_plot, data, layout, {staticPlot: true});
	}
*/