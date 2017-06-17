/* Baseline implementations by Maiara on 2013-10-29
 * 
 */
Dash.dependencies.DashMetricsBaselineExtensions = function () {
    "use strict";
    
    var getAverageThrough3Segs = function (numSegs, metricsBaseline) {
        if (metricsBaseline == null) {
            return [];
        }
        
        var throughList = metricsBaseline.ThroughSeg,
        	throughListLength,
        	throughListIndex,
        	sumThrough = 0,
        	averageThrough = 0;
    
        if (throughList == null || throughList.length <= 0) {
            return [];
        }

        throughListLength = throughList.length;
        throughListIndex = throughListLength - 1;

        while (throughListIndex >= throughListLength - numSegs) {
        		sumThrough += throughList[throughListIndex].throughSeg;   //  bit/ms
        		throughListIndex -= 1;
        }
		
		averageThrough = sumThrough/numSegs;
    	this.debug.log("sumThrough: " + sumThrough);
    	this.debug.log("numSegs: " + numSegs);

        return averageThrough;
    }, 
    
    getThroughSegs = function (metricsBaseline) {
        if (metricsBaseline == null) {
            return [];
        }

        return !metricsBaseline.ThroughSeg ? metricsBaseline.ThroughSeg : [];
    },
    
    getAverageThrough = function (time1, throughList, startSessionTime) {
    	var begin, 
    	end = throughList.length - 1,
    	average, 
 		sumThroughs = 0, 
 		countSegs = 0,
 		startTime, 
 		startTimeTemp, 
 		finishTime;

    	for(begin = 0; begin <= end; begin++){
    		startTime = throughList[begin].responseTime.getTime() - startSessionTime; 
    		finishTime = throughList[begin].finishTime.getTime() - startSessionTime;
    		
    		if(finishTime > time1){
    			if (startTime < time1){
    				startTimeTemp = time1;
    			}else{
    				startTimeTemp = startTime;
    			}
    			sumThroughs += throughList[begin].throughSeg;
    			
    			countSegs++;
    		}
    	}
    	
    	average = sumThroughs/countSegs;
    	
    	this.debug.log("Baseline - countSegs: "+ countSegs);
    	this.debug.log("Baseline - average: "+ average);

    	return average;
        
    },
    
    getRebufferingProbability = function (time, startTime, bufferList, startSessionTime, bMin, bReb) {
    	var index = bufferList.length - 1, 
 		countGreater = 0,
 		countSmaller = 0,
 		countRebuffer = 0,
 		bufferTime,
 		probability;

    	this.debug.log("Baseline - getRebufferingProbability ");

    	while (index > 0){
    		bufferTime = bufferList[index].t.getTime() - startSessionTime;
    		
    		if(bufferTime >= startTime && bufferTime <= time){
    			if (bufferList[index].level > (bMin/2)){
    			//if (bufferList[index].level > bReb){
    				countGreater++;
    			}else{
    				countSmaller++;
    				if (bufferList[index].level <= bReb) countRebuffer++;
    			}    			
    		}
    		
    		index--;
    	}
    	probability = countSmaller/(countGreater + countSmaller);
    	
    	this.debug.log("Baseline - probability: "+ probability);

    	return probability;
        
    };

    return {
    	debug : undefined,
    	getAverageThrough3Segs : getAverageThrough3Segs,
    	getAverageThrough : getAverageThrough,
    	getRebufferingProbability : getRebufferingProbability
    };
};

Dash.dependencies.DashMetricsBaselineExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsBaselineExtensions
};
