
MediaPlayer.vo.metrics.ThroughSeg = function () {
    "use strict";

    this.index = NaN;
    this.stream = null;   		
    this.currentTime = null;   		//Real-Time
    this.startTime = null;     		//Real-Time
    this.responseTime = null;     		//Real-Time
    this.finishTime = null;    		//Real-Time
    this.sizeSeg = NaN;    			//Segment range  
    this.duration = null;    		//Segment duration  
    this.quality = NaN;
    this.bandwidth = null;    		//Segment bandwidth  
    this.throughSeg = null;    		//Segment Throughput  
};

MediaPlayer.vo.metrics.ThroughSeg.prototype = {
    constructor: MediaPlayer.vo.metrics.ThroughSeg
};