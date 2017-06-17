
MediaPlayer.rules.OSMF = function () {
    "use strict";

    var checkRatio = function (newIdx, currentBandwidth, data) {
            var self = this,
                deferred = Q.defer();

            self.manifestExt.getRepresentationFor(newIdx, data).then(
                function(rep)
                {
                    self.manifestExt.getBandwidth(rep).then(
                        function (newBandwidth)
                        {
                            deferred.resolve(newBandwidth / currentBandwidth);
                        }
                    );
                }
            );

            return deferred.promise;
        },
        
        insertThroughputs = function (throughList, availableRepresentations) {
    		var self = this, representation, bandwidth, quality, downloadTime, segDuration, through;

    		for(var i = 0; i < throughList.length; i++){
    			if(throughList[i].bandwidth == null || throughList[i].bandwidth == 0){
    				quality = throughList[i].quality;
    				representation = availableRepresentations[quality];
    				bandwidth = self.metricsExt.getBandwidthForRepresentation(representation.id);
    				bandwidth /= 1000; //bit/ms
    				
    				downloadTime = throughList[i].finishTime.getTime() - throughList[i].responseTime.getTime();
    				segDuration = throughList[i].duration * 1000; 
    				
    				through = (throughList[i].sizeSeg)/downloadTime; 

    	    		self.metricsBaselinesModel.updateThroughputSeg(throughList[i], bandwidth, through);
    			}
    		}
        };

    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        metricsBaselineExt: undefined,
        metricsBaselinesModel: undefined,

        checkIndex: function (current, metrics, data, metricsBaseline, availableRepresentations) {
            var self = this,
    			lastRequest = self.metricsExt.getLastHttpRequest(metrics),
                downloadTime,
                totalTime,
                downloadRatio,
                totalRatio,
                switchRatio,
                deferred,
                funcs,
                i,
                len,
                sizeSeg;

            self.debug.log("Checking OSMF rule...");
         	
            self.debug.log("Baseline - Tamanho Through: " + metricsBaseline.ThroughSeg.length);

            if (!metrics) {
            	//self.debug.log("No metrics, bailing.");
            	return Q.when(new MediaPlayer.rules.SwitchRequest(current));
            }
            
            if (!metricsBaseline) {
            	//self.debug.log("No metrics Baseline, bailing.");
            	return Q.when(new MediaPlayer.rules.SwitchRequest(current));
            }
                                
            if (lastRequest == null) {
                //self.debug.log("No lastRequest made for this stream yet, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest(current));
            }
            
        	insertThroughputs.call(self, metricsBaseline.ThroughSeg, availableRepresentations);

            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;
          
            // TODO : I structured this all goofy and messy.  fix plz

            deferred = Q.defer();
            
            sizeSeg = (lastRequest.trace[lastRequest.trace.length - 1].b) * 8;

            downloadRatio = (lastRequest.mediaduration / downloadTime);
            
    		self.debug.log("Baseline - downloadRatio: " + downloadRatio);

            if (isNaN(downloadRatio)) {
                //self.debug.log("Invalid ratio, bailing.");
                deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
            } else if (downloadRatio < 1.0) {
                //self.debug.log("Download ratio is poor.");
                if (current > 0) {
                    self.debug.log("We are not at the lowest bitrate, so switch down.");
                    self.manifestExt.getRepresentationFor(current - 1, data).then(
                        function (representation1) {
                            self.manifestExt.getBandwidth(representation1).then(
                                function (oneDownBandwidth) {
                                    self.manifestExt.getRepresentationFor(current, data).then(
                                        function (representation2) {
                                            self.manifestExt.getBandwidth(representation2).then(
                                                function (currentBandwidth) {
                                                    switchRatio = oneDownBandwidth / currentBandwidth;
                                                    //self.debug.log("Switch ratio: " + switchRatio);

                                                    if (downloadRatio < switchRatio) {
                                                        self.debug.log("Things must be going pretty bad, switch all the way down.");
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(0));
                                                    } else {
                                                        self.debug.log("Things could be better, so just switch down one index.");
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(current - 1));
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                } else {
                    //self.debug.log("We are at the lowest bitrate and cannot switch down, use current.");
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                }
            } else {
                //self.debug.log("Download ratio is good.");
                self.manifestExt.getRepresentationCount(data).then(
                    function (max) {
                        max -= 1; // 0 based
                        if (current < max) {
                            //self.debug.log("We are not at the highest bitrate, so switch up.");
                            self.manifestExt.getRepresentationFor(current + 1, data).then(
                                function (representation1) {
                                    self.manifestExt.getBandwidth(representation1).then(
                                        function (oneUpBandwidth) {
                                            self.manifestExt.getRepresentationFor(current, data).then(
                                                function (representation2) {
                                                    self.manifestExt.getBandwidth(representation2).then(
                                                        function (currentBandwidth) {
                                                            switchRatio = oneUpBandwidth / currentBandwidth;
                                                            //self.debug.log("Switch ratio: " + switchRatio);

                                                            if (downloadRatio >= switchRatio) {
                                                                
                                                                    //self.debug.log("Not exactly sure where to go, so do some math.");
                                                                    i = -1;
                                                                    funcs = [];
                                                                    while ((i += 1) < max) {
                                                                        funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                                                    }

                                                                    Q.all(funcs).then(
                                                                        function (results) {
                                                                            for (i = 0, len = results.length; i < len; i += 1) {
                                                                                if (downloadRatio < results[i]) {
                                                                                    break;
                                                                                }
                                                                            }
                                                                            self.debug.log("Calculated ideal new quality index is: " + i);
                                                                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                                                        }
                                                                    );
                                                            } else {
                                                                //self.debug.log("Not enough bandwidth to switch up.");
                                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                                                            }
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        } else {
                            //self.debug.log("We are at the highest bitrate and cannot switch up, use current.");
                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(max));
                        }
                    }
                );
            }

            return deferred.promise;
        }
    };
};

MediaPlayer.rules.OSMF.prototype = {
    constructor: MediaPlayer.rules.OSMF
};