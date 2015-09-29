/** Set up global types so JSHint doesn't trigger warnings that they are not defined */

/*global xr, GMaps, Promise, setTimeout, window, document, console, alert */

//global map variable
var map;

var currentNineFigureNumber;
var currentRadius;
var mapSpinner;
var locateButton;
var zoomInMsg;
var baseURL = 'http://maps.test.land.vic.gov.au/lvis/services/smesDataDelivery';

//Define global values used to determine survey mark Type
var scnAHDValues = ["ZEROTH ORDER", "2ND ORDER", "3RD ORDER", "SPIRIT LEVELLING"];
var scnGDA94Value = "ADJUSTMENT";
var pcmSearchText = "PCM";


window.addEventListener('load', function (e) {

    mapSpinner = document.querySelector("[id=map-spinner]");
    zoomInMsg = document.querySelector("[id=zoom-in-msg]");
    locateButton = document.querySelector("[id=locate]");
    locateButton.addEventListener("click", geoLocate, false);

    createMap();
    geoLocate();


}, false);


function mapMoved() {
    var markInf;
    var coords = map.getCenter();


    //Check for wrapped coords
    if (coords.H < (-180)) {
        coords.H = coords.H + 360;
    }

    //Check for wrapped coords
    if (coords.L < (-180)) {
        coords.L = coords.L + 360;
    }


    //console.log('Finished moving or zooming map:' + coords.H + ', ' + coords.L);

    //Clear markers
    map.removeMarkers();

    //Clear overlays
    map.removeOverlays();

    if (currentRadius > 0 && currentRadius <= 2) {

        retrieveMarkInformation(coords.H, coords.L).then(function (markInf) {
                if (markInf.length > 0) {
                    //Draw markers if value returned
                    addMarkers(markInf);
                }

                mapSpinner.classList.add("hidden");

            })
            .catch(function (err) {
                mapSpinner.classList.add("hidden");
                console.log(err);
            });

    }


}


function returnMarkerIconType(surveyMark) {
    var isSCN, isPCM, hasAHD, isSCNGDA94, isSCNAHD;

    //Set default values for each type
    isSCN = false;
    isPCM = false;
    hasAHD = false;
    isSCNGDA94 = false;
    isSCNAHD = false;

    if (surveyMark.status != "OK") {
        //Defective mark
        return "mark-defective";
    } else {
        //OK mark - determine other values
        if (surveyMark.scn === "Yes") {
            isSCN = true;
        }
        //Check if it has an AHD Height
        if (surveyMark.ahdHeight !== "") {
            hasAHD = true;
        }
        //Check if PCM - Nine Figure Number starts with 1
        if (String(surveyMark.nineFigureNumber).indexOf("1") === 0) {
            isPCM = true;
        }
        //Retrieve GDA94 technique to determine whether SCN GDA94
        if (surveyMark.gda94Technique.indexOf(scnGDA94Value) >= 0) {
            isSCNGDA94 = true;
        }

        //Check AHD technique to determine whether it is SCN AHD
        scnAHDValues.forEach(function (ahdApproxValue) {
            if (surveyMark.ahdTechnique.indexOf(ahdApproxValue) >= 0) {
                isSCNAHD = true;
            }
        });

        //Now all of the source values have been retrieved, work through possible combinations to determine correct symbol
        if (!isSCN && !hasAHD) {
            return "mark-gda94approx-pm";
        } else if (!isSCN && hasAHD) {
            return "mark-ahdapprox-pm";
        } else if (isSCN && isPCM) {
            return "mark-scn-gda94-pcm";
        } else if (isSCN && !hasAHD && !isPCM) {
            return "mark-scn-gda94-pm";
        } else if (isSCN && hasAHD && !isSCNGDA94) {
            return "mark-scn-ahd-pm";
        } else if (isSCN && hasAHD && isSCNGDA94 && isSCNAHD) {
            return "mark-scn-gda94-ahd-pm";
        } else if (isSCN && hasAHD && isSCNGDA94 && !isSCNAHD) {
            return "mark-scn-gda94-ahdapprox-pm";
        }
    }



}

