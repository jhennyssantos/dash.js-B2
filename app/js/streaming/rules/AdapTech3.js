
MediaPlayer.rules.AdapTech3 = function () {
    "use strict";

    var deltaTime=15000, 
    	checkRatio = function (newIdx, currentBandwidth, data) {
            var self = this,
                deferred = Q.defer();

            self.manifestExt.getRepresentationFor(newIdx, data).then(
                function(rep)
                {
                    self.manifestExt.getBandwidth(rep).then(
                        function (newBandwidth)
                        {
                            deferred.resolve(newBandwidth/currentBandwidth);
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
                currentBufferLevel  = self.metricsExt.getCurrentBufferLevel(metrics),					
                downloadTime,
                startRequest = 0,
                averageThrough,
                average = 0,
                deferred,
                sizeSeg,
                time = 0, 
                t1 = 0,
                perfil1,
                perfil2,
                bandwidth,
                currentThrough,
                sigma = 0.8,
            	slackC = 0.8,
            	bMin=10,
                bLow=20,
                bHigh=50,
                representation1,
                probability = 0,
                bReb = 0.5;

            self.debug.log("Checking AdapTech 3 rule...");
         	
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
        	
        	 //O início da sessão acontece assim que o mpd e requisitado.
         	startRequest = self.metricsBaselinesModel.getDateInicialExecution().getTime(); 
        	time = lastRequest.tfinish.getTime() - startRequest;
        	
        	if (time >= deltaTime){
        		t1 = time - deltaTime;
            }
        	
    		downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime())/1000;
            sizeSeg = (lastRequest.trace[lastRequest.trace.length - 1].b) * 8;
            currentThrough = sizeSeg/downloadTime; 	
        	currentThrough /= 1000; //bit/ms
        	
            // TODO : I structured this all goofy and messy.  fix plz

            deferred = Q.defer();
            
            if(metricsBaseline.ThroughSeg.length == 1){
        		averageThrough = currentThrough;	
    		}else{
        		average = self.metricsBaselineExt.getAverageThrough(t1, metricsBaseline.ThroughSeg, startRequest);	
        		averageThrough = (sigma * average) + ((1 - sigma) * currentThrough);
    		} 
    		self.debug.log("Baseline - averageThrough: " + averageThrough + " bits/ms");
    		self.debug.log("Baseline - currentThrough: " + currentThrough + " bits/ms");
    		
            if (isNaN(averageThrough)) {
                //self.debug.log("Invalid ratio, bailing.");
                deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
            } else {
            	
            	perfil1 =  0;
            	perfil2 =  0;
            	self.manifestExt.getRepresentationCount(data).then(
                        function (max) {
                            max -= 1; // 0 based
            	self.manifestExt.getRepresentationFor(current, data).then(
                        function (representation) {
                            self.manifestExt.getBandwidth(representation).then(
                                    function (currentBandwidth) {
                                    	
                                    	for (var i = 0; i < max; i++){
                    	            		representation1 = self.manifestExt.getRepresentationFor1(i, data);
                    	    				bandwidth = self.metricsExt.getBandwidthForRepresentation(representation1.id);
                    	    				bandwidth /= 1000;
                    	    				
                    	    				if (bandwidth < slackC * currentThrough){
                    	    					perfil1 =  representation1.id;
                    	    				}
                    	    				
                    	    				if (bandwidth < slackC * averageThrough){
                    	    					perfil2 =  representation1.id;
                    	    				}

                    	            	}
                    	            	self.debug.log("currentBandwidth: " + currentBandwidth);
                    	            	self.debug.log("Baseline - perfil1: " + perfil1);
                        				self.debug.log("Baseline - perfil2: " + perfil2);
                    	            	
                        				probability = self.metricsBaselineExt.getRebufferingProbability(time, t1,  metrics.BufferLevel, startRequest, bMin, bReb);
                        				
                                      	if(probability <= 0.4){
                        	            	if((perfil2 > current) && (current < max)){
                        	            		if (bLow < currentBufferLevel.level){
                        	            			current = max;	
                                	            	self.debug.log("Max " + current);
                                            		deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                        	            		}else{
                            	            		current += 1;
                        	    	            	self.debug.log("Swicth Down");
                        	    	            	deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                                            	}
                        	            	}else if((perfil2 < current) && (current > 1)){
                        	            		if (currentBufferLevel.level < bMin){
                                	            	current = 1;
                                	            	self.debug.log("Minimo sem fuga: " + current);
                                            		deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                        	            		}else{
                        	            			current -= 1 ;
                        	    	            	self.debug.log("Swicth Up");
                        	    	            	deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                                            	}
                        	            	}else{
                        	            			self.debug.log("Current: " + current);
                                            		deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                        	            	}
                    					}else{
                    						
                    						if((perfil1 > current) && (current < max)){
                            	            	current += 1;
                        	    	            self.debug.log("Baseline - perfil1 < current");
                        	    	            deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                        	            	}else if((perfil1 < current) && (current > 0)){
                        	            		if (currentBufferLevel.level < bMin){
                                	            	current = 0;
                                	            	self.debug.log("Baseline - Current: " + current);
                                            		deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                        	            		}else{
                        	            			current -= 1 ;
                        	    	            	self.debug.log("Baseline - perfil1 < current");
                        	    	            	deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                                            	}
                        	            	}else{
                        	            			self.debug.log("Baseline - Current: " + current);
                                            		deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                        	            	}
                    					}
                    	            	
                                    });
                        });     	
                        });     	
            }

            return deferred.promise;
        }
    };
};

MediaPlayer.rules.AdapTech3.prototype = {
    constructor: MediaPlayer.rules.AdapTech3
};
