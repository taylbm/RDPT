PREFIX = 'rxr'
function WMA( array, weightedPeriod ) {
    var weightedArray = [];
    for( var i = 0; i <= array.length - weightedPeriod; i++ ) {
        var sum = 0;
        for( var j = 0; j < weightedPeriod; j++ ) {
            sum += array[ i + j ] * ( weightedPeriod - j );
        }
        weightedArray[i] = sum / (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );
    }
    return weightedArray;
}
function autoAxis(type,recalc) {
    if ($('input[name="autoAxis"]').is(':checked') || recalc)
        max0 = Math.round(Math.max.apply(null,chart.options.data[0].dataPoints.map(function(obj) {return obj.y}))) + 1,
        min0 = Math.round(Math.min.apply(null,chart.options.data[0].dataPoints.map(function(obj) {return obj.y}))) - 1,
        max1 = Math.round(Math.max.apply(null,chart.options.data[1].dataPoints.map(function(obj) {return obj.y}))) + 1,
        min1 = Math.round(Math.min.apply(null,chart.options.data[1].dataPoints.map(function(obj) {return obj.y}))) - 1,
        $('#y-max-primary').val(max0),
        $('#y-min-primary').val(min0),
        $('#y-max-secondary').val(type ? null : max1),
        $('#y-min-secondary').val(type ? null : min1),
        chart.options.axisY2.minimum = min1,
        chart.options.axisY2.maximum = max1,
        max = type ? Math.max(max0,max1) : max0,
        min = type ? Math.min(min0,min1) : min0,
        chart.options.axisY.minimum = min,
        chart.options.axisY.maximum = max 
    ;
    chart.render();
}
BUILD_COLORS = {"16.1":"lightpink","17":"greenyellow","17.1":"lightgreen","17.2":"lightseagreen","18":"cyan"}