function addMarkers(mapMarkerInf) {

    var markerIcon, markerSize, zoomLevel;
    var addOverlay = false;

    zoomLevel = map.getZoom();

    if (zoomLevel < 16) {
        markerSize = 12;
    } else if (zoomLevel >= 16 && zoomLevel < 17) {
        markerSize = 14;
    } else if (zoomLevel >= 17 && zoomLevel < 19) {
        markerSize = 16;
    } else if (zoomLevel >= 19 && zoomLevel < 21) {
        markerSize = 20;
        addOverlay = true;
    } else {
        markerSize = 24;
        addOverlay = true;
    }

    mapMarkerInf.forEach(function (surveyMark) {
        //Determine correct icon - set default values
        markerIcon = "symbology/" + returnMarkerIconType(surveyMark) + "-" + markerSize + ".png";

        map.addMarker({
            lat: surveyMark.latitude,
            lng: surveyMark.longitude,
            /*lat: Lat,
            /*lat: Lat,
            lng: Long,*/
            title: surveyMark.name,
            icon: markerIcon,
            infoWindow: {
                content: '<p class="mdl-color-text--primary"><b>' + surveyMark.name + '</b></p><hr>' +
                    '<p>Nine Figure Number: ' + surveyMark.nineFigureNumber + '</p>' +
                    '<p>Status: ' + surveyMark.status + '</p>' +
                    '<p>SCN: ' + surveyMark.scn + '</p>' +
                    '<p>Zone: ' + surveyMark.zone + '</p>' +
                    '<p>Easting: ' + surveyMark.easting + '</p>' +
                    '<p>Northing: ' + surveyMark.northing + '</p>' +
                    '<p>AHD Height: ' + surveyMark.ahdHeight + '</p>' +
                    '<p>Ellipsoid Height: ' + surveyMark.ellipsoidHeight + '</p>' +
                    '<p>GDA94 Technique: ' + surveyMark.gda94Technique + '</p>' +
                    '<p>AHD Technique: ' + surveyMark.ahdTechnique + '</p>' +
                    '<hr>' +
                    '<button id="sketch' + surveyMark.nineFigureNumber + '" class="mdl-button mdl-js-button mdl-button--primary mdl-js-ripple-effect fade-in">&nbsp;&nbsp;Sketch&nbsp;&nbsp;</button>&nbsp;&nbsp;&nbsp;' +
                    '<button id="report' + surveyMark.nineFigureNumber + '" class="mdl-button mdl-js-button mdl-button--primary mdl-js-ripple-effect fade-in">&nbsp;&nbsp;Report&nbsp;&nbsp;</button>',
                domready: function (e) {
                    document.querySelector("[id=sketch" + surveyMark.nineFigureNumber + "]").addEventListener("click", getSurveyMarkSketch, false);
                    document.querySelector("[id=report" + surveyMark.nineFigureNumber + "]").addEventListener("click", getSurveyMarkReport, false);
                }
            },
            click: function (e) {
                currentNineFigureNumber = surveyMark.nineFigureNumber;
                console.log("Opening: " + surveyMark.nineFigureNumber);
            },
        });


        //Draw overlay if zoom is > 17
        if (addOverlay) {
            map.drawOverlay({
                lat: surveyMark.latitude,
                lng: surveyMark.longitude,
                verticalAlign: 'bottom',
                horiztonalAlign: 'center',
                content: '<div class="overlay"><span class="overlay-text">' + surveyMark.name + '</span></div>'
            });
        }

    });

}

function createMap() {

    map = new GMaps({
        div: '#map',
        lat: -37.813942,
        lng: 144.9711861,
        dragend: function (e) {
            mapMoved();
        },
        zoom_changed: function (e) {
            checkSizeofCurrentMap();
            mapMoved();
        }
    });

}

function geoLocate() {

    GMaps.geolocate({
        success: function (position) {
            map.setCenter(position.coords.latitude, position.coords.longitude);
        }
    });

    checkSizeofCurrentMap();
    mapMoved();

}

function getSurveyMarkSketch() {
    getSurveyMarkSketchResponse(currentNineFigureNumber).then(function (markSketchData) {
            // Open PDF in new window
            window.open("data:application/pdf;base64," + encodeURI(markSketchData.document), "Survey Sketch Report " + currentNineFigureNumber);

        })
        .catch(function (err) {
            console.log(err);
        });

}

function getSurveyMarkReport() {

    getSurveyMarkReportResponse(currentNineFigureNumber).then(function (markReportData) {
            // Open PDF in new window
            window.open("data:application/pdf;base64," + encodeURI(markReportData.document), "Survey Mark Report " + currentNineFigureNumber);

        })
        .catch(function (err) {
            console.log(err);
        });


}


