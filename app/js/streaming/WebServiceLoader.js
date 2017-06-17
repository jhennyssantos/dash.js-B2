
MediaPlayer.dependencies.WebServiceLoader = function () {
    "use strict";

    var bufferLevelMetrics = [],
		trhoughSegMetrics = [],
		arqJson = "",
		runWebservice = 0,
	    
		
		/**Não esquecer de sincronizar os relógios ao inicio dos experimentos**/
		
		
    doLoad = function (bufferLevelMetrics, playListMetrics, throughSegMetrics, stream) {
            var xmlhttp = new XMLHttpRequest(),
                self = this, 
                url = "http://10.0.0.2/dash_vod/webservice.php", 
                scen = 3; //<<<<----Definicao do cenario a ser utilizado
        		runWebservice++;
        	
        		self.metricsBaselinesModel.setDateFinalExecution(new Date());
        		
            if ( bufferLevelMetrics == 0 && throughSegMetrics == 0){
            	
            	bufferLevelMetrics = null;
            	throughSegMetrics = null;
            	url += "?comando=/home/vod/dash_cenarios_scripts/scenario" + scen +".py";
                xmlhttp.open("GET", url, true);
            	self.debug.log(url);
                xmlhttp.setRequestHeader("Content-Type", "text/html");
            	
            }else{
            	
                self.debug.log("BufferLevel: "+ bufferLevelMetrics.length);
                self.debug.log("throughSegMetrics: "+ throughSegMetrics.length);
                self.debug.log("playListMetrics: "+ playListMetrics.length);
                self.debug.log("executionInicialMetrics: "+ self.metricsBaselinesModel.getDateInicialExecution());
                self.debug.log("executionFinalMetrics: "+ self.metricsBaselinesModel.getDateFinalExecution());
                self.debug.log("mpdMetrics: "+ self.metricsBaselinesModel.getUrlMpd());
                self.debug.log("streamMetrics: "+ stream);
                self.debug.log("scenMetrics: "+ scen);
                
                xmlhttp.open("POST", url, true);
                xmlhttp.setRequestHeader("Content-Type", "multipart/form-data");
            }
            
        	arqJson = '{"bufferLevelMetrics":' +JSON.stringify(bufferLevelMetrics);
        	arqJson += ', "throughSegMetrics":'+JSON.stringify(throughSegMetrics);
        	arqJson += ', "playListMetrics":'+JSON.stringify(playListMetrics);
        	arqJson += ', "mpdMetrics":'+JSON.stringify(self.metricsBaselinesModel.getUrlMpd());
            arqJson += ', "streamMetrics":'+JSON.stringify(stream);
            arqJson += ', "scenMetrics":'+JSON.stringify(scen);
            arqJson += ', "executionInicialMetrics":'+JSON.stringify(self.metricsBaselinesModel.getDateInicialExecution());
        	arqJson += ', "executionFinalMetrics":'+JSON.stringify(self.metricsBaselinesModel.getDateFinalExecution())+'}';

        	self.debug.log(arqJson);

            xmlhttp.onload = function () {
                    if (xmlhttp.status < 200 || xmlhttp.status > 299)
                    {
                        self.debug.log("WEBSERVICE FAIL");

                        return;
                    }else{
                        self.debug.log("WEBSERVICE SUCESS");

                    	return;
                    }
                    

            };
                
            xmlhttp.send(arqJson);
        }
        
    return {
        metricsModel: undefined,
        manifestModel: undefined,
        debug: undefined,
        manifestExt: undefined,
        metricsBaselinesModel: undefined,
        tokenAuthentication:undefined,


        load: function (bufferLevelMetrics, playListMetrics, throughSegMetrics, stream) {
        	
            doLoad.call(this, bufferLevelMetrics, playListMetrics, throughSegMetrics, stream);

            return;
        }
       
    };
};

MediaPlayer.dependencies.WebServiceLoader.prototype = {
    constructor: MediaPlayer.dependencies.WebServiceLoader
};