function getBuilds(){
    $.getJSON(PREFIX + '/builds',function(data) {
        $.each(data,function(idx,val) { 
            if (BUILD_COLORS[val.toString()] != undefined)
                $('#'+idx).css('background',BUILD_COLORS[val.toString()]);
            else 
                $('#'+idx).css('background','gray');
        }); 
    });
}
    $(document).ready(function(){
	var ICAO = "KABR",
	    now = new Date(),
	    nowArr = now.toJSON().slice(0,10).split('-'),
	    fd = nowArr[1] + "/" + nowArr[2] + "/" + nowArr[0],
	    disp = "99:99:99Z",
	    fname = "None",
	    cut = "All",
	    redundant = "",
	    ds = [],
	    storeData = {},
            days = {}
	;
        ICAO = $('select[name="selectICAO"] :selected').val();
        $('select[name="selectICAO"]').val(ICAO).selectmenu('refresh');
        function getDays() {
            $.ajax({
                url: '/days?ICAO='+ICAO,
                async: false,
                success: function(data) {
                    days = $.parseJSON(data)
                }
            });
        }
        getDays();
        getBuilds();     
 	function getVols(d) {
	    fd = d;
	    $('.ui-loader').css('display','initial')
	    $.getJSON(PREFIX + '/vols?ICAO='+ICAO+'&date='+fd) 
		.done(function(data) { 
		var innerHTML = '<select id="selectVolume" data-mini="true" name="selectVolume">' 
                if (data['err'] == undefined) {
		    for (d in data["display_names"]) 
		        innerHTML += '<option value="'+data["full_filenames"][d] + '"class="Volume">' +data["display_names"][d]+'</option>'
		    innerHTML += '</select>';
		    $('#selectContain').html(innerHTML).trigger("create");
                }
                else {
                    $('#selectContain').html('') 
                    alert(data["err"])
                }
		$('.ui-loader').css('display','none')
	    })
	    .fail(function() {
                $('#selectContain').html('') 
		$('.ui-loader').css('display','none')
		alert("This date is unavailable for this site")
	    });
	}
	fullchart = new CanvasJS.Chart("fullscreen-plot",{zoomEnabled: true});
	chart = new CanvasJS.Chart("main-plot", {
	    zoomEnabled: true,
	    exportEnabled:true,
	    title:{
		  fontSize:25              
		},
	    subtitles:[{
		  fontSize:15
		}],
	    axisX: {
		title: "Azimuth Number",
		titleFontSize: 25
	    },
	    axisY: { 
		minimum: null,
		maximum: null,
		},	
	    axisY2: { 
		minimum: null,
		maximum: null
		}, 
	    data: [              
		      {
			type: "line",
			showInLegend: true,
			legendText: "Horizontal Channel Noise (dBm)",
			toolTipContent: "Azimuth: {x} Deg | Noise: {y} dBm",
			dataPoints: []
		      }, 
		      {
			type: "line",
			showInLegend: true,
			legendText: "Vertical Channel Noise (dBm)",
			toolTipContent: "Azimuth: {x} Deg | Noise: {y} dBm",
			dataPoints: []
		      }
		]
	    })
	;
        function daysAvailable(data,cellType) {
            var monthString = ICAO + '.' + (data.getFullYear()).toString() + '.' + data.toISOString().substr(5,2)
            if (cellType == "day") {
                if(!days[monthString]) {
                    return {disabled:true}  
                } 
                else {  
                    if (days[monthString].indexOf(data.toISOString().substr(8,2)) < 0) {
                        return {disabled:true}
                    }
                }
            } 
        }
        $('#date-pick').datepicker({
            todayButton: new Date(),
            autoClose: true,
            minDate: new Date(2014,12),
            maxDate: new Date(),
            onSelect: getVols,
            onRenderCell: daysAvailable
        });
	$('#date-pick').datepicker().data('datepicker').selectDate(now)
	function plotSwitch(cut,type,typeSelect){
	    var dataSeries1 = [],
		dataSeries2 = []
	    ;
	    chart.options.data[1].axisYType = "primary";
	    chart.options.axisY2.title = "";
	    chart.options.axisY.title = "";
	    chart.options.axisX.title = "Azimuth Number";
            if (cut != "All") {
                var subtext = 'Elevation:' + storeData["elevations"][cut]["el_angle"][storeData["elevations"][cut]["el_angle"].length-1] + "\u00B0 - VCP:" + storeData["VCP"] + " | RDA Build Number:" + storeData["build"];
                chart.options.subtitles[0].text = subtext;
            }
            else {
                var subtext = "VCP:" + storeData["VCP"] + " | RDA Build Number:" + storeData["build"] 
            }
            chart.options.subtitles[0].text = subtext;
	    chart.options.exportFileName = ICAO + redundant + "_" + type + "_VCP" + storeData["VCP"].toString() + "_Cut" + cut + "_" + ds[2] + ds[0] + ds[1] + "_" + disp;
	    if (type == "RxRN") {
		if (cut != "All") {
		    chart.options.data[0].toolTipContent = "Azimuth Angle: {x}\u00B0 | Noise: {y} dBm";
		    chart.options.data[1].toolTipContent = "Azimuth Angle: {x}\u00B0 | Noise: {y} dBm";
		    chart.options.axisX.title = "Azimuth Angle (deg)";
		    $.each(storeData["elevations"][cut]["h_noise"],function(idx,val) {
			dataSeries1.push({"x": storeData["elevations"][cut]["az"][idx], "y": val}); 
		    });
		    $.each(storeData["elevations"][cut]["v_noise"],function(idx,val) {
			dataSeries2.push({"x": storeData["elevations"][cut]["az"][idx], "y": val});        
		    });
		    dataSeries1 = dataSeries1.sort(function(a,b) { return a["x"]-b["x"]});
		    dataSeries2 = dataSeries2.sort(function(a,b) { return a["x"]-b["x"]}); 
		}
		else { 
		    chart.options.data[0].toolTipContent = "Azimuth Number: {x} | Noise: {y} dBm";
		    chart.options.data[1].toolTipContent = "Azimuth Number: {x} | Noise: {y} dBm";
		    var h_az = 0;
		    var v_az = 0;
		    $.each(storeData["elevations"], function(idx,obj) { 
			for (h in obj["h_noise"])
			    dataSeries1.push({"x":h_az, "y": obj["h_noise"][h]}),
			    h_az += 1
			;
			for (v in obj["v_noise"])
			    dataSeries2.push({"x":v_az, "y": obj["v_noise"][v]}),
			    v_az += 1
			;
		    });		  
		}
                chart.options.data[0].dataPoints = dataSeries1;
                chart.options.data[1].dataPoints = dataSeries2;
                chart.options.data[0].legendText = "Horizontal Channel Noise (dBm)";
                chart.options.data[1].legendText = "Vertical Channel Noise (dBm)";
                chart.options.data[1].showInLegend = true;
	    }
	    else if (type == "El") {
		if (cut != "All") {
		    $.each(storeData["elevations"][cut]["el_angle"],function(idx,val) {
			dataSeries1.push({"x": idx + 1, "y": val});
		    });
		}
		else {
		    chart.options.subtitles[0].text = "VCP:" + storeData["VCP"];
		    var az = 0;
		    $.each(storeData["elevations"], function(idx,obj) {
			for (e in obj["el_angle"])
			    dataSeries1.push({"x":az, "y": obj["el_angle"][e]}),
			    az += 1
		    });
		    dataSeries1 = dataSeries1.sort(function(a,b) { return a["x"]-b["x"]});
		}
                chart.options.data[0].dataPoints = dataSeries1;
                chart.options.data[1].dataPoints = dataSeries2;
                chart.options.data[0].toolTipContent = "Azimuth Number: {x} | Elevation Angle: {y}\u00B0";
                chart.options.data[0].legendText = "RDA Reported Elevation Angle (\u00B0)";
                chart.options.data[1].showInLegend = false;
	    }
	    else if (type == "Az") {
		storeData["az_rate_running"] = WMA(storeData["az_rate"],50)
		if (cut != "All") {
		    radial_length = storeData["elevations"][cut]["az"].length
		    slice_arr = storeData["az_rate"].slice((cut-1)*radial_length,cut*radial_length)	
		    $.each(slice_arr, function(idx,val) { 
			dataSeries1.push({"x": idx + 1, "y": val});
		    });
		    slice_arr = storeData["az_rate_running"].slice((cut-1)*radial_length,cut*radial_length)
		    $.each(slice_arr, function(idx,val) {
			dataSeries2.push({"x": idx + 1, "y": val});
		    });
		}
		else {
		    $.each(storeData["az_rate"], function(idx,val) {
			dataSeries1.push({"x": idx + 1, "y": val});
		    });
		    $.each(storeData["az_rate_running"], function(idx,val) {
			dataSeries2.push({"x": idx + 1, "y": val});
		    });
		    dataSeries1 = dataSeries1.slice(0,-50);
		    dataSeries2 = dataSeries2.slice(0,-50);
		}
                chart.options.data[0].dataPoints = dataSeries1;
                chart.options.data[1].dataPoints = dataSeries2;
                chart.options.data[0].toolTipContent = "Azimuth Number: {x} | Az Rate: {y}\u00B0s\u207B\u00B9";
                chart.options.data[1].legendText = "50 Radial Running Mean of Az Rate (\u00B0s\u207B\u00B9)";
                chart.options.data[0].legendText = "Az Rate (\u00B0s\u207B\u00B9)";
                chart.options.data[1].showInLegend = true;
	    }	
	    else if (type == "azAccel") { 
		if (cut != "All") {
		    radial_length = storeData["elevations"][cut]["az"].length
		    slice_arr = storeData["az_accel"].slice((cut-1)*radial_length,cut*radial_length)
		    $.each(slice_arr, function(idx,val) {
			dataSeries1.push({"x": idx + 1, "y": val});
		    });
		}
		else {
		    chart.options.subtitles[0].text = "VCP:" + storeData["VCP"] + " - Max Accel: +" + Math.max.apply(null,storeData["az_accel"])+"\u00B0s\u207B\u00B2";
		    $.each(storeData["az_accel"], function(idx,val) {
			dataSeries1.push({"x": idx + 1, "y": val});
		    });
		    dataSeries1 = dataSeries1.sort(function(a,b) { return a["x"]-b["x"]}).slice(0,-100);
		}
                chart.options.data[0].dataPoints = dataSeries1;
                chart.options.data[1].dataPoints = dataSeries2;
                chart.options.data[0].toolTipContent = "Azimuth Number: {x} | Az Accel: {y}\u00B0s\u207B\u00B2";
                chart.options.data[0].legendText = "Azimuthal Acceleration (\u00B0s\u207B\u00B2)";
                chart.options.data[1].showInLegend = false;
	    }	
	    else {
		chart.options.data[1].axisYType = "secondary";
		chart.options.axisY.title = "Elevation Angle";
		chart.options.axisY2.title = "Az Rate";
		storeData["az_rate_running"] = WMA(storeData["az_rate"],50)
		if (cut != "All") {
		    $.each(storeData["elevations"][cut]["el_angle"],function(idx,val) {
			dataSeries1.push({"x": idx + 1, "y": val});
		    });
		    radial_length = storeData["elevations"][cut]["az"].length
		    slice_arr = storeData["az_rate_running"].slice((cut-1)*radial_length,cut*radial_length)
		    $.each(slice_arr, function(idx,val) {
			dataSeries2.push({"x": idx + 1, "y": val});
		    });
		}
		else {
		    var az = 0;
		    $.each(storeData["elevations"], function(idx,obj) {
			for (e in obj["el_angle"])
			    dataSeries1.push({"x":az, "y": obj["el_angle"][e]}),
			    az += 1
		    });
		    $.each(storeData["az_rate_running"], function(idx,val){
			dataSeries2.push({"x":idx + 1, "y": val})
		    });                                    
		    dataSeries2 = dataSeries2.slice(0,-50);
		}
                chart.options.data[0].dataPoints = dataSeries1;
                chart.options.data[1].dataPoints = dataSeries2;
                chart.options.data[0].toolTipContent = "Azimuth Number: {x} | Elevation Angle: {y}\u00B0";
                chart.options.data[1].toolTipContent = "Azimuth Number: {x} | Az Rate: {y}\u00B0s\u207B\u00B9";
                chart.options.data[0].legendText = "RDA Reported Elevation (\u00B0)";
                chart.options.data[1].legendText = "50 Radial Running Mean of Az Rate (\u00B0s\u207B\u00B9)";
                chart.options.data[1].showInLegend = true;
	    }
	    $('#x-min').val(0);
	    $('#x-max').val(Math.round(Math.max.apply(null,dataSeries1.map(function(a) {return a["x"]}))));
	    chart.options.axisX.minimum = null;
	    chart.options.axisX.maximum = null;
            autoAxis(type == "RxRN" || type == "Az", typeSelect || $( "#main-plot .canvasjs-chart-credit" ).length == 0)
	}
	function plotData(type) {
	    var loadString = '?ICAO='+ICAO+'&date='+fd+'&fname='+fname;
	    var typeString = '/plot_all';
            var source =  $('#source-switch').val() == "true";
            sourceString = source ? "&source=ENG" : "&source=AS3"; 
            fd_split = fd.split('/')
            var dCheck = new Date(fd_split[2],parseInt(fd_split[0]) - 1,fd_split[1])
            var dCutoff = new Date(2016,5,2)
            if (!source && dCheck < dCutoff){
                alert('LDM formatted Amazon S3 Level 2 only for dates after 1 June 2016')
                return
            }
	    $('.ui-loader').css('display','initial')
	    $('.Vol').addClass('ui-disabled') 
	    $.getJSON(PREFIX + typeString+loadString+sourceString,function(data) {
		if (data["VCP"]) {
		    redundant = data["redundant"] > 8 ? "_Ch" + (data["redundant"] - 8).toString() : ""
		    ds = fd.split('/')
		    chart.options.exportFileName = ICAO + redundant + "_" + type + "_VCP" + data["VCP"].toString() + "_Cut" + cut + "_" + ds[2] + ds[0] + ds[1] + "_" + disp;
		    chart.options.title.text = ICAO + redundant + '|' + fd + '|' + disp;
		    var innerHTML = '<fieldset data-role="controlgroup" data-mini="true">Cut Selection';
		    innerHTML += '<input class="cut" name="cut" id="All" type="radio"><label for="All">All</label>'
		    var cuts = Object.keys(data["elevations"]);
		    for (var c = cuts.length - 1; c >= 0; c--)
			idx = parseInt(c) + 1,
			innerHTML += '<input class="cut" name="cut" id="'+idx+'" type="radio"><label for="'+idx+'">'+idx+' - ('+data["elevations"][cuts[c]]["el_angle"][data["elevations"][cuts[c]]["el_angle"].length-1]+'\u00B0)</label>'
		    ;
		    innerHTML += '</fieldset>';
		    var buttonHTML = 'Volume Selection <button style="position:absolute" class="nextVol Vol ui-btn ui-btn-icon ui-shadow ui-btn-icon-right ui-icon-carat-r">Next</button><br><br>';
		    buttonHTML += '<br><br><button style="position:absolute" class="preVol Vol ui-btn ui-shadow ui-btn-icon-left ui-icon-carat-l">Prev.</button>';
		    $('#cutSelect').html(innerHTML).trigger("create");
		    $('#volNav').html(buttonHTML).trigger("create");
		    var cutChoice = storeData["VCP"] == data["VCP"] ? cut : "All";
		    $('#' + cutChoice).prop('checked','true').click();
		    storeData = data;
		    plotSwitch(cutChoice,type); 
                    sourceCredit = source ? "ROC ENG SPOOL" : "Amazon Web Services";
                    $('.canvasjs-chart-credit').html("CanvasJS.com | Raw Level-2 Source: " + sourceCredit);
		 }
		 else { 
		     alert(data["err"])
		 }
		 $('.ui-loader').css('display','none')
		 $('.Vol').removeClass('ui-disabled')
	    })
	    .fail(function(jqXHR, textStatus, error) {
		 $('.ui-loader').css('display','none')
		 $('.Vol').removeClass('ui-disabled')
		 alert("Internal Server Error, probably a bad volume.. please try another!")
	    });	
	}
	$('input[name="typeSelect"]').on('click',function() {
	    type = $(this).val();
	    cut = $('input[name="cut"]:checked').attr("id");
	    plotSwitch(cut,type,true);
	});
	$("#selectContain").on('change',function() {
	    var element = $('select[name="selectVolume"] :selected')
	    disp = element.html();	
	    fname = element.val();
	    var type = $('input[name="typeSelect"]:checked').val();
	    plotData(type);
	});
	$('#volNav').on('click','.nextVol',function() {
	    var next = $('select[name="selectVolume"] :selected').next()[0];
	    if (next == null) 
		alert("Out of Day Range")
	    else 
		disp = next.innerHTML,
		fname = next.value,
		$('select[name="selectVolume"]').val(fname).selectmenu('refresh')
		type = $('input[name="typeSelect"]:checked').val(),
		plotData(type)
	    ;
	});
	$('#volNav').on('click','.preVol',function() {
	    var prev = $('select[name="selectVolume"] :selected').prev()[0];
	    if (prev == null)
		alert("Out of Day Range")
	    else 
		disp = prev.innerHTML,
		fname = prev.value,
		$('select[name="selectVolume"]').val(fname).selectmenu('refresh')
		type = $('input[name="typeSelect"]:checked').val(),
		plotData(type)
	    ;
	});
	$('#fullscreen-link').on('click',function() { 
	    var copyOptions = $.extend(true, {}, chart.options)
	    fullchart.options = copyOptions;
	    fullchart.options.title.fontSize = 40;
	    fullchart.options.subtitles[0].fontSize = 30;
	    $('#fullscreen-plot').height($(document).height())
	});
	$(":mobile-pagecontainer").on( "pagecontainershow", function( event, ui ) {
	    fullchart.render()
            $('#plot-width').val($('#fullscreen-plot').width())
            $('#plot-height').val($('#fullscreen-plot').height())
	});
        $('#plot-width').on("change",function() {
            var width = parseFloat($(this).val());
            $('#fullscreen-plot').width(width)
            fullchart.render();
        });
        $('#plot-height').on("change",function() {
            var height = parseFloat($(this).val());
            $('#fullscreen-plot').height(height)
            fullchart.render();
        });
        $('#y-max-primary').on("change",function() {
            var max = parseFloat($(this).val());
            chart.options.axisY.maximum = max;
            chart.render();
        });
        $('#y-min-primary').on("change",function() {
            var min = parseFloat($(this).val());
            chart.options.axisY.minimum = min;
            chart.render();
        });
        $('#y-max-secondary').on("change",function() {
            var max = parseFloat($(this).val());
            chart.options.axisY2.maximum = max;
            chart.render();
        });
        $('#y-min-secondary').on("change",function() {
            var min = parseFloat($(this).val());
            chart.options.axisY2.minimum = min;
            chart.render();
        });
        $('#x-max').on("change",function() {
            var max = parseFloat($(this).val());
            chart.options.axisX.maximum = max;
            chart.render();
        });
        $('#x-min').on("change",function() {
            var min = parseFloat($(this).val());
            chart.options.axisX.minimum = min;
            chart.render();
        });
        $('input[name="autoAxis"]').on("click",function() {
            if ($('input[name="autoAxis"]').is(':checked'))
                $('input[name="number"]').addClass('ui-disabled')
            else
                $('input[name="number"]').removeClass('ui-disabled')
            autoAxis();
        });
        $('#source-switch').on('slidestop',function() {
            if ($("#main-plot .canvasjs-chart-credit" ).length > 0)     
                type = $('input[name="typeSelect"]:checked').val(),
                plotData(type)
            ;
        });
        $('select[name="selectICAO"]').on('change',function() {
            ICAO = $(this).val()
            getDays()
            $('#date-pick').datepicker().data('datepicker').selectDate(now)
        });
        $('#cutSelect').on('change','.cut',function() {
            cut = $(this).attr("id")
            var type = $('input[name="typeSelect"]:checked').val();
            plotSwitch(cut,type);
        });
        $('#elAz').prop("checked","true");
        $('input[name="typeSelect"]').checkboxradio('refresh');
        $('#source-switch').val('true').slider('refresh')
});
