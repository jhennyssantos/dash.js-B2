/** Algoritmo com característica de adaptação agressiva, implementado a partir da Dissertação de Romero
 * 	@class RomeroAgressiveRule
 */

MediaPlayer.rules.RomeroAgressiveRule = function () {
    "use strict";
    var insertThroughputs = function (throughList, availableRepresentations) {
		var self = this, representation, bandwidth, quality, downloadTime,  through;
		
		for(var i = 0; i < throughList.length; i++){
			if(throughList[i].bandwidth == null || throughList[i].bandwidth == 0){
				quality = throughList[i].quality;
				representation = availableRepresentations[quality];
				bandwidth = self.metricsExt.getBandwidthForRepresentation(representation.id);
				bandwidth /= 1000; //bit/ms
				
				downloadTime = throughList[i].finishTime.getTime() - throughList[i].responseTime.getTime();
				
				through = throughList[i].sizeSeg/downloadTime; 
				
				self.debug.log("bandwidth: " + bandwidth);
				self.debug.log("through: " + through);
				
	    		self.metricsBaselinesModel.updateThroughputSeg(throughList[i], bandwidth, through);
			}
		}
    };
    
    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        metricsBaselinesModel: undefined,
        
        /**
         * @param {current} current - Índice da representação corrente
         * @param {metrics} metrics - Metricas armazenadas em MetricsList
         * @param {data} data - Dados de audio ou vídeo
         * @memberof RomeroConservativeRule#
         */
        
        checkIndex: function (current, metrics, data, metricsBaseline, availableRepresentations) {
            var self = this,
        		lastRequest = self.metricsExt.getLastHttpRequest(metrics),
        		currentBuffer = self.metricsExt.getCurrentBufferLevel(metrics),
                downloadTime,
                newDownloadRatio,
                deferred,
                representation1,
                representation2,
                representation3,
                currentBandwidth,
                oneUpBandwidth,
                oneDownBandwidth, 
                max,
                representationCur = current,
                sizeSeg;

            self.debug.log("Checking download ROMERO AGRESSIVE rule...");
        	//self.debug.log("Tamanho metrics HttpList: " + metrics.HttpList.length);
            
            if (!metrics) {
             	//self.debug.log("No metrics, bailing.");
             	return Q.when(new MediaPlayer.rules.SwitchRequest());
             }
             
             if (!metricsBaseline) {
             	//self.debug.log("No metrics Baseline, bailing.");
             	return Q.when(new MediaPlayer.rules.SwitchRequest());
             }
                        
             if (lastRequest == null) {
                 //self.debug.log("No requests made for this stream yet, bailing.");
                 return Q.when(new MediaPlayer.rules.SwitchRequest());
             }
             
             if (currentBuffer == null) {
                 //self.debug.log("No requests made for this stream yet, bailing.");
                 return Q.when(new MediaPlayer.rules.SwitchRequest());
             }
          
            deferred = Q.defer();
            
            insertThroughputs.call(self, metricsBaseline.ThroughSeg, availableRepresentations);
            
            sizeSeg = (lastRequest.trace[lastRequest.trace.length - 1].b) * 8;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime())/1000;
            
            max = self.manifestExt.getRepresentationCount1(data);
        	max -= 1;
        	representation2 = self.manifestExt.getRepresentationFor1(current, data);
        	currentBandwidth = self.manifestExt.getBandwidth1(representation2);
			//self.debug.log("currentBandwidth: " + currentBandwidth + "bps");
        	           
            newDownloadRatio = sizeSeg/downloadTime; 	
            
            self.debug.log("lastRequest Type: " + lastRequest.stream );
            self.debug.log("lastRequest Trace.b: " + lastRequest.trace.length);
            self.debug.log("downloadTime: " + (downloadTime*1000) + "ms");
            self.debug.log("lastRequest.mediaduration: " + lastRequest.mediaduration + "s");
            //self.debug.log("lastRequest.tfinish: " + lastRequest.tfinish + "s");
            self.debug.log("newDownloadRatio: " + newDownloadRatio + "bps");

            if (isNaN(newDownloadRatio)) {
                self.debug.log("Invalid newDownloadRatio, bailing.");
                deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
            } else {
            	if(currentBuffer.level == 0){
            		current = 0;
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));	
            	}else{
            		if (newDownloadRatio > currentBandwidth) {
    					if (representationCur == max){
        					self.debug.log("No change.");
        					return Q.when(new MediaPlayer.rules.SwitchRequest(current));
    					}
    					while (representationCur < max){
    						representation3 = self.manifestExt.getRepresentationFor1(representationCur + 1, data);
    						oneUpBandwidth = self.manifestExt.getBandwidth1(representation3);

            				if (oneUpBandwidth < newDownloadRatio){
            					//self.debug.log("switch up.");
    							current += 1;
    						}else{
    							self.debug.log("Current1: " + current + "representationCur1: " + representationCur);
    							return Q.when(new MediaPlayer.rules.SwitchRequest(current));

    						}
    						representationCur++;
    					}
    					self.debug.log("Current11: " + current + "representationCur11: " + representationCur);
    					deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
    				}else{
    					if(representationCur == 0){
        					self.debug.log("No change.");
        					return Q.when(new MediaPlayer.rules.SwitchRequest(current));
    					}
    					while (representationCur > 0){
    						representation1 = self.manifestExt.getRepresentationFor1(representationCur - 1, data);
    						oneDownBandwidth = self.manifestExt.getBandwidth1(representation1);
    						
    						if(oneDownBandwidth > newDownloadRatio){
    							//self.debug.log(" switch Down.");
    							current -= 1;
    						}else{
    							self.debug.log("Current2: " + current + "representationCur2: " + representationCur);
    							return Q.when(new MediaPlayer.rules.SwitchRequest(current));
    						}
    						representationCur--;
    					}
    					self.debug.log("Current22: " + current + "representationCur22: " + representationCur);
    					deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));	
    				}
            	}
            }										
            
            return deferred.promise;
        }
    };
};
   
MediaPlayer.rules.RomeroAgressiveRule.prototype = {
    constructor: MediaPlayer.rules.RomeroAgressiveRule
};