function retrieveMarkInformation(cLat, cLong) {

    //Show map spinner
    mapSpinner.classList.remove("hidden");

    return new Promise(function (resolve, reject) {
        xr.get(baseURL + '/getMarkInformation', {
                searchType: "Location",
                latitude: cLat,
                longitude: cLong,
                radius: currentRadius,
                format: "Brief"
            })
            .then(function (jsonResponse) {

                //Check for success - the messages element will not be present for success
                if (typeof jsonResponse.messages === 'undefined') {
                    //Results returned
                    //console.log(JSON.stringify(jsonResponse));
                    zoomInMsg.classList.add("hidden");
                    resolve(jsonResponse.data);
                } else {
                    //Error returned
                    //Check for too many marks
                    if (jsonResponse.messages.message === "More than 250 marks were found for this search. Please refine your search criteria.") {
                        //Add message that the area has too many marks
                        console.log("Too many marks");
                        mapSpinner.classList.add("hidden");
                        zoomInMsg.textContent = "Zoom in to see marks";
                        zoomInMsg.classList.remove("hidden");

                    } else if (jsonResponse.messages.message === "No survey marks matched the criteria provided.") {
                        //Check for no marks
                        console.log("No marks found");
                        zoomInMsg.textContent = "Zoom in to see marks";
                        mapSpinner.classList.remove("hidden");
                    } else {
                        //another message returned, log it
                        console.log(jsonResponse.messages.message);
                        mapSpinner.classList.add("hidden");
                    }
                }

            })
            .catch(function (err) {
                console.log(err);
                return Promise.reject(err);
            });
    });

}

function getSurveyMarkSketchResponse(nineFigureNumber) {

    return new Promise(function (resolve, reject) {
        xr.get(baseURL + '/getSurveyMarkSketches', {
                markList: nineFigureNumber,
                returnDefective: true
            })
            .then(function (jsonResponse) {

                //Check for success - the messages element will not be present for success
                if (typeof jsonResponse.messages === 'undefined') {
                    //Results returned
                    resolve(jsonResponse.data);
                } else {
                    //Error returned
                    //another message returned, log it
                    console.log(jsonResponse.messages.message);
                }

            })
            .catch(function (err) {
                console.log(err);
                return Promise.reject(err);
            });
    });
}

function getSurveyMarkReportResponse(nineFigureNumber) {

    return new Promise(function (resolve, reject) {
        xr.get(baseURL + '/getSurveyMarkReports', {
                markList: nineFigureNumber,
                returnDefective: true
            })
            .then(function (jsonResponse) {

                //Check for success - the messages element will not be present for success
                if (typeof jsonResponse.messages === 'undefined') {
                    //Results returned
                    resolve(jsonResponse.data);
                } else {
                    //Error returned
                    //another message returned, log it
                    console.log(jsonResponse.messages.message);
                }

            })
            .catch(function (err) {
                console.log(err);
                return Promise.reject(err);
            });
    });
}

function checkSizeofCurrentMap() {
    var centreCoords = map.getCenter();
    var mapBounds = map.getBounds();
    //console.log(mapBounds);
    //console.log(centreCoords);

    if (typeof mapBounds !== 'undefined') {
        var mapRadius = getDistanceKms(centreCoords.H, centreCoords.L, mapBounds.Ka.H, mapBounds.Ga.H);
        //console.log("Radius in kms:" + (mapRadius / 1000));

        currentRadius = (mapRadius / 1000);
    } else {
        currentRadius = 0;
    }

    if (currentRadius > 0 && currentRadius <= 2) {
        zoomInMsg.classList.add("hidden");
    } else {
        zoomInMsg.textContent = "Zoom in to see marks";
        zoomInMsg.classList.remove("hidden");
    }
}

function getDistanceKms(point1Lat, point1Lng, point2Lat, point2Lng) {
    var R = 6378137; // Earth’s mean radius
    var dLat = calcRad(point2Lat - point1Lat);
    var dLong = calcRad(point2Lng - point1Lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(calcRad(point1Lat)) * Math.cos(calcRad(point2Lat)) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    return d; // returns the distance in metres
}

function calcRad(x) {
    return x * Math.PI / 180;
